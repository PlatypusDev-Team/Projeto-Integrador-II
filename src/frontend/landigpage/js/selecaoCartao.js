"use strict";

const cardsCartoes = document.querySelector("#cardsCartoes");

function carregarCartoes() {
    if (!cardsCartoes) {
        console.error("Elemento #cardsCartoes não encontrado.");
        return;
    }

    const cartoesSalvos = sessionStorage.getItem("cartoesDisponiveis");

    if (!cartoesSalvos) {
        exibirMensagem("Nenhum cartão disponível para seleção.");
        return;
    }

    try {
        const cartoes = JSON.parse(cartoesSalvos);

        if (!Array.isArray(cartoes) || cartoes.length === 0) {
            exibirMensagem("Nenhum cartão disponível para seleção.");
            return;
        }

        mostrarCartoes(cartoes);
    } catch (erro) {
        console.error("Erro ao carregar os cartões:", erro);
        exibirMensagem("Não foi possível carregar os cartões disponíveis.");
    }
}

function exibirMensagem(mensagem) {
    if (cardsCartoes) {
        cardsCartoes.innerHTML = `<p>${mensagem}</p>`;
    }
}

function mostrarAvisoCartao(mensagem) {
    let aviso = document.querySelector("#avisoCartao");

    if (!aviso) {
        aviso = document.createElement("p");
        aviso.id = "avisoCartao";
        aviso.setAttribute("role", "alert");
        aviso.style.cssText = [
            "margin: 12px 0",
            "padding: 10px 14px",
            "border-radius: 8px",
            "border: 1px solid #e0a3a3",
            "background: #fdecec",
            "color: #8a1f1f",
            "font-weight: 600",
            "line-height: 1.4",
        ].join(";");

        cardsCartoes.before(aviso);
    }

    aviso.textContent = mensagem;
}

function continuarAposSelecao() {
    window.location.href = "cadastro.html";
}

function mostrarCartoes(cartoes) {
    cardsCartoes.innerHTML = "";

    cartoes.forEach((cartao) => {
        const card = document.createElement("div");
        card.classList.add("card-cartao");

        let modalidade = cartao.modalidade || "CARTÃO";

        if (modalidade === "FISICO") {
            modalidade = "CARTÃO FÍSICO";
        } else if (modalidade === "DIGITAL") {
            modalidade = "CARTÃO DIGITAL";
        }

        const titulo = document.createElement("h2");

        titulo.textContent = "?"

        const subtitulo = document.createElement("h1");
        subtitulo.textContent = modalidade;

        const imagem = document.createElement("img");
        imagem.src = "img/cartao_loja_mockup_DM (1).png";
        imagem.alt = "Mockup do cartão";

        const botao = document.createElement("button");
        botao.type = "button";
        botao.classList.add("botao-selecionar-cartao");
        botao.textContent = "SELECIONAR";
        botao.dataset.cartao = cartao.id_produto ?? "";

        botao.addEventListener("click", () => {
            selecionarCartao(botao);
        });

        card.append(titulo, subtitulo, imagem, botao);
        cardsCartoes.appendChild(card);
    });
}

/**
 * Guarda o cartão selecionado e segue para a solicitação.
 */
function selecionarCartao(botao) {
    const idCartao = botao.dataset.cartao;

    if (!idCartao) {
        mostrarAvisoCartao(
            "Não foi possível identificar o cartão selecionado."
        );
        return;
    }

    sessionStorage.setItem("idCartao", idCartao);

    console.log("Cartão selecionado:", idCartao);

    continuarAposSelecao();
}

carregarCartoes();