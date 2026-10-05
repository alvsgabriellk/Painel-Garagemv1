from database import db, Pneu, Veiculo
from sqlalchemy import select
from flask_jwt_extended import get_jwt_identity


def pneus_listar(veiculo_id):
    usuario_id = int(get_jwt_identity())

    veiculo = _veiculo_do_usuario(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    pneus = db.session.execute(select(Pneu).where(Pneu.veiculo_id == veiculo_id)).scalars().all()

    return {"pneus": [_pneu_para_json(p) for p in pneus]}, 200


def pneu_atualizar(veiculo_id, pneu_id, dados):
    usuario_id = int(get_jwt_identity())

    veiculo = _veiculo_do_usuario(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    pneu = db.session.execute(
        select(Pneu).where(Pneu.id == pneu_id, Pneu.veiculo_id == veiculo_id)
    ).scalar_one_or_none()

    if not pneu:
        return {"error": "Pneu não encontrado"}, 404

    if "marca" in dados:
        pneu.marca = dados["marca"]

    if "data_troca" in dados:
        from datetime import datetime
        pneu.data_troca = datetime.strptime(dados["data_troca"], "%Y-%m-%d").date() if dados["data_troca"] else None

    db.session.commit()

    return {"msg": "Pneu atualizado!", "pneu": _pneu_para_json(pneu)}, 200


def _veiculo_do_usuario(veiculo_id, usuario_id):
    return db.session.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.usuario_id == usuario_id)
    ).scalar_one_or_none()


def _pneu_para_json(p):
    return {
        "id": p.id,
        "posicao": p.posicao,
        "marca": p.marca,
        "data_troca": p.data_troca.isoformat() if p.data_troca else None,
    }
