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


def enviar_com_resend(destinatario, assunto, corpo):
    pass

def enviar_email(destinatario, assunto, corpo):
    if current_app.config["ENV"] == "production":
        enviar_com_resend(
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