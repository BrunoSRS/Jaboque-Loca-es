import db from '../db/index.js';
import { getPrecoVigente } from './osService.js';

export function debitarEstoque(idPeca, quantidade) {
  const peca = db.prepare('SELECT estoque_atual FROM PECA WHERE id_peca = ?').get(idPeca);
  if (!peca) throw new Error('Peça não encontrada');
  if (peca.estoque_atual < quantidade) {
    throw new Error(`Estoque insuficiente para peça #${idPeca}. Disponível: ${peca.estoque_atual}`);
  }
  db.prepare('UPDATE PECA SET estoque_atual = estoque_atual - ? WHERE id_peca = ?').run(
    quantidade,
    idPeca
  );
}

export function creditarEstoque(idPeca, quantidade) {
  db.prepare('UPDATE PECA SET estoque_atual = estoque_atual + ? WHERE id_peca = ?').run(
    quantidade,
    idPeca
  );
}

export function registrarCompra({ id_fornecedor, id_peca, quantidade, preco_unitario, data_compra, nota_fiscal, criar_precificacao }) {
  const insert = db.prepare(
    `INSERT INTO COMPRA_PECA (id_fornecedor, id_peca, quantidade, preco_unitario, data_compra, nota_fiscal)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const info = insert.run(
    id_fornecedor,
    id_peca,
    quantidade,
    preco_unitario,
    data_compra || new Date().toISOString().slice(0, 10),
    nota_fiscal || null
  );

  creditarEstoque(id_peca, quantidade);

  if (criar_precificacao) {
    const margem = criar_precificacao.margem_lucro ?? 30;
    const precoVenda =
      criar_precificacao.preco_venda_sugerido ??
      preco_unitario * (1 + margem / 100);

    db.prepare(
      `UPDATE PRECIFICACAO SET data_fim = date('now', '-1 day')
       WHERE id_peca = ? AND data_fim IS NULL`
    ).run(id_peca);

    db.prepare(
      `INSERT INTO PRECIFICACAO (id_peca, preco_custo, preco_venda_sugerido, margem_lucro, data_inicio)
       VALUES (?, ?, ?, ?, date('now'))`
    ).run(id_peca, preco_unitario, precoVenda, margem);
  }

  return db.prepare('SELECT * FROM COMPRA_PECA WHERE id_compra = ?').get(info.lastInsertRowid);
}

export function getPrecoSugeridoPeca(idPeca) {
  const prec = getPrecoVigente(idPeca);
  return prec?.preco_venda_sugerido ?? 0;
}
