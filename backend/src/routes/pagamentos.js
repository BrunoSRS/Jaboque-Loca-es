import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { atualizarStatusPagamento } from '../services/osService.js';

const router = Router();

const schema = z.object({
  id_os: z.number().int(),
  forma_pagamento: z.string().min(1),
  valor_pago: z.number().positive(),
  data_pagamento: z.string().optional(),
  status_pagamento: z.string().optional(),
  parcela: z.string().optional().nullable(),
});

router.get('/', (req, res) => {
  const { osId } = req.query;
  let rows;
  if (osId) {
    rows = db.prepare('SELECT * FROM PAGAMENTO WHERE id_os = ? ORDER BY data_pagamento DESC').all(osId);
  } else {
    rows = db
      .prepare(
        `SELECT p.*, os.id_os, c.nome as cliente_nome
         FROM PAGAMENTO p
         JOIN ORDEM_SERVICO os ON os.id_os = p.id_os
         JOIN CLIENTE c ON c.id_cliente = os.id_cliente
         ORDER BY p.data_pagamento DESC`
      )
      .all();
  }
  const enriched = rows.map((p) => ({
    ...p,
    status_financeiro_os: atualizarStatusPagamento(p.id_os),
  }));
  res.json(enriched);
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  const os = db.prepare('SELECT id_os FROM ORDEM_SERVICO WHERE id_os = ?').get(d.id_os);
  if (!os) return res.status(404).json({ error: 'NOT_FOUND', message: 'OS não encontrada' });

  const info = db
    .prepare(
      `INSERT INTO PAGAMENTO (id_os, forma_pagamento, valor_pago, data_pagamento, status_pagamento, parcela)
       VALUES (?, ?, ?, COALESCE(?, date('now')), ?, ?)`
    )
    .run(
      d.id_os,
      d.forma_pagamento,
      d.valor_pago,
      d.data_pagamento,
      d.status_pagamento ?? 'confirmado',
      d.parcela
    );

  const pagamento = db.prepare('SELECT * FROM PAGAMENTO WHERE id_pagamento = ?').get(info.lastInsertRowid);
  res.status(201).json({
    ...pagamento,
    status_financeiro_os: atualizarStatusPagamento(d.id_os),
  });
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM PAGAMENTO WHERE id_pagamento = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND' });
  res.status(204).send();
});

export default router;
