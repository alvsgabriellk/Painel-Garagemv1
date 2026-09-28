from services import (
    cadastrar_usuario,
    autenticar_usuario,
    confirmar_email_usuario,
    solicitar_recuperacao_senha,
    redefinir_senha
)

from validators import (
    validar_dados_cadastro,
    validar_dados_login,
    validar_nova_senha
)

from validators.exceptions import ValidationError

def cadastro_dados(dados):
    try:
        validar_dados_cadastro(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return cadastrar_usuario(dados["nome"], dados["email"], dados["senha"])


def login_dados(dados):
    try:
        validar_dados_login(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return autenticar_usuario(dados["email"], dados["senha"])

def confirmar_email_dados(token):

    return confirmar_email_usuario(token)


def esqueci_senha_dados(dados):

    if not dados.get("email"):
        return {"error": "Informe o e-mail"}, 400

    return solicitar_recuperacao_senha(dados["email"])


def resetar_senha_dados(token, dados):

    try:
        validar_nova_senha(dados)
    except ValidationError as e:
        return {"error": e.message}, e.status_code

    return redefinir_senha(token, dados["nova_senha"])