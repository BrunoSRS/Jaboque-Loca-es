import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { getPrecoVigente } from '../services/osService.js';

const router = Router();

const schema = z.object({
  codigo_barras: z.string().optional().nullable(),
  nome: z.string().min(1),
  categoria: z.string().optional().nullable(),
  aplicacao_maquinas: z.string().optional().nullable(),
  fabricante: z.string().optional().nullable(),
  unidade_medida: z.string().optional(),
  estoque_minimo: z.number().int().optional(),
  estoque_atual: z.number().int().optional(),
  local_armazenamento: z.string().optional().nullable(),
});

router.get('/estoque-baixo', (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM PECA WHERE estoque_atual <= estoque_minimo ORDER BY estoque_atual`)
    .all();
  res.json(rows);
});

router.get('/', (req, res) => {
  const { q, estoque, estoqueMin, estoqueMax, ordenar } = req.query;

  let sql = 'SELECT * FROM PECA WHERE 1=1';
  const params = [];

  if (q) {
    sql += ' AND (nome LIKE ? OR codigo_barras LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  if (estoque === 'zerado') {
    sql += ' AND estoque_atual = 0';
  } else if (estoque === 'baixo') {
    sql += ' AND estoque_atual <= estoque_minimo AND estoque_atual > 0';
  } else if (estoque === 'critico') {
    sql += ' AND estoque_atual <= estoque_minimo';
  } else if (estoque === 'ok') {
    sql += ' AND estoque_atual > estoque_minimo';
  }

  if (estoqueMin !== undefined && estoqueMin !== '') {
    const min = Number(estoqueMin);
    if (!Number.isNaN(min)) {
      sql += ' AND estoque_atual >= ?';
      params.push(min);
    }
  }
  if (estoqueMax !== undefined && estoqueMax !== '') {
    const max = Number(estoqueMax);
    if (!Number.isNaN(max)) {
      sql += ' AND estoque_atual <= ?';
      params.push(max);
    }
  }

  const orderMap = {
    nome: 'nome',
    estoque_asc: 'estoque_atual ASC, nome',
    estoque_desc: 'estoque_atual DESC, nome',
  };
  sql += ` ORDER BY ${orderMap[ordenar] || 'nome'}`;

  const rows = db.prepare(sql).all(...params);
  const enriched = rows.map((p) => ({ ...p, precificacao_vigente: getPrecoVigente(p.id_peca) }));
  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM PECA WHERE id_peca = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Peça não encontrada' });
  res.json({ ...row, precificacao_vigente: getPrecoVigente(row.id_peca) });
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  const info = db
    .prepare(
      `INSERT INTO PECA (codigo_barras, nome, categoria, aplicacao_maquinas, fabricante, unidade_medida, estoque_minimo, estoque_atual, local_armazenamento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      d.codigo_barras,
      d.nome,
      d.categoria,
      d.aplicacao_maquinas,
      d.fabricante,
      d.unidade_medida ?? 'UN',
      d.estoque_minimo ?? 0,
      d.estoque_atual ?? 0,
      d.local_armazenamento
    );
  res.status(201).json(db.prepare('SELECT * FROM PECA WHERE id_peca = ?').get(info.lastInsertRowid));
});

router.put('/:id', validate(schema), (req, res) => {
  const d = req.validated;
  const r = db
    .prepare(
      `UPDATE PECA SET codigo_barras=?, nome=?, categoria=?, aplicacao_maquinas=?, fabricante=?,
       unidade_medida=?, estoque_minimo=?, estoque_atual=?, local_armazenamento=? WHERE id_peca=?`
    )
    .run(
      d.codigo_barras,
      d.nome,
      d.categoria,
      d.aplicacao_maquinas,
      d.fabricante,
      d.unidade_medida ?? 'UN',
      d.estoque_minimo ?? 0,
      d.estoque_atual ?? 0,
      d.local_armazenamento,
      req.params.id
    );
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Peça não encontrada' });
  res.json(db.prepare('SELECT * FROM PECA WHERE id_peca = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM PECA WHERE id_peca = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Peça não encontrada' });
  res.status(204).send();
});

export default router;
