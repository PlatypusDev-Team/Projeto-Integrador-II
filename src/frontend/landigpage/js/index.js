document.addEventListener("DOMContentLoaded", () => {

    const botoesCartao =
        document.querySelectorAll(".btn-cartao");

    const formCadastro =
        "cadastro.html";


    botoesCartao.forEach((botao) => {

        botao.addEventListener("click", () => {

            const idCartao =
                botao.dataset.cardId;

            if (
                !idCartao ||
                idCartao.startsWith("ID_")
            ) {
                console.error(
                    "ID do cartão ainda não foi configurado."
                );

                return;
            }

            localStorage.setItem(
                "idCartao",
                idCartao
            );

            window.location.href =
                formCadastro;
        });

    });

    const accordion =
        document.getElementById("faqAccordion");

    if (!accordion) {
        return;
    }


    const faqCards =
        accordion.querySelectorAll(".faq-card");


    faqCards.forEach((card) => {

        const button =
            card.querySelector(".faq-button");


        button.addEventListener("click", () => {

            const isActive =
                card.classList.contains("is-active");


            faqCards.forEach((otherCard) => {

                if (
                    otherCard !== card &&
                    otherCard.classList.contains("is-active")
                ) {

                    otherCard.classList.remove(
                        "is-active"
                    );

                    const otherButton =
                        otherCard.querySelector(
                            ".faq-button"
                        );

                    otherButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            });


            if (isActive) {

                card.classList.remove(
                    "is-active"
                );

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );

            } else {

                card.classList.add(
                    "is-active"
                );

                button.setAttribute(
                    "aria-expanded",
                    "true"
                );

            }

        });

    });

});