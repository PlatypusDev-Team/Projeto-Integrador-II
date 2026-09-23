import requests


def buscar_uf_por_cep(cep):
    cep = ''.join(filter(str.isdigit, cep))

    if len(cep) != 8:
        raise ValueError("CEP deve possuir 8 dígitos")

    url = f"https://viacep.com.br/ws/{cep}/json/"

    resposta = requests.get(url, timeout=5)
    resposta.raise_for_status()

    dados = resposta.json()

    if dados.get("erro"):
        raise ValueError("CEP não encontrado")

    return dados["uf"]