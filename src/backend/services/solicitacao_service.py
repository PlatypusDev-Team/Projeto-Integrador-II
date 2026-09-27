import os
import re
from datetime import datetime

from db import get_connection


GENEROS_VALIDOS = {
    "MASCULINO",
    "FEMININO",
    "OUTRO"
}

TIPO_CLIENTE_NOVO = "NAO COLABORADOR"

EXTENSOES_PERMITIDAS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png"
}


def apenas_numeros(texto):
    return re.sub(r"\D", "", texto or "")


def email_valido(email):
    return re.match(
        r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
        email or ""
    ) is not None


def cpf_valido(cpf):
    cpf = apenas_numeros(cpf)

    if len(cpf) != 11:
        return False

    if cpf == cpf[0] * 11:
        return False

    soma = sum(
        int(cpf[i]) * (10 - i)
        for i in range(9)
    )

    digito1 = (soma * 10) % 11

    if digito1 == 10:
        digito1 = 0

    if digito1 != int(cpf[9]):
        return False

    soma = sum(
        int(cpf[i]) * (11 - i)
        for i in range(10)
    )

    digito2 = (soma * 10) % 11

    if digito2 == 10:
        digito2 = 0

    return digito2 == int(cpf[10])


def data_valida(data_str):
    try:
        return datetime.strptime(
            data_str,
            "%d/%m/%Y"
        ).date()

    except (ValueError, TypeError):
        return None


def idade_em_anos(data_nascimento):
    hoje = datetime.now().date()

    idade = (
        hoje.year
        - data_nascimento.year
    )

    if (
        hoje.month,
        hoje.day
    ) < (
        data_nascimento.month,
        data_nascimento.day
    ):
        idade -= 1

    return idade


def buscar_cartao(cursor, id_cartao):
    cursor.execute(
        """
        SELECT
            id_cartao,
            nome_cartao,
            tipo_cartao,
            modalidade,
            bandeirado
        FROM tb_cartao
        WHERE id_cartao = %s
        """,
        (id_cartao,)
    )

    return cursor.fetchone()


def buscar_cliente_por_cpf(cursor, cpf):
    cursor.execute(
        """
        SELECT
            id_cliente,
            nome_cliente,
            cpf_cliente,
            tipo_cliente
        FROM tb_cliente
        WHERE cpf_cliente = %s
        """,
        (cpf,)
    )

    return cursor.fetchone()


def criar_cliente(
    cursor,
    nome,
    cpf,
    email,
    telefone,
    genero,
    data_nascimento
):
    cursor.execute(
        """
        INSERT INTO tb_cliente
        (
            nome_cliente,
            cpf_cliente,
            email_cliente,
            telefone_cliente,
            genero_cliente,
            data_nascimento,
            tipo_cliente
        )
        VALUES
        (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        """,
        (
            nome,
            cpf,
            email,
            telefone,
            genero,
            data_nascimento,
            TIPO_CLIENTE_NOVO
        )
    )

    return cursor.lastrowid


def criar_solicitacao(
    cursor,
    id_cliente,
    id_cartao,
    status
):
    cursor.execute(
        """
        INSERT INTO tb_solicitacao
        (
            status,
            id_cliente,
            id_cartao
        )
        VALUES
        (
            %s,
            %s,
            %s
        )
        """,
        (
            status,
            id_cliente,
            id_cartao
        )
    )

    return cursor.lastrowid


def aplicar_regras(tipo_cliente, tipo_cartao):
    if (
        tipo_cliente == "COLABORADOR"
        and tipo_cartao == "LOJA"
    ):
        return (
            "NEGADO",
            "Colaboradores não podem solicitar cartões de loja."
        )

    return (
        "EM ANALISE",
        "Solicitação encaminhada para análise."
    )


