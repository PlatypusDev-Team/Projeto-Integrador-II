
import bcrypt

from db import get_connection


def autenticar_cliente(email, senha):
    conexao = get_connection()

    try:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id_cliente,
                    nome_cliente,
                    email_cliente,
                    senha_hash_cliente,
                    tipo_cliente
                FROM tb_cliente
                WHERE email_cliente = %s
                """,
                (email,)
            )

            cliente = cursor.fetchone()

        if not cliente:
            return None

        senha_hash = cliente["senha_hash_cliente"]

        if isinstance(senha_hash, str):
            senha_hash = senha_hash.encode("utf-8")

        senha_valida = bcrypt.checkpw(
            senha.encode("utf-8"),
            senha_hash
        )

        if not senha_valida:
            return None
        
        return {
            "id_cliente": cliente["id_cliente"],
            "nome_cliente": cliente["nome_cliente"],
            "email_cliente": cliente["email_cliente"],
            "tipo_cliente": cliente["tipo_cliente"]
        }

    finally:
        conexao.close()
