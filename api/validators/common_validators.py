import re
from datetime import datetime
from .exceptions import ValidationError

def validar_campos_obrigatorios(dados, campos):
    faltando = [c for c in campos if c not in dados or dados[c] in (None, "")]
    if faltando:
        raise ValidationError(f"Campo(s) obrigatório(s) faltando: {', '.join(faltando)}")

def validar_string(valor, campo, min_len=1, max_len=None):
    if not isinstance(valor, str):
        raise ValidationError(f"O campo '{campo}' deve ser um texto")

    if len(valor.strip()) < min_len:
        raise ValidationError(f"O campo '{campo}' deve ter no mínimo {min_len} caractere(s)")

    if max_len and len(valor) > max_len:
        raise ValidationError(f"O campo '{campo}' deve ter no máximo {max_len} caractere(s)")


def validar_numero(valor, campo, tipo=float, minimo=None, maximo=None):
    try:
        valor_convertido = tipo(valor)
    except (TypeError, ValueError):
        raise ValidationError(f"O campo '{campo}' deve ser numérico")

    if minimo is not None and valor_convertido < minimo:
        raise ValidationError(f"O campo '{campo}' deve ser maior ou igual a {minimo}")

    if maximo is not None and valor_convertido > maximo:
        raise ValidationError(f"O campo '{campo}' deve ser menor ou igual a {maximo}")

    return valor_convertido


def validar_email(email):
    padrao = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not isinstance(email, str) or not re.match(padrao, email):
        raise ValidationError("E-mail inválido")


def validar_ano(ano, campo="ano"):
    ano_atual = datetime.utcnow().year
    if not isinstance(ano, int) or ano < 1950 or ano > ano_atual + 1:
        raise ValidationError(f"O campo '{campo}' está fora de um intervalo válido")
