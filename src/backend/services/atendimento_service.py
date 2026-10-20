
import logging

from db import get_connection


def listar_solicitacoes_pendentes():
    """Lista solicitações em análise que ainda não foram assumidas."""

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    s.id_solicitacao,
                    s.status,
                    c.nome_cliente,
                    COALESCE(
                        ca.nome_cartao,
                        se.nome_servico,
                        'Produto não identificado'
                    ) AS nome_produto,
                    CASE
                        WHEN ca.id_produto IS NOT NULL THEN 'CARTAO'
                        WHEN se.id_produto IS NOT NULL THEN 'SERVICO'
                        ELSE 'PRODUTO'
                    END AS tipo_produto
                FROM tb_solicitacao AS s
                INNER JOIN tb_cliente AS c
                    ON c.id_cliente = s.id_cliente
                LEFT JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                LEFT JOIN tb_servico AS se
                    ON se.id_produto = s.id_produto
                WHERE s.status = 'EM ANALISE'
                  AND s.id_atendente_responsavel IS NULL
                ORDER BY s.id_solicitacao ASC
                """
            )

            return cursor.fetchall()

    finally:
        conexao.close()


def buscar_detalhes_solicitacao(id_solicitacao, id_atendente):
    """
    Busca os detalhes de uma solicitação disponível ou atribuída
    ao atendente autenticado, incluindo seu histórico.
    """

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    s.id_solicitacao,
                    s.status,
                    s.id_cliente,
                    s.id_produto,
                    s.id_atendente_responsavel,
                    c.nome_cliente,
                    c.cpf_cliente,
                    c.email_cliente,
                    c.telefone_cliente,
                    c.tipo_cliente,
                    c.data_nascimento,
                    COALESCE(
                        ca.nome_cartao,
                        se.nome_servico,
                        'Produto não identificado'
                    ) AS nome_produto,
                    CASE
                        WHEN ca.id_produto IS NOT NULL THEN 'CARTAO'
                        WHEN se.id_produto IS NOT NULL THEN 'SERVICO'
                        ELSE 'PRODUTO'
                    END AS tipo_produto,
                    ca.tipo_cartao,
                    ca.modalidade,
                    ca.descricao_cartao,
                    se.descricao_servico,
                    l.nome_loja
                FROM tb_solicitacao AS s
                INNER JOIN tb_cliente AS c
                    ON c.id_cliente = s.id_cliente
                LEFT JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                LEFT JOIN tb_servico AS se
                    ON se.id_produto = s.id_produto
                LEFT JOIN tb_loja AS l
                    ON l.id_loja = ca.id_loja
                WHERE s.id_solicitacao = %s
                  AND (
                      s.id_atendente_responsavel IS NULL
                      OR s.id_atendente_responsavel = %s
                  )
                """,
                (id_solicitacao, id_atendente),
            )

            solicitacao = cursor.fetchone()

            if not solicitacao:
                return None

            # CPF mascarado: não precisamos expor o número completo
            # no painel administrativo.
            cpf = solicitacao.pop("cpf_cliente")
            solicitacao["cpf_cliente"] = (
                f"***.***.{cpf[6:9]}-{cpf[9:]}"
                if cpf and len(cpf) == 11
                else "***.***.***-**"
            )

            cursor.execute(
                """
                SELECT
                    a.id_atendimento,
                    a.historico_atendimento,
                    a.data_atendimento,
                    a.id_atendente,
                    t.nome_atendente
                FROM tb_atendimento AS a
                INNER JOIN tb_atendente AS t
                    ON t.id_atendente = a.id_atendente
                WHERE a.id_solicitacao = %s
                ORDER BY a.data_atendimento ASC, a.id_atendimento ASC
                """,
                (id_solicitacao,),
            )

            solicitacao["historico"] = cursor.fetchall()

            return solicitacao

    finally:
        conexao.close()


