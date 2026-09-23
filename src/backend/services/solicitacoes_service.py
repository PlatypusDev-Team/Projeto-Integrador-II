from db import get_connection


STATUS_PRE_QUALIFICACAO = "CONCLUIDA"


def buscar_solicitacao(id_solicitacao: int):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    s.id_solicitacao AS id,
                    c.nome_cliente AS nome,
                    c.cpf_cliente AS cpf_completo,
                    ca.nome_cartao AS cartao,
                    s.status AS status
                FROM tb_solicitacao AS s
                INNER JOIN tb_cliente AS c
                    ON c.id_cliente = s.id_cliente
                INNER JOIN tb_cartao AS ca
                    ON ca.id_cartao = s.id_cartao
                WHERE s.id_solicitacao = %s
                """,
                (id_solicitacao,),
            )

            registro = cursor.fetchone()

    finally:
        conexao.close()

    if registro is None:
        return None

    registro["cpf"] = mascarar_cpf(
        registro.pop("cpf_completo")
    )

    registro["pre_qualificacao"] = STATUS_PRE_QUALIFICACAO

    return registro


def mascarar_cpf(cpf: str) -> str:
    digitos = "".join(
        caractere for caractere in cpf
        if caractere.isdigit()
    )

    if len(digitos) != 11:
        return "***.***.***-**"

    return f"***.***.{digitos[6:9]}-{digitos[9:]}"