import db from '../db/index.js';

export function getPrecoVigente(idPeca) {
  return db
    .prepare(
      `SELECT * FROM PRECIFICACAO
       WHERE id_peca = ? AND (data_fim IS NULL OR data_fim >= date('now'))
       ORDER BY data_inicio DESC LIMIT 1`
    )
    .get(idPeca);
}

export function recalcularTotais(idOs) {
  const os = db.prepare('SELECT * FROM ORDEM_SERVICO WHERE id_os = ?').get(idOs);
  if (!os) throw new Error('OS não encontrada');

  const servicos = db
    .prepare(
      `SELECT COALESCE(SUM(valor_praticado * COALESCE(quantidade_horas, 1)), 0) as total
       FROM SERVICO_OS WHERE id_os = ?`
    )
    .get(idOs);

  const pecas = db
    .prepare(
      `SELECT COALESCE(SUM(
         (preco_unitario_aplicado * quantidade) - COALESCE(desconto_item, 0)
       ), 0) as total FROM ITEM_OS WHERE id_os = ?`
    )
    .get(idOs);

  const valorTotalServicos = servicos?.total ?? 0;
  const valorTotalPecas = pecas?.total ?? 0;
  let desconto = os.valor_desconto_global ?? 0;

  if (os.tipo_desconto_global === 'percentual' && desconto > 0) {
    const subtotal = (os.valor_mao_de_obra ?? 0) + valorTotalServicos + valorTotalPecas;
    desconto = (subtotal * desconto) / 100;
  }

  const valorTotalFinal =
    (os.valor_mao_de_obra ?? 0) + valorTotalServicos + valorTotalPecas - desconto;

  db.prepare(
    `UPDATE ORDEM_SERVICO SET
      valor_total_servicos = ?,
      valor_total_pecas = ?,
      valor_total_final = ?
     WHERE id_os = ?`
  ).run(valorTotalServicos, valorTotalPecas, Math.max(0, valorTotalFinal), idOs);

  return db.prepare('SELECT * FROM ORDEM_SERVICO WHERE id_os = ?').get(idOs);
}

export function getOsCompleta(idOs) {
  const os = db.prepare('SELECT * FROM ORDEM_SERVICO WHERE id_os = ?').get(idOs);
  if (!os) return null;

  const cliente = db.prepare('SELECT * FROM CLIENTE WHERE id_cliente = ?').get(os.id_cliente);

  const equipamento = os.id_equipamento
    ? db
        .prepare(
          `SELECT e.*, c.nome as cliente_nome
           FROM EQUIPAMENTO e
           LEFT JOIN CLIENTE c ON c.id_cliente = e.id_cliente
           WHERE e.id_equipamento = ?`
        )
        .get(os.id_equipamento)
    : null;

  const servicos = db
    .prepare(
      `SELECT so.*, st.nome as servico_nome, st.descricao
       FROM SERVICO_OS so
       JOIN SERVICO_TECNICO st ON st.id_servico = so.id_servico
       WHERE so.id_os = ?`
    )
    .all(idOs);

  const itens = db
    .prepare(
      `SELECT io.*, p.nome as peca_nome, p.codigo_barras
       FROM ITEM_OS io
       JOIN PECA p ON p.id_peca = io.id_peca
       WHERE io.id_os = ?`
    )
    .all(idOs);

  const pagamentos = db.prepare('SELECT * FROM PAGAMENTO WHERE id_os = ?').all(idOs);
  const documentos = db.prepare('SELECT * FROM DOCUMENTO_OS WHERE id_os = ?').all(idOs);

  return { ...os, cliente, equipamento, servicos, itens, pagamentos, documentos };
}

export function atualizarStatusPagamento(idOs) {
  const os = db.prepare('SELECT valor_total_final FROM ORDEM_SERVICO WHERE id_os = ?').get(idOs);
  if (!os) return;

  const pago = db
    .prepare(
      `SELECT COALESCE(SUM(valor_pago), 0) as total FROM PAGAMENTO
       WHERE id_os = ? AND status_pagamento = 'confirmado'`
    )
    .get(idOs);

  const totalPago = pago?.total ?? 0;
  let status = 'pendente';
  if (totalPago >= os.valor_total_final && os.valor_total_final > 0) status = 'pago';
  else if (totalPago > 0) status = 'parcial';

  return status;
}
