from database import db, Veiculo, Usuario, Pneu
from database.models.pneu import POSICOES_VALIDAS
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import get_jwt_identity
from services.plano_service import limite_de_veiculos
from services.acesso_service import bloquear_se_trial_expirado
from utils import salvar_arquivo



def veiculo_criar(dados):
    usuario_id = int(get_jwt_identity())

    usuario = db.session.get(Usuario, usuario_id)

    bloqueio = bloquear_se_trial_expirado(usuario)
    if bloqueio:
        return bloqueio

    limite = limite_de_veiculos(usuario.plano)

    if limite is not None:
        total_atual = db.session.execute(
            select(Veiculo).where(Veiculo.usuario_id == usuario_id)
        ).scalars().all()

        if len(total_atual) >= limite:
            return {
                "error": f"Limite de veículos do plano '{usuario.plano}' atingido ({limite}). Faça upgrade de plano para adicionar mais."
            }, 403

    km_inicial = float(dados.get("km_atual", dados.get("km_compra", 0)) or 0)

    veiculo = Veiculo(
        usuario_id=usuario_id,
        placa=str(dados["placa"]).upper().replace("-", "").strip(),
        renavam=str(dados["renavam"]),
        marca=dados["marca"],
        modelo=dados["modelo"],
        marca_modelo=f"{dados['marca']} {dados['modelo']}",
        ano_modelo=int(dados["ano_modelo"]),
        cor=dados["cor"],
        km_compra=float(dados.get("km_compra", 0) or 0),
        km_atual=km_inicial,
        km_ha_6_meses=km_inicial,
        oleo_km_ultima_troca=km_inicial,
        correia_km_ultima_troca=km_inicial,
    )

    try:
        db.session.add(veiculo)
        db.session.flush()  # já gera o veiculo.id sem precisar commitar ainda

        # todo veículo novo já nasce com os 5 registros de pneu (vazios)
        for posicao in POSICOES_VALIDAS:
            db.session.add(Pneu(veiculo_id=veiculo.id, posicao=posicao))

        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"error": "Já existe um veículo cadastrado com essa placa ou RENAVAM"}, 409

    return {"msg": "Veículo cadastrado!", "veiculo": _veiculo_para_json(veiculo)}, 201


def veiculos_listar():
    usuario_id = int(get_jwt_identity())

    veiculos = db.session.execute(select(Veiculo).where(Veiculo.usuario_id == usuario_id)).scalars().all()

    return {"veiculos": [_veiculo_para_json(v) for v in veiculos]}, 200


