
import logging
from functools import wraps

from flask import Blueprint, jsonify, request, session

from services.atendente_service import autenticar_atendente


atendente_bp = Blueprint("atendente", __name__)


def atendente_required(func):
    """Protege endpoints exclusivos do portal administrativo."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        if (
            session.get("tipo_usuario") != "ATENDENTE"
            or not session.get("id_atendente")
        ):
            return jsonify({
                "success": False,
                "mensagem": "Autenticação de atendente necessária."
            }), 401

        return func(*args, **kwargs)

    return wrapper


@atendente_bp.route("/login", methods=["POST"])
def login():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "success": False,
            "mensagem": "Envie os dados de login em formato JSON."
        }), 400

    email = dados.get("email")
    senha = dados.get("senha")

    if (
        not isinstance(email, str)
        or not email.strip()
        or not isinstance(senha, str)
        or not senha
    ):
        return jsonify({
            "success": False,
            "mensagem": "E-mail e senha são obrigatórios."
        }), 400

    try:
        atendente = autenticar_atendente(email.strip(), senha)

        if atendente is None:
            return jsonify({
                "success": False,
                "mensagem": "E-mail ou senha inválidos."
            }), 401

        # Impede o reaproveitamento da identidade anterior.
        session.clear()
        session.permanent = False

        session["tipo_usuario"] = "ATENDENTE"
        session["id_atendente"] = atendente["id_atendente"]

        return jsonify({
            "success": True,
            "mensagem": "Login realizado com sucesso.",
            "atendente": {
                "id_atendente": atendente["id_atendente"],
                "nome_atendente": atendente["nome_atendente"],
                "email_atendente": atendente["email_atendente"]
            }
        }), 200

    except Exception:
        logging.exception("Erro ao autenticar atendente")

        return jsonify({
            "success": False,
            "mensagem": "Não foi possível realizar o login."
        }), 500


@atendente_bp.route("/sessao", methods=["GET"])
@atendente_required
def verificar_sessao():
    return jsonify({
        "success": True,
        "autenticado": True,
        "tipo_usuario": "ATENDENTE",
        "id_atendente": session["id_atendente"]
    }), 200


@atendente_bp.route("/logout", methods=["POST"])
@atendente_required
def logout():
    session.clear()

    return jsonify({
        "success": True,
        "mensagem": "Logout realizado com sucesso."
    }), 200
