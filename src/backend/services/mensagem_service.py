import logging

from db import get_connection


def buscar_mensagens(id_solicitacao, tipo_usuario, id_usuario):

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    s.id_solicitacao,
                    s.id_cliente,
                    s.id_atendente_responsavel
                FROM tb_solicitacao AS s
                WHERE s.id_solicitacao = %s
                """,
                (id_solicitacao,)
            )

            solicitacao = cursor.fetchone()

            if not solicitacao:
                return {
                    "status_code": 404,
                    "resposta": {
                        "mensagem": "Solicitação não encontrada."
                    }
                }

            # Verifica se o usuário pode visualizar a conversa.
            if tipo_usuario == "CLIENTE":

                if solicitacao["id_cliente"] != id_usuario:
                    return {
                        "status_code": 403,
                        "resposta": {
                            "mensagem": "Você não tem acesso a esta conversa."
                        }
                    }

            elif tipo_usuario == "ATENDENTE":

                responsavel = solicitacao["id_atendente_responsavel"]

                if responsavel is not None and responsavel != id_usuario:
                    return {
                        "status_code": 403,
                        "resposta": {
                            "mensagem": "Esta solicitação pertence a outro atendente."
                        }
                    }

            else:
                return {
                    "status_code": 403,
                    "resposta": {
                        "mensagem": "Usuário não autorizado."
                    }
                }

            # Verifica se já existe um chat.
            cursor.execute(
                """
                SELECT id_chat
                FROM tb_chat
                WHERE id_solicitacao = %s
                """,
                (id_solicitacao,)
            )

            chat = cursor.fetchone()

            # Solicitações sem mensagens ainda não possuem chat.
            if not chat:
                return {
                    "status_code": 200,
                    "resposta": {
                        "mensagens": []
                    }
                }

            cursor.execute(
                """
                SELECT
                    m.id_mensagem,
                    m.conteudo_mensagem,
                    m.data_envio,
                    m.remetente,
                    c.nome_cliente AS nome_cliente,
                    a.nome_atendente AS nome_atendente
                FROM tb_mensagem AS m
                LEFT JOIN tb_cliente AS c
                    ON c.id_cliente = m.id_cliente
                LEFT JOIN tb_atendente AS a
                    ON a.id_atendente = m.id_atendente
                WHERE m.id_chat = %s
                ORDER BY m.id_mensagem ASC
                """,
                (chat["id_chat"],)
            )

            mensagens = cursor.fetchall()

            return {
                "status_code": 200,
                "resposta": {
                    "mensagens": mensagens
                }
            }

    except Exception:
        logging.exception("Erro ao buscar mensagens")

        return {
            "status_code": 500,
            "resposta": {
                "mensagem": "Não foi possível carregar as mensagens."
            }
        }

    finally:
        conexao.close()


def enviar_mensagem(
    id_solicitacao,
    tipo_usuario,
    id_usuario,
    conteudo
):

    if not isinstance(conteudo, str):
        return {
            "status_code": 400,
            "resposta": {
                "mensagem": "O conteúdo da mensagem deve ser um texto."
            }
        }

    conteudo = (conteudo or "").strip()

    if not conteudo:
        return {
            "status_code": 400,
            "resposta": {
                "mensagem": "A mensagem não pode estar vazia."
            }
        }

    if len(conteudo) > 2000:
        return {
            "status_code": 400,
            "resposta": {
                "mensagem": "A mensagem deve ter no máximo 2000 caracteres."
            }
        }

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:

            # Bloqueia a solicitação durante a operação.
            # Isso também evita a criação simultânea de dois chats.
            cursor.execute(
                """
                SELECT
                    id_solicitacao,
                    id_cliente,
                    id_atendente_responsavel,
                    status
                FROM tb_solicitacao
                WHERE id_solicitacao = %s
                FOR UPDATE
                """,
                (id_solicitacao,)
            )

            solicitacao = cursor.fetchone()

            if not solicitacao:
                conexao.rollback()

                return {
                    "status_code": 404,
                    "resposta": {
                        "mensagem": "Solicitação não encontrada."
                    }
                }

            # Só é permitido conversar enquanto estiver em análise.
            if solicitacao["status"] != "EM ANALISE":
                conexao.rollback()

                return {
                    "status_code": 409,
                    "resposta": {
                        "mensagem": "Esta solicitação já foi concluída."
                    }
                }

            id_cliente = None
            id_atendente = None

            if tipo_usuario == "CLIENTE":

                if solicitacao["id_cliente"] != id_usuario:
                    conexao.rollback()

                    return {
                        "status_code": 403,
                        "resposta": {
                            "mensagem": "Você não tem acesso a esta solicitação."
                        }
                    }

                id_cliente = id_usuario

            elif tipo_usuario == "ATENDENTE":

                if solicitacao["id_atendente_responsavel"] != id_usuario:
                    conexao.rollback()

                    return {
                        "status_code": 403,
                        "resposta": {
                            "mensagem": "Você precisa assumir a solicitação antes de responder."
                        }
                    }

                id_atendente = id_usuario

            else:
                conexao.rollback()

                return {
                    "status_code": 403,
                    "resposta": {
                        "mensagem": "Usuário não autorizado."
                    }
                }

            # Procura o chat da solicitação.
            cursor.execute(
                """
                SELECT id_chat
                FROM tb_chat
                WHERE id_solicitacao = %s
                """,
                (id_solicitacao,)
            )

            chat = cursor.fetchone()

            # Cria o chat somente quando a primeira mensagem é enviada.
            if not chat:

                cursor.execute(
                    """
                    INSERT INTO tb_chat (id_solicitacao)
                    VALUES (%s)
                    """,
                    (id_solicitacao,)
                )

                id_chat = cursor.lastrowid

            else:
                id_chat = chat["id_chat"]

            # Registra a mensagem.
            cursor.execute(
                """
                INSERT INTO tb_mensagem (
                    conteudo_mensagem,
                    remetente,
                    id_chat,
                    id_cliente,
                    id_atendente
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    conteudo,
                    tipo_usuario,
                    id_chat,
                    id_cliente,
                    id_atendente
                )
            )

            id_mensagem = cursor.lastrowid

        conexao.commit()

        return {
            "status_code": 201,
            "resposta": {
                "mensagem": "Mensagem enviada com sucesso.",
                "id_mensagem": id_mensagem
            }
        }

    except Exception:
        conexao.rollback()
        logging.exception("Erro ao enviar mensagem")

        return {
            "status_code": 500,
            "resposta": {
                "mensagem": "Não foi possível enviar a mensagem."
            }
        }

    finally:
        conexao.close()