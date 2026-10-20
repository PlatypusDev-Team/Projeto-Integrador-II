from flask import Blueprint, jsonify, session

from routes.utils import ler_dados_requisicao
from services.selecionar_cartao_service import (
    buscar_filial,
    verificar_modalidade,
)
from services.solicitacao_service import (
    processar_solicitacao_cliente,
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
    """
    Mantida por compatibilidade. Agora segue as mesmas regras de
    /api/solicitar-cartao: usa o cliente da sessão (nunca o id enviado
    no corpo da requisição) e aplica todas as regras de negócio.
    """
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