"use strict";

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const API_BASE = "http://127.0.0.1:5000";

const INTERVALO_MENSAGENS_MS = 3000;   // busca mensagens a cada 3 s
const STATUS_A_CADA_N_CICLOS = 5;      // e o status a cada 5 ciclos (15 s)
const LIMITE_MENSAGEM = 2000;

const contentByStatus = {
    analise: {
        resultMessage: "AGUARDANDO",
        resultDetail: "Assim que a análise for concluída, seu resultado aparecerá aqui.",
    },

    aprovada: {
        resultMessage: "APROVADO",
        resultDetail: "Seu cartão DM foi aprovado. Confira os próximos passos para continuar.",
        noticeTitle: "Parabéns, {nome}! Seu cartão DM VISA foi aprovado!",
        noticeMessage: "Sua solicitação foi concluída com sucesso. Agora você faz parte da DM! Prepare-se para aproveitar todos os benefícios do seu novo cartão.",
    },

    rejeitada: {
        resultMessage: "REJEITADA",
        resultDetail: "No momento, não foi possível aprovar sua solicitação. Consulte os detalhes para saber mais.",
        noticeTitle: "Análise de Crédito",
        noticeMessage: "Infelizmente, nossa análise não permitiu a aprovação do seu crédito neste momento. Deixe seus dados atualizados para futuras oportunidades.",
    },
};


// =====================================================
// ELEMENTOS DO DOM
// =====================================================

const $ = (seletor) => document.querySelector(seletor);

const page = $(".status-page");

const prequalificationCard = $("#prequalification-card");
const prequalificationIcon = $("#prequalification-icon");
const prequalificationTitle = $("#prequalification-title");
const prequalificationMessage = $("#prequalification-message");
const prequalificationDescription = $("#prequalification-description");

const prequalificationStep = $("#prequalification-step");
const creditStep = $("#credit-step");
const resultStep = $("#result-step");

const progressSegmentOne = $("#progress-segment-one");
const progressSegmentTwo = $("#progress-segment-two");

const creditCard = $("#credit-card");
const creditIcon = $("#credit-icon");
const creditDescription = $("#credit-description");
const creditNote = $("#credit-note");

const resultCard = $("#result-card");
const resultIcon = $("#result-icon");
const resultMessage = $("#result-message");
const resultDetail = $("#result-detail");

const notice = $("#notice");
const noticeIcon = $("#notice-icon");
const noticeTitle = $("#notice-title");
const noticeMessage = $("#notice-message");
const noticeChatButton = $("#notice-chat");
const noticeCardsLink = $("#notice-cards");

const userName = $("#user-name");
const userCpf = $("#user-cpf");
const requestType = $("#request-type");
const userAvatar = $("#user-avatar");

const pedido = $("#pedido");
const orderSubtitle = $("#order-subtitle");
const refreshStatusButton = $("#refresh-status");
const notFoundState = $("#not-found-state");
const statusAlert = $("#aviso-solicitacao");

const openChatButton = $("#open-chat");

const outrosProdutos = $("#outros-produtos");
const produtos = $("#produtos");
const produtosControls = $("#produtos-controls");
const produtosPrev = $("#produtos-prev");
const produtosNext = $("#produtos-next");


// =====================================================
// VARIÁVEIS DE CONTROLE
// =====================================================

let activeRequestId = null;
let ultimaAssinaturaStatus = "";
let sincronizando = false;

let polling = null;
let ciclosDePolling = 0;

let produtosCarregados = false;


// =====================================================
// UTILITÁRIOS
// =====================================================

function escapeHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (caractere) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function mapStatus(status) {
    if (status === "ACEITO") return "aprovada";
    if (status === "NEGADO") return "rejeitada";

    return "analise";
}

function primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0] || "cliente";
}

// Ícones SVG usados no banner de situação.
const ICONE_AMPULHETA = `
    <svg class="hourglass-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m17.029,12c2.033-1.972,3.971-4.837,3.971-8.591,0-1.88-1.529-3.409-3.409-3.409H6.409c-1.88,0-3.409,1.53-3.409,3.41,0,3.754,1.945,6.619,3.986,8.591-2.041,1.971-3.986,4.835-3.986,8.59v3.409h18v-3.409c0-3.753-1.938-6.619-3.971-8.591Zm.971,9H6v-.409c0-3.385,2.281-5.9,4.195-7.414l1.487-1.176-1.487-1.176c-1.914-1.514-4.195-4.03-4.195-7.415,0-.226.184-.409.409-.409h11.182c.226,0,.409.183.409.409,0,3.385-2.271,5.901-4.177,7.417l-1.476,1.174,1.476,1.174c1.905,1.516,4.177,4.032,4.177,7.417v.409Zm-5.422-11.739l-.566.45-.576-.456c-1.229-.973-2.644-2.427-3.197-4.255h7.524c-.55,1.831-1.96,3.287-3.184,4.261Z" />
    </svg>
`;

