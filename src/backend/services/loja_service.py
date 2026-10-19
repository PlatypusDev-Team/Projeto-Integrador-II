
from db import get_connection


def buscar_lojas_por_uf(uf):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    l.id_loja,
                    l.nome_loja,
                    l.descricao_loja,

                    MAX(
                        CASE
                            WHEN c.modalidade = 'DIGITAL'
                            THEN 1
                            ELSE 0
                        END
                    ) AS cartao_digital,

                    MAX(
                        CASE
                            WHEN c.modalidade = 'FISICO'
                                 AND f.uf_filial = %s
                            THEN 1
                            ELSE 0
                        END
                    ) AS cartao_fisico,

                    MAX(
                        CASE
                            WHEN c.modalidade = 'FISICO'
                                 AND f.uf_filial = %s
                            THEN f.id_filial
                            ELSE NULL
                        END
                    ) AS id_filial,

                    MAX(
                        CASE
                            WHEN c.modalidade = 'FISICO'
                                 AND f.uf_filial = %s
                            THEN f.uf_filial
                            ELSE NULL
                        END
                    ) AS uf_filial,

                    MAX(
                        CASE
                            WHEN c.modalidade = 'FISICO'
                                 AND f.uf_filial = %s
                            THEN f.cep_filial
                            ELSE NULL
                        END
                    ) AS cep_filial

                FROM tb_loja AS l

                LEFT JOIN tb_cartao AS c
                    ON c.id_loja = l.id_loja

                LEFT JOIN tb_filial AS f
                    ON f.id_loja = l.id_loja

                GROUP BY
                    l.id_loja,
                    l.nome_loja,
                    l.descricao_loja

                HAVING
                    cartao_digital = 1
                    OR cartao_fisico = 1
                """,
                (uf, uf, uf, uf)
            )

            return cursor.fetchall()

    finally:
        conexao.close()
