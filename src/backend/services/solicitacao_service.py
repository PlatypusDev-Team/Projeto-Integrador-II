import logging
import os
import re
import bcrypt

from datetime import datetime
from db import get_connection


GENEROS_VALIDOS = {"MASCULINO", "FEMININO", "OUTRO"}
TIPO_CLIENTE_NOVO = "NAO COLABORADOR"

ID_CARTAO_COLABORADOR = 1
EXTENSOES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png"}

COD_CARTAO_INEXISTENTE = "CARTAO_INEXISTENTE"
COD_EM_ANALISE = "SOLICITACAO_EM_ANALISE"
COD_CARTAO_REPETIDO = "CARTAO_JA_SOLICITADO"


def apenas_numeros(texto):
    return re.sub(r"\D", "", texto or "")


def email_valido(email):
    return re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email or "") is not None


def cpf_valido(cpf):
    cpf = apenas_numeros(cpf)

    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    digito1 = (soma * 10) % 11

    if digito1 == 10:
        digito1 = 0

    if digito1 != int(cpf[9]):
        return False

    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    digito2 = (soma * 10) % 11

    if digito2 == 10:
        digito2 = 0

    return digito2 == int(cpf[10])


def data_valida(data_str):
    try:
        return datetime.strptime(data_str, "%d/%m/%Y").date()
    except (ValueError, TypeError):
        return None


def idade_em_anos(data_nascimento):
    hoje = datetime.now().date()
    idade = hoje.year - data_nascimento.year

    if (hoje.month, hoje.day) < (
        data_nascimento.month,
        data_nascimento.day,
    ):
        idade -= 1

    return idade


def validar_documento(documento):
    if not documento or not documento.filename:
        return False, "RG ou CNH é obrigatório para continuar."

    extensao = os.path.splitext(documento.filename)[1].lower()

    if extensao not in EXTENSOES_PERMITIDAS:
        return False, "Use PDF, JPG, JPEG ou PNG."

    return True, None


def ler_id_produto(dados):
    """
    Aceita 'id_produto' ou 'id_cartao', como texto (formulário)
    ou número (JSON). Retorna (valor, erro).
    """
    bruto = dados.get("id_produto") or dados.get("id_cartao")

    if bruto is None or str(bruto).strip() == "":
        return None, None

    try:
        valor = int(str(bruto).strip())

        if valor <= 0:
            raise ValueError

        return valor, None

    except ValueError:
        return None, "Cartão inválido."


def validar_dados(dados):
    erros = {}

    nome = (dados.get("nome") or "").strip()
    cpf = apenas_numeros(dados.get("cpf"))
    data_nascimento = data_valida(dados.get("data_nascimento"))
    telefone = apenas_numeros(dados.get("telefone"))
    email = (dados.get("email") or "").strip()
    genero = (dados.get("genero") or "").strip().upper()
    senha = dados.get("senha") or ""
    confirmar_senha = dados.get("confirmar_senha") or ""

    id_produto, erro_produto = ler_id_produto(dados)

    if erro_produto:
        erros["id_cartao"] = erro_produto

    if len(nome) < 3 or len(nome) > 50:
        erros["nome"] = "Informe um nome de 3 a 50 caracteres."

    if not cpf_valido(cpf):
        erros["cpf"] = "Informe um CPF válido."

    if not data_nascimento:
        erros["data_nascimento"] = "Data inválida. Use DD/MM/AAAA."
    elif idade_em_anos(data_nascimento) < 18:
        erros["data_nascimento"] = (
            "É necessário ter pelo menos 18 anos completos."
        )

    if len(telefone) not in (10, 11):
        erros["telefone"] = "Informe um telefone válido com DDD."

    if not email_valido(email) or len(email) > 100:
        erros["email"] = "Informe um e-mail válido."

    if genero not in GENEROS_VALIDOS:
        erros["genero"] = "Selecione um gênero válido."

    if len(senha) < 8:
        erros["senha"] = "A senha deve ter pelo menos 8 caracteres."
    elif len(senha.encode("utf-8")) > 72:
        # O bcrypt só considera os primeiros 72 bytes.
        erros["senha"] = "A senha deve ter no máximo 72 caracteres."
    elif senha != confirmar_senha:
        erros["confirmar_senha"] = "As senhas não coincidem."

    if not dados.get("politica"):
        erros["politica"] = (
            "É necessário aceitar a política de privacidade."
        )

    return {
        "erros": erros,
        "nome": nome,
        "cpf": cpf,
        "data_nascimento": data_nascimento,
        "telefone": telefone,
        "email": email,
        "genero": genero,
        "senha": senha,
        "id_produto": id_produto,
    }


