
import bcrypt

from db import get_connection


def autenticar_atendente(email: str, senha: str):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id_atendente,
                    nome_atendente,
                    email_atendente,
                    senha_hash_atendente,
                    id_cliente
                FROM tb_atendente
                WHERE email_atendente = %s
                """,
                (email,)
            )

            atendente = cursor.fetchone()

        if not atendente:
            return None

        senha_hash = atendente["senha_hash_atendente"]

        if isinstance(senha_hash, str):
            senha_hash = senha_hash.encode("utf-8")

        try:
            senha_valida = bcrypt.checkpw(
                senha.encode("utf-8"),
                senha_hash
            )
        except (ValueError, TypeError):
            return None

        if not senha_valida:
            return None

        # Nunca devolver o hash da senha para o front-end.
        return {
            "id_atendente": atendente["id_atendente"],
            "nome_atendente": atendente["nome_atendente"],
            "email_atendente": atendente["email_atendente"],
            "id_cliente": atendente["id_cliente"]
        }

    finally:
        conexao.close()
