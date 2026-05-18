import { Router } from 'express';
import { z } from 'zod';
import { getDadosEmpresa, saveDadosEmpresa } from '../config/empresa.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const schema = z.object({
  razao_social: z.string().optional(),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().optional(),
  data_abertura: z.string().optional(),
  natureza_juridica: z.string().optional(),
  porte: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  cep: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional(),
  telefone_suporte: z.string().optional(),
  slogan: z.string().optional(),
  site: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  atividade_principal: z.string().optional(),
  observacoes_cobranca: z.string().optional(),
});

router.get('/', (_req, res) => {
  res.json(getDadosEmpresa());
});

router.put('/', validate(schema), (req, res) => {
  saveDadosEmpresa(req.validated);
  res.json(getDadosEmpresa());
});

export default router;
