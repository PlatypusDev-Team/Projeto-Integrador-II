const API = "http://127.0.0.1:5000/api/atendente";

const state = {
    view: "pendentes",
    pending: [],
    mine: [],
    selectedId: null,
    detail: null,
    idAtendente: null
};

const $ = (id) => document.getElementById(id);

let statusChart = null;
let monthChart = null;
const dashboardCharts = {};

let chatPolling = null;
let chatLoadingId = null;
// Guarda a "assinatura" da última lista de mensagens desenhada,
// para só redesenhar o chat quando algo realmente mudou.
let chatSignature = "";

// Declarado aqui no topo (antes ficava no meio do arquivo).
let activeReportType = "status";

const reportResultsTemplate = $("report-results").innerHTML;

const reportDefinitions = {
    status: {
        title: "Solicitações por status",
        description: "Distribuição das solicitações por status e evolução mensal.",
        endpoint: "/relatorios/solicitacoes",
        exports: true
    },

    products: {
        title: "Produtividade por loja",
        description: "Compare o volume de solicitações aceitas, recusadas e em análise em cada loja.",
        endpoint: "/relatorios/produtos",
        exports: false
    },

    performance: {
        title: "Tempo de análise",
        description: "Acompanhe o tempo médio de conclusão e o tempo de espera das solicitações pendentes.",
        endpoint: "/relatorios/desempenho",
        exports: false
    },

    cardTypes: {
        title: "Tipos de cartão",
        description: "Analise a distribuição das solicitações por tipo de cartão e sua evolução mensal.",
        endpoint: "/relatorios/tipos-cartao",
        exports: false
    }
};

const STATUS_LABELS = {
    "EM ANALISE": "Em análise",
    "ACEITO": "Aceita",
    "NEGADO": "Recusada"
};

// =====================================================
// API E SESSÃO
// =====================================================

