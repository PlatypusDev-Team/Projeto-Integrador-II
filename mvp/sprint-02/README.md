# 📦 MVP — Sprint 2

## 🎯 Objetivo

Expandir as funcionalidades da plataforma da DM Financeira, dando continuidade à Landing Page desenvolvida na Sprint 1 e implementando recursos de autenticação, melhorias na experiência de busca e controle das solicitações de pré-qualificação.

A sprint também tem como objetivo desenvolver a área de atendimento administrativo, permitindo que os atendentes consultem, assumam e analisem solicitações, além de acompanhar indicadores relacionados aos processos de atendimento e à captação de clientes.

## 💡 Solução

Evoluir a aplicação existente por meio da implementação de um sistema de autenticação para clientes e atendentes, permitindo o acesso às funcionalidades correspondentes a cada perfil.

No fluxo de captação, foram realizadas melhorias na barra de pesquisa de lojas, com sugestões baseadas no nome dos estabelecimentos, e implementada uma limitação para impedir que o cliente mantenha múltiplas solicitações de cartões em andamento, conforme as regras de negócio definidas para o projeto.

Na área administrativa, foi desenvolvida uma estrutura de gerenciamento das solicitações, contemplando consulta e filtragem de registros, atribuição de solicitações aos atendentes, visualização do histórico de atendimento, registro de decisões e consulta de relatórios com indicadores e opções de exportação.

Dessa forma, o MVP amplia a solução iniciada na Sprint 1, conectando a captação e a pré-qualificação de clientes ao processo de atendimento e acompanhamento das solicitações.

## 👤 User Stories

| Rank | ID | User Story | Prioridade | Estimativa |
|:----:|:----:|:-----------|:----------:|:----------:|
| 7 | US08 | Como atendente DM, quero visualizar o status e as informações da solicitação do cliente, para orientá-lo em caso de dúvidas sobre seu processo. | Média | 5 |
| 8 | US10 | Como equipe DM, quero visualizar indicadores das solicitações de cartões, para acompanhar os resultados da captação de clientes. | Alta | 5 |
| 9 | US12 | Como atendente DM, quero realizar login na área administrativa, para acessar com segurança as solicitações e informações necessárias ao atendimento dos clientes. | Alta | 3 |
| 10 | US11 | Como cliente DM, quero criar uma conta e realizar login na plataforma, para acessar minhas solicitações sem precisar informar novamente meus dados pessoais a cada atendimento. | Alta | 3 |

## 🔗 Sprints Relacionadas

Nenhuma.

---

## DoR (Definition of Ready)

| Critério | Descrição |
|---------|----------|
| Clareza na descrição | A tarefa está descrita de forma compreensível |
| Critérios de Aceitação | Estão definidos e são testáveis |
| Subtarefas | A tarefa foi dividida em partes menores |
| Entendimento | Há entendimento técnico suficiente para iniciar |

## Critérios de Aceitação

- O cliente deve conseguir criar uma conta e realizar login para acessar as funcionalidades destinadas ao seu perfil.
- O atendente deve conseguir realizar login na área administrativa utilizando suas credenciais.
- O sistema deve diferenciar as permissões e funcionalidades disponíveis para clientes e atendentes.
- O cliente autenticado deve conseguir consultar as solicitações vinculadas ao próprio cadastro e visualizar seus respectivos status.
- A barra de pesquisa de lojas deve apresentar sugestões de estabelecimentos de acordo com o nome informado pelo usuário.
- O sistema deve impedir a criação de novas solicitações de cartões enquanto houver uma solicitação em análise, conforme a regra de negócio definida.
- O atendente deve conseguir consultar e filtrar solicitações, visualizar seus detalhes e acessar o histórico de atendimento.
- O atendente deve conseguir assumir solicitações disponíveis e registrar a decisão da análise, atualizando o status correspondente.
- O sistema deve registrar o histórico das ações de atendimento realizadas sobre as solicitações.
- A área administrativa deve disponibilizar indicadores das solicitações, filtros por período e os recursos de visualização e exportação implementados.
- As funcionalidades desenvolvidas devem operar de forma integrada ao banco de dados, respeitando as regras de negócio e sem comprometer as funcionalidades existentes da Sprint 1.

## DoD (Definition of Done)

| Critério | Descrição |
|---------|----------|
| Critérios atendidos | Todos os critérios de aceitação foram cumpridos |
| Implementação | A funcionalidade está completa |
| Testes | Foi testada manualmente |
| Qualidade | Código organizado e sem quebrar outras partes |

## 📊 Validação

A validação do MVP foi realizada por meio de testes manuais dos fluxos implementados, verificando a integração entre frontend, backend e banco de dados.

Foram contemplados os fluxos de autenticação de clientes e atendentes, acesso às respectivas áreas da aplicação, consulta de solicitações e seus status, sugestões de estabelecimentos na pesquisa por nome e aplicação da regra de limitação de novas solicitações.

Também foram verificados os recursos da área administrativa, incluindo consulta e filtragem de solicitações, atribuição de atendimentos, registro de decisões, manutenção do histórico e geração de relatórios com seus recursos de exportação.

As correções e melhorias identificadas durante os testes e a revisão das funcionalidades foram realizadas para garantir a integração dos novos recursos com a estrutura existente da aplicação.

## 🚀 Próximos Passos

- Registrar eventuais ajustes e sugestões recebidos para avaliação em etapas posteriores.
- Planejar futuras evoluções da aplicação conforme as necessidades identificadas pela equipe e pela DM Financeira.
- Adicionar a recomendação de outros produtos oferecidos pela DM  para os usuários
- Aprimorar o ambiente e as funcionalidades da área de atendimento
