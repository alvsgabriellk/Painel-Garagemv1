from flask import request, jsonify
from routes import auth_bp
from controllers import (
    cadastro_dados, 
    login_dados,
    confirmar_email_dados,
    esqueci_senha_dados,
    resetar_senha_dados
)

@auth_bp.route("/cadastro", methods=["POST"])
def cadastro():
    dados = request.get_json(silent=True) or {}
    resposta, status = cadastro_dados(dados)
    return jsonify(resposta), status

@auth_bp.route("/login", methods=["POST"])
def login():
    dados = request.get_json(silent=True) or {}
    resposta, status = login_dados(dados)
    return jsonify(resposta), status

@auth_bp.route("/confirmar-email/<token>", methods=["GET"])
def confirmar_email(token):
    resposta, status = confirmar_email_dados(token)
    return jsonify(resposta), status

@auth_bp.route("/esqueci-senha", methods=["POST"])
def esqueci_senha():
    dados = request.get_json(silent=True) or {}
    resposta, status = esqueci_senha_dados(dados)
    return jsonify(resposta), status

@auth_bp.route("/resetar-senha/<token>", methods=["POST"])
def resetar_senha(token):
    dados = request.get_json(silent=True) or {}
    resposta, status = resetar_senha_dados(token, dados)
    return jsonify(resposta), status