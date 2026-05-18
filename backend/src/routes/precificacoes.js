import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const schema = z.object({
  id_peca: z.number().int(),
  preco_custo: z.number().nonnegative(),
  preco_venda_sugerido: z.number().nonnegative(),
  margem_lucro: z.number().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional().nullable(),
});

router.get('/', (req, res) => {
  const { pecaId } = req.query;
  const rows = pecaId
    ? db.prepare('SELECT * FROM PRECIFICACAO WHERE id_peca = ? ORDER BY data_inicio DESC').all(pecaId)
    : db.prepare('SELECT * FROM PRECIFICACAO ORDER BY data_inicio DESC').all();
  res.json(rows);
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  db.prepare(
    `UPDATE PRECIFICACAO SET data_fim = date('now', '-1 day')
     WHERE id_peca = ? AND data_fim IS NULL`
  ).run(d.id_peca);

  const info = db
    .prepare(
      `INSERT INTO PRECIFICACAO (id_peca, preco_custo, preco_venda_sugerido, margem_lucro, data_inicio, data_fim)
       VALUES (?, ?, ?, ?, COALESCE(?, date('now')), ?)`
    )
    .run(d.id_peca, d.preco_custo, d.preco_venda_sugerido, d.margem_lucro ?? 0, d.data_inicio, d.data_fim);
  res.status(201).json(db.prepare('SELECT * FROM PRECIFICACAO WHERE id_precificacao = ?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM PRECIFICACAO WHERE id_precificacao = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND' });
  res.status(204).send();
});

export default router;
