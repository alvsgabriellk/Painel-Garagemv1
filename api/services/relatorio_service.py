from datetime import datetime, timedelta
from collections import defaultdict
from database import db, Manutencao, Veiculo
from sqlalchemy import select
from flask_jwt_extended import get_jwt_identity


def relatorio_gerar(veiculo_id, data_de=None, data_ate=None):
    usuario_id = int(get_jwt_identity())

    veiculo = db.session.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.usuario_id == usuario_id)
    ).scalar_one_or_none()

    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    hoje = datetime.utcnow().date()
    de = datetime.strptime(data_de, "%Y-%m-%d").date() if data_de else hoje.replace(day=1)
    ate = datetime.strptime(data_ate, "%Y-%m-%d").date() if data_ate else hoje

    manutencoes = db.session.execute(
        select(Manutencao).where(
            Manutencao.veiculo_id == veiculo_id,
            Manutencao.data_manutencao >= de,
            Manutencao.data_manutencao <= ate,
        )
    ).scalars().all()

    total_periodo = sum(float(m.valor or 0) for m in manutencoes)

    por_mes = defaultdict(float)
    for m in manutencoes:
        chave = m.data_manutencao.strftime("%Y-%m")
        por_mes[chave] += float(m.valor or 0)

    grafico = [
        {"mes": datetime.strptime(chave, "%Y-%m").strftime("%b/%y"), "valor": round(valor, 2)}
        for chave, valor in sorted(por_mes.items())
    ]

    # custo por km sempre usa a janela fixa de 6 meses (independente do filtro de data),
    # porque precisa de um km de referência consistente
    seis_meses_atras = hoje - timedelta(days=183)
    manutencoes_6m = [m for m in manutencoes if m.data_manutencao >= seis_meses_atras]
    custo_6m = sum(float(m.valor or 0) for m in manutencoes_6m)
    km_rodado_6m = max(1, (veiculo.km_atual or 0) - (veiculo.km_ha_6_meses or 0))
    custo_por_km = round(custo_6m / km_rodado_6m, 2)

    return {
        "periodo": {"de": de.isoformat(), "ate": ate.isoformat()},
        "total_periodo": round(total_periodo, 2),
        "quantidade_manutencoes": len(manutencoes),
        "custo_por_km": custo_por_km,
        "grafico_por_mes": grafico,
    }, 200