async function api(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API}${path}`, {
            ...options,
            credentials: "include",
            headers: {
                ...(options.body ? {
                    "Content-Type": "application/json"
                } : {}),
                ...options.headers
            }
        });
    } catch {
        throw new Error(
            "Não foi possível conectar ao Flask. Verifique se o servidor está ativo."
        );
    }

    if (response.status === 401) {
        window.location.replace("login.html");
        throw new Error("Sua sessão expirou. Entre novamente.");
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : {};

    if (!response.ok || data.success === false) {
        throw new Error(
            data.mensagem ||
            `Erro na comunicação com o servidor (${response.status}).`
        );
    }

    return data;
}

async function mensagemAPI(idSolicitacao, options = {}) {
    const baseURL = API.replace("/api/atendente", "");

    let response;

    try {
        response = await fetch(
            `${baseURL}/api/mensagens/${idSolicitacao}`,
            {
                ...options,
                credentials: "include",
                headers: {
                    ...(options.body ? {
                        "Content-Type": "application/json"
                    } : {}),
                    ...options.headers
                }
            }
        );
    } catch {
        throw new Error("Não foi possível conectar ao servidor.");
    }

    if (response.status === 401) {
        window.location.replace("login.html");
        throw new Error("Sua sessão expirou. Entre novamente.");
    }

    // Se o servidor devolver algo que não é JSON (ex.: página de erro HTML),
    // evitamos o erro críptico "Unexpected token <".
    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.mensagem ||
            data.erro ||
            "Não foi possível realizar a operação no chat."
        );
    }

    return data;
}

async function sendChatMessage(event) {
    event.preventDefault();

    const form = event.target;
    const input = $("chat-input");
    const button = $("chat-send-button");

    const conteudo = input.value.trim();
    const idSolicitacao = Number(state.selectedId);

    if (!conteudo) {
        input.focus();
        return;
    }

    if (!idSolicitacao) {
        alert("Nenhuma solicitação selecionada.");
        return;
    }

    button.disabled = true;
    button.textContent = "Enviando...";

    try {
        await mensagemAPI(idSolicitacao, {
            method: "POST",
            body: JSON.stringify({
                conteudo: conteudo
            })
        });

        form.reset();

        await loadChatMessages(idSolicitacao);

    } catch (error) {
        alert(error.message);

    } finally {
        if (button.isConnected) {
            button.disabled = false;
            button.textContent = "Enviar";
        }
    }
}

document.addEventListener("submit", function (event) {
    if (event.target.id === "chat-form") {
        sendChatMessage(event);
    }
});

// =====================================================
// UTILITÁRIOS
// =====================================================

function showMessage(message, success = false) {
    const element = $("page-message");

    element.textContent = message;
    element.hidden = !message;
    element.classList.toggle("success", success);
}

function showReportMessage(message, success = false) {
    const element = $("report-message");

    element.textContent = message;
    element.hidden = !message;
    element.classList.toggle("success", success);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatDate(value) {
    if (!value) return "Não informada";

    // Evita deslocar datas sem horário por causa do fuso horário.
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));

    if (dateOnly) {
        const [year, month, day] = String(value).split("-");
        return `${day}/${month}/${year}`;
    }

    // Datas MySQL costumam chegar como "YYYY-MM-DD HH:MM:SS".
    const normalized = typeof value === "string"
        ? value.replace(" ", "T")
        : value;

    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
        return "Não informada";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(date);
}

function statusLabel(status) {
    return STATUS_LABELS[status] || status || "Status desconhecido";
}

function statusClass(status) {
    return ({
        "EM ANALISE": "pending",
        "ACEITO": "accepted",
        "NEGADO": "denied"
    })[status] || "";
}

function setButtonsDisabled(buttons, disabled) {
    buttons.filter(Boolean).forEach((button) => {
        button.disabled = disabled;
    });
}

// =====================================================
// NAVEGAÇÃO
// =====================================================

function showView(view) {
    pararPollingChat();

    state.view = view;
    state.selectedId = null;
    state.detail = null;

    $("list-view").hidden = view === "relatorios";
    $("summary-grid").hidden = view === "relatorios";
    $("detail-view").hidden = true;
    $("reports-view").hidden = view !== "relatorios";

    document.querySelectorAll(".nav-item").forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });

    const titles = {
        pendentes: "Solicitações pendentes",
        meus: "Meus atendimentos",
        relatorios: "Relatórios"
    };

    $("page-title").textContent = titles[view] || "Central de atendimento";

    showMessage("");

    if (view === "pendentes" || view === "meus") {
        $("search-input").value = "";
        $("status-filter").value =
            view === "pendentes" ? "EM ANALISE" : "TODOS";

        renderList();
    }

    if (view === "relatorios") {
        closeReport();
        loadDashboard();
    }
}

function getCurrentList() {
    return state.view === "meus"
        ? state.mine
        : state.pending;
}

// =====================================================
// LISTAGEM E RESUMO
// =====================================================

function renderList() {
    const query = $("search-input")
        .value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const filter = $("status-filter").value;

    const filtered = getCurrentList().filter((item) => {
        const matchesSearch = [
            item.id_solicitacao,
            item.nome_cliente,
            item.nome_produto
        ].some((value) =>
            String(value ?? "")
                .toLocaleLowerCase("pt-BR")
                .includes(query)
        );

        const matchesStatus =
            filter === "TODOS" || item.status === filter;

        return matchesSearch && matchesStatus;
    });

    $("result-count").textContent =
        `${filtered.length} ${filtered.length === 1 ? "registro" : "registros"}`;

    $("list-heading").textContent =
        state.view === "meus"
            ? "Solicitações sob minha responsabilidade"
            : "Fila de solicitações";

    $("list-description").textContent =
        state.view === "meus"
            ? "Acompanhe as solicitações atribuídas a você."
            : "Selecione uma solicitação para consultar os detalhes.";

    if (!filtered.length) {
        $("request-list").innerHTML = `
            <p class="empty-state">
                Nenhuma solicitação encontrada com esses filtros.
            </p>
        `;
        return;
    }

    $("request-list").innerHTML = filtered.map((item) => `
        <article class="request-card">
            <div class="request-main">
                <span class="request-id">
                    SOLICITAÇÃO #${escapeHTML(item.id_solicitacao)}
                </span>

                <h3>${escapeHTML(item.nome_cliente)}</h3>

                <p>
                    ${escapeHTML(item.nome_produto || "Produto não informado")}
                    ·
                    ${escapeHTML(item.tipo_produto || "Produto/serviço")}
                </p>
            </div>

            <div class="request-side">
                <span class="status ${statusClass(item.status)}">
                    ${escapeHTML(statusLabel(item.status))}
                </span>

                <button
                    class="small-button open-request"
                    type="button"
                    data-id="${Number(item.id_solicitacao)}"
                >
                    Ver detalhes →
                </button>
            </div>
        </article>
    `).join("");

    $("request-list")
        .querySelectorAll(".open-request")
        .forEach((button) => {
            button.addEventListener("click", () => {
                openDetails(Number(button.dataset.id));
            });
        });
}

function updateSummary() {
    $("pending-count").textContent = state.pending.length;
    $("summary-pending").textContent = state.pending.length;
    $("summary-mine").textContent = state.mine.length;

    $("summary-completed").textContent = state.mine.filter(
        (item) =>
            item.status === "ACEITO" ||
            item.status === "NEGADO"
    ).length;
}

async function loadLists() {
    showMessage("");

    try {
        const [pendingData, mineData] = await Promise.all([
            api("/solicitacoes/pendentes"),
            api("/meus-atendimentos")
        ]);

        state.pending = pendingData.solicitacoes || [];
        state.mine = mineData.atendimentos || [];

        updateSummary();
        renderList();
    } catch (error) {
        showMessage(error.message);

        $("request-list").innerHTML = `
            <p class="empty-state">
                Não foi possível carregar as solicitações.
            </p>
        `;
    }
}

// =====================================================
// DETALHES DA SOLICITAÇÃO
// =====================================================

function renderDetails(data) {
    const request = data.solicitacao;

    if (!request) {
        $("request-detail").innerHTML = `
            <p class="empty-state">
                Os detalhes da solicitação não foram encontrados.
            </p>
        `;
        return;
    }

    const history = request.historico || [];

    const historyHTML = history.length
        ? history.map((item) => `
            <article class="history-item">
                <time>
                    ${escapeHTML(formatDate(item.data_atendimento))}
                </time>

                <p>
                    ${escapeHTML(item.historico_atendimento)}
                </p>

                <small>
                    Atendente:
                    ${escapeHTML(item.nome_atendente || "Sistema")}
                </small>
            </article>
        `).join("")
        : `
            <p class="empty-state">
                Ainda não há registros no histórico.
            </p>
        `;

    const assignedToMe =
        Number(request.id_atendente_responsavel) > 0 &&
        Number(request.id_atendente_responsavel) ===
        Number(state.idAtendente);

    const isConcluded = request.status !== "EM ANALISE";

    const canSendMessage = assignedToMe && !isConcluded;

    const chatHTML = `
        <section class="chat-section">

            <div class="chat-header">
                <div>
                    <h3>Conversa da solicitação</h3>
                    <p>
                        Comunicação entre cliente e atendente
                        sobre esta solicitação.
                    </p>
                </div>
            </div>

            <div id="chat-messages" class="chat-messages">
                <p class="chat-empty">
                    Carregando mensagens...
                </p>
            </div>

            ${canSendMessage ? `
                <form id="chat-form" class="chat-form">

                    <textarea
                        id="chat-input"
                        name="conteudo"
                        placeholder="Digite sua mensagem..."
                        maxlength="2000"
                        required
                    ></textarea>

                    <button type="submit" id="chat-send-button">
                        Enviar
                    </button>

                </form>
            ` : ""}

            ${!canSendMessage ? `
                <p class="chat-notice">
                    ${isConcluded
                ? "Solicitação concluída. O histórico está disponível para consulta."
                : "Assuma esta solicitação para poder responder às mensagens."}
                </p>
            ` : ""}
        </section>
    `;

    let actionHTML = "";

    if (isConcluded) {
        actionHTML = `
            <div class="detail-notice">
                Esta solicitação já foi concluída com o resultado:
                <strong>${escapeHTML(statusLabel(request.status))}</strong>.
            </div>
        `;
    } else if (!assignedToMe) {
        actionHTML = `
            <div class="decision-box">
                <p class="detail-notice">
                    Esta solicitação ainda não está sob sua responsabilidade.
                    Assuma-a para iniciar o atendimento.
                </p>

                <div class="decision-actions">
                    <button
                        class="primary-button"
                        id="take-request"
                        type="button"
                    >
                        Assumir solicitação
                    </button>
                </div>
            </div>
        `;
    } else {
        actionHTML = `
            <div class="decision-box">
                <label for="decision-note">
                    Observação do atendimento
                </label>

                <textarea
                    id="decision-note"
                    maxlength="5000"
                    placeholder="Registre o motivo da decisão..."
                ></textarea>

                <div class="decision-actions">
                    <button
                        class="primary-button"
                        id="accept-request"
                        type="button"
                    >
                        ✓ Aceitar solicitação
                    </button>

                    <button
                        class="danger-button"
                        id="reject-request"
                        type="button"
                    >
                        Recusar solicitação
                    </button>
                </div>
            </div>
        `;
    }

    $("request-detail").innerHTML = `
        <div class="detail-header">
            <div>
                <span class="request-id">
                    SOLICITAÇÃO #${escapeHTML(request.id_solicitacao)}
                </span>

                <h2>${escapeHTML(request.nome_produto)}</h2>

                <p>
                    ${escapeHTML(request.tipo_produto || "Produto/serviço")}
                </p>
            </div>

            <span class="status ${statusClass(request.status)}">
                ${escapeHTML(statusLabel(request.status))}
            </span>
        </div>

        <section class="detail-section">
            <h3>Dados do cliente</h3>

            <div class="info-grid">
                <div class="info-item">
                    <span>Nome completo</span>
                    <strong>${escapeHTML(request.nome_cliente)}</strong>
                </div>

                <div class="info-item">
                    <span>E-mail</span>
                    <strong>${escapeHTML(request.email_cliente)}</strong>
                </div>

                <div class="info-item">
                    <span>Telefone</span>
                    <strong>${escapeHTML(request.telefone_cliente)}</strong>
                </div>

                <div class="info-item">
                    <span>CPF</span>
                    <strong>${escapeHTML(request.cpf_cliente)}</strong>
                </div>

                <div class="info-item">
                    <span>Data de nascimento</span>
                    <strong>${escapeHTML(formatDate(request.data_nascimento))}</strong>
                </div>

                <div class="info-item">
                    <span>Tipo de cliente</span>
                    <strong>${escapeHTML(request.tipo_cliente)}</strong>
                </div>
            </div>
        </section>

        <section class="detail-section">
            <h3>Informações do produto ou serviço</h3>

            <div class="info-grid">
                <div class="info-item">
                    <span>Tipo</span>
                    <strong>${escapeHTML(request.tipo_produto)}</strong>
                </div>

                <div class="info-item">
                    <span>Loja</span>
                    <strong>${escapeHTML(request.nome_loja || "DM Financeira")}</strong>
                </div>

                <div class="info-item">
                    <span>Modalidade</span>
                    <strong>${escapeHTML(request.modalidade || "Não se aplica")}</strong>
                </div>

                <div class="info-item">
                    <span>Descrição</span>
                    <strong>${escapeHTML(
        request.descricao_cartao ||
        request.descricao_servico ||
        "Sem descrição disponível."
    )}</strong>
                </div>
            </div>
        </section>

        <section class="detail-section">
            <h3>Histórico de atendimento</h3>
            <div class="history-list">${historyHTML}</div>
        </section>

        ${chatHTML}

        ${actionHTML}
    `;

    const takeButton = $("take-request");

    if (takeButton) {
        takeButton.addEventListener("click", assumeRequest);
    }

    const acceptButton = $("accept-request");

    if (acceptButton) {
        acceptButton.addEventListener("click", () => {
            decideRequest("ACEITAR");
        });
    }

    const rejectButton = $("reject-request");

    if (rejectButton) {
        rejectButton.addEventListener("click", () => {
            decideRequest("RECUSAR");
        });
    }

    const idSolicitacao = Number(request.id_solicitacao);

    // O container do chat acabou de ser recriado, então zeramos a assinatura.
    chatSignature = "";

    loadChatMessages(idSolicitacao);

    if (request.status === "EM ANALISE") {
        iniciarPollingChat(idSolicitacao);
    } else {
        pararPollingChat();
    }
}

function renderChatMessages(mensagens) {
    const container = $("chat-messages");

    if (!container) return;

    // Só redesenha se a lista mudou. Sem isso, a cada 3 s o chat era
    // reconstruído e rolado para o fim, atrapalhando quem lia mensagens antigas.
    const signature = JSON.stringify(
        mensagens.map((m) => [m.id_mensagem ?? null, m.remetente, m.conteudo_mensagem, m.data_envio])
    );

    if (signature === chatSignature) return;

    chatSignature = signature;

    if (!mensagens.length) {
        container.innerHTML = `
            <p class="chat-empty">
                Nenhuma mensagem enviada ainda.
            </p>
        `;
        return;
    }

    container.innerHTML = mensagens.map((mensagem) => {
        const isAttendant = mensagem.remetente === "ATENDENTE";

        return `
            <article class="chat-message ${isAttendant ? "attendant" : "client"}">

                <span class="chat-message-author">
                    ${isAttendant ? "Você" : "Cliente"}
                </span>

                <p class="chat-message-content">
                    ${escapeHTML(mensagem.conteudo_mensagem)}
                </p>

                <time>
                    ${escapeHTML(formatDate(mensagem.data_envio))}
                </time>

            </article>
        `;
    }).join("");

    container.scrollTop = container.scrollHeight;
}

async function loadChatMessages(idSolicitacao) {
    const container = $("chat-messages");

    if (!container || chatLoadingId === idSolicitacao) return;

    chatLoadingId = idSolicitacao;

    try {
        const data = await mensagemAPI(idSolicitacao);

        // Não atualiza uma solicitação que não está mais aberta.
        if (Number(state.selectedId) !== Number(idSolicitacao)) return;

        renderChatMessages(data.mensagens || []);

    } catch (error) {
        if (Number(state.selectedId) !== Number(idSolicitacao)) return;

        console.error("Erro ao carregar mensagens:", error);

        // Se já havia mensagens na tela, não apaga tudo por causa de uma
        // falha momentânea do polling.
        if (!chatSignature) {
            container.innerHTML = `
                <p class="chat-empty">
                    ${escapeHTML(error.message)}
                </p>
            `;
        }
    } finally {
        if (chatLoadingId === idSolicitacao) {
            chatLoadingId = null;
        }
    }
}

function iniciarPollingChat(idSolicitacao) {
    pararPollingChat();

    chatPolling = setInterval(() => {

        if (document.visibilityState !== "visible") return;

        if (Number(state.selectedId) !== Number(idSolicitacao)) {
            pararPollingChat();
            return;
        }

        loadChatMessages(idSolicitacao);

    }, 3000);
}


function pararPollingChat() {
    if (chatPolling) {
        clearInterval(chatPolling);
        chatPolling = null;
    }
}

async function openDetails(id) {
    state.selectedId = id;
    showMessage("");

    $("list-view").hidden = true;
    $("reports-view").hidden = true;
    $("detail-view").hidden = false;
    $("page-title").textContent = `Solicitação #${id}`;

    $("request-detail").innerHTML = `
        <p class="empty-state">Carregando detalhes...</p>
    `;

    try {
        state.detail = await api(`/solicitacoes/${id}`);
        renderDetails(state.detail);
    } catch (error) {
        showMessage(error.message);

        $("request-detail").innerHTML = `
            <p class="empty-state">
                Não foi possível carregar esta solicitação.
            </p>
        `;
    }
}

