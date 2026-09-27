type Status = "analise" | "aprovada" | "rejeitada";

interface Solicitacao {
  id: number;
  nome: string;
  cpf: string;
  cartao: string;
  status: "EM ANALISE" | "ACEITO" | "NEGADO";
  pre_qualificacao: "EM ANALISE" | "CONCLUIDA";
}

interface ApiError {
  erro: string;
}

interface StatusContent {
  resultMessage: string;
  resultDetail: string;
  noticeTitle: string;
  noticeMessage: string;
  noticeIcon: string;
}

const contentByStatus: Record<Status, StatusContent> = {
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

const page = document.querySelector<HTMLElement>(".status-page");
const prequalificationCard = document.querySelector<HTMLElement>("#prequalification-card");
const prequalificationIcon = document.querySelector<HTMLElement>("#prequalification-icon");
const prequalificationTitle = document.querySelector<HTMLElement>("#prequalification-title");
const prequalificationMessage = document.querySelector<HTMLElement>("#prequalification-message");
const prequalificationDescription = document.querySelector<HTMLElement>("#prequalification-description");
const prequalificationStep = document.querySelector<HTMLElement>("#prequalification-step");
const creditStep = document.querySelector<HTMLElement>("#credit-step");
const resultStep = document.querySelector<HTMLElement>("#result-step");
const progressSegmentOne = document.querySelector<HTMLElement>("#progress-segment-one");
const progressSegmentTwo = document.querySelector<HTMLElement>("#progress-segment-two");
const creditCard = document.querySelector<HTMLElement>("#credit-card");
const creditIcon = document.querySelector<HTMLElement>("#credit-icon");
const resultCard = document.querySelector<HTMLElement>("#result-card");
const resultIcon = document.querySelector<HTMLElement>("#result-icon");
const resultMessage = document.querySelector<HTMLElement>("#result-message");
const resultDetail = document.querySelector<HTMLElement>("#result-detail");
const noticeIcon = document.querySelector<HTMLElement>("#notice-icon");
const noticeTitle = document.querySelector<HTMLElement>("#notice-title");
const noticeMessage = document.querySelector<HTMLElement>("#notice-message");
const creditDescription = document.querySelector<HTMLElement>("#credit-description");
const creditNote = document.querySelector<HTMLElement>("#credit-note");
const userName = document.querySelector<HTMLElement>("#user-name");
const userCpf = document.querySelector<HTMLElement>("#user-cpf");
const requestType = document.querySelector<HTMLElement>("#request-type");
const userAvatar = document.querySelector<HTMLElement>("#user-avatar");
const refreshStatusButton = document.querySelector<HTMLButtonElement>("#refresh-status");
const notFoundState = document.querySelector<HTMLElement>("#not-found-state");
let activeRequestId: number | null = null;

function ocultarSolicitacaoNaoEncontrada(): void {
  if (!notFoundState) return;
  notFoundState.setAttribute("hidden", "true");
  notFoundState.style.display = "none";
}

function setLoadingIcon(element: HTMLElement): void {
  element.innerHTML = '<svg class="hourglass-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m17.029,12c2.033-1.972,3.971-4.837,3.971-8.591,0-1.88-1.529-3.409-3.409-3.409H6.409c-1.88,0-3.409,1.53-3.409,3.41,0,3.754,1.945,6.619,3.986,8.591-2.041,1.971-3.986,4.835-3.986,8.59v3.409h18v-3.409c0-3.753-1.938-6.619-3.971-8.591Zm.971,9H6v-.409c0-3.385,2.281-5.9,4.195-7.414l1.487-1.176-1.487-1.176c-1.914-1.514-4.195-4.03-4.195-7.415,0-.226.184-.409.409-.409h11.182c.226,0,.409.183.409.409,0,3.385-2.271,5.901-4.177,7.417l-1.476,1.174,1.476,1.174c1.905,1.516,4.177,4.032,4.177,7.417v.409Zm-5.422-11.739l-.566.45-.576-.456c-1.229-.973-2.644-2.427-3.197-4.255h7.524c-.55,1.831-1.96,3.287-3.184,4.261Z" /></svg>';
}

function setClockIcon(element: HTMLElement): void {
  element.innerHTML = '<span class="clock-icon" aria-hidden="true"></span>';
}

function setPendingDots(element: HTMLElement): void {
  element.innerHTML = '<span class="status-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
}

function setCompletedIcon(element: HTMLElement): void {
  element.className = "status-card__icon prequalification-icon";
  element.textContent = "✓";
}

function updateTimeline(currentStep: number, resultStatus?: "aprovada" | "rejeitada"): void {
  const steps = [prequalificationStep, creditStep, resultStep];
  steps.forEach((step, index) => {
    if (!step) return;
    step.classList.toggle("step--current", index === currentStep);
    step.classList.toggle("step--done", index < currentStep);
    const icon = step.querySelector<HTMLElement>(".step__icon");
    if (!icon) return;
    if (index === currentStep) {
      if (index === 2 && resultStatus === "rejeitada") {
        step.classList.add("step--rejected");
        step.classList.remove("step--approved");
        icon.innerHTML = '<span class="timeline-x" aria-hidden="true"></span>';
      } else if (index === 2 && resultStatus === "aprovada") {
        step.classList.add("step--approved");
        step.classList.remove("step--rejected");
        icon.textContent = "✓";
      } else {
        step.classList.remove("step--approved", "step--rejected");
        icon.innerHTML = '<span class="clock-icon" aria-hidden="true"></span>';
      }
    } else if (index < currentStep) {
      icon.textContent = "✓";
    } else {
      icon.textContent = "•";
    }
  });
  progressSegmentOne?.classList.toggle("is-complete", currentStep >= 1);
  progressSegmentTwo?.classList.toggle("is-complete", currentStep >= 2);
}

document.querySelectorAll<HTMLAnchorElement>("[data-landing-placeholder]").forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

function getRequestId(): number | null {
  const value = new URLSearchParams(window.location.search).get("solicitacao");
  if (!value) return null;

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function mapStatus(status: Solicitacao["status"]): Status {
  if (status === "ACEITO") return "aprovada";
  if (status === "NEGADO") return "rejeitada";
  return "analise";
}

function renderStatus(solicitacao: Solicitacao): void {
  const status = mapStatus(solicitacao.status);
  const content = contentByStatus[status];
  if (!page || !prequalificationCard || !prequalificationIcon || !prequalificationTitle || !prequalificationMessage || !prequalificationDescription || !prequalificationStep || !creditStep || !resultStep || !creditCard || !creditIcon || !resultCard || !resultIcon || !resultMessage || !resultDetail || !noticeIcon || !noticeTitle || !noticeMessage || !creditDescription || !creditNote || !userName || !userCpf || !requestType || !userAvatar) return;

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
  } else {
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
  } else {
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
  } else if (status === "analise") {
    resultIcon.className = "status-card__icon result-pending-icon";
    setPendingDots(resultIcon);
  } else {
    resultIcon.className = "status-card__icon";
    resultIcon.textContent = content.noticeIcon;
  }
  resultMessage.textContent = status === "analise" ? "Aguardando" : content.resultMessage;
  resultMessage.classList.toggle("result-status--pending", status === "analise");
  resultDetail.textContent = content.resultDetail;
  if (content.noticeIcon === "⌛") {
    setLoadingIcon(noticeIcon);
  } else {
    noticeIcon.textContent = content.noticeIcon;
  }
  noticeTitle.textContent = prequalificationPending
    ? "Análise de Pré-Qualificação"
    : content.noticeTitle.replace("{nome}", solicitacao.nome);
  noticeMessage.textContent = prequalificationPending
    ? "Estamos a rever as suas informações básicas. Assim que concluirmos esta triagem inicial, informaremos se o seu pedido avança para a análise de crédito detalhada."
    : content.noticeMessage;
  refreshStatusButton?.toggleAttribute("hidden", !(status === "analise" && !prequalificationPending));
  creditDescription.textContent = status === "analise" ? "Sua solicitação está em análise. Estamos revisando seus dados e documentos." : "A análise da sua solicitação foi concluída.";
  creditNote.textContent = status === "analise" ? "A solicitação ainda não foi concluída. Uma especialista entrará em contato se necessário." : "Confira o resultado da análise no próximo cartão.";
  resultCard.setAttribute("aria-label", `Resultado: ${content.resultMessage.toLowerCase()}`);
}

async function carregarSolicitacao(id: number): Promise<void> {
  activeRequestId = id;
  ocultarSolicitacaoNaoEncontrada();
  try {
    const response = await fetch(`http://localhost:5001/api/solicitacoes/${id}`);
    const body: Solicitacao | ApiError = await response.json();
    if (response.status === 404) {
      mostrarSolicitacaoNaoEncontrada();
      return;
    }
    if (!response.ok) throw new Error((body as ApiError).erro);
    renderStatus(body as Solicitacao);
  } catch (error) {
    console.error("Não foi possível carregar a solicitação:", error);
    if (noticeTitle) noticeTitle.textContent = "Não foi possível carregar a solicitação";
    if (noticeMessage) noticeMessage.textContent = "Verifique se o backend Flask está em execução e tente novamente.";
  }
}

refreshStatusButton?.addEventListener("click", () => {
  if (activeRequestId === null || !refreshStatusButton) return;
  refreshStatusButton.disabled = true;
  refreshStatusButton.textContent = "Atualizando...";
  void carregarSolicitacao(activeRequestId).finally(() => {
    if (!refreshStatusButton) return;
    refreshStatusButton.disabled = false;
    refreshStatusButton.textContent = "Atualizar Status";
  });
});

function mostrarSolicitacaoAusente(): void {
  ocultarSolicitacaoNaoEncontrada();
  page?.setAttribute("data-status", "analise");
  updateTimeline(0);
  prequalificationCard?.classList.add("status-card--active");
  prequalificationCard?.classList.remove("status-card--upcoming");
  creditCard?.classList.remove("status-card--active");
  creditCard?.classList.add("status-card--upcoming");
  resultCard?.classList.remove("status-card--active");
  resultCard?.classList.add("status-card--upcoming");
  refreshStatusButton?.setAttribute("hidden", "");
  if (noticeTitle) noticeTitle.textContent = "Análise de Pré-Qualificação";
  if (noticeMessage) noticeMessage.textContent = "Estamos a rever as suas informações básicas. Assim que concluirmos esta triagem inicial, informaremos se o seu pedido avança para a análise de crédito detalhada.";
}

const requestId = getRequestId();
if (requestId === null) {
  mostrarSolicitacaoAusente();
} else {
  void carregarSolicitacao(requestId);
}

function mostrarSolicitacaoNaoEncontrada(): void {
  page?.setAttribute("data-view", "not-found");
  const requestId = getRequestId();

  if (requestId === null) {
    mostrarSolicitacaoAusente();
    return;
  }

  notFoundState?.removeAttribute("hidden");
}