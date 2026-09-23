use projeto_dm;

-- clientes

insert into tb_cliente (nome_cliente, cpf_cliente, cep_cliente, email_cliente, telefone_cliente, genero_cliente, data_nascimento, tipo_cliente, senha_cliente)
values
    ('Ana Silva', '12345678901', '12230000', 'ana.silva@email.com', '12999990001', 'FEMININO', '2002-04-15', 'COLABORADOR', 'hash_senha_ana'),
    ('Bruno Santos', '23456789012', '12231000', 'bruno.santos@email.com', '12999990002', 'MASCULINO', '1998-08-22', 'NAO COLABORADOR', 'hash_senha_bruno'),
    ('Carla Oliveira', '34567890123', '12232000', 'carla.oliveira@email.com', '12999990003', 'FEMININO', '2001-11-03', 'NAO COLABORADOR', 'hash_senha_carla');

-- lojas

insert into tb_loja (nome_loja, descricao_loja)
values
    ('Loja A', 'Loja parceira.'),
    ('Loja B', 'Loja parceira.'),
    ('Loja C', 'Loja parceira.');

-- filiais

insert into tb_filial (cep_filial, id_loja)
values
    ('12233000', 1),
    ('12234000', 1),
    ('20010000', 2),
    ('20020000', 2),
    ('30110000', 3),
    ('30120000', 3),
    ('80010000', 1),
    ('80020000', 1),
    ('40010000', 2),
    ('40020000', 2),
    ('50010000', 3),
    ('50020000', 3);


-- cartoes

insert into tb_cartao (nome_cartao, tipo_cartao, descricao_cartao, modalidade, bandeirado) 
values
    ('Cartao DM', 'DM', 'Cartao bandeirado DM.', 'FISICO', true),
    ('cartao DM digital', 'DM', 'Cartao bandeirado DM.', 'DIGITAL', true),
    ('Cartao loja A', 'LOJA', 'Cartao exclusivo para compras na loja A.','FISICO', false),
    ('Cartao loja B', 'LOJA', 'Cartao digital oferecido pela loja beta.', 'DIGITAL', true);

-- cartoes loja

insert into tb_cartao_loja (id_cartao, id_loja)
values
    (3, 1),
    (4, 2);


-- solicitacoes

insert into tb_solicitacao (status, id_cliente, id_cartao)
values
    ('EM ANALISE', 1, 1),
    ('ACEITO', 2, 3),
    ('NEGADO', 3, 2);
