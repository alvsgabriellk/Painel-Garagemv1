from database import db, Usuario
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import create_access_token
from datetime import datetime
from utils import (
    gerar_senha_hash, 
    verificar_senha_hash, 
    gerar_token, 
    validar_token
)

from services.email_service import enviar_email_confirmacao, enviar_email_recuperacao

def cadastrar_usuario(nome, email, senha):
    usuario = Usuario(nome=nome, email=email, senha=gerar_senha_hash(senha), lgpd_aceite_em=datetime.utcnow())

    try:
        db.session.add(usuario)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"error": "Esse e-mail já está cadastrado"}, 409

    enviar_email_confirmacao(usuario)

    return {"msg": "Usuário cadastrado! Verifique seu e-mail para confirmar a conta."}, 201


def autenticar_usuario(email, senha):

    usuario = db.session.execute(
        select(Usuario).where(
            Usuario.email == email
        )
    ).scalar_one_or_none()

    if not usuario or not verificar_senha_hash(usuario.senha, senha):
        return {"error": "E-mail ou senha inválidos"}, 401

    if not usuario.ativo:
        return {"error": "Essa conta está desativada"}, 403

    if not usuario.verificado:
        return {"error": "Conta não verificada"}, 401

    token = create_access_token(identity=str(usuario.id))

    return {
        "msg": "Login realizado com sucesso!",
        "token": token,
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "verificado": usuario.verificado,
        },
    }, 200

def confirmar_email_usuario(token):
    email = validar_token(token, salt="confirmar-email")

    if not email:
        return {"error": "Token inválido ou expirado"}, 400

    usuario = db.session.execute(select(Usuario).where(Usuario.email == email)).scalar_one_or_none()

    if not usuario:
        return {"error": "Usuário não encontrado"}, 404

    if usuario.verificado:
        return {"msg": "E-mail já estava confirmado"}, 200

    usuario.verificado = True
    db.session.commit()

    return {"msg": "E-mail confirmado com sucesso!"}, 200

def solicitar_recuperacao_senha(email):
    usuario = db.session.execute(
        select(Usuario).where(
            Usuario.email == email
        )
    ).scalar_one_or_none()

    # email nao revelado para fins de segurança LGPD do usuario
    
    if usuario:
        enviar_email_recuperacao(usuario)

    return {"msg": "Se esse e-mail estiver cadastrado, enviamos as instruções de recuperação."}, 200

def redefinir_senha(token, nova_senha):
    email = validar_token(token, salt="recuperar-senha")

    if not email:
        return {"error": "Token inválido ou expirado"}, 400

    usuario = db.session.execute(select(Usuario).where(Usuario.email == email)).scalar_one_or_none()

    if not usuario:
        return {"error": "Usuário não encontrado"}, 404

    usuario.senha = gerar_senha_hash(nova_senha)
    db.session.commit()

    return {"msg": "Senha redefinida com sucesso!"}, 200