function iconeSVG(caminhos, espessura = 2.4) {
    return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${espessura}"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            ${caminhos}
        </svg>
    `;
}

const ICONES_BANNER = {
    analise: ICONE_AMPULHETA,
    loading: ICONE_AMPULHETA,
    aprovada: iconeSVG('<path d="M20 6 9 17l-5-5"/>', 3),
    rejeitada: iconeSVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 3),
    error: iconeSVG('<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>', 2.4)
};

function definirBanner(tom, titulo, mensagem) {
    notice.dataset.tone = tom;
    noticeIcon.innerHTML = ICONES_BANNER[tom] || ICONE_AMPULHETA;
    noticeTitle.textContent = titulo;
    noticeMessage.textContent = mensagem;
}

function mostrarAlerta(mensagem, tipo = "aviso") {
    if (!statusAlert) return;

    statusAlert.textContent = mensagem;
    statusAlert.dataset.tipo = tipo;
    statusAlert.hidden = !mensagem;
}

// Avisos vindos do cadastro (cadastro.js grava no sessionStorage).
function mostrarAvisoSolicitacao() {
    const mensagem = sessionStorage.getItem("avisoSolicitacao");

    if (!mensagem) return;

    sessionStorage.removeItem("avisoSolicitacao");
    mostrarAlerta(mensagem, "aviso");
}


// =====================================================
// ÍCONES DOS CARDS E DA LINHA DO TEMPO
// =====================================================

function setClockIcon(element) {
    element.innerHTML = `<span class="clock-icon" aria-hidden="true"></span>`;
}

function setPendingDots(element) {
    element.innerHTML = `
        <span class="status-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    `;
}

function setCompletedIcon(element) {
    element.className = "status-card__icon prequalification-icon";
    element.textContent = "✓";
}

function updateTimeline(currentStep, resultStatus) {
    const steps = [prequalificationStep, creditStep, resultStep];

    steps.forEach((step, index) => {
        if (!step) return;

        step.classList.toggle("step--current", index === currentStep);
        step.classList.toggle("step--done", index < currentStep);

        const icon = step.querySelector(".step__icon");

        if (!icon) return;

        if (index === currentStep) {
            if (index === 2 && resultStatus === "rejeitada") {
                step.classList.add("step--rejected");
                step.classList.remove("step--approved");
                icon.innerHTML = `<span class="timeline-x" aria-hidden="true"></span>`;

            } else if (index === 2 && resultStatus === "aprovada") {
                step.classList.add("step--approved");
                step.classList.remove("step--rejected");
                icon.textContent = "✓";

            } else {
                step.classList.remove("step--approved", "step--rejected");
                icon.innerHTML = `<span class="clock-icon" aria-hidden="true"></span>`;
            }

        } else if (index < currentStep) {
            step.classList.remove("step--approved", "step--rejected");
            icon.textContent = "✓";

        } else {
            step.classList.remove("step--approved", "step--rejected");
            icon.textContent = "•";
        }
    });

    progressSegmentOne?.classList.toggle("is-complete", currentStep >= 1);
    progressSegmentTwo?.classList.toggle("is-complete", currentStep >= 2);
}


// =====================================================
// RENDERIZAÇÃO DO STATUS
// =====================================================

