const botoes = document.querySelectorAll (".botao-fazer-cartao");

console.log("Quantidade de botões encontrados:", botoes.length);

botoes.forEach(botao => {
    botao.addEventListener ("click", async () => {

        const idFilial = botao.dataset.filial;

        console.log ("Filial escolhida: ", idFilial);

        const resposta = await fetch (`http://127.0.0.1:5000/api/filiais/${idFilial}/cartoes`);
        
        const resultado = await resposta.json();

        console.log ("Resposta API: ", resultado)

        if (resultado.tipo == "automatico") {

            const idCartao = resultado.cartao.id_cartao;
            const idCliente = 1;

            console.log ("Cartão: ", idCartao);

            const respostaSolicitacao = await fetch (
                "http://127.0.0.1:5000/api/solicitacoes",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id_cliente: idCliente,
                        id_cartao: idCartao
                    })

                }
            )
            const resultadoSolicitacao = await respostaSolicitacao.json();
            console.log ("Reposta da solicitação: ", resultadoSolicitacao);
        }

        else if (resultado.tipo == "escolha") {
            console.log ("Cartões: ", resultado.cartoes)

            localStorage.setItem (
                "cartoesDisponiveis",
                JSON.stringify(resultado.cartoes)
            )

            window.location.href = "selecaoCartao.html"


        }

        else if (resultado.tipo == "indisponivel") {
            console.log ("Nenhum cartão disponivel")
        }
    }
    )
}
)
