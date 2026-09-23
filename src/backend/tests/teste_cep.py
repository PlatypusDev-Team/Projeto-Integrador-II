from cep import buscar_uf_por_cep
from db import buscar_lojas_por_uf


cep = "30110-000"

uf = buscar_uf_por_cep(cep)

print("CEP:", cep)
print("UF:", uf)

lojas = buscar_lojas_por_uf(uf)

print("\nLojas encontradas:")

for loja in lojas:
    print(loja)