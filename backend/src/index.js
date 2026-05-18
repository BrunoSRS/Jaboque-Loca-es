import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import clientesRoutes from './routes/clientes.js';
import minhasMaquinasRoutes from './routes/minhasMaquinas.js';
import equipamentosRoutes from './routes/equipamentos.js';
import servicosRoutes from './routes/servicosTecnicos.js';
import pecasRoutes from './routes/pecas.js';
import fornecedoresRoutes from './routes/fornecedores.js';
import precificacoesRoutes from './routes/precificacoes.js';
import comprasRoutes from './routes/comprasPeca.js';
import ordensRoutes from './routes/ordensServico.js';
import pagamentosRoutes from './routes/pagamentos.js';
import documentosRoutes from './routes/documentos.js';
import dashboardRoutes from './routes/dashboard.js';
import usuariosRoutes from './routes/usuarios.js';
import empresaRoutes from './routes/empresa.js';
import produtividadeRoutes from './routes/produtividade.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);

app.use(authMiddleware);
app.use('/api/clientes', clientesRoutes);
app.use('/api/minhas-maquinas', minhasMaquinasRoutes);
app.use('/api/equipamentos', equipamentosRoutes);
app.use('/api/servicos-tecnicos', servicosRoutes);
app.use('/api/pecas', pecasRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/precificacoes', precificacoesRoutes);
app.use('/api/compras-peca', comprasRoutes);
app.use('/api/ordens-servico', ordensRoutes);
app.use('/api/pagamentos', pagamentosRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/produtividade', produtividadeRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Jaboque API rodando em http://localhost:${PORT}`);
});
