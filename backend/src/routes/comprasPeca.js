import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { registrarCompra } from '../services/estoqueService.js';

const router = Router();

const schema = z.object({
  id_fornecedor: z.number().int(),
  id_peca: z.number().int(),
  quantidade: z.number().int().positive(),
  preco_unitario: z.number().nonnegative(),
  data_compra: z.string().optional(),
  nota_fiscal: z.string().optional().nullable(),
  criar_precificacao: z
    .object({
      margem_lucro: z.number().optional(),
      preco_venda_sugerido: z.number().optional(),
    })
    .optional(),
});

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT cp.*, f.nome as fornecedor_nome, p.nome as peca_nome
       FROM COMPRA_PECA cp
       JOIN FORNECEDOR f ON f.id_fornecedor = cp.id_fornecedor
       JOIN PECA p ON p.id_peca = cp.id_peca
       ORDER BY cp.data_compra DESC`
    )
    .all();
  res.json(rows);
});

router.post('/', validate(schema), (req, res) => {
  try {
    const compra = registrarCompra(req.validated);
    res.status(201).json(compra);
  } catch (e) {
    res.status(400).json({ error: 'BUSINESS_ERROR', message: e.message });
  }
});

export default router;
