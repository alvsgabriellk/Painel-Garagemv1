from services import (
    veiculo_criar,
    veiculos_listar,
    veiculo_encontrar,
    veiculo_atualizar_dados,
    veiculo_atualizar_impostos,
    veiculo_deletar,
    veiculo_upload_comprovante,
    veiculo_comprovante_caminho,
)
from validators import validar_dados_veiculo, validar_dados_impostos
from validators.exceptions import ValidationError


def veiculo_dados(dados):
    try:
        validar_dados_veiculo(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return veiculo_criar(dados)


def veiculos_lista():
    return veiculos_listar()


def veiculo_buscar(veiculo_id):
    return veiculo_encontrar(veiculo_id)


def veiculo_atualizar(veiculo_id, dados):
    try:
        validar_dados_veiculo(dados, parcial=True)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return veiculo_atualizar_dados(veiculo_id, dados)


def veiculo_remover(veiculo_id):
    return veiculo_deletar(veiculo_id)


def veiculo_atualizar_impostos_dados(veiculo_id, dados):
    try:
        validar_dados_impostos(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return veiculo_atualizar_impostos(veiculo_id, dados)


def veiculo_enviar_comprovante(veiculo_id, tipo_imposto, arquivo):
    if not arquivo:
        return {"error": "Nenhum arquivo enviado"}, 400
    return veiculo_upload_comprovante(veiculo_id, tipo_imposto, arquivo)


def veiculo_buscar_comprovante_caminho(veiculo_id, tipo_imposto):
    return veiculo_comprovante_caminho(veiculo_id, tipo_imposto)
