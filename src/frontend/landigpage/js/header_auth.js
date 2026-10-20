(() => {
    const API_BASE = "http://127.0.0.1:5000";

    const btnAcessarConta = document.getElementById("btnAcessarConta");
    const menuUsuario = document.getElementById("menuUsuario");
    const btnUsuario = document.getElementById("btnUsuario");
    const opcoesUsuario = document.getElementById("opcoesUsuario");
    const btnSair = document.getElementById("btnSair");

    // Esta página não possui o cabeçalho de conta.
    if (!btnAcessarConta || !menuUsuario) return;

    function fecharMenu() {
        opcoesUsuario.hidden = true;
        btnUsuario.setAttribute("aria-expanded", "false");
        limparErroSair();
    }

    function mostrarUsuario(logado) {
        btnAcessarConta.hidden = logado;
        menuUsuario.hidden = !logado;

        if (!logado) fecharMenu();
    }

    /**
     * Mensagem de erro dentro do menu do usuário (no lugar de alert()).
     */
    function mostrarErroSair(mensagem) {
        let erro = document.getElementById("erroSair");

        if (!erro) {
            erro = document.createElement("p");
            erro.id = "erroSair";
            erro.setAttribute("role", "alert");
            erro.style.cssText = [
                "margin: 8px 12px",
                "font-size: 0.85rem",
                "line-height: 1.3",
                "color: #b00020",
            ].join(";");

            opcoesUsuario.appendChild(erro);
        }

        erro.textContent = mensagem;

        // Mantém o menu aberto para a pessoa ver o motivo.
        opcoesUsuario.hidden = false;
        btnUsuario.setAttribute("aria-expanded", "true");
    }

    function limparErroSair() {
        document.getElementById("erroSair")?.remove();
    }

    async function verificarSessao() {
        try {
            const resposta = await fetch(`${API_BASE}/api/conta`, {
                method: "GET",
                credentials: "include"
            });

            mostrarUsuario(resposta.ok);
        } catch (erro) {
            console.error("Erro ao verificar sessão:", erro);
            mostrarUsuario(false);
        }
    }

    btnUsuario.addEventListener("click", () => {
        const vaiAbrir = opcoesUsuario.hidden;

        opcoesUsuario.hidden = !vaiAbrir;
        btnUsuario.setAttribute("aria-expanded", String(vaiAbrir));

        if (!vaiAbrir) limparErroSair();
    });

    document.addEventListener("click", (evento) => {
        if (!menuUsuario.contains(evento.target)) {
            fecharMenu();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") fecharMenu();
    });

    btnSair.addEventListener("click", async () => {
        btnSair.disabled = true;
        limparErroSair();

        try {
            const resposta = await fetch(`${API_BASE}/api/logout`, {
                method: "POST",
                credentials: "include"
            });

            if (!resposta.ok) {
                throw new Error("Não foi possível encerrar a sessão.");
            }

            mostrarUsuario(false);
            window.location.href = "index.html";
        } catch (erro) {
            console.error("Erro ao sair:", erro);
            mostrarErroSair("Não foi possível sair. Tente novamente.");
        } finally {
            btnSair.disabled = false;
        }
    });

    verificarSessao();
})();