from flask import Blueprint, jsonify, session

from routes.utils import ler_dados_requisicao
from services.solicitacao_service import (
    processar_solicitacao_cliente,
)

solicitar_cartao_bp = Blueprint(
    "solicitar_cartao",
    __name__,
    url_prefix="/api",
)


@solicitar_cartao_bp.post("/solicitar-cartao")
def solicitar_cartao():
    id_cliente = session.get("id_cliente")

    if not id_cliente:
        return jsonify({
            "codigo": "NAO_AUTENTICADO",
            "mensagem": "Entre na sua conta para solicitar um cartão.",
            "erro": "Entre na sua conta para solicitar um cartão.",
        }), 401

    resultado = processar_solicitacao_cliente(
        id_cliente=id_cliente,
        dados=ler_dados_requisicao(),
    )

    return (
        jsonify(resultado["resposta"]),
        resultado["status_code"],
    )