import os
from flask import current_app
from utils import mail
from flask_mail import Message

def enviar_com_flask_mail(destinatario, assunto, corpo):
    msg = Message(
        subject=assunto,
        recipients=[destinatario]
    )

    msg.body = corpo

    try:
        mail.send(msg)
        current_app.logger.warning(f"Flask-Mail: e-mail enviado para {destinatario}")
    except Exception as e:
        current_app.logger.error(f"Flask-Mail falhou: {e}") 


def enviar_com_resend(destinatario, assunto, corpo):
    pass

def enviar_com_log(destinatario, assunto, corpo):
    current_app.logger.info(f"[EMAIL] Para: {destinatario} | {assunto}\n{corpo}")

def enviar_email(destinatario, assunto, corpo):
    provedor = os.getenv("EMAIL_PROVEDOR", "flask_mail")

    if provedor == "resend":
        enviar_com_resend(
            destinatario=destinatario,
            assunto=assunto,
            corpo=corpo
        )

    elif provedor == "log":
        enviar_com_log(
            destinatario=destinatario,
            assunto=assunto, 
            corpo=corpo
        )

    else:
        enviar_com_flask_mail(
            destinatario=destinatario,
            assunto=assunto,
            corpo=corpo
        )