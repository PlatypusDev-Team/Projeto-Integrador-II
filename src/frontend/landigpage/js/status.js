"use strict";
const contentByStatus = {
    analise: {
        resultMessage: "AGUARDANDO",
        resultDetail: "Assim que a análise for concluída, seu resultado aparecerá aqui.",
        noticeTitle: "Análise de Crédito",
        noticeMessage: "Nossa equipe está trabalhando para processar seu pedido da forma mais rápida possível.\nObrigado pela paciência.",
        noticeIcon: "⌛",
    },
    aprovada: {
        resultMessage: "APROVADO",
        resultDetail: "Seu cartão DM foi aprovado. Confira os próximos passos para continuar.",
        noticeTitle: "Parabéns, {nome}! Seu cartão DM VISA foi aprovado!",
        noticeMessage: "Sua solicitação foi concluída com sucesso. Agora você faz parte da DM! Prepare-se para aproveitar todos os benefícios do seu novo cartão.",
        noticeIcon: "✓",
    },
    rejeitada: {
        resultMessage: "REJEITADA",
        resultDetail: "No momento, não foi possível aprovar sua solicitação. Consulte os detalhes para saber mais.",
        noticeTitle: "Análise de Crédito",
        noticeMessage: "Infelizmente, nossa análise não permitiu a aprovação do seu crédito neste momento. Deixe seus dados atualizados para futuras oportunidades.",
        noticeIcon: "×",
    },
};
const page = document.querySelector(".status-page");
const prequalificationCard = document.querySelector("#prequalification-card");
const prequalificationIcon = document.querySelector("#prequalification-icon");
const prequalificationTitle = document.querySelector("#prequalification-title");
const prequalificationMessage = document.querySelector("#prequalification-message");
const prequalificationDescription = document.querySelector("#prequalification-description");
const prequalificationStep = document.querySelector("#prequalification-step");
const creditStep = document.querySelector("#credit-step");
const resultStep = document.querySelector("#result-step");
const progressSegmentOne = document.querySelector("#progress-segment-one");
const progressSegmentTwo = document.querySelector("#progress-segment-two");
const creditCard = document.querySelector("#credit-card");
const creditIcon = document.querySelector("#credit-icon");
const resultCard = document.querySelector("#result-card");
const resultIcon = document.querySelector("#result-icon");
const resultMessage = document.querySelector("#result-message");
const resultDetail = document.querySelector("#result-detail");
const noticeIcon = document.querySelector("#notice-icon");
const noticeTitle = document.querySelector("#notice-title");
const noticeMessage = document.querySelector("#notice-message");
const creditDescription = document.querySelector("#credit-description");
const creditNote = document.querySelector("#credit-note");
const userName = document.querySelector("#user-name");
const userCpf = document.querySelector("#user-cpf");
const requestType = document.querySelector("#request-type");
const userAvatar = document.querySelector("#user-avatar");
const refreshStatusButton = document.querySelector("#refresh-status");
const notFoundState = document.querySelector("#not-found-state");
let activeRequestId = null;
function ocultarSolicitacaoNaoEncontrada() {
    if (!notFoundState)
        return;
    notFoundState.setAttribute("hidden", "true");
    notFoundState.style.display = "none";
}
function setLoadingIcon(element) {
    element.innerHTML = '<svg class="hourglass-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m17.029,12c2.033-1.972,3.971-4.837,3.971-8.591,0-1.88-1.529-3.409-3.409-3.409H6.409c-1.88,0-3.409,1.53-3.409,3.41,0,3.754,1.945,6.619,3.986,8.591-2.041,1.971-3.986,4.835-3.986,8.59v3.409h18v-3.409c0-3.753-1.938-6.619-3.971-8.591Zm.971,9H6v-.409c0-3.385,2.281-5.9,4.195-7.414l1.487-1.176-1.487-1.176c-1.914-1.514-4.195-4.03-4.195-7.415,0-.226.184-.409.409-.409h11.182c.226,0,.409.183.409.409,0,3.385-2.271,5.901-4.177,7.417l-1.476,1.174,1.476,1.174c1.905,1.516,4.177,4.032,4.177,7.417v.409Zm-5.422-11.739l-.566.45-.576-.456c-1.229-.973-2.644-2.427-3.197-4.255h7.524c-.55,1.831-1.96,3.287-3.184,4.261Z" /></svg>';
}
function setClockIcon(element) {
    element.innerHTML = '<span class="clock-icon" aria-hidden="true"></span>';
}
function setPendingDots(element) {
    element.innerHTML = '<span class="status-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
}
function setCompletedIcon(element) {
    element.className = "status-card__icon prequalification-icon";
    element.textContent = "✓";
}
function updateTimeline(currentStep, resultStatus) {
    const steps = [prequalificationStep, creditStep, resultStep];
    steps.forEach((step, index) => {
        if (!step)
            return;
        step.classList.toggle("step--current", index === currentStep);
        step.classList.toggle("step--done", index < currentStep);
        const icon = step.querySelector(".step__icon");
        if (!icon)
            return;
        if (index === currentStep) {
            if (index === 2 && resultStatus === "rejeitada") {
                step.classList.add("step--rejected");
                step.classList.remove("step--approved");
                icon.innerHTML = '<span class="timeline-x" aria-hidden="true"></span>';
            }
            else if (index === 2 && resultStatus === "aprovada") {
                step.classList.add("step--approved");
                step.classList.remove("step--rejected");
                icon.textContent = "✓";
            }
            else {
                step.classList.remove("step--approved", "step--rejected");
                icon.innerHTML = '<span class="clock-icon" aria-hidden="true"></span>';
            }
        }
        else if (index < currentStep) {
            icon.textContent = "✓";
        }
        else {
            icon.textContent = "•";
        }
    });
    progressSegmentOne?.classList.toggle("is-complete", currentStep >= 1);
    progressSegmentTwo?.classList.toggle("is-complete", currentStep >= 2);
}
document.querySelectorAll("[data-landing-placeholder]").forEach((link) => {
    link.addEventListener("click", (event) => event.preventDefault());
});
function getRequestId() {
    const value = new URLSearchParams(window.location.search).get("solicitacao");
    if (!value)
        return null;
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}
function mapStatus(status) {
    if (status === "ACEITO")
        return "aprovada";
    if (status === "NEGADO")
        return "rejeitada";
    return "analise";
}
function renderStatus(solicitacao) {
    const status = mapStatus(solicitacao.status);
    const content = contentByStatus[status];
    if (!page || !prequalificationCard || !prequalificationIcon || !prequalificationTitle || !prequalificationMessage || !prequalificationDescription || !prequalificationStep || !creditStep || !resultStep || !creditCard || !creditIcon || !resultCard || !resultIcon || !resultMessage || !resultDetail || !noticeIcon || !noticeTitle || !noticeMessage || !creditDescription || !creditNote || !userName || !userCpf || !requestType || !userAvatar)
        return;
    ocultarSolicitacaoNaoEncontrada();
    page.dataset.status = status;
    const prequalificationPending = solicitacao.pre_qualificacao === "EM ANALISE";
    const resultActive = status === "aprovada" || status === "rejeitada";
    const creditActive = status === "analise" && !prequalificationPending;
    updateTimeline(prequalificationPending ? 0 : creditActive ? 1 : 2, resultActive ? status : undefined);
    prequalificationCard.classList.toggle("status-card--active", prequalificationPending);
    prequalificationCard.classList.remove("status-card--upcoming");
    if (prequalificationPending) {
        setClockIcon(prequalificationIcon);
    }
    else {
        prequalificationIcon.textContent = "✓";
    }
    prequalificationIcon.classList.toggle("prequalification-icon--pending", prequalificationPending);
    prequalificationTitle.innerHTML = "Análise de<br />Pré-Qualificação";
    prequalificationMessage.textContent = prequalificationPending ? "" : "Etapa Concluída";
    prequalificationDescription.hidden = !prequalificationPending;
    prequalificationDescription.textContent = prequalificationPending
        ? "Estamos fazendo uma verificação rápida do seu perfil e do seu registo. Esta etapa leva apenas alguns instantes."
        : "";
    creditCard.classList.toggle("status-card--active", creditActive);
    const creditUpcoming = prequalificationPending || (!creditActive && status === "analise");
    creditCard.classList.toggle("status-card--upcoming", creditUpcoming);
    if (status === "analise") {
        creditIcon.className = "status-card__icon credit-icon";
        creditIcon.innerHTML = '<svg class="question-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m23.994,21.873l-5.947-5.947c1.225-1.66,1.959-3.703,1.959-5.92C20.006,4.492,15.52.006,10.006.006S.006,4.492.006,10.006s4.486,10,10,10c2.217,0,4.26-.734,5.92-1.959l5.947,5.947,2.121-2.121Zm-13.988-4.867c-3.859,0-7-3.14-7-7s3.141-7,7-7,7,3.14,7,7-3.141,7-7,7Zm-1.006-4.006h2v2h-2v-2Zm4-5c0,1.125-.621,2.146-1.621,2.665-.227.118-.379.425-.379.765v.571h-2v-.571c0-1.1.559-2.073,1.458-2.54.335-.173.542-.514.542-.889,0-.551-.448-1-1-1s-1,.449-1,1h-2c0-1.654,1.346-3,3-3s3,1.346,3,3Z" /></svg>';
    }
    else {
        setCompletedIcon(creditIcon);
        creditCard.classList.remove("status-card--upcoming");
    }
    resultCard.classList.toggle("status-card--active", resultActive);
    resultCard.classList.toggle("status-card--upcoming", !resultActive);
    userName.textContent = solicitacao.nome;
    userAvatar.textContent = solicitacao.nome.trim().charAt(0).toUpperCase();
    userCpf.textContent = solicitacao.cpf;
    requestType.textContent = `Tipo de solicitação: ${solicitacao.cartao}`;
    if (status === "rejeitada") {
        resultIcon.className = "status-card__icon rejection-icon";
        resultIcon.textContent = "";
    }
    else if (status === "analise") {
        resultIcon.className = "status-card__icon result-pending-icon";
        setPendingDots(resultIcon);
    }
    else {
        resultIcon.className = "status-card__icon";
        resultIcon.textContent = content.noticeIcon;
    }
    resultMessage.textContent = status === "analise" ? "Aguardando" : content.resultMessage;
    resultMessage.classList.toggle("result-status--pending", status === "analise");
    resultDetail.textContent = content.resultDetail;
    if (content.noticeIcon === "⌛") {
        setLoadingIcon(noticeIcon);
    }
    else {
        noticeIcon.textContent = content.noticeIcon;
    }

    noticeTitle.textContent = prequalificationPending
        ? "Análise de Pré-Qualificação"
        : status === "analise"
            ? "Sua solicitação está em análise"
            : content.noticeTitle.replace("{nome}", solicitacao.nome);

    noticeMessage.textContent = status === "analise"
        ? "Você já possui uma solicitação em análise. Aguarde a conclusão antes de enviar uma nova solicitação de cartão. Você pode acompanhar o andamento por esta página."
        : content.noticeMessage;

}

