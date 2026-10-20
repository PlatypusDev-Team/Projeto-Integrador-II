const form = document.getElementById("form-cadastro");
const mensagemStatus = document.getElementById("mensagem-status");
const API_BASE = "http://127.0.0.1:5000";

// Códigos devolvidos pelo back-end quando uma regra de negócio barra o pedido.
const CODIGOS_BLOQUEIO = ["SOLICITACAO_EM_ANALISE", "CARTAO_JA_SOLICITADO"];

let clienteAutenticado = false;
let estadoSessaoPronto = false;

const camposPessoais = [
    "nome",
    "cpf",
    "data_nascimento",
    "telefone",
    "email",
    "genero",
    "senha",
    "confirmar_senha",
];

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

function mostrarMensagem(mensagem, tipo = "erro") {
    if (!mensagemStatus) return;

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
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data || "")) {
        return false;
    }

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
        (
            hoje.getMonth() === mes - 1 &&
            hoje.getDate() < dia
        )
    ) {
        idade--;
    }

    return idade >= 18;
}

/**
 * Confere o arquivo do documento.
 *
 * obrigatorio = true  -> a falta do arquivo é erro.
 * obrigatorio = false -> só confere a extensão SE um arquivo foi escolhido.
 *
 * O documento só é exigido no primeiro cadastro. Quem decide se a pessoa
 * já tem conta é o servidor (pelo CPF), então no formulário completo
 * a falta do arquivo não é barrada aqui: o servidor responde com
 * erros.documento quando for realmente o primeiro cadastro.
 */
function validarDocumento(dados, obrigatorio = true) {
    const documento = dados.get("documento");
    const enviado = documento && documento.name;

    if (!enviado) {
        if (!obrigatorio) return true;

        mostrarErro(
            "documento",
            "RG ou CNH é obrigatório para continuar."
        );
        return false;
    }

    const extensao = documento.name.split(".").pop().toLowerCase();

    if (!["pdf", "jpg", "jpeg", "png"].includes(extensao)) {
        mostrarErro("documento", "Use PDF, JPG, JPEG ou PNG.");
        return false;
    }

    return true;
}

function validarPolitica(dados) {
    if (!dados.get("politica")) {
        mostrarErro(
            "politica",
            "É necessário aceitar a política de privacidade."
        );
        return false;
    }

    return true;
}

function validarCadastro(dados) {
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

    if (
        !["MASCULINO", "FEMININO", "OUTRO"].includes(
            dados.get("genero")
        )
    ) {
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
        mostrarErro(
            "confirmar_senha",
            "As senhas não coincidem."
        );
        valido = false;
    }

    // Documento: só confere a extensão se houver arquivo. A exigência
    // do primeiro cadastro é verificada pelo servidor.
    if (!validarDocumento(dados, false)) {
        valido = false;
    }

    if (!validarPolitica(dados)) {
        valido = false;
    }

    return valido;
}

function validarNovaSolicitacao(dados, temCartao) {
    // Cliente já autenticado: não precisa de documento nem de aceitar
    // a política de novo (isso foi feito no primeiro cadastro).
    if (!temCartao) {
        mostrarMensagem("Selecione um cartão antes de continuar.");
        return false;
    }

    return true;
}

/**
 * Mostra ou esconde a caixa "li e aceito os termos".
 *
 * Quem já está logado aceitou a política no primeiro cadastro, então a
 * caixa some e deixa de ser obrigatória. Tira o "required" (é ele que
 * dispara o popup nativo do navegador) e esconde o campo, o rótulo
 * e a mensagem de erro dele.
 */
function configurarTermos(ocultar) {
    const campo = form.querySelector('[name="politica"]');

    if (!campo) return;

    campo.required = !ocultar;

    const elementos = new Set([campo]);

    const rotuloEnvolvente = campo.closest("label");

    if (rotuloEnvolvente) {
        elementos.add(rotuloEnvolvente);
    }

    if (campo.id) {
        form.querySelectorAll(`label[for="${campo.id}"]`).forEach(
            (rotulo) => elementos.add(rotulo)
        );
    }

    const erro = document.querySelector('[data-erro-de="politica"]');

    if (erro) {
        elementos.add(erro);
    }

    elementos.forEach((elemento) => {
        elemento.hidden = ocultar;
        // Garante o efeito mesmo se o CSS definir "display" no elemento.
        elemento.style.display = ocultar ? "none" : "";
    });
}

