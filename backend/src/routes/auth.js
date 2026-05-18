import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db/index.js';
import { signToken, authMiddleware, stripPassword } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const loginSchema = z.object({
  login: z.string().min(1),
  senha: z.string().min(1),
});

router.post('/login', validate(loginSchema), (req, res) => {
  const { login, senha } = req.validated;
  const user = db.prepare('SELECT * FROM USUARIO WHERE login = ? AND ativo = 1').get(login);
  if (!user || !bcrypt.compareSync(senha, user.senha_hash)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Login ou senha inválidos' });
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
