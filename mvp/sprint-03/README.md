# 📦 MVP — Sprint 3

## 🎯 Objetivo

Expandir as funcionalidades da plataforma DM Financeira, aprimorando a experiência do cliente e os recursos de gerenciamento disponíveis para os atendentes.

A sprint teve como foco implementar a comunicação interna entre clientes e atendentes, disponibilizar recomendações de outros produtos para clientes com solicitações negadas e aprimorar os recursos administrativos de acompanhamento, análise e visualização de dados.

## 💡 Solução

Foram implementadas melhorias nas áreas do cliente e do atendente, ampliando as funcionalidades já existentes na plataforma.

Na **área do cliente**, foi desenvolvido um sistema de mensagens para comunicação direta com os atendentes, além de uma seção de recomendação de outros produtos da DM para clientes que tiveram suas solicitações de cartão negadas.

Na **área do atendente**, foram aprimorados os recursos administrativos, incluindo a evolução do dashboard de indicadores, a ampliação dos relatórios gerenciais e a integração do sistema de mensagens ao fluxo de atendimento.

Também foram realizadas melhorias na organização e apresentação das informações, proporcionando maior facilidade no acompanhamento das solicitações e na análise dos resultados.

## 👤 User Stories

| Rank | ID | User Story | Prioridade | Estimativa |
|:----:|:----:|:-----------|:----------:|:----------:|
| 11 | US07 | Como cliente que não foi aprovado para um cartão, quero visualizar outros produtos disponíveis, para conhecer alternativas que possam atender às minhas necessidades. | Baixa | 5 |
| 12 | US09 | Como atendente DM, quero enviar mensagens ao cliente pela plataforma, para orientá-lo sem depender dos canais externos de atendimento. | Média | 8 |

## 🔗 Sprints Relacionadas

Sprint 2, que estabeleceu a estrutura inicial da área administrativa, do gerenciamento de solicitações e do acompanhamento de indicadores, servindo de base para as melhorias implementadas nesta sprint.

---

## DoR (Definition of Ready)

| Critério | Descrição |
|---------|----------|
| Clareza na descrição | A tarefa está descrita de forma compreensível |
| Critérios de Aceitação | Estão definidos e são testáveis |
| Subtarefas | A tarefa foi dividida em partes menores |
| Entendimento | Há entendimento técnico suficiente para iniciar |

## Critérios de Aceitação

- O cliente deve conseguir visualizar outros produtos disponíveis quando sua solicitação de cartão for negada.
- A recomendação de produtos deve apresentar alternativas disponíveis na plataforma.
- O cliente deve conseguir acessar o sistema de mensagens pela sua área de acompanhamento.
- O atendente deve conseguir visualizar e responder às mensagens dos clientes vinculadas às solicitações.
- O histórico de mensagens deve permanecer disponível para consulta durante o atendimento.
- O dashboard deve apresentar corretamente os indicadores e gráficos definidos para acompanhamento das solicitações.
- Os relatórios devem apresentar informações correspondentes aos filtros e períodos selecionados.
- As funcionalidades aprimoradas devem manter a compatibilidade com os fluxos já existentes da aplicação.

## DoD (Definition of Done)

| Critério | Descrição |
|---------|----------|
| Critérios atendidos | Todos os critérios de aceitação foram cumpridos |
| Implementação | As funcionalidades e melhorias foram implementadas |
| Testes | Foram realizados testes de rotas com Postman e testes manuais das interfaces |
| Integração | As novas funcionalidades estão integradas às áreas do cliente e do atendente |
| Qualidade | Código organizado, versionado e sem comprometer funcionalidades existentes |
| Documentação | A documentação correspondente foi atualizada |

## 📊 Validação

Foram realizados testes de rotas utilizando o **Postman**, verificando as respostas da API e o funcionamento das operações implementadas.

Também foram realizados testes manuais nas interfaces do cliente e do atendente, validando a comunicação entre frontend e backend, o funcionamento do sistema de mensagens, a apresentação dos indicadores e relatórios e a integração com as funcionalidades existentes.

## 🚀 Próximos Passos

- Manutenção e correção de possíveis inconsistências;
- Aprimoramento contínuo da experiência do usuário;
- Expansão das funcionalidades administrativas;
- Melhorias de desempenho, segurança e organização do sistema;
- Preparação para futuras atualizações e evolução da plataforma.
