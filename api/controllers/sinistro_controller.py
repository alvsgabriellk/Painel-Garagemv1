from services import (
    sinistro_criar,
    sinistro_listar,
    sinistro_deletar,
    sinistro_upload_foto,
    sinistro_upload_bo,
    sinistro_arquivo_caminho
)

from validators import validar_dados_sinistro
from validators.exceptions import ValidationError


def sinistro_dados(veiculo_id, dados):
    try:
        validar_dados_sinistro(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return sinistro_criar(veiculo_id, dados)


def sinistros_lista(veiculo_id):
    return sinistros_lista(veiculo_id)


def sinistro_remover(veiculo_id, sinistro_id):
    return sinistro_deletar(veiculo_id, sinistro_id)


def sinistro_enviar_foto(veiculo_id, sinistro_id, arquivo):
    if not arquivo:
        return {"error": "Nenhum arquivo enviado"}, 400
    return sinistro_upload_foto(veiculo_id, sinistro_id, arquivo)


def sinistro_enviar_bo(veiculo_id, sinistro_id, arquivo):
    if not arquivo:
        return {"error": "Nenhum arquivo enviado"}, 400
    return sinistro_upload_bo(veiculo_id, sinistro_id, arquivo)


def sinistro_buscar_arquivo_caminho(veiculo_id, sinistro_id, tipo, foto_id=None):
    return sinistro_arquivo_caminho(veiculo_id, sinistro_id, tipo, foto_id)