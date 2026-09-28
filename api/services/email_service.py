from flask import current_app
from utils import gerar_token
from services.email_service_2 import enviar_email

def enviar_email_confirmacao(usuario):
    token = gerar_token(usuario.email,
    salt="confirmar-email")

    app_url = current_app.config.get("APP_URL")

    link = f"{app_url}/auth/confirmar-email/{token}"

    corpo = f"""Olá, {usuario.nome}!

    Clique no link abaixo para confirmar seu e-mail:

    {link}

    Esse link expira em 1 hora.

    Se você não criou uma conta, ignore este e-mail.
    """

    enviar_email(
        destinatario=usuario.email,
        assunto="Confirme seu e-mail",
        corpo=corpo
    )

    
def enviar_email_recuperacao(usuario):
    token = gerar_token(usuario.email, salt="recuperar-senha")

    corpo = f"""Olá, {usuario.nome}!

    Copie o token abaixo e volte à página de recuperação de senha para criar uma nova senha:
    {token}

    Esse token expira em 1 hora.

    Se você não solicitou isso, ignore este e-mail.
    """

    enviar_email(
        destinatario=usuario.email,
        assunto="Recuperação de senha",
        corpo=corpo
    )