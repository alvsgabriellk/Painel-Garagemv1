from .common_validators import validar_string


def validar_dados_perfil(dados):
    if "nome" in dados:
        validar_string(dados["nome"], "nome", min_len=2, max_len=35)

    if "cpf" in dados and dados["cpf"]:
        validar_string(dados["cpf"], "cpf", min_len=11, max_len=14)

    if "cnh" in dados and dados["cnh"]:
        validar_string(dados["cnh"], "cnh", min_len=5, max_len=20)

    if "telefone" in dados and dados["telefone"]:
        validar_string(dados["telefone"], "telefone", min_len=8, max_len=20)

    if "endereco" in dados and dados["endereco"]:
        validar_string(dados["endereco"], "endereco", min_len=5, max_len=200)
