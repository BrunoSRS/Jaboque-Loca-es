import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jaboque-dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign(
    { id: user.id_usuario, login: user.login, perfil: user.perfil, nome: user.nome },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token não informado' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token inválido ou expirado' });
  }
}

export function requirePerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.user.perfil)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Sem permissão para esta ação' });
    }
    next();
  };
}

export function stripPassword(user) {
  if (!user) return user;
  const { senha_hash, ...rest } = user;
  return rest;
}
