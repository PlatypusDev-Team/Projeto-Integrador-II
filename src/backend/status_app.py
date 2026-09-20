from flask import Flask, jsonify
from flask_cors import CORS

from services.solicitacoes_service import Error as DatabaseError
from services.solicitacoes_service import buscar_solicitacao


app = Flask(__name__)
CORS(app)


@app.route("/api/solicitacoes/<int:id_solicitacao>", methods=["GET"])
def consultar_solicitacao(id_solicitacao):
    try:
        solicitacao = buscar_solicitacao(id_solicitacao)
    except DatabaseError:
        app.logger.exception("Falha ao consultar solicitacao no banco")
        return jsonify({"erro": "Nao foi possivel consultar a solicitacao."}), 503

    if solicitacao is None:
        return jsonify({"erro": "Solicitacao nao encontrada."}), 404

    return jsonify(solicitacao)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
