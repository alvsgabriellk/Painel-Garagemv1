// perfil-motorista.js — dados pessoais do motorista (nome, CPF, CNH, telefone, endereço) e plano
// Precisa do sessao.js e do painel-comum.js carregados antes.
//
// Usa GET e PUT em /perfil (o perfil_routes.py da API). A resposta esperada é { "perfil": { ... } }.
//
// O QUE ESTE ARQUIVO ESPERA NO HTML (tudo é opcional: o que não existir é ignorado)
//
//  Mostrar dados (texto):  [data-campo="..."] com um destes nomes:
//     nome, email, cpf, cnh, telefone, endereco, plano, limite_veiculos, trial, membro_desde
//
//  Formulário:  <form data-form="perfil"> com inputs de name:
//     nome, email (somente leitura), cpf, cnh, telefone, endereco
//     + (opcional) <div data-message hidden></div> para as mensagens

(async () => {
  const P = window.GaragemPainel;
  if (!P) { console.error("perfil-motorista.js: carregue o painel-comum.js antes."); return; }

  // O perfil não precisa de veículo, então um erro ao listar carros não deve atrapalhar esta tela
  const ctx = await P.carregarContexto({ avisarErro: false });
  if (!ctx) return;

  const form = document.querySelector('[data-form="perfil"]');
  const CAMPOS = ["nome", "cpf", "cnh", "telefone", "endereco"];
  const ROTULO_PLANO = { free: "Grátis (30 dias)", basico: "Básico", plus: "Plus", premium: "Premium" };
  let perfil = null;

  // ---------- máscaras (só visuais; o que vai para a API é o que está no campo) ----------
  const soDigitos = (t) => String(t || "").replace(/\D/g, "");

  function mascaraCpf(t) {
    const d = soDigitos(t).slice(0, 11);
    return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  function mascaraTelefone(t) {
    const d = soDigitos(t).slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  const entrada = (nome) => (form && form.elements[nome]) || null;

  function aplicarMascara(nome, funcao) {
    const i = entrada(nome);
    if (!i) return;
    i.addEventListener("input", () => { i.value = funcao(i.value); });
  }
  aplicarMascara("cpf", mascaraCpf);
  aplicarMascara("telefone", mascaraTelefone);

  // ---------- exibir ----------
  function exibirPerfil() {
    if (!perfil) return;
    const valores = {
      nome: perfil.nome, email: perfil.email, cpf: perfil.cpf || "—", cnh: perfil.cnh || "—",
      telefone: perfil.telefone || "—", endereco: perfil.endereco || "—",
      membro_desde: perfil.data_criado ? P.formatarData(perfil.data_criado) : "—",
    };
    document.querySelectorAll("[data-campo]").forEach((n) => {
      if (n.dataset.campo in valores) n.textContent = valores[n.dataset.campo];
    });

    if (form) {
      for (const nome of ["nome", "email", ...CAMPOS.slice(1)]) {
        const i = entrada(nome);
        if (i) i.value = perfil[nome] ?? "";
      }
      const email = entrada("email");
      if (email) email.readOnly = true; // o e-mail não pode ser trocado por aqui
    }
  }

  function exibirPlano(status) {
    const valores = {
      plano: ROTULO_PLANO[status.plano] || status.plano,
      limite_veiculos: status.limite_veiculos == null ? "Ilimitado" : String(status.limite_veiculos),
      trial: status.plano !== "free" ? "—"
        : status.trial_expirado ? "Período gratuito encerrado"
          : `${status.dias_restantes_trial} dia(s) restante(s) do período gratuito`,
    };
    document.querySelectorAll("[data-campo]").forEach((n) => {
      if (["plano", "limite_veiculos", "trial"].includes(n.dataset.campo)) n.textContent = valores[n.dataset.campo];
    });
  }

  // ---------- carregar ----------
  const [respPerfil, respPlano] = await Promise.all([
    P.chamarApi("/perfil"),
    P.chamarApi("/planos/status"),
  ]);

  if (respPerfil.sessaoExpirada || respPlano.sessaoExpirada) return;

  if (respPerfil.ok) {
    perfil = respPerfil.dados.perfil;
  } else {
    // Sem a rota de perfil na API ainda: mostra o que o login já guardou (nome e e-mail)
    console.warn("perfil-motorista.js: GET /perfil falhou (%s). A rota /perfil está registrada no app.py?", respPerfil.status);
    const guardado = P.obterUsuario() || {};
    perfil = { nome: guardado.nome || "", email: guardado.email || "", cpf: "", cnh: "", telefone: "", endereco: "" };
    P.avisar(form || document.body, "Não foi possível carregar todos os seus dados agora.", "erro");
  }
  // Mostra CPF e telefone já formatados (e compara com isso ao salvar, para não "mudar" sem querer)
  perfil.cpf = mascaraCpf(perfil.cpf);
  perfil.telefone = mascaraTelefone(perfil.telefone);
  exibirPerfil();
  if (respPlano.ok) exibirPlano(respPlano.dados);

  // ---------- salvar ----------
  // As regras espelham as do servidor (validators/perfil_validators.py).
  function validar(v) {
    if ("nome" in v && (v.nome.length < 2 || v.nome.length > 35)) return "O nome deve ter entre 2 e 35 caracteres.";
    if (v.cpf && soDigitos(v.cpf).length !== 11) return "O CPF deve ter 11 números.";
    if (v.cnh && (v.cnh.length < 5 || v.cnh.length > 20)) return "A CNH deve ter entre 5 e 20 caracteres.";
    if (v.telefone && (v.telefone.length < 8 || v.telefone.length > 20)) return "Informe um telefone válido, com DDD.";
    if (v.endereco && (v.endereco.length < 5 || v.endereco.length > 200)) return "O endereço deve ter entre 5 e 200 caracteres.";
    return null;
  }

  if (form) {
    const botao = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      P.limparAviso(form);

      // Só envia o que mudou
      const mudou = {};
      for (const nome of CAMPOS) {
        const i = entrada(nome);
        if (!i) continue;
        const novo = String(i.value).trim();
        if (novo !== String(perfil[nome] ?? "")) mudou[nome] = novo;
      }
      if (!Object.keys(mudou).length) return P.avisar(form, "Nenhuma alteração para salvar.", "info");

      const erro = validar(mudou);
      if (erro) return P.avisar(form, erro, "erro");

      P.definirCarregando(botao, true, "Salvando...");
      const resp = await P.chamarApi("/perfil", { metodo: "PUT", corpo: mudou });
      P.definirCarregando(botao, false);

      if (!resp.ok) return resp.sessaoExpirada ? null : P.avisar(form, P.mensagemDeErro(resp), "erro");

      perfil = resp.dados.perfil || { ...perfil, ...mudou };
      perfil.cpf = mascaraCpf(perfil.cpf);
      perfil.telefone = mascaraTelefone(perfil.telefone);
      // Mantém o nome do "Olá, ..." em dia sem precisar entrar de novo
      try {
        const guardado = P.obterUsuario() || {};
        localStorage.setItem("usuario", JSON.stringify({ ...guardado, nome: perfil.nome }));
      } catch { /* localStorage indisponível */ }
      P.preencherSaudacao();
      exibirPerfil();
      P.avisar(form, resp.dados.msg || "Perfil atualizado!", "sucesso");
    });
  }
})();
