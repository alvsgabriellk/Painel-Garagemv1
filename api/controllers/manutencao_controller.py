from services import (
    manutencao_criar,
    manutencoes_listar,
    manutencao_encontrar,
    manutencao_atualizar_dados,
    manutencao_deletar,
)
from validators import validar_dados_manutencao
from validators.exceptions import ValidationError


def manutencao_dados(dados):
    try:
        validar_dados_manutencao(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return manutencao_criar(dados)


def manutencoes_lista(veiculo_id=None):
    return manutencoes_listar(veiculo_id)


def manutencao_buscar(manutencao_id):
    return manutencao_encontrar(manutencao_id)


def manutencao_atualizar(manutencao_id, dados):
    try:
        validar_dados_manutencao(dados, parcial=True)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return manutencao_atualizar_dados(manutencao_id, dados)


def manutencao_remover(manutencao_id):
    return manutencao_deletar(manutencao_id)
