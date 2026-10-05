from services import pneus_listar, pneu_atualizar
from validators import validar_dados_pneu
from validators.exceptions import ValidationError


def pneus_lista(veiculo_id):
    return pneus_listar(veiculo_id)


def pneu_atualizar_dados(veiculo_id, pneu_id, dados):
    try:
        validar_dados_pneu(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return pneu_atualizar(veiculo_id, pneu_id, dados)
