import db from '../db/index.js';

export const COLUNAS_DEMANDA = [
  'pendente',
  'em_andamento',
  'aguardando_peca',
  'aguardando_cliente',
  'finalizada',
];

export const LABEL_COLUNA = {
  pendente: 'Pendentes',
  em_andamento: 'Em andamento',
  aguardando_peca: 'Aguardando peça',
  aguardando_cliente: 'Aguardando cliente',
  finalizada: 'Finalizadas',
};

export const TIPOS_ATIVIDADE = {
  finalizou_os: 'Finalizou OS',
  abriu_os: 'Abriu OS',
  demanda_criada: 'Nova demanda',
  demanda_movida: 'Demanda atualizada',
  demanda_finalizada: 'Demanda finalizada',
  cliente_atendido: 'Cliente atendido',
  orcamento_enviado: 'Orçamento enviado',
  equip_recebido: 'Equipamento recebido',
  equip_entregue: 'Equipamento entregue',
};

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function horarioAgora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function registrarAtividade({
  data_referencia = hojeIso(),
  id_usuario,
  nome_usuario,
  tipo,
  referencia,
  observacoes,
  id_os,
  id_demanda,
}) {
  const horario = horarioAgora();
  let nome = nome_usuario;
  if (!nome && id_usuario) {
    const u = db.prepare('SELECT nome FROM USUARIO WHERE id_usuario = ?').get(id_usuario);
    nome = u?.nome;
  }
  const info = db
    .prepare(
      `INSERT INTO ATIVIDADE_DIA (
        data_referencia, horario, id_usuario, nome_usuario, tipo, referencia, observacoes, id_os, id_demanda
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data_referencia, horario, id_usuario ?? null, nome, tipo, referencia, observacoes, id_os ?? null, id_demanda ?? null);
  return db.prepare('SELECT * FROM ATIVIDADE_DIA WHERE id_atividade = ?').get(info.lastInsertRowid);
}

export function registrarOsAberta(idOs, usuario) {
  const os = db
    .prepare(
      `SELECT os.id_os, os.observacoes_internas, c.nome as cliente_nome
       FROM ORDEM_SERVICO os JOIN CLIENTE c ON c.id_cliente = os.id_cliente WHERE os.id_os = ?`
    )
    .get(idOs);
  if (!os) return;
  registrarAtividade({
    id_usuario: usuario?.id,
    nome_usuario: usuario?.nome,
    tipo: 'abriu_os',
    referencia: `OS #${idOs}`,
    observacoes: os.observacoes_internas || os.cliente_nome,
    id_os: idOs,
  });
}

export function registrarOsFinalizada(idOs, usuario) {
  const os = db
    .prepare(
      `SELECT os.*, c.nome as cliente_nome,
        COALESCE(os.equipamento_marca, e.marca) as marca,
        COALESCE(os.equipamento_modelo, e.modelo) as modelo
       FROM ORDEM_SERVICO os
       JOIN CLIENTE c ON c.id_cliente = os.id_cliente
       LEFT JOIN EQUIPAMENTO e ON e.id_equipamento = os.id_equipamento
       WHERE os.id_os = ?`
    )
    .get(idOs);
  if (!os) return;

  const tecnico = os.tecnico_responsavel || usuario?.nome || 'Técnico';
  const equip = `${os.marca || ''} ${os.modelo || ''}`.trim();
  registrarAtividade({
    id_usuario: usuario?.id,
    nome_usuario: tecnico,
    tipo: 'finalizou_os',
    referencia: `OS #${idOs}`,
    observacoes: os.servicos_executados_desc || os.diagnostico_tecnico || equip || os.cliente_nome,
    id_os: idOs,
  });
}

