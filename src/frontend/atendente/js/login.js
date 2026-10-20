
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");

const togglePassword = document.getElementById("toggle-password");
const loginButton = document.getElementById("login-button");
const buttonText = loginButton.querySelector(".button-text");

const formMessage = document.getElementById("form-message");

const API_LOGIN = "http://127.0.0.1:5000/api/atendente/login";

togglePassword.addEventListener("click", () => {
    const mostrarSenha = senhaInput.type === "password";

    senhaInput.type = mostrarSenha ? "text" : "password";

    togglePassword.setAttribute(
        "aria-label",
        mostrarSenha ? "Ocultar senha" : "Mostrar senha"
    );

    togglePassword.setAttribute(
        "aria-pressed",
        String(mostrarSenha)
    );
});

function mostrarErro(campo, mensagem) {
    const input = campo === "email" ? emailInput : senhaInput;
    const erro = document.getElementById(`${campo}-error`);
    const wrapper = input.closest(".input-wrapper");

    erro.textContent = mensagem;
    erro.classList.toggle("visible", Boolean(mensagem));

    wrapper.classList.toggle("has-error", Boolean(mensagem));

    input.setAttribute("aria-invalid", String(Boolean(mensagem)));
}

function limparErros() {
    mostrarErro("email", "");
    mostrarErro("senha", "");

    formMessage.textContent = "";
    formMessage.hidden = true;
}

function validarFormulario() {
    limparErros();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    let valido = true;

    if (!email) {
        mostrarErro("email", "Informe seu e-mail corporativo.");
        valido = false;
    } else if (
        email.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        mostrarErro("email", "Informe um endereço de e-mail válido.");
        valido = false;
    }

    if (!senha) {
        mostrarErro("senha", "Informe sua senha.");
        valido = false;
    }

    if (!valido) {
        const primeiroCampoInvalido = form.querySelector(
            '[aria-invalid="true"]'
        );

        primeiroCampoInvalido?.focus();
    }

    return valido;
}

function definirCarregamento(carregando) {
    loginButton.disabled = carregando;
    emailInput.readOnly = carregando;
    senhaInput.readOnly = carregando;

    buttonText.textContent = carregando
        ? "Verificando credenciais..."
        : "Entrar no portal";
}

function mostrarMensagem(mensagem) {
    formMessage.textContent = mensagem;
    formMessage.hidden = false;
}

form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (!validarFormulario()) {
        return;
    }

    definirCarregamento(true);

    try {
        const resposta = await fetch(API_LOGIN, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                senha: senhaInput.value
            })
        });

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            mostrarMensagem(
                dados.mensagem ||
                "Não foi possível entrar. Verifique suas credenciais."
            );
            return;
        }

        if (dados.success !== true) {
            mostrarMensagem(
                dados.mensagem || "Não foi possível validar o acesso."
            );
            return;
        }

        // O destino definitivo será definido junto às rotas Flask.
        window.location.assign("dashboard.html");

    } catch (erro) {
        console.error("Erro ao realizar login:", erro);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Tente novamente."
        );
    } finally {
        definirCarregamento(false);
    }
});

emailInput.addEventListener("input", () => {
    mostrarErro("email", "");
});

senhaInput.addEventListener("input", () => {
    mostrarErro("senha", "");
});
