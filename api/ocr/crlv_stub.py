"""
Stub - Significa extração de dados do CRLV via OCR ainda nao implementada
"""

class OCRIndisponivelError(Exception):
    pass


def extrair_dados_crlv(arquivo):
    # TODO: chamar uma API de OCR de verdade aqui e mapear o retorno pros campos do Veiculo.
    raise OCRIndisponivelError(
        "Extração automática do CRLV ainda não está disponível. Cadastre o veículo preenchendo os campos manualmente."
    )