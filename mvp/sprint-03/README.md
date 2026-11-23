# 📦 MVP — Sprint 3

## 🎯 Objetivo

Expandir as funcionalidades da plataforma DM Financeira, aprimorando a experiência do cliente e os recursos de gerenciamento disponíveis para os atendentes.

A sprint teve como foco implementar a comunicação interna entre clientes e atendentes, aprimorar a busca por lojas parceiras por meio de filtros de categorias e recomendações baseadas na proximidade, disponibilizar recomendações de outros produtos para clientes com solicitações de cartão negadas e evoluir os recursos administrativos de acompanhamento, análise e visualização de dados.

## 💡 Solução

Foram implementadas melhorias nas áreas do cliente e do atendente, ampliando e aperfeiçoando funcionalidades já existentes na plataforma.

Na **área do cliente**, foi desenvolvido um sistema de mensagens para permitir a comunicação direta com os atendentes durante o processo de atendimento. A busca por lojas parceiras também foi aprimorada, permitindo a filtragem por categorias e facilitando a localização de estabelecimentos de acordo com a proximidade. Além disso, foi criada uma seção de recomendação de outros produtos da DM para clientes que tiveram suas solicitações de cartão negadas, apresentando alternativas disponíveis na plataforma.

Na **área do atendente**, foram aprimorados os recursos administrativos, incluindo a evolução do dashboard de indicadores, a ampliação dos relatórios gerenciais e a integração do sistema de mensagens ao fluxo de atendimento. Essas melhorias permitem acompanhar as solicitações com mais informações, visualizar dados relevantes e consultar resultados por meio de diferentes indicadores e relatórios.

Também foram realizadas melhorias na organização e na apresentação das informações, buscando tornar a navegação mais clara e facilitar tanto o acompanhamento das solicitações quanto a análise dos resultados da plataforma.

## 👤 User Stories

| Rank | ID | User Story | Prioridade | Estimativa |
|:----:|:----:|:-----------|:----------:|:----------:|
| 11 | US07 | Como cliente que não foi aprovado para um cartão, quero visualizar outros produtos disponíveis, para conhecer alternativas que possam atender às minhas necessidades. | Baixa | 5 |
| 12 | US09 | Como atendente DM, quero enviar mensagens ao cliente pela plataforma, para orientá-lo sem depender dos canais externos de atendimento. | Média | 8 |

## 🔗 Sprints Relacionadas

**Sprint 2:** estabeleceu a estrutura inicial da área administrativa, do gerenciamento de solicitações e do acompanhamento de indicadores. Essa estrutura serviu como base para a evolução do dashboard, dos relatórios e dos recursos de atendimento implementados na Sprint 3.

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
- O cliente deve conseguir buscar lojas parceiras utilizando filtros por categorias.
- A busca por lojas deve considerar a proximidade para facilitar a localização de estabelecimentos.
- O cliente deve conseguir acessar o sistema de mensagens pela sua área de acompanhamento.
- O atendente deve conseguir visualizar e responder às mensagens dos clientes vinculadas às solicitações.
- O histórico de mensagens deve permanecer disponível para consulta durante o atendimento.
- O dashboard deve apresentar corretamente os indicadores e gráficos definidos para acompanhamento das solicitações.
- Os relatórios devem apresentar informações correspondentes aos filtros e períodos selecionados.
- As funcionalidades aprimoradas devem manter a compatibilidade com os fluxos já existentes da aplicação.

## DoD (Definition of Done)

| Critério | Descrição |
|---------|----------|
| Critérios atendidos | Os critérios de aceitação definidos para as funcionalidades foram cumpridos |
| Implementação | As funcionalidades e melhorias previstas foram implementadas |
| Testes | Foram realizados testes de rotas com Postman e testes manuais das interfaces |
| Integração | As novas funcionalidades estão integradas às áreas do cliente e do atendente |
| Qualidade | Código organizado, versionado e sem comprometer funcionalidades existentes |
| Documentação | A documentação correspondente foi atualizada |

## 📊 Validação

Foram realizados testes de rotas utilizando o **Postman**, verificando as respostas da API e o funcionamento das operações implementadas.

Também foram realizados testes manuais nas interfaces do cliente e do atendente, validando a comunicação entre frontend e backend, o funcionamento do sistema de mensagens, a busca e filtragem de lojas, a apresentação das recomendações de produtos e a exibição dos indicadores e relatórios.

Por fim, foram verificadas as integrações entre as funcionalidades novas e os fluxos já existentes, garantindo o funcionamento conjunto das diferentes áreas da aplicação.

## 🚀 Possibilidades de Evolução Futura

Com a conclusão do desenvolvimento da aplicação, as próximas etapas representam oportunidades de manutenção e evolução do projeto, não funcionalidades pendentes da entrega atual.

Entre as possibilidades para futuras versões, destacam-se:

- **Manutenção corretiva:** identificação e correção de eventuais falhas ou inconsistências após a entrega.
- **Aprimoramento da experiência do usuário:** evolução da interface, acessibilidade, navegação e apresentação das informações.
- **Expansão funcional:** inclusão de novos recursos para clientes e atendentes, conforme necessidades identificadas.
- **Desempenho e segurança:** otimização de consultas, melhoria da eficiência da aplicação e revisão de mecanismos de segurança.
- **Evolução administrativa:** ampliação dos indicadores, relatórios e ferramentas de acompanhamento.
- **Atualizações tecnológicas:** manutenção das dependências e adaptação da aplicação a futuras necessidades e tecnologias.

Essas possibilidades poderão orientar futuras versões da plataforma, permitindo sua continuidade e evolução após a conclusão do escopo desenvolvido.
