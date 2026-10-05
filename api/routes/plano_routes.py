from flask import request, jsonify
from flask_jwt_extended import jwt_required
from routes import plano_bp
from controllers import planos_lista, plano_status, plano_atualizar


@plano_bp.route("", methods=["GET"])
def listar_planos():
    resposta, status = planos_lista()
    return jsonify(resposta), status


@plano_bp.route("/status", methods=["GET"])
@jwt_required()
def status():
    resposta, status_code = plano_status()
    return jsonify(resposta), status_code


@plano_bp.route("/upgrade", methods=["POST"])
@jwt_required()
def upgrade_plano():
    dados = request.get_json(silent=True) or {}
    resposta, status = plano_atualizar(dados)
    return jsonify(resposta), status
