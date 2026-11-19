from db import get_connection

def buscar_outros_produtos():
    conexao = get_connection()

    try:
       with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id_produto,
                    nome_servico,
                    descricao_servico
                FROM tb_servico
                WHERE ativo_servico = 1
                ORDER BY id_produto;
                """
            )

            produtos = cursor.fetchall()

            return produtos

    finally:
        conexao.close()