// =====================================================
// ASSUMIR E DECIDIR SOLICITAÇÕES
// =====================================================

async function assumeRequest() {
    if (!state.selectedId) return;

    const button = $("take-request");

    if (button) button.disabled = true;

    try {
        const result = await api(
            `/solicitacoes/${state.selectedId}/assumir`,
            { method: "POST" }
        );

        showMessage(
            result.mensagem || "Solicitação assumida com sucesso.",
            true
        );

        await loadLists();
        await openDetails(state.selectedId);
    } catch (error) {
        showMessage(error.message);

        if (button) button.disabled = false;
    }
}


async function decideRequest(decision) {
    if (!state.selectedId) return;

    const noteElement = $("decision-note");
    const note = noteElement ? noteElement.value.trim() : "";

    const modal = $("decision-modal");
    const confirmButton = $("decision-modal-confirm");
    const cancelButton = $("decision-modal-cancel");

    const accepting = decision === "ACEITAR";

    $("decision-modal-title").textContent = accepting
        ? "Aceitar solicitação?"
        : "Recusar solicitação?";

    $("decision-modal-description").textContent = accepting
        ? "Confirma a aprovação desta solicitação? Essa decisão será registrada no histórico de atendimento."
        : "Confirma a recusa desta solicitação? Essa decisão será registrada no histórico de atendimento.";

    $("decision-modal-icon").textContent = accepting ? "✓" : "!";
    $("decision-modal-icon").classList.toggle("danger", !accepting);

    confirmButton.textContent = accepting
        ? "Sim, aceitar"
        : "Sim, recusar";

    confirmButton.classList.toggle("danger", !accepting);

    modal.hidden = false;
    confirmButton.focus();

    const fecharModal = () => {
        modal.hidden = true;
        confirmButton.disabled = false;
        cancelButton.disabled = false;
        confirmButton.onclick = null;
        cancelButton.onclick = null;
        modal.querySelector("[data-close-modal]").onclick = null;
    };

    return new Promise((resolve) => {
        cancelButton.onclick = () => {
            fecharModal();
            resolve();
        };

        modal.querySelector("[data-close-modal]").onclick = () => {
            fecharModal();
            resolve();
        };

        confirmButton.onclick = async () => {
            const buttons = [
                $("accept-request"),
                $("reject-request")
            ];

            setButtonsDisabled(buttons, true);
            confirmButton.disabled = true;
            cancelButton.disabled = true;
            confirmButton.textContent = "Processando...";

            try {
                const result = await api(
                    `/solicitacoes/${state.selectedId}/decisao`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            decisao: decision,
                            observacao: note
                        })
                    }
                );

                fecharModal();

                showMessage(
                    result.mensagem || "Decisão registrada com sucesso.",
                    true
                );

                await loadLists();
                await openDetails(state.selectedId);

                resolve();
            } catch (error) {
                fecharModal();

                showMessage(error.message);

                setButtonsDisabled(buttons, false);
                resolve();
            }
        };
    });
}