def listar_meus_atendimentos(id_atendente):
    """Lista as solicitações atribuídas ao atendente autenticado."""

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    s.id_solicitacao,
                    s.status,
                    s.id_cliente,
                    c.nome_cliente,
                    COALESCE(
                        ca.nome_cartao,
                        se.nome_servico,
                        'Produto não identificado'
                    ) AS nome_produto,
                    MAX(a.data_atendimento) AS ultima_atualizacao
                FROM tb_solicitacao AS s
                INNER JOIN tb_cliente AS c
                    ON c.id_cliente = s.id_cliente
                LEFT JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                LEFT JOIN tb_servico AS se
                    ON se.id_produto = s.id_produto
                LEFT JOIN tb_atendimento AS a
                    ON a.id_solicitacao = s.id_solicitacao
                   AND a.id_atendente = %s
                WHERE s.id_atendente_responsavel = %s
                GROUP BY
                    s.id_solicitacao,
                    s.status,
                    s.id_cliente,
                    c.nome_cliente,
                    ca.nome_cartao,
                    se.nome_servico
                ORDER BY ultima_atualizacao DESC,
                         s.id_solicitacao DESC
                """,
                (id_atendente, id_atendente),
            )

            return cursor.fetchall()

    finally:
        conexao.close()


def assumir_solicitacao(id_solicitacao, id_atendente):
    """
    Atribui uma solicitação ao atendente com bloqueio transacional.
    Apenas uma pessoa pode assumir a solicitação.
    """

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT status, id_atendente_responsavel
                FROM tb_solicitacao
                WHERE id_solicitacao = %s
                FOR UPDATE
                """,
                (id_solicitacao,),
            )

            solicitacao = cursor.fetchone()

            if not solicitacao:
                conexao.rollback()
                return {"codigo": "NAO_ENCONTRADA", "status_code": 404}

            if solicitacao["status"] != "EM ANALISE":
                conexao.rollback()
                return {"codigo": "JA_CONCLUIDA", "status_code": 409}

            responsavel = solicitacao["id_atendente_responsavel"]

            if responsavel is not None:
                if responsavel == id_atendente:
                    conexao.rollback()
                    return {
                        "codigo": "JA_ASSUMIDA_POR_MIM",
                        "status_code": 409,
                    }

                conexao.rollback()
                return {"codigo": "JA_ASSUMIDA", "status_code": 409}

            cursor.execute(
                """
                UPDATE tb_solicitacao
                SET id_atendente_responsavel = %s
                WHERE id_solicitacao = %s
                  AND status = 'EM ANALISE'
                  AND id_atendente_responsavel IS NULL
                """,
                (id_atendente, id_solicitacao),
            )

            if cursor.rowcount != 1:
                conexao.rollback()
                return {"codigo": "CONFLITO", "status_code": 409}

            cursor.execute(
                """
                INSERT INTO tb_atendimento (
                    historico_atendimento,
                    id_solicitacao,
                    id_atendente
                )
                VALUES (%s, %s, %s)
                """,
                (
                    "Solicitação assumida para análise.",
                    id_solicitacao,
                    id_atendente,
                ),
            )

        conexao.commit()

        return {
            "codigo": "ASSUMIDA",
            "status_code": 200,
        }

    except Exception:
        conexao.rollback()
        logging.exception("Erro ao assumir solicitação")
        raise

    finally:
        conexao.close()

def decidir_solicitacao(id_solicitacao, id_atendente, decisao, observacao):
    """
    Registra a decisão final, a data de conclusão e o histórico
    da solicitação sob responsabilidade do atendente autenticado.
    """

    status_final = {
        "ACEITAR": "ACEITO",
        "RECUSAR": "NEGADO",
    }.get(decisao)

    if status_final is None:
        return {"codigo": "DECISAO_INVALIDA", "status_code": 400}

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT status, id_atendente_responsavel
                FROM tb_solicitacao
                WHERE id_solicitacao = %s
                FOR UPDATE
                """,
                (id_solicitacao,),
            )

            solicitacao = cursor.fetchone()

            if not solicitacao:
                conexao.rollback()
                return {"codigo": "NAO_ENCONTRADA", "status_code": 404}

            if solicitacao["status"] != "EM ANALISE":
                conexao.rollback()
                return {"codigo": "JA_CONCLUIDA", "status_code": 409}

            if solicitacao["id_atendente_responsavel"] != id_atendente:
                conexao.rollback()
                return {"codigo": "SEM_PERMISSAO", "status_code": 403}

            texto_historico = (
                f"Solicitação {status_final.lower()}."
                + (
                    f" Observação: {observacao.strip()}"
                    if observacao and observacao.strip()
                    else ""
                )
            )

            cursor.execute(
                """
                UPDATE tb_solicitacao
                SET
                    status = %s,
                    data_conclusao = CURRENT_TIMESTAMP
                WHERE id_solicitacao = %s
                  AND status = 'EM ANALISE'
                  AND id_atendente_responsavel = %s
                """,
                (status_final, id_solicitacao, id_atendente),
            )

            if cursor.rowcount != 1:
                conexao.rollback()
                return {"codigo": "CONFLITO", "status_code": 409}

            cursor.execute(
                """
                INSERT INTO tb_atendimento (
                    historico_atendimento,
                    id_solicitacao,
                    id_atendente
                )
                VALUES (%s, %s, %s)
                """,
                (texto_historico, id_solicitacao, id_atendente),
            )

        conexao.commit()

        return {
            "codigo": "DECIDIDA",
            "status_code": 200,
            "status": status_final,
        }

    except Exception:
        conexao.rollback()
        logging.exception("Erro ao decidir solicitação")
        raise

    finally:
        conexao.close()