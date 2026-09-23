import os
import mysql.connector

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("MYSQL_PORT", 3306)),
    "database": os.environ.get("MYSQL_DATABASE", "projeto_dm"),
    "user": os.environ.get("MYSQL_USER"),
    "password": os.environ.get("MYSQL_PASSWORD"),
}

def obter_conexao():
    """
    Obtém uma conexão com o banco de dados MySQL.
    """
    return mysql.connector.connect(**DB_CONFIG)

def salvar_busca_cep(cep: str, cidade: str, uf: str, lat: float, lon: float) -> None:
    """
    Registra uma busca de CEP na tabela tb_busca_cep.
    """
    conexao = obter_conexao()
    try:
        cursor = conexao.cursor()
        cursor.execute(
            """
            INSERT INTO tb_busca_cep (cep, cidade, uf, lat, lon)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (cep, cidade, uf, lat, lon)
        )
        conexao.commit()
    finally:
        conexao.close()