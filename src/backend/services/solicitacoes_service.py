import os

import mysql.connector
from mysql.connector import Error


STATUS_PRE_QUALIFICACAO = "CONCLUIDA"


def conectar_banco():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "127.0.0.1"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        database=os.getenv("MYSQL_DATABASE", "projeto_dm"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", os.getenv("MYSQL_ROOT_PASSWORD", "")),
    )


def buscar_solicitacao(id_solicitacao: int):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                s.id_solicitacao AS id,
                c.nome_cliente AS nome,
                c.cpf_cliente AS cpf_completo,
                ca.nome_cartao AS cartao,
                s.status AS status
            FROM tb_solicitacao AS s
            INNER JOIN tb_cliente AS c ON c.id_cliente = s.id_cliente
            INNER JOIN tb_cartao AS ca ON ca.id_cartao = s.id_cartao
            WHERE s.id_solicitacao = %s
            """,
            (id_solicitacao,),
        )
        registro = cursor.fetchone()
    finally:
        cursor.close()
        conexao.close()

    if registro is None:
        return None

    registro["cpf"] = mascarar_cpf(registro.pop("cpf_completo"))
    registro["pre_qualificacao"] = STATUS_PRE_QUALIFICACAO
    return registro


def mascarar_cpf(cpf: str) -> str:
    digitos = "".join(caractere for caractere in cpf if caractere.isdigit())
    if len(digitos) != 11:
        return "***.***.***-**"
    return f"***.***.{digitos[6:9]}-{digitos[9:]}"


__all__ = ["Error", "buscar_solicitacao"]