// =====================================================
// RELATÓRIOS
// =====================================================

const DASHBOARD_STATUS = [
    { key: "ACEITO", label: "Aceitas", color: "#68e69a" },
    { key: "EM ANALISE", label: "Em análise", color: "#212acf" },
    { key: "NEGADO", label: "Recusadas", color: "#ff9a98" }
];

function destroyDashboardCharts() {
    Object.values(dashboardCharts).forEach((chart) => chart?.destroy());
    Object.keys(dashboardCharts).forEach((key) => delete dashboardCharts[key]);
}

function createDashboardChart(id, config) {
    const canvas = $(id);
    if (!canvas || typeof Chart === "undefined") return null;
    return new Chart(canvas, config);
}

function dashboardDoughnutOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "58%",
        plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 18 } },
            tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed}` } }
        }
    };
}

function renderDashboard(data) {
    destroyDashboardCharts();

    const total = Number(data.indicadores?.total_mes || 0);
    const aprovadas = Number(data.indicadores?.aceitas_mes || 0);
    const negadas = Number(data.indicadores?.negadas_mes || 0);
    const taxa = (valor) => total ? `${((valor / total) * 100).toFixed(1).replace(".", ",")}%` : "0,0%";

    $("dashboard-total-month").textContent = total.toLocaleString("pt-BR");
    $("dashboard-approval-rate").textContent = taxa(aprovadas);
    $("dashboard-rejection-rate").textContent = taxa(negadas);

    const mesNome = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
        new Date(Number(data.ano), Number(data.mes) - 1, 1)
    );
    $("dashboard-period-label").textContent = `Indicadores de ${mesNome} de ${data.ano}. O destaque está no mês atual, com comparação anual.`;
    $("dashboard-month-tag").textContent = mesNome.toLocaleUpperCase("pt-BR");
    $("dashboard-year-tag").textContent = String(data.ano);

    const monthRows = data.mes_atual || [];
    const yearRows = data.ano_atual || [];
    const statusValues = (rows) => DASHBOARD_STATUS.map((status) => {
        const found = rows.find((item) => item.status === status.key);
        return Number(found?.total || 0);
    });
    const colors = DASHBOARD_STATUS.map((item) => item.color);
    const labels = DASHBOARD_STATUS.map((item) => item.label);

    dashboardCharts.month = createDashboardChart("dashboard-month-chart", {
        type: "doughnut",
        data: { labels, datasets: [{ data: statusValues(monthRows), backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }] },
        options: dashboardDoughnutOptions()
    });

    dashboardCharts.year = createDashboardChart("dashboard-year-chart", {
        type: "doughnut",
        data: { labels, datasets: [{ data: statusValues(yearRows), backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }] },
        options: dashboardDoughnutOptions()
    });

    const months = data.por_mes || [];
    dashboardCharts.monthly = createDashboardChart("dashboard-monthly-chart", {
        type: "bar",
        data: {
            labels: months.map((item) => item.nome_mes),
            datasets: [
                { label: "Aceitas", data: months.map((item) => Number(item.aceitas)), backgroundColor: "#68e69a", borderRadius: 4, stack: "solicitacoes" },
                { label: "Em análise", data: months.map((item) => Number(item.em_analise)), backgroundColor: "#212acf", borderRadius: 4, stack: "solicitacoes" },
                { label: "Recusadas", data: months.map((item) => Number(item.negadas)), backgroundColor: "#ff9a98", borderRadius: 4, stack: "solicitacoes" }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { position: "bottom", labels: { usePointStyle: true, padding: 18 } } },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });

    const stores = data.top_lojas || [];
    dashboardCharts.stores = createDashboardChart("dashboard-stores-chart", {
        type: "bar",
        data: { labels: stores.map((item) => item.nome_loja), datasets: [{ label: "Solicitações", data: stores.map((item) => Number(item.total)), backgroundColor: ["#212acf", "#68e69a", "#7df4ed"], borderRadius: 6 }] },
        options: {
            indexAxis: "y", responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } }
        }
    });

    const products = data.por_categoria || [];
    dashboardCharts.products = createDashboardChart("dashboard-products-chart", {
        type: "bar",
        data: { labels: products.map((item) => item.categoria), datasets: [{ label: "Solicitações", data: products.map((item) => Number(item.total)), backgroundColor: ["#212acf", "#68e69a", "#7df4ed"], borderRadius: 6 }] },
        options: {
            indexAxis: "y", responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } }
        }
    });
}

async function loadDashboard() {
    showMessage("");
    $("dashboard-period-label").textContent = "Carregando indicadores...";
    try {
        const data = await api("/relatorios/dashboard");
        renderDashboard(data);
        showMessage("");
    } catch (error) {
        $("dashboard-period-label").textContent = "Não foi possível carregar os indicadores.";
        showMessage(error.message);
    }
}

function reportQueryString() {
    const inicio = $("report-start").value;
    const fim = $("report-end").value;
    const params = new URLSearchParams();

    if (inicio) params.set("inicio", inicio);
    if (fim) params.set("fim", fim);

    const query = params.toString();

    return query ? `?${query}` : "";
}

function validateReportDates() {
    const inicio = $("report-start").value;
    const fim = $("report-end").value;

    if (inicio && fim && inicio > fim) {
        showReportMessage(
            "A data inicial não pode ser posterior à data final."
        );
        return false;
    }

    return true;
}

async function loadStatusReport() {
    showReportMessage("");

    if (!validateReportDates()) return;

    $("report-total").textContent = "…";

    $("report-table-body").innerHTML = `
        <tr>
            <td colspan="3">Carregando dados...</td>
        </tr>
    `;

    try {
        const data = await api(
            `/relatorios/solicitacoes${reportQueryString()}`
        );

        $("report-total").textContent = data.total ?? 0;

        renderStatusChart(data.por_status || []);
        renderMonthChart(data.por_mes || []);
        renderReportTable(data.registros || []);
    } catch (error) {
        $("report-total").textContent = "—";

        $("report-table-body").innerHTML = `
            <tr>
                <td colspan="3">
                    Não foi possível carregar os dados.
                </td>
            </tr>
        `;

        showReportMessage(error.message);
    }
}

function renderStatusChart(items) {
    if (typeof Chart === "undefined") {
        showReportMessage(
            "A biblioteca de gráficos não foi carregada. Verifique o Chart.js no HTML."
        );
        return;
    }

    if (statusChart) {
        statusChart.destroy();
        statusChart = null;
    }

    statusChart = new Chart($("status-chart"), {
        type: "doughnut",
        data: {
            labels: items.map((item) =>
                STATUS_LABELS[item.status] || item.status
            ),
            datasets: [{
                data: items.map((item) => Number(item.total)),
                backgroundColor: ["#212acf", "#68e69a", "#ff9a98"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

function renderMonthChart(items) {
    if (typeof Chart === "undefined") return;

    if (monthChart) {
        monthChart.destroy();
        monthChart = null;
    }

    monthChart = new Chart($("month-chart"), {
        type: "bar",
        data: {
            labels: items.map((item) => {
                const [ano, mes] = String(item.mes || "").split("-");
                return ano && mes ? `${mes}/${ano}` : item.mes || "Não informado";
            }),
            datasets: [{
                label: "Solicitações",
                data: items.map((item) => Number(item.total)),
                backgroundColor: "#212acf",
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function renderReportTable(registros) {
    const tbody = $("report-table-body");

    if (!registros.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3">
                    Nenhuma solicitação encontrada no período.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = registros.map((item) => `
        <tr>
            <td>#${escapeHTML(item.id_solicitacao)}</td>

            <td>
                <span class="status ${statusClass(item.status)}">
                    ${escapeHTML(statusLabel(item.status))}
                </span>
            </td>

            <td>
                ${escapeHTML(formatDate(item.data_solicitacao))}
            </td>
        </tr>
    `).join("");
}

// =====================================================
// RELATÓRIOS DETALHADOS
// =====================================================

const detailedReportCharts = {};

function destroyDetailedReportCharts() {
    Object.values(detailedReportCharts).forEach((chart) => {
        chart?.destroy();
    });

    Object.keys(detailedReportCharts).forEach((key) => {
        delete detailedReportCharts[key];
    });
}

function createDetailedReportChart(id, config) {
    const canvas = $(id);

    if (!canvas || typeof Chart === "undefined") {
        return null;
    }

    return new Chart(canvas, config);
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("pt-BR");
}


function formatDuration(seconds) {
    if (
        seconds === null ||
        seconds === undefined ||
        Number.isNaN(Number(seconds))
    ) {
        return "Não calculado";
    }

    const total = Math.max(0, Math.floor(Number(seconds)));

    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}min`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes}min`;
    }

    return `${minutes}min`;
}


function formatMonth(value) {
    if (!value) return "Não informado";

    const [year, month] = String(value).split("-");

    return year && month
        ? `${month}/${year}`
        : value;
}

function renderReportMetrics(metrics) {
    return `
        <div class="report-metrics">
            ${metrics.map((metric) => `
                <article class="summary-card">
                    <p>${escapeHTML(metric.label)}</p>
                    <strong>${escapeHTML(metric.value)}</strong>
                </article>
            `).join("")}
        </div>
    `;
}

function renderDetailedTable(title, columns, rows, emptyMessage) {
    const tableRows = rows.length
        ? rows.map((row) => `
            <tr>
                ${columns.map((column) => `
                    <td>
                        ${escapeHTML(row[column.key] ?? "Não informado")}
                    </td>
                `).join("")}
            </tr>
        `).join("")
        : `
            <tr>
                <td colspan="${columns.length}">
                    ${escapeHTML(emptyMessage)}
                </td>
            </tr>
        `;

    return `
        <article class="report-chart-card">
            <h3>${escapeHTML(title)}</h3>

            <div class="report-table-wrapper">
                <table class="report-table">
                    <thead>
                        <tr>
                            ${columns.map((column) => `
                                <th>${escapeHTML(column.label)}</th>
                            `).join("")}
                        </tr>
                    </thead>

                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </article>
    `;
}

// =====================================================
// PRODUTIVIDADE POR LOJA
// =====================================================

function renderStoreProductivity(data) {
    const container = $("generic-report-results");

    if (!container) return;

    destroyDetailedReportCharts();

    const lojas = data.lojas || [];

    const total = Number(data.total || 0);

    const aceitas = lojas.reduce(
        (sum, loja) => sum + Number(loja.aceitas || 0),
        0
    );

    const emAnalise = lojas.reduce(
        (sum, loja) => sum + Number(loja.em_analise || 0),
        0
    );

    const negadas = lojas.reduce(
        (sum, loja) => sum + Number(loja.negadas || 0),
        0
    );

    if (!lojas.length) {
        container.innerHTML = `
            <p class="empty-state">
                Nenhuma solicitação de cartão encontrada no período.
            </p>
        `;
        return;
    }

    container.innerHTML = `
        ${renderReportMetrics([
        { label: "Total de solicitações", value: formatNumber(total) },
        { label: "Aceitas", value: formatNumber(aceitas) },
        { label: "Em análise", value: formatNumber(emAnalise) },
        { label: "Recusadas", value: formatNumber(negadas) }
    ])}

        <div class="report-chart-grid">
            <article class="report-chart-card">
                <h3>Solicitações por loja</h3>

                <p>
                    Comparativo de solicitações aceitas, recusadas e em análise.
                </p>

                <div class="chart-container">
                    <canvas id="store-productivity-chart"></canvas>
                </div>
            </article>
        </div>

        ${renderDetailedTable(
        "Detalhamento por loja",
        [
            { key: "nome_loja", label: "Loja" },
            { key: "total", label: "Total" },
            { key: "aceitas", label: "Aceitas" },
            { key: "em_analise", label: "Em análise" },
            { key: "negadas", label: "Recusadas" }
        ],
        lojas.map((loja) => ({
            nome_loja: loja.nome_loja,
            total: formatNumber(loja.total),
            aceitas: formatNumber(loja.aceitas),
            em_analise: formatNumber(loja.em_analise),
            negadas: formatNumber(loja.negadas)
        })),
        "Nenhuma loja encontrada."
    )}
    `;

    detailedReportCharts.stores = createDetailedReportChart(
        "store-productivity-chart",
        {
            type: "bar",

            data: {
                labels: lojas.map((loja) => loja.nome_loja),

                datasets: [
                    {
                        label: "Aceitas",
                        data: lojas.map((loja) => Number(loja.aceitas || 0)),
                        backgroundColor: "#68e69a",
                        borderRadius: 4
                    },
                    {
                        label: "Em análise",
                        data: lojas.map((loja) => Number(loja.em_analise || 0)),
                        backgroundColor: "#212acf",
                        borderRadius: 4
                    },
                    {
                        label: "Recusadas",
                        data: lojas.map((loja) => Number(loja.negadas || 0)),
                        backgroundColor: "#ff9a98",
                        borderRadius: 4
                    }
                ]
            },

            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            padding: 18
                        }
                    }
                },

                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    },

                    y: {
                        stacked: true,
                        grid: { display: false }
                    }
                }
            }
        }
    );
}

// =====================================================
// TEMPO DE ANÁLISE
// =====================================================

function renderAnalysisTime(data) {
    const container = $("generic-report-results");

    if (!container) return;

    destroyDetailedReportCharts();

    const registros = data.registros || [];
    const meses = data.por_mes || [];

    const mediaGeral = formatDuration(data.tempo_medio_segundos);
    const mediaPendente = formatDuration(
        data.tempo_medio_pendente_segundos
    );

    const maiorPendente = formatDuration(
        data.maior_tempo_pendente_segundos
    );

    const concluidas = Number(data.concluidas || 0);
    const pendentes = Number(data.pendentes || 0);

    const registrosTabela = registros.map((item) => ({
        id: `#${item.id_solicitacao}`,
        status: statusLabel(item.status),
        solicitacao: formatDate(item.data_solicitacao),
        conclusao: item.data_conclusao
            ? formatDate(item.data_conclusao)
            : "Pendente",
        tempo: item.tempo_analise_segundos !== null &&
            item.tempo_analise_segundos !== undefined
            ? formatDuration(item.tempo_analise_segundos)
            : "Não concluída",
        espera: item.tempo_pendente_segundos !== null &&
            item.tempo_pendente_segundos !== undefined
            ? formatDuration(item.tempo_pendente_segundos)
            : "—"
    }));

    container.innerHTML = `
        ${renderReportMetrics([
        {
            label: "Tempo médio de análise",
            value: mediaGeral
        },
        {
            label: "Solicitações concluídas",
            value: formatNumber(concluidas)
        },
        {
            label: "Solicitações pendentes",
            value: formatNumber(pendentes)
        },
        {
            label: "Tempo médio em espera",
            value: mediaPendente
        },
        {
            label: "Maior tempo em espera",
            value: maiorPendente
        }
    ])}

        <div class="report-chart-grid">
            <article class="report-chart-card">
                <h3>Tempo médio de análise por mês</h3>

                <p>
                    Considera apenas solicitações concluídas com tempo calculável.
                </p>

                <div class="chart-container">
                    <canvas id="analysis-time-chart"></canvas>
                </div>
            </article>
        </div>

        ${renderDetailedTable(
        "Solicitações no período",
        [
            { key: "id", label: "Solicitação" },
            { key: "status", label: "Status" },
            { key: "solicitacao", label: "Data da solicitação" },
            { key: "conclusao", label: "Data da conclusão" },
            { key: "tempo", label: "Tempo de análise" },
            { key: "espera", label: "Tempo em espera" }
        ],
        registrosTabela,
        "Nenhuma solicitação encontrada no período."
    )}
    `;

    detailedReportCharts.analysis = createDetailedReportChart(
        "analysis-time-chart",
        {
            type: "bar",

            data: {
                labels: meses.map((item) => formatMonth(item.mes)),

                datasets: [
                    {
                        label: "Tempo médio de análise",
                        data: meses.map((item) =>
                            Number(item.tempo_medio_segundos || 0) / 3600
                        ),
                        backgroundColor: "#212acf",
                        borderRadius: 5
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label: (context) =>
                                ` ${formatDuration(context.parsed.y * 3600)}`
                        }
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Horas"
                        }
                    }
                }
            }
        }
    );
}