def aplicar_regras(tipo_cliente, id_produto):
    if tipo_cliente == "COLABORADOR":
        # Colaborador só pode pedir o cartão DM Visa (ID_CARTAO_COLABORADOR),
        # e ele é aprovado automaticamente. Qualquer outro cartão é negado.
        if id_produto == ID_CARTAO_COLABORADOR:
            return (
                "ACEITO",
                "Cartão DM Visa aprovado automaticamente para colaboradores.",
            )

        return (
            "NEGADO",
            "Colaboradores só podem solicitar o cartão DM Visa.",
        )

    return "EM ANALISE", "Solicitação encaminhada para análise."


def _resultado(status_code, resposta, id_cliente_sessao=None):
    """
    Mantém o identificador da sessão separado da resposta HTTP.
    A rota pode iniciar a sessão sem expor esse dado em erros.
    """
    return {
        "status_code": status_code,
        "resposta": resposta,
        "id_cliente_sessao": id_cliente_sessao,
    }


def _bloqueio(status_code, codigo, mensagem):
    """
    Resposta padrão para uma solicitação barrada por regra de negócio.
    'mensagem' e 'erro' trazem o mesmo texto para o front ler qualquer um.
    """
    return {
        "status_code": status_code,
        "resposta": {
            "codigo": codigo,
            "mensagem": mensagem,
            "erro": mensagem,
        },
    }


def _registrar_solicitacao(cursor, id_cliente, tipo_cliente, id_produto):
    """
    Valida as regras de negócio e registra uma solicitação.

    Não faz commit nem rollback. A transação é controlada
    pela função que chamou este helper.
    """
    cursor.execute(
        """
        SELECT id_produto, nome_cartao, tipo_cartao
        FROM tb_cartao
        WHERE id_produto = %s
        """,
        (id_produto,),
    )

    cartao = cursor.fetchone()

    if not cartao:
        return _bloqueio(
            404,
            COD_CARTAO_INEXISTENTE,
            "O cartão selecionado não existe.",
        )

    cursor.execute(
        """
        SELECT id_solicitacao
        FROM tb_solicitacao
        WHERE id_cliente = %s
          AND status = 'EM ANALISE'
        LIMIT 1
        """,
        (id_cliente,),
    )

    if cursor.fetchone():
        return _bloqueio(
            409,
            COD_EM_ANALISE,
            "Você já possui uma solicitação em análise. "
            "Aguarde a conclusão antes de solicitar outro cartão.",
        )

    cursor.execute(
        """
        SELECT id_solicitacao
        FROM tb_solicitacao
        WHERE id_cliente = %s
          AND id_produto = %s
        LIMIT 1
        """,
        (id_cliente, id_produto),
    )

    if cursor.fetchone():
        return _bloqueio(
            409,
            COD_CARTAO_REPETIDO,
            "Você já possui uma solicitação para este cartão. "
            "Escolha outro cartão.",
        )

    status, motivo = aplicar_regras(
        tipo_cliente,
        id_produto,
    )

    cursor.execute(
        """
        INSERT INTO tb_solicitacao (
            status,
            id_cliente,
            id_produto
        )
        VALUES (%s, %s, %s)
        """,
        (status, id_cliente, id_produto),
    )

    return {
        "id_solicitacao": cursor.lastrowid,
        "id_produto": id_produto,
        "status": status,
        "motivo": motivo,
    }


