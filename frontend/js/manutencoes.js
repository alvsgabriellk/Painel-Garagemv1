// manutencoes.js — histórico de manutenções do veículo ativo: listar, registrar, editar e excluir
// Precisa do sessao.js e do painel-comum.js carregados antes.
//
// O QUE ESTE ARQUIVO ESPERA NO HTML (tudo é opcional: o que não existir é ignorado)
//
//  Lista:     [data-lista="manutencoes"]  pode ser um <tbody>, <table>, <ul>/<ol> ou <div>.
//             Cada manutenção é desenhada ali dentro (data, tipo, oficina, km, valor, garantia).
//             Em <tbody> vira linha <tr>; em <ul>/<ol> vira <li>; nos outros vira <div class="card">.
//             Se for tabela, as 7 colunas são, nesta ordem: Data, Tipo, Oficina, Km, Valor, Garantia, Ações.
//
//  Resumo (texto):  [data-campo="total_gasto" | "quantidade" | "ultima_manutencao"]
//
//  Formulário:  <form data-form="manutencao"> com inputs de name:
//     tipo_manutencao, oficina, valor, km_manutencao, garantia_dias, data_manutencao
//     pneus  → vários <input type="checkbox" name="pneus" value="..."> com EXATAMENTE estes valores:
//              "Dianteiro esquerdo", "Dianteiro direito", "Traseiro esquerdo", "Traseiro direito", "Estepe"
//     + (opcional) <div data-message hidden></div> para as mensagens
//
//  Botões (opcional):  [data-acao="cancelar-edicao"]  sai do modo de edição
//  Trocas por modo (opcional):  data-modo="novo" só aparece ao registrar; data-modo="edicao" só ao editar
//
//  Regras do servidor que o formulário respeita:
//   - o km da manutenção não pode ser menor que o km atual do veículo;
//   - ao editar só dá para mudar tipo, oficina, valor e garantia (km e data ficam travados);
//   - tipos com "óleo", "correia" ou "alinhamento" no nome atualizam os alertas da Visão geral sozinhos.

