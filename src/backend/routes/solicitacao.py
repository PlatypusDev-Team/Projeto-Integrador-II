
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

    id_cliente_sessao = resultado.pop("id_cliente_sessao", None)

    if id_cliente_sessao is not None:
        session.clear()
        session["id_cliente"] = id_cliente_sessao

    return jsonify(resultado["resposta"]), resultado["status_code"]