function renderStatus(solicitacao) {
    const status = mapStatus(solicitacao.status);
    const content = contentByStatus[status];

    page.dataset.status = status;
    page.dataset.view = "request";

    notFoundState.hidden = true;
    pedido.hidden = false;
    openChatButton.hidden = false;

    // ---- perfil ----
    userName.textContent = solicitacao.nome;
    userAvatar.textContent = solicitacao.nome.trim().charAt(0).toUpperCase();
    userCpf.textContent = solicitacao.cpf;
    requestType.textContent = `Tipo de solicitação: ${solicitacao.cartao}`;

    orderSubtitle.textContent =
        `Solicitação #${solicitacao.id} · ${solicitacao.cartao}`;

    // ---- estado de cada etapa ----
    const prequalificationPending =
        solicitacao.pre_qualificacao === "EM ANALISE";

    const resultActive = status === "aprovada" || status === "rejeitada";

    const creditActive = status === "analise" && !prequalificationPending;

    updateTimeline(
        prequalificationPending ? 0 : creditActive ? 1 : 2,
        resultActive ? status : undefined
    );

    // ---- pré-qualificação ----
    prequalificationCard.classList.toggle("status-card--active", prequalificationPending);
    prequalificationCard.classList.remove("status-card--upcoming");

    if (prequalificationPending) {
        setClockIcon(prequalificationIcon);
    } else {
        prequalificationIcon.textContent = "✓";
    }

    prequalificationIcon.classList.toggle(
        "prequalification-icon--pending",
        prequalificationPending
    );

    prequalificationTitle.innerHTML = "Análise de<br />Pré-Qualificação";

    prequalificationMessage.textContent = prequalificationPending
        ? ""
        : "Etapa concluída";

    prequalificationDescription.hidden = !prequalificationPending;

    prequalificationDescription.textContent = prequalificationPending
        ? "Estamos fazendo uma verificação rápida do seu perfil e do seu registro. Esta etapa leva apenas alguns instantes."
        : "";

    // ---- análise de crédito ----
    creditCard.classList.toggle("status-card--active", creditActive);

    creditCard.classList.toggle(
        "status-card--upcoming",
        status === "analise" && !creditActive
    );

    if (status === "analise") {
        creditIcon.className = "status-card__icon credit-icon";

        creditIcon.innerHTML = `
            <svg class="question-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m23.994,21.873l-5.947-5.947c1.225-1.66,1.959-3.703,1.959-5.92C20.006,4.492,15.52.006,10.006.006S.006,4.492.006,10.006s4.486,10,10,10c2.217,0,4.26-.734,5.92-1.959l5.947,5.947,2.121-2.121Zm-13.988-4.867c-3.859,0-7-3.14-7-7s3.141-7,7-7,7,3.14,7,7-3.141,7-7,7Zm-1.006-4.006h2v2h-2v-2Zm4-5c0,1.125-.621,2.146-1.621,2.665-.227.118-.379.425-.379.765v.571h-2v-.571c0-1.1.559-2.073,1.458-2.54.335-.173.542-.514.542-.889,0-.551-.448-1-1-1s-1,.449-1,1h-2c0-1.654,1.346-3,3-3s3,1.346,3,3Z" />
            </svg>
        `;

        // Antes este texto ficava fixo em "em análise", mesmo depois do resultado.
        creditDescription.textContent = creditActive
            ? "Sua solicitação está em análise. Estamos revisando seus dados e documentos."
            : "Aguardando a conclusão da pré-qualificação.";

        creditNote.textContent = creditActive
            ? "A solicitação ainda não foi concluída. Uma especialista entrará em contato se necessário."
            : "Esta etapa começa assim que a pré-qualificação for concluída.";

    } else {
        setCompletedIcon(creditIcon);

        creditDescription.textContent = "Análise concluída.";
        creditNote.textContent = "Nossa equipe finalizou a avaliação do seu pedido.";
    }

    // ---- resultado ----
    resultCard.classList.toggle("status-card--active", resultActive);
    resultCard.classList.toggle("status-card--upcoming", !resultActive);

    if (status === "rejeitada") {
        resultIcon.className = "status-card__icon rejection-icon";
        resultIcon.textContent = "";

    } else if (status === "analise") {
        resultIcon.className = "status-card__icon result-pending-icon";
        setPendingDots(resultIcon);

    } else {
        resultIcon.className = "status-card__icon";
        resultIcon.textContent = "✓";
    }

    resultMessage.textContent = status === "analise"
        ? "Aguardando"
        : content.resultMessage;

    resultMessage.classList.toggle("result-status--pending", status === "analise");

    resultDetail.textContent = content.resultDetail;

    // ---- faixa de situação (acima do progresso) ----
    if (status === "analise") {
        definirBanner(
            "analise",
            prequalificationPending
                ? "Análise de pré-qualificação"
                : "Sua solicitação está em análise",
            prequalificationPending
                ? "Estamos conferindo suas informações básicas. Assim que concluirmos esta triagem inicial, avisaremos se o seu pedido segue para a análise de crédito detalhada."
                : "Você já possui uma solicitação em análise. Aguarde a conclusão antes de enviar uma nova solicitação de cartão. Você pode acompanhar o andamento por esta página."
        );

    } else {
        definirBanner(
            status,
            content.noticeTitle.replace("{nome}", primeiroNome(solicitacao.nome)),
            content.noticeMessage
        );
    }

    // O atalho "Falar com a equipe" só faz sentido enquanto o pedido está aberto.
    noticeChatButton.hidden = status !== "analise";

    // Já o convite para ver os cartões só aparece quando o pedido terminou.
    // (Em análise não pode haver uma nova solicitação, então fica oculto.)
    noticeCardsLink.hidden = status === "analise";

    noticeCardsLink.textContent = status === "rejeitada"
        ? "Solicitar outro cartão"
        : "Conhecer outros cartões";

    // ---- outros produtos (só quando recusado) ----
    outrosProdutos.hidden = status !== "rejeitada";

    if (status === "rejeitada") {
        carregarOutrosProdutos();
    }
}

