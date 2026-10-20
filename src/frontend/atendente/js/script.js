
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

const reportResultsTemplate = $("report-results").innerHTML;

const reportDefinitions = {
    status: {
        title: "Solicitações por status",
        description: "Distribuição por status e evolução mensal.",
        endpoint: "/relatorios/solicitacoes",
        exports: true
    },
    products: {
        title: "Produtos mais solicitados",
        description: "Consulte os produtos e serviços com maior volume de solicitações.",
        endpoint: "/relatorios/produtos",
        exports: false
    },
    performance: {
        title: "Desempenho do atendimento",
        description: "Consulte os indicadores de volume e tempo de atendimento.",
        endpoint: "/relatorios/desempenho",
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
    state.view = view;
    state.selectedId = null;
    state.detail = null;

    $("list-view").hidden = view === "relatorios";
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
        `${filtered.length} ${
            filtered.length === 1 ? "registro" : "registros"
        }`;

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

            <td>${escapeHTML(formatDate(item.data_referencia))}</td>
        </tr>
    `).join("");
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

        URL.revokeObjectURL(objectURL);

        showReportMessage("Arquivo gerado com sucesso!", true);

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
}

function prepareReportViewer(type) {
    const report = reportDefinitions[type];

    activeReportType = type;

    if (!report) return;

    $("report-catalog").hidden = true;
    $("report-viewer").hidden = false;

    $("report-title").textContent = report.title;
    $("report-description").textContent = report.description;

    $("report-results").innerHTML = type === "status"
        ? reportResultsTemplate
        : `<div id="generic-report-results">
               <p class="empty-state">Carregando relatório...</p>
           </div>`;

    document.querySelector(".report-toolbar").hidden = !report.exports;
    document.querySelector(".report-filters").hidden = false;

    showReportMessage("");
}

function renderGenericReport(data) {
    const container = $("generic-report-results");

    if (!container) return;

    // Aceita tanto os dados diretamente quanto um objeto "relatorio".
    const report = data.relatorio || data;
    const ignoredKeys = new Set(["success", "mensagem", "relatorio"]);

    const entries = Object.entries(report).filter(
        ([key]) => !ignoredKeys.has(key)
    );

    const metrics = [];
    const tables = [];

    for (const [key, value] of entries) {
        if (Array.isArray(value)) {
            if (value.length > 0 && value.every(
                item => item && typeof item === "object"
                    && !Array.isArray(item)
            )) {
                tables.push({ key, rows: value });
            } else {
                metrics.push({
                    label: key,
                    value: value.length
                });
            }
        } else if (value === null || typeof value !== "object") {
            metrics.push({ label: key, value: value ?? "Não informado" });
        } else {
            metrics.push({
                label: key,
                value: JSON.stringify(value)
            });
        }
    }

    const labelize = (key) => String(key)
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());

    const metricHTML = metrics.length
        ? `<div class="report-metrics">
            ${metrics.map(metric => `
                <article class="summary-card">
                    <p>${escapeHTML(labelize(metric.label))}</p>
                    <strong>${escapeHTML(metric.value)}</strong>
                </article>
            `).join("")}
           </div>`
        : "";

    const tableHTML = tables.map(({ key, rows }) => {
        const columns = [...new Set(rows.flatMap(
            row => Object.keys(row)
        ))];

        return `
            <article class="report-chart-card">
                <h3>${escapeHTML(labelize(key))}</h3>
                <div class="report-table-wrapper">
                    <table class="report-table">
                        <thead>
                            <tr>
                                ${columns.map(column => `
                                    <th>${escapeHTML(labelize(column))}</th>
                                `).join("")}
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(row => `
                                <tr>
                                    ${columns.map(column => {
                                        const value = row[column];

                                        const displayValue =
                                            value === null || value === undefined
                                                ? "Não informado"
                                                : typeof value === "object"
                                                    ? JSON.stringify(value)
                                                    : value;

                                        return `<td>${escapeHTML(displayValue)}</td>`;
                                    }).join("")}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </article>
        `;
    }).join("");

    if (!metricHTML && !tableHTML) {
        container.innerHTML = `
            <p class="empty-state">
                A rota respondeu, mas não retornou dados para exibir.
            </p>
        `;
        return;
    }

    container.innerHTML = metricHTML + tableHTML;
}

async function openReport(type) {
    const report = reportDefinitions[type];

    if (!report) return;

    prepareReportViewer(type);

    if (type === "status") {
        await loadStatusReport();
        return;
    }

    if (!validateReportDates()) return;

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

        renderGenericReport(data);
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
    if (state.selectedId) {
        const id = state.selectedId;

        await loadLists();
        await openDetails(id);
    } else {
        await loadLists();
    }
});

$("back-button").addEventListener("click", () => {
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

let activeReportType = "status";

$("open-status-report").addEventListener("click", () => {
    activeReportType = "status";
    openReport("status");
});

$("open-products-report").addEventListener("click", () => {
    activeReportType = "products";
    openReport("products");
});

$("open-performance-report").addEventListener("click", () => {
    activeReportType = "performance";
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

// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function init() {
    try {
        const session = await api("/sessao");

        state.idAtendente = Number(session.id_atendente);

        $("profile-name").textContent =
            session.nome_atendente || `Atendente #${state.idAtendente}`;

        $("profile-avatar").textContent =
            ($("profile-name").textContent.trim()[0] || "A").toUpperCase();

        $("profile-avatar").textContent = "A";

        showView("pendentes");
        await loadLists();
    } catch (error) {
        if (!error.message.toLowerCase().includes("sessão")) {
            showMessage(error.message);
        }
    }
}

init();
