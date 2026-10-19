
from flask import Blueprint, jsonify, session
from db import get_connection

conta_bp = Blueprint("conta", __name__, url_prefix="/api")


def mascarar_cpf(cpf):
    digitos = "".join(c for c in cpf if c.isdigit())

    if len(digitos) != 11:
        return "***.***.***-**"

    return f"***.***.{digitos[6:9]}-{digitos[9:]}"


@conta_bp.get("/conta")
def consultar_conta():
    id_cliente = session.get("id_cliente")

    if not id_cliente:
        return jsonify({"erro": "É necessário entrar na sua conta."}), 401

    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT id_cliente, nome_cliente, cpf_cliente
                FROM tb_cliente
                WHERE id_cliente = %s
                """,
                (id_cliente,),
            )
            cliente = cursor.fetchone()

            if not cliente:
                session.clear()
                return jsonify({"erro": "Conta não encontrada."}), 404

            cursor.execute(
                """
                SELECT
                    s.id_solicitacao AS id,
                    s.status,
                    ca.nome_cartao AS cartao
                FROM tb_solicitacao AS s
                INNER JOIN tb_cartao AS ca
                    ON ca.id_produto = s.id_produto
                WHERE s.id_cliente = %s
                ORDER BY s.id_solicitacao DESC
                LIMIT 1
                """,
                (id_cliente,),
            )
            solicitacao = cursor.fetchone()

        cliente["cpf"] = mascarar_cpf(cliente.pop("cpf_cliente"))

        if solicitacao:
            solicitacao["pre_qualificacao"] = "CONCLUIDA"

        return jsonify({
            "cliente": cliente,
            "solicitacao": solicitacao,
        }), 200

    finally:
        conexao.close()
