import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from database import db
from config import DesenvolvimentoConfig, ProducaoConfig

def criando_app():
    app = Flask(__name__)

    ambiente = os.getenv("ENV", "local")
    app.config.from_object(ProducaoConfig if ambiente == "production" else DesenvolvimentoConfig)

    JWTManager(app)
    CORS(app, origins=app.config["CORS_ORIGINS"])

    os.makedirs(app.config["UPLOAD_FOLDER"],
                exist_ok=True)

    with app.app_context():
        db.create_all()

    return app

app = criando_app()

if __name__ == "__main__":
    app.run(debug=app.config.get("DEBUG", False))