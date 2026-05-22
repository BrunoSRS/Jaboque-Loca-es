import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/jaboque.db');
const schemaPath = path.join(__dirname, 'schema.sql');

if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

const hash = bcrypt.hashSync('admin123', 10);

db.prepare(
  `INSERT INTO USUARIO (nome, login, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)`
).run('Administrador', 'admin', hash, 'admin');

db.prepare(
  `INSERT INTO USUARIO (nome, login, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)`
).run('João Técnico', 'tecnico', bcrypt.hashSync('tecnico123', 10), 'tecnico');

db.prepare(
  `INSERT INTO USUARIO (nome, login, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)`
).run('Maria Atendente', 'atendente', bcrypt.hashSync('atendente123', 10), 'atendente');

const clientes = [
  ['Construtora Silva Ltda', '12.345.678/0001-90', '(11) 98765-4321', 'contato@silva.com.br', 'Rua das Obras, 100'],
  ['Mineração Norte S.A.', '98.765.432/0001-10', '(11) 91234-5678', 'ops@mineracao.com', 'Av. Industrial, 500'],
  ['Agro Campos ME', '11.222.333/0001-44', '(19) 99887-7665', 'agro@campos.com', 'Fazenda Boa Vista'],
];
for (const c of clientes) {
  db.prepare(
    `INSERT INTO CLIENTE (nome, cpf_cnpj, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)`
  ).run(...c);
}

