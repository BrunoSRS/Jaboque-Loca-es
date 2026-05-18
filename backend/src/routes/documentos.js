import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index.js';
import { gerarPdfOs } from '../services/pdfService.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

router.get('/', (req, res) => {
  const { osId } = req.query;
  const rows = osId
    ? db.prepare('SELECT * FROM DOCUMENTO_OS WHERE id_os = ? ORDER BY data_emissao DESC').all(osId)
    : db.prepare('SELECT * FROM DOCUMENTO_OS ORDER BY data_emissao DESC').all();
  res.json(rows);
});

router.post('/gerar/:osId', async (req, res) => {
  try {
    const { tipo_documento = 'Relatório de Cobrança' } = req.body;
    const { filename, filepath, numero } = await gerarPdfOs(
      req.params.osId,
      tipo_documento,
      req.user?.id
    );

    const info = db
      .prepare(
        `INSERT INTO DOCUMENTO_OS (id_os, tipo_documento, numero_documento, caminho_arquivo_pdf, id_usuario)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(req.params.osId, tipo_documento, numero, filepath, req.user?.id);

    const doc = db.prepare('SELECT * FROM DOCUMENTO_OS WHERE id_documento = ?').get(info.lastInsertRowid);
    res.status(201).json({ ...doc, download_url: `/api/documentos/${doc.id_documento}/download` });
  } catch (e) {
    res.status(400).json({ error: 'PDF_ERROR', message: e.message });
  }
});

router.get('/:id/download', (req, res) => {
  const doc = db.prepare('SELECT * FROM DOCUMENTO_OS WHERE id_documento = ?').get(req.params.id);
  if (!doc?.caminho_arquivo_pdf) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Documento não encontrado' });
  }
  const filename = path.basename(doc.caminho_arquivo_pdf);
  const fullPath = path.join(uploadsDir, filename);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Arquivo PDF não encontrado' });
  }
  res.download(fullPath, filename);
});

export default router;
