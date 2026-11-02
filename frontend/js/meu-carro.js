// meu-carro.js — dados do veículo, cadastro, edição e leitura do CRLV
// Precisa do sessao.js e do painel-comum.js carregados antes.
//

//  Mostrar dados (texto):  [data-campo="..."] com um destes nomes:
//     placa, renavam, marca, modelo, marca_modelo, ano_modelo, cor, km_compra, km_atual,
//     oleo_tipo, oleo_intervalo, oleo_proxima, oleo_faltam,
//     correia_intervalo, correia_proxima, correia_faltam, ipva_status, licenciamento_status
//
//  Formulário:  <form data-form="veiculo"> com inputs de name:
//     placa, renavam, marca, modelo, ano_modelo, cor, km_atual, km_compra,
//     oleo_tipo, oleo_intervalo, correia_intervalo
//     + (opcional) <div data-message hidden></div> para as mensagens
//     + o formulário cadastra quando não há carro, e edita quando já há um
//
//  Lista:     <tbody data-lista="veiculos"> (tabela "Meus veículos", 4 colunas)
//  CRLV:      <input type="file" data-crlv accept=".pdf,.jpg,.jpeg,.png">
//  Botões:    [data-acao="novo-veiculo"]  (abre o formulário vazio para cadastrar outro carro)
//             [data-acao="cancelar-novo"] (volta para a edição do carro atual)
//  Trocas de texto por modo (opcional): elementos com data-modo="novo" só aparecem ao cadastrar,
//             e data-modo="edicao" só aparecem ao editar.

