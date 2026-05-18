import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import {
  COLUNAS_DEMANDA,
  getDashboard,
  registrarAtividade,
  LABEL_COLUNA,
} from '../services/produtividadeService.js';
import { gerarRelatorioProdutividadeDiario } from '../services/produtividadePdfService.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

const demandaSchema = z.object({
  titulo: z.string().min(1),
  setor: z.string().optional(),
  status: z.enum(COLUNAS_DEMANDA).optional(),
  prioridade: z.enum(['alta', 'media', 'baixa']).optional(),
  id_usuario: z.number().int().optional().nullable(),
  data_referencia: z.string().optional(),
  data_limite: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

const atividadeSchema = z.object({
  tipo: z.enum([
    'cliente_atendido',
    'orcamento_enviado',
    'equip_recebido',
    'equip_entregue',
  ]),
  observacoes: z.string().optional().nullable(),
  data_referencia: z.string().optional(),
});

router.get('/dashboard', (req, res) => {
  const data = req.query.data || new Date().toISOString().slice(0, 10);
  res.json(getDashboard(data));
});

router.get('/usuarios', (_req, res) => {
  const rows = db
    .prepare(`SELECT id_usuario, nome, perfil FROM USUARIO WHERE ativo = 1 ORDER BY nome`)
    .all();
  res.json(rows);
});

router.post('/demandas', validate(demandaSchema), (req, res) => {
  const d = req.validated;
  const dataRef = d.data_referencia || new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      `INSERT INTO DEMANDA (titulo, setor, status, prioridade, id_usuario, data_referencia, data_limite, observacoes)
       VALUES (?, ?, COALESCE(?, 'pendente'), COALESCE(?, 'media'), ?, ?, ?, ?)`
    )
    .run(
      d.titulo,
      d.setor || 'Oficina',
      d.status,
      d.prioridade,
      d.id_usuario,
      dataRef,
      d.data_limite,
      d.observacoes
    );

  const demanda = db
    .prepare(
      `SELECT d.*, u.nome as responsavel_nome FROM DEMANDA d
       LEFT JOIN USUARIO u ON u.id_usuario = d.id_usuario WHERE d.id_demanda = ?`
    )
    .get(info.lastInsertRowid);

  registrarAtividade({
    id_usuario: req.user?.id,
    nome_usuario: req.user?.nome,
    tipo: 'demanda_criada',
    referencia: demanda.titulo,
    observacoes: demanda.setor,
    id_demanda: demanda.id_demanda,
    data_referencia: dataRef,
  });

  res.status(201).json(demanda);
});

router.patch('/demandas/:id', validate(demandaSchema.partial()), (req, res) => {
  const id = req.params.id;
  const current = db.prepare('SELECT * FROM DEMANDA WHERE id_demanda = ?').get(id);
  if (!current) return res.status(404).json({ error: 'NOT_FOUND' });

  const d = req.validated;
  const novoStatus = d.status ?? current.status;
  const finalizada = novoStatus === 'finalizada' && current.status !== 'finalizada';

  db.prepare(
    `UPDATE DEMANDA SET
      titulo = COALESCE(?, titulo),
      setor = COALESCE(?, setor),
      status = COALESCE(?, status),
      prioridade = COALESCE(?, prioridade),
      id_usuario = COALESCE(?, id_usuario),
      data_limite = COALESCE(?, data_limite),
      observacoes = COALESCE(?, observacoes),
      data_finalizacao = CASE WHEN ? = 'finalizada' THEN datetime('now') ELSE data_finalizacao END
     WHERE id_demanda = ?`
  ).run(
    d.titulo,
    d.setor,
    d.status,
    d.prioridade,
    d.id_usuario,
    d.data_limite,
    d.observacoes,
    novoStatus,
    id
  );

  const demanda = db
    .prepare(
      `SELECT d.*, u.nome as responsavel_nome FROM DEMANDA d
       LEFT JOIN USUARIO u ON u.id_usuario = d.id_usuario WHERE d.id_demanda = ?`
    )
    .get(id);

  if (d.status && d.status !== current.status) {
    registrarAtividade({
      id_usuario: req.user?.id,
      nome_usuario: req.user?.nome,
      tipo: finalizada ? 'demanda_finalizada' : 'demanda_movida',
      referencia: demanda.titulo,
      observacoes: `${LABEL_COLUNA[current.status]} → ${LABEL_COLUNA[novoStatus]}`,
      id_demanda: id,
      data_referencia: demanda.data_referencia,
    });
  }

  res.json(demanda);
});

router.delete('/demandas/:id', (req, res) => {
  const r = db.prepare('DELETE FROM DEMANDA WHERE id_demanda = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND' });
  res.status(204).send();
});

router.post('/atividades', validate(atividadeSchema), (req, res) => {
  const d = req.validated;
  const atividade = registrarAtividade({
    data_referencia: d.data_referencia || new Date().toISOString().slice(0, 10),
    id_usuario: req.user?.id,
    nome_usuario: req.user?.nome,
    tipo: d.tipo,
    referencia: null,
    observacoes: d.observacoes,
  });
  res.status(201).json(atividade);
});

router.get('/relatorio-pdf', async (req, res) => {
  try {
    const data = req.query.data || new Date().toISOString().slice(0, 10);
    const { filename, filepath } = await gerarRelatorioProdutividadeDiario(data);
    const fullPath = path.join(uploadsDir, filename);
    res.download(fullPath, filename);
  } catch (e) {
    res.status(400).json({ error: 'PDF_ERROR', message: e.message });
  }
});

export default router;
