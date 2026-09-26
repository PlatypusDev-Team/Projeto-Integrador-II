import os
import re
from datetime import datetime, date

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

GENEROS_VALIDOS = {"MASCULINO", "FEMININO", "OUTRO"}
TIPOS_CLIENTE_VALIDOS = {"COLABORADOR", "NAO COLABORADOR"}

# IDs existentes no 02-insert.sql
CARTOES_DM = {1, 2}
CARTOES_LOJA = {3, 4, 5, 6}

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
}

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def apenas_numeros(texto):
    return re.sub(r"\D", "", texto or "")

def email_valido(email):
    return re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email or "") is not None

def cpf_valido(cpf):
    cpf = apenas_numeros(cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    digito1 = (soma * 10) % 11
    if digito1 == 10:
        digito1 = 0
    if digito1 != int(cpf[9]):
        return False

    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    digito2 = (soma * 10) % 11
    if digito2 == 10:
        digito2 = 0
    return digito2 == int(cpf[10])

def data_valida(data_str):
    try:
        return datetime.strptime(data_str, "%d/%m/%Y").date()
    except (ValueError, TypeError):
        return None

def idade_em_anos(data_nascimento):
    hoje = date.today()
    idade = hoje.year - data_nascimento.year
    if (hoje.month, hoje.day) < (data_nascimento.month, data_nascimento.day):
        idade -= 1
    return idade

def coluna_do_erro_duplicado(mensagem):
    match = re.search(r"for key '([^']+)'", mensagem, re.IGNORECASE)
    if not match:
        return None
    chave = match.group(1).lower()
    if "cpf" in chave:
        return "cpf"
    if "email" in chave:
        return "email"
    if "telefone" in chave:
        return "telefone"
    return None

def cartao_existe(cursor, id_cartao):
    cursor.execute(
        "SELECT id_cartao, nome_cartao, tipo_cartao FROM tb_cartao WHERE id_cartao = %s",
        (id_cartao,)
    )
    return cursor.fetchone()

def buscar_cliente_por_cpf(cursor, cpf):
    cursor.execute(
        "SELECT id_cliente, nome_cliente FROM tb_cliente WHERE cpf_cliente = %s",
        (cpf,)
    )
    return cursor.fetchone()

def pre_qualificar(id_cartao, idade, nivel_dm_cred):
    # O banco atual não possui um campo para guardar nível DM Cred.
    # Por isso o nível é recebido nesta solicitação, apenas para executar
    # a regra de pré-qualificação sem alterar a estrutura do banco.
    if idade < 18:
        return "NEGADO", "É necessário ter pelo menos 18 anos completos."

    if id_cartao in CARTOES_DM:
        if nivel_dm_cred >= 7:
            return "ACEITO", "Pré-qualificação DM Visa: nível 7 ou superior."
        return "EM ANALISE", (
            "Para a jornada DM Visa, a pré-qualificação depende de atingir "
            "o nível 7 do DM Cred."
        )

    if id_cartao in CARTOES_LOJA:
        return "EM ANALISE", (
            "Solicitação de cartão de loja encaminhada para análise. "
            "Comprovantes de renda e residência são diferenciais."
        )

    return "EM ANALISE", "Solicitação encaminhada para análise."

@app.route("/")
def home():
    return send_from_directory(".", "cadastro.html")

@app.route("/cadastro", methods=["POST"])
def cadastro():
    erros = {}

    nome = (request.form.get("nome") or "").strip()
    cpf = apenas_numeros(request.form.get("cpf"))
    cep = apenas_numeros(request.form.get("cep"))
    data_nascimento_form = request.form.get("data_nascimento") or ""
    telefone = apenas_numeros(request.form.get("telefone"))
    email = (request.form.get("email") or "").strip()
    genero = (request.form.get("genero") or "").strip().upper()
    tipo_cliente = (request.form.get("tipo_cliente") or "").strip().upper()
    senha = request.form.get("senha") or ""
    confirmar_senha = request.form.get("confirmar_senha") or ""
    politica = request.form.get("politica") == "on"
    id_cartao_str = request.form.get("id_cartao") or ""
    nivel_dm_cred_str = request.form.get("nivel_dm_cred") or "0"

    data_nascimento = data_valida(data_nascimento_form)

    try:
        id_cartao = int(id_cartao_str)
    except ValueError:
        id_cartao = None

    try:
        nivel_dm_cred = int(nivel_dm_cred_str)
    except ValueError:
        nivel_dm_cred = 0

    if len(nome) < 3 or len(nome) > 50:
        erros["nome"] = "Informe o nome completo (máximo 50 caracteres)."

    if not cpf_valido(cpf):
        erros["cpf"] = "Informe um CPF válido."

    if len(cep) != 8:
        erros["cep"] = "CEP deve conter 8 números."

    if not data_nascimento:
        erros["data_nascimento"] = "Data inválida. Use DD/MM/AAAA."
    elif idade_em_anos(data_nascimento) < 18:
        erros["data_nascimento"] = "É necessário ter pelo menos 18 anos completos."

    if len(telefone) not in (10, 11):
        erros["telefone"] = "Informe um telefone válido com DDD."

    if not email_valido(email) or len(email) > 100:
        erros["email"] = "Informe um email válido."

    if genero not in GENEROS_VALIDOS:
        erros["genero"] = "Selecione um gênero válido."

    if tipo_cliente not in TIPOS_CLIENTE_VALIDOS:
        erros["tipo_cliente"] = "Selecione um tipo de cliente válido."

    if len(senha) < 6:
        erros["senha"] = "A senha deve ter no mínimo 6 caracteres."
    elif senha != confirmar_senha:
        erros["confirmar_senha"] = "As senhas não coincidem."

    if not politica:
        erros["politica"] = "É necessário aceitar a política de privacidade."

    if id_cartao is None:
        erros["id_cartao"] = "Selecione um cartão."

    if nivel_dm_cred < 0 or nivel_dm_cred > 7:
        erros["nivel_dm_cred"] = "Informe um nível de DM Cred entre 0 e 7."

    if erros:
        return jsonify({"mensagem": "Corrija os campos indicados.", "erros": erros}), 400

    documento = request.files.get("documento")
    if not documento or not documento.filename:
        return jsonify({
            "mensagem": "Envie um documento de identificação.",
            "erros": {"documento": "RG ou CNH é obrigatório."}
        }), 400

    extensoes_permitidas = {".pdf", ".jpg", ".jpeg", ".png"}
    extensao = os.path.splitext(documento.filename)[1].lower()
    if extensao not in extensoes_permitidas:
        return jsonify({
            "mensagem": "Formato de documento não permitido.",
            "erros": {"documento": "Use PDF, JPG, JPEG ou PNG."}
        }), 400

    conexao = None
    cursor = None

    try:
        conexao = get_connection()
        cursor = conexao.cursor()

        cartao = cartao_existe(cursor, id_cartao)
        if not cartao:
            return jsonify({
                "mensagem": "O cartão selecionado não existe no banco.",
                "erros": {"id_cartao": "Cartão inválido."}
            }), 400

        existente = buscar_cliente_por_cpf(cursor, cpf)

        if existente:
            id_cliente = existente[0]
        else:
            senha_hash = generate_password_hash(senha)
            cep_formatado = f"{cep[:5]}-{cep[5:]}"
            cursor.execute("""
                INSERT INTO tb_cliente
                (nome_cliente, cpf_cliente, cep_cliente, email_cliente,
                 telefone_cliente, genero_cliente, data_nascimento,
                 tipo_cliente, senha_cliente)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                nome, cpf, cep_formatado, email, telefone, genero,
                data_nascimento, tipo_cliente, senha_hash
            ))
            id_cliente = cursor.lastrowid

        # O schema atual de tb_solicitacao possui somente:
        # status, id_cliente e id_cartao.
        status, motivo = pre_qualificar(
            id_cartao, idade_em_anos(data_nascimento), nivel_dm_cred
        )

        cursor.execute("""
            INSERT INTO tb_solicitacao (status, id_cliente, id_cartao)
            VALUES (%s, %s, %s)
        """, (status, id_cliente, id_cartao))

        conexao.commit()

        resposta = {
            "mensagem": "Solicitação registrada com sucesso.",
            "status": status,
            "motivo": motivo,
            "id_solicitacao": cursor.lastrowid
        }

        # O banco atual não possui coluna para guardar o arquivo.
        # O documento é validado no formulário, mas não é inserido no banco.
        if status == "ACEITO":
            resposta["mensagem"] = "Solicitação pré-qualificada com sucesso."
        elif status == "EM ANALISE":
            resposta["mensagem"] = "Solicitação registrada e encaminhada para análise."
        else:
            resposta["mensagem"] = "Solicitação não pré-qualificada."

        return jsonify(resposta), 201

    except Error as erro_db:
        if conexao:
            conexao.rollback()

        if erro_db.errno == 1062:
            campo = coluna_do_erro_duplicado(str(erro_db))
            if campo:
                return jsonify({
                    "mensagem": f"Este {campo} já está cadastrado.",
                    "erros": {campo: "Já cadastrado."}
                }), 409

        print("Erro ao gravar no banco:", erro_db)
        return jsonify({
            "mensagem": "Erro interno ao salvar a solicitação. Tente novamente."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conexao:
            conexao.close()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
