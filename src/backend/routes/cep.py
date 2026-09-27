from flask import Blueprint, jsonify

from services.cep_service import buscar_uf_por_cep
from services.loja_service import buscar_lojas_por_uf


cep_bp = Blueprint(
    "cep",
    __name__,
    url_prefix="/api/lojas"
)


@cep_bp.get("/<cep>")
def consultar_lojas(cep):

    try:
        uf = buscar_uf_por_cep(cep)

        lojas = buscar_lojas_por_uf(uf)

        if not lojas:
            return jsonify({
                "cep": cep,
                "uf": uf,
                "lojas": [],
                "mensagem": "Nenhuma loja disponível para este CEP."
            }), 200

        return jsonify({
            "cep": cep,
            "uf": uf,
            "lojas": lojas
        }), 200

    except ValueError as erro:
        return jsonify({
            "erro": str(erro)
        }), 400