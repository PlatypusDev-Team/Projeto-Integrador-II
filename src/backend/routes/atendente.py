import logging
from datetime import datetime
from functools import wraps

from flask import Blueprint, jsonify, request, send_file, session

from services.atendente_service import autenticar_atendente
from services.atendimento_service import (
    listar_solicitacoes_pendentes,
    buscar_detalhes_solicitacao,
    listar_meus_atendimentos,
    assumir_solicitacao,
    decidir_solicitacao,
)
from services.dashboard_service import montar_dashboard
from services.relatorio_service import (
    montar_relatorio,
    montar_relatorio_desempenho,
    montar_relatorio_produtos,
    montar_relatorio_tipos_cartao,
    gerar_excel_relatorio,
    gerar_pdf_relatorio,
)


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
        # Guardado aqui (e não no except) para que /sessao devolva o nome real.
        session["nome_atendente"] = atendente["nome_atendente"]

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
        "id_atendente": session["id_atendente"],
        "nome_atendente": session.get("nome_atendente", "Atendente")
    }), 200


@atendente_bp.route("/logout", methods=["POST"])
@atendente_required
def logout():
    session.clear()

    return jsonify({
        "success": True,
        "mensagem": "Logout realizado com sucesso."
    }), 200


@atendente_bp.route("/solicitacoes/pendentes", methods=["GET"])
@atendente_required
def pendentes():
    try:
        solicitacoes = listar_solicitacoes_pendentes()

        return jsonify({
            "success": True,
            "solicitacoes": solicitacoes,
        }), 200

    except Exception:
        logging.exception("Erro ao listar solicitações pendentes")

        return jsonify({
            "success": False,
            "mensagem": "Não foi possível carregar as solicitações.",
        }), 500


@atendente_bp.route("/solicitacoes/<int:id_solicitacao>", methods=["GET"])
@atendente_required
def detalhes_solicitacao(id_solicitacao):
    id_atendente = session["id_atendente"]

    try:
        solicitacao = buscar_detalhes_solicitacao(
            id_solicitacao,
            id_atendente,
        )

        if solicitacao is None:
            return jsonify({
                "success": False,
                "mensagem": (
                    "Solicitação não encontrada ou indisponível "
                    "para este atendente."
                ),
            }), 404

        return jsonify({
            "success": True,
            "solicitacao": solicitacao,
        }), 200

    except Exception:
        logging.exception("Erro ao buscar detalhes da solicitação")

        return jsonify({
            "success": False,
            "mensagem": "Não foi possível carregar os detalhes.",
        }), 500


@atendente_bp.route(
    "/solicitacoes/<int:id_solicitacao>/assumir",
    methods=["POST"],
)
@atendente_required
def assumir(id_solicitacao):
    id_atendente = session["id_atendente"]

    try:
        resultado = assumir_solicitacao(
            id_solicitacao,
            id_atendente,
        )

        codigo = resultado["codigo"]
        status_code = resultado["status_code"]

        mensagens = {
            "ASSUMIDA": "Solicitação assumida com sucesso.",
            "NAO_ENCONTRADA": "Solicitação não encontrada.",
            "JA_CONCLUIDA": "Esta solicitação já foi concluída.",
            "JA_ASSUMIDA_POR_MIM": (
                "Você já é responsável por esta solicitação."
            ),
            "JA_ASSUMIDA": (
                "Outro atendente já assumiu esta solicitação."
            ),
            "CONFLITO": (
                "A solicitação foi alterada. Atualize a página."
            ),
        }

        return jsonify({
            "success": codigo == "ASSUMIDA",
            "codigo": codigo,
            "mensagem": mensagens.get(
                codigo,
                "Não foi possível assumir a solicitação.",
            ),
        }), status_code

    except Exception:
        logging.exception("Erro ao assumir solicitação")

        return jsonify({
            "success": False,
            "mensagem": "Não foi possível assumir a solicitação.",
        }), 500


