class ValidationError(Exception):
    """
    Exceção lançada pelos validators quando um dado está incorreto.
    O controller captura essa exceção e transforma em resposta HTTP (dict, status_code).
    """

    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
