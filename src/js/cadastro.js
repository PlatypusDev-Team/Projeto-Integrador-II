const form = document.getElementById("form-cadastro");
const mensagemStatus = document.getElementById("mensagem-status");


function limparErros() {
    document.querySelectorAll(".erro-campo").forEach((elemento) => {
        elemento.textContent = "";
    });
}


function mostrarErro(campo, mensagem) {
    const elemento = document.querySelector(
        `[data-erro-de="${campo}"]`
    );

    if (elemento) {
        elemento.textContent = mensagem;
    }
}


function apenasNumeros(valor) {
    return (valor || "").replace(/\D/g, "");
}


function cpfValido(cpf) {
    cpf = apenasNumeros(cpf);

    if (
        cpf.length !== 11 ||
        /^(\d)\1{10}$/.test(cpf)
    ) {
        return false;
    }

    let soma = 0;

    for (let i = 0; i < 9; i++) {
        soma += Number(cpf[i]) * (10 - i);
    }

    let digito1 = (soma * 10) % 11;

    if (digito1 === 10) {
        digito1 = 0;
    }

    if (digito1 !== Number(cpf[9])) {
        return false;
    }

    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(cpf[i]) * (11 - i);
    }

    let digito2 = (soma * 10) % 11;

    if (digito2 === 10) {
        digito2 = 0;
    }

    return digito2 === Number(cpf[10]);
}


function idadeValida(data) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        return false;
    }

    const [dia, mes, ano] = data
        .split("/")
        .map(Number);

    const nascimento = new Date(
        ano,
        mes - 1,
        dia
    );

    if (
        nascimento.getFullYear() !== ano ||
        nascimento.getMonth() !== mes - 1 ||
        nascimento.getDate() !== dia
    ) {
        return false;
    }

    const hoje = new Date();

    let idade =
        hoje.getFullYear() - ano;

    if (
        hoje.getMonth() < mes - 1 ||
        (
            hoje.getMonth() === mes - 1 &&
            hoje.getDate() < dia
        )
    ) {
        idade--;
    }

    return idade >= 18;
}


function validarFormulario(dados) {
    let valido = true;

    const nome = (
        dados.get("nome") || ""
    ).trim();

    if (
        nome.length < 3 ||
        nome.length > 50
    ) {
        mostrarErro(
            "nome",
            "Informe seu nome completo."
        );

        valido = false;
    }

    const cpf = dados.get("cpf") || "";

    if (!cpfValido(cpf)) {
        mostrarErro(
            "cpf",
            "Informe um CPF válido."
        );

        valido = false;
    }

    const nascimento =
        dados.get("data_nascimento") || "";

    if (!idadeValida(nascimento)) {
        mostrarErro(
            "data_nascimento",
            "É necessário informar uma data válida e ter pelo menos 18 anos."
        );

        valido = false;
    }

    const telefone =
        apenasNumeros(
            dados.get("telefone")
        );

    if (
        ![10, 11].includes(
            telefone.length
        )
    ) {
        mostrarErro(
            "telefone",
            "Informe um telefone válido com DDD."
        );

        valido = false;
    }

    const email =
        dados.get("email") || "";

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        )
    ) {
        mostrarErro(
            "email",
            "Informe um email válido."
        );

        valido = false;
    }

    if (!dados.get("genero")) {
        mostrarErro(
            "genero",
            "Selecione um gênero."
        );

        valido = false;
    }

    const idCartao =
        dados.get("id_cartao");

    if (!idCartao) {
        mostrarErro(
            "id_cartao",
            "Nenhum cartão foi selecionado."
        );

        valido = false;
    }

    const documento =
        dados.get("documento");

    if (
        !documento ||
        !documento.name
    ) {
        mostrarErro(
            "documento",
            "RG ou CNH é obrigatório."
        );

        valido = false;
    }

    if (!dados.get("politica")) {
        mostrarErro(
            "politica",
            "É necessário aceitar a política de privacidade."
        );

        valido = false;
    }

    return valido;
}


