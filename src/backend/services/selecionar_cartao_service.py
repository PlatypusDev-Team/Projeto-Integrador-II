
from db import get_connection


def buscar_cartoes_loja(id_loja):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.id_produto,
                    c.nome_cartao,
                    c.modalidade
                FROM tb_cartao AS c
                WHERE c.id_loja = %s
                ORDER BY c.id_produto
                """,
                (id_loja,)
            )

            return cursor.fetchall()

    finally:
        conexao.close()


def buscar_filial(id_filial):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT id_loja
                FROM tb_filial
                WHERE id_filial = %s
                """,
                (id_filial,)
            )

            resultado = cursor.fetchone()

            if not resultado:
                return None

            return resultado["id_loja"]

    finally:
        conexao.close()


def verificar_modalidade(id_loja):
    cartoes = buscar_cartoes_loja(id_loja)

    if len(cartoes) == 1:
        return {
            "tipo": "automatico",
            "cartao": cartoes[0]
        }

    if len(cartoes) > 1:
        return {
            "tipo": "escolha",
            "cartoes": cartoes
        }

    return {
        "tipo": "indisponivel",
        "cartoes": None
    }


def criar_solicitacao(id_cliente, id_produto):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO tb_solicitacao
                    (status, id_cliente, id_produto)
                VALUES
                    ('EM ANALISE', %s, %s)
                """,
                (id_cliente, id_produto)
            )

            id_solicitacao = cursor.lastrowid

        conexao.commit()

        return id_solicitacao

    except Exception:
        conexao.rollback()
        raise

    finally:
        conexao.close()


def processar_solicitacao(id_cliente, id_loja):
    resultado = verificar_modalidade(id_loja)

    if resultado["tipo"] == "automatico":
        id_produto = resultado["cartao"]["id_produto"]

        id_solicitacao = criar_solicitacao(
            id_cliente,
            id_produto
        )

        return {
            "tipo": "automatico",
            "mensagem": "Solicitação criada",
            "id_solicitacao": id_solicitacao,
            "id_produto": id_produto
        }

    return resultado


def selecionar_cartao(id_cliente, id_produto):
    id_solicitacao = criar_solicitacao(
        id_cliente,
        id_produto
    )

    return {
        "mensagem": "Solicitação criada",
        "id_solicitacao": id_solicitacao,
        "id_produto": id_produto
    }