// =====================================================
// TIPOS DE CARTÃO
// =====================================================

function renderCardTypes(data) {
    const container = $("generic-report-results");

    if (!container) return;

    destroyDetailedReportCharts();

    const tipos = data.por_tipo || [];
    const mesesTipos = data.por_mes_tipo || [];

    const total = Number(data.total || 0);

    if (!tipos.length) {
        container.innerHTML = `
            <p class="empty-state">
                Nenhuma solicitação de cartão encontrada no período.
            </p>
        `;
        return;
    }

    const nomesTipos = [
        ...new Set(mesesTipos.map((item) => item.tipo_cartao))
    ];

    const palette = [
        "#212acf",
        "#68e69a",
        "#7df4ed",
        "#ffe372",
        "#ff9a98"
    ];

    const meses = [
        ...new Set(mesesTipos.map((item) => item.mes))
    ];

    const datasets = nomesTipos.map((tipo, index) => ({
        label: tipo,
        data: meses.map((mes) => {
            const registro = mesesTipos.find(
                (item) =>
                    item.mes === mes &&
                    item.tipo_cartao === tipo
            );

            return Number(registro?.total || 0);
        }),
        backgroundColor: palette[index % palette.length],
        borderRadius: 4,
        stack: "cartoes"
    }));

    container.innerHTML = `
        ${renderReportMetrics([
        {
            label: "Total de solicitações",
            value: formatNumber(total)
        },
        {
            label: "Tipos de cartão",
            value: formatNumber(tipos.length)
        }
    ])}

        <div class="report-chart-grid">
            <article class="report-chart-card">
                <h3>Distribuição por tipo de cartão</h3>

                <div class="chart-container">
                    <canvas id="card-types-chart"></canvas>
                </div>
            </article>

            <article class="report-chart-card">
                <h3>Evolução mensal por tipo</h3>

                <div class="chart-container">
                    <canvas id="card-types-month-chart"></canvas>
                </div>
            </article>
        </div>

        ${renderDetailedTable(
        "Solicitações por tipo de cartão",
        [
            { key: "tipo", label: "Tipo de cartão" },
            { key: "total", label: "Solicitações" }
        ],
        tipos.map((item) => ({
            tipo: item.tipo_cartao,
            total: formatNumber(item.total)
        })),
        "Nenhum tipo de cartão encontrado."
    )}
    `;

    detailedReportCharts.cardTypes = createDetailedReportChart(
        "card-types-chart",
        {
            type: "doughnut",

            data: {
                labels: tipos.map((item) => item.tipo_cartao),

                datasets: [{
                    data: tipos.map((item) => Number(item.total || 0)),
                    backgroundColor: palette,
                    borderWidth: 0
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "58%",

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            padding: 18
                        }
                    }
                }
            }
        }
    );

    detailedReportCharts.cardTypesMonth = createDetailedReportChart(
        "card-types-month-chart",
        {
            type: "bar",

            data: {
                labels: meses.map(formatMonth),
                datasets
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            padding: 18
                        }
                    }
                },

                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },

                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        }
    );
}

