import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { recalcularTotais, getOsCompleta } from '../services/osService.js';
import { debitarEstoque, creditarEstoque, getPrecoSugeridoPeca } from '../services/estoqueService.js';
import {
  getEquipamento,
  validarEquipamentoParaOs,
  snapshotEquipamentoNaOs,
} from '../services/equipamentoService.js';
import { registrarOsAberta, registrarOsFinalizada } from '../services/produtividadeService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fotosDir = path.join(__dirname, '../../uploads/os-fotos');
fs.mkdirSync(fotosDir, { recursive: true });

const uploadFoto = multer({
  storage: multer.diskStorage({
    destination: fotosDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `os-${Date.now()}${ext === '.png' ? ext : '.png'}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'image/png') cb(null, true);
    else cb(new Error('Apenas arquivos PNG são permitidos'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

const osSchema = z.object({
  id_cliente: z.number().int(),
  id_equipamento: z.number().int(),
  data_abertura: z.string().optional(),
  data_previsao_entrega: z.string().optional().nullable(),
  data_conclusao: z.string().optional().nullable(),
  status: z.string().optional(),
  equipamento_marca: z.string().optional().nullable(),
  equipamento_modelo: z.string().optional().nullable(),
  estado_conservacao: z.string().optional().nullable(),
  defeito_reclamado: z.string().optional().nullable(),
  patrimonio: z.string().optional().nullable(),
  sintoma_reclamado: z.string().optional().nullable(),
  diagnostico_tecnico: z.string().optional().nullable(),
  servicos_executados_desc: z.string().optional().nullable(),
  observacoes_internas: z.string().optional().nullable(),
  observacoes_cliente: z.string().optional().nullable(),
  valor_mao_de_obra: z.number().optional(),
  valor_desconto_global: z.number().optional(),
  tipo_desconto_global: z.string().optional().nullable(),
  prioridade: z.string().optional(),
  tecnico_responsavel: z.string().optional().nullable(),
  data_status_alteracao: z.string().optional().nullable(),
});

const servicoOsSchema = z.object({
  id_servico: z.number().int(),
  valor_praticado: z.number().nonnegative(),
  quantidade_horas: z.number().int().optional(),
  observacao: z.string().optional().nullable(),
});

const itemOsSchema = z.object({
  id_peca: z.number().int(),
  quantidade: z.number().int().positive(),
  preco_unitario_original: z.number().optional(),
  preco_unitario_aplicado: z.number().optional(),
  desconto_item: z.number().optional(),
  motivo_desconto: z.string().optional().nullable(),
  local_aplicado: z.string().optional().nullable(),
});

const statusTransitionSchema = z.object({
  status: z.string().min(1),
  data_status_alteracao: z.string().optional(),
  tecnico_responsavel: z.string().optional().nullable(),
  valor_mao_de_obra: z.number().optional(),
});

router.get('/', (req, res) => {
  const { status, clienteId, equipamentoId } = req.query;
  let sql = `SELECT os.*, c.nome as cliente_nome,
    e.marca as equipamento_marca_cadastro, e.modelo as equipamento_modelo_cadastro,
    e.patrimonio as equipamento_patrimonio, e.tipo as equipamento_tipo
    FROM ORDEM_SERVICO os
    JOIN CLIENTE c ON c.id_cliente = os.id_cliente
    LEFT JOIN EQUIPAMENTO e ON e.id_equipamento = os.id_equipamento
    WHERE 1=1`;
  const params = [];
  if (status) {
    sql += ' AND os.status = ?';
    params.push(status);
  }
  if (clienteId) {
    sql += ' AND os.id_cliente = ?';
    params.push(clienteId);
  }
  if (equipamentoId) {
    sql += ' AND os.id_equipamento = ?';
    params.push(equipamentoId);
  }
  sql += ' ORDER BY os.data_abertura DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const os = getOsCompleta(req.params.id);
  if (!os) return res.status(404).json({ error: 'NOT_FOUND', message: 'OS não encontrada' });
  res.json(os);
});

function resolverDadosEquipamentoOs(d) {
  const equipamento = getEquipamento(d.id_equipamento);
  let idCliente;
  try {
    idCliente = validarEquipamentoParaOs(equipamento, d.id_cliente);
  } catch (e) {
    return { error: e.message };
  }
  const snapshot = snapshotEquipamentoNaOs(equipamento);
  return {
    idCliente: idCliente ?? d.id_cliente,
    snapshot,
    equipamento,
  };
}

router.post('/', validate(osSchema), (req, res) => {
  const d = req.validated;
  const resolved = resolverDadosEquipamentoOs(d);
  if (resolved.error) {
    return res.status(400).json({ error: 'VALIDATION', message: resolved.error });
  }
  const { idCliente, snapshot } = resolved;

  const info = db
    .prepare(
      `INSERT INTO ORDEM_SERVICO (
        id_cliente, id_equipamento, data_abertura, data_previsao_entrega, status,
        equipamento_marca, equipamento_modelo, estado_conservacao, defeito_reclamado,
        patrimonio, observacoes_internas, observacoes_cliente, prioridade, id_usuario
      ) VALUES (?, ?, COALESCE(?, date('now')), ?, COALESCE(?, 'Orçamento'), ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      idCliente,
      d.id_equipamento,
      d.data_abertura,
      d.data_previsao_entrega,
      d.status,
      snapshot.equipamento_marca,
      snapshot.equipamento_modelo,
      d.estado_conservacao ?? snapshot.estado_conservacao,
      d.defeito_reclamado,
      snapshot.patrimonio,
      d.observacoes_internas,
      d.observacoes_cliente,
      d.prioridade ?? 'Normal',
      req.user?.id
    );
  recalcularTotais(info.lastInsertRowid);
  registrarOsAberta(info.lastInsertRowid, req.user);
  res.status(201).json(getOsCompleta(info.lastInsertRowid));
});

router.put('/:id', validate(osSchema.partial()), (req, res) => {
  const d = req.validated;
  const current = db.prepare('SELECT * FROM ORDEM_SERVICO WHERE id_os = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'NOT_FOUND', message: 'OS não encontrada' });

  let idCliente = d.id_cliente;
  let idEquipamento = d.id_equipamento;
  let snapshot = {};

  if (d.id_equipamento !== undefined) {
    const resolved = resolverDadosEquipamentoOs({
      id_equipamento: d.id_equipamento,
      id_cliente: d.id_cliente ?? current.id_cliente,
    });
    if (resolved.error) {
      return res.status(400).json({ error: 'VALIDATION', message: resolved.error });
    }
    idCliente = resolved.idCliente;
    idEquipamento = d.id_equipamento;
    snapshot = resolved.snapshot;
  }

  db.prepare(
    `UPDATE ORDEM_SERVICO SET
      id_cliente = COALESCE(?, id_cliente),
      id_equipamento = COALESCE(?, id_equipamento),
      data_abertura = COALESCE(?, data_abertura),
      data_previsao_entrega = COALESCE(?, data_previsao_entrega),
      data_conclusao = COALESCE(?, data_conclusao),
      status = COALESCE(?, status),
      equipamento_marca = COALESCE(?, equipamento_marca),
      equipamento_modelo = COALESCE(?, equipamento_modelo),
      estado_conservacao = COALESCE(?, estado_conservacao),
      defeito_reclamado = COALESCE(?, defeito_reclamado),
      patrimonio = COALESCE(?, patrimonio),
      sintoma_reclamado = COALESCE(?, sintoma_reclamado),
      diagnostico_tecnico = COALESCE(?, diagnostico_tecnico),
      servicos_executados_desc = COALESCE(?, servicos_executados_desc),
      observacoes_internas = COALESCE(?, observacoes_internas),
      observacoes_cliente = COALESCE(?, observacoes_cliente),
      valor_mao_de_obra = COALESCE(?, valor_mao_de_obra),
      valor_desconto_global = COALESCE(?, valor_desconto_global),
      tipo_desconto_global = COALESCE(?, tipo_desconto_global),
      prioridade = COALESCE(?, prioridade),
      tecnico_responsavel = COALESCE(?, tecnico_responsavel),
      data_status_alteracao = COALESCE(?, data_status_alteracao)
     WHERE id_os = ?`
  ).run(
    idCliente,
    idEquipamento,
    d.data_abertura,
    d.data_previsao_entrega,
    d.data_conclusao,
    d.status,
    d.equipamento_marca ?? snapshot.equipamento_marca,
    d.equipamento_modelo ?? snapshot.equipamento_modelo,
    d.estado_conservacao ?? snapshot.estado_conservacao,
    d.defeito_reclamado,
    d.patrimonio ?? snapshot.patrimonio,
    d.sintoma_reclamado,
    d.diagnostico_tecnico,
    d.servicos_executados_desc,
    d.observacoes_internas,
    d.observacoes_cliente,
    d.valor_mao_de_obra,
    d.valor_desconto_global,
    d.tipo_desconto_global,
    d.prioridade,
    d.tecnico_responsavel,
    d.data_status_alteracao,
    req.params.id
  );

  recalcularTotais(req.params.id);
  res.json(getOsCompleta(req.params.id));
});

router.post('/:id/foto', uploadFoto.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'VALIDATION', message: 'Envie uma foto PNG' });
  const caminho = `/uploads/os-fotos/${req.file.filename}`;
  db.prepare('UPDATE ORDEM_SERVICO SET foto_equipamento = ? WHERE id_os = ?').run(caminho, req.params.id);
  res.json({ foto_equipamento: caminho });
});

