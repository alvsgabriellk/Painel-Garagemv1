// ============================================================
// painel-comum.js — funções compartilhadas pelas telas do painel
//
// Carregue nesta ordem em cada página do painel:
//   <script src="../js/sessao.js"></script>
//   <script src="../js/app.js"></script>            (o seu, já existe)
//   <script src="../js/painel-comum.js"></script>
//   <script src="../js/<pagina>.js"></script>
//
// Tudo fica dentro de window.GaragemPainel, então não conflita com
// nenhuma variável global do app.js nem do sessao.js.
// ============================================================
(() => {
  "use strict";

  // ---------- Configuração (ajuste aqui) ----------
  // Mesmo servidor do auth-comum.js, só que SEM o "/auth" no final
  // (aqui as rotas são /veiculos, /manutencoes, /planos e /auth/perfil).
  // Em desenvolvimento (Live Server) usa a API local; publicado, usa o Render.
  const EM_DESENVOLVIMENTO = ["localhost", "127.0.0.1"].includes(location.hostname);
  const API_BASE = EM_DESENVOLVIMENTO ? "http://127.0.0.1:5000" : "https://painel-garagemvm.onrender.com";
  const TIMEOUT_MS = 45000; // o Render gratuito pode levar quase 1 min para "acordar"
  const AVISO_LENTO_MS = 4000; // depois disso avisa que o servidor está iniciando
  const PAGINA_CARRO = "meu-carro.html";
  const PAGINA_LOGIN_FALLBACK = "../templates/login/"; // usado só se o sessao.js não existir

  const MENSAGENS_POR_STATUS = {
    400: "Dados inválidos. Confira os campos e tente novamente.",
    401: "Sua sessão expirou. Entre novamente.",
    402: "Seu período gratuito acabou. Faça upgrade de plano para continuar.",
    403: "Você não tem permissão para fazer isso.",
    404: "Não encontrado.",
    409: "Esses dados já estão em uso.",
    413: "O arquivo é grande demais.",
    429: "Muitas tentativas. Aguarde um pouco e tente novamente.",
    500: "Erro no servidor. Tente novamente em instantes.",
    501: "Este recurso ainda não está disponível.",
  };

  // ---------- Armazenamento local (nunca lança erro) ----------
  const ler = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const apagar = (k) => { try { localStorage.removeItem(k); } catch {} };

  function obterUsuario() {
    try { return JSON.parse(ler("usuario") || "null"); } catch { return null; }
  }
  const veiculoIdSalvo = () => ler("veiculoId");
  const salvarVeiculoId = (id) => (id == null ? apagar("veiculoId") : gravar("veiculoId", String(id)));

  // ---------- DOM seguro (sempre textContent, nunca innerHTML com dado do usuário) ----------
  function el(tag, props = {}, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat()) if (f != null) n.append(f);
    return n;
  }

  // ---------- Avisos ----------
  // Toast flutuante com estilo próprio (não depende do CSS do painel).
  function toast(texto, tipo = "info", ms = 6000) {
    let pilha = document.getElementById("painel-toasts");
    if (!pilha) {
      pilha = el("div", { id: "painel-toasts" });
      Object.assign(pilha.style, {
        position: "fixed", right: "16px", bottom: "16px", zIndex: "9999",
        display: "flex", flexDirection: "column", gap: "8px",
        maxWidth: "min(360px, calc(100vw - 32px))",
      });
      document.body.append(pilha);
    }
    const cores = { erro: "#b3261e", sucesso: "#1b7f5c", info: "#374151", alerta: "#a8431a" };
    const t = el("div", { role: tipo === "erro" ? "alert" : "status", text: texto });
    Object.assign(t.style, {
      background: cores[tipo] || cores.info, color: "#fff", padding: "10px 14px",
      borderRadius: "8px", font: "14px/1.4 system-ui, sans-serif",
      boxShadow: "0 4px 14px rgba(0,0,0,.25)", cursor: "pointer",
    });
    const remover = () => t.remove();
    t.addEventListener("click", remover);
    if (ms) setTimeout(remover, ms);
    pilha.append(t);
    return { remover };
  }

  // Se o formulário tem um [data-message], mostra ali; senão cai no toast.
  function avisar(contexto, texto, tipo = "erro") {
    const area = contexto && contexto.querySelector ? contexto.querySelector("[data-message]") : null;
    if (!area) return toast(texto, tipo);
    area.textContent = texto;
    area.hidden = false;
    area.dataset.tipo = tipo;
    area.classList.remove("notice-error", "notice-success", "notice-info");
    area.classList.add(tipo === "sucesso" ? "notice-success" : tipo === "info" ? "notice-info" : "notice-error");
  }

  function limparAviso(contexto) {
    const area = contexto && contexto.querySelector ? contexto.querySelector("[data-message]") : null;
    if (area) { area.hidden = true; area.textContent = ""; }
  }

  function definirCarregando(botao, carregando, textoCarregando = "Aguarde...") {
    if (!botao) return;
    if (carregando) {
      botao.dataset.textoOriginal = botao.textContent;
      botao.textContent = textoCarregando;
      botao.disabled = true;
    } else {
      botao.textContent = botao.dataset.textoOriginal || botao.textContent;
      botao.disabled = false;
    }
  }

  // ---------- Sessão ----------
  // O sessao.js declara "const Sessao", que NÃO vira window.Sessao: por isso o typeof.
  const sessao = () => (typeof Sessao !== "undefined" ? Sessao : null);

  function irParaLogin() {
    const s = sessao();
    if (s && s.expirou) return s.expirou();
    apagar("token");
    location.replace(PAGINA_LOGIN_FALLBACK);
  }

  function exigirLogin() {
    const s = sessao();
    if (s && s.exigirLogin) return s.exigirLogin();
    if (ler("token")) return true;
    irParaLogin();
    return false;
  }

  // ---------- Chamada à API ----------
  // Sempre devolve { ok, status, dados } e nunca lança erro.
  // Para enviar arquivo: chamarApi(caminho, { metodo: "POST", formData })
  async function chamarApi(caminho, { metodo = "GET", corpo, formData } = {}) {
    const headers = {};
    const token = ler("token");
    if (token) headers.Authorization = `Bearer ${token}`;

    const opcoes = { method: metodo, headers };
    if (formData) {
      opcoes.body = formData; // o navegador define o Content-Type (multipart) sozinho
    } else if (corpo !== undefined) {
      headers["Content-Type"] = "application/json";
      opcoes.body = JSON.stringify(corpo);
    }

    const controlador = new AbortController();
    opcoes.signal = controlador.signal;
    const timer = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    let aviso = null;
    const avisoTimer = setTimeout(() => {
      aviso = toast("O servidor está iniciando… aguarde alguns segundos.", "info", 0);
    }, AVISO_LENTO_MS);

    try {
      const resposta = await fetch(`${API_BASE}${caminho}`, opcoes);
      let dados = {};
      try { dados = await resposta.json(); } catch { /* resposta sem JSON */ }

      // 401 = token vencido/ausente; 422 = token inválido (padrão do Flask-JWT-Extended)
      if (resposta.status === 401 || resposta.status === 422) {
        irParaLogin();
        return { ok: false, status: resposta.status, dados, sessaoExpirada: true };
      }
      return { ok: resposta.ok, status: resposta.status, dados };
    } catch (erro) {
      const texto = erro.name === "AbortError"
        ? "O servidor demorou demais para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
      return { ok: false, status: 0, dados: { error: texto } };
    } finally {
      clearTimeout(timer);
      clearTimeout(avisoTimer);
      if (aviso) aviso.remover();
    }
  }

  function mensagemDeErro(resp) {
    const d = (resp && resp.dados) || {};
    return d.error || d.erro || d.message || d.msg || MENSAGENS_POR_STATUS[resp && resp.status] ||
      "Algo deu errado. Tente novamente.";
  }

  // ---------- Formatação e conversão ----------
  const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmtKm = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const formatarMoeda = (n) => fmtMoeda.format(Number(n) || 0);
  const formatarKm = (n) => fmtKm.format(Number(n) || 0);

  // "2026-10-28" -> "28/10/2026" (sem new Date, para não "voltar um dia" por fuso horário)
  function formatarData(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
  }

  const doisDigitos = (n) => String(n).padStart(2, "0");
  function paraISO(d) {
    return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
  }
  // Data de hoje (fuso do usuário) em AAAA-MM-DD, com deslocamento opcional em dias
  function hojeISO(deslocamentoDias = 0) {
    const d = new Date();
    d.setDate(d.getDate() + deslocamentoDias);
    return paraISO(d);
  }
  function somarDias(iso, dias) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return null;
    return paraISO(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(dias)));
  }

  // Aceita "1234.5", "1.234,50", "R$ 1.234,50". Devolve número, ou null se não der.
  function lerNumero(texto) {
    if (typeof texto === "number") return Number.isFinite(texto) ? texto : null;
    let t = String(texto ?? "").replace(/[R$\s]/g, "");
    if (!t) return null;
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // "1.234" = mil duzentos e trinta e quatro
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // ---------- Contexto do painel: login, saudação, veículo ativo ----------
  function preencherSaudacao() {
    const usuario = obterUsuario();
    const alvo = document.querySelector(".greeting-name");
    if (alvo && usuario && usuario.nome) alvo.textContent = String(usuario.nome).trim().split(/\s+/)[0];
  }

  // ---------- Ícone do carro (muda de cor conforme a cor do veículo) ----------
  const CORES_CARRO = [
    ["branc", "#f4f4f2"], ["preto", "#1f2937"], ["prat", "#b8c0c8"], ["cinza", "#6b7280"], ["grafite", "#4b5563"],
    ["vermelh", "#dc2626"], ["vinho", "#7f1d1d"], ["bord", "#7f1d1d"], ["azul", "#2563eb"], ["verde", "#16a34a"],
    ["amarel", "#eab308"], ["laranj", "#f97316"], ["marrom", "#92400e"], ["bege", "#d6c3a1"],
    ["dourad", "#c9a227"], ["roxo", "#7c3aed"], ["rosa", "#ec4899"],
  ];
  function corDoCarro(cor) {
    const c = semAcento(cor);
    const achada = CORES_CARRO.find(([chave]) => c.includes(chave));
    return achada ? achada[1] : "#2c6e68";
  }
  function iconeCarro(cor) {
    // O texto do SVG é todo nosso; a cor sai da tabela acima (nunca vem direto do usuário).
    const caixa = document.createElement("span");
    caixa.className = "veh-icon";
    caixa.innerHTML = '<svg viewBox="0 0 64 32" aria-hidden="true" focusable="false">'
      + `<path d="M5 23v-5.5c0-1.3.9-2.4 2.2-2.7l8.3-2L21.6 6c.8-1 2-1.6 3.3-1.6h15.2c1.3 0 2.5.6 3.3 1.6L49 13l8 1.9c1.3.3 2.2 1.4 2.2 2.7V23c0 1-.8 1.8-1.8 1.8H6.8C5.8 24.8 5 24 5 23z" fill="${corDoCarro(cor)}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`
      + '<path d="M24.3 7.4h7.7V13H21.4zM35 7.4h5.2c.5 0 1 .2 1.3.6L45.6 13H35z" fill="rgba(255,255,255,.75)"/>'
      + '<circle cx="18" cy="25" r="4.6" fill="#1f2937"/><circle cx="18" cy="25" r="1.8" fill="#cbd5e1"/>'
      + '<circle cx="47" cy="25" r="4.6" fill="#1f2937"/><circle cx="47" cy="25" r="1.8" fill="#cbd5e1"/></svg>';
    return caixa;
  }

  // ---------- Seletor de veículo (cartão da barra lateral) ----------
  let fecharSeletorGlobal = null;

  function preencherSidebar(veiculo, veiculos = []) {
    const cartao = document.querySelector(".vehicle-card");
    if (!cartao) return;
    const nome = cartao.querySelector(".vehicle-name");
    const placa = cartao.querySelector(".vehicle-plate");

    // Monta a estrutura uma única vez (botão + lista), reaproveitando os elementos que já existem na página
    let botao = cartao.querySelector(".veh-btn");
    let menu = cartao.querySelector(".veh-menu");
    if (!botao) {
      const texto = el("span", { class: "veh-text" }, nome, placa);
      botao = el("button", { type: "button", class: "veh-btn", "aria-haspopup": "listbox", "aria-expanded": "false" },
        el("span", { class: "veh-icon-slot" }), texto, el("span", { class: "veh-chev", "aria-hidden": "true", text: "▾" }));
      menu = el("ul", { class: "veh-menu", role: "listbox", hidden: true });
      cartao.replaceChildren(botao, menu);
      cartao.dataset.seletorVeiculo = "";

      const fechar = () => { menu.hidden = true; botao.setAttribute("aria-expanded", "false"); cartao.classList.remove("aberto"); };
      fecharSeletorGlobal = fechar;
      botao.addEventListener("click", () => {
        if (cartao.classList.contains("unico")) return;
        const abrir = menu.hidden;
        menu.hidden = !abrir;
        botao.setAttribute("aria-expanded", String(abrir));
        cartao.classList.toggle("aberto", abrir);
      });
      document.addEventListener("click", (e) => { if (!cartao.contains(e.target)) fechar(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
    }

    if (nome) nome.textContent = veiculo ? `${veiculo.marca_modelo} ${veiculo.ano_modelo}` : "Nenhum veículo";
    if (placa) placa.textContent = veiculo ? `Placa ${veiculo.placa}` : "Cadastre seu carro";
    botao.querySelector(".veh-icon-slot").replaceChildren(iconeCarro(veiculo ? veiculo.cor : ""));

    // Lista: todos os veículos + atalho para adicionar
    menu.replaceChildren();
    for (const v of veiculos) {
      const ativo = veiculo && v.id === veiculo.id;
      const item = el("li", { role: "option", "aria-selected": String(!!ativo), class: ativo ? "veh-item ativo" : "veh-item", tabindex: "0" },
        iconeCarro(v.cor),
        el("span", { class: "veh-text" },
          el("span", { class: "veh-item-nome", text: `${v.marca_modelo} ${v.ano_modelo}` }),
          el("span", { class: "veh-item-placa", text: v.placa })),
        ativo ? el("span", { class: "veh-check", "aria-hidden": "true", text: "✓" }) : null);
      const escolher = () => {
        if (ativo) return fecharSeletorGlobal && fecharSeletorGlobal();
        salvarVeiculoId(v.id);
        location.reload();
      };
      item.addEventListener("click", escolher);
      item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolher(); } });
      menu.append(item);
    }
    menu.append(el("li", { class: "veh-add" }, el("a", { href: `${PAGINA_CARRO}?novo=1`, text: "+ Adicionar veículo" })));
    cartao.classList.toggle("unico", veiculos.length <= 1);
    const chev = botao.querySelector(".veh-chev");
    if (chev) chev.hidden = veiculos.length <= 1;
  }

  // ---------- Notificações (sino da barra do topo) ----------
  // info = { km_faltam, percentual } vindo da API (óleo / correia)
  function nivelPorKm(info) {
    if (!info || info.km_faltam == null) return null;
    const faltam = Math.round(info.km_faltam);
    const pct = Math.max(0, Math.min(100, Number(info.percentual) || 0));
    return { faltam, nivel: faltam <= 0 ? "alerta" : pct >= 80 ? "atencao" : "ok" };
  }
  function nivelDoImposto(status) {
    const s = semAcento(status);
    if (/(nao pago|pend|atras|venc|aberto|debito)/.test(s)) return "alerta";
    if (/(pago|quitad|em dia|regular|ok)/.test(s)) return "ok";
    return "atencao";
  }

  // Lista de avisos do veículo: [{ id, nivel: "alerta"|"atencao", titulo, texto, link }]
  function calcularNotificacoes(v) {
    if (!v) return [];
    const itens = [];
    const adicionarKm = (id, info, nomeItem, link, verbo) => {
      const e = nivelPorKm(info);
      if (!e || e.nivel === "ok") return;
      itens.push(e.nivel === "alerta"
        ? { id, nivel: "alerta", popup: true, link, titulo: `${nomeItem} vencida`,
            texto: e.faltam === 0 ? `Vence agora. ${verbo}.` : `Passou ${formatarKm(-e.faltam)} km do prazo. ${verbo}.` }
        : { id, nivel: "atencao", link, titulo: `${nomeItem} se aproximando`, texto: `Faltam ${formatarKm(e.faltam)} km.` });
    };
    adicionarKm("oleo", v.oleo, "Troca de óleo", "manutencoes.html", "Registre a troca em Manutenções");
    adicionarKm("correia", v.correia, "Troca da correia dentada", "manutencoes.html", "Registre a troca em Manutenções");

    const imposto = (id, nome, dados) => {
      if (nivelDoImposto((dados || {}).status) === "alerta") {
        itens.push({ id, nivel: "alerta", link: "visao-geral.html", titulo: `${nome} pendente`, texto: `Situação: ${dados.status}.` });
      }
    };
    imposto("licenciamento", "Licenciamento", v.licenciamento);
    imposto("ipva", "IPVA", v.ipva);
    return itens;
  }

  const lerSessao = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const gravarSessao = (k, val) => { try { sessionStorage.setItem(k, val); } catch {} };

  function montarNotificacoes(veiculo) {
    const topo = document.querySelector(".topbar");
    if (!topo) return;
    let area = topo.querySelector(".notif");
    if (!area) {
      const original = topo.querySelector(".notification");
      const botao = el("button", { type: "button", class: "notification notif-btn", "aria-haspopup": "true", "aria-expanded": "false" },
        el("span", { class: "notif-sino", "aria-hidden": "true", text: "🔔" }),
        el("span", { class: "notif-rotulo", text: "Notificações" }),
        el("span", { class: "notif-contador", hidden: true }));
      const painel = el("div", { class: "notif-painel", hidden: true, role: "dialog", "aria-label": "Notificações" });
      area = el("div", { class: "notif" }, botao, painel);
      if (original) original.replaceWith(area); else topo.append(area);

      const fechar = () => { painel.hidden = true; botao.setAttribute("aria-expanded", "false"); };
      botao.addEventListener("click", () => {
        const abrir = painel.hidden;
        painel.hidden = !abrir;
        botao.setAttribute("aria-expanded", String(abrir));
      });
      document.addEventListener("click", (e) => { if (!area.contains(e.target)) fechar(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
    }

    const painel = area.querySelector(".notif-painel");
    const contador = area.querySelector(".notif-contador");
    const itens = calcularNotificacoes(veiculo);
    const urgentes = itens.filter((i) => i.nivel === "alerta").length;

    contador.hidden = itens.length === 0;
    contador.textContent = String(itens.length);
    contador.classList.toggle("urgente", urgentes > 0);
    area.classList.toggle("tem-alerta", urgentes > 0);

    painel.replaceChildren(el("div", { class: "notif-titulo", text: "Notificações" }));
    if (!veiculo) {
      painel.append(el("p", { class: "notif-vazio", text: "Cadastre seu veículo para receber avisos." }));
    } else if (!itens.length) {
      painel.append(el("p", { class: "notif-vazio", text: "Tudo em dia por aqui. Nenhum aviso no momento." }));
    }
    for (const i of itens) {
      painel.append(el("a", { class: `notif-item ${i.nivel}`, href: i.link },
        el("span", { class: "notif-ponto", "aria-hidden": "true" }),
        el("span", { class: "notif-texto" }, el("strong", { text: i.titulo }), el("span", { text: i.texto }))));
    }

    // Alertas vencidos também "sobem" na tela, uma vez por sessão e por veículo
    if (veiculo) {
      const mostrados = (lerSessao("notifMostradas") || "").split(",");
      const novas = itens.filter((i) => i.popup && !mostrados.includes(`${veiculo.id}:${i.id}`));
      novas.slice(0, 3).forEach((i, n) => {
        setTimeout(() => toast(`⚠ ${i.titulo}. ${i.texto}`, "alerta", 9000), 600 + n * 400);
      });
      if (novas.length) gravarSessao("notifMostradas", [...mostrados.filter(Boolean), ...novas.map((i) => `${veiculo.id}:${i.id}`)].join(","));
    }
  }

  // ---------- Menu no celular ----------
  function montarMenuCelular() {
    const topo = document.querySelector(".topbar");
    const app = document.querySelector(".app");
    if (!topo || !app || topo.querySelector(".menu-toggle")) return;
    const botao = el("button", { type: "button", class: "menu-toggle", "aria-label": "Abrir menu", "aria-expanded": "false" },
      el("span", { "aria-hidden": "true", text: "☰" }));
    const fundo = el("div", { class: "menu-fundo" });
    const alternar = (abrir) => {
      app.classList.toggle("menu-aberto", abrir);
      botao.setAttribute("aria-expanded", String(abrir));
      botao.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
    };
    botao.addEventListener("click", () => alternar(!app.classList.contains("menu-aberto")));
    fundo.addEventListener("click", () => alternar(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") alternar(false); });
    topo.prepend(botao);
    app.append(fundo);
  }

  // Chame no início de cada página. Devolve null se o usuário precisou ir para o login;
  // senão { veiculo, veiculos, erro }.
  async function carregarContexto({ avisarErro = true } = {}) {
    if (!exigirLogin()) return null;
    const s = sessao();
    if (s && s.montarBotaoSair) s.montarBotaoSair();
    preencherSaudacao();
    montarMenuCelular();

    const resp = await chamarApi("/veiculos");
    if (resp.sessaoExpirada) return null;
    if (!resp.ok) {
      if (avisarErro) toast(mensagemDeErro(resp), "erro");
      preencherSidebar(null);
      montarNotificacoes(null);
      return { veiculo: null, veiculos: [], erro: true };
    }

    const veiculos = resp.dados.veiculos || [];
    const ativo = veiculos.find((v) => String(v.id) === veiculoIdSalvo()) || veiculos[0] || null;
    salvarVeiculoId(ativo ? ativo.id : null);
    preencherSidebar(ativo, veiculos);
    montarNotificacoes(ativo);
    return { veiculo: ativo, veiculos, erro: false };
  }

  // Para telas que só fazem sentido com um carro cadastrado.
  // Devolve true se tem veículo; senão avisa e leva o usuário para "Meu carro".
  function exigirVeiculo(ctx) {
    if (ctx && ctx.veiculo) return true;
    if (ctx && ctx.erro) return false; // falha de rede/servidor: não redireciona, o erro já foi mostrado
    toast("Cadastre seu veículo para usar esta tela.", "info");
    setTimeout(() => { location.href = `${PAGINA_CARRO}?novo=1`; }, 1500);
    return false;
  }

  window.GaragemPainel = {
    API_BASE,
    chamarApi, mensagemDeErro,
    toast, avisar, limparAviso, definirCarregando, el,
    formatarMoeda, formatarKm, formatarData, hojeISO, somarDias, lerNumero, semAcento,
    obterUsuario, veiculoIdSalvo, salvarVeiculoId,
    preencherSaudacao, preencherSidebar, carregarContexto, exigirVeiculo,
  };
})();
