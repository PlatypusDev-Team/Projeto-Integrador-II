
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
    }

    function mostrarUsuario(logado) {
        btnAcessarConta.hidden = logado;
        menuUsuario.hidden = !logado;

        if (!logado) fecharMenu();
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
            alert("Não foi possível sair. Tente novamente.");
        } finally {
            btnSair.disabled = false;
        }
    });

    verificarSessao();
})();
