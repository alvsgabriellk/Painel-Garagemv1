from services import perfil_buscar, perfil_atualizar
from validators import validar_dados_perfil
from validators.exceptions import ValidationError


def perfil_dados():
    return perfil_buscar()


def perfil_atualizar_dados(dados):
    try:
        validar_dados_perfil(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return perfil_atualizar(dados)