/**
 * Mostra, no corpo da página da conta, o aviso guardado pelo cadastro.js
 * quando o pedido foi barrado (já há pedido em análise, ou o cartão já
 * foi solicitado). O aviso é lido uma única vez e removido.
 *
 * Posição: logo abaixo do título "Acompanhe seu Pedido", dentro da seção
 * do pedido (e não antes do <header>, que é o primeiro filho do <main>).
 */
function mostrarAvisoSolicitacao() {
    const mensagem = sessionStorage.getItem("avisoSolicitacao");

    if (!mensagem) return;

    sessionStorage.removeItem("avisoSolicitacao");

    document.querySelector("#aviso-solicitacao")?.remove();

    const aviso = document.createElement("div");
    aviso.id = "aviso-solicitacao";
    aviso.setAttribute("role", "alert");
    aviso.textContent = mensagem;
    aviso.style.cssText = [
        "margin: 0 0 24px",
        "padding: 14px 18px",
        "border-radius: 8px",
        "border: 1px solid #f5a623",
        "background: #fff4e5",
        "color: #5c3b00",
        "font-weight: 600",
        "line-height: 1.4",
        "text-align: left",
    ].join(";");

    const titulo = document.querySelector("#order-title");
    const secaoPedido = document.querySelector("#pedido");

    if (titulo) {
        titulo.after(aviso);
    } else if (secaoPedido) {
        secaoPedido.prepend(aviso);
    } else if (page) {
        page.append(aviso);
    }
}

