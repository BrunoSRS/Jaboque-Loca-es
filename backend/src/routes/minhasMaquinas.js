import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { getEquipamento } from '../services/equipamentoService.js';

const router = Router();

const schema = z.object({
  marca: z.string().min(1),
  modelo: z.string().optional().nullable(),
  valor: z.number().nonnegative().optional(),
  data_compra: z.string().optional().nullable(),
  patrimonio: z.string().optional().nullable(),
  acessorios: z.string().optional().nullable(),
  status_acompanhamento: z.string().optional(),
});

function mapRow(row) {
  if (!row) return null;
  return {
    id_minha_maquina: row.id_equipamento,
    id_equipamento: row.id_equipamento,
    marca: row.marca,
    modelo: row.modelo,
    valor: row.valor,
    data_compra: row.data_compra,
    patrimonio: row.patrimonio,
    acessorios: row.acessorios,
    status_acompanhamento: row.status_acompanhamento,
    data_cadastro: row.data_cadastro,
  };
}

router.get('/', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM EQUIPAMENTO WHERE tipo = 'empresa' AND ativo = 1 ORDER BY marca, modelo`
    )
    .all();
  res.json(rows.map(mapRow));
});

router.get('/:id', (req, res) => {
  const row = db
    .prepare(`SELECT * FROM EQUIPAMENTO WHERE id_equipamento = ? AND tipo = 'empresa' AND ativo = 1`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Máquina não encontrada' });
  res.json(mapRow(row));
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  const info = db
    .prepare(
      `INSERT INTO EQUIPAMENTO (
        tipo, marca, modelo, valor, data_compra, patrimonio, acessorios, status_acompanhamento
      ) VALUES ('empresa', ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      d.marca,
      d.modelo,
      d.valor ?? 0,
      d.data_compra,
      d.patrimonio,
      d.acessorios,
      d.status_acompanhamento ?? 'Ativo'
    );
  res.status(201).json(mapRow(getEquipamento(info.lastInsertRowid)));
});

router.put('/:id', validate(schema), (req, res) => {
  const d = req.validated;
  const r = db
    .prepare(
      `UPDATE EQUIPAMENTO SET marca=?, modelo=?, valor=?, data_compra=?, patrimonio=?, acessorios=?, status_acompanhamento=?
       WHERE id_equipamento=? AND tipo='empresa' AND ativo=1`
    )
    .run(
      d.marca,
      d.modelo,
      d.valor ?? 0,
      d.data_compra,
      d.patrimonio,
      d.acessorios,
      d.status_acompanhamento ?? 'Ativo',
      req.params.id
    );
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(mapRow(getEquipamento(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const r = db
    .prepare(`UPDATE EQUIPAMENTO SET ativo = 0 WHERE id_equipamento = ? AND tipo = 'empresa'`)
    .run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND' });
  res.status(204).send();
});

export default router;