router.patch('/:id/status', validate(statusTransitionSchema), (req, res) => {
  const { status, data_status_alteracao, tecnico_responsavel, valor_mao_de_obra } = req.validated;
  const idOs = req.params.id;
  const current = db.prepare('SELECT * FROM ORDEM_SERVICO WHERE id_os = ?').get(idOs);
  if (!current) return res.status(404).json({ error: 'NOT_FOUND' });

  const dataAlt = data_status_alteracao || new Date().toISOString().slice(0, 10);

  if (status === 'Em Andamento') {
    if (!tecnico_responsavel) {
      return res.status(400).json({
        error: 'VALIDATION',
        message: 'Informe o técnico responsável ao alterar para Em Andamento',
      });
    }
    db.prepare(
      `UPDATE ORDEM_SERVICO SET status = ?, data_status_alteracao = ?, tecnico_responsavel = ? WHERE id_os = ?`
    ).run(status, dataAlt, tecnico_responsavel, idOs);
  } else if (status === 'Aguardando Peças' || status === 'Concluída') {
    if (valor_mao_de_obra === undefined || valor_mao_de_obra === null) {
      return res.status(400).json({
        error: 'VALIDATION',
        message: 'Informe o valor da mão de obra',
      });
    }
    const itens = db.prepare('SELECT COUNT(*) as n FROM ITEM_OS WHERE id_os = ?').get(idOs);
    if (!itens?.n) {
      return res.status(400).json({
        error: 'VALIDATION',
        message: 'Registre ao menos uma peça utilizada antes deste status',
      });
    }
    db.prepare(
      `UPDATE ORDEM_SERVICO SET status = ?, data_status_alteracao = ?, valor_mao_de_obra = ? WHERE id_os = ?`
    ).run(status, dataAlt, valor_mao_de_obra, idOs);
    if (status === 'Concluída') {
      db.prepare(`UPDATE ORDEM_SERVICO SET data_conclusao = date('now') WHERE id_os = ?`).run(idOs);
      registrarOsFinalizada(idOs, req.user);
    }
    recalcularTotais(idOs);
  } else {
    db.prepare(`UPDATE ORDEM_SERVICO SET status = ?, data_status_alteracao = ? WHERE id_os = ?`).run(
      status,
      dataAlt,
      idOs
    );
  }

  res.json(getOsCompleta(idOs));
});

