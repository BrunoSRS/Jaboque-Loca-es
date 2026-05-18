import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const schema = z.object({
  nome: z.string().min(1),
  cnpj: z.string().optional().nullable(),
  contato: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
});

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM FORNECEDOR ORDER BY nome').all());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM FORNECEDOR WHERE id_fornecedor = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Fornecedor não encontrado' });
  res.json(row);
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  const info = db
    .prepare(`INSERT INTO FORNECEDOR (nome, cnpj, contato, telefone, email) VALUES (?, ?, ?, ?, ?)`)
    .run(d.nome, d.cnpj, d.contato, d.telefone, d.email);
  res.status(201).json(db.prepare('SELECT * FROM FORNECEDOR WHERE id_fornecedor = ?').get(info.lastInsertRowid));
});

router.put('/:id', validate(schema), (req, res) => {
  const d = req.validated;
  const r = db
    .prepare(`UPDATE FORNECEDOR SET nome=?, cnpj=?, contato=?, telefone=?, email=? WHERE id_fornecedor=?`)
    .run(d.nome, d.cnpj, d.contato, d.telefone, d.email, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Fornecedor não encontrado' });
  res.json(db.prepare('SELECT * FROM FORNECEDOR WHERE id_fornecedor = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM FORNECEDOR WHERE id_fornecedor = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Fornecedor não encontrado' });
  res.status(204).send();
});

export default router;
