from flask import Blueprint, jsonify, request, session

from services.mensagem_service import (
    buscar_mensagens,
    enviar_mensagem
)


mensagens_bp = Blueprint(
    "mensagens",
    __name__,
    url_prefix="/api/mensagens"
)


def obter_usuario_sessao():
    """
    Identifica o usuário autenticado pela sessão Flask.

    Retorna:
        (tipo_usuario, id_usuario)
    """

    # Sessão de atendente
    if session.get("tipo_usuario") == "ATENDENTE":

        id_atendente = session.get("id_atendente")

        if id_atendente is not None:
            return "ATENDENTE", id_atendente

    # Sessão de cliente
    id_cliente = session.get("id_cliente")

    if id_cliente is not None:
        return "CLIENTE", id_cliente

    return None, None


@mensagens_bp.route("/<int:id_solicitacao>", methods=["GET"])
def listar_mensagens(id_solicitacao):
    """
    Consulta as mensagens de uma solicitação.
    """

    tipo_usuario, id_usuario = obter_usuario_sessao()

    if tipo_usuario is None:
        return jsonify({
            "mensagem": "Você precisa estar autenticado."
        }), 401

    resultado = buscar_mensagens(
        id_solicitacao=id_solicitacao,
        tipo_usuario=tipo_usuario,
        id_usuario=id_usuario
    )

    return jsonify(resultado["resposta"]), resultado["status_code"]


@mensagens_bp.route("/<int:id_solicitacao>", methods=["POST"])
def criar_mensagem(id_solicitacao):
    """
    Envia uma mensagem vinculada à solicitação.

    O remetente e seu identificador são obtidos
    exclusivamente pela sessão Flask.
    """

    tipo_usuario, id_usuario = obter_usuario_sessao()

    if tipo_usuario is None:
        return jsonify({
            "mensagem": "Você precisa estar autenticado."
        }), 401

    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "mensagem": "Dados da mensagem inválidos."
        }), 400

    conteudo = dados.get("conteudo")

    if not isinstance(conteudo, str):
        return jsonify({
            "mensagem": "Informe o conteúdo da mensagem."
        }), 400

    resultado = enviar_mensagem(
        id_solicitacao=id_solicitacao,
        tipo_usuario=tipo_usuario,
        id_usuario=id_usuario,
        conteudo=conteudo
    )

    return jsonify(resultado["resposta"]), resultado["status_code"]