async function downloadReport(format) {
    if (!validateReportDates()) return;

    if (!["pdf", "xlsx"].includes(format)) {
        showReportMessage("Formato de arquivo inválido.");
        return;
    }

    const url =
        `${API}/relatorios/solicitacoes/exportar/${format}` +
        reportQueryString();

    const buttons = [$("export-pdf"), $("export-excel")];

    setButtonsDisabled(buttons, true);
    showReportMessage("Gerando arquivo...");

    try {
        const response = await fetch(url, {
            method: "GET",
            credentials: "include"
        });

        if (response.status === 401) {
            window.location.replace("login.html");
            return;
        }

        if (!response.ok) {
            const contentType =
                response.headers.get("content-type") || "";

            let mensagem = "Não foi possível gerar o relatório.";

            if (contentType.includes("application/json")) {
                const error = await response.json();
                mensagem = error.mensagem || mensagem;
            }

            throw new Error(mensagem);
        }

        const blob = await response.blob();

        if (!blob.size) {
            throw new Error("O servidor retornou um arquivo vazio.");
        }

        const objectURL = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectURL;
        link.download = format === "pdf"
            ? "relatorio_solicitacoes.pdf"
            : "relatorio_solicitacoes.xlsx";

        document.body.appendChild(link);
        link.click();
        link.remove();

        showReportMessage("Arquivo gerado com sucesso!", true);

        // Libera a URL só depois de dar tempo ao navegador de iniciar o
        // download (antes ela era revogada imediatamente, o que podia
        // cancelar o download em alguns navegadores).
        setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
    } catch (error) {
        showReportMessage(error.message);
    } finally {
        setButtonsDisabled(buttons, false);
    }

}

