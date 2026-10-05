from datetime import datetime, timedelta

DIAS_TRIAL = 30


def trial_expirado(usuario):
    if usuario.plano != "free":
        return False

    limite = usuario.data_criado + timedelta(days=DIAS_TRIAL)
    return datetime.utcnow() > limite


def dias_restantes_trial(usuario):
    if usuario.plano != "free":
        return None

    limite = usuario.data_criado + timedelta(days=DIAS_TRIAL)
    restantes = (limite - datetime.utcnow()).days
    return max(0, restantes)


def bloquear_se_trial_expirado(usuario):
    """
    Chame isso no início de qualquer ação de escrita (criar veículo, manutenção,
    sinistro, etc). Se retornar algo diferente de None, é porque deve ser
    devolvido direto como resposta do endpoint (o trial acabou).
    """
    if trial_expirado(usuario):
        return {
            "error": "Seu período gratuito de 1 mês acabou. Faça upgrade do plano para continuar usando o sistema.",
            "trial_expirado": True,
        }, 402  # 402 Payment Required -- código HTTP feito exatamente pra esse caso

    return None