def processar_solicitacao(dados, documento=None):
    """
    Processa o formulário completo de cadastro.

    CPF novo:
        Exige o documento, cria a conta e, opcionalmente,
        registra uma solicitação.

    CPF existente:
        Confere a senha e reutiliza a conta, sem alterar seus dados.
        O documento NÃO é exigido (já foi enviado no primeiro cadastro).
        Se houver cartão, tenta registrar uma nova solicitação.
    """
    validacao = validar_dados(dados)
    erros = validacao["erros"]
    id_produto = validacao["id_produto"]

    if erros:
        return _resultado(
            400,
            {
                "mensagem": "Corrija os campos indicados.",
                "erros": erros,
            },
        )

    conexao = None
    id_cliente_sessao = None

    try:
        conexao = get_connection()

        with conexao.cursor() as cursor:
            # Primeiro, identificamos a conta pelo CPF.
            # O bloqueio ajuda a evitar operações simultâneas conflitantes.
            cursor.execute(
                """
                SELECT
                    id_cliente,
                    tipo_cliente,
                    senha_hash_cliente
                FROM tb_cliente
                WHERE cpf_cliente = %s
                FOR UPDATE
                """,
                (validacao["cpf"],),
            )

            cliente = cursor.fetchone()

            if cliente:
                # CPF existente: a senha é necessária para reutilizar a conta.
                senha_hash = cliente["senha_hash_cliente"]

                if isinstance(senha_hash, str):
                    senha_hash = senha_hash.encode("utf-8")

                try:
                    senha_correta = bcrypt.checkpw(
                        validacao["senha"].encode("utf-8"),
                        senha_hash,
                    )
                except (ValueError, TypeError):
                    senha_correta = False

                if not senha_correta:
                    conexao.rollback()

                    return _resultado(
                        401,
                        {
                            "mensagem": "CPF ou senha inválidos.",
                            "erros": {
                                "cadastro": "Não foi possível validar os dados."
                            },
                        },
                    )

                id_cliente = cliente["id_cliente"]
                tipo_cliente = cliente["tipo_cliente"]
                id_cliente_sessao = id_cliente

                # Não altera nome, e-mail, telefone ou outros dados
                # da conta que já existe.
                if id_produto is None:
                    conexao.commit()

                    return _resultado(
                        200,
                        {
                            "mensagem": "Login realizado com sucesso.",
                            "id_cliente": id_cliente,
                            "id_solicitacao": None,
                            "id_produto": None,
                            "status": None,
                            "motivo": None,
                        },
                        id_cliente_sessao=id_cliente_sessao,
                    )

                resultado_solicitacao = _registrar_solicitacao(
                    cursor,
                    id_cliente,
                    tipo_cliente,
                    id_produto,
                )

                # As credenciais foram validadas. Mesmo se a solicitação
                # for bloqueada, a pessoa entra na própria conta.
                if "status_code" in resultado_solicitacao:
                    conexao.rollback()

                    return _resultado(
                        resultado_solicitacao["status_code"],
                        resultado_solicitacao["resposta"],
                        id_cliente_sessao=id_cliente_sessao,
                    )

                conexao.commit()

                return _resultado(
                    201,
                    {
                        "mensagem": (
                            "Login realizado e solicitação registrada."
                        ),
                        "id_cliente": id_cliente,
                        **resultado_solicitacao,
                    },
                    id_cliente_sessao=id_cliente_sessao,
                )

            # CPF não encontrado: é o primeiro cadastro.
            # Impede duplicidade por e-mail ou telefone.
            cursor.execute(
                """
                SELECT id_cliente
                FROM tb_cliente
                WHERE email_cliente = %s
                   OR telefone_cliente = %s
                LIMIT 1
                """,
                (
                    validacao["email"],
                    validacao["telefone"],
                ),
            )

            if cursor.fetchone():
                conexao.rollback()

                return _resultado(
                    409,
                    {
                        "mensagem": (
                            "Já existe uma conta com esse e-mail ou telefone. "
                            "Confira os dados ou faça login."
                        ),
                        "erros": {
                            "cadastro": "Dados já cadastrados.",
                        },
                    },
                )

            # O documento só é exigido aqui, no primeiro cadastro.
            documento_valido, erro_documento = validar_documento(documento)

            if not documento_valido:
                conexao.rollback()

                return _resultado(
                    400,
                    {
                        "mensagem": "Corrija os campos indicados.",
                        "erros": {"documento": erro_documento},
                    },
                )

            # Confere o cartão antes de criar a conta.
            cartao = None

            if id_produto is not None:
                cursor.execute(
                    """
                    SELECT id_produto, nome_cartao, tipo_cartao
                    FROM tb_cartao
                    WHERE id_produto = %s
                    """,
                    (id_produto,),
                )

                cartao = cursor.fetchone()

                if not cartao:
                    conexao.rollback()

                    return _resultado(
                        400,
                        {
                            "codigo": COD_CARTAO_INEXISTENTE,
                            "mensagem": "O cartão selecionado não existe.",
                            "erros": {
                                "id_cartao": "Cartão inválido.",
                            },
                        },
                    )

            senha_hash = bcrypt.hashpw(
                validacao["senha"].encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            cursor.execute(
                """
                INSERT INTO tb_cliente (
                    nome_cliente,
                    cpf_cliente,
                    email_cliente,
                    telefone_cliente,
                    genero_cliente,
                    data_nascimento,
                    tipo_cliente,
                    senha_hash_cliente
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    validacao["nome"],
                    validacao["cpf"],
                    validacao["email"],
                    validacao["telefone"],
                    validacao["genero"],
                    validacao["data_nascimento"],
                    TIPO_CLIENTE_NOVO,
                    senha_hash,
                ),
            )

            id_cliente = cursor.lastrowid
            id_cliente_sessao = id_cliente

            id_solicitacao = None
            status = None
            motivo = None

            if cartao:
                resultado_solicitacao = _registrar_solicitacao(
                    cursor,
                    id_cliente,
                    TIPO_CLIENTE_NOVO,
                    id_produto,
                )

                # Se não for possível registrar a solicitação, desfaz também
                # a criação da conta para não deixar um cadastro parcial.
                if "status_code" in resultado_solicitacao:
                    conexao.rollback()

                    return _resultado(
                        resultado_solicitacao["status_code"],
                        resultado_solicitacao["resposta"],
                    )

                id_solicitacao = resultado_solicitacao["id_solicitacao"]
                status = resultado_solicitacao["status"]
                motivo = resultado_solicitacao["motivo"]

        conexao.commit()

        return _resultado(
            201,
            {
                "mensagem": (
                    "Conta criada com sucesso."
                    if id_solicitacao is None
                    else "Conta criada e solicitação registrada."
                ),
                "id_cliente": id_cliente,
                "id_solicitacao": id_solicitacao,
                "id_produto": id_produto,
                "status": status,
                "motivo": motivo,
            },
            id_cliente_sessao=id_cliente_sessao,
        )

    except Exception:
        if conexao:
            conexao.rollback()

        logging.exception("Erro ao processar cadastro")

        return _resultado(
            500,
            {
                "mensagem": "Não foi possível concluir o cadastro.",
            },
        )

    finally:
        if conexao:
            conexao.close()


def processar_solicitacao_cliente(id_cliente, dados, documento=None):
    """
    Registra uma solicitação para um cliente que já está autenticado.

    Não exige documento: ele só é pedido no primeiro cadastro.
    O parâmetro 'documento' é aceito apenas por compatibilidade
    e é ignorado.
    """
    id_produto, erro_produto = ler_id_produto(dados)

    if erro_produto or id_produto is None:
        return {
            "status_code": 400,
            "resposta": {
                "mensagem": "Selecione um cartão válido.",
                "erro": "Selecione um cartão válido.",
            },
        }

    conexao = None

    try:
        conexao = get_connection()

        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT id_cliente, tipo_cliente
                FROM tb_cliente
                WHERE id_cliente = %s
                FOR UPDATE
                """,
                (id_cliente,),
            )

            cliente = cursor.fetchone()

            if not cliente:
                conexao.rollback()

                return {
                    "status_code": 401,
                    "resposta": {
                        "mensagem": "Cliente não encontrado. Entre novamente.",
                        "erro": "Cliente não encontrado. Entre novamente.",
                    },
                }

            resultado_solicitacao = _registrar_solicitacao(
                cursor,
                id_cliente,
                cliente["tipo_cliente"],
                id_produto,
            )

            if "status_code" in resultado_solicitacao:
                conexao.rollback()

                return resultado_solicitacao

        conexao.commit()

        return {
            "status_code": 201,
            "resposta": {
                "mensagem": "Solicitação registrada com sucesso.",
                **resultado_solicitacao,
            },
        }

    except Exception:
        if conexao:
            conexao.rollback()

        logging.exception(
            "Erro ao registrar solicitação de cliente existente"
        )

        return {
            "status_code": 500,
            "resposta": {
                "mensagem": "Não foi possível registrar a solicitação.",
                "erro": "Não foi possível registrar a solicitação.",
            },
        }

    finally:
        if conexao:
            conexao.close()