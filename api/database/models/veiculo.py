from database.db import db
from datetime import datetime


class Veiculo(db.Model):
    __tablename__ = "veiculos"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    placa = db.Column(db.String(10), unique=True, nullable=False)
    renavam = db.Column(db.String(20), unique=True, nullable=False)
    marca = db.Column(db.String(50), nullable=False)
    modelo = db.Column(db.String(50), nullable=False)
    marca_modelo = db.Column(db.String(100), nullable=False)
    ano_modelo = db.Column(db.Integer, nullable=False)
    cor = db.Column(db.String(30), nullable=False)

    km_compra = db.Column(db.Float)
    km_atual = db.Column(db.Float, default=0)
    km_ha_6_meses = db.Column(db.Float, default=0)  # snapshot usado no cálculo de custo/km

    # Óleo
    oleo_km_ultima_troca = db.Column(db.Float, default=0)
    oleo_intervalo = db.Column(db.Float, default=4000)
    oleo_tipo = db.Column(db.String(50))

    # Correia dentada
    correia_km_ultima_troca = db.Column(db.Float, default=0)
    correia_intervalo = db.Column(db.Float, default=40000)

    # Alinhamento é do carro inteiro, não por pneu
    alinhamento_geral = db.Column(db.String(20), default="Não alinhado")
    alinhamento_data = db.Column(db.Date, nullable=True)

    # Impostos
    ipva_status = db.Column(db.String(30), default="Pendente")
    ipva_valor = db.Column(db.Numeric(10, 2), nullable=True)
    ipva_comprovante_path = db.Column(db.String(255), nullable=True)

    licenciamento_status = db.Column(db.String(30), default="Pendente")
    licenciamento_valor = db.Column(db.Numeric(10, 2), nullable=True)
    licenciamento_comprovante_path = db.Column(db.String(255), nullable=True)

    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)
    data_ultima_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    """
    manutencoes = db.relationship("Manutencao", backref="veiculo", lazy=True, cascade="all, delete-orphan")
    pneus = db.relationship("Pneu", backref="veiculo", lazy=True, cascade="all, delete-orphan")
    sinistros = db.relationship("Sinistro", backref="veiculo", lazy=True, cascade="all, delete-orphan")
    """
