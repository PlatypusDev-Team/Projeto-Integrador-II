console.log ("funcionando");

const cartoes = JSON.parse (
    localStorage.getItem("cartoesDisponiveis")
)

console.log ("Cartoes: ", cartoes)

const botoes = document.querySelectorAll (".botao-selecionar-cartao");

console.log ("botoes:", botoes.length);

botoes.forEach ((botao, indice) => {
    botao.addEventListener ("click", async () => {
        const cartao = cartoes[indice];

        console.log ("cartao escolhido: ", cartao);

        const idCartao = cartao.id_cartao;
        const idCliente = 1;

        const resposta = await fetch ("http://127.0.0.1:5000/api/solicitacoes",
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

        const resultado = await resposta.json();
        console.log ("Reposta solicitacao: ", resultado)
    })
})