// ---------- Confirmação do cartão (só para quem está logado) ----------

// Guarda o último cartão carregado para não consultar a API à toa.
let cartaoConfirmacao = null;

function textoModalidade(modalidade) {
    if (modalidade === "FISICO") return "Cartão físico";
    if (modalidade === "DIGITAL") return "Cartão digital";

    return modalidade || "—";
}

function textoTipoCartao(cartao) {
    return cartao.tipo_cartao === "LOJA"
        ? "Cartão de loja"
        : "Cartão DM";
}

function removerConfirmacao() {
    document.querySelector("#confirmacao-cartao")?.remove();

    // Se o botão tinha sido travado por causa do cartão, destrava.
    const botao = form.querySelector(".btn-enviar");

    if (botao && botao.dataset.bloqueadoPorCartao) {
        botao.disabled = false;
        delete botao.dataset.bloqueadoPorCartao;
    }
}

function criarCaixaConfirmacao() {
    const secao = document.createElement("section");
    secao.id = "confirmacao-cartao";
    secao.setAttribute("aria-live", "polite");
    secao.style.cssText = [
        "grid-column: 1 / -1",
        "margin: 0 0 20px",
        "text-align: left",
    ].join(";");

    const titulo = document.createElement("h2");
    titulo.textContent = "Confirmar solicitação?";
    titulo.style.cssText = "margin: 0 0 4px; font-size: 1.3rem;";

    const subtitulo = document.createElement("p");
    subtitulo.textContent =
        "Confira os dados do cartão antes de solicitar.";
    subtitulo.style.cssText =
        "margin: 0 0 12px; font-size: 0.95rem; opacity: 0.8;";

    const quadro = document.createElement("div");
    quadro.className = "confirmacao-corpo";
    quadro.style.cssText = [
        "border: 1px solid #d0d7de",
        "border-radius: 12px",
        "padding: 16px 20px",
        "background: #fff",
        "color: #1f2328",
    ].join(";");

    secao.append(titulo, subtitulo, quadro);

    return secao;
}

function preencherConfirmacao(quadro, cartao) {
    quadro.replaceChildren();

    const nome = document.createElement("h3");
    nome.textContent = cartao.nome_cartao;
    nome.style.cssText = "margin: 0 0 12px; font-size: 1.1rem;";

    const lista = document.createElement("dl");
    lista.style.cssText = [
        "display: grid",
        "grid-template-columns: max-content 1fr",
        "gap: 6px 16px",
        "margin: 0",
    ].join(";");

    const linhas = [
        ["Modalidade", textoModalidade(cartao.modalidade)],
        ["Tipo", textoTipoCartao(cartao)],
    ];

    if (cartao.tipo_cartao === "LOJA" && cartao.nome_loja) {
        linhas.push(["Loja", cartao.nome_loja]);
    }

    linhas.push(["Bandeirado", cartao.bandeirado ? "Sim" : "Não"]);

    linhas.forEach(([rotulo, valor]) => {
        const dt = document.createElement("dt");
        dt.textContent = rotulo;
        dt.style.cssText = "font-weight: 700;";

        const dd = document.createElement("dd");
        dd.textContent = valor;
        dd.style.cssText = "margin: 0;";

        lista.append(dt, dd);
    });

    quadro.append(nome, lista);

    if (cartao.descricao_cartao) {
        const descricao = document.createElement("p");
        // textContent: o texto vem do banco e nunca é tratado como HTML.
        descricao.textContent = cartao.descricao_cartao;
        descricao.style.cssText = [
            "margin: 12px 0 0",
            "font-size: 0.95rem",
            "line-height: 1.45",
            "white-space: pre-line",
        ].join(";");

        quadro.append(descricao);
    }
}

function mostrarAvisoConfirmacao(quadro, mensagem, comLink = false) {
    quadro.replaceChildren();

    const texto = document.createElement("p");
    texto.textContent = mensagem;
    texto.style.cssText = "margin: 0;";

    quadro.append(texto);

    if (comLink) {
        const link = document.createElement("a");
        link.href = "index.html#cartoes";
        link.textContent = "Escolher outro cartão";
        link.style.cssText = "display: inline-block; margin-top: 8px;";

        quadro.append(link);
    }
}

