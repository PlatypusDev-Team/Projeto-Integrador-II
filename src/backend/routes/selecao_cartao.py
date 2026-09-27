from flask import Blueprint, jsonify, request

from services.selecionar_cartao_service import (
    buscar_filial,
    verificar_modalidade,
    selecionar_cartao
)


selecao_cartao_bp = Blueprint(
    "selecao_cartao",
    __name__,
    url_prefix="/api"
)


@selecao_cartao_bp.get("/lojas/<int:id_loja>/cartoes")
def consultar_cartoes_loja(id_loja):

    resultado = verificar_modalidade(id_loja)

    return jsonify(resultado), 200


@selecao_cartao_bp.get("/filiais/<int:id_filial>/cartoes")
def consultar_cartoes_filial(id_filial):

    id_loja = buscar_filial(id_filial)

    if id_loja is None:
        return jsonify({
            "erro": "Filial não encontrada."
        }), 404

    resultado = verificar_modalidade(id_loja)

    return jsonify(resultado), 200


@selecao_cartao_bp.post("/solicitacoes")
def criar_solicitacao():

    dados = request.get_json()

    id_cliente = dados["id_cliente"]
    id_cartao = dados["id_cartao"]

    resultado = selecionar_cartao(
        id_cliente,
        id_cartao
    )

    return jsonify(resultado), 201