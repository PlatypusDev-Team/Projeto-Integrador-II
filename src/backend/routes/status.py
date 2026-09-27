from flask import Blueprint, current_app, jsonify
from pymysql import MySQLError

from services.solicitacoes_service import buscar_solicitacao


solicitacoes_bp = Blueprint(
    "solicitacoes",
    __name__,
    url_prefix="/api/solicitacoes"
)


@solicitacoes_bp.get("/<int:id_solicitacao>")
def consultar_solicitacao(id_solicitacao):
    try:
        solicitacao = buscar_solicitacao(id_solicitacao)

    except MySQLError:
        current_app.logger.exception(
            "Falha ao consultar solicitacao no banco"
        )

        return jsonify({
            "erro": "Nao foi possivel consultar a solicitacao."
        }), 503

    if solicitacao is None:
        return jsonify({
            "erro": "Solicitacao nao encontrada."
        }), 404

    return jsonify(solicitacao)