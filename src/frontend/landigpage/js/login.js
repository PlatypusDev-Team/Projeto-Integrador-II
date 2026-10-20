const API_BASE = "http://127.0.0.1:5000";

const formLogin = document.getElementById("form-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const mensagemStatus = document.getElementById("mensagem-status");
const botaoLogin = document.getElementById("btn-login");

function mostrarMensagem(mensagem, tipo = "erro") {
    mensagemStatus.textContent = mensagem;
    mensagemStatus.style.display = "block";
    mensagemStatus.classList.remove("sucesso", "erro");
    mensagemStatus.classList.add(tipo);
}

function limparErros() {
    document.querySelectorAll(".erro-campo").forEach((elemento) => {
        elemento.textContent = "";
    });

    mensagemStatus.textContent = "";
    mensagemStatus.style.display = "none";
}

function mostrarErroCampo(campo, mensagem) {
    const elemento = document.querySelector(
        `[data-erro-de="${campo}"]`
    );

    if (elemento) {
        elemento.textContent = mensagem;
    }
}

formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limparErros();

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    let formularioValido = true;

    if (!email) {
        mostrarErroCampo("email", "Informe seu e-mail.");
        formularioValido = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarErroCampo("email", "Informe um e-mail válido.");
        formularioValido = false;
    }

    if (!senha) {
        mostrarErroCampo("senha", "Informe sua senha.");
        formularioValido = false;
    }

    if (!formularioValido) {
        return;
    }

    botaoLogin.disabled = true;
    botaoLogin.textContent = "Entrando...";

    try {
        const resposta = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ email, senha })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            mostrarMensagem(
                resultado.erro || "Não foi possível realizar o login."
            );
            return;
        }

        mostrarMensagem("Login realizado! Redirecionando...", "sucesso");

        window.location.href = "status.html";
    } catch (erro) {
        console.error("Erro ao realizar login:", erro);

        mostrarMensagem(
            "Não foi possível conectar ao servidor. Tente novamente."
        );
    } finally {
        botaoLogin.disabled = false;
        botaoLogin.textContent = "Entrar";
    }
});
