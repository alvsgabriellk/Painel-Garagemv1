from itsdangerous import URLSafeTimedSerializer
from flask import current_app


def gerar_token(email, salt):
    """
    Gera um token assinado contendo o e-mail.
    O 'salt' separa o propósito do token (confirmação de e-mail x recuperação de senha),
    assim um token de confirmação de e-mail não pode ser reaproveitado pra resetar senha.
    """
    serializer = URLSafeTimedSerializer(current_app.config["KEY_API"])
    return serializer.dumps(email, salt=salt)


def validar_token(token, salt, max_age=3600):
    """
    Valida o token e devolve o e-mail se ainda for válido (dentro do max_age em segundos).
    Retorna None se o token for inválido, adulterado ou expirado.
    """
    serializer = URLSafeTimedSerializer(current_app.config["KEY_API"])
    try:
        return serializer.loads(token, salt=salt, max_age=max_age)
    except Exception:
        return None
