import os
import requests
from flask import current_app
from utils import mail
from flask_mail import Message

def enviar_com_flask_mail(destinatario, assunto, corpo):
    msg = Message(
        subject=assunto,
        recipients=[destinatario]
    )

    msg.body = corpo

    mail.send(msg)
    current_app.logger.warning(f"Flask-Mail: e-mail enviado para {destinatario}")
    
    current_app.logger.warning(f"Flask-Mail: e-mail enviado para {destinatario}") 

def enviar_com_brevo(destinatario, assunto, corpo):
    resp = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "api-key": os.environ["BREVO_API_KEY"],
            "accept": "application/json",
        },
        json={
            "sender": {"name": "Garagem", "email": os.environ["MAIL_REMETENTE"]},
            "to": [{"email": destinatario}],
            "subject": assunto,
            "textContent": corpo,
        },
        timeout=10,
    )
    if not resp.ok:
        current_app.logger.error(f"Brevo falhou: {resp.status_code} {resp.text}")
        resp.raise_for_status()
    current_app.logger.warning(f"Brevo: e-mail enviado para {destinatario}")

def enviar_com_log(destinatario, assunto, corpo):
    current_app.logger.info(f"[EMAIL] Para: {destinatario} | {assunto}\n{corpo}")



def enviar_email(destinatario, assunto, corpo):
    provedor = os.getenv("EMAIL_PROVEDOR", "flask_mail")

    if provedor == "brevo":
        enviar_com_brevo(
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