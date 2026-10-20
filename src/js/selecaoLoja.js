const filtroLojas =
    document.querySelector("#filtroLojas");

const filtrarLojas =
    document.querySelector("#filtrarLojas");

const listaLojas =
    document.querySelector("#listaLojas");

const resultadoBuscar =
    document.querySelector("#resultadoBuscar");

const cepUsuario =
    document.querySelector("#cepUsuario");

const barraBuscar =
    document.querySelector("#barraBuscar");

const buscarLoja =
    document.querySelector("#buscarLoja");

let lojasDisponiveis = [];


const ESTILO_AVISO = [
    "margin: 12px 0",
    "padding: 10px 14px",
    "border-radius: 8px",
    "border: 1px solid #e0a3a3",
    "background: #fdecec",
    "color: #8a1f1f",
    "font-weight: 600",
    "line-height: 1.4",
].join(";");


/**
 * Aviso logo abaixo da barra de busca (no lugar de alert()).
 */
function mostrarAvisoBusca(mensagem) {

    let aviso =
        document.querySelector("#avisoBusca");

    if (!aviso) {

        aviso = document.createElement("p");
        aviso.id = "avisoBusca";
        aviso.setAttribute("role", "alert");
        aviso.style.cssText = ESTILO_AVISO;

        barraBuscar.after(aviso);
    }

    aviso.textContent = mensagem;
    aviso.hidden = false;
}


function limparAvisoBusca() {

    const aviso =
        document.querySelector("#avisoBusca");

    if (aviso) {
        aviso.textContent = "";
        aviso.hidden = true;
    }
}


/**
 * Aviso dentro do card da loja clicada (no lugar de alert()).
 */
function mostrarAvisoCard(botao, mensagem) {

    const card =
        botao.closest(".resultadoLoja") ||
        botao.parentElement;

    const aviso = document.createElement("p");

    aviso.className = "aviso-card";
    aviso.setAttribute("role", "alert");
    aviso.style.cssText = ESTILO_AVISO;
    aviso.textContent = mensagem;

    card.appendChild(aviso);
}


function limparAvisosCard() {

    document
        .querySelectorAll(".aviso-card")
        .forEach((aviso) => aviso.remove());
}


/**
 * Segue para a tela de solicitação.
 *
 * Esta função NÃO existia neste arquivo (ela só estava definida em
 * selecaoCartao.js). Lojas com um único cartão chamavam uma função
 * inexistente -> ReferenceError -> alert "Não foi possível continuar".
 *
 * O cadastro.html se adapta sozinho: logado vê só "Solicitar cartão";
 * não logado vê o formulário completo.
 */
function continuarAposSelecao() {
    window.location.href = "cadastro.html";
}


barraBuscar.addEventListener(
    "submit",
    async (evento) => {

        evento.preventDefault();

        limparAvisoBusca();

        const cep =
            buscarLoja.value.trim();

        if (!cep) {
            mostrarAvisoBusca("Digite um CEP.");
            return;
        }

        cepUsuario.textContent =
            `CEP: ${cep}`;

        await carregarLojas(cep);
    }
);



async function carregarLojas(cep) {
    try {
        resultadoBuscar.hidden = false;
        filtroLojas.hidden = true;
        filtrarLojas.value = "";

        listaLojas.innerHTML = `
            <p class="mensagemLojas">
                Buscando lojas disponíveis...
            </p>
        `;

        const resposta = await fetch(
            `http://127.0.0.1:5000/api/lojas/${encodeURIComponent(cep)}`
        );

        const dados =
            await resposta.json().catch(() => ({}));

        if (!resposta.ok) {

            // Mostra o motivo que o servidor informou
            // (ex.: "CEP não encontrado") quando existir.
            resultadoBuscar.innerHTML = "";

            mostrarAvisoBusca(
                dados.erro ||
                "Não foi possível carregar as lojas."
            );

            return;
        }

        console.log("Resposta da API:", dados);

        lojasDisponiveis = dados.lojas || [];

        filtroLojas.hidden = lojasDisponiveis.length === 0;

        mostrarLojas(lojasDisponiveis);

    } catch (erro) {
        console.error(erro);

        lojasDisponiveis = [];
        filtroLojas.hidden = true;

        resultadoBuscar.hidden = false;

        listaLojas.innerHTML = `
            <p class="mensagemLojas">
                Não foi possível carregar as lojas.
            </p>
        `;
    }
}


