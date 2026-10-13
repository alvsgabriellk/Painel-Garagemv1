from .common_validators import validar_campos_obrigatorios, validar_string
from .exceptions import ValidationError
from database import TIPOS_SINISTRO_VALIDOS


def validar_dados_sinistro(dados, parcial=False):
    if not parcial:
        validar_campos_obrigatorios(dados, ["tipo", "data_ocorrido"])

    if "tipo" in dados and dados["tipo"] not in TIPOS_SINISTRO_VALIDOS:
        raise ValidationError(f"Tipo de sinistro inválido. Use um de: {', '.join(TIPOS_SINISTRO_VALIDOS)}")

    if "local" in dados and dados["local"]:
        validar_string(dados["local"], "local", min_len=2, max_len=200)

    if "descricao" in dados and dados["descricao"]:
        validar_string(dados["descricao"], "descricao", min_len=1, max_len=2000)

    if "seguro_acionado" in dados and not isinstance(dados["seguro_acionado"], bool):
        raise ValidationError("O campo 'seguro_acionado' deve ser verdadeiro ou falso")