function dataAnterior(dataIso) {
  const d = new Date(`${dataIso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function pctVariacao(atual, anterior) {
  if (!anterior) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

export function getDashboard(dataRef = hojeIso()) {
  const ontem = dataAnterior(dataRef);

  const osFinalizadasHoje = db
    .prepare(
      `SELECT COUNT(*) as n, COALESCE(SUM(valor_total_final), 0) as fat
       FROM ORDEM_SERVICO WHERE status = 'Concluída' AND date(COALESCE(data_conclusao, data_status_alteracao)) = ?`
    )
    .get(dataRef);
  const osFinalizadasOntem = db
    .prepare(
      `SELECT COUNT(*) as n, COALESCE(SUM(valor_total_final), 0) as fat
       FROM ORDEM_SERVICO WHERE status = 'Concluída' AND date(COALESCE(data_conclusao, data_status_alteracao)) = ?`
    )
    .get(ontem);

  const demandasHoje = db
    .prepare(`SELECT COUNT(*) as n FROM DEMANDA WHERE status = 'finalizada' AND date(data_finalizacao) = ?`)
    .get(dataRef);
  const demandasOntem = db
    .prepare(`SELECT COUNT(*) as n FROM DEMANDA WHERE status = 'finalizada' AND date(data_finalizacao) = ?`)
    .get(ontem);

  const equipRecebidos = db
    .prepare(
      `SELECT COUNT(*) as n FROM ATIVIDADE_DIA WHERE data_referencia = ? AND tipo = 'equip_recebido'`
    )
    .get(dataRef);
  const equipEntregues = db
    .prepare(
      `SELECT COUNT(*) as n FROM ATIVIDADE_DIA WHERE data_referencia = ? AND tipo = 'equip_entregue'`
    )
    .get(dataRef);
  const equipRecOntem = db
    .prepare(`SELECT COUNT(*) as n FROM ATIVIDADE_DIA WHERE data_referencia = ? AND tipo = 'equip_recebido'`)
    .get(ontem);
  const equipEntOntem = db
    .prepare(`SELECT COUNT(*) as n FROM ATIVIDADE_DIA WHERE data_referencia = ? AND tipo = 'equip_entregue'`)
    .get(ontem);

  const demandas = db
    .prepare(
      `SELECT d.*, u.nome as responsavel_nome, u.perfil as responsavel_perfil
       FROM DEMANDA d
       LEFT JOIN USUARIO u ON u.id_usuario = d.id_usuario
       WHERE d.data_referencia = ? OR (d.status != 'finalizada' AND d.data_referencia <= ?)
       ORDER BY d.prioridade DESC, d.id_demanda ASC`
    )
    .all(dataRef, dataRef);

  const atividades = db
    .prepare(
      `SELECT * FROM ATIVIDADE_DIA WHERE data_referencia = ? ORDER BY horario DESC, id_atividade DESC`
    )
    .all(dataRef);

  const ranking = db
    .prepare(
      `SELECT
        COALESCE(os.tecnico_responsavel, u.nome, 'Sem técnico') as nome,
        u.perfil,
        COUNT(*) as qtd_os,
        COALESCE(SUM(os.valor_total_final), 0) as valor
       FROM ORDEM_SERVICO os
       LEFT JOIN USUARIO u ON u.id_usuario = os.id_usuario
       WHERE os.status = 'Concluída' AND date(COALESCE(os.data_conclusao, os.data_status_alteracao)) = ?
       GROUP BY COALESCE(os.tecnico_responsavel, u.nome, 'Sem técnico')
       ORDER BY qtd_os DESC, valor DESC`
    )
    .all(dataRef);

  const maxOsRanking = Math.max(1, ...ranking.map((r) => r.qtd_os));

  const osPorStatus = db.prepare(`SELECT status, COUNT(*) as quantidade FROM ORDEM_SERVICO GROUP BY status`).all();
  const demandasPorStatus = db
    .prepare(
      `SELECT status, COUNT(*) as quantidade FROM DEMANDA
       WHERE data_referencia = ? OR status != 'finalizada' GROUP BY status`
    )
    .all(dataRef);

  const recepcao = {
    clientes_atendidos: db
      .prepare(`SELECT COUNT(*) as n FROM ATIVIDADE_DIA WHERE data_referencia = ? AND tipo = 'cliente_atendido'`)
      .get(dataRef)?.n ?? 0,
    os_abertas: db
      .prepare(`SELECT COUNT(*) as n FROM ATIVIDADE_DIA WHERE data_referencia = ? AND tipo = 'abriu_os'`)
      .get(dataRef)?.n ?? 0,
    orcamentos_enviados: db
      .prepare(`SELECT COUNT(*) as n FROM ATIVIDADE_DIA WHERE data_referencia = ? AND tipo = 'orcamento_enviado'`)
      .get(dataRef)?.n ?? 0,
    equip_recebidos: equipRecebidos?.n ?? 0,
    equip_entregues: equipEntregues?.n ?? 0,
  };

  const demandasPorColuna = {};
  for (const col of COLUNAS_DEMANDA) {
    demandasPorColuna[col] = demandas.filter((d) => d.status === col);
  }

  return {
    data: dataRef,
    kpis: {
      os_finalizadas: osFinalizadasHoje?.n ?? 0,
      os_finalizadas_var: pctVariacao(osFinalizadasHoje?.n ?? 0, osFinalizadasOntem?.n ?? 0),
      faturamento_dia: osFinalizadasHoje?.fat ?? 0,
      faturamento_var: pctVariacao(osFinalizadasHoje?.fat ?? 0, osFinalizadasOntem?.fat ?? 0),
      demandas_concluidas: demandasHoje?.n ?? 0,
      demandas_var: pctVariacao(demandasHoje?.n ?? 0, demandasOntem?.n ?? 0),
      equip_recebidos: equipRecebidos?.n ?? 0,
      equip_recebidos_var: pctVariacao(equipRecebidos?.n ?? 0, equipRecOntem?.n ?? 0),
      equip_entregues: equipEntregues?.n ?? 0,
      equip_entregues_var: pctVariacao(equipEntregues?.n ?? 0, equipEntOntem?.n ?? 0),
    },
    demandas_por_coluna: demandasPorColuna,
    atividades,
    ranking: ranking.map((r) => ({
      ...r,
      perfil_label: r.perfil === 'tecnico' ? 'Técnico' : r.perfil === 'atendente' ? 'Recepção' : 'Equipe',
      progresso: Math.round((r.qtd_os / maxOsRanking) * 100),
    })),
    os_por_status: osPorStatus,
    demandas_por_status: demandasPorStatus.map((d) => ({
      status: LABEL_COLUNA[d.status] || d.status,
      quantidade: d.quantidade,
    })),
    recepcao,
    os_finalizadas_detalhe: db
      .prepare(
        `SELECT os.id_os, os.tecnico_responsavel, os.valor_total_final,
          c.nome as cliente_nome,
          COALESCE(os.equipamento_marca, e.marca) as marca,
          COALESCE(os.equipamento_modelo, e.modelo) as modelo
         FROM ORDEM_SERVICO os
         JOIN CLIENTE c ON c.id_cliente = os.id_cliente
         LEFT JOIN EQUIPAMENTO e ON e.id_equipamento = os.id_equipamento
         WHERE os.status = 'Concluída' AND date(COALESCE(os.data_conclusao, os.data_status_alteracao)) = ?
         ORDER BY os.tecnico_responsavel, os.id_os`
      )
      .all(dataRef),
    demandas_finalizadas: db
      .prepare(
        `SELECT d.*, u.nome as responsavel_nome FROM DEMANDA d
         LEFT JOIN USUARIO u ON u.id_usuario = d.id_usuario
         WHERE d.status = 'finalizada' AND date(d.data_finalizacao) = ?
         ORDER BY d.data_finalizacao`
      )
      .all(dataRef),
  };
}

export function getDadosRelatorioPdf(dataRef) {
  const dash = getDashboard(dataRef);
  return {
    data: dataRef,
    kpis: dash.kpis,
    atividades: dash.atividades,
    ranking: dash.ranking,
    os_finalizadas: dash.os_finalizadas_detalhe,
    demandas_finalizadas: dash.demandas_finalizadas,
    recepcao: dash.recepcao,
  };
}