filtrarLojas.addEventListener("input", () => {
    const termo = filtrarLojas.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const lojasFiltradas = lojasDisponiveis.filter(loja => {
        const nome = String(loja.nome_loja || "")
            .toLocaleLowerCase("pt-BR");

        const descricao = String(loja.descricao_loja || "")
            .toLocaleLowerCase("pt-BR");

        return nome.includes(termo) ||
               descricao.includes(termo);
    });

    mostrarLojas(lojasFiltradas);
});


function mostrarLojas(lojas) {
    listaLojas.innerHTML = "";

    if (lojas.length === 0) {
        const mensagem = document.createElement("p");

        mensagem.classList.add("mensagemLojas");

        mensagem.textContent = lojasDisponiveis.length === 0
            ? "Nenhuma loja disponível para este CEP."
            : "Nenhuma loja encontrada com esse nome ou descrição.";

        listaLojas.appendChild(mensagem);
        return;
    }

    lojas.forEach(loja => {
        const card = document.createElement("div");

        card.classList.add("resultadoLoja");

        let badges = "";

        if (loja.cartao_fisico) {
            badges += `
                <span class="badge-fisico">Físico</span>
            `;
        }

        if (loja.cartao_digital) {
            badges += `
                <span class="badge-digital">Digital</span>
            `;
        }

        card.innerHTML = `
            <h1>
                ${loja.nome_loja}
                ${badges}
            </h1>

            <p>
                ${
                    loja.descricao_loja ||
                    "Loja disponível para solicitação de cartão."
                }
            </p>

            <button
                type="button"
                class="botao-fazer-cartao"
                data-loja="${loja.id_loja}"
                data-filial="${loja.id_filial || ""}"
            >
                FAZER CARTÃO
            </button>
        `;

        listaLojas.appendChild(card);
    });

    adicionarEventosBotoes();
}



function adicionarEventosBotoes() {

    const botoes =
        document.querySelectorAll(
            ".botao-fazer-cartao"
        );

    console.log(
        "Quantidade de botões encontrados:",
        botoes.length
    );

    botoes.forEach(botao => {

        botao.addEventListener(
            "click",
            async () => {

                limparAvisosCard();

                const idLoja =
                    botao.dataset.loja;

                const idFilial =
                    botao.dataset.filial;

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

                    } else {

                        url =
                            `http://127.0.0.1:5000/api/lojas/${idLoja}/cartoes`;
                    }

                    const resposta =
                        await fetch(url);

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



                    if (
                        resultado.tipo ===
                        "automatico"
                    ) {

                        const idCartao =
                            resultado.cartao.id_produto;

                        console.log(
                            "Cartão escolhido:",
                            idCartao
                        );

                        localStorage.setItem(
                            "idCartao",
                            idCartao
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

                        // Descarta uma lista antiga de uma busca anterior.
                        localStorage.removeItem(
                            "cartoesDisponiveis"
                        );

                        continuarAposSelecao();

                        return;
                    }


                    // =========================
                    // MAIS DE UM CARTÃO
                    // =========================

                    if (
                        resultado.tipo ===
                        "escolha"
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

                        return;
                    }


                    // =========================
                    // NENHUM CARTÃO
                    // =========================

                    if (
                        resultado.tipo ===
                        "indisponivel"
                    ) {

                        mostrarAvisoCard(
                            botao,
                            "Nenhum cartão disponível para esta loja."
                        );
                    }

                } catch (erro) {

                    console.error(erro);

                    mostrarAvisoCard(
                        botao,
                        "Não foi possível continuar com a solicitação. Tente novamente."
                    );
                }
            }
        );
    });
}