@atendente_bp.route(
    "/solicitacoes/<int:id_solicitacao>/decisao",
    methods=["POST"],
)
@atendente_required
def decisao(id_solicitacao):
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({
            "success": False,
            "mensagem": "Envie a decisão em formato JSON.",
        }), 400

    decisao_informada = dados.get("decisao")
    observacao = dados.get("observacao", "")

    if not isinstance(decisao_informada, str):
        return jsonify({
            "success": False,
            "mensagem": "Informe ACEITAR ou RECUSAR.",
        }), 400

    decisao_informada = decisao_informada.strip().upper()

    if decisao_informada not in {"ACEITAR", "RECUSAR"}:
        return jsonify({
            "success": False,
            "mensagem": "Decisão inválida. Use ACEITAR ou RECUSAR.",
        }), 400

    if not isinstance(observacao, str):
        return jsonify({
            "success": False,
            "mensagem": "A observação deve ser um texto.",
        }), 400

    if len(observacao) > 5000:
        return jsonify({
            "success": False,
            "mensagem": "A observação deve ter no máximo 5000 caracteres.",
        }), 400

    try:
        resultado = decidir_solicitacao(
            id_solicitacao=id_solicitacao,
            id_atendente=session["id_atendente"],
            decisao=decisao_informada,
            observacao=observacao,
        )

        codigo = resultado["codigo"]
        status_code = resultado["status_code"]

        mensagens = {
            "DECIDIDA": "Decisão registrada com sucesso.",
            "DECISAO_INVALIDA": "Decisão inválida.",
            "NAO_ENCONTRADA": "Solicitação não encontrada.",
            "JA_CONCLUIDA": "Esta solicitação já foi concluída.",
            "SEM_PERMISSAO": (
                "Você não é responsável por esta solicitação."
            ),
            "CONFLITO": (
                "A solicitação foi alterada. Atualize a página."
            ),
        }

        resposta = {
            "success": codigo == "DECIDIDA",
            "codigo": codigo,
            "mensagem": mensagens.get(
                codigo,
                "Não foi possível registrar a decisão.",
            ),
        }

        if codigo == "DECIDIDA":
            resposta["status"] = resultado["status"]

        return jsonify(resposta), status_code

    except Exception:
        logging.exception("Erro ao registrar decisão")

        return jsonify({
            "success": False,
            "mensagem": "Não foi possível registrar a decisão.",
        }), 500


@atendente_bp.route("/meus-atendimentos", methods=["GET"])
@atendente_required
def meus_atendimentos():
    id_atendente = session["id_atendente"]

    try:
        atendimentos = listar_meus_atendimentos(id_atendente)

        return jsonify({
            "success": True,
            "atendimentos": atendimentos,
        }), 200

    except Exception:
        logging.exception("Erro ao listar meus atendimentos")

        return jsonify({
            "success": False,
            "mensagem": "Não foi possível carregar seus atendimentos.",
        }), 500


# =====================================================
# RELATÓRIOS
# =====================================================

def obter_periodo_relatorio():
    inicio = request.args.get("inicio") or None
    fim = request.args.get("fim") or None

    try:
        if inicio:
            datetime.strptime(inicio, "%Y-%m-%d")

        if fim:
            datetime.strptime(fim, "%Y-%m-%d")

        if inicio and fim and inicio > fim:
            return None, None, "A data inicial não pode ser posterior à final."

        return inicio, fim, None

    except ValueError:
        return None, None, "Informe as datas no formato válido."


@atendente_bp.get("/relatorios/solicitacoes")
@atendente_required
def relatorio_solicitacoes():
    inicio, fim, erro = obter_periodo_relatorio()

    if erro:
        return jsonify({"success": False, "mensagem": erro}), 400

    try:
        relatorio = montar_relatorio(inicio, fim)

        registros = [
            {
                "id_solicitacao": item["id_solicitacao"],
                "status": item["status"],
                "data_solicitacao": (
                    item["data_solicitacao"].isoformat(
                        sep=" ", timespec="seconds"
                    )
                    if item["data_solicitacao"]
                    else None
                ),
            }
            for item in relatorio["registros"]
        ]

        return jsonify({
            "success": True,
            "total": relatorio["total"],
            "por_status": relatorio["por_status"],
            "por_mes": relatorio["por_mes"],
            "registros": registros,
        }), 200

    except Exception:
        logging.exception("Erro ao gerar relatório de solicitações")

        return jsonify({
            "success": False,
            "mensagem": "Não foi possível gerar o relatório de solicitações.",
        }), 500


@atendente_bp.get("/relatorios/solicitacoes/exportar/<formato>")
@atendente_required
def exportar_relatorio_solicitacoes(formato):
    if formato not in ("pdf", "xlsx"):
        return jsonify({
            "success": False,
            "mensagem": "Formato de exportação não suportado.",
        }), 400

    inicio, fim, erro = obter_periodo_relatorio()

    if erro:
        return jsonify({"success": False, "mensagem": erro}), 400

    try:
        relatorio = montar_relatorio(inicio, fim)

        if formato == "xlsx":
            arquivo = gerar_excel_relatorio(relatorio)

            return send_file(
                arquivo,
                mimetype=(
                    "application/vnd.openxmlformats-officedocument."
                    "spreadsheetml.sheet"
                ),
                as_attachment=True,
                download_name="relatorio_solicitacoes.xlsx",
            )

        arquivo = gerar_pdf_relatorio(relatorio)

        return send_file(
            arquivo,
            mimetype="application/pdf",
            as_attachment=True,
            download_name="relatorio_solicitacoes.pdf",
        )

    except Exception:
        logging.exception("Erro ao exportar relatório de solicitações")

        return jsonify({
            "success": False,
            "mensagem": "Não foi possível exportar o relatório.",
        }), 500


