import logging

from flask import Blueprint, jsonify, request, session

from services.auth_service import autenticar_cliente


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/login", methods=["POST"])
def login():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "erro": "Envie os dados de login em formato JSON."
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
            "erro": "E-mail e senha são obrigatórios."
        }), 400

    email = email.strip()

    try:
        cliente = autenticar_cliente(email, senha)

        if cliente is None:
            return jsonify({
                "erro": "E-mail ou senha inválidos."
            }), 401
        
        session.clear()
        session["id_cliente"] = cliente["id_cliente"]

        return jsonify({
            "mensagem": "Login realizado com sucesso.",
            "cliente": cliente
        }), 200

    except Exception:
        logging.exception("Erro ao realizar login")

        return jsonify({
            "erro": "Não foi possível realizar o login."
        }), 500


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({
        "mensagem": "Logout realizado com sucesso."
    }), 200
