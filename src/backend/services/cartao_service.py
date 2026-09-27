from db import get_connection


def buscar_cartao_por_id(id_cartao):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id_cartao,
                    nome_cartao,
                    tipo_cartao,
                    descricao_cartao,
                    modalidade,
                    bandeirado
                FROM tb_cartao
                WHERE id_cartao = %s
                """,
                (id_cartao,)
            )

            return cursor.fetchone()

    finally:
        conexao.close()