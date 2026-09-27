from flask import Blueprint, jsonify, request

from services.solicitacao_service import processar_solicitacao


solicitacao_bp = Blueprint(
    "solicitacao",
    __name__,
    url_prefix="/api"
)


@solicitacao_bp.post("/cadastro")
def cadastro():
    dados = request.form

    resultado = processar_solicitacao(
        dados=dados,
        documento=request.files.get("documento")
    )

    return jsonify(resultado["resposta"]), resultado["status_code"]