const equipamentosEmpresa = [
  ['Caterpillar', '320D', 450000, '2022-03-15', 'PAT-001', 'Cabine, martelo', 'Ativo'],
  ['JCB', '3CX', 280000, '2021-08-20', 'PAT-002', '', 'Em manutenção'],
  ['Volvo', 'L90H', 520000, '2023-01-10', 'PAT-003', 'Balde 3m³', 'Ativo'],
];
const idsEquipamento = [];
for (const m of equipamentosEmpresa) {
  const r = db
    .prepare(
      `INSERT INTO EQUIPAMENTO (tipo, marca, modelo, valor, data_compra, patrimonio, acessorios, status_acompanhamento)
       VALUES ('empresa', ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(...m);
  idsEquipamento.push(r.lastInsertRowid);
}

const equipamentosCliente = [
  [1, 'Escavadeira', 'Komatsu', 'PC200', 'SN-K200-01', 'Hidráulica', 2019, 'PAT-CLI-1'],
  [2, 'Retroescavadeira', 'Case', '580N', 'SN-C580-02', 'Diesel', 2020, 'PAT-CLI-2'],
  [3, 'Pá Carregadeira', 'Volvo', 'L70H', 'SN-V70-03', 'Diesel', 2021, 'PAT-CLI-3'],
];
for (const e of equipamentosCliente) {
  const r = db
    .prepare(
      `INSERT INTO EQUIPAMENTO (tipo, id_cliente, tipo_equipamento, marca, modelo, numero_serie, motorizacao, ano_fabricacao, patrimonio)
       VALUES ('cliente', ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(...e);
  idsEquipamento.push(r.lastInsertRowid);
}

const servicos = [
  ['Revisão geral', 'Revisão completa do equipamento', 850, 4, 'Todos'],
  ['Troca de óleo hidráulico', 'Substituição fluido hidráulico', 320, 2, 'Escavadeira'],
  ['Solda estrutural', 'Reparo estrutural em chassi', 1200, 6, 'Todos'],
  ['Diagnóstico elétrico', 'Análise sistema elétrico', 450, 3, 'Todos'],
  ['Alinhamento de esteiras', 'Ajuste tensionamento esteiras', 680, 5, 'Escavadeira'],
];
for (const s of servicos) {
  db.prepare(
    `INSERT INTO SERVICO_TECNICO (nome, descricao, valor_padrao, tempo_estimado_horas, tipo_maquina_aplicavel)
     VALUES (?, ?, ?, ?, ?)`
  ).run(...s);
}

const pecas = [
  ['7891001001', 'Filtro de óleo hidráulico', 'Filtros', 'Escavadeiras CAT', 'Donaldson', 'UN', 5, 12, 'Prateleira A1'],
  ['7891001002', 'Vedação cilindro', 'Vedações', 'Hidráulico', 'Parker', 'UN', 3, 2, 'Prateleira B2'],
  ['7891001003', 'Correia alternador', 'Motor', 'Todos', 'Gates', 'UN', 4, 8, 'Prateleira C1'],
  ['7891001004', 'Disco freio', 'Freios', 'Retroescavadeira', 'Fremax', 'UN', 2, 6, 'Prateleira D3'],
  ['7891001005', 'Mangueira alta pressão', 'Hidráulico', 'Todos', 'Manuli', 'UN', 5, 1, 'Prateleira A3'],
];
for (const p of pecas) {
  db.prepare(
    `INSERT INTO PECA (codigo_barras, nome, categoria, aplicacao_maquinas, fabricante, unidade_medida, estoque_minimo, estoque_atual, local_armazenamento)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(...p);
}

for (let i = 1; i <= 5; i++) {
  db.prepare(
    `INSERT INTO PRECIFICACAO (id_peca, preco_custo, preco_venda_sugerido, margem_lucro, data_inicio)
     VALUES (?, ?, ?, 35, date('now', '-' || ? || ' days'))`
  ).run(i, 50 + i * 20, 80 + i * 30, i * 10);
}

const fornecedores = [
  ['Peças Pesadas Ltda', '11.111.111/0001-11', 'Carlos', '(11) 3333-4444', 'vendas@pecaspesadas.com'],
  ['Hidráulica Total', '22.222.222/0001-22', 'Ana', '(11) 5555-6666', 'compras@hidraulica.com'],
];
for (const f of fornecedores) {
  db.prepare(`INSERT INTO FORNECEDOR (nome, cnpj, contato, telefone, email) VALUES (?, ?, ?, ?, ?)`).run(...f);
}

db.prepare(
  `INSERT INTO COMPRA_PECA (id_fornecedor, id_peca, quantidade, preco_unitario, data_compra, nota_fiscal)
   VALUES (1, 1, 10, 45.00, date('now', '-15 days'), 'NF-001234')`
).run();

const statuses = ['Orçamento', 'Aberta', 'Em Andamento', 'Aguardando Peças', 'Concluída', 'Orçamento'];
for (let i = 0; i < 6; i++) {
  const clienteId = (i % 3) + 1;
  const status = statuses[i];
  const abertura = `2024-05-${String(5 + i).padStart(2, '0')}`;
  const previsao = `2024-05-${String(10 + i).padStart(2, '0')}`;
  const idEquipamento = idsEquipamento[i % idsEquipamento.length];
  const eq = db.prepare('SELECT * FROM EQUIPAMENTO WHERE id_equipamento = ?').get(idEquipamento);
  const osClienteId = eq.tipo === 'cliente' ? eq.id_cliente : clienteId;

  const r = db
    .prepare(
      `INSERT INTO ORDEM_SERVICO (id_cliente, id_equipamento, data_abertura, data_previsao_entrega, status,
        equipamento_marca, equipamento_modelo, estado_conservacao, defeito_reclamado, patrimonio,
        diagnostico_tecnico, valor_mao_de_obra, prioridade, tecnico_responsavel, id_usuario, data_status_alteracao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Normal', ?, 1, ?)`
    )
    .run(
      osClienteId,
      idEquipamento,
      abertura,
      previsao,
      status,
      eq.marca,
      eq.modelo,
      i % 2 === 0 ? 'Usada' : 'Semi-nova',
      'Perda de potência no motor',
      eq.patrimonio,
      i % 2 === 0 ? 'Filtro obstruído' : null,
      status === 'Orçamento' ? 0 : 200 + i * 50,
      status !== 'Orçamento' ? 'João Técnico' : null,
      status !== 'Orçamento' ? abertura : null
    );

  const idOs = r.lastInsertRowid;
  db.prepare(
    `INSERT INTO SERVICO_OS (id_os, id_servico, valor_praticado, quantidade_horas) VALUES (?, 1, 850, 4)`
  ).run(idOs);

  if (i < 4) {
    db.prepare(
      `INSERT INTO ITEM_OS (id_os, id_peca, quantidade, preco_unitario_original, preco_unitario_aplicado, local_aplicado)
       VALUES (?, 1, 1, 110, 110, 'Sistema hidráulico')`
    ).run(idOs);
    db.prepare('UPDATE PECA SET estoque_atual = estoque_atual - 1 WHERE id_peca = 1').run();
  }

  db.prepare(
    `UPDATE ORDEM_SERVICO SET valor_total_servicos = 850, valor_total_pecas = ?, valor_total_final = ?
     WHERE id_os = ?`
  ).run(i < 4 ? 110 : 0, 200 + i * 50 + 850 + (i < 4 ? 110 : 0), idOs);

  if (status === 'Concluída') {
    db.prepare(
      `INSERT INTO PAGAMENTO (id_os, forma_pagamento, valor_pago, data_pagamento, status_pagamento)
       VALUES (?, 'PIX', ?, date('now', '-2 days'), 'confirmado')`
    ).run(idOs, 200 + i * 50 + 850 + 110);
  }
}

console.log('Seed concluído! Perfis: admin, tecnico, atendente');