(async () => {
  const P = window.GaragemPainel;
  if (!P) { console.error("manutencoes.js: carregue o painel-comum.js antes."); return; }

  const ctx = await P.carregarContexto();
  if (!ctx || !P.exigirVeiculo(ctx)) return;

  let veiculo = ctx.veiculo;
  let manutencoes = [];
  let editandoId = null;

  const form = document.querySelector('[data-form="manutencao"]');
  const lista = document.querySelector('[data-lista="manutencoes"]');
  const botaoEnviar = form ? form.querySelector('button[type="submit"]') : null;
  const entrada = (nome) => (form && form.elements[nome]) || null;

  // ---------- formulário: estado inicial ----------
  function prepararFormulario() {
    if (!form) return;
    const km = entrada("km_manutencao");
    if (km) { km.min = veiculo.km_atual; km.placeholder = `a partir de ${P.formatarKm(veiculo.km_atual)} km`; }
    const data = entrada("data_manutencao");
    if (data) { data.max = P.hojeISO(); if (!data.value) data.value = P.hojeISO(); }
  }

  function aplicarModo() {
    const emEdicao = editandoId !== null;
    document.querySelectorAll("[data-modo]").forEach((n) => {
      n.hidden = n.dataset.modo !== (emEdicao ? "edicao" : "novo");
    });
    document.querySelectorAll('[data-acao="cancelar-edicao"]').forEach((n) => { n.hidden = !emEdicao; });
    if (!form) return;
    // Na edição o servidor só aceita tipo, oficina, valor e garantia
    ["km_manutencao", "data_manutencao"].forEach((n) => { const i = entrada(n); if (i) i.disabled = emEdicao; });
    form.querySelectorAll('input[name="pneus"]').forEach((c) => { c.disabled = emEdicao; });
  }

  function sairDaEdicao() {
    editandoId = null;
    if (form) {
      form.reset();
      P.limparAviso(form);
      prepararFormulario();
    }
    aplicarModo();
  }

  // ---------- lista ----------
  function textoGarantia(m) {
    if (!m.garantia_dias) return "Sem garantia";
    const fim = P.somarDias(m.data_manutencao, m.garantia_dias);
    if (!fim) return `${m.garantia_dias} dia(s) de garantia`;
    return fim >= P.hojeISO() ? `Garantia até ${P.formatarData(fim)}` : `Garantia vencida em ${P.formatarData(fim)}`;
  }

  function botoesDaLinha(m) {
    return [
      P.el("button", { type: "button", class: "btn", "data-acao": "editar", "data-id": m.id, text: "Editar" }),
      " ",
      P.el("button", { type: "button", class: "btn", "data-acao": "excluir", "data-id": m.id, text: "Excluir" }),
    ];
  }

  function desenharLista() {
    if (!lista) return;
    const raiz = lista.tagName === "TABLE" ? (lista.tBodies[0] || lista.createTBody()) : lista;
    raiz.replaceChildren();

    if (!manutencoes.length) {
      const msg = "Nenhuma manutenção registrada ainda.";
      if (raiz.tagName === "TBODY") raiz.append(P.el("tr", {}, P.el("td", { colspan: 7, text: msg })));
      else raiz.append(P.el("p", { class: "muted", text: msg }));
      return;
    }

    for (const m of manutencoes) {
      const celulas = [
        P.formatarData(m.data_manutencao), m.tipo_manutencao, m.oficina || "—",
        `${P.formatarKm(m.km_manutencao)} km`, P.formatarMoeda(m.valor), textoGarantia(m),
      ];

      if (raiz.tagName === "TBODY") {
        raiz.append(P.el("tr", { "data-id": m.id },
          celulas.map((t) => P.el("td", { text: t })),
          P.el("td", {}, botoesDaLinha(m))));
      } else if (raiz.tagName === "UL" || raiz.tagName === "OL") {
        raiz.append(P.el("li", { "data-id": m.id },
          P.el("strong", { text: `${celulas[1]} — ${celulas[0]}` }),
          P.el("div", { class: "muted", text: `${celulas[2]} · ${celulas[3]} · ${celulas[4]} · ${celulas[5]}` }),
          P.el("div", {}, botoesDaLinha(m))));
      } else {
        raiz.append(P.el("div", { class: "card", "data-id": m.id },
          P.el("div", { class: "card-head" }, P.el("h2", { text: celulas[1] }), P.el("span", { class: "muted", text: celulas[0] })),
          P.el("p", { class: "muted", text: `${celulas[2]} · ${celulas[3]} · ${celulas[4]} · ${celulas[5]}` }),
          P.el("div", {}, botoesDaLinha(m))));
      }
    }
  }

  function atualizarResumo() {
    const total = manutencoes.reduce((s, m) => s + (Number(m.valor) || 0), 0);
    const valores = {
      total_gasto: P.formatarMoeda(total),
      quantidade: String(manutencoes.length),
      ultima_manutencao: manutencoes.length ? P.formatarData(manutencoes[0].data_manutencao) : "—",
    };
    document.querySelectorAll("[data-campo]").forEach((n) => {
      if (n.dataset.campo in valores) n.textContent = valores[n.dataset.campo];
    });
  }

  // ---------- carregar ----------
  async function carregar() {
    const [lis, car] = await Promise.all([
      P.chamarApi(`/manutencoes?veiculo_id=${veiculo.id}`),
      P.chamarApi(`/veiculos/${veiculo.id}`), // o km atual muda quando se registra uma manutenção
    ]);
    if (lis.sessaoExpirada || car.sessaoExpirada) return;
    if (car.ok) veiculo = car.dados.veiculo;
    if (!lis.ok) { P.toast(P.mensagemDeErro(lis), "erro"); return; }
    // mais nova primeiro; no mesmo dia, a registrada por último (a API não define a ordem dentro do dia)
    manutencoes = (lis.dados.manutencoes || []).slice()
      .sort((a, b) => String(b.data_manutencao).localeCompare(String(a.data_manutencao)) || b.id - a.id);
    desenharLista();
    atualizarResumo();
    prepararFormulario();
  }

  // ---------- salvar ----------
  function lerNumeroCampo(nome) {
    const i = entrada(nome);
    if (!i) return undefined;
    const t = String(i.value).trim();
    if (t === "") return null;
    const n = P.lerNumero(t);
    return n === null ? NaN : n;
  }
  const lerTexto = (nome) => { const i = entrada(nome); return i ? String(i.value).trim() : undefined; };

  // Validações compartilhadas (registrar e editar). As regras espelham validators/manutencao_validators.py.
  function validarComum(d) {
    if (d.tipo_manutencao !== undefined && (d.tipo_manutencao.length < 2 || d.tipo_manutencao.length > 100)) {
      return "O tipo da manutenção deve ter entre 2 e 100 caracteres.";
    }
    if (d.oficina && (d.oficina.length < 2 || d.oficina.length > 100)) return "O nome da oficina deve ter entre 2 e 100 caracteres.";
    if (d.valor !== undefined && d.valor !== null && (Number.isNaN(d.valor) || d.valor < 0)) return "O valor deve ser um número maior ou igual a zero.";
    if (d.garantia_dias !== undefined && d.garantia_dias !== null &&
      (!Number.isInteger(d.garantia_dias) || d.garantia_dias < 0)) return "A garantia deve ser um número inteiro de dias.";
    return null;
  }

  async function registrar() {
    const d = {
      tipo_manutencao: lerTexto("tipo_manutencao"),
      oficina: lerTexto("oficina"),
      valor: lerNumeroCampo("valor"),
      km_manutencao: lerNumeroCampo("km_manutencao"),
      garantia_dias: lerNumeroCampo("garantia_dias"),
      data_manutencao: lerTexto("data_manutencao"),
    };

    if (!d.tipo_manutencao) return "Informe o tipo da manutenção.";
    if (d.km_manutencao === undefined || d.km_manutencao === null || Number.isNaN(d.km_manutencao) || d.km_manutencao < 0) {
      return "Informe o km do veículo na manutenção.";
    }
    if (d.km_manutencao < veiculo.km_atual) {
      return `O km da manutenção não pode ser menor que o km atual do veículo (${P.formatarKm(veiculo.km_atual)} km).`;
    }
    if (d.data_manutencao && d.data_manutencao > P.hojeISO()) return "A data da manutenção não pode estar no futuro.";
    const erro = validarComum(d);
    if (erro) return erro;

    const corpo = { veiculo_id: veiculo.id, tipo_manutencao: d.tipo_manutencao, km_manutencao: d.km_manutencao };
    if (d.oficina) corpo.oficina = d.oficina;
    if (d.valor !== undefined && d.valor !== null) corpo.valor = d.valor;
    if (d.garantia_dias) corpo.garantia_dias = d.garantia_dias;
    if (d.data_manutencao) corpo.data_manutencao = d.data_manutencao;
    const pneus = [...form.querySelectorAll('input[name="pneus"]:checked')].map((c) => c.value);
    if (pneus.length) corpo.pneus = pneus;

    P.definirCarregando(botaoEnviar, true, "Registrando...");
    const resp = await P.chamarApi("/manutencoes/create-manutencao", { metodo: "POST", corpo });
    P.definirCarregando(botaoEnviar, false);
    if (resp.sessaoExpirada) return null;
    if (!resp.ok) return P.mensagemDeErro(resp);

    form.reset();
    await carregar(); // atualiza lista, resumo e o km mínimo do formulário
    P.avisar(form, resp.dados.msg || "Manutenção registrada!", "sucesso");
    return null;
  }

  async function salvarEdicao() {
    const atual = manutencoes.find((m) => m.id === editandoId);
    if (!atual) { sairDaEdicao(); return "Essa manutenção não existe mais."; }

    const d = {
      tipo_manutencao: lerTexto("tipo_manutencao"),
      oficina: lerTexto("oficina"),
      valor: lerNumeroCampo("valor"),
      garantia_dias: lerNumeroCampo("garantia_dias"),
    };
    const erro = validarComum(d);
    if (erro) return erro;

    const corpo = {};
    if (d.tipo_manutencao && d.tipo_manutencao !== atual.tipo_manutencao) corpo.tipo_manutencao = d.tipo_manutencao;
    if (d.oficina !== undefined && d.oficina !== (atual.oficina === "Não informado" ? "" : atual.oficina || "")) corpo.oficina = d.oficina;
    if (d.valor !== undefined && d.valor !== null && d.valor !== atual.valor) corpo.valor = d.valor;
    if (d.garantia_dias !== undefined && (d.garantia_dias || null) !== (atual.garantia_dias || null)) corpo.garantia_dias = d.garantia_dias || null;
    if (!Object.keys(corpo).length) { P.avisar(form, "Nenhuma alteração para salvar.", "info"); return null; }

    P.definirCarregando(botaoEnviar, true, "Salvando...");
    const resp = await P.chamarApi(`/manutencoes/${editandoId}`, { metodo: "PUT", corpo });
    P.definirCarregando(botaoEnviar, false);
    if (resp.sessaoExpirada) return null;
    if (!resp.ok) return P.mensagemDeErro(resp);

    sairDaEdicao();
    await carregar();
    P.avisar(form, resp.dados.msg || "Manutenção atualizada!", "sucesso");
    return null;
  }

  // ---------- ligações ----------
  if (form) {
    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      P.limparAviso(form);
      const erro = editandoId === null ? await registrar() : await salvarEdicao();
      if (erro) P.avisar(form, erro, "erro");
    });
  }

  document.querySelectorAll('[data-acao="cancelar-edicao"]').forEach((b) => b.addEventListener("click", (e) => {
    e.preventDefault();
    sairDaEdicao();
  }));

  // Botão "Nova manutenção" do topo: sai da edição (se houver) e leva até o formulário
  document.querySelectorAll('[data-acao="nova-manutencao"]').forEach((b) => b.addEventListener("click", (e) => {
    e.preventDefault();
    if (editandoId !== null) sairDaEdicao();
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      const primeiro = entrada("tipo_manutencao");
      if (primeiro) primeiro.focus({ preventScroll: true });
    }
  }));

  // Um único ouvinte para os botões Editar / Excluir de todas as linhas
  if (lista) {
    lista.addEventListener("click", async (evento) => {
      const botao = evento.target.closest("[data-acao][data-id]");
      if (!botao) return;
      const id = Number(botao.dataset.id);
      const m = manutencoes.find((x) => x.id === id);
      if (!m) return;

      if (botao.dataset.acao === "editar") {
        if (!form) return;
        editandoId = id;
        const preencher = (nome, valor) => { const i = entrada(nome); if (i) i.value = valor ?? ""; };
        preencher("tipo_manutencao", m.tipo_manutencao);
        preencher("oficina", m.oficina === "Não informado" ? "" : m.oficina);
        preencher("valor", m.valor);
        preencher("garantia_dias", m.garantia_dias);
        preencher("km_manutencao", m.km_manutencao);
        preencher("data_manutencao", m.data_manutencao);
        P.limparAviso(form);
        aplicarModo();
        form.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (botao.dataset.acao === "excluir") {
        if (!confirm(`Excluir a manutenção "${m.tipo_manutencao}" de ${P.formatarData(m.data_manutencao)}?`)) return;
        botao.disabled = true;
        const resp = await P.chamarApi(`/manutencoes/${id}`, { metodo: "DELETE" });
        if (resp.sessaoExpirada) return;
        if (!resp.ok) { botao.disabled = false; return P.toast(P.mensagemDeErro(resp), "erro"); }
        if (editandoId === id) sairDaEdicao();
        await carregar();
        P.toast(resp.dados.msg || "Manutenção removida!", "sucesso");
      }
    });
  }

  aplicarModo();
  await carregar();
})();