function mostrarSemSolicitacao() {
    page.dataset.view = "empty";
    delete page.dataset.status;

    requestType.textContent = "Nenhuma solicitação cadastrada";

    pedido.hidden = true;
    outrosProdutos.hidden = true;
    openChatButton.hidden = true;

    notFoundState.hidden = false;

    pararPolling();
    fecharChat(false);
    resetarChat(null);
}

function mostrarErroDeCarregamento(mensagem) {
    page.dataset.view = "error";

    notFoundState.hidden = true;
    pedido.hidden = false;
    openChatButton.hidden = true;
    outrosProdutos.hidden = true;

    orderSubtitle.textContent = "Não foi possível carregar a solicitação";

    definirBanner(
        "error",
        "Não foi possível carregar sua conta",
        mensagem || "Verifique se o servidor está em execução e tente novamente."
    );

    noticeChatButton.hidden = true;
    noticeCardsLink.hidden = true;
}


// =====================================================
// CONTA E SOLICITAÇÃO
// =====================================================

async function buscarConta() {
    const resposta = await fetch(`${API_BASE}/api/conta`, {
        method: "GET",
        credentials: "include"
    });

    if (resposta.status === 401) {
        window.location.href = "login.html";
        return null;
    }

    let dados = {};

    try {
        dados = await resposta.json();
    } catch {
        dados = {};
    }

    if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível carregar a conta.");
    }

    return dados;
}

function aplicarConta(dados, { forcar = false } = {}) {
    const cliente = dados.cliente;
    const solicitacao = dados.solicitacao;

    // Dados do perfil, independentemente de haver solicitação.
    userName.textContent = cliente.nome_cliente;
    userAvatar.textContent = cliente.nome_cliente.trim().charAt(0).toUpperCase();
    userCpf.textContent = cliente.cpf;

    if (!solicitacao) {
        activeRequestId = null;
        ultimaAssinaturaStatus = "";
        mostrarSemSolicitacao();
        return;
    }

    activeRequestId = Number(solicitacao.id);

    // Só redesenha se algo mudou (evita "piscar" a cada atualização).
    const assinatura = JSON.stringify(solicitacao);

    const mudou =
        forcar ||
        assinatura !== ultimaAssinaturaStatus ||
        page.dataset.view !== "request";

    if (mudou) {
        ultimaAssinaturaStatus = assinatura;

        renderStatus({
            ...solicitacao,
            nome: cliente.nome_cliente,
            cpf: cliente.cpf
        });

        configurarChat(solicitacao);
    }

    // Aviso de pedido barrado (vem do cadastro via sessionStorage).
    mostrarAvisoSolicitacao();

    // Enquanto está em análise, atualiza sozinho; ao concluir, para.
    if (solicitacao.status === "EM ANALISE") {
        iniciarPolling();
    } else {
        pararPolling();
    }
}

async function carregarConta() {
    try {
        const dados = await buscarConta();

        if (!dados) return;

        aplicarConta(dados, { forcar: true });

        if (activeRequestId) {
            await carregarMensagens();
        }

    } catch (erro) {
        console.error("Erro ao carregar a conta:", erro);
        mostrarErroDeCarregamento();
    }
}

// Atualização silenciosa em segundo plano (polling).
async function sincronizarStatus() {
    if (sincronizando) return;

    sincronizando = true;

    try {
        const dados = await buscarConta();

        if (dados) aplicarConta(dados);

    } catch (erro) {
        // Falha momentânea: mantém a tela atual sem incomodar o cliente.
        console.error("Erro ao sincronizar o status:", erro);

    } finally {
        sincronizando = false;
    }
}

// Botão "Atualizar".
async function atualizarManualmente() {
    const rotulo = refreshStatusButton.querySelector("span");

    refreshStatusButton.disabled = true;
    rotulo.textContent = "Atualizando...";

    try {
        const dados = await buscarConta();

        if (dados) {
            aplicarConta(dados, { forcar: true });

            if (statusAlert.dataset.tipo === "erro") {
                mostrarAlerta("");
            }

            if (activeRequestId) await carregarMensagens();
        }

    } catch (erro) {
        console.error("Erro ao atualizar:", erro);

        if (page.dataset.view === "error") {
            mostrarErroDeCarregamento(erro.message);
        } else {
            mostrarAlerta(
                "Não foi possível atualizar agora. Tente novamente em instantes.",
                "erro"
            );
        }

    } finally {
        refreshStatusButton.disabled = false;
        rotulo.textContent = "Atualizar";
    }
}