/**
 * Para quem está logado, mostra "Confirmar solicitação?" e um quadro
 * com os dados do cartão escolhido, lidos do banco (GET /api/cartoes/<id>).
 * Quem não está logado vê o formulário completo, sem este quadro.
 */
async function mostrarConfirmacao() {
    const idCartao = localStorage.getItem("idCartao");

    if (!clienteAutenticado || !idCartao) {
        removerConfirmacao();
        return;
    }

    let secao = document.querySelector("#confirmacao-cartao");

    if (!secao) {
        secao = criarCaixaConfirmacao();
        form.prepend(secao);
    }

    const quadro = secao.querySelector(".confirmacao-corpo");

    if (cartaoConfirmacao && cartaoConfirmacao.id === idCartao) {
        preencherConfirmacao(quadro, cartaoConfirmacao.dados);
        return;
    }

    mostrarAvisoConfirmacao(quadro, "Carregando informações do cartão...");

    try {
        const resposta = await fetch(
            `${API_BASE}/api/cartoes/${encodeURIComponent(idCartao)}`
        );

        // A situação mudou enquanto a consulta rodava (saiu da conta,
        // trocou de cartão): outra chamada cuida da tela.
        if (
            !clienteAutenticado ||
            localStorage.getItem("idCartao") !== idCartao
        ) {
            return;
        }

        const botao = form.querySelector(".btn-enviar");

        if (resposta.status === 404) {
            mostrarAvisoConfirmacao(
                quadro,
                "Este cartão não está mais disponível.",
                true
            );

            if (botao) {
                botao.disabled = true;
                botao.dataset.bloqueadoPorCartao = "1";
            }

            return;
        }

        const dados = await resposta.json().catch(() => null);

        if (!resposta.ok || !dados) {
            throw new Error(`HTTP ${resposta.status}`);
        }

        cartaoConfirmacao = { id: idCartao, dados };

        if (botao && botao.dataset.bloqueadoPorCartao) {
            botao.disabled = false;
            delete botao.dataset.bloqueadoPorCartao;
        }

        preencherConfirmacao(quadro, dados);
    } catch (erro) {
        console.error("Erro ao carregar o cartão:", erro);

        // Não impede o pedido: só avisa que não foi possível mostrar os dados.
        mostrarAvisoConfirmacao(
            quadro,
            "Não foi possível carregar as informações do cartão."
        );
    }
}

function configurarCamposPessoais() {
    document.querySelectorAll("[data-cadastro-pessoal]").forEach(
        (grupo) => {
            grupo.hidden = clienteAutenticado;
        }
    );

    camposPessoais.forEach((nome) => {
        form.querySelectorAll(`[name="${nome}"]`).forEach((campo) => {
            campo.required = !clienteAutenticado;
        });
    });

    // O documento nunca é "required" no HTML: só o primeiro cadastro
    // exige o arquivo, e quem sabe disso é o servidor.
    const campoDocumento = form.querySelector('[name="documento"]');

    if (campoDocumento) {
        campoDocumento.required = false;
    }

    configurarTermos(clienteAutenticado);
    mostrarConfirmacao();

    const botao = form.querySelector(".btn-enviar");

    if (botao) {
        botao.textContent = clienteAutenticado
            ? "Solicitar cartão"
            : "Continuar";
    }
}

async function verificarSessao() {
    try {
        const resposta = await fetch(`${API_BASE}/api/conta`, {
            method: "GET",
            credentials: "include",
        });

        clienteAutenticado = resposta.ok;
    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
        clienteAutenticado = false;
    } finally {
        estadoSessaoPronto = true;
        configurarCamposPessoais();
    }
}

document.getElementById("nascimento")?.addEventListener(
    "input",
    (evento) => {
        let valor = apenasNumeros(evento.target.value).slice(0, 8);

        if (valor.length > 4) {
            valor = `${valor.slice(0, 2)}/${valor.slice(2, 4)}/${valor.slice(4)}`;
        } else if (valor.length > 2) {
            valor = `${valor.slice(0, 2)}/${valor.slice(2)}`;
        }

        evento.target.value = valor;
    }
);