document
    .getElementById("nascimento")
    .addEventListener("input", (e) => {

        let valor = apenasNumeros(
            e.target.value
        ).slice(0, 8);

        if (valor.length > 4) {
            valor =
                `${valor.slice(0, 2)}/` +
                `${valor.slice(2, 4)}/` +
                `${valor.slice(4)}`;

        } else if (valor.length > 2) {
            valor =
                `${valor.slice(0, 2)}/` +
                `${valor.slice(2)}`;
        }

        e.target.value = valor;
    });


// =========================
// MÁSCARA CPF E TELEFONE
// =========================

["cpf", "telefone"].forEach((id) => {

    document
        .getElementById(id)
        .addEventListener("input", (e) => {

            e.target.value =
                apenasNumeros(
                    e.target.value
                ).slice(0, 11);
        });
});


// =========================
// CARTÃO SELECIONADO
// =========================

const idCartao =
    localStorage.getItem("idCartao");

const inputCartao =
    document.createElement("input");

inputCartao.type = "hidden";
inputCartao.name = "id_cartao";
inputCartao.value = idCartao || "";

form.appendChild(inputCartao);


// =========================
// ENVIO DO FORMULÁRIO
// =========================

form.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        limparErros();

        mensagemStatus.style.display =
            "none";

        const dados =
            new FormData(form);

        if (!validarFormulario(dados)) {
            return;
        }

        const botao =
            form.querySelector(".btn-enviar");

        botao.disabled = true;
        botao.textContent = "Enviando...";

        try {

        const resposta =
            await fetch("http://localhost:5000/api/cadastro", {
                method: "POST",
                body: dados
            });

            const resultado =
                await resposta.json();


            // =========================
            // ERROS DE VALIDAÇÃO
            // =========================

            if (resultado.erros) {

                Object.entries(
                    resultado.erros
                ).forEach(
                    ([campo, mensagem]) => {

                        mostrarErro(
                            campo,
                            mensagem
                        );
                    }
                );

                mensagemStatus.textContent =
                    resultado.mensagem ||
                    "Corrija os campos indicados.";

                mensagemStatus.className =
                    "mensagem-status erro";

                mensagemStatus.style.display =
                    "block";

                return;
            }


            // =========================
            // SOLICITAÇÃO CRIADA
            // =========================

            if (
                resposta.ok &&
                resultado.id_solicitacao
            ) {

                const idSolicitacao =
                    resultado.id_solicitacao;

                /*
                 * A solicitação já foi criada
                 * no banco. Agora enviamos o
                 * usuário para a tela de status
                 * usando o ID criado.
                 */

                window.location.href =
                    `status.html?solicitacao=${idSolicitacao}`;

                return;
            }


            // =========================
            // RESPOSTA INESPERADA
            // =========================

            mensagemStatus.textContent =
                resultado.mensagem ||
                "Não foi possível concluir a solicitação.";

            mensagemStatus.className =
                "mensagem-status erro";

            mensagemStatus.style.display =
                "block";


        } catch (erro) {

            console.error(erro);

            mensagemStatus.textContent =
                "Não foi possível conectar ao servidor. Verifique se o Flask está rodando.";

            mensagemStatus.className =
                "mensagem-status erro";

            mensagemStatus.style.display =
                "block";

        } finally {

            botao.disabled = false;
            botao.textContent = "Enviar dados";
        }
    }
);

const documento =
    document.querySelector("#documento");

const arquivoSelecionado =
    document.querySelector(
        "#arquivo-selecionado"
    );

documento.addEventListener(
    "change",
    () => {

        if (documento.files.length > 0) {

            arquivoSelecionado.textContent =
                `Arquivo selecionado: ${documento.files[0].name}`;

        } else {

            arquivoSelecionado.textContent =
                "";
        }
    }
);