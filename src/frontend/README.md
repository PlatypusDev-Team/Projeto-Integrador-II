# DM — Busca de shoppings por CEP

## Arquitetura

```
[ HTML/CSS/TS (frontend) ]  --fetch GET-->  [ Flask (backend) ]
                                                  |-- ViaCEP (CEP -> endereço)
                                                  |-- Nominatim (endereço -> lat/lon)
                                                  '-- Haversine vs. shoppings do OpenStreetMap
```

1. O usuário digita o CEP no input estilizado da landing page.
2. O `script.ts` valida o formato, mostra o estado de "buscando..." e chama
   `GET http://localhost:5000/api/shoppings/<cep>`.
3. O Flask consulta o **ViaCEP** para obter o endereço do CEP, depois o
   **Nominatim** para transformar esse endereço em latitude/longitude.
4. A distância até cada shopping da lista mockada é calculada com a
   fórmula de **Haversine** e a lista é ordenada por proximidade.
5. O backend responde em JSON; o TS renderiza os 5 shoppings mais próximos
   em cards, coloridos conforme a paleta DM (verde = mais próximo, depois
   ciano, amarelo, salmão, azul).
6. Erros (CEP inválido, CEP inexistente, falha de rede) aparecem como
   mensagem de feedback, sem quebrar a página.

## Rodando o backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
# API disponível em http://localhost:5000
```

## Rodando o frontend

```bash
cd frontend
   npx tsc   # gera script.js e status.js
# depois é só abrir index.html no navegador (ou servir com um live-server)
```

## Tela de status

A tela da US03 está em `status.html` e consulta a API Flask, que busca a
solicitação no MySQL. O identificador deve ser enviado pelo fluxo da aplicação:

- `status.html?solicitacao=1` — Ana Silva, em análise
- `status.html?solicitacao=2` — Bruno Santos, aprovado
- `status.html?solicitacao=3` — Carla Oliveira, rejeitada

Sem o parâmetro `solicitacao`, a tela não escolhe um cliente automaticamente.
Os IDs acima correspondem aos registros existentes no banco inicializado pelo
Docker, não a dados cadastrados no código Python.

## Bibliotecas usadas

- **Backend**: `flask`, `flask-cors`, `requests`
- **Frontend**: nenhuma dependência externa — `fetch` nativo do navegador
  e `typescript` apenas como ferramenta de build (não vai para o bundle
  final)

## Próximos passos sugeridos

- Integrar autenticação para enviar automaticamente o ID da solicitação
- Adicionar cache para não bater no Nominatim a cada busca do mesmo CEP
- Definir `API_BASE_URL` via variável de ambiente no build do frontend
