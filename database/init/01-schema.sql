-- create database projeto_dm;
use projeto_dm;

create table tb_cliente (
	id_cliente int auto_increment primary key,
    nome_cliente varchar(50) not null,
    cpf_cliente varchar(15) not null unique,
    cep_cliente varchar(9) not null,
    email_cliente varchar(100) not null unique,
    telefone_cliente varchar(14) not null unique,
    genero_cliente enum('MASCULINO', 'FEMININO', 'OUTRO') not null,
    data_nascimento date not null,
    tipo_cliente enum('COLABORADOR','NAO COLABORADOR') not null,
    senha_cliente VARCHAR(250) not null
);

create table tb_cartao (
	id_cartao int auto_increment primary key,
    nome_cartao varchar(20) not null,
    tipo_cartao enum('DM', 'LOJA') not null,
    descricao_cartao longtext not null,
    modalidade enum('FISICO', 'DIGITAL') not null,
    bandeirado boolean not null
);

create table tb_loja (
	id_loja int auto_increment primary key,
    nome_loja varchar(20) not null,
    descricao_loja longtext not null
);

create table tb_solicitacao (
	id_solicitacao int auto_increment primary key,
    status enum('EM ANALISE', 'ACEITO', 'NEGADO') not null,
    id_cliente int not null,
    id_cartao int not null,
    foreign key (id_cliente) references tb_cliente(id_cliente),
    foreign key (id_cartao) references tb_cartao(id_cartao)
);

create table tb_cartao_loja (
	id_cartao_loja int auto_increment primary key,
    id_cartao int not null,
    id_loja int not null,
    foreign key (id_cartao) references tb_cartao(id_cartao),
    foreign key (id_loja) references tb_loja(id_loja),
    unique (id_cartao, id_loja)
);

create table tb_filial (
	id_filial int auto_increment primary key,
    cep_filial varchar(9) not null,
    id_loja int not null,
    foreign key (id_loja) references tb_loja(id_loja)
);

create table tb_busca_cep (
    id_busca_cep int auto_increment primary key,
    cep_busca varchar(9) not null,
    cidade_busca varchar(100),
    uf_busca varchar(2),
    latitude decimal(9, 6),
    longitude decimal(9, 6),
    id_cliente int null,
    data_busca datetime not null default current_timestamp,
    foreign key (id_cliente) references tb_cliente(id_cliente)
        on delete set null
);

create index idx_cep_busca on tb_busca_cep (cep_busca);