// =====================================================
// ATUALIZAÇÃO AUTOMÁTICA (mensagens + status)
// =====================================================

function iniciarPolling() {
    if (polling) return;

    ciclosDePolling = 0;

    polling = setInterval(() => {
        if (document.visibilityState !== "visible") return;

        ciclosDePolling += 1;

        carregarMensagens();

        if (ciclosDePolling % STATUS_A_CADA_N_CICLOS === 0) {
            sincronizarStatus();
        }
    }, INTERVALO_MENSAGENS_MS);
}

function pararPolling() {
    if (polling) {
        clearInterval(polling);
        polling = null;
    }
}


// =====================================================
// CHAT: GAVETA LATERAL
// =====================================================

const CHAT_ICONES = {
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    headset: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'
};

function chatIcone(nome) {
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${CHAT_ICONES[nome] || ""}</svg>`;
}

const chat = {
    id: null,
    open: false,
    messages: [],
    signature: "",
    loaded: false,
    loadError: "",
    canSend: false,
    sending: false,
    loading: false,
    reload: false,
    trigger: null      // botão que abriu a gaveta (para devolver o foco)
};

// ---------- "última mensagem vista" (guardada no navegador) ----------

function chaveVisto() {
    return `dmChatVisto:${chat.id}`;
}

function lerUltimoVisto() {
    try {
        return Number(localStorage.getItem(chaveVisto())) || 0;
    } catch {
        return 0;
    }
}

function marcarComoVisto() {
    const ids = chat.messages
        .map((m) => Number(m.id_mensagem))
        .filter((n) => Number.isFinite(n));

    if (!ids.length) return;

    try {
        localStorage.setItem(chaveVisto(), String(Math.max(...ids)));
    } catch {
        // Navegador sem localStorage: o selo só fica correto na sessão atual.
    }
}

function atualizarSelo() {
    const selo = $("#chat-badge");

    if (!selo) return;

    const ultimoVisto = lerUltimoVisto();

    const naoLidas = chat.open || !chat.id
        ? 0
        : chat.messages.filter((m) =>
            m.remetente === "ATENDENTE" &&
            Number(m.id_mensagem) > ultimoVisto
        ).length;

    selo.textContent = naoLidas > 9 ? "9+" : String(naoLidas);
    selo.hidden = naoLidas === 0;

    openChatButton.setAttribute(
        "aria-label",
        naoLidas
            ? `Abrir mensagens (${naoLidas} nova${naoLidas > 1 ? "s" : ""})`
            : "Abrir mensagens"
    );
}

// ---------- datas ----------

function parseDataChat(valor) {
    if (!valor) return null;

    // Datas do MySQL chegam como "YYYY-MM-DD HH:MM:SS" (o Safari exige o "T").
    const data = new Date(
        typeof valor === "string" ? valor.replace(" ", "T") : valor
    );

    return Number.isNaN(data.getTime()) ? null : data;
}

function chaveDia(data) {
    return data
        ? `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`
        : "sem-data";
}

function rotuloDia(data) {
    if (!data) return "Sem data";

    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);

    if (chaveDia(data) === chaveDia(hoje)) return "Hoje";
    if (chaveDia(data) === chaveDia(ontem)) return "Ontem";

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(data);
}

function horaChat(data) {
    return data
        ? new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(data)
        : "";
}

// ---------- desenho das mensagens ----------

function montarHTMLChat(mensagens) {
    let html = "";
    let ultimoDia = null;
    let ultimoRemetente = null;

    mensagens.forEach((mensagem) => {
        const data = parseDataChat(mensagem.data_envio);
        const dia = chaveDia(data);
        const meu = mensagem.remetente === "CLIENTE";
        const remetente = meu ? "CLIENTE" : "ATENDENTE";

        if (dia !== ultimoDia) {
            html += `
                <div class="chat-day"><span>${escapeHTML(rotuloDia(data))}</span></div>
            `;
            ultimoDia = dia;
            ultimoRemetente = null;
        }

        // Mensagens seguidas da mesma pessoa formam um grupo:
        // só a primeira mostra avatar e nome.
        const primeira = remetente !== ultimoRemetente;
        ultimoRemetente = remetente;

        html += `
            <div class="chat-row ${meu ? "mine" : "theirs"}${primeira ? " first" : ""}">
                ${primeira
                ? `<span class="chat-avatar" aria-hidden="true">${chatIcone(meu ? "user" : "headset")}</span>`
                : `<span class="chat-avatar-spacer" aria-hidden="true"></span>`}

                <div class="chat-bubble-wrap">
                    ${primeira
                ? `<span class="chat-author">${meu ? "Você" : "Equipe DM"}</span>`
                : ""}

                    <div class="chat-bubble">
                        <p class="chat-text">${escapeHTML(mensagem.conteudo_mensagem)}</p>
                        <time>${escapeHTML(horaChat(data))}</time>
                    </div>
                </div>
            </div>
        `;
    });

    return html;
}

function pertoDoFim(container) {
    return container.scrollHeight - container.scrollTop - container.clientHeight < 80;
}

function rolarChatParaOFim() {
    const container = $("#chat-messages");

    container.scrollTop = container.scrollHeight;
    $("#chat-new-pill").hidden = true;
}

function renderizarChat({ novas = false, forcarRolagem = false } = {}) {
    const container = $("#chat-messages");

    if (!chat.loaded) {
        container.innerHTML = `
            <div class="chat-skeleton" aria-label="Carregando mensagens">
                <span></span><span></span><span></span>
            </div>
        `;
        return;
    }

    if (chat.loadError) {
        container.innerHTML = `
            <div class="chat-empty">
                <span class="chat-empty-icon">${chatIcone("alert")}</span>
                <strong>Não foi possível carregar a conversa</strong>
                <p>${escapeHTML(chat.loadError)}</p>
            </div>
        `;
        return;
    }

    if (!chat.messages.length) {
        container.innerHTML = `
            <div class="chat-empty">
                <span class="chat-empty-icon">${chatIcone("message")}</span>
                <strong>Nenhuma mensagem ainda</strong>
                <p>Tem alguma dúvida sobre o seu pedido? Envie uma mensagem e nossa equipe responde por aqui.</p>
            </div>
        `;
        return;
    }

    const jaTinhaMensagens = Boolean(container.querySelector(".chat-row"));
    const estavaNoFim = pertoDoFim(container);
    const topoAnterior = container.scrollTop;

    container.innerHTML = montarHTMLChat(chat.messages);

    if (forcarRolagem || !jaTinhaMensagens || estavaNoFim) {
        rolarChatParaOFim();
        return;
    }

    // O cliente está relendo mensagens antigas: não puxamos a tela para baixo.
    container.scrollTop = topoAnterior;

    if (novas) {
        $("#chat-new-pill").hidden = false;
    }
}

function aplicarMensagens(lista) {
    const assinatura = JSON.stringify(
        lista.map((m) => [m.id_mensagem ?? null, m.remetente, m.conteudo_mensagem, m.data_envio])
    );

    const primeiraCarga = !chat.loaded;

    if (!primeiraCarga && !chat.loadError && assinatura === chat.signature) return;

    const tamanhoAnterior = chat.messages.length;

    chat.signature = assinatura;
    chat.messages = lista;
    chat.loaded = true;
    chat.loadError = "";

    renderizarChat({ novas: !primeiraCarga && lista.length > tamanhoAnterior });

    if (chat.open) marcarComoVisto();

    atualizarSelo();
}

// ---------- configuração, abrir e fechar ----------

function resetarChat(id) {
    chat.id = id;
    chat.messages = [];
    chat.signature = "";
    chat.loaded = false;
    chat.loadError = "";
    chat.sending = false;

    renderizarChat();
    atualizarSelo();
}

function configurarChat(solicitacao) {
    const id = Number(solicitacao.id);

    // Se for outra solicitação, recomeça; se for a mesma, mantém a gaveta como está.
    if (chat.id !== id) resetarChat(id);

    chat.canSend = solicitacao.status === "EM ANALISE";

    $("#chat-subtitle").textContent =
        `Solicitação #${solicitacao.id} · ${solicitacao.cartao}`;

    $("#chat-form").hidden = !chat.canSend;
    $("#chat-notice").hidden = chat.canSend;

    atualizarFormularioChat();
}

