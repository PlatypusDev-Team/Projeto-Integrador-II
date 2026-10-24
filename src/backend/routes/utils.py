from flask import request


def ler_dados_requisicao():
    if request.is_json:
        dados = request.get_json(silent=True)

        return dados if isinstance(dados, dict) else {}

    return request.form