const API_BASE = "http://127.0.0.1:5000";

async function carregarConta() {
    try {
        const resposta = await fetch(`${API_BASE}/api/conta`, {
            method: "GET",
            credentials: "include"
        });

        if (resposta.status === 401) {
            window.location.href = "login.html";
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível carregar a conta.");
        }

        const cliente = dados.cliente;
        const solicitacao = dados.solicitacao;

        // Dados do perfil, independentemente de haver solicitação.
        if (userName) {
            userName.textContent = cliente.nome_cliente;
        }

        if (userAvatar) {
            userAvatar.textContent =
                cliente.nome_cliente.trim().charAt(0).toUpperCase();
        }

        if (userCpf) {
            userCpf.textContent = cliente.cpf;
        }

        if (!solicitacao) {
            // Conta criada, mas nenhum cartão solicitado.
            if (page) page.dataset.view = "empty";

            if (requestType) {
                requestType.textContent = "Nenhuma solicitação cadastrada";
            }

            if (notFoundState) {
                notFoundState.querySelector("h1").textContent =
                    "Você ainda não tem solicitações";

                notFoundState.querySelector("p").textContent =
                    "Sua conta está pronta! Conheça nossos cartões quando quiser fazer sua primeira solicitação.";

                notFoundState.removeAttribute("hidden");
                notFoundState.style.display = "";
            }

            if (document.querySelector("#pedido")) {
                document.querySelector("#pedido").hidden = true;
            }

            if (refreshStatusButton) {
                refreshStatusButton.hidden = true;
            }

            return;
        }

        // Há uma solicitação: mostra a tela de acompanhamento.
        if (document.querySelector("#pedido")) {
            document.querySelector("#pedido").hidden = false;
        }

        ocultarSolicitacaoNaoEncontrada();

        if (page) page.dataset.view = "request";

        renderStatus({
            ...solicitacao,
            nome: cliente.nome_cliente,
            cpf: cliente.cpf
        });

        // Aviso de pedido barrado (vem do cadastro.js via sessionStorage).
        mostrarAvisoSolicitacao();

    } catch (erro) {
        console.error("Erro ao carregar a conta:", erro);

        if (noticeTitle) {
            noticeTitle.textContent = "Não foi possível carregar sua conta";
        }

        if (noticeMessage) {
            noticeMessage.textContent =
                "Verifique se o servidor está em execução e tente novamente.";
        }
    }
}

carregarConta();