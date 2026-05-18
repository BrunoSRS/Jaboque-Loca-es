PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS CLIENTE (
  id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  data_cadastro TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS MINHA_MAQUINA (
  id_minha_maquina INTEGER PRIMARY KEY AUTOINCREMENT,
  marca TEXT NOT NULL,
  modelo TEXT,
  valor REAL DEFAULT 0,
  data_compra TEXT,
  patrimonio TEXT,
  acessorios TEXT,
  status_acompanhamento TEXT DEFAULT 'Ativo',
  data_cadastro TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS EQUIPAMENTO (
  id_equipamento INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('empresa', 'cliente')),
  id_cliente INTEGER,
  marca TEXT NOT NULL,
  modelo TEXT,
  patrimonio TEXT,
  acessorios TEXT,
  valor REAL DEFAULT 0,
  data_compra TEXT,
  status_acompanhamento TEXT DEFAULT 'Ativo',
  tipo_equipamento TEXT,
  numero_serie TEXT,
  motorizacao TEXT,
  ano_fabricacao INTEGER,
  estado_conservacao TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  data_cadastro TEXT DEFAULT (date('now')),
  FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente)
);

CREATE TABLE IF NOT EXISTS USUARIO (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'atendente',
  ativo INTEGER NOT NULL DEFAULT 1,
  assinatura_digital TEXT
);

CREATE TABLE IF NOT EXISTS SERVICO_TECNICO (
  id_servico INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_padrao REAL NOT NULL DEFAULT 0,
  tempo_estimado_horas INTEGER DEFAULT 1,
  tipo_maquina_aplicavel TEXT
);

CREATE TABLE IF NOT EXISTS PECA (
  id_peca INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_barras TEXT,
  nome TEXT NOT NULL,
  categoria TEXT,
  aplicacao_maquinas TEXT,
  fabricante TEXT,
  unidade_medida TEXT DEFAULT 'UN',
  estoque_minimo INTEGER DEFAULT 0,
  estoque_atual INTEGER DEFAULT 0,
  local_armazenamento TEXT
);

CREATE TABLE IF NOT EXISTS FORNECEDOR (
  id_fornecedor INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  telefone TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS PRECIFICACAO (
  id_precificacao INTEGER PRIMARY KEY AUTOINCREMENT,
  id_peca INTEGER NOT NULL,
  preco_custo REAL NOT NULL DEFAULT 0,
  preco_venda_sugerido REAL NOT NULL DEFAULT 0,
  margem_lucro REAL DEFAULT 0,
  data_inicio TEXT DEFAULT (date('now')),
  data_fim TEXT,
  FOREIGN KEY (id_peca) REFERENCES PECA(id_peca)
);

CREATE TABLE IF NOT EXISTS ORDEM_SERVICO (
  id_os INTEGER PRIMARY KEY AUTOINCREMENT,
  id_cliente INTEGER NOT NULL,
  id_equipamento INTEGER,
  data_abertura TEXT DEFAULT (date('now')),
  data_previsao_entrega TEXT,
  data_conclusao TEXT,
  data_status_alteracao TEXT,
  status TEXT DEFAULT 'Orçamento',
  equipamento_marca TEXT,
  equipamento_modelo TEXT,
  estado_conservacao TEXT,
  defeito_reclamado TEXT,
  foto_equipamento TEXT,
  patrimonio TEXT,
  sintoma_reclamado TEXT,
  diagnostico_tecnico TEXT,
  servicos_executados_desc TEXT,
  observacoes_internas TEXT,
  observacoes_cliente TEXT,
  valor_mao_de_obra REAL DEFAULT 0,
  valor_total_servicos REAL DEFAULT 0,
  valor_total_pecas REAL DEFAULT 0,
  valor_desconto_global REAL DEFAULT 0,
  tipo_desconto_global TEXT,
  valor_total_final REAL DEFAULT 0,
  prioridade TEXT DEFAULT 'Normal',
  tecnico_responsavel TEXT,
  id_usuario INTEGER,
  FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente),
  FOREIGN KEY (id_equipamento) REFERENCES EQUIPAMENTO(id_equipamento),
  FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
);