def validar_dados(dados):
    erros = {}

    nome = (
        dados.get("nome") or ""
    ).strip()

    cpf = apenas_numeros(
        dados.get("cpf")
    )

    data_nascimento_form = (
        dados.get("data_nascimento")
        or ""
    )

    telefone = apenas_numeros(
        dados.get("telefone")
    )

    email = (
        dados.get("email") or ""
    ).strip()

    genero = (
        dados.get("genero") or ""
    ).strip().upper()

    id_cartao_str = (
        dados.get("id_cartao") or ""
    )

    if len(nome) < 3 or len(nome) > 50:
        erros["nome"] = (
            "Informe o nome completo "
            "(máximo 50 caracteres)."
        )

    if not cpf_valido(cpf):
        erros["cpf"] = (
            "Informe um CPF válido."
        )

    data_nascimento = data_valida(
        data_nascimento_form
    )

    if not data_nascimento:
        erros["data_nascimento"] = (
            "Data inválida. Use DD/MM/AAAA."
        )

    elif idade_em_anos(data_nascimento) < 18:
        erros["data_nascimento"] = (
            "É necessário ter pelo menos "
            "18 anos completos."
        )

    if len(telefone) not in (10, 11):
        erros["telefone"] = (
            "Informe um telefone válido "
            "com DDD."
        )

    if (
        not email_valido(email)
        or len(email) > 100
    ):
        erros["email"] = (
            "Informe um email válido."
        )

    if genero not in GENEROS_VALIDOS:
        erros["genero"] = (
            "Selecione um gênero válido."
        )

    try:
        id_cartao = int(id_cartao_str)

    except (ValueError, TypeError):
        id_cartao = None

        erros["id_cartao"] = (
            "Cartão inválido."
        )

    return {
        "erros": erros,
        "nome": nome,
        "cpf": cpf,
        "data_nascimento": data_nascimento,
        "telefone": telefone,
        "email": email,
        "genero": genero,
        "id_cartao": id_cartao
    }


def validar_documento(documento):
    if (
        not documento
        or not documento.filename
    ):
        return (
            False,
            "RG ou CNH é obrigatório."
        )

    extensao = os.path.splitext(
        documento.filename
    )[1].lower()

    if extensao not in EXTENSOES_PERMITIDAS:
        return (
            False,
            "Use PDF, JPG, JPEG ou PNG."
        )

    return True, None


def processar_solicitacao(
    dados,
    documento
):
    validacao = validar_dados(dados)

    erros = validacao["erros"]

    documento_valido, erro_documento = (
        validar_documento(documento)
    )

    if not documento_valido:
        erros["documento"] = erro_documento

    if erros:
        return {
            "status_code": 400,
            "resposta": {
                "mensagem": "Corrija os campos indicados.",
                "erros": erros
            }
        }

    nome = validacao["nome"]
    cpf = validacao["cpf"]
    data_nascimento = validacao["data_nascimento"]
    telefone = validacao["telefone"]
    email = validacao["email"]
    genero = validacao["genero"]
    id_cartao = validacao["id_cartao"]

    conexao = None
    cursor = None

    try:
        conexao = get_connection()
        cursor = conexao.cursor()

        cartao = buscar_cartao(
            cursor,
            id_cartao
        )

        if not cartao:
            return {
                "status_code": 400,
                "resposta": {
                    "mensagem": "O cartão selecionado não existe no banco.",
                    "erros": {
                        "id_cartao": "Cartão inválido."
                    }
                }
            }

        cliente = buscar_cliente_por_cpf(
            cursor,
            cpf
        )

        if cliente:
            id_cliente = cliente["id_cliente"]
            tipo_cliente = cliente["tipo_cliente"]

        else:
            tipo_cliente = TIPO_CLIENTE_NOVO

            id_cliente = criar_cliente(
                cursor,
                nome,
                cpf,
                email,
                telefone,
                genero,
                data_nascimento
            )

        status, motivo = aplicar_regras(
            tipo_cliente,
            cartao["tipo_cartao"]
        )

        id_solicitacao = criar_solicitacao(
            cursor,
            id_cliente,
            id_cartao,
            status
        )

        conexao.commit()

        if status == "NEGADO":
            mensagem = "Solicitação não aprovada."
        else:
            mensagem = (
                "Solicitação registrada "
                "e encaminhada para análise."
            )

        return {
            "status_code": 201,
            "resposta": {
                "mensagem": mensagem,
                "status": status,
                "motivo": motivo,
                "id_solicitacao": id_solicitacao,
                "id_cliente": id_cliente,
                "id_cartao": id_cartao
            }
        }

    except Exception as erro:
        if conexao:
            conexao.rollback()

        print(
            "Erro ao processar solicitação:",
            erro
        )

        return {
            "status_code": 500,
            "resposta": {
                "mensagem": (
                    "Erro interno ao processar "
                    "a solicitação."
                )
            }
        }

    finally:
        if cursor:
            cursor.close()

        if conexao:
            conexao.close()