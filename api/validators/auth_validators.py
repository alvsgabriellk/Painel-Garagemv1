from .common_validators import (
    validar_campos_obrigatorios,
    validar_string,
    validar_email
)

def validar_dados_cadastro(dados):
    validar_campos_obrigatorios(dados, ["nome", "email", "senha"])
    validar_string(dados["nome"], "nome", min_len=2, max_len=35)
    validar_email(dados["email"])
    validar_string(dados["senha"], "senha", min_len=6, max_len=20)

def validar_dados_login(dados):
    validar_campos_obrigatorios(dados, ["email", "senha"])
    validar_email(dados["email"])

def validar_nova_senha(dados):
    validar_campos_obrigatorios(dados, ["nova_senha"])
    validar_string(dados["nova_senha"], "nova_senha", min_len=6, max_len=20)