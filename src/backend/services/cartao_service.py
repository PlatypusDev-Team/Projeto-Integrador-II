from db import get_connection


def buscar_cartao_por_id(id_produto):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.id_produto,
                    c.nome_cartao,
                    c.tipo_cartao,
                    c.descricao_cartao,
                    c.modalidade,
                    c.bandeirado,
                    c.id_loja,
                    l.nome_loja
                FROM tb_cartao AS c
                LEFT JOIN tb_loja AS l
                    ON l.id_loja = c.id_loja
                WHERE c.id_produto = %s
                """,
                (id_produto,)
            )

            cartao = cursor.fetchone()

            if cartao:
                # TINYINT(1) chega como 0/1; o front espera true/false.
                cartao["bandeirado"] = bool(cartao["bandeirado"])

            return cartao

    finally:
        conexao.close()