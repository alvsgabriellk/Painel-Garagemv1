from flask import Blueprint

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

veiculo_bp = Blueprint("veiculo", __name__, url_prefix="/veiculos")

manutencao_bp = Blueprint("manutencoes", __name__, url_prefix="/manutencoes")

plano_bp = Blueprint("plano", __name__, url_prefix="/planos")

from . import auth_routes
from . import veiculo_routes
from . import manutencao_routes
from . import plano_routes