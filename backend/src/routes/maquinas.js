import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const schema = z.object({
  id_cliente: z.number().int(),
  tipo_equipamento: z.string().optional().nullable(),
  marca: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  numero_serie: z.string().optional().nullable(),
  motorizacao: z.string().optional().nullable(),
  ano_fabricacao: z.number().int().optional().nullable(),
  acessorios_recebidos: z.string().optional().nullable(),
});

router.get('/', (req, res) => {
  const { clienteId } = req.query;
  let rows;
  if (clienteId) {
    rows = db
      .prepare(
        `SELECT m.*, c.nome as cliente_nome FROM MAQUINA m
         JOIN CLIENTE c ON c.id_cliente = m.id_cliente
         WHERE m.id_cliente = ? ORDER BY m.tipo_equipamento`
      )
      .all(clienteId);
  } else {
    rows = db
      .prepare(
        `SELECT m.*, c.nome as cliente_nome FROM MAQUINA m
         JOIN CLIENTE c ON c.id_cliente = m.id_cliente ORDER BY c.nome`
      )
      .all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT m.*, c.nome as cliente_nome FROM MAQUINA m
       JOIN CLIENTE c ON c.id_cliente = m.id_cliente WHERE m.id_maquina = ?`
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Máquina não encontrada' });
  res.json(row);
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  const info = db
    .prepare(
      `INSERT INTO MAQUINA (id_cliente, tipo_equipamento, marca, modelo, numero_serie, motorizacao, ano_fabricacao, acessorios_recebidos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      d.id_cliente,
      d.tipo_equipamento,
      d.marca,
      d.modelo,
      d.numero_serie,
      d.motorizacao,
      d.ano_fabricacao,
      d.acessorios_recebidos
    );
  res.status(201).json(db.prepare('SELECT * FROM MAQUINA WHERE id_maquina = ?').get(info.lastInsertRowid));
});

router.put('/:id', validate(schema), (req, res) => {
  const d = req.validated;
  const r = db
    .prepare(
      `UPDATE MAQUINA SET id_cliente=?, tipo_equipamento=?, marca=?, modelo=?, numero_serie=?,
       motorizacao=?, ano_fabricacao=?, acessorios_recebidos=? WHERE id_maquina=?`
    )
    .run(
      d.id_cliente,
      d.tipo_equipamento,
      d.marca,
      d.modelo,
      d.numero_serie,
      d.motorizacao,
      d.ano_fabricacao,
      d.acessorios_recebidos,
      req.params.id
    );
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Máquina não encontrada' });
  res.json(db.prepare('SELECT * FROM MAQUINA WHERE id_maquina = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM MAQUINA WHERE id_maquina = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND', message: 'Máquina não encontrada' });
  res.status(204).send();
});

export default router;
