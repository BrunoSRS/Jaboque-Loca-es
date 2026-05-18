import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import {
  getEquipamento,
  listEquipamentos,
  getHistoricoOs,
} from '../services/equipamentoService.js';

const router = Router();

const schema = z
  .object({
    tipo: z.enum(['empresa', 'cliente']),
    id_cliente: z.number().int().optional().nullable(),
    marca: z.string().min(1),
    modelo: z.string().optional().nullable(),
    patrimonio: z.string().optional().nullable(),
    acessorios: z.string().optional().nullable(),
    valor: z.number().nonnegative().optional(),
    data_compra: z.string().optional().nullable(),
    status_acompanhamento: z.string().optional(),
    tipo_equipamento: z.string().optional().nullable(),
    numero_serie: z.string().optional().nullable(),
    motorizacao: z.string().optional().nullable(),
    ano_fabricacao: z.number().int().optional().nullable(),
    estado_conservacao: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === 'cliente' && !data.id_cliente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Equipamento de cliente exige id_cliente',
        path: ['id_cliente'],
      });
    }
    if (data.tipo === 'empresa' && data.id_cliente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Equipamento da empresa não deve ter cliente vinculado',
        path: ['id_cliente'],
      });
    }
  });

router.get('/', (req, res) => {
  const { tipo, clienteId } = req.query;
  res.json(
    listEquipamentos({
      tipo: tipo || undefined,
      clienteId: clienteId ? Number(clienteId) : undefined,
    })
  );
});

router.get('/:id/historico', (req, res) => {
  const eq = getEquipamento(req.params.id);
  if (!eq) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado' });
  res.json(getHistoricoOs(req.params.id));
});

router.get('/:id', (req, res) => {
  const row = getEquipamento(req.params.id);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado' });
  res.json(row);
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  const info = db
    .prepare(
      `INSERT INTO EQUIPAMENTO (
        tipo, id_cliente, marca, modelo, patrimonio, acessorios,
        valor, data_compra, status_acompanhamento,
        tipo_equipamento, numero_serie, motorizacao, ano_fabricacao, estado_conservacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      d.tipo,
      d.tipo === 'cliente' ? d.id_cliente : null,
      d.marca,
      d.modelo,
      d.patrimonio,
      d.acessorios,
      d.tipo === 'empresa' ? d.valor ?? 0 : null,
      d.tipo === 'empresa' ? d.data_compra : null,
      d.tipo === 'empresa' ? d.status_acompanhamento ?? 'Ativo' : null,
      d.tipo === 'cliente' ? d.tipo_equipamento : null,
      d.tipo === 'cliente' ? d.numero_serie : null,
      d.tipo === 'cliente' ? d.motorizacao : null,
      d.tipo === 'cliente' ? d.ano_fabricacao : null,
      d.estado_conservacao
    );
  res.status(201).json(getEquipamento(info.lastInsertRowid));
});

router.put('/:id', validate(schema), (req, res) => {
  const d = req.validated;
  const r = db
    .prepare(
      `UPDATE EQUIPAMENTO SET
        tipo = ?, id_cliente = ?, marca = ?, modelo = ?, patrimonio = ?, acessorios = ?,
        valor = ?, data_compra = ?, status_acompanhamento = ?,
        tipo_equipamento = ?, numero_serie = ?, motorizacao = ?, ano_fabricacao = ?, estado_conservacao = ?
       WHERE id_equipamento = ? AND ativo = 1`
    )
    .run(
      d.tipo,
      d.tipo === 'cliente' ? d.id_cliente : null,
      d.marca,
      d.modelo,
      d.patrimonio,
      d.acessorios,
      d.tipo === 'empresa' ? d.valor ?? 0 : null,
      d.tipo === 'empresa' ? d.data_compra : null,
      d.tipo === 'empresa' ? d.status_acompanhamento ?? 'Ativo' : null,
      d.tipo === 'cliente' ? d.tipo_equipamento : null,
      d.tipo === 'cliente' ? d.numero_serie : null,
      d.tipo === 'cliente' ? d.motorizacao : null,
      d.tipo === 'cliente' ? d.ano_fabricacao : null,
      d.estado_conservacao,
      req.params.id
    );
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(getEquipamento(req.params.id));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('UPDATE EQUIPAMENTO SET ativo = 0 WHERE id_equipamento = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND' });
  res.status(204).send();
});

export default router;
