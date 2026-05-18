import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jaboque_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('jaboque_token');
      localStorage.removeItem('jaboque_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const clientesApi = {
  list: (q) => api.get('/clientes', { params: { q } }),
  get: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  remove: (id) => api.delete(`/clientes/${id}`),
};

export const minhasMaquinasApi = {
  list: () => api.get('/minhas-maquinas'),
  get: (id) => api.get(`/minhas-maquinas/${id}`),
  create: (data) => api.post('/minhas-maquinas', data),
  update: (id, data) => api.put(`/minhas-maquinas/${id}`, data),
  remove: (id) => api.delete(`/minhas-maquinas/${id}`),
};

export const equipamentosApi = {
  list: (params) => api.get('/equipamentos', { params }),
  get: (id) => api.get(`/equipamentos/${id}`),
  create: (data) => api.post('/equipamentos', data),
  update: (id, data) => api.put(`/equipamentos/${id}`, data),
  remove: (id) => api.delete(`/equipamentos/${id}`),
  historico: (id) => api.get(`/equipamentos/${id}/historico`),
};

export const servicosApi = {
  list: (q) => api.get('/servicos-tecnicos', { params: { q } }),
  create: (data) => api.post('/servicos-tecnicos', data),
  update: (id, data) => api.put(`/servicos-tecnicos/${id}`, data),
  remove: (id) => api.delete(`/servicos-tecnicos/${id}`),
};

export const pecasApi = {
  list: (params) => api.get('/pecas', { params: params || {} }),
  estoqueBaixo: () => api.get('/pecas/estoque-baixo'),
  create: (data) => api.post('/pecas', data),
  update: (id, data) => api.put(`/pecas/${id}`, data),
  remove: (id) => api.delete(`/pecas/${id}`),
};

export const fornecedoresApi = {
  list: () => api.get('/fornecedores'),
  create: (data) => api.post('/fornecedores', data),
  update: (id, data) => api.put(`/fornecedores/${id}`, data),
  remove: (id) => api.delete(`/fornecedores/${id}`),
};

export const comprasApi = {
  list: () => api.get('/compras-peca'),
  create: (data) => api.post('/compras-peca', data),
};

export const precificacoesApi = {
  list: (pecaId) => api.get('/precificacoes', { params: { pecaId } }),
  create: (data) => api.post('/precificacoes', data),
};

export const osApi = {
  list: (params) => api.get('/ordens-servico', { params }),
  get: (id) => api.get(`/ordens-servico/${id}`),
  create: (data) => api.post('/ordens-servico', data),
  update: (id, data) => api.put(`/ordens-servico/${id}`, data),
  status: (id, data) => api.patch(`/ordens-servico/${id}/status`, data),
  uploadFoto: (id, file) => {
    const fd = new FormData();
    fd.append('foto', file);
    return api.post(`/ordens-servico/${id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  recalcular: (id) => api.post(`/ordens-servico/${id}/recalcular-totais`),
  remove: (id) => api.delete(`/ordens-servico/${id}`),
  addServico: (id, data) => api.post(`/ordens-servico/${id}/servicos`, data),
  removeServico: (id, servicoOsId) => api.delete(`/ordens-servico/${id}/servicos/${servicoOsId}`),
  addItem: (id, data) => api.post(`/ordens-servico/${id}/itens`, data),
  removeItem: (id, itemOsId) => api.delete(`/ordens-servico/${id}/itens/${itemOsId}`),
};

export const pagamentosApi = {
  list: (osId) => api.get('/pagamentos', { params: { osId } }),
  create: (data) => api.post('/pagamentos', data),
  remove: (id) => api.delete(`/pagamentos/${id}`),
};

export const TIPO_PDF_COBRANCA = 'Relatório de Cobrança';

export const documentosApi = {
  gerar: (osId, tipo = TIPO_PDF_COBRANCA) =>
    api.post(`/documentos/gerar/${osId}`, { tipo_documento: tipo }),
  downloadUrl: (id) => `/api/documentos/${id}/download`,
  async baixar(id, nomeArquivo) {
    const { data } = await api.get(`/documentos/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo || `relatorio-os-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export async function gerarRelatorioCobranca(osId) {
  const { data } = await documentosApi.gerar(osId, TIPO_PDF_COBRANCA);
  await documentosApi.baixar(data.id_documento, `${data.numero_documento || 'OS'}-cobranca.pdf`);
  return data;
}

export const dashboardApi = {
  resumo: (mes, ano) => api.get('/dashboard/resumo', { params: { mes, ano } }),
};

export const produtividadeApi = {
  dashboard: (data) => api.get('/produtividade/dashboard', { params: { data } }),
  usuarios: () => api.get('/produtividade/usuarios'),
  criarDemanda: (payload) => api.post('/produtividade/demandas', payload),
  atualizarDemanda: (id, payload) => api.patch(`/produtividade/demandas/${id}`, payload),
  removerDemanda: (id) => api.delete(`/produtividade/demandas/${id}`),
  registrarAtividade: (payload) => api.post('/produtividade/atividades', payload),
  async baixarRelatorioPdf(data) {
    const { data: blob } = await api.get('/produtividade/relatorio-pdf', {
      params: { data },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-produtividade-${data}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const usuariosApi = {
  list: () => api.get('/usuarios'),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  remove: (id) => api.delete(`/usuarios/${id}`),
};

export function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
