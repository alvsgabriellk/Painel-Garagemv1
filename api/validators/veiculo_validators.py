import re
from datetime import datetime
from .common_validators import validar_campos_obrigatorios, validar_string, validar_numero
from .exceptions import ValidationError


def validar_dados_veiculo(dados, parcial=False):
    campos_obrigatorios = ["placa", "renavam", "marca", "modelo", "ano_modelo", "cor"]

    if not parcial:
        validar_campos_obrigatorios(dados, campos_obrigatorios)

    if "placa" in dados:
        placa = str(dados["placa"]).upper().replace("-", "").strip()
        if not re.match(r"^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$", placa):
            raise ValidationError("Placa inválida. Use o formato ABC1234 ou ABC1D23")

    if "renavam" in dados:
        renavam = str(dados["renavam"])
        if not renavam.isdigit() or len(renavam) != 11:
            raise ValidationError("RENAVAM inválido")

    if "marca" in dados:
        validar_string(dados["marca"], "marca", min_len=2, max_len=50)

    if "modelo" in dados:
        validar_string(dados["modelo"], "modelo", min_len=1, max_len=50)

    if "ano_modelo" in dados:
        ano = validar_numero(dados["ano_modelo"], "ano_modelo", tipo=int, minimo=1950)
        if ano > datetime.utcnow().year + 1:
            raise ValidationError("O campo 'ano_modelo' está fora de um intervalo válido")

    if "cor" in dados:
        validar_string(dados["cor"], "cor", min_len=2, max_len=30)

    if "km_atual" in dados:
        validar_numero(dados["km_atual"], "km_atual", tipo=float, minimo=0)

    if "km_compra" in dados:
        validar_numero(dados["km_compra"], "km_compra", tipo=float, minimo=0)

    if "oleo_intervalo" in dados:
        validar_numero(dados["oleo_intervalo"], "oleo_intervalo", tipo=float, minimo=1)

    if "correia_intervalo" in dados:
        validar_numero(dados["correia_intervalo"], "correia_intervalo", tipo=float, minimo=1)


def validar_dados_impostos(dados):
    if "ipva_status" in dados:
        validar_string(dados["ipva_status"], "ipva_status", min_len=2, max_len=30)

    if "ipva_valor" in dados and dados["ipva_valor"] is not None:
        validar_numero(dados["ipva_valor"], "ipva_valor", tipo=float, minimo=0)

    if "licenciamento_status" in dados:
        validar_string(dados["licenciamento_status"], "licenciamento_status", min_len=2, max_len=30)

    if "licenciamento_valor" in dados and dados["licenciamento_valor"] is not None:
        validar_numero(dados["licenciamento_valor"], "licenciamento_valor", tipo=float, minimo=0)
