import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { signToken, authMiddleware, stripPassword } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const loginSchema = z.object({
  perfil: z.enum(['admin', 'tecnico', 'atendente']),
});

router.post('/login', validate(loginSchema), (req, res) => {
  const { perfil } = req.validated;
  const user = db
    .prepare('SELECT * FROM USUARIO WHERE perfil = ? AND ativo = 1 ORDER BY id_usuario LIMIT 1')
    .get(perfil);
  if (!user) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Nenhum usuário ativo para este perfil' });
  }
  const token = signToken(user);
  res.json({ token, user: stripPassword(user) });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM USUARIO WHERE id_usuario = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'NOT_FOUND', message: 'Usuário não encontrado' });
  res.json(stripPassword(user));
});

export default router;
