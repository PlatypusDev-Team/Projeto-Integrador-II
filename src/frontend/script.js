"use strict";
/**
 * Busca de shoppings próximos por CEP — Landing page DM
 * --------------------------------------------------------
 * Este script:
 * 1. Captura o submit do formulário de CEP
 * 2. Faz uma chamada fetch para o backend Python (Flask)
 * 3. Mostra estados de loading / erro / sucesso
 * 4. Renderiza os shoppings retornados em cards
 *
 * O TS conversa com o backend por HTTP simples (fetch + JSON) — o backend
 * não precisa saber nada sobre o frontend, e o frontend só depende do
 * contrato JSON exposto em GET /api/shoppings/<cep>.
 */
// URL base da API Python. Em produção, trocar pelo domínio real
// (ex: variável de ambiente injetada no build).
const API_BASE_URL = "http://localhost:5000";
const form = document.getElementById("cep-form");
const input = document.getElementById("cep-input");
const submitButton = document.getElementById("cep-submit");
const feedback = document.getElementById("cep-feedback");
const resultsContainer = document.getElementById("results");
/** Formata o campo como 00000-000 enquanto o usuário digita. */
function formatarCep(valor) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    if (digitos.length <= 5)
        return digitos;
    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}
input.addEventListener("input", () => {
    input.value = formatarCep(input.value);
});
function setFeedback(mensagem, estado) {
    feedback.textContent = mensagem;
    if (estado) {
        feedback.dataset.state = estado;
    }
    else {
        delete feedback.dataset.state;
    }
}
function limparResultados() {
    resultsContainer.innerHTML = "";
}
function renderizarShoppings(dados) {
    limparResultados();
    if (dados.shoppings.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "cep-finder__empty";
        vazio.textContent = "Não encontramos shoppings cadastrados perto desse CEP ainda.";
        resultsContainer.appendChild(vazio);
        return;
    }
    dados.shoppings.forEach((shopping, index) => {
        const card = document.createElement("article");
        card.className = "shopping-card";
        card.dataset.rank = String(index + 1);
        card.innerHTML = `
      <span class="shopping-card__rank">${index + 1}</span>
      <div class="shopping-card__info">
        <p class="shopping-card__name">${shopping.nome}</p>
        <p class="shopping-card__address">${shopping.endereco}</p>
      </div>
      <span class="shopping-card__distance">${shopping.distancia_km} km</span>
    `;
        resultsContainer.appendChild(card);
    });
}
async function buscarShoppings(cep) {
    submitButton.disabled = true;
    setFeedback("Buscando shoppings perto de você...", "loading");
    limparResultados();
    let resposta;

    try {
        resposta = await fetch(`${API_BASE_URL}/api/shoppings/${cep}`);
    }
    catch (erroDeRede) {
        console.error("Falha ao conectar na API:", erroDeRede);
        setFeedback(`Não foi possível conectar à API em ${API_BASE_URL}. Verifique se o backend Flask está rodando.`, "erro");
        submitButton.disabled = false;
        return;
    }

    let corpo;

    try {
        corpo = await resposta.json();
    }
    catch (erroDeParse) {
        console.error("Resposta da API não é JSON válido:", erroDeParse);
        setFeedback("A API respondeu de forma inesperada. Veja o console para mais detalhes.", "erro");
        submitButton.disabled = false;
        return;
    }
    if (!resposta.ok) {
        const erro = corpo;
        setFeedback(erro.erro ?? "Não foi possível buscar os shoppings agora.", "erro");
        submitButton.disabled = false;
        return;
    }
    const dados = corpo;
    setFeedback(`Mostrando shoppings perto de ${dados.cidade}/${dados.uf}`);
    renderizarShoppings(dados);
    submitButton.disabled = false;
}

form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const cepDigitado = input.value.replace(/\D/g, "");
    if (cepDigitado.length !== 8) {
        setFeedback("Digite um CEP válido com 8 dígitos.", "erro");
        return;
    }
    void buscarShoppings(cepDigitado);
});