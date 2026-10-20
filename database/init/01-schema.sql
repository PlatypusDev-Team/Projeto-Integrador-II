-- create database projeto_dm;
use projeto_dm;

create table tb_cliente (
	id_cliente int auto_increment primary key,
    nome_cliente varchar(50) not null,
    cpf_cliente char(11) not null unique,
    cep_cliente char(8) null,
    email_cliente varchar(100) not null unique,
    telefone_cliente varchar(11) not null unique,
    genero_cliente enum('MASCULINO', 'FEMININO', 'OUTRO') not null,
    data_nascimento date not null,
    tipo_cliente enum('COLABORADOR','NAO COLABORADOR') not null,
    senha_hash_cliente varchar(255) not null
);

create table tb_atendente (
	id_atendente int auto_increment primary key,
    nome_atendente varchar(50) not null,
    email_atendente varchar(100) not null unique,
    senha_hash_atendente varchar(255) not null,
    id_cliente int null unique,
    foreign key (id_cliente) references tb_cliente(id_cliente)
);

create table tb_produto (
	id_produto int auto_increment primary key
);

create table tb_servico (
	id_produto int primary key,
    nome_servico varchar(30) not null,
    descricao_servico longtext not null,
    ativo_servico boolean not null default 1,
    foreign key (id_produto) references tb_produto(id_produto)
);

create table tb_loja (
	id_loja int auto_increment primary key,
    nome_loja varchar(30) not null,
    descricao_loja longtext not null
);

create table tb_cartao (
	id_produto int primary key,
    nome_cartao varchar(30) not null,
    tipo_cartao enum('DM', 'LOJA') not null,
    descricao_cartao longtext not null,
    modalidade enum('FISICO', 'DIGITAL') not null,
    bandeirado boolean not null default 0,
    id_loja int null,
    foreign key (id_produto) references tb_produto(id_produto),
    foreign key (id_loja) references tb_loja(id_loja),
    constraint chk_cartao_loja check (
        (tipo_cartao = 'LOJA' and id_loja is not null) or
        (tipo_cartao = 'DM' and id_loja is null)
    )
);

create table tb_solicitacao (
	id_solicitacao int auto_increment primary key,
    status enum('EM ANALISE', 'ACEITO', 'NEGADO') not null,
    id_cliente int not null,
    id_produto int not null,
    data_solicitacao timestamp null default null,
    data_conclusao timestamp null default null,
    id_atendente_responsavel int null,
    foreign key (id_cliente) references tb_cliente(id_cliente),
    foreign key (id_produto) references tb_produto(id_produto),
    foreign key (id_atendente_responsavel) references tb_atendente(id_atendente)
);

create table tb_atendimento (
	id_atendimento int auto_increment primary key,
    historico_atendimento longtext not null,
    data_atendimento timestamp default current_timestamp,
    id_solicitacao int not null,
    id_atendente int not null,
    foreign key (id_solicitacao) references tb_solicitacao(id_solicitacao),
    foreign key (id_atendente) references tb_atendente(id_atendente)
);

create table tb_filial (
	id_filial int auto_increment primary key,
    cep_filial char(8) not null,
    uf_filial char(2),
    id_loja int not null,
    foreign key (id_loja) references tb_loja(id_loja)
);