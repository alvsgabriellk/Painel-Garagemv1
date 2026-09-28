from database.db import db
from datetime import datetime


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(35), nullable=False)
    email = db.Column(db.String(50), unique=True, nullable=False)
    senha = db.Column(db.String(256), nullable=False)

    cpf = db.Column(db.String(14))
    cnh = db.Column(db.String(20), nullable=True)
    telefone = db.Column(db.String(20))
    endereco = db.Column(db.String(200))
    lgpd_aceite_em = db.Column(db.DateTime, nullable=True)

    plano = db.Column(db.String(20), default="free", nullable=False)

    data_criado = db.Column(db.DateTime, default=datetime.utcnow)
    data_ultima_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ativo = db.Column(db.Boolean, default=True)
    verificado = db.Column(db.Boolean, default=False)

    #veiculos = db.relationship("Veiculo", backref="usuario", lazy=True, cascade="all, delete-orphan")