function sincronizarBotoesChat() {
    document.querySelectorAll("[data-open-chat]").forEach((botao) => {
        botao.setAttribute("aria-expanded", String(chat.open));
    });

    openChatButton.classList.toggle("active", chat.open);
}

function abrirChat(botao = openChatButton) {
    if (!chat.id) return;

    chat.open = true;
    chat.trigger = botao;

    $("#chat-drawer").classList.add("open");
    $("#chat-drawer").setAttribute("aria-hidden", "false");
    $("#chat-backdrop").classList.add("open");
    document.body.classList.add("chat-open");

    marcarComoVisto();
    sincronizarBotoesChat();
    atualizarSelo();
    rolarChatParaOFim();

    // Espera a animação para o foco não "pular" a gaveta.
    setTimeout(() => {
        if (!chat.open) return;

        if (chat.canSend) {
            $("#chat-input").focus();
        } else {
            $("#chat-close").focus();
        }
    }, 280);
}

function fecharChat(devolverFoco = true) {
    if (!chat.open) return;

    chat.open = false;

    $("#chat-drawer").classList.remove("open");
    $("#chat-drawer").setAttribute("aria-hidden", "true");
    $("#chat-backdrop").classList.remove("open");
    document.body.classList.remove("chat-open");

    sincronizarBotoesChat();
    atualizarSelo();

    if (devolverFoco && chat.trigger && !chat.trigger.hidden) {
        chat.trigger.focus();
    }
}