router.post('/:id/recalcular-totais', (req, res) => {
  try {
    recalcularTotais(req.params.id);
    res.json(getOsCompleta(req.params.id));
  } catch (e) {
    res.status(404).json({ error: 'NOT_FOUND', message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  const idOs = req.params.id;
  const current = db.prepare('SELECT * FROM ORDEM_SERVICO WHERE id_os = ?').get(idOs);
  if (!current) return res.status(404).json({ error: 'NOT_FOUND', message: 'OS não encontrada' });

  const itens = db.prepare('SELECT * FROM ITEM_OS WHERE id_os = ?').all(idOs);
  for (const item of itens) {
    creditarEstoque(item.id_peca, item.quantidade);
  }

  const docs = db.prepare('SELECT caminho_arquivo_pdf FROM DOCUMENTO_OS WHERE id_os = ?').all(idOs);
  const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
  for (const doc of docs) {
    if (!doc.caminho_arquivo_pdf) continue;
    const fullPath = path.join(uploadsDir, path.basename(doc.caminho_arquivo_pdf));
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      /* ignore */
    }
  }

  db.prepare('DELETE FROM ORDEM_SERVICO WHERE id_os = ?').run(idOs);
  res.status(204).send();
});

router.post('/:id/servicos', validate(servicoOsSchema), (req, res) => {
  const idOs = req.params.id;
  const d = req.validated;
  const info = db
    .prepare(
      `INSERT INTO SERVICO_OS (id_os, id_servico, valor_praticado, quantidade_horas, observacao)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(idOs, d.id_servico, d.valor_praticado, d.quantidade_horas ?? 1, d.observacao);
  recalcularTotais(idOs);
  res.status(201).json(db.prepare('SELECT * FROM SERVICO_OS WHERE id_servico_os = ?').get(info.lastInsertRowid));
});

router.delete('/:id/servicos/:servicoOsId', (req, res) => {
  db.prepare('DELETE FROM SERVICO_OS WHERE id_servico_os = ? AND id_os = ?').run(
    req.params.servicoOsId,
    req.params.id
  );
  recalcularTotais(req.params.id);
  res.status(204).send();
});

router.post('/:id/itens', validate(itemOsSchema), (req, res) => {
  const idOs = req.params.id;
  const d = req.validated;
  try {
    const precoOrig = d.preco_unitario_original ?? getPrecoSugeridoPeca(d.id_peca);
    const precoAplic = d.preco_unitario_aplicado ?? precoOrig;
    debitarEstoque(d.id_peca, d.quantidade);
    const info = db
      .prepare(
        `INSERT INTO ITEM_OS (id_os, id_peca, quantidade, preco_unitario_original, preco_unitario_aplicado, desconto_item, motivo_desconto, local_aplicado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        idOs,
        d.id_peca,
        d.quantidade,
        precoOrig,
        precoAplic,
        d.desconto_item ?? 0,
        d.motivo_desconto,
        d.local_aplicado
      );
    recalcularTotais(idOs);
    res.status(201).json(db.prepare('SELECT * FROM ITEM_OS WHERE id_item_os = ?').get(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: 'BUSINESS_ERROR', message: e.message });
  }
});

router.delete('/:id/itens/:itemOsId', (req, res) => {
  const item = db
    .prepare('SELECT * FROM ITEM_OS WHERE id_item_os = ? AND id_os = ?')
    .get(req.params.itemOsId, req.params.id);
  if (!item) return res.status(404).json({ error: 'NOT_FOUND' });
  creditarEstoque(item.id_peca, item.quantidade);
  db.prepare('DELETE FROM ITEM_OS WHERE id_item_os = ?').run(req.params.itemOsId);
  recalcularTotais(req.params.id);
  res.status(204).send();
});

export default router;
