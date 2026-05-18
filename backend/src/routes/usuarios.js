import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { requirePerfil, stripPassword } from '../middleware/auth.js';

const router = Router();

const schema = z.object({
  nome: z.string().min(1),
  login: z.string().min(1),
  senha: z.string().min(6).optional(),
  perfil: z.enum(['admin', 'tecnico', 'atendente']),
  ativo: z.boolean().optional(),
  assinatura_digital: z.string().optional().nullable(),
});

router.use(requirePerfil('admin'));

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM USUARIO ORDER BY nome').all();
  res.json(rows.map(stripPassword));
});

router.post('/', validate(schema), (req, res) => {
  const d = req.validated;
  if (!d.senha) return res.status(400).json({ error: 'VALIDATION', message: 'Senha obrigatória' });
  const hash = bcrypt.hashSync(d.senha, 10);
  try {
    const info = db
      .prepare(
        `INSERT INTO USUARIO (nome, login, senha_hash, perfil, ativo, assinatura_digital)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(d.nome, d.login, hash, d.perfil, d.ativo !== false ? 1 : 0, d.assinatura_digital);
    const user = db.prepare('SELECT * FROM USUARIO WHERE id_usuario = ?').get(info.lastInsertRowid);
    res.status(201).json(stripPassword(user));
  } catch {
    res.status(400).json({ error: 'DUPLICATE', message: 'Login já existe' });
  }
});

router.put('/:id', validate(schema.partial()), (req, res) => {
  const d = req.validated;
  const current = db.prepare('SELECT * FROM USUARIO WHERE id_usuario = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'NOT_FOUND' });

  const hash = d.senha ? bcrypt.hashSync(d.senha, 10) : current.senha_hash;
  db.prepare(
    `UPDATE USUARIO SET nome=?, login=?, senha_hash=?, perfil=?, ativo=?, assinatura_digital=? WHERE id_usuario=?`
  ).run(
    d.nome ?? current.nome,
    d.login ?? current.login,
    hash,
    d.perfil ?? current.perfil,
    d.ativo !== undefined ? (d.ativo ? 1 : 0) : current.ativo,
    d.assinatura_digital ?? current.assinatura_digital,
    req.params.id
  );
  res.json(stripPassword(db.prepare('SELECT * FROM USUARIO WHERE id_usuario = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  if (parseInt(req.params.id, 10) === req.user.id) {
    return res.status(400).json({ error: 'FORBIDDEN', message: 'Não pode excluir a si mesmo' });
  }
  const r = db.prepare('DELETE FROM USUARIO WHERE id_usuario = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'NOT_FOUND' });
  res.status(204).send();
});

export default router;
