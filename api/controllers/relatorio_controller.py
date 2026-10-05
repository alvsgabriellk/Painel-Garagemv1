from services import relatorio_gerar


def relatorio_dados(veiculo_id, data_de, data_ate):
    return relatorio_gerar(veiculo_id, data_de, data_ate)
