const resultadoBuscar = document.querySelector("#resultadoBuscar");
const cepUsuario = document.querySelector("#cepUsuario");

const barraBuscar = document.querySelector("#barraBuscar");
const buscarLoja = document.querySelector("#buscarLoja");

let lojasDisponiveis = [];

barraBuscar.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const cep = buscarLoja.value.trim();

    if (!cep) {
        alert("Digite um CEP.");
        return;
    }

    cepUsuario.textContent = `CEP: ${cep}`;

    await carregarLojas(cep);
});

async function carregarLojas(cep) {

    try {

        resultadoBuscar.innerHTML = `
            <p>Buscando lojas disponíveis...</p>
        `;

        const resposta = await fetch(
            `http://127.0.0.1:5000/api/lojas/${cep}`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao buscar lojas.");
        }

        const dados = await resposta.json();

        console.log("Resposta da API:", dados);

        lojasDisponiveis = dados.lojas || [];

        mostrarLojas(lojasDisponiveis);

    } catch (erro) {

        console.error(erro);

        resultadoBuscar.innerHTML = `
            <p>Não foi possível carregar as lojas.</p>
        `;
    }
}

function mostrarLojas(lojas) {

    resultadoBuscar.innerHTML = "";

    if (lojas.length === 0) {

        resultadoBuscar.innerHTML = `
            <p>Nenhuma loja disponível para este CEP.</p>
        `;

        return;
    }

    lojas.forEach(loja => {

        const card = document.createElement("div");

        card.classList.add("resultadoLoja");

        let badges = "";


        if (loja.cartao_fisico) {

            badges += `
                <span class="badge-fisico">
                    Físico
                </span>
            `;
        }


        if (loja.cartao_digital) {

            badges += `
                <span class="badge-digital">
                    Digital
                </span>
            `;
        }

        card.innerHTML = `
            <h1>
                ${loja.nome_loja}
                ${badges}
            </h1>

            <p>
                ${loja.descricao_loja ||
                "Loja disponível para solicitação de cartão."}
            </p>

            <button
                class="botao-fazer-cartao"
                data-loja="${loja.id_loja}"
                data-filial="${loja.id_filial || ""}"
            >
                FAZER CARTÃO
            </button>
        `;

        resultadoBuscar.appendChild(card);
    });


    adicionarEventosBotoes();
}

function adicionarEventosBotoes() {

    const botoes = document.querySelectorAll(
        ".botao-fazer-cartao"
    );

    console.log(
        "Quantidade de botões encontrados:",
        botoes.length
    );


    botoes.forEach(botao => {

        botao.addEventListener("click", async () => {

            const idLoja = botao.dataset.loja;
            const idFilial = botao.dataset.filial;

            console.log(
                "Loja escolhida:",
                idLoja
            );

            console.log(
                "Filial escolhida:",
                idFilial
            );


            try {

                let url;

                if (idFilial) {

                    url =
                        `http://127.0.0.1:5000/api/filiais/${idFilial}/cartoes`;

                }

                else {

                    url =
                        `http://127.0.0.1:5000/api/lojas/${idLoja}/cartoes`;
                }


                const resposta = await fetch(url);

                if (!resposta.ok) {

                    throw new Error(
                        "Erro ao consultar cartões."
                    );
                }


                const resultado =
                    await resposta.json();


                console.log(
                    "Resposta API:",
                    resultado
                );

                if (resultado.tipo === "automatico") {

                    const idCartao =
                        resultado.cartao.id_cartao;

                    const idCliente = 1;

                    console.log(
                        "Cartão escolhido:",
                        idCartao
                    );


                    const respostaSolicitacao =
                        await fetch(
                            "http://127.0.0.1:5000/api/solicitacoes",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    id_cliente: idCliente,
                                    id_cartao: idCartao
                                })
                            }
                        );


                    const resultadoSolicitacao =
                        await respostaSolicitacao.json();


                    console.log(
                        "Resposta da solicitação:",
                        resultadoSolicitacao
                    );


                    if (!respostaSolicitacao.ok) {

                        throw new Error(
                            "Erro ao criar solicitação."
                        );
                    }

                }

                else if (
                    resultado.tipo === "escolha"
                ) {

                    console.log(
                        "Cartões disponíveis:",
                        resultado.cartoes
                    );


                    localStorage.setItem(
                        "cartoesDisponiveis",
                        JSON.stringify(
                            resultado.cartoes
                        )
                    );


                    localStorage.setItem(
                        "idLoja",
                        idLoja
                    );


                    if (idFilial) {

                        localStorage.setItem(
                            "idFilial",
                            idFilial
                        );
                    }


                    window.location.href =
                        "selecaoCartao.html";
                }

                else if (
                    resultado.tipo === "indisponivel"
                ) {

                    alert(
                        "Nenhum cartão disponível para esta loja."
                    );
                }

            } catch (erro) {

                console.error(erro);

                alert(
                    "Não foi possível continuar com a solicitação."
                );
            }
        });
    });
}