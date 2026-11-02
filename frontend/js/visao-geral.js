// visao-geral.js — resumo do veículo ativo (km, gastos, alertas de óleo, correia, impostos e pneus)
// Precisa do sessao.js e do painel-comum.js carregados antes.
//
// Ganchos no HTML (já estão no visao-geral.html que acompanha este arquivo):
//   [data-stat="km_atual" | "gasto_6m" | "custo_km"]   números do topo
//   [data-card="oleo" | "licenciamento" | "correia" | "pneus"]  cada cartão de alerta, e dentro dele:
//       [data-campo="titulo"] [data-campo="badge"] [data-campo="barra"] [data-campo="texto"]
//   .greeting-name, .vehicle-name, .vehicle-plate   (já existiam; o painel-comum.js preenche)

(async () => {
  const P = window.GaragemPainel;
  if (!P) { console.error("visao-geral.js: carregue o painel-comum.js antes."); return; }

  const ctx = await P.carregarContexto();
  if (!ctx || !P.exigirVeiculo(ctx)) return;
  const v = ctx.veiculo;

  // ---------- utilidades de tela ----------
  const CLASSE_BADGE = { ok: "badge-teal", atencao: "badge-amber", alerta: "badge-red" };

  function definirStat(nome, texto, dica) {
    const n = document.querySelector(`[data-stat="${nome}"]`);
    if (!n) return;
    n.textContent = texto;
    if (dica) n.title = dica; else n.removeAttribute("title");
  }

  function preencherCard(nome, { titulo, badge, nivel, texto, largura }) {
    const card = document.querySelector(`[data-card="${nome}"]`);
    if (!card) return;
    const campo = (c) => card.querySelector(`[data-campo="${c}"]`);

    if (campo("titulo") && titulo != null) campo("titulo").textContent = titulo;
    if (campo("texto") && texto != null) campo("texto").textContent = texto;

    const b = campo("badge");
    if (b) {
      if (badge != null) b.textContent = badge;
      b.classList.remove("badge-teal", "badge-amber", "badge-red", "badge-neutral");
      b.classList.add(CLASSE_BADGE[nivel]);
    }

    const barra = campo("barra");
    if (barra && largura != null) {
      barra.style.width = `${largura}%`;
      barra.classList.toggle("teal", nivel === "ok");
      barra.classList.toggle("red", nivel === "alerta");
    }
  }

  // ---------- regras de alerta ----------
  // info = { km_faltam, percentual } vindo da API (oleo / correia)
  function estadoPorKm(info) {
    const faltam = Math.round(info.km_faltam);
    const pct = Math.max(0, Math.min(100, Number(info.percentual) || 0));
    if (faltam <= 0) {
      return { nivel: "alerta", largura: 100, badge: faltam === 0 ? "Vence agora" : `Vencida há ${P.formatarKm(-faltam)} km` };
    }
    if (pct >= 80) return { nivel: "atencao", largura: pct, badge: `Faltam ${P.formatarKm(faltam)} km` };
    return { nivel: "ok", largura: pct, badge: `Ok · faltam ${P.formatarKm(faltam)} km` };
  }

  function nivelDoImposto(status) {
    const s = P.semAcento(status);
    if (/(nao pago|pend|atras|venc|aberto|debito)/.test(s)) return "alerta";
    if (/(pago|quitad|em dia|regular|ok)/.test(s)) return "ok";
    return "atencao";
  }

  // ---------- números do topo ----------
  definirStat("km_atual", P.formatarKm(v.km_atual));

  // ---------- cartões que só dependem do veículo ----------
  const oleo = estadoPorKm(v.oleo);
  preencherCard("oleo", {
    ...oleo,
    titulo: oleo.nivel === "alerta" ? "Troca de óleo vencida"
      : oleo.nivel === "atencao" ? "Troca de óleo se aproximando" : "Troca de óleo em dia",
  });

  const correia = estadoPorKm(v.correia);
  preencherCard("correia", {
    ...correia,
    titulo: correia.nivel === "alerta" ? "Troca da correia dentada vencida"
      : correia.nivel === "atencao" ? "Troca da correia dentada se aproximando" : "Correia dentada",
  });

  const lic = v.licenciamento || {};
  const ipva = v.ipva || {};
  const detalhe = (nome, imp) => `${nome}: ${imp.status || "—"}${imp.valor ? ` (${P.formatarMoeda(imp.valor)})` : ""}`;
  preencherCard("licenciamento", {
    titulo: "Licenciamento",
    badge: lic.status || "—",
    nivel: nivelDoImposto(lic.status),
    texto: `${detalhe("Licenciamento", lic)} · ${detalhe("IPVA", ipva)}`,
  });

  // ---------- gastos e pneus: precisam de mais chamadas ----------
  // "ate" = amanhã, porque o servidor conta o dia em UTC e à noite (horário do Brasil) já é "amanhã" lá.
  const [relatorio, pneusResp] = await Promise.all([
    P.chamarApi(`/veiculos/${v.id}/relatorio?de=${P.hojeISO(-183)}&ate=${P.hojeISO(1)}`),
    P.chamarApi(`/veiculos/${v.id}/pneus`),
  ]);

  if (relatorio.ok) {
    const gasto = Number(relatorio.dados.total_periodo) || 0;
    const custoBruto = relatorio.dados.custo_por_km; // null quando o servidor não tem km rodado para dividir
    const custoKm = Number(custoBruto) || 0;
    definirStat("gasto_6m", P.formatarMoeda(gasto));

    // Se o servidor tiver rodado ≤ 1 km para dividir, ele devolve o gasto inteiro como "custo por km".
    // Isso não é um custo por km de verdade, então mostramos "—".
    const semBase = custoBruto == null || (gasto > 0 && Math.abs(custoKm - gasto) < 0.005);
    definirStat("custo_km", semBase ? "—" : P.formatarMoeda(custoKm),
      semBase ? "Ainda não há quilômetros rodados suficientes para calcular." : "");
  } else if (!relatorio.sessaoExpirada) {
    definirStat("gasto_6m", "—");
    definirStat("custo_km", "—");
    P.toast(P.mensagemDeErro(relatorio), "erro");
  }

  // Pneus + alinhamento
  const trocas = pneusResp.ok
    ? (pneusResp.dados.pneus || []).map((p) => p.data_troca).filter(Boolean).sort()
    : [];
  const ultimaTroca = trocas[trocas.length - 1] || null;
  const alin = v.alinhamento || {};
  const alinhado = alin.status === "Alinhado";

  if (!alinhado) {
    preencherCard("pneus", {
      titulo: "Pneus e alinhamento",
      badge: "Verificar alinhamento",
      nivel: "atencao",
      texto: ultimaTroca
        ? `Sem alinhamento registrado desde a última troca de pneus (${P.formatarData(ultimaTroca)}).`
        : "Nenhum alinhamento registrado.",
    });
  } else if (ultimaTroca && alin.data && ultimaTroca > alin.data) {
    preencherCard("pneus", {
      titulo: "Pneus e alinhamento",
      badge: "Verificar alinhamento",
      nivel: "atencao",
      texto: `Pneus trocados em ${P.formatarData(ultimaTroca)}; último alinhamento em ${P.formatarData(alin.data)}.`,
    });
  } else {
    preencherCard("pneus", {
      titulo: "Pneus e alinhamento",
      badge: "Alinhado",
      nivel: "ok",
      texto: alin.data ? `Último alinhamento em ${P.formatarData(alin.data)}.` : "Alinhamento em dia.",
    });
  }
})();
