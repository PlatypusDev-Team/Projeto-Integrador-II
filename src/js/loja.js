async function buscarLojas() {
    const cep = document.getElementById("cep").value;
    const mensagemErro = document.getElementById("mensagemErro");
    const listaLojas = document.getElementById("listaLojas");

    mensagemErro.textContent = "";
    listaLojas.innerHTML = "";

    try {
        const resposta = await fetch(
            `http://127.0.0.1:5000/api/lojas/${encodeURIComponent(cep)}`
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagemErro.textContent = dados.erro;
            return;
        }

        if (dados.lojas.length === 0) {
            mensagemErro.textContent = dados.mensagem;
            return;
        }

        dados.lojas.forEach(loja => {
            console.log(loja);
        });

    } catch (erro) {
        mensagemErro.textContent = "Não foi possível consultar as lojas.";
        console.error(erro);
    }
}