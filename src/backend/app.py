from flask import Flask, jsonify

from cep import buscar_uf_por_cep
from db import buscar_lojas_por_uf


app = Flask(__name__)

app.json.sort_keys = False
app.json.ensure_ascii = False


@app.get("/api/lojas/<cep>")
def consultar_lojas(cep):

    try:
        uf = buscar_uf_por_cep(cep)

        lojas = buscar_lojas_por_uf(uf)

        if not lojas:
            return jsonify({
                "cep": cep,
                "uf": uf,
                "lojas": [],
                "mensagem": "Nenhuma loja disponível para este CEP."
            }), 200

        return jsonify({
            "cep": cep,
            "uf": uf,
            "lojas": lojas
        }), 200

    except ValueError as erro:
        return jsonify({
            "erro": str(erro)
        }), 400


if __name__ == "__main__":
    app.run(debug=True)