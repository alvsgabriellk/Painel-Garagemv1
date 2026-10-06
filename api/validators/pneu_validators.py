from .common_validators import validar_string
from .exceptions import ValidationError
from database import POSICOES_VALIDAS


def validar_dados_pneu(dados):
    if "marca" in dados and dados["marca"]:
        validar_string(dados["marca"], "marca", min_len=2, max_len=50)

    if "posicao" in dados and dados["posicao"] not in POSICOES_VALIDAS:
        raise ValidationError(f"Posição inválida. Use uma de: {', '.join(POSICOES_VALIDAS)}")
