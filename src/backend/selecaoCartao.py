import pymysql

from flask import Flask, jsonify, request
from flask_cors import CORS

import os
from dotenv import load_dotenv

load_dotenv()

app = Flask (__name__)
CORS(app)

def conectar():
    conexao = pymysql.connect(
        host="localhost",
        database=os.getenv("MYSQL_DATABASE"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        port=int(os.getenv("MYSQL_PORT"))
    )
    return conexao


def buscar_filial(id_filial):
    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute ("""
        SELECT id_loja
        FROM tb_filial
        WHERE id_filial = %s
    """, (id_filial))

    resultado = cursor.fetchall()

    cursor.close()
    conexao.close()

    return resultado[0]

@app.route("/api/filiais/<int:id_filial>/cartoes", methods=["GET"])
def consultar_cartoes_filial(id_filial):
    id_loja = buscar_filial(id_filial)

    resultado = verificar_modalidade(id_loja)

    return jsonify(resultado)


def buscar_modalidade_cartao(id_loja):
    conexao = conectar()
    cursor = conexao.cursor(pymysql.cursors.DictCursor)

    cursor.execute ("""
    
    SELECT c.id_cartao, c.nome_cartao, c.modalidade
    FROM tb_cartao_loja cl
    INNER JOIN tb_cartao c
        ON cl.id_cartao = c.id_cartao
    WHERE cl.id_loja = %s
    """, (id_loja,))

    cartoes = cursor.fetchall()

    cursor.close()
    conexao.close()

    return cartoes



def verificar_modalidade(id_loja):
    cartoes = buscar_modalidade_cartao(id_loja)

    if len (cartoes) == 1:
        return {
            "tipo": "automatico",
            "cartao": cartoes[0]
        }
    
    elif len (cartoes) == 2:
        return {
            "tipo": "escolha",
            "cartoes": cartoes
        }

    else:
        return {
        "tipo": "indisponivel",
        "cartoes": None
        }

def criar_solicitacao(id_cliente, id_cartao):
    conexao = conectar()
    cursor = conexao.cursor(pymysql.cursors.DictCursor)

    cursor.execute ("""
    INSERT INTO tb_solicitacao (status, id_cliente, id_cartao)
    VALUES ('EM ANALISE', %s, %s)
    """, (id_cliente, id_cartao))

    conexao.commit()

    cursor.close()
    conexao.close()


def processar_solicitacao(id_cliente, id_loja):
    resultado = verificar_modalidade(id_loja)

    if resultado["tipo"] == "automatico":
        id_cartao = resultado["cartao"]["id_cartao"]

        criar_solicitacao(id_cliente, id_cartao)

        return {
            "tipo": "automatico",
            "mensagem": "Solicitação criada"

        }

    elif resultado["tipo"] == "escolha":
        return resultado

    else:
        return resultado

def selecionar_cartao(id_cliente, id_cartao):
    criar_solicitacao(id_cliente, id_cartao)

    return {
        "mensagem": "Solicitação criada"
    }

@app.route("/api/solicitacoes", methods=["POST"])
def criar_solicitacao_api():
    dados = request.get_json()

    print("Dados recebidos:", dados)

    id_cliente = dados["id_cliente"]
    id_cartao = dados["id_cartao"]

    resultado = selecionar_cartao(id_cliente, id_cartao)

    return jsonify(resultado)

if __name__ == "__main__":
    app.run(debug=True)