from pagamentos import processar_pagamento
from services.acesso_service import dias_restantes_trial, trial_expirado

LIMITES_POR_PLANO = {
    "free": 1,
    "basico": 2,
    "plus": 5,
    "premium": None,  # None = ilimitado
}

PLANOS_INFO = [
    {
        "id": "free",
        "nome": "Grátis (30 dias)",
        "preco": "R$ 0,00",
        "limite_veiculos": 1,
        "recursos": ["1 veículo", "Alertas de óleo e correia", "Notificações por e-mail"],
    },
    {
        "id": "basico",
        "nome": "Básico",
        "preco": "A definir",
        "limite_veiculos": 2,
        "recursos": ["Cadastro com OCR do CRLV", "Alertas de óleo e correia", "Histórico de manutenções"],
    },
    {
        "id": "plus",
        "nome": "Plus",
        "preco": "A definir",
        "limite_veiculos": 5,
        "recursos": ["Tudo do Básico", "Relatórios exportáveis em PDF", "Lembretes por e-mail e WhatsApp"],
    },
    {
        "id": "premium",
        "nome": "Premium",
        "preco": "A definir",
        "limite_veiculos": None,
        "recursos": ["Tudo do Plus", "Gestão de frota (vários motoristas)", "Suporte prioritário"],
    },
]
# NOTA: os preços de basico/plus/premium ainda não foram definidos -- só o plano
# "free" tem preço certo (R$ 0). Ajuste PLANOS_INFO assim que isso for decidido.


def limite_de_veiculos(plano):
    return LIMITES_POR_PLANO.get(plano, LIMITES_POR_PLANO["free"])


def listar_planos():
    return {"planos": PLANOS_INFO}, 200


def status_plano(usuario):
    return {
        "plano": usuario.plano,
        "limite_veiculos": limite_de_veiculos(usuario.plano),
        "trial_expirado": trial_expirado(usuario),
        "dias_restantes_trial": dias_restantes_trial(usuario),
    }, 200


def fazer_upgrade(usuario, novo_plano):
    if novo_plano not in LIMITES_POR_PLANO or novo_plano == "free":
        return {"error": "Plano inválido"}, 400

    sucesso, mensagem = processar_pagamento(usuario, novo_plano)

    if not sucesso:
        return {"error": mensagem}, 402

    from database import db
    usuario.plano = novo_plano
    db.session.commit()

    return {"msg": f"Plano alterado para {novo_plano}! ({mensagem})", "plano": novo_plano}, 200
