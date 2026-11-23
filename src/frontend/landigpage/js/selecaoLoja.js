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

const filtrarModalidade =
    document.querySelector("#filtrarModalidade");

const filtrarCategoria =
    document.querySelector("#filtrarCategoria");

const btnFiltros =
    document.querySelector("#btnFiltros");

const painelFiltros =
    document.querySelector("#painelFiltros");

const iconeFiltro =
    document.querySelector("#iconeFiltro");

const btnLimparFiltros =
    document.querySelector("#btnLimparFiltros");

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

        // Limpa os filtros de uma pesquisa anterior
        filtrarLojas.value = "";
        filtrarModalidade.value = "TODAS";

        // Carrega as categorias encontradas
        carregarCategorias();

        filtrarCategoria.value = "TODAS";

        // Exibe os filtros quando houver lojas
        filtroLojas.hidden = lojasDisponiveis.length === 0;

        // Exibe todas as lojas inicialmente
        mostrarLojas(lojasDisponiveis);

        painelFiltros.hidden = true;

        btnFiltros.setAttribute(
            "aria-expanded",
            "false"
        );

        iconeFiltro.textContent = "▼";

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


filtrarLojas.addEventListener(
    "input",
    aplicarFiltros
);

filtrarModalidade.addEventListener(
    "change",
    aplicarFiltros
);

filtrarCategoria.addEventListener(
    "change",
    aplicarFiltros
);


function mostrarLojas(lojas) {

    lojas.forEach(loja => {
    console.log("Dados da loja:", {
        nome: loja.nome_loja,
        fisico: loja.cartao_fisico,
        digital: loja.cartao_digital
    });
    });

    listaLojas.innerHTML = "";

    if (lojas.length === 0) {
        const mensagem = document.createElement("p");

        mensagem.classList.add("mensagemLojas");

        mensagem.textContent = lojasDisponiveis.length === 0
            ? "Nenhuma loja disponível para este CEP."
            : "Nenhuma loja encontrada com os filtros selecionados.";

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

        const categoriasHTML = (loja.categorias || [])
            .map(categoria => `
                <span class="tag-categoria">
                    ${categoria}
                </span>
            `)
            .join("");

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

            <div class="categorias-loja">
                ${categoriasHTML}
            </div>

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

                        sessionStorage.setItem(
                            "idCartao",
                            idCartao
                        );

                        sessionStorage.setItem(
                            "idLoja",
                            idLoja
                        );

                        if (idFilial) {

                            sessionStorage.setItem(
                                "idFilial",
                                idFilial
                            );
                        }

                        // Descarta uma lista antiga de uma busca anterior.
                        sessionStorage.removeItem(
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

                        sessionStorage.setItem(
                            "cartoesDisponiveis",
                            JSON.stringify(
                                resultado.cartoes
                            )
                        );

                        sessionStorage.setItem(
                            "idLoja",
                            idLoja
                        );

                        if (idFilial) {

                            sessionStorage.setItem(
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


function carregarCategorias() {

    const categorias = [
        ...new Set(
            lojasDisponiveis.flatMap(loja =>
                loja.categorias || []
            )
        )
    ];

    categorias.sort((a, b) =>
        a.localeCompare(b, "pt-BR")
    );

    filtrarCategoria.innerHTML = `
        <option value="TODAS">Todas</option>
    `;

    categorias.forEach(categoria => {

        const opcao = document.createElement("option");

        opcao.value = categoria;
        opcao.textContent = categoria;

        filtrarCategoria.appendChild(opcao);
    });
}


function aplicarFiltros() {

    const termo = filtrarLojas.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const modalidade = filtrarModalidade.value;

    const categoria = filtrarCategoria.value;

    const lojasFiltradas = lojasDisponiveis.filter(loja => {

        // Pesquisa por nome ou descrição
        const nome = String(loja.nome_loja || "")
            .toLocaleLowerCase("pt-BR");

        const descricao = String(loja.descricao_loja || "")
            .toLocaleLowerCase("pt-BR");

        const correspondeTexto =
            nome.includes(termo) ||
            descricao.includes(termo);

        // Filtro de modalidade
        const possuiFisico =
            Number(loja.cartao_fisico) === 1;

        const possuiDigital =
            Number(loja.cartao_digital) === 1;

        let correspondeModalidade = true;

        if (modalidade === "FISICO") {
            correspondeModalidade = possuiFisico;
        }

        else if (modalidade === "DIGITAL") {
            correspondeModalidade = possuiDigital;
        }

        else if (modalidade === "AMBOS") {
            correspondeModalidade =
                possuiFisico && possuiDigital;
        }

        // Filtro de categoria
        const categoriasLoja = loja.categorias || [];

        const correspondeCategoria =
            categoria === "TODAS" ||
            categoriasLoja.includes(categoria);

        return correspondeTexto &&
               correspondeModalidade &&
               correspondeCategoria;
    });

    mostrarLojas(lojasFiltradas);
}

btnFiltros.addEventListener("click", () => {

    const aberto = !painelFiltros.hidden;

    painelFiltros.hidden = aberto;

    btnFiltros.setAttribute(
        "aria-expanded",
        String(!aberto)
    );

    iconeFiltro.textContent =
        aberto ? "▼" : "▲";

});

btnLimparFiltros.addEventListener("click", () => {

    filtrarModalidade.value = "TODAS";
    filtrarCategoria.value = "TODAS";
    filtrarLojas.value = "";

    aplicarFiltros();

});