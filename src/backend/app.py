from flask import Flask
from flask_cors import CORS

from routes.cep import cep_bp
from routes.status import solicitacoes_bp
from routes.selecao_cartao import selecao_cartao_bp
from routes.solicitacao import solicitacao_bp
from routes.cartao import cartao_bp


def create_app():
    app = Flask(__name__)

    CORS(app)

    app.json.sort_keys = False
    app.json.ensure_ascii = False

    app.register_blueprint(cep_bp)
    app.register_blueprint(selecao_cartao_bp)
    app.register_blueprint(solicitacoes_bp)
    app.register_blueprint(solicitacao_bp)
    app.register_blueprint(cartao_bp)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=5000)