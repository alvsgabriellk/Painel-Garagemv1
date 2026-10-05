from database.db import db
from datetime import datetime

TIPOS_VALIDOS = ["Colisão", "Furto/roubo", "Incêndio", "Alagamento", "Outro"]


class Sinistro(db.Model):
    __tablename__ = "sinistros"

    id = db.Column(db.Integer, primary_key=True)
    veiculo_id = db.Column(db.Integer, db.ForeignKey("veiculos.id"), nullable=False)

    tipo = db.Column(db.String(30), nullable=False)
    data_ocorrido = db.Column(db.Date, nullable=False)
    local = db.Column(db.String(200))
    descricao = db.Column(db.Text)
    seguro_acionado = db.Column(db.Boolean, default=False)
    bo_arquivo_path = db.Column(db.String(255), nullable=True)  # arquivo real do B.O

    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)

    fotos = db.relationship("SinistroFoto", backref="sinistro", lazy=True, cascade="all, delete-orphan")
