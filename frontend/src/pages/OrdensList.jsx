import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { osApi, formatCurrency, gerarRelatorioCobranca } from '../api/client';
import { PageHeader, Button, Card, Select, Loading } from '../components/ui';
import StatusChangeModal from '../components/StatusChangeModal';

const statusColors = {
  Orçamento: 'bg-gray-100 text-gray-700',
  Aberta: 'bg-blue-100 text-blue-800',
  'Em Andamento': 'bg-amber-100 text-amber-800',
  'Aguardando Peças': 'bg-purple-100 text-purple-800',
  Concluída: 'bg-green-100 text-green-800',
  rascunho: 'bg-gray-100 text-gray-600',
};

export default function OrdensList() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState(null);

  const load = () => {
    setLoading(true);
    osApi.list(status ? { status } : {}).then((r) => setList(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const abrirStatus = async (idOs) => {
    const { data } = await osApi.get(idOs);
    setOsSelecionada(data);
    setStatusModal(true);
  };

  const gerarPdf = async (idOs) => {
    try {
      await gerarRelatorioCobranca(idOs);
      toast.success('Relatório PDF gerado');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao gerar PDF');
    }
  };

  const excluirOs = async (idOs) => {
    if (!confirm('Excluir esta ordem de serviço? Os itens voltarão ao estoque. Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      await osApi.remove(idOs);
      toast.success('OS excluída');
      load();
    } catch {
      toast.error('Erro ao excluir OS');
    }
  };

  return (
    <>
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Gestão de manutenção"
        actions={
          <Link to="/oficina/ordens/nova">
            <Button><Plus size={18} /> Nova OS</Button>
          </Link>
        }
      />
      <Card className="mb-4 p-4">
        <Select label="Filtrar status" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">Todos</option>
          <option>Orçamento</option>
          <option>Aberta</option>
          <option>Em Andamento</option>
          <option>Aguardando Peças</option>
          <option>Concluída</option>
        </Select>
      </Card>
      {loading ? <Loading /> : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Equipamento</th>
                <th className="p-3 text-left">Patrimônio</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id_os} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono">#{o.id_os}</td>
                  <td className="p-3">{o.cliente_nome}</td>
                  <td className="p-3">{o.equipamento_marca} {o.equipamento_modelo}</td>
                  <td className="p-3">{o.patrimonio || '-'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                  </td>
                  <td className="p-3 font-medium">{formatCurrency(o.valor_total_final)}</td>
                  <td className="p-3 flex flex-wrap gap-2">
                    <Link to={`/oficina/ordens/${o.id_os}/editar`} className="text-jaboque-navy hover:underline text-sm font-medium">
                      {o.status === 'Orçamento' ? 'Orçamento' : 'Ver'}
                    </Link>
                    <button type="button" onClick={() => abrirStatus(o.id_os)} className="text-jaboque-orange text-sm font-medium flex items-center gap-1">
                      <RefreshCw size={14} /> Status
                    </button>
                    <button
                      type="button"
                      onClick={() => gerarPdf(o.id_os)}
                      className="text-jaboque-navy text-sm font-medium flex items-center gap-1"
                      title="Relatório PDF para cobrança"
                    >
                      <FileText size={14} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirOs(o.id_os)}
                      className="text-red-600 text-sm font-medium flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <StatusChangeModal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        os={osSelecionada}
        onSuccess={load}
      />
    </>
  );
}
