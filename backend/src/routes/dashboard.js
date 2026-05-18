import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/resumo', (req, res) => {
  const mes = parseInt(req.query.mes || new Date().getMonth() + 1, 10);
  const ano = parseInt(req.query.ano || new Date().getFullYear(), 10);
  const mesStr = String(mes).padStart(2, '0');

  const osAbertas = db
    .prepare(
      `SELECT COUNT(*) as total FROM ORDEM_SERVICO
       WHERE status IN ('Aberta', 'Em Andamento', 'Aguardando Peças', 'Orçamento', 'rascunho')`
    )
    .get();

  const osEmAndamento = db
    .prepare(`SELECT COUNT(*) as total FROM ORDEM_SERVICO WHERE status = 'Em Andamento'`)
    .get();

  const pecasBaixa = db
    .prepare(`SELECT COUNT(*) as total FROM PECA WHERE estoque_atual <= estoque_minimo`)
    .get();

  const faturamentoMes = db
    .prepare(
      `SELECT COALESCE(SUM(valor_pago), 0) as total FROM PAGAMENTO
       WHERE status_pagamento = 'confirmado'
       AND strftime('%m', data_pagamento) = ? AND strftime('%Y', data_pagamento) = ?`
    )
    .get(mesStr, String(ano));

  const faturamentoMesAnterior = db
    .prepare(
      `SELECT COALESCE(SUM(valor_pago), 0) as total FROM PAGAMENTO
       WHERE status_pagamento = 'confirmado'
       AND strftime('%m', data_pagamento) = ? AND strftime('%Y', data_pagamento) = ?`
    )
    .get(String(mes === 1 ? 12 : mes - 1).padStart(2, '0'), String(mes === 1 ? ano - 1 : ano));

  const osPorStatus = db
    .prepare(
      `SELECT status, COUNT(*) as quantidade FROM ORDEM_SERVICO GROUP BY status`
    )
    .all();

  const faturamentoDiario = db
    .prepare(
      `SELECT data_pagamento as data, SUM(valor_pago) as valor FROM PAGAMENTO
       WHERE status_pagamento = 'confirmado'
       AND strftime('%m', data_pagamento) = ? AND strftime('%Y', data_pagamento) = ?
       GROUP BY data_pagamento ORDER BY data_pagamento`
    )
    .all(mesStr, String(ano));

  const proximasEntregas = db
    .prepare(
      `SELECT os.id_os, os.data_previsao_entrega, os.status, os.prioridade,
        c.nome as cliente_nome,
        e.tipo_equipamento, e.marca, e.modelo,
        os.equipamento_marca, os.equipamento_modelo
       FROM ORDEM_SERVICO os
       JOIN CLIENTE c ON c.id_cliente = os.id_cliente
       LEFT JOIN EQUIPAMENTO e ON e.id_equipamento = os.id_equipamento
       WHERE os.data_previsao_entrega IS NOT NULL
       AND os.status NOT IN ('Concluída', 'Cancelada')
       ORDER BY os.data_previsao_entrega ASC LIMIT 10`
    )
    .all();

  const frotaAtiva = db
    .prepare(`SELECT COUNT(*) as total FROM EQUIPAMENTO WHERE tipo = 'empresa' AND ativo = 1`)
    .get();

  const fatAtual = faturamentoMes?.total ?? 0;
  const fatAnterior = faturamentoMesAnterior?.total ?? 1;
  const variacao = fatAnterior > 0 ? ((fatAtual - fatAnterior) / fatAnterior) * 100 : 0;

  res.json({
    kpis: {
      os_abertas: osAbertas?.total ?? 0,
      os_em_andamento: osEmAndamento?.total ?? 0,
      pecas_baixa: pecasBaixa?.total ?? 0,
      faturamento_mes: fatAtual,
      faturamento_variacao_percent: Math.round(variacao),
      maquinas_alugadas: frotaAtiva?.total ?? 0,
      entregas_dia: proximasEntregas.filter((e) => e.data_previsao_entrega?.includes(`${ano}-${mesStr}`)).length,
    },
    os_por_status: osPorStatus,
    faturamento_diario: faturamentoDiario,
    proximas_entregas: proximasEntregas.map((e) => ({
      id_os: e.id_os,
      tipo: 'ENTREGA',
      equipamento: `${e.marca || e.equipamento_marca || ''} ${e.modelo || e.equipamento_modelo || ''}`.trim(),
      cliente: e.cliente_nome,
      data: e.data_previsao_entrega,
      hora: '08:00',
    })),
  });
});

export default router;
