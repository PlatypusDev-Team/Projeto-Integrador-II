from db import get_connection


def buscar_cartao_por_id(id_produto):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id_produto,
                    nome_cartao,
                    tipo_cartao,
                    descricao_cartao,
                    modalidade,
                    bandeirado,
                    id_loja
                FROM tb_cartao
                WHERE id_produto = %s
                """,
                (id_produto,)
            )

            return cursor.fetchone()

    finally:
        conexao.close()
