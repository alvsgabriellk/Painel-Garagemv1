from database import db, Usuario
from flask_jwt_extended import get_jwt_identity


def perfil_buscar():
    usuario_id = int(get_jwt_identity())
    usuario = db.session.get(Usuario, usuario_id)

    return {"perfil": _perfil_para_json(usuario)}, 200


def perfil_atualizar(dados):
    usuario_id = int(get_jwt_identity())
    usuario = db.session.get(Usuario, usuario_id)

    campos_permitidos = ["nome", "cpf", "cnh", "telefone", "endereco"]
    for campo in campos_permitidos:
        if campo in dados:
            setattr(usuario, campo, dados[campo])

    db.session.commit()

    return {"msg": "Perfil atualizado!", "perfil": _perfil_para_json(usuario)}, 200


def _perfil_para_json(usuario):
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "cpf": usuario.cpf,
        "cnh": usuario.cnh,  # pode ser None -- é opcional
        "telefone": usuario.telefone,
        "endereco": usuario.endereco,
        "plano": usuario.plano,
        "lgpd_aceite_em": usuario.lgpd_aceite_em.isoformat() if usuario.lgpd_aceite_em else None,
        "verificado": usuario.verificado,
    }
