import unicodedata
from datetime import datetime
from database import db, Manutencao, Veiculo, Pneu, Usuario
from sqlalchemy import select
from flask_jwt_extended import get_jwt_identity
from services.acesso_service import bloquear_se_trial_expirado


def _sem_acento(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn").lower()


def manutencao_criar(dados):
    usuario_id = int(get_jwt_identity())
    usuario = db.session.get(Usuario, usuario_id)

    bloqueio = bloquear_se_trial_expirado(usuario)
    if bloqueio:
        return bloqueio

    veiculo = db.session.execute(
        select(Veiculo).where(Veiculo.id == dados["veiculo_id"], Veiculo.usuario_id == usuario_id)
    ).scalar_one_or_none()

    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    km_manutencao = float(dados["km_manutencao"])

    if km_manutencao < (veiculo.km_atual or 0):
        return {"error": "O km da manutenção não pode ser menor que o km atual registrado do veículo"}, 400

    tipo = dados["tipo_manutencao"]

    manutencao = Manutencao(
        veiculo_id=veiculo.id,
        tipo_manutencao=tipo,
        oficina=dados.get("oficina") or "Não informado",
        valor=float(dados.get("valor", 0) or 0),
        km_manutencao=km_manutencao,
        garantia_dias=int(dados["garantia_dias"]) if dados.get("garantia_dias") else None,
        data_manutencao=_parse_data(dados.get("data_manutencao")),
    )

    # regra: registrar manutenção com km maior atualiza o km_atual do veículo
    veiculo.km_atual = km_manutencao

    # regras automáticas por tipo de manutenção
    tipo_normalizado = _sem_acento(tipo)

    if "oleo" in tipo_normalizado:
        veiculo.oleo_km_ultima_troca = km_manutencao

    if "correia" in tipo_normalizado:
        veiculo.correia_km_ultima_troca = km_manutencao

    if "alinhamento" in tipo_normalizado:
        veiculo.alinhamento_geral = "Alinhado"
        veiculo.alinhamento_data = manutencao.data_manutencao

    pneus_trocados = dados.get("pneus") or []
    if pneus_trocados:
        registros = db.session.execute(
            select(Pneu).where(Pneu.veiculo_id == veiculo.id, Pneu.posicao.in_(pneus_trocados))
        ).scalars().all()
        for pneu in registros:
            pneu.data_troca = manutencao.data_manutencao

    db.session.add(manutencao)
    db.session.commit()

    return {"msg": "Manutenção registrada!", "manutencao": _manutencao_para_json(manutencao)}, 201


def manutencoes_listar(veiculo_id=None):
    usuario_id = int(get_jwt_identity())

    query = select(Manutencao).join(Veiculo).where(Veiculo.usuario_id == usuario_id)
    if veiculo_id:
        query = query.where(Manutencao.veiculo_id == veiculo_id)

    manutencoes = db.session.execute(query.order_by(Manutencao.data_manutencao.desc())).scalars().all()

    return {"manutencoes": [_manutencao_para_json(m) for m in manutencoes]}, 200


def manutencao_encontrar(manutencao_id):
    usuario_id = int(get_jwt_identity())

    manutencao = _buscar_manutencao(manutencao_id, usuario_id)
    if not manutencao:
        return {"error": "Manutenção não encontrada"}, 404

    return {"manutencao": _manutencao_para_json(manutencao)}, 200


def manutencao_atualizar_dados(manutencao_id, dados):
    usuario_id = int(get_jwt_identity())

    manutencao = _buscar_manutencao(manutencao_id, usuario_id)
    if not manutencao:
        return {"error": "Manutenção não encontrada"}, 404

    if "tipo_manutencao" in dados:
        manutencao.tipo_manutencao = dados["tipo_manutencao"]

    if "oficina" in dados:
        manutencao.oficina = dados["oficina"]

    if "valor" in dados:
        manutencao.valor = float(dados["valor"])

    if "garantia_dias" in dados:
        manutencao.garantia_dias = int(dados["garantia_dias"]) if dados["garantia_dias"] else None

    db.session.commit()

    return {"msg": "Manutenção atualizada!", "manutencao": _manutencao_para_json(manutencao)}, 200


def manutencao_deletar(manutencao_id):
    usuario_id = int(get_jwt_identity())

    manutencao = _buscar_manutencao(manutencao_id, usuario_id)
    if not manutencao:
        return {"error": "Manutenção não encontrada"}, 404

    db.session.delete(manutencao)
    db.session.commit()

    return {"msg": "Manutenção removida!"}, 200


def _buscar_manutencao(manutencao_id, usuario_id):
    return db.session.execute(
        select(Manutencao).join(Veiculo).where(Manutencao.id == manutencao_id, Veiculo.usuario_id == usuario_id)
    ).scalar_one_or_none()


def _parse_data(data_str):
    if not data_str:
        return datetime.utcnow().date()
    return datetime.strptime(data_str, "%Y-%m-%d").date()


def _manutencao_para_json(m):
    return {
        "id": m.id,
        "veiculo_id": m.veiculo_id,
        "tipo_manutencao": m.tipo_manutencao,
        "oficina": m.oficina,
        "valor": float(m.valor) if m.valor is not None else 0,
        "km_manutencao": m.km_manutencao,
        "garantia_dias": m.garantia_dias,
        "data_manutencao": m.data_manutencao.isoformat() if m.data_manutencao else None,
    }