["cpf", "telefone"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", (evento) => {
        evento.target.value = apenasNumeros(
            evento.target.value
        ).slice(0, 11);
    });
});

if (form) {
    let inputCartao = form.querySelector('[name="id_produto"]');

    if (!inputCartao) {
        inputCartao = document.createElement("input");
        inputCartao.type = "hidden";
        inputCartao.name = "id_produto";
        form.appendChild(inputCartao);
    }

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (!estadoSessaoPronto) {
            await verificarSessao();
        }

        limparErros();

        if (mensagemStatus) {
            mensagemStatus.style.display = "none";
        }

        // Atualiza o cartão escolhido antes de montar o formulário.
        inputCartao.value = localStorage.getItem("idCartao") || "";

        const dados = new FormData(form);
        const idCartao = (dados.get("id_produto") || "").trim();
        const temCartao = idCartao !== "";

        const valido = clienteAutenticado
            ? validarNovaSolicitacao(dados, temCartao)
            : validarCadastro(dados);

        if (!valido) return;

        const botao = form.querySelector(".btn-enviar");

        if (botao) {
            botao.disabled = true;
            botao.textContent = clienteAutenticado
                ? "Enviando solicitação..."
                : "Validando dados...";
        }

        const endpoint = clienteAutenticado
            ? "/api/solicitar-cartao"
            : "/api/cadastro";

        try {
            const resposta = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                credentials: "include",
                body: dados,
            });

            // Se o servidor devolver algo que não é JSON (ex.: erro 500
            // em HTML), não deixa isso virar "falha de conexão".
            const resultado = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                const mensagemErro =
                    resultado.erro ||
                    resultado.mensagem ||
                    "Não foi possível concluir a operação.";

                // Regra de negócio barrou o pedido (já há um pedido em
                // análise, ou este cartão já foi solicitado). A pessoa
                // está logada: leva o aviso para a página da conta.
                if (CODIGOS_BLOQUEIO.includes(resultado.codigo)) {
                    sessionStorage.setItem(
                        "avisoSolicitacao",
                        mensagemErro
                    );

                    localStorage.removeItem("idCartao");
                    localStorage.removeItem("cartoesDisponiveis");

                    window.location.href = "status.html";
                    return;
                }

                // O cartão guardado não existe mais: descarta, senão a
                // pessoa fica presa tentando o mesmo id para sempre.
                if (resultado.codigo === "CARTAO_INEXISTENTE") {
                    localStorage.removeItem("idCartao");
                    localStorage.removeItem("cartoesDisponiveis");
                }

                // Estava logada na tela, mas a sessão expirou no servidor.
                // Volta para o formulário completo.
                if (resposta.status === 401 && clienteAutenticado) {
                    clienteAutenticado = false;
                    configurarCamposPessoais();

                    mostrarMensagem(
                        "Sua sessão expirou. Preencha seus dados para continuar."
                    );

                    return;
                }

                if (resultado.erros) {
                    Object.entries(resultado.erros).forEach(
                        ([campo, mensagem]) => {
                            mostrarErro(campo, mensagem);
                        }
                    );
                }

                mostrarMensagem(mensagemErro);

                return;
            }

            localStorage.removeItem("idCartao");
            localStorage.removeItem("cartoesDisponiveis");
            sessionStorage.removeItem("avisoSolicitacao");

            mostrarMensagem(
                resultado.mensagem || "Operação concluída com sucesso.",
                "sucesso"
            );

            window.location.href = "status.html";
        } catch (erro) {
            console.error("Erro ao enviar formulário:", erro);

            mostrarMensagem(
                "Não foi possível conectar ao servidor. Verifique se o Flask está em execução."
            );
        } finally {
            if (botao) {
                botao.disabled = false;
                botao.textContent = clienteAutenticado
                    ? "Solicitar cartão"
                    : "Continuar";
            }
        }
    });
}

const documento = document.querySelector("#documento");
const arquivoSelecionado = document.querySelector("#arquivo-selecionado");

documento?.addEventListener("change", () => {
    if (!arquivoSelecionado) return;

    arquivoSelecionado.textContent = documento.files.length
        ? `Arquivo selecionado: ${documento.files[0].name}`
        : "";
});

verificarSessao();