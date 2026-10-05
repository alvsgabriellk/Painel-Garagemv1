from database.db import db
from datetime import datetime


class SinistroFoto(db.Model):
    __tablename__ = "sinistro_fotos"

    id = db.Column(db.Integer, primary_key=True)
    sinistro_id = db.Column(db.Integer, db.ForeignKey("sinistros.id"), nullable=False)
    caminho_arquivo = db.Column(db.String(255), nullable=False)
    data_upload = db.Column(db.DateTime, default=datetime.utcnow)
