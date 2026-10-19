const form = document.getElementById("form-cadastro");
const mensagemStatus = document.getElementById("mensagem-status");
const API_BASE = "http://localhost:5000";

function limparErros() {
    document.querySelectorAll(".erro-campo").forEach((elemento) => {
        elemento.textContent = "";
    });
}

function mostrarErro(campo, mensagem) {
    const elemento = document.querySelector(`[data-erro-de="${campo}"]`);
    if (elemento) elemento.textContent = mensagem;
}

function mostrarMensagem(mensagem, tipo = "erro") {
    mensagemStatus.textContent = mensagem;
    mensagemStatus.className = `mensagem-status ${tipo}`;
    mensagemStatus.style.display = "block";
}

function apenasNumeros(valor) {
    return (valor || "").replace(/\D/g, "");
}

function cpfValido(cpf) {
    cpf = apenasNumeros(cpf);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let soma = 0;

    for (let i = 0; i < 9; i++) {
        soma += Number(cpf[i]) * (10 - i);
    }

    let digito1 = (soma * 10) % 11;
    if (digito1 === 10) digito1 = 0;
    if (digito1 !== Number(cpf[9])) return false;

    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(cpf[i]) * (11 - i);
    }

    let digito2 = (soma * 10) % 11;
    if (digito2 === 10) digito2 = 0;

    return digito2 === Number(cpf[10]);
}

function idadeValida(data) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return false;

    const [dia, mes, ano] = data.split("/").map(Number);
    const nascimento = new Date(ano, mes - 1, dia);

    if (
        nascimento.getFullYear() !== ano ||
        nascimento.getMonth() !== mes - 1 ||
        nascimento.getDate() !== dia
    ) {
        return false;
    }

    const hoje = new Date();
    let idade = hoje.getFullYear() - ano;

    if (
        hoje.getMonth() < mes - 1 ||
        (hoje.getMonth() === mes - 1 && hoje.getDate() < dia)
    ) {
        idade--;
    }

    return idade >= 18;
}

function validarFormulario(dados, temCartao) {
    let valido = true;

    const nome = (dados.get("nome") || "").trim();
    if (nome.length < 3 || nome.length > 50) {
        mostrarErro("nome", "Informe seu nome completo.");
        valido = false;
    }

    if (!cpfValido(dados.get("cpf"))) {
        mostrarErro("cpf", "Informe um CPF válido.");
        valido = false;
    }

    if (!idadeValida(dados.get("data_nascimento"))) {
        mostrarErro(
            "data_nascimento",
            "Informe uma data válida e tenha pelo menos 18 anos."
        );
        valido = false;
    }

    const telefone = apenasNumeros(dados.get("telefone"));
    if (![10, 11].includes(telefone.length)) {
        mostrarErro("telefone", "Informe um telefone válido com DDD.");
        valido = false;
    }

    const email = (dados.get("email") || "").trim();
    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 100
    ) {
        mostrarErro("email", "Informe um e-mail válido.");
        valido = false;
    }

    if (!["MASCULINO", "FEMININO", "OUTRO"].includes(dados.get("genero"))) {
        mostrarErro("genero", "Selecione um gênero.");
        valido = false;
    }

    const senha = dados.get("senha") || "";
    const confirmarSenha = dados.get("confirmar_senha") || "";

    if (senha.length < 8) {
        mostrarErro("senha", "A senha deve ter pelo menos 8 caracteres.");
        valido = false;
    }

    if (senha !== confirmarSenha) {
        mostrarErro("confirmar_senha", "As senhas não coincidem.");
        valido = false;
    }

    if (temCartao) {
        const documento = dados.get("documento");

        if (!documento || !documento.name) {
            mostrarErro("documento", "RG ou CNH é obrigatório para solicitar um cartão.");
            valido = false;
        } else {
            const extensao = documento.name.split(".").pop().toLowerCase();

            if (!["pdf", "jpg", "jpeg", "png"].includes(extensao)) {
                mostrarErro("documento", "Use PDF, JPG, JPEG ou PNG.");
                valido = false;
            }
        }
    }

    if (!dados.get("politica")) {
        mostrarErro("politica", "É necessário aceitar a política de privacidade.");
        valido = false;
    }

    return valido;
}
document.getElementById("nascimento")?.addEventListener("input", (evento) => {
    let valor = apenasNumeros(evento.target.value).slice(0, 8);

    if (valor.length > 4) {
        valor = `${valor.slice(0, 2)}/${valor.slice(2, 4)}/${valor.slice(4)}`;
    } else if (valor.length > 2) {
        valor = `${valor.slice(0, 2)}/${valor.slice(2)}`;
    }

    evento.target.value = valor;
});

["cpf", "telefone"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", (evento) => {
        evento.target.value = apenasNumeros(evento.target.value).slice(0, 11);
    });
});

const inputCartao = document.createElement("input");
inputCartao.type = "hidden";
inputCartao.name = "id_produto";
inputCartao.value = localStorage.getItem("idCartao") || "";
form.appendChild(inputCartao);

form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limparErros();
    mensagemStatus.style.display = "none";

    const dados = new FormData(form);
    const idCartao = (dados.get("id_produto") || "").trim();
    const temCartao = idCartao !== "";

    if (!validarFormulario(dados, temCartao)) return;

    const botao = form.querySelector(".btn-enviar");
    botao.disabled = true;
    botao.textContent = "Criando conta...";

    try {
        const resposta = await fetch(`${API_BASE}/api/cadastro`, {
            method: "POST",
            credentials: "include",
            body: dados
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            if (resultado.erros) {
                Object.entries(resultado.erros).forEach(([campo, mensagem]) => {
                    mostrarErro(campo, mensagem);
                });
            }

            mostrarMensagem(
                resultado.mensagem || "Não foi possível concluir o cadastro."
            );
            return;
        }

        localStorage.removeItem("idCartao");
        localStorage.removeItem("cartoesDisponiveis");

        mostrarMensagem("Conta criada com sucesso! Redirecionando...", "sucesso");
        window.location.href = "status.html";
    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        mostrarMensagem(
            "Não foi possível conectar ao servidor. Verifique se o Flask está em execução."
        );
    } finally {
        botao.disabled = false;
        botao.textContent = "Enviar dados";
    }
});

const documento = document.querySelector("#documento");
const arquivoSelecionado = document.querySelector("#arquivo-selecionado");

documento?.addEventListener("change", () => {
    if (!arquivoSelecionado) return;

    arquivoSelecionado.textContent = documento.files.length
        ? `Arquivo selecionado: ${documento.files[0].name}`
        : "";
});
