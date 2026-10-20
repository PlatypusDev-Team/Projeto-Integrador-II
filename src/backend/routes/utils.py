from flask import request


def ler_dados_requisicao():
    """
    Lê os dados enviados pelo front-end, seja como JSON
    (Content-Type: application/json) ou como formulário
    (multipart/form-data ou x-www-form-urlencoded).
    """
    if request.is_json:
        dados = request.get_json(silent=True)

        return dados if isinstance(dados, dict) else {}

    return request.form