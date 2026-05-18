import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const schema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  valor_padrao: z.number().nonnegative(),
  tempo_estimado_horas: z.number().int().optional(),
  tipo_maquina_aplicavel: z.string().optional().nullable(),
});

router.get('/', (req, res) => {
  const q = req.query.q;
  const rows = q
    ? db.prepare(`SELECT * FROM SERVICO_TECNICO WHERE nome LIKE ? ORDER BY nome`).all(`%${q}%`)
    : db.prepare('SELECT * FROM SERVICO_TECNICO ORDER BY nome').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM SERVICO_TECNICO WHERE id_servico = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Serviço não encontrado' });
  res.json(row);
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  const info = db
    .prepare(
      `INSERT INTO SERVICO_TECNICO (nome, descricao, valor_padrao, tempo_estimado_horas, tipo_maquina_aplicavel)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(d.nome, d.descricao, d.valor_padrao, d.tempo_estimado_horas ?? 1, d.tipo_maquina_aplicavel);
  res.status(201).json(db.prepare('SELECT * FROM SERVICO_TECNICO WHERE id_servico = ?').get(info.lastInsertRowid));
});

router.put('/:id', validate(schema), (req, res) => {
  const d = req.validated;
  const r = db
    .prepare(
      `UPDATE SERVICO_TECNICO SET nome=?, descricao=?, valor_padrao=?, tempo_estimado_horas=?, tipo_maquina_aplicavel=? WHERE id_servico=?`
    )
    .run(d.nome, d.descricao, d.valor_padrao, d.tempo_estimado_horas ?? 1, d.tipo_maquina_aplicavel, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Serviço não encontrado' });
  res.json(db.prepare('SELECT * FROM SERVICO_TECNICO WHERE id_servico = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM SERVICO_TECNICO WHERE id_servico = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Serviço não encontrado' });
  res.status(204).send();
});

export default router;
