
from flask import Blueprint, jsonify, request, session
from services.solicitacao_service import processar_solicitacao

solicitacao_bp = Blueprint(
    "solicitacao",
    __name__,
    url_prefix="/api",
)


@solicitacao_bp.post("/cadastro")
def cadastro():
    resultado = processar_solicitacao(
        dados=request.form,
        documento=request.files.get("documento"),
    )

    if resultado["status_code"] == 201:
        session.clear()
        session["id_cliente"] = resultado["resposta"]["id_cliente"]

    return jsonify(resultado["resposta"]), resultado["status_code"]
