import { useCallback, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Plus, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { produtividadeApi, formatCurrency } from '../api/client';
import {
  PageHeader,
  KpiCard,
  Card,
  CardBody,
  Button,
  Loading,
  Modal,
  Input,
  Select,
  Textarea,
} from '../components/ui';
import { cn } from '../utils/cn';

const COLUNAS = [
  { id: 'pendente', titulo: 'Pendentes' },
  { id: 'em_andamento', titulo: 'Em andamento' },
  { id: 'aguardando_peca', titulo: 'Aguardando peça' },
  { id: 'aguardando_cliente', titulo: 'Aguardando cliente' },
  { id: 'finalizada', titulo: 'Finalizadas' },
];

const PRIORIDADE_STYLE = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-800',
  baixa: 'bg-emerald-100 text-emerald-800',
};

const PRIORIDADE_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

const TIPO_ATIVIDADE_LABEL = {
  finalizou_os: 'Finalizou OS',
  abriu_os: 'Abriu OS',
  demanda_criada: 'Nova demanda',
  demanda_movida: 'Demanda atualizada',
  demanda_finalizada: 'Demanda finalizada',
  cliente_atendido: 'Cliente atendido',
  orcamento_enviado: 'Orçamento enviado',
  equip_recebido: 'Equip. recebido',
  equip_entregue: 'Equip. entregue',
};

const CHART_COLORS = ['#012169', '#F58220', '#003399', '#27ae60', '#95a5a6', '#8e44ad'];

const RECEPCAO_ACOES = [
  { tipo: 'cliente_atendido', label: '+ Cliente atendido' },
  { tipo: 'orcamento_enviado', label: '+ Orçamento enviado' },
  { tipo: 'equip_recebido', label: '+ Equip. recebido' },
  { tipo: 'equip_entregue', label: '+ Equip. entregue' },
];

function hojeInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatDataBr(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function DemandaCard({ demanda, onMove }) {
  const idx = COLUNAS.findIndex((c) => c.id === demanda.status);
  const proxima = idx < COLUNAS.length - 1 ? COLUNAS[idx + 1].id : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
      <p className="font-medium text-sm text-jaboque-navy leading-snug">{demanda.titulo}</p>
      <p className="text-xs text-gray-500 mt-1">{demanda.setor}</p>
      <div className="flex items-center justify-between mt-2 gap-2">
        <span
          className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', PRIORIDADE_STYLE[demanda.prioridade])}
        >
          {PRIORIDADE_LABEL[demanda.prioridade] || demanda.prioridade}
        </span>
        {demanda.data_limite && (
          <span className="text-[10px] text-gray-400">{formatDataBr(demanda.data_limite)}</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-7 h-7 rounded-full bg-jaboque-navy text-white text-xs flex items-center justify-center font-bold shrink-0">
          {(demanda.responsavel_nome || '?').charAt(0)}
        </div>
        <span className="text-xs text-gray-600 truncate">{demanda.responsavel_nome || 'Sem responsável'}</span>
      </div>
      {proxima && (
        <button
          type="button"
          onClick={() => onMove(demanda.id_demanda, proxima)}
          className="mt-2 w-full text-[10px] text-jaboque-navy hover:text-jaboque-orange flex items-center justify-center gap-1"
        >
          Avançar <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

const formInicial = () => ({
  titulo: '',
  setor: 'Oficina',
  prioridade: 'media',
  id_usuario: '',
  data_limite: '',
  observacoes: '',
  status: 'pendente',
});

export default function Produtividade() {
  const [dataRef, setDataRef] = useState(hojeInput());
  const [dash, setDash] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [colunaNova, setColunaNova] = useState('pendente');
  const [form, setForm] = useState(formInicial);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, uRes] = await Promise.all([
        produtividadeApi.dashboard(dataRef),
        produtividadeApi.usuarios(),
      ]);
      setDash(dRes.data);
      setUsuarios(uRes.data);
    } catch {
      toast.error('Erro ao carregar produtividade');
    } finally {
      setLoading(false);
    }
  }, [dataRef]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const moverDemanda = async (id, status) => {
    try {
      await produtividadeApi.atualizarDemanda(id, { status });
      toast.success('Demanda atualizada');
      carregar();
    } catch {
      toast.error('Não foi possível mover a demanda');
    }
  };

  const abrirNovaDemanda = (status) => {
    setColunaNova(status);
    setForm({ ...formInicial(), status });
    setModalOpen(true);
  };

  const salvarDemanda = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      toast.error('Informe o título da demanda');
      return;
    }
    try {
      await produtividadeApi.criarDemanda({
        titulo: form.titulo.trim(),
        setor: form.setor,
        status: colunaNova,
        prioridade: form.prioridade,
        id_usuario: form.id_usuario ? Number(form.id_usuario) : null,
        data_referencia: dataRef,
        data_limite: form.data_limite || null,
        observacoes: form.observacoes || null,
      });
      toast.success('Demanda criada');
      setModalOpen(false);
      setForm(formInicial());
      carregar();
    } catch {
      toast.error('Erro ao criar demanda');
    }
  };

  const registrarRecepcao = async (tipo) => {
    try {
      await produtividadeApi.registrarAtividade({ tipo, data_referencia: dataRef });
      toast.success('Atividade registrada');
      carregar();
    } catch {
      toast.error('Erro ao registrar');
    }
  };

  const gerarPdf = async () => {
    setPdfLoading(true);
    try {
      await produtividadeApi.baixarRelatorioPdf(dataRef);
      toast.success('Relatório gerado');
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading && !dash) return <Loading full />;

  const kpis = dash?.kpis || {};
  const demandasPorColuna = dash?.demandas_por_coluna || {};

  return (
    <>
      <PageHeader
        title="Produtividade"
        subtitle="Acompanhe as atividades, demandas e resultados da sua equipe"
        actions={
          <>
            <input
              type="date"
              value={dataRef}
              onChange={(e) => setDataRef(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <Button onClick={gerarPdf} disabled={pdfLoading}>
              <Download size={18} />
              {pdfLoading ? 'Gerando...' : 'Gerar relatório diário'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          title="OS Finalizadas"
          value={kpis.os_finalizadas ?? 0}
          subtitle={`${kpis.os_finalizadas_var >= 0 ? '+' : ''}${kpis.os_finalizadas_var}% vs ontem`}
          accent
        />
        <KpiCard
          title="Faturamento do Dia"
          value={formatCurrency(kpis.faturamento_dia)}
          subtitle={`${kpis.faturamento_var >= 0 ? '+' : ''}${kpis.faturamento_var}% vs ontem`}
          accent
        />
        <KpiCard
          title="Demandas Concluídas"
          value={kpis.demandas_concluidas ?? 0}
          subtitle={`${kpis.demandas_var >= 0 ? '+' : ''}${kpis.demandas_var}% vs ontem`}
          accent
        />
        <KpiCard
          title="Equip. Recebidos"
          value={kpis.equip_recebidos ?? 0}
          subtitle={`${kpis.equip_recebidos_var >= 0 ? '+' : ''}${kpis.equip_recebidos_var}% vs ontem`}
        />
        <KpiCard
          title="Equip. Entregues"
          value={kpis.equip_entregues ?? 0}
          subtitle={`${kpis.equip_entregues_var >= 0 ? '+' : ''}${kpis.equip_entregues_var}% vs ontem`}
        />
      </div>

      <Card className="mb-6">
        <CardBody>
          <h3 className="font-semibold text-jaboque-navy mb-4">Quadro de Demandas</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 min-h-[320px]">
            {COLUNAS.map((col) => (
              <div key={col.id} className="min-w-[200px] flex-1 bg-gray-50 rounded-xl p-3 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-jaboque-navy">{col.titulo}</h4>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500">
                    {(demandasPorColuna[col.id] || []).length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px]">
                  {(demandasPorColuna[col.id] || []).map((d) => (
                    <DemandaCard key={d.id_demanda} demanda={d} onMove={moverDemanda} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => abrirNovaDemanda(col.id)}
                  className="mt-3 w-full py-2 text-xs text-jaboque-navy border border-dashed border-gray-300 rounded-lg hover:border-jaboque-orange hover:text-jaboque-orange flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> Adicionar demanda
                </button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="xl:col-span-1">
          <CardBody>
            <h3 className="font-semibold text-jaboque-navy mb-4">Ranking de Produtividade (Hoje)</h3>
            <div className="space-y-4">
              {(dash?.ranking || []).length === 0 && (
                <p className="text-sm text-gray-500">Nenhuma OS finalizada nesta data.</p>
              )}
              {(dash?.ranking || []).map((r) => (
                <div key={r.nome}>
                  <div className="flex justify-between text-sm mb-1">
                    <div>
                      <span className="font-medium text-jaboque-navy">{r.nome}</span>
                      <span className="text-gray-500 text-xs ml-2">{r.perfil_label}</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-semibold">{r.qtd_os} OS</span>
                      <span className="text-gray-500 block">{formatCurrency(r.valor)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-jaboque-orange rounded-full transition-all"
                      style={{ width: `${r.progresso}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardBody>
            <h3 className="font-semibold text-jaboque-navy mb-4">Atividades do Dia</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-3 font-medium">Horário</th>
                    <th className="pb-2 pr-3 font-medium">Usuário</th>
                    <th className="pb-2 pr-3 font-medium">Atividade</th>
                    <th className="pb-2 pr-3 font-medium">Referência</th>
                    <th className="pb-2 font-medium">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {(dash?.atividades || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">
                        Nenhuma atividade registrada
                      </td>
                    </tr>
                  )}
                  {(dash?.atividades || []).map((a) => (
                    <tr key={a.id_atividade} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 pr-3 text-gray-600">{a.horario}</td>
                      <td className="py-2.5 pr-3">{a.nome_usuario || '—'}</td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded',
                            a.tipo === 'finalizou_os' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-800'
                          )}
                        >
                          {TIPO_ATIVIDADE_LABEL[a.tipo] || a.tipo}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-jaboque-navy">{a.referencia || '—'}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{a.observacoes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-jaboque-navy mb-4">OS por Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dash?.os_por_status || []}
                  dataKey="quantidade"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                >
                  {(dash?.os_por_status || []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-jaboque-navy mb-4">Demandas por Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dash?.demandas_por_status || []}
                  dataKey="quantidade"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                >
                  {(dash?.demandas_por_status || []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-jaboque-navy mb-4">Atividades da Recepção (Hoje)</h3>
            <ul className="space-y-2 text-sm mb-4">
              <li className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">Clientes atendidos</span>
                <span className="font-semibold text-jaboque-navy">{dash?.recepcao?.clientes_atendidos ?? 0}</span>
              </li>
              <li className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">OS abertas</span>
                <span className="font-semibold text-jaboque-navy">{dash?.recepcao?.os_abertas ?? 0}</span>
              </li>
              <li className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">Orçamentos enviados</span>
                <span className="font-semibold text-jaboque-navy">{dash?.recepcao?.orcamentos_enviados ?? 0}</span>
              </li>
              <li className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">Equipamentos recebidos</span>
                <span className="font-semibold text-jaboque-navy">{dash?.recepcao?.equip_recebidos ?? 0}</span>
              </li>
              <li className="flex justify-between py-1">
                <span className="text-gray-600">Equipamentos entregues</span>
                <span className="font-semibold text-jaboque-navy">{dash?.recepcao?.equip_entregues ?? 0}</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 mb-2">Registrar atividade da recepção:</p>
            <div className="flex flex-wrap gap-2">
              {RECEPCAO_ACOES.map((a) => (
                <button
                  key={a.tipo}
                  type="button"
                  onClick={() => registrarRecepcao(a.tipo)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 hover:border-jaboque-orange hover:text-jaboque-orange transition"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {(dash?.os_finalizadas_detalhe?.length > 0) && (
        <Card className="mt-6">
          <CardBody>
            <h3 className="font-semibold text-jaboque-navy mb-3">OS finalizadas por técnico ({formatDataBr(dataRef)})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">OS</th>
                    <th className="pb-2 pr-4">Técnico</th>
                    <th className="pb-2 pr-4">Cliente</th>
                    <th className="pb-2 pr-4">Equipamento</th>
                    <th className="pb-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.os_finalizadas_detalhe.map((os) => (
                    <tr key={os.id_os} className="border-b border-gray-50">
                      <td className="py-2 pr-4 font-medium">#{os.id_os}</td>
                      <td className="py-2 pr-4">{os.tecnico_responsavel || '—'}</td>
                      <td className="py-2 pr-4">{os.cliente_nome}</td>
                      <td className="py-2 pr-4">
                        {`${os.marca || ''} ${os.modelo || ''}`.trim() || '—'}
                      </td>
                      <td className="py-2">{formatCurrency(os.valor_total_final)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova demanda">
        <form onSubmit={salvarDemanda} className="space-y-4">
          <Input
            label="Título"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
          <Select label="Setor" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })}>
            <option value="Oficina">Oficina</option>
            <option value="Estoque">Estoque</option>
            <option value="Recepção">Recepção</option>
          </Select>
          <Select
            label="Prioridade"
            value={form.prioridade}
            onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
          >
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </Select>
          <Select
            label="Responsável"
            value={form.id_usuario}
            onChange={(e) => setForm({ ...form, id_usuario: e.target.value })}
          >
            <option value="">— Selecionar —</option>
            {usuarios.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nome} ({u.perfil})
              </option>
            ))}
          </Select>
          <Input
            label="Data limite"
            type="date"
            value={form.data_limite}
            onChange={(e) => setForm({ ...form, data_limite: e.target.value })}
          />
          <Textarea
            label="Observações"
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
          <p className="text-xs text-gray-500">Coluna: {COLUNAS.find((c) => c.id === colunaNova)?.titulo}</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar demanda</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
