from services import listar_planos, fazer_upgrade, status_plano
from database import db, Usuario
from flask_jwt_extended import get_jwt_identity


def planos_lista():
    return listar_planos()


def plano_status():
    usuario_id = int(get_jwt_identity())
    usuario = db.session.get(Usuario, usuario_id)
    return status_plano(usuario)


def plano_atualizar(dados):
    if not dados.get("plano"):
        return {"error": "Informe o plano desejado"}, 400

    usuario_id = int(get_jwt_identity())
    usuario = db.session.get(Usuario, usuario_id)

    return fazer_upgrade(usuario, dados["plano"])
