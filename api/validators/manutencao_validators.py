from .common_validators import validar_campos_obrigatorios, validar_string, validar_numero
from .exceptions import ValidationError
from database import POSICOES_VALIDAS


def validar_dados_manutencao(dados, parcial=False):
    campos_obrigatorios = ["veiculo_id", "tipo_manutencao", "km_manutencao"]

    if not parcial:
        validar_campos_obrigatorios(dados, campos_obrigatorios)

    if "veiculo_id" in dados:
        validar_numero(dados["veiculo_id"], "veiculo_id", tipo=int, minimo=1)

    if "tipo_manutencao" in dados:
        validar_string(dados["tipo_manutencao"], "tipo_manutencao", min_len=2, max_len=100)

    if "km_manutencao" in dados:
        validar_numero(dados["km_manutencao"], "km_manutencao", tipo=float, minimo=0)

    if "valor" in dados and dados["valor"] is not None:
        validar_numero(dados["valor"], "valor", tipo=float, minimo=0)

    if "oficina" in dados and dados["oficina"]:
        validar_string(dados["oficina"], "oficina", min_len=2, max_len=100)

    if "garantia_dias" in dados and dados["garantia_dias"] is not None:
        validar_numero(dados["garantia_dias"], "garantia_dias", tipo=int, minimo=0)

    if "pneus" in dados and dados["pneus"]:
        if not isinstance(dados["pneus"], list):
            raise ValidationError("O campo 'pneus' deve ser uma lista de posições")
        for posicao in dados["pneus"]:
            if posicao not in POSICOES_VALIDAS:
                raise ValidationError(f"Posição de pneu inválida: '{posicao}'")
