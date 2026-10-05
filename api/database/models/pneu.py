from database.db import db

POSICOES_VALIDAS = [
    "Dianteiro esquerdo",
    "Dianteiro direito",
    "Traseiro esquerdo",
    "Traseiro direito",
    "Estepe",
]


class Pneu(db.Model):
    __tablename__ = "pneus"

    id = db.Column(db.Integer, primary_key=True)
    veiculo_id = db.Column(db.Integer, db.ForeignKey("veiculos.id"), nullable=False)
    posicao = db.Column(db.String(30), nullable=False)  # uma das POSICOES_VALIDAS
    marca = db.Column(db.String(50))
    data_troca = db.Column(db.Date, nullable=True)
