from flask import request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required
from ocr import extrair_dados_crlv
from routes import veiculo_bp
from ocr.crlv_stub import OCRIndisponivelError
from controllers import (
    veiculo_dados,
    veiculos_lista,
    veiculo_buscar,
    veiculo_atualizar,
    veiculo_atualizar_impostos_dados,
    veiculo_remover,
    veiculo_enviar_comprovante,
    veiculo_buscar_comprovante_caminho,
    pneus_lista,
    pneu_atualizar_dados,
    sinistro_dados,
    sinistros_lista,
    sinistro_remover,
    sinistro_enviar_foto,
    sinistro_enviar_bo,
    sinistro_buscar_arquivo_caminho,
    relatorio_dados
)


@veiculo_bp.route("", methods=["POST"])
@jwt_required()
def cadastrar_veiculo():
    dados = request.get_json(silent=True) or {}
    resposta, status = veiculo_dados(dados)
    return jsonify(resposta), status

@veiculo_bp.route("/ocr-crlv", methods=["POST"])
@jwt_required()
def ocr_crlv():
    arquivo = request.files.get("arquivo")
    if not arquivo:
        return jsonify({"error": "Nenhum arquivo enviado"}), 400

    try:
        dados_extraidos = extrair_dados_crlv(arquivo)
        return jsonify({"dados": dados_extraidos}), 200
    except OCRIndisponivelError as e:
        # 501 = "Not Implemented". O front vai tratar esse status caindo
        # de volta pro preenchimento manual do formulário, sem travar o usuário.
        return jsonify({"error": str(e)}), 501


@veiculo_bp.route("", methods=["GET"])
@jwt_required()
def listar_veiculos():
    resposta, status = veiculos_lista()
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>", methods=["GET"])
@jwt_required()
def buscar_veiculo(veiculo_id):
    resposta, status = veiculo_buscar(veiculo_id)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>", methods=["PUT"])
@jwt_required()
def atualizar_veiculo(veiculo_id):
    dados = request.get_json(silent=True) or {}
    resposta, status = veiculo_atualizar(veiculo_id, dados)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>", methods=["DELETE"])
@jwt_required()
def remover_veiculo(veiculo_id):
    resposta, status = veiculo_remover(veiculo_id)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>/impostos", methods=["PUT"])
@jwt_required()
def atualizar_impostos(veiculo_id):
    dados = request.get_json(silent=True) or {}
    resposta, status = veiculo_atualizar_impostos_dados(veiculo_id, dados)
    return jsonify(resposta), status

@veiculo_bp.route("/<int:veiculo_id>/pneus", methods=["GET"])
@jwt_required()
def listar_pneus(veiculo_id):
    resposta, status = pneus_lista(veiculo_id)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>/pneus/<int:pneu_id>", methods=["PUT"])
@jwt_required()
def atualizar_pneu(veiculo_id, pneu_id):
    dados = request.get_json(silent=True) or {}
    resposta, status = pneu_atualizar_dados(veiculo_id, pneu_id, dados)
    return jsonify(resposta), status

@veiculo_bp.route("/<int:veiculo_id>/sinistros", methods=["POST"])
@jwt_required()
def cadastrar_sinistro(veiculo_id):
    dados = request.get_json(silent=True) or {}
    resposta, status = sinistro_dados(veiculo_id, dados)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>/sinistros", methods=["GET"])
@jwt_required()
def listar_sinistros(veiculo_id):
    resposta, status = sinistros_lista(veiculo_id)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>/sinistros/<int:sinistro_id>", methods=["DELETE"])
@jwt_required()
def remover_sinistro(veiculo_id, sinistro_id):
    resposta, status = sinistro_remover(veiculo_id, sinistro_id)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>/relatorio", methods=["GET"])
@jwt_required()
def relatorio(veiculo_id):
    data_de = request.args.get("de")
    data_ate = request.args.get("ate")
    resposta, status = relatorio_dados(veiculo_id, data_de, data_ate)
    return jsonify(resposta), status

@veiculo_bp.route("/<int:veiculo_id>/impostos/<string:tipo_imposto>/comprovante", methods=["POST"])
@jwt_required()
def enviar_comprovante(veiculo_id, tipo_imposto):
    if tipo_imposto not in ("ipva", "licenciamento"):
        return jsonify({"error": "tipo_imposto deve ser 'ipva' ou 'licenciamento'"}), 400

    arquivo = request.files.get("arquivo")
    resposta, status = veiculo_enviar_comprovante(veiculo_id, tipo_imposto, arquivo)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>/impostos/<string:tipo_imposto>/comprovante", methods=["GET"])
@jwt_required()
def baixar_comprovante(veiculo_id, tipo_imposto):
    if tipo_imposto not in ("ipva", "licenciamento"):
        return jsonify({"error": "tipo_imposto deve ser 'ipva' ou 'licenciamento'"}), 400

    caminho = veiculo_buscar_comprovante_caminho(veiculo_id, tipo_imposto)
    if not caminho:
        return jsonify({"error": "Comprovante não encontrado"}), 404

    return send_from_directory(current_app.config["UPLOAD_FOLDER"], caminho)


@veiculo_bp.route("/<int:veiculo_id>/sinistros/<int:sinistro_id>/fotos", methods=["POST"])
@jwt_required()
def enviar_foto_sinistro(veiculo_id, sinistro_id):
    arquivo = request.files.get("arquivo")
    resposta, status = sinistro_enviar_foto(veiculo_id, sinistro_id, arquivo)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>/sinistros/<int:sinistro_id>/fotos/<int:foto_id>", methods=["GET"])
@jwt_required()
def baixar_foto_sinistro(veiculo_id, sinistro_id, foto_id):
    caminho = sinistro_buscar_arquivo_caminho(veiculo_id, sinistro_id, "foto", foto_id)
    if not caminho:
        return jsonify({"error": "Foto não encontrada"}), 404

    return send_from_directory(current_app.config["UPLOAD_FOLDER"], caminho)


@veiculo_bp.route("/<int:veiculo_id>/sinistros/<int:sinistro_id>/bo", methods=["POST"])
@jwt_required()
def enviar_bo_sinistro(veiculo_id, sinistro_id):
    arquivo = request.files.get("arquivo")
    resposta, status = sinistro_enviar_bo(veiculo_id, sinistro_id, arquivo)
    return jsonify(resposta), status


@veiculo_bp.route("/<int:veiculo_id>/sinistros/<int:sinistro_id>/bo", methods=["GET"])
@jwt_required()
def baixar_bo_sinistro(veiculo_id, sinistro_id):
    caminho = sinistro_buscar_arquivo_caminho(veiculo_id, sinistro_id, "bo")
    if not caminho:
        return jsonify({"error": "Boletim de ocorrência não encontrado"}), 404

    return send_from_directory(current_app.config["UPLOAD_FOLDER"], caminho)
