from database import db, Sinistro, Veiculo, SinistroFoto
from sqlalchemy import select
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from utils import salvar_arquivo


def sinistro_criar(veiculo_id, dados):
    usuario_id = int(get_jwt_identity())

    veiculo = _veiculo_do_usuario(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    sinistro = Sinistro(
        veiculo_id=veiculo_id,
        tipo=dados["tipo"],
        data_ocorrido=datetime.strptime(dados["data_ocorrido"], "%Y-%m-%d").date(),
        local=dados.get("local"),
        descricao=dados.get("descricao"),
        seguro_acionado=bool(dados.get("seguro_acionado", False)),
    )

    db.session.add(sinistro)
    db.session.commit()

    return {"msg": "Sinistro registrado!", "sinistro": _sinistro_para_json(sinistro)}, 201


def sinistros_listar(veiculo_id):
    usuario_id = int(get_jwt_identity())

    veiculo = _veiculo_do_usuario(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    sinistros = db.session.execute(
        select(Sinistro).where(Sinistro.veiculo_id == veiculo_id).order_by(Sinistro.data_ocorrido.desc())
    ).scalars().all()

    return {"sinistros": [_sinistro_para_json(s) for s in sinistros]}, 200


def sinistro_deletar(veiculo_id, sinistro_id):
    usuario_id = int(get_jwt_identity())

    sinistro = _buscar_sinistro(veiculo_id, sinistro_id, usuario_id)
    if not sinistro:
        return {"error": "Sinistro não encontrado"}, 404

    db.session.delete(sinistro)
    db.session.commit()

    return {"msg": "Sinistro removido!"}, 200


def sinistro_upload_foto(veiculo_id, sinistro_id, arquivo):
    usuario_id = int(get_jwt_identity())

    sinistro = _buscar_sinistro(veiculo_id, sinistro_id, usuario_id)
    if not sinistro:
        return {"error": "Sinistro não encontrado"}, 404

    try:
        caminho = salvar_arquivo(arquivo, subpasta=f"sinistros/{sinistro_id}/fotos")
    except ValueError as e:
        return {"error": str(e)}, 400

    foto = SinistroFoto(sinistro_id=sinistro_id, caminho_arquivo=caminho)
    db.session.add(foto)
    db.session.commit()

    return {"msg": "Foto adicionada!", "sinistro": _sinistro_para_json(sinistro)}, 201


def sinistro_upload_bo(veiculo_id, sinistro_id, arquivo):
    usuario_id = int(get_jwt_identity())

    sinistro = _buscar_sinistro(veiculo_id, sinistro_id, usuario_id)
    if not sinistro:
        return {"error": "Sinistro não encontrado"}, 404

    try:
        caminho = salvar_arquivo(arquivo, subpasta=f"sinistros/{sinistro_id}/bo")
    except ValueError as e:
        return {"error": str(e)}, 400

    sinistro.bo_arquivo_path = caminho
    db.session.commit()

    return {"msg": "Boletim de ocorrência anexado!", "sinistro": _sinistro_para_json(sinistro)}, 201


def sinistro_arquivo_caminho(veiculo_id, sinistro_id, tipo, foto_id=None):
    """tipo: 'bo' ou 'foto'. Devolve o caminho relativo, ou None se não achar/não pertencer ao usuário."""
    usuario_id = int(get_jwt_identity())

    sinistro = _buscar_sinistro(veiculo_id, sinistro_id, usuario_id)
    if not sinistro:
        return None

    if tipo == "bo":
        return sinistro.bo_arquivo_path

    foto = db.session.execute(
        select(SinistroFoto).where(SinistroFoto.id == foto_id, SinistroFoto.sinistro_id == sinistro_id)
    ).scalar_one_or_none()

    return foto.caminho_arquivo if foto else None


def _veiculo_do_usuario(veiculo_id, usuario_id):
    return db.session.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.usuario_id == usuario_id)
    ).scalar_one_or_none()


def _buscar_sinistro(veiculo_id, sinistro_id, usuario_id):
    veiculo = _veiculo_do_usuario(veiculo_id, usuario_id)
    if not veiculo:
        return None

    return db.session.execute(
        select(Sinistro).where(Sinistro.id == sinistro_id, Sinistro.veiculo_id == veiculo_id)
    ).scalar_one_or_none()


def _sinistro_para_json(s):
    return {
        "id": s.id,
        "veiculo_id": s.veiculo_id,
        "tipo": s.tipo,
        "data_ocorrido": s.data_ocorrido.isoformat() if s.data_ocorrido else None,
        "local": s.local,
        "descricao": s.descricao,
        "seguro_acionado": s.seguro_acionado,
        "bo_anexado": bool(s.bo_arquivo_path),
        "fotos": [{"id": f.id} for f in s.fotos],
    }
