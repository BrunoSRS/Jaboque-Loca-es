import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const schema = z.object({
  nome: z.string().min(1),
  cpf_cnpj: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  data_cadastro: z.string().optional(),
});

router.get('/', (req, res) => {
  const q = req.query.q;
  let rows;
  if (q) {
    rows = db
      .prepare(
        `SELECT * FROM CLIENTE WHERE nome LIKE ? OR cpf_cnpj LIKE ? ORDER BY nome`
      )
      .all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM CLIENTE ORDER BY nome').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM CLIENTE WHERE id_cliente = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado' });
  res.json(row);
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  const info = db
    .prepare(
      `INSERT INTO CLIENTE (nome, cpf_cnpj, telefone, email, endereco, data_cadastro)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, date('now')))`
    )
    .run(d.nome, d.cpf_cnpj, d.telefone, d.email, d.endereco, d.data_cadastro);
  res.status(201).json(db.prepare('SELECT * FROM CLIENTE WHERE id_cliente = ?').get(info.lastInsertRowid));
});

router.put('/:id', validate(schema), (req, res) => {
  const d = req.validated;
  const r = db
    .prepare(
      `UPDATE CLIENTE SET nome=?, cpf_cnpj=?, telefone=?, email=?, endereco=? WHERE id_cliente=?`
    )
    .run(d.nome, d.cpf_cnpj, d.telefone, d.email, d.endereco, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado' });
  res.json(db.prepare('SELECT * FROM CLIENTE WHERE id_cliente = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  try {
    const r = db.prepare('DELETE FROM CLIENTE WHERE id_cliente = ?').run(req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado' });
    res.status(204).send();
  } catch (e) {
    res.status(400).json({ error: 'CONSTRAINT', message: 'Cliente possui vínculos e não pode ser excluído' });
  }
});

export default router;
