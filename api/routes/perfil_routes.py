from flask import request, jsonify
from flask_jwt_extended import jwt_required
from routes import perfil_bp
from controllers import perfil_dados, perfil_atualizar_dados


@perfil_bp.route("", methods=["GET"])
@jwt_required()
def buscar_perfil():
    resposta, status = perfil_dados()
    return jsonify(resposta), status


@perfil_bp.route("", methods=["PUT"])
@jwt_required()
def atualizar_perfil():
    dados = request.get_json(silent=True) or {}
    resposta, status = perfil_atualizar_dados(dados)
    return jsonify(resposta), status
