import os

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from routes.cep import cep_bp
from routes.status import solicitacoes_bp
from routes.selecao_cartao import selecao_cartao_bp
from routes.solicitacao import solicitacao_bp
from routes.cartao import cartao_bp
from routes.auth import auth_bp
from routes.conta import conta_bp
from routes.solicitar_cartao import solicitar_cartao_bp


load_dotenv()


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.environ["FLASK_SECRET_KEY"]
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = (
        os.getenv("FLASK_ENVIRONMENT") == "production"
    )

    CORS(app, supports_credentials=True)

    app.json.sort_keys = False
    app.json.ensure_ascii = False

    app.register_blueprint(cep_bp)
    app.register_blueprint(selecao_cartao_bp)
    app.register_blueprint(solicitacoes_bp)
    app.register_blueprint(solicitacao_bp)
    app.register_blueprint(cartao_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(conta_bp)
    app.register_blueprint(solicitar_cartao_bp)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