// ---------- formulário ----------

function autoAjustarCampoChat() {
    const campo = $("#chat-input");

    campo.style.height = "auto";
    campo.style.height = `${Math.min(campo.scrollHeight, 120)}px`;
}

function atualizarFormularioChat() {
    const campo = $("#chat-input");

    $("#chat-send-button").disabled = chat.sending || !campo.value.trim();
    $("#chat-counter").textContent = `${campo.value.length}/${LIMITE_MENSAGEM}`;
}

function mostrarErroChat(mensagem) {
    const elemento = $("#chat-error");

    elemento.textContent = mensagem;
    elemento.hidden = !mensagem;
}

async function enviarMensagem(evento) {
    evento.preventDefault();

    if (!chat.canSend || chat.sending || !chat.id) return;

    const campo = $("#chat-input");
    const conteudo = campo.value.trim();

    if (!conteudo) {
        campo.focus();
        return;
    }

    chat.sending = true;
    mostrarErroChat("");
    atualizarFormularioChat();

    try {
        const resposta = await fetch(`${API_BASE}/api/mensagens/${chat.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ conteudo })
        });

        if (resposta.status === 401) {
            window.location.href = "login.html";
            return;
        }

        let dados = {};

        try {
            dados = await resposta.json();
        } catch {
            dados = {};
        }

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível enviar a mensagem.");
        }

        campo.value = "";
        autoAjustarCampoChat();

        await carregarMensagens();

        renderizarChat({ forcarRolagem: true });

    } catch (erro) {
        console.error("Erro ao enviar mensagem:", erro);
        mostrarErroChat(erro.message);

    } finally {
        chat.sending = false;
        atualizarFormularioChat();
        campo.focus();
    }
}

// ---------- busca de mensagens ----------

async function carregarMensagens() {
    if (!chat.id) return;

    // Já existe uma busca em andamento: pede para repetir ao terminar,
    // assim uma mensagem recém-enviada nunca deixa de aparecer.
    if (chat.loading) {
        chat.reload = true;
        return;
    }

    const id = chat.id;

    chat.loading = true;

    try {
        const resposta = await fetch(`${API_BASE}/api/mensagens/${id}`, {
            method: "GET",
            credentials: "include"
        });

        if (resposta.status === 401) {
            window.location.href = "login.html";
            return;
        }

        let dados = {};

        try {
            dados = await resposta.json();
        } catch {
            dados = {};
        }

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível carregar as mensagens.");
        }

        if (id !== chat.id) return;

        aplicarMensagens(dados.mensagens || []);

    } catch (erro) {
        console.error("Erro ao carregar mensagens:", erro);

        // Se já havia mensagens na tela, uma falha momentânea não apaga a conversa.
        if (id === chat.id && !chat.loaded) {
            chat.loaded = true;
            chat.loadError = erro.message;
            renderizarChat();
        }

    } finally {
        chat.loading = false;

        if (chat.reload) {
            chat.reload = false;
            carregarMensagens();
        }
    }
}


// =====================================================
// OUTROS PRODUTOS (CARROSSEL)
// =====================================================

const ICONE_PRODUTO = `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <rect x="3" y="8" width="18" height="4" rx="1"/>
        <path d="M12 8v13"/>
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
    </svg>
`;

function atualizarSetasCarrossel() {
    const sobra = produtos.scrollWidth - produtos.clientWidth;

    // Se tudo cabe na tela, as setas não fazem sentido.
    produtosControls.hidden = sobra <= 4;

    produtosPrev.disabled = produtos.scrollLeft <= 4;
    produtosNext.disabled = produtos.scrollLeft >= sobra - 4;
}

function rolarCarrossel(direcao) {
    produtos.scrollBy({
        left: direcao * produtos.clientWidth * 0.8,
        behavior: "smooth"
    });
}

function mostrarMensagemProdutos(texto) {
    produtos.innerHTML = "";

    const mensagem = document.createElement("p");
    mensagem.className = "products-message";
    mensagem.textContent = texto;

    produtos.appendChild(mensagem);
    atualizarSetasCarrossel();
}

async function carregarOutrosProdutos() {
    // Já carregou com sucesso: não busca de novo a cada atualização do status.
    if (produtosCarregados) return;

    produtos.innerHTML = `
        <div class="card-produto card-produto--skeleton"></div>
        <div class="card-produto card-produto--skeleton"></div>
        <div class="card-produto card-produto--skeleton"></div>
    `;

    try {
        const resposta = await fetch(`${API_BASE}/api/outros_produtos/`);
        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro);
        }

        if (!Array.isArray(resultado) || resultado.length === 0) {
            mostrarMensagemProdutos("No momento não há outros serviços disponíveis.");
            produtosCarregados = true;
            return;
        }

        produtos.innerHTML = "";

        resultado.forEach((produto, indice) => {
            const card = document.createElement("article");
            card.className = "card-produto";

            const icone = document.createElement("span");
            icone.className = "produto-icon";
            icone.dataset.tone = String(indice % 4);
            icone.setAttribute("aria-hidden", "true");
            icone.innerHTML = ICONE_PRODUTO;

            const nome = document.createElement("h3");
            nome.className = "nome-produto";
            nome.textContent = produto.nome_servico;

            const descricao = document.createElement("p");
            descricao.className = "descricao-produto";
            descricao.textContent =
                produto.descricao_servico || "Produto oferecido pela DM";

            card.append(icone, nome, descricao);
            produtos.appendChild(card);
        });

        produtosCarregados = true;
        produtos.scrollLeft = 0;
        atualizarSetasCarrossel();

    } catch (erro) {
        console.error("Erro ao carregar outros serviços:", erro);
        mostrarMensagemProdutos("Não foi possível carregar os serviços agora.");
    }
}


// =====================================================
// EVENTOS
// =====================================================

// ---- atualizar ----
refreshStatusButton.addEventListener("click", atualizarManualmente);

// ---- carrossel ----
produtosPrev.addEventListener("click", () => rolarCarrossel(-1));
produtosNext.addEventListener("click", () => rolarCarrossel(1));
produtos.addEventListener("scroll", atualizarSetasCarrossel, { passive: true });
window.addEventListener("resize", atualizarSetasCarrossel);

// ---- chat ----
$("#chat-form").addEventListener("submit", enviarMensagem);

$("#chat-input").addEventListener("input", () => {
    mostrarErroChat("");
    autoAjustarCampoChat();
    atualizarFormularioChat();
});

// Enter envia; Shift+Enter quebra a linha.
// Em celulares (teclado virtual) o Enter continua quebrando a linha.
$("#chat-input").addEventListener("keydown", (evento) => {
    const mouseDisponivel = window.matchMedia("(pointer: fine)").matches;

    if (
        evento.key === "Enter" &&
        !evento.shiftKey &&
        !evento.isComposing &&
        mouseDisponivel
    ) {
        evento.preventDefault();
        $("#chat-form").requestSubmit();
    }
});

$("#chat-close").addEventListener("click", () => fecharChat());
$("#chat-backdrop").addEventListener("click", () => fecharChat());
$("#chat-new-pill").addEventListener("click", rolarChatParaOFim);

$("#chat-messages").addEventListener("scroll", () => {
    if (pertoDoFim($("#chat-messages"))) {
        $("#chat-new-pill").hidden = true;
    }
}, { passive: true });

// Qualquer botão com data-open-chat abre a gaveta.
// O botão "Mensagens" do topo funciona como abrir/fechar.
document.addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-open-chat]");

    if (!botao) return;

    if (chat.open) {
        if (botao === openChatButton) {
            fecharChat();
        } else {
            $("#chat-input").focus();
        }
        return;
    }

    abrirChat(botao);
});

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && chat.open) {
        fecharChat();
    }
});

// Ao voltar para a aba do navegador, atualiza na hora.
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !activeRequestId) return;

    carregarMensagens();
    sincronizarStatus();
});

// Ano do rodapé
const anoAtual = $("#ano-atual");

if (anoAtual) anoAtual.textContent = String(new Date().getFullYear());


// =====================================================
// INICIALIZAÇÃO
// =====================================================

carregarConta();