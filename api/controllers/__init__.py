from .auth_controller import (
    cadastro_dados,
    login_dados,
    confirmar_email_dados,
    esqueci_senha_dados,
    resetar_senha_dados
)

from .veiculo_controller import (
    veiculo_dados,
    veiculos_lista,
    veiculo_buscar,
    veiculo_atualizar,
    veiculo_atualizar_impostos_dados,
    veiculo_remover,
    veiculo_enviar_comprovante,
    veiculo_buscar_comprovante_caminho
)

from .manutencao_controller import (
    manutencao_dados,
    manutencoes_lista,
    manutencao_buscar,
    manutencao_atualizar,
    manutencao_remover,
)

from .pneu_controller import pneus_lista, pneu_atualizar_dados
from .sinistro_controller import (
    sinistro_dados,
    sinistros_lista,
    sinistro_remover,
    sinistro_enviar_foto,
    sinistro_enviar_bo,
    sinistro_buscar_arquivo_caminho
)

from .relatorio_controller import relatorio_dados
from .plano_controller import planos_lista, plano_status, plano_atualizar