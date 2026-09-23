import os
import pymysql
from dotenv import load_dotenv

load_dotenv()


def obter_conexao():
    return pymysql.connect(
        host="localhost",
        port=int(os.getenv("MYSQL_PORT")),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE")
    )


def buscar_lojas_por_uf(uf):
    conexao = obter_conexao()

    try:
        cursor = conexao.cursor(pymysql.cursors.DictCursor)

        cursor.execute("""
            SELECT
                l.id_loja,
                l.nome_loja,
                l.descricao_loja,

                MAX(CASE
                    WHEN c.modalidade = 'DIGITAL'
                    THEN 1
                    ELSE 0
                END) AS cartao_digital,

                MAX(CASE
                    WHEN c.modalidade = 'FISICO'
                         AND f.uf_filial = %s
                    THEN 1
                    ELSE 0
                END) AS cartao_fisico,

                MAX(CASE
                    WHEN c.modalidade = 'FISICO'
                         AND f.uf_filial = %s
                    THEN f.uf_filial
                    ELSE NULL
                END) AS uf_filial,

                MAX(CASE
                    WHEN c.modalidade = 'FISICO'
                         AND f.uf_filial = %s
                    THEN f.cep_filial
                    ELSE NULL
                END) AS cep_filial

            FROM tb_loja l

            LEFT JOIN tb_cartao_loja cl
                ON l.id_loja = cl.id_loja

            LEFT JOIN tb_cartao c
                ON cl.id_cartao = c.id_cartao

            LEFT JOIN tb_filial f
                ON l.id_loja = f.id_loja

            GROUP BY
                l.id_loja,
                l.nome_loja,
                l.descricao_loja

            HAVING
                cartao_digital = 1
                OR cartao_fisico = 1;
        """, (uf, uf, uf))

        lojas = cursor.fetchall()

        cursor.close()

        return lojas

    finally:
        conexao.close()