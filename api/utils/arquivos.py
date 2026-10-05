import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

EXTENSOES_PERMITIDAS = {"pdf", "jpg", "jpeg", "png"}


def extensao_permitida(nome_arquivo):
    return "." in nome_arquivo and nome_arquivo.rsplit(".", 1)[1].lower() in EXTENSOES_PERMITIDAS


def salvar_arquivo(file_storage, subpasta):
    """
    Salva um arquivo enviado (request.files['campo']) dentro de
    UPLOAD_FOLDER/<subpasta>/, com um nome único, e devolve o caminho
    relativo (o que fica salvo no banco).

    Levanta ValueError se o arquivo não tiver uma extensão permitida.
    """
    if not file_storage or not file_storage.filename:
        raise ValueError("Nenhum arquivo enviado")

    if not extensao_permitida(file_storage.filename):
        raise ValueError(f"Extensão não permitida. Use: {', '.join(EXTENSOES_PERMITIDAS)}")

    nome_seguro = secure_filename(file_storage.filename)
    nome_unico = f"{uuid.uuid4().hex}_{nome_seguro}"

    pasta_destino = os.path.join(current_app.config["UPLOAD_FOLDER"], subpasta)
    os.makedirs(pasta_destino, exist_ok=True)

    caminho_absoluto = os.path.join(pasta_destino, nome_unico)
    file_storage.save(caminho_absoluto)

    return os.path.join(subpasta, nome_unico)  # caminho relativo, salvo no banco
