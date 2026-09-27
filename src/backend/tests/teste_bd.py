from backend.services.loja_service import obter_conexao

conexao = obter_conexao()

cursor = conexao.cursor()

cursor.execute("SELECT * FROM tb_loja")

lojas = cursor.fetchall()

for loja in lojas:
    print(loja)

cursor.close()
conexao.close()