function closeReport() {
    $("report-viewer").hidden = true;
    $("report-catalog").hidden = false;

    if (statusChart) {
        statusChart.destroy();
        statusChart = null;
    }

    if (monthChart) {
        monthChart.destroy();
        monthChart = null;
    }

    destroyDetailedReportCharts();
}

function prepareReportViewer(type) {
    const report = reportDefinitions[type];

    if (!report) return;

    activeReportType = type;

    destroyDetailedReportCharts();

    $("report-catalog").hidden = true;
    $("report-viewer").hidden = false;

    $("report-title").textContent = report.title;
    $("report-description").textContent = report.description;

    $("report-results").innerHTML = type === "status"
        ? reportResultsTemplate
        : `
            <div id="generic-report-results">
                <p class="empty-state">Carregando relatório...</p>
            </div>
        `;

    document.querySelector(".report-toolbar").hidden = !report.exports;
    document.querySelector(".report-filters").hidden = false;

    showReportMessage("");
}


async function openReport(type) {
    const report = reportDefinitions[type];

    if (!report) return;

    prepareReportViewer(type);

    if (!validateReportDates()) return;

    if (type === "status") {
        await loadStatusReport();
        return;
    }

    const container = $("generic-report-results");

    if (container) {
        container.innerHTML = `
            <p class="empty-state">Consultando o servidor...</p>
        `;
    }

    try {
        const data = await api(
            `${report.endpoint}${reportQueryString()}`
        );

        switch (type) {
            case "products":
                renderStoreProductivity(data);
                break;

            case "performance":
                renderAnalysisTime(data);
                break;

            case "cardTypes":
                renderCardTypes(data);
                break;

            default:
                throw new Error("Tipo de relatório desconhecido.");
        }

    } catch (error) {
        if (container) {
            container.innerHTML = `
                <p class="empty-state">
                    Não foi possível exibir este relatório.
                </p>
            `;
        }

        showReportMessage(error.message);
    }
}

