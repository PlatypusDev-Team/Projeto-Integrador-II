const cardsCartoes = document.querySelector("#cardsCartoes");

const cartoesSalvos =
    localStorage.getItem("cartoesDisponiveis");

if (!cartoesSalvos) {

    cardsCartoes.innerHTML = `
        <p>Nenhum cartão disponível para seleção.</p>
    `;

} else {

    const cartoes =
        JSON.parse(cartoesSalvos);

    console.log(
        "Cartões recebidos:",
        cartoes
    );

    mostrarCartoes(cartoes);
}

function mostrarCartoes(cartoes) {

    cardsCartoes.innerHTML = "";

    cartoes.forEach(cartao => {

        const card =
            document.createElement("div");

        card.classList.add("card-cartao");

        let modalidade = "";

        if (cartao.modalidade === "FISICO") {

            modalidade = "CARTÃO FÍSICO";

        } else if (
            cartao.modalidade === "DIGITAL"
        ) {

            modalidade = "CARTÃO DIGITAL";

        } else {

            modalidade = cartao.modalidade;
        }

        card.innerHTML = `

            <h2>?</h2>

            <h1>
                ${modalidade}
            </h1>

            <img
                src="/src/img/cartao_loja_mockup_DM (1).png"
                alt="Mockup cartão loja"
            >

            <button
                class="botao-selecionar-cartao"
                data-cartao="${cartao.id_cartao}"
            >
                SELECIONAR
            </button>

        `;


        cardsCartoes.appendChild(card);
    });


    adicionarEventosSelecao();
}

function adicionarEventosSelecao() {

    const botoes =
        document.querySelectorAll(
            ".botao-selecionar-cartao"
        );


    botoes.forEach(botao => {

        botao.addEventListener(
            "click",
            async () => {

                const idCartao =
                    botao.dataset.cartao;


                console.log(
                    "Cartão selecionado:",
                    idCartao
                );

                localStorage.setItem(
                    "idCartao",
                    idCartao
                );

                window.location.href =
                    "cadastro.html";
            }
        );
    });
}