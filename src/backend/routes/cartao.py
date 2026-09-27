from flask import Blueprint, jsonify

from services.cartao_service import buscar_cartao_por_id


cartao_bp = Blueprint(
    "cartao",
    __name__,
    url_prefix="/api/cartoes"
)


@cartao_bp.get("/<int:id_cartao>")
def consultar_cartao(id_cartao):

    cartao = buscar_cartao_por_id(
        id_cartao
    )

    if not cartao:
        return jsonify({
            "erro": "Cartão não encontrado."
        }), 404

    return jsonify(cartao), 200