
import getpass
import requests

BASE_URL = "http://127.0.0.1:5000/api/atendente"

email = input("E-mail do atendente: ").strip()
senha = getpass.getpass("Senha: ")

sessao = requests.Session()

# 1. Login
resposta = sessao.post(
    f"{BASE_URL}/login",
    json={"email": email, "senha": senha},
)

print("\nLOGIN:", resposta.status_code, resposta.json())
resposta.raise_for_status()

# 2. Listar solicitações disponíveis
resposta = sessao.get(f"{BASE_URL}/solicitacoes/pendentes")
print("\nPENDENTES:", resposta.status_code, resposta.json())
resposta.raise_for_status()

solicitacoes = resposta.json()["solicitacoes"]

if not solicitacoes:
    print("\nNão existem solicitações disponíveis para testar.")
    raise SystemExit(0)

id_solicitacao = solicitacoes[0]["id_solicitacao"]
print(f"\nSolicitação escolhida para teste: {id_solicitacao}")

# 3. Consultar detalhes
resposta = sessao.get(
    f"{BASE_URL}/solicitacoes/{id_solicitacao}"
)
print("\nDETALHES:", resposta.status_code, resposta.json())
resposta.raise_for_status()

# 4. Assumir
resposta = sessao.post(
    f"{BASE_URL}/solicitacoes/{id_solicitacao}/assumir"
)
print("\nASSUMIR:", resposta.status_code, resposta.json())

if resposta.status_code != 200:
    raise SystemExit("Não foi possível assumir a solicitação.")

# 5. Consultar meus atendimentos
resposta = sessao.get(f"{BASE_URL}/meus-atendimentos")
print("\nMEUS ATENDIMENTOS:", resposta.status_code, resposta.json())
resposta.raise_for_status()

print(
    "\nTeste concluído. A solicitação foi assumida, "
    "mas ainda não foi aceita nem recusada."
)


# Testa a decisão da solicitação assumida.
# Execute apenas uma das decisões, pois ela encerra a análise.

decisao = input(
    "\nDigite ACEITAR ou RECUSAR para concluir a solicitação: "
).strip().upper()

if decisao not in {"ACEITAR", "RECUSAR"}:
    print("Decisão inválida. Nenhuma alteração foi realizada.")
    raise SystemExit(1)

observacao = input("Observação do atendimento: ").strip()

resposta = sessao.post(
    f"{BASE_URL}/solicitacoes/{id_solicitacao}/decisao",
    json={
        "decisao": decisao,
        "observacao": observacao
    }
)

print("\nDECISÃO:", resposta.status_code, resposta.json())

if resposta.status_code == 200:
    resposta = sessao.get(
        f"{BASE_URL}/solicitacoes/{id_solicitacao}"
    )
    print("\nDETALHES APÓS DECISÃO:", resposta.status_code, resposta.json())

    resposta = sessao.get(f"{BASE_URL}/meus-atendimentos")
    print("\nMEUS ATENDIMENTOS APÓS DECISÃO:", resposta.status_code, resposta.json())