// =====================================================
// EVENTOS DA INTERFACE
// =====================================================

document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", async () => {
        const view = button.dataset.view;

        showView(view);

        if (view === "pendentes" || view === "meus") {
            await loadLists();
        }
    });
});

$("search-input").addEventListener("input", renderList);
$("status-filter").addEventListener("change", renderList);

$("refresh-button").addEventListener("click", async () => {
    if (state.view === "relatorios") {
        await loadDashboard();
        return;
    }

    if (state.selectedId) {
        const id = state.selectedId;

        await loadLists();
        await openDetails(id);
    } else {
        await loadLists();
    }
});

$("back-button").addEventListener("click", () => {

    pararPollingChat();

    $("detail-view").hidden = true;
    $("reports-view").hidden = true;
    $("list-view").hidden = false;

    $("page-title").textContent =
        state.view === "meus"
            ? "Meus atendimentos"
            : "Solicitações pendentes";

    state.selectedId = null;
    state.detail = null;

    renderList();
});

$("logout-button").addEventListener("click", async () => {
    try {
        await api("/logout", {
            method: "POST"
        });
    } catch (error) {
        console.error("Erro ao encerrar a sessão:", error);
    } finally {
        window.location.replace("login.html");
    }
});

// =====================================================
// EVENTOS DOS RELATÓRIOS
// =====================================================

$("open-status-report").addEventListener("click", () => {
    openReport("status");
});

$("open-products-report").addEventListener("click", () => {
    openReport("products");
});

$("open-performance-report").addEventListener("click", () => {
    openReport("performance");
});

$("back-reports").addEventListener("click", () => {
    closeReport();
    $("report-results").innerHTML = reportResultsTemplate;
    $("report-title").textContent = reportDefinitions.status.title;
    $("report-description").textContent =
        reportDefinitions.status.description;
    $("report-message").hidden = true;
});

$("apply-report-filters").addEventListener("click", () => {
    openReport(activeReportType);
});

$("clear-report-filters").addEventListener("click", () => {
    $("report-start").value = "";
    $("report-end").value = "";
    openReport(activeReportType);
});

$("export-pdf").addEventListener("click", () => {
    downloadReport("pdf");
});

$("export-excel").addEventListener("click", () => {
    downloadReport("xlsx");
});

const cardTypesButton = $("open-card-types-report");

if (cardTypesButton) {
    cardTypesButton.addEventListener("click", () => {
        openReport("cardTypes");
    });
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function init() {
    try {
        const session = await api("/sessao");

        state.idAtendente = Number(session.id_atendente);

        $("profile-name").textContent =
            session.nome_atendente || `Atendente #${state.idAtendente}`;

        // Inicial do nome (antes havia uma linha seguinte que
        // sobrescrevia isso e deixava sempre "A").
        $("profile-avatar").textContent =
            ($("profile-name").textContent.trim()[0] || "A").toUpperCase();

        showView("pendentes");
        await loadLists();
    } catch (error) {
        if (!error.message.toLowerCase().includes("sessão")) {
            showMessage(error.message);
        }
    }
}

init();