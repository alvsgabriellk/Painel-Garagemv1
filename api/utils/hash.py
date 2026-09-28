from werkzeug.security import generate_password_hash, check_password_hash

def gerar_senha_hash(senha):
    return generate_password_hash(senha)


def verificar_senha_hash(senha_registrada, senha_digitada):
    return check_password_hash(senha_registrada, senha_digitada)