def veiculo_encontrar(veiculo_id):
    usuario_id = int(get_jwt_identity())

    veiculo = _buscar_veiculo(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    return {"veiculo": _veiculo_para_json(veiculo)}, 200


def veiculo_atualizar_dados(veiculo_id, dados):
    usuario_id = int(get_jwt_identity())

    veiculo = _buscar_veiculo(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    campos_permitidos = [
        "placa", "marca", "modelo", "ano_modelo", "cor", "km_atual",
        "oleo_tipo", "oleo_intervalo", "correia_intervalo",
    ]

    if "km_atual" in dados:
        if dados["km_atual"] <= veiculo.km_atual:
            return {"error": "km atual não pode ser menor que a anterior"}, 400
    
    for campo in campos_permitidos:
        if campo in dados:

            setattr(veiculo, campo, dados[campo])

    if "marca" in dados or "modelo" in dados:
        veiculo.marca_modelo = f"{veiculo.marca} {veiculo.modelo}"

    db.session.commit()

    return {"msg": "Veículo atualizado!", "veiculo": _veiculo_para_json(veiculo)}, 200


def veiculo_atualizar_impostos(veiculo_id, dados):
    usuario_id = int(get_jwt_identity())

    veiculo = _buscar_veiculo(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    campos_permitidos = ["ipva_status", "ipva_valor", "licenciamento_status", "licenciamento_valor"]
    for campo in campos_permitidos:
        if campo in dados:
            setattr(veiculo, campo, dados[campo])

    db.session.commit()

    return {"msg": "Impostos atualizados!", "veiculo": _veiculo_para_json(veiculo)}, 200


def veiculo_deletar(veiculo_id):
    usuario_id = int(get_jwt_identity())

    veiculo = _buscar_veiculo(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    db.session.delete(veiculo)
    db.session.commit()

    return {"msg": "Veículo removido!"}, 200


def _buscar_veiculo(veiculo_id, usuario_id):
    return db.session.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.usuario_id == usuario_id)
    ).scalar_one_or_none()


def _oleo_info(veiculo):
    proxima = veiculo.oleo_km_ultima_troca + veiculo.oleo_intervalo
    faltam = proxima - veiculo.km_atual
    pct = 0
    if veiculo.oleo_intervalo:
        pct = max(0, min(100, ((veiculo.km_atual - veiculo.oleo_km_ultima_troca) / veiculo.oleo_intervalo) * 100))
    return {"km_proxima_troca": proxima, "km_faltam": faltam, "percentual": round(pct, 1)}


def _correia_info(veiculo):
    proxima = veiculo.correia_km_ultima_troca + veiculo.correia_intervalo
    faltam = proxima - veiculo.km_atual
    pct = 0
    if veiculo.correia_intervalo:
        pct = max(0, min(100, ((veiculo.km_atual - veiculo.correia_km_ultima_troca) / veiculo.correia_intervalo) * 100))
    return {"km_proxima_troca": proxima, "km_faltam": faltam, "percentual": round(pct, 1)}


def _veiculo_para_json(veiculo):
    return {
        "id": veiculo.id,
        "placa": veiculo.placa,
        "renavam": veiculo.renavam,
        "marca": veiculo.marca,
        "modelo": veiculo.modelo,
        "marca_modelo": veiculo.marca_modelo,
        "ano_modelo": veiculo.ano_modelo,
        "cor": veiculo.cor,
        "km_compra": veiculo.km_compra,
        "km_atual": veiculo.km_atual,
        "oleo": {
            "km_ultima_troca": veiculo.oleo_km_ultima_troca,
            "intervalo": veiculo.oleo_intervalo,
            "tipo": veiculo.oleo_tipo,
            **_oleo_info(veiculo),
        },
        "correia": {
            "km_ultima_troca": veiculo.correia_km_ultima_troca,
            "intervalo": veiculo.correia_intervalo,
            **_correia_info(veiculo),
        },
        "alinhamento": {
            "status": veiculo.alinhamento_geral,
            "data": veiculo.alinhamento_data.isoformat() if veiculo.alinhamento_data else None,
        },
        "ipva": {
            "status": veiculo.ipva_status,
            "valor": float(veiculo.ipva_valor) if veiculo.ipva_valor else None,
            "tem_comprovante": bool(veiculo.ipva_comprovante_path),
        },
        "licenciamento": {
            "status": veiculo.licenciamento_status,
            "valor": float(veiculo.licenciamento_valor) if veiculo.licenciamento_valor else None,
            "tem_comprovante": bool(veiculo.licenciamento_comprovante_path),
        },
        "data_cadastro": veiculo.data_cadastro.isoformat() if veiculo.data_cadastro else None,
    }


def veiculo_upload_comprovante(veiculo_id, tipo_imposto, arquivo):
    """tipo_imposto: 'ipva' ou 'licenciamento'"""
    usuario_id = int(get_jwt_identity())

    veiculo = _buscar_veiculo(veiculo_id, usuario_id)
    if not veiculo:
        return {"error": "Veículo não encontrado"}, 404

    try:
        caminho = salvar_arquivo(arquivo, subpasta=f"comprovantes/{tipo_imposto}")
    except ValueError as e:
        return {"error": str(e)}, 400

    if tipo_imposto == "ipva":
        veiculo.ipva_comprovante_path = caminho
    else:
        veiculo.licenciamento_comprovante_path = caminho

    db.session.commit()

    return {"msg": "Comprovante enviado!", "veiculo": _veiculo_para_json(veiculo)}, 201


def veiculo_comprovante_caminho(veiculo_id, tipo_imposto):
    """Devolve o caminho absoluto do arquivo, já validando que pertence ao usuário logado."""
    usuario_id = int(get_jwt_identity())

    veiculo = _buscar_veiculo(veiculo_id, usuario_id)
    if not veiculo:
        return None

    caminho = veiculo.ipva_comprovante_path if tipo_imposto == "ipva" else veiculo.licenciamento_comprovante_path
    return caminho
