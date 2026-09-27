from db import get_connection


def buscar_cartoes_loja(id_loja):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute("""
                SELECT
                    c.id_cartao,
                    c.nome_cartao,
                    c.modalidade
                FROM tb_cartao_loja cl
                INNER JOIN tb_cartao c
                    ON cl.id_cartao = c.id_cartao
                WHERE cl.id_loja = %s
            """, (id_loja,))

            return cursor.fetchall()

    finally:
        conexao.close()


def buscar_filial(id_filial):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute("""
                SELECT id_loja
                FROM tb_filial
                WHERE id_filial = %s
            """, (id_filial,))

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


def criar_solicitacao(id_cliente, id_cartao):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute("""
                INSERT INTO tb_solicitacao
                    (status, id_cliente, id_cartao)
                VALUES
                    ('EM ANALISE', %s, %s)
            """, (id_cliente, id_cartao))

            conexao.commit()

    finally:
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

    return resultado


def selecionar_cartao(id_cliente, id_cartao):
    criar_solicitacao(id_cliente, id_cartao)

    return {
        "mensagem": "Solicitação criada"
    }