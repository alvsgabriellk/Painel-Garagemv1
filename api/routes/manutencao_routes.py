from flask import request, jsonify
from flask_jwt_extended import jwt_required
from routes import manutencao_bp
from controllers import (
    manutencao_dados,
    manutencoes_lista,
    manutencao_buscar,
    manutencao_atualizar,
    manutencao_remover,
)


@manutencao_bp.route("/create-manutencao", methods=["POST"])
@jwt_required()
def cadastrar_manutencao():
    dados = request.get_json(silent=True) or {}
    resposta, status = manutencao_dados(dados)
    return jsonify(resposta), status


@manutencao_bp.route("", methods=["GET"])
@jwt_required()
def listar_manutencoes():
    veiculo_id = request.args.get("veiculo_id", type=int)
    resposta, status = manutencoes_lista(veiculo_id)
    return jsonify(resposta), status


@manutencao_bp.route("/<int:manutencao_id>", methods=["GET"])
@jwt_required()
def buscar_manutencao(manutencao_id):
    resposta, status = manutencao_buscar(manutencao_id)
    return jsonify(resposta), status


@manutencao_bp.route("/<int:manutencao_id>", methods=["PUT"])
@jwt_required()
def atualizar_manutencao(manutencao_id):
    dados = request.get_json(silent=True) or {}
    resposta, status = manutencao_atualizar(manutencao_id, dados)
    return jsonify(resposta), status


@manutencao_bp.route("/<int:manutencao_id>", methods=["DELETE"])
@jwt_required()
def remover_manutencao(manutencao_id):
    resposta, status = manutencao_remover(manutencao_id)
    return jsonify(resposta), status