def _serializar_data(valor):
    if valor is None:
        return None

    if isinstance(valor, datetime):
        return valor.isoformat(sep=" ", timespec="seconds")

    if hasattr(valor, "isoformat"):
        return valor.isoformat()

    return str(valor)


@atendente_bp.get("/relatorios/desempenho")
@atendente_required
def relatorio_desempenho():
    inicio, fim, erro = obter_periodo_relatorio()

    if erro:
        return jsonify({
            "success": False,
            "mensagem": erro,
        }), 400

    try:
        relatorio = montar_relatorio_desempenho(inicio, fim)

        registros = [
            {
                "id_solicitacao": item.get("id_solicitacao"),
                "status": item.get("status"),
                "data_solicitacao": _serializar_data(
                    item.get("data_solicitacao")
                ),
                "data_conclusao": _serializar_data(
                    item.get("data_conclusao")
                ),
                "tempo_analise_segundos": item.get(
                    "tempo_analise_segundos"
                ),
                "tempo_pendente_segundos": item.get(
                    "tempo_pendente_segundos"
                ),
            }
            for item in relatorio.get("registros", [])
        ]

        # Os tempos podem ser None (sem dados). O front-end trata None
        # mostrando "Não calculado", por isso NÃO trocamos por 0.
        return jsonify({
            "success": True,
            "total": relatorio.get("total", 0),
            "concluidas": relatorio.get("concluidas", 0),
            "pendentes": relatorio.get("pendentes", 0),
            "aceitas": relatorio.get("aceitas", 0),
            "negadas": relatorio.get("negadas", 0),
            "tempo_medio_segundos": relatorio.get("tempo_medio_segundos"),
            "quantidade_com_tempo_calculado": relatorio.get(
                "quantidade_com_tempo_calculado", 0
            ),
            "tempo_medio_pendente_segundos": relatorio.get(
                "tempo_medio_pendente_segundos"
            ),
            "maior_tempo_pendente_segundos": relatorio.get(
                "maior_tempo_pendente_segundos"
            ),
            "por_mes": relatorio.get("por_mes", []),
            "registros": registros,
        }), 200

    except Exception:
        logging.exception("Erro ao gerar relatório de tempo de análise")

        return jsonify({
            "success": False,
            "mensagem": (
                "Não foi possível gerar o relatório de tempo de análise."
            ),
        }), 500


@atendente_bp.get("/relatorios/produtos")
@atendente_required
def relatorio_produtos():
    inicio, fim, erro = obter_periodo_relatorio()

    if erro:
        return jsonify({
            "success": False,
            "mensagem": erro,
        }), 400

    try:
        relatorio = montar_relatorio_produtos(inicio, fim)

        return jsonify({
            "success": True,
            "total": relatorio["total"],
            "lojas": relatorio["lojas"],
        }), 200

    except Exception:
        logging.exception("Erro ao gerar relatório de produtividade por loja")

        return jsonify({
            "success": False,
            "mensagem": (
                "Não foi possível gerar o relatório de produtividade "
                "por loja."
            ),
        }), 500


@atendente_bp.get("/relatorios/tipos-cartao")
@atendente_required
def relatorio_tipos_cartao():
    inicio, fim, erro = obter_periodo_relatorio()

    if erro:
        return jsonify({
            "success": False,
            "mensagem": erro,
        }), 400

    try:
        relatorio = montar_relatorio_tipos_cartao(inicio, fim)

        return jsonify({
            "success": True,
            "total": relatorio["total"],
            "por_tipo": relatorio["por_tipo"],
            "por_mes": relatorio["por_mes"],
            "por_mes_tipo": relatorio["por_mes_tipo"],
        }), 200

    except Exception:
        logging.exception("Erro ao gerar relatório de tipos de cartão")

        return jsonify({
            "success": False,
            "mensagem": (
                "Não foi possível gerar o relatório de tipos de cartão."
            ),
        }), 500


@atendente_bp.get("/relatorios/dashboard")
@atendente_required
def relatorio_dashboard():
    try:
        dados = montar_dashboard()
        return jsonify({"success": True, **dados}), 200
    except Exception:
        logging.exception("Erro ao carregar dashboard de relatórios")
        return jsonify({
            "success": False,
            "mensagem": (
                "Não foi possível carregar os indicadores do dashboard."
            ),
        }), 500