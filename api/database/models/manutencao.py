from database.db import db
from datetime import datetime


class Manutencao(db.Model):
    __tablename__ = "manutencoes"

    id = db.Column(db.Integer, primary_key=True)
    veiculo_id = db.Column(db.Integer, db.ForeignKey("veiculos.id"), nullable=False)

    tipo_manutencao = db.Column(db.String(100), nullable=False)
    oficina = db.Column(db.String(100))  # texto livre, digitado na hora
    valor = db.Column(db.Numeric(10, 2), default=0)
    km_manutencao = db.Column(db.Float, nullable=False)
    garantia_dias = db.Column(db.Integer, nullable=True)  # None/0 = sem garantia

    data_manutencao = db.Column(db.Date, default=datetime.utcnow)
    data_criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    data_ultima_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