CREATE TABLE IF NOT EXISTS SERVICO_OS (
  id_servico_os INTEGER PRIMARY KEY AUTOINCREMENT,
  id_os INTEGER NOT NULL,
  id_servico INTEGER NOT NULL,
  valor_praticado REAL NOT NULL DEFAULT 0,
  quantidade_horas INTEGER DEFAULT 1,
  observacao TEXT,
  FOREIGN KEY (id_os) REFERENCES ORDEM_SERVICO(id_os) ON DELETE CASCADE,
  FOREIGN KEY (id_servico) REFERENCES SERVICO_TECNICO(id_servico)
);

CREATE TABLE IF NOT EXISTS ITEM_OS (
  id_item_os INTEGER PRIMARY KEY AUTOINCREMENT,
  id_os INTEGER NOT NULL,
  id_peca INTEGER NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario_original REAL NOT NULL DEFAULT 0,
  preco_unitario_aplicado REAL NOT NULL DEFAULT 0,
  desconto_item REAL DEFAULT 0,
  motivo_desconto TEXT,
  local_aplicado TEXT,
  FOREIGN KEY (id_os) REFERENCES ORDEM_SERVICO(id_os) ON DELETE CASCADE,
  FOREIGN KEY (id_peca) REFERENCES PECA(id_peca)
);

CREATE TABLE IF NOT EXISTS PAGAMENTO (
  id_pagamento INTEGER PRIMARY KEY AUTOINCREMENT,
  id_os INTEGER NOT NULL,
  forma_pagamento TEXT NOT NULL,
  valor_pago REAL NOT NULL,
  data_pagamento TEXT DEFAULT (date('now')),
  status_pagamento TEXT DEFAULT 'confirmado',
  parcela TEXT,
  FOREIGN KEY (id_os) REFERENCES ORDEM_SERVICO(id_os)
);

CREATE TABLE IF NOT EXISTS DOCUMENTO_OS (
  id_documento INTEGER PRIMARY KEY AUTOINCREMENT,
  id_os INTEGER NOT NULL,
  tipo_documento TEXT NOT NULL,
  numero_documento TEXT,
  data_emissao TEXT DEFAULT (date('now')),
  caminho_arquivo_pdf TEXT,
  assinatura_cliente TEXT,
  assinatura_tecnico TEXT,
  id_usuario INTEGER,
  FOREIGN KEY (id_os) REFERENCES ORDEM_SERVICO(id_os),
  FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
);

CREATE TABLE IF NOT EXISTS COMPRA_PECA (
  id_compra INTEGER PRIMARY KEY AUTOINCREMENT,
  id_fornecedor INTEGER NOT NULL,
  id_peca INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL,
  data_compra TEXT DEFAULT (date('now')),
  nota_fiscal TEXT,
  FOREIGN KEY (id_fornecedor) REFERENCES FORNECEDOR(id_fornecedor),
  FOREIGN KEY (id_peca) REFERENCES PECA(id_peca)
);

CREATE TABLE IF NOT EXISTS DEMANDA (
  id_demanda INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  setor TEXT DEFAULT 'Oficina',
  status TEXT NOT NULL DEFAULT 'pendente',
  prioridade TEXT DEFAULT 'media',
  id_usuario INTEGER,
  data_referencia TEXT DEFAULT (date('now')),
  data_limite TEXT,
  observacoes TEXT,
  data_criacao TEXT DEFAULT (datetime('now')),
  data_finalizacao TEXT,
  FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
);

CREATE TABLE IF NOT EXISTS ATIVIDADE_DIA (
  id_atividade INTEGER PRIMARY KEY AUTOINCREMENT,
  data_referencia TEXT DEFAULT (date('now')),
  horario TEXT NOT NULL,
  id_usuario INTEGER,
  nome_usuario TEXT,
  tipo TEXT NOT NULL,
  referencia TEXT,
  observacoes TEXT,
  id_os INTEGER,
  id_demanda INTEGER,
  FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario),
  FOREIGN KEY (id_os) REFERENCES ORDEM_SERVICO(id_os),
  FOREIGN KEY (id_demanda) REFERENCES DEMANDA(id_demanda)
);