(async () => {
  const P = window.GaragemPainel;
  if (!P) { console.error("meu-carro.js: carregue o painel-comum.js antes."); return; }

  const ctx = await P.carregarContexto();
  if (!ctx) return;

  const form = document.querySelector('[data-form="veiculo"]');
  const entradaCrlv = document.querySelector("[data-crlv]");
  let veiculo = ctx.veiculo;
  let veiculos = ctx.veiculos || [];
  let modoNovo = !veiculo || new URLSearchParams(location.search).get("novo") === "1";

  const ANO_MAX = new Date().getFullYear() + 1;
  const REGEX_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

  // ---------- exibir ----------
  function valoresParaExibir(v) {
    return {
      placa: v.placa, renavam: v.renavam, marca: v.marca, modelo: v.modelo,
      marca_modelo: v.marca_modelo, ano_modelo: v.ano_modelo, cor: v.cor,
      km_compra: v.km_compra != null ? `${P.formatarKm(v.km_compra)} km` : "—",
      km_atual: `${P.formatarKm(v.km_atual)} km`,
      oleo_tipo: v.oleo.tipo || "—",
      oleo_intervalo: `${P.formatarKm(v.oleo.intervalo)} km`,
      oleo_proxima: `${P.formatarKm(v.oleo.km_proxima_troca)} km`,
      oleo_faltam: `${P.formatarKm(Math.max(0, v.oleo.km_faltam))} km`,
      correia_intervalo: `${P.formatarKm(v.correia.intervalo)} km`,
      correia_proxima: `${P.formatarKm(v.correia.km_proxima_troca)} km`,
      correia_faltam: `${P.formatarKm(Math.max(0, v.correia.km_faltam))} km`,
      ipva_status: v.ipva.status,
      licenciamento_status: v.licenciamento.status,
    };
  }

  function exibir() {
    const valores = veiculo ? valoresParaExibir(veiculo) : {};
    document.querySelectorAll("[data-campo]").forEach((n) => {
      const chave = n.dataset.campo;
      if (chave in valores || !veiculo) n.textContent = veiculo ? valores[chave] : "—";
    });
  }

  // ---------- formulário ----------
  const entrada = (nome) => (form && form.elements[nome]) || null;

  function limparFormulario() {
    if (!form) return;
    form.reset();
    ["placa", "renavam", "marca", "modelo", "ano_modelo", "cor", "km_atual", "km_compra",
      "oleo_tipo", "oleo_intervalo", "correia_intervalo"].forEach((n) => { const i = entrada(n); if (i) i.value = ""; });
  }

  function preencherFormulario(v) {
    const valores = {
      placa: v.placa, renavam: v.renavam, marca: v.marca, modelo: v.modelo, ano_modelo: v.ano_modelo,
      cor: v.cor, km_atual: v.km_atual, km_compra: v.km_compra ?? "",
      oleo_tipo: v.oleo.tipo ?? "", oleo_intervalo: v.oleo.intervalo, correia_intervalo: v.correia.intervalo,
    };
    for (const [nome, valor] of Object.entries(valores)) {
      const i = entrada(nome);
      if (i) i.value = valor;
    }
  }

  function aplicarModo() {
    if (form) {
      if (modoNovo) limparFormulario(); else if (veiculo) preencherFormulario(veiculo);
      // RENAVAM e km de compra não podem mudar depois de cadastrados (a API ignora)
      ["renavam", "km_compra"].forEach((n) => {
        const i = entrada(n);
        if (i) i.disabled = !modoNovo;
      });
      P.limparAviso(form);
    }
    document.querySelectorAll("[data-modo]").forEach((n) => {
      n.hidden = n.dataset.modo !== (modoNovo ? "novo" : "edicao");
    });
    document.querySelectorAll('[data-acao="cancelar-novo"]').forEach((n) => { n.hidden = !modoNovo || !veiculo; });
  }

  // ---------- leitura e validação ----------
  // Devolve undefined se o campo não existe, null se está vazio, NaN se não é número, ou o número.
  function lerNumeroCampo(nome) {
    const i = entrada(nome);
    if (!i) return undefined;
    const t = String(i.value).trim();
    if (t === "") return null;
    const n = P.lerNumero(t);
    return n === null ? NaN : n;
  }

  function lerTextoCampo(nome) {
    const i = entrada(nome);
    return i ? String(i.value).trim() : undefined;
  }

  function lerCampos() {
    const placa = lerTextoCampo("placa");
    const renavam = lerTextoCampo("renavam");
    return {
      placa: placa === undefined ? undefined : placa.toUpperCase().replace(/[-\s]/g, ""),
      renavam: renavam === undefined ? undefined : renavam.replace(/\D/g, ""),
      marca: lerTextoCampo("marca"),
      modelo: lerTextoCampo("modelo"),
      ano_modelo: lerNumeroCampo("ano_modelo"),
      cor: lerTextoCampo("cor"),
      km_atual: lerNumeroCampo("km_atual"),
      km_compra: lerNumeroCampo("km_compra"),
      oleo_tipo: lerTextoCampo("oleo_tipo"),
      oleo_intervalo: lerNumeroCampo("oleo_intervalo"),
      correia_intervalo: lerNumeroCampo("correia_intervalo"),
    };
  }

  const faltando = (x) => x === undefined; // campo nem existe no HTML
  const vazio = (x) => x === null || x === "";

  // As regras espelham as do servidor (validators/veiculo_validators.py).
  function validar(c, criar) {
    if (!faltando(c.placa) && (criar || !vazio(c.placa)) && !REGEX_PLACA.test(c.placa || "")) {
      return "Placa inválida. Use o formato ABC1234 ou ABC1D23.";
    }
    if (criar && (faltando(c.renavam) || !/^\d{11}$/.test(c.renavam))) return "O RENAVAM deve ter 11 números.";
    if (!faltando(c.marca) && (criar || !vazio(c.marca)) && (c.marca.length < 2 || c.marca.length > 50)) {
      return "A marca deve ter entre 2 e 50 caracteres.";
    }
    if (!faltando(c.modelo) && (criar || !vazio(c.modelo)) && (c.modelo.length < 1 || c.modelo.length > 50)) {
      return "Informe o modelo (até 50 caracteres).";
    }
    if (!faltando(c.ano_modelo) && (criar || !vazio(c.ano_modelo))) {
      if (!Number.isInteger(c.ano_modelo) || c.ano_modelo < 1950 || c.ano_modelo > ANO_MAX) {
        return `O ano do modelo deve estar entre 1950 e ${ANO_MAX}.`;
      }
    }
    if (!faltando(c.cor) && (criar || !vazio(c.cor)) && (c.cor.length < 2 || c.cor.length > 30)) {
      return "A cor deve ter entre 2 e 30 caracteres.";
    }
    for (const [nome, rotulo] of [["km_atual", "O km atual"], ["km_compra", "O km de compra"]]) {
      const x = c[nome];
      if (!faltando(x) && !vazio(x) && (Number.isNaN(x) || x < 0)) return `${rotulo} deve ser um número maior ou igual a zero.`;
    }
    for (const [nome, rotulo] of [["oleo_intervalo", "O intervalo do óleo"], ["correia_intervalo", "O intervalo da correia"]]) {
      const x = c[nome];
      if (!faltando(x) && !vazio(x) && (Number.isNaN(x) || x < 1)) return `${rotulo} deve ser um número maior que zero.`;
    }
    if (!faltando(c.oleo_tipo) && c.oleo_tipo.length > 50) return "O tipo de óleo deve ter até 50 caracteres.";
    return null;
  }

  // ---------- salvar ----------
  function montarCriacao(c) {
    const corpo = {
      placa: c.placa, renavam: c.renavam, marca: c.marca, modelo: c.modelo,
      ano_modelo: c.ano_modelo, cor: c.cor,
    };
    if (!faltando(c.km_atual) && !vazio(c.km_atual)) corpo.km_atual = c.km_atual;
    if (!faltando(c.km_compra) && !vazio(c.km_compra)) corpo.km_compra = c.km_compra;
    return corpo;
  }

  // Só manda o que mudou (o servidor recusa km_atual igual ao atual e placa repetida).
  // Devolve { corpo } ou { erro }.
  function montarEdicao(c) {
    const corpo = {};
    const atuais = {
      placa: veiculo.placa, marca: veiculo.marca, modelo: veiculo.modelo, ano_modelo: veiculo.ano_modelo,
      cor: veiculo.cor, oleo_tipo: veiculo.oleo.tipo ?? "", oleo_intervalo: veiculo.oleo.intervalo,
      correia_intervalo: veiculo.correia.intervalo,
    };
    for (const [nome, atual] of Object.entries(atuais)) {
      const novo = c[nome];
      if (faltando(novo) || vazio(novo) && nome !== "oleo_tipo") continue;
      if (novo !== atual) corpo[nome] = novo;
    }
    const km = c.km_atual;
    if (!faltando(km) && !vazio(km)) {
      if (km < veiculo.km_atual) return { erro: `O km atual não pode ser menor que o registrado (${P.formatarKm(veiculo.km_atual)} km).` };
      if (km > veiculo.km_atual) corpo.km_atual = km;
    }
    return { corpo };
  }

  async function atualizarContexto() {
    const novo = await P.carregarContexto();
    if (novo) { veiculo = novo.veiculo; veiculos = novo.veiculos || []; }
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    P.limparAviso(form);
    const botao = form.querySelector('button[type="submit"]');
    const c = lerCampos();

    const erro = validar(c, modoNovo);
    if (erro) return P.avisar(form, erro, "erro");

    if (modoNovo) {
      P.definirCarregando(botao, true, "Cadastrando...");
      const resp = await P.chamarApi("/veiculos", { metodo: "POST", corpo: montarCriacao(c) });
      P.definirCarregando(botao, false);
      if (!resp.ok) return resp.sessaoExpirada ? null : P.avisar(form, P.mensagemDeErro(resp), "erro");

      const criado = resp.dados.veiculo;
      P.salvarVeiculoId(criado.id);

      // Campos de óleo/correia só podem ser gravados depois que o veículo existe
      const extras = {};
      if (!vazio(c.oleo_tipo) && !faltando(c.oleo_tipo)) extras.oleo_tipo = c.oleo_tipo;
      for (const n of ["oleo_intervalo", "correia_intervalo"]) {
        if (!faltando(c[n]) && !vazio(c[n])) extras[n] = c[n];
      }
      if (Object.keys(extras).length) {
        const r2 = await P.chamarApi(`/veiculos/${criado.id}`, { metodo: "PUT", corpo: extras });
        if (!r2.ok && !r2.sessaoExpirada) P.toast(`Veículo cadastrado, mas não foi possível salvar o óleo/correia: ${P.mensagemDeErro(r2)}`, "info");
      }

      history.replaceState(null, "", location.pathname); // tira o ?novo=1 da URL
      modoNovo = false;
      await atualizarContexto();
      exibir();
      renderVeiculos();
      aplicarModo();
      return P.avisar(form, resp.dados.msg || "Veículo cadastrado!", "sucesso");
    }

    const { corpo, erro: erroEdicao } = montarEdicao(c);
    if (erroEdicao) return P.avisar(form, erroEdicao, "erro");
    if (!Object.keys(corpo).length) return P.avisar(form, "Nenhuma alteração para salvar.", "info");

    P.definirCarregando(botao, true, "Salvando...");
    const resp = await P.chamarApi(`/veiculos/${veiculo.id}`, { metodo: "PUT", corpo });
    P.definirCarregando(botao, false);
    if (!resp.ok) return resp.sessaoExpirada ? null : P.avisar(form, P.mensagemDeErro(resp), "erro");

    await atualizarContexto();
    exibir();
    renderVeiculos();
    aplicarModo();
    P.avisar(form, resp.dados.msg || "Veículo atualizado!", "sucesso");
  }

  // ---------- CRLV (leitura automática) ----------
  // A API devolve { dados: { placa, renavam, marca, modelo, ano_modelo, cor } } quando a leitura funciona.
  // Hoje o servidor responde 501 ("ainda não disponível"): nesse caso o cadastro segue manual.
  const EXTENSOES_CRLV = ["pdf", "jpg", "jpeg", "png"];
  const TAMANHO_MAX_MB = 10;

  async function aoEscolherCrlv() {
    const arquivo = entradaCrlv.files && entradaCrlv.files[0];
    if (!arquivo) return;
    const alvo = form || document.body;

    const ext = (arquivo.name.split(".").pop() || "").toLowerCase();
    if (!EXTENSOES_CRLV.includes(ext)) {
      entradaCrlv.value = "";
      return P.avisar(alvo, "Envie o CRLV em PDF, JPG ou PNG.", "erro");
    }
    if (arquivo.size > TAMANHO_MAX_MB * 1024 * 1024) {
      entradaCrlv.value = "";
      return P.avisar(alvo, `O arquivo deve ter até ${TAMANHO_MAX_MB} MB.`, "erro");
    }

    P.avisar(alvo, "Lendo o documento…", "info");
    const dadosForm = new FormData();
    dadosForm.append("arquivo", arquivo);
    const resp = await P.chamarApi("/veiculos/ocr-crlv", { metodo: "POST", formData: dadosForm });
    entradaCrlv.value = "";

    if (resp.sessaoExpirada) return;
    if (resp.status === 501) {
      return P.avisar(alvo, `${P.mensagemDeErro(resp)}`, "info"); // cadastro manual segue normalmente
    }
    if (!resp.ok) return P.avisar(alvo, P.mensagemDeErro(resp), "erro");

    // Um CRLV lido é de um carro novo: vira cadastro, para não misturar com o carro atual
    if (!modoNovo) { modoNovo = true; aplicarModo(); }

    const lidos = resp.dados.dados || {};
    let preenchidos = 0;
    for (const nome of ["placa", "renavam", "marca", "modelo", "ano_modelo", "cor"]) {
      const valor = lidos[nome] ?? (nome === "ano_modelo" ? lidos.ano : undefined);
      const i = entrada(nome);
      if (i && valor != null && String(valor).trim() !== "") { i.value = valor; preenchidos++; }
    }
    P.avisar(alvo, preenchidos
      ? "Preenchemos os campos com os dados do documento. Confira tudo antes de cadastrar."
      : "Não conseguimos identificar os dados nesse documento. Preencha manualmente.", preenchidos ? "sucesso" : "info");
  }

  // ---------- tabela "Meus veículos" ----------
  // <tbody data-lista="veiculos">: uma linha por carro (Veículo, Placa, Km atual, Ação)
  function renderVeiculos() {
    const lista = document.querySelector('[data-lista="veiculos"]');
    if (!lista) return;
    lista.replaceChildren();
    if (!veiculos.length) {
      lista.append(P.el("tr", {}, P.el("td", { colspan: 4, class: "muted", text: "Nenhum veículo cadastrado ainda." })));
      return;
    }
    for (const v of veiculos) {
      const ativo = veiculo && v.id === veiculo.id;
      const acao = ativo
        ? P.el("span", { class: "muted", text: "Selecionado" })
        : P.el("button", { type: "button", class: "button secondary", "data-acao": "selecionar", "data-id": v.id, text: "Selecionar" });
      lista.append(P.el("tr", {},
        P.el("td", { text: `${v.marca_modelo || ""} ${v.ano_modelo || ""}`.trim() }),
        P.el("td", { text: v.placa }),
        P.el("td", { text: P.formatarKm(v.km_atual) }),
        P.el("td", {}, acao)));
    }
  }
  const listaVeiculos = document.querySelector('[data-lista="veiculos"]');
  if (listaVeiculos) listaVeiculos.addEventListener("click", (e) => {
    const b = e.target.closest('[data-acao="selecionar"]');
    if (!b) return;
    P.salvarVeiculoId(b.dataset.id);
    location.href = location.pathname; // recarrega já com o outro carro
  });

  // ---------- ligações ----------
  exibir();
  renderVeiculos();
  aplicarModo();

  if (form) form.addEventListener("submit", aoEnviar);
  if (entradaCrlv) entradaCrlv.addEventListener("change", aoEscolherCrlv);

  document.querySelectorAll('[data-acao="novo-veiculo"]').forEach((b) => b.addEventListener("click", (e) => {
    e.preventDefault();
    modoNovo = true;
    aplicarModo();
    if (form) form.scrollIntoView({ behavior: "smooth", block: "center" });
  }));
  document.querySelectorAll('[data-acao="cancelar-novo"]').forEach((b) => b.addEventListener("click", (e) => {
    e.preventDefault();
    if (!veiculo) return;
    modoNovo = false;
    aplicarModo();
  }));
})();
