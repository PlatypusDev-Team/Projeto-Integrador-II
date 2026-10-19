import os
import re
import bcrypt

from datetime import datetime
from db import get_connection


GENEROS_VALIDOS = {"MASCULINO", "FEMININO", "OUTRO"}
TIPO_CLIENTE_NOVO = "NAO COLABORADOR"
EXTENSOES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png"}


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
        data_nascimento.day
    ):
        idade -= 1

    return idade


def validar_documento(documento):
    if not documento or not documento.filename:
        return False, "RG ou CNH é obrigatório para solicitar um cartão."

    extensao = os.path.splitext(documento.filename)[1].lower()

    if extensao not in EXTENSOES_PERMITIDAS:
        return False, "Use PDF, JPG, JPEG ou PNG."

    return True, None


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

    id_produto_str = (
        dados.get("id_produto")
        or dados.get("id_cartao")
        or ""
    ).strip()

    id_produto = None

    if id_produto_str:
        try:
            id_produto = int(id_produto_str)
            if id_produto <= 0:
                raise ValueError
        except (ValueError, TypeError):
            erros["id_cartao"] = "Cartão inválido."

    if len(nome) < 3 or len(nome) > 50:
        erros["nome"] = "Informe um nome de 3 a 50 caracteres."

    if not cpf_valido(cpf):
        erros["cpf"] = "Informe um CPF válido."

    if not data_nascimento:
        erros["data_nascimento"] = "Data inválida. Use DD/MM/AAAA."
    elif idade_em_anos(data_nascimento) < 18:
        erros["data_nascimento"] = "É necessário ter pelo menos 18 anos completos."

    if len(telefone) not in (10, 11):
        erros["telefone"] = "Informe um telefone válido com DDD."

    if not email_valido(email) or len(email) > 100:
        erros["email"] = "Informe um e-mail válido."

    if genero not in GENEROS_VALIDOS:
        erros["genero"] = "Selecione um gênero válido."

    if len(senha) < 8:
        erros["senha"] = "A senha deve ter pelo menos 8 caracteres."
    elif senha != confirmar_senha:
        erros["confirmar_senha"] = "As senhas não coincidem."

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


def aplicar_regras(tipo_cliente, tipo_cartao):
    if tipo_cliente == "COLABORADOR" and tipo_cartao == "LOJA":
        return "NEGADO", "Colaboradores não podem solicitar cartões de loja."

    return "EM ANALISE", "Solicitação encaminhada para análise."


def processar_solicitacao(dados, documento=None):
    validacao = validar_dados(dados)
    erros = validacao["erros"]
    id_produto = validacao["id_produto"]

    if id_produto is not None:
        documento_valido, erro_documento = validar_documento(documento)
        if not documento_valido:
            erros["documento"] = erro_documento

    if erros:
        return {
            "status_code": 400,
            "resposta": {
                "mensagem": "Corrija os campos indicados.",
                "erros": erros,
            },
        }

    conexao = None

    try:
        conexao = get_connection()

        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT id_cliente
                FROM tb_cliente
                WHERE cpf_cliente = %s
                   OR email_cliente = %s
                   OR telefone_cliente = %s
                """,
                (
                    validacao["cpf"],
                    validacao["email"],
                    validacao["telefone"],
                ),
            )

            if cursor.fetchone():
                return {
                    "status_code": 409,
                    "resposta": {
                        "mensagem": (
                            "Já existe uma conta com esse CPF, "
                            "e-mail ou telefone. Faça login."
                        ),
                        "erros": {
                            "cadastro": "Dados já cadastrados."
                        },
                    },
                }

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
                    return {
                        "status_code": 400,
                        "resposta": {
                            "mensagem": "O cartão selecionado não existe.",
                            "erros": {"id_cartao": "Cartão inválido."},
                        },
                    }

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
            id_solicitacao = None
            status = None
            motivo = None

            if cartao:
                status, motivo = aplicar_regras(
                    TIPO_CLIENTE_NOVO,
                    cartao["tipo_cartao"],
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

                id_solicitacao = cursor.lastrowid

        conexao.commit()

        resposta = {
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
        }

        return {"status_code": 201, "resposta": resposta}

    except Exception:
        if conexao:
            conexao.rollback()

        import logging
        logging.exception("Erro ao processar cadastro")

        return {
            "status_code": 500,
            "resposta": {
                "mensagem": "Não foi possível concluir o cadastro."
            },
        }

    finally:
        if conexao:
            conexao.close()
