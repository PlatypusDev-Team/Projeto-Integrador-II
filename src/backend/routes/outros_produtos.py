from flask import Blueprint, jsonify

from services.outros_produtos_serviço import buscar_outros_produtos


outros_produtos_bp = Blueprint(
    "outros_produtos",
    __name__,
    url_prefix="/api/outros_produtos"
)


@outros_produtos_bp.get("/")
def consultar_outros_produtos():
    produtos = buscar_outros_produtos()

    if not produtos:
        return jsonify({
            "erro": "nenhum produto encontrado"
        }), 404

    return jsonify(produtos), 200