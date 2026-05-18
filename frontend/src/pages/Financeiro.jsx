import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { pagamentosApi, osApi, formatCurrency } from '../api/client';
import { PageHeader, Button, Card, CardBody, Input, Select, Modal, Loading, KpiCard } from '../components/ui';

export default function Financeiro() {
  const [pagamentos, setPagamentos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ id_os: '', forma_pagamento: 'PIX', valor_pago: 0, parcela: '' });

  const load = async () => {
    setLoading(true);
    const [p, o] = await Promise.all([pagamentosApi.list(), osApi.list()]);
    setPagamentos(p.data);
    setOrdens(o.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalRecebido = pagamentos.filter((p) => p.status_pagamento === 'confirmado').reduce((s, p) => s + p.valor_pago, 0);

  const save = async () => {
    try {
      await pagamentosApi.create({ ...form, id_os: Number(form.id_os), valor_pago: Number(form.valor_pago) });
      toast.success('Pagamento registrado');
      setModal(false);
      load();
    } catch {
      toast.error('Erro ao registrar');
    }
  };

  if (loading) return <Loading full />;

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Pagamentos das ordens de serviço" actions={<Button onClick={() => setModal(true)}><Plus size={18} /> Novo Pagamento</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <KpiCard title="Total recebido" value={formatCurrency(totalRecebido)} accent />
        <KpiCard title="Pagamentos" value={pagamentos.length} accent />
      </div>
      <Card>
        <CardBody>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th className="p-2 text-left">Data</th><th className="p-2 text-left">OS</th><th className="p-2 text-left">Cliente</th><th className="p-2 text-left">Forma</th><th className="p-2 text-left">Valor</th><th className="p-2 text-left">Status OS</th></tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id_pagamento} className="border-t">
                  <td className="p-2">{p.data_pagamento}</td>
                  <td className="p-2">#{p.id_os}</td>
                  <td className="p-2">{p.cliente_nome}</td>
                  <td className="p-2">{p.forma_pagamento}</td>
                  <td className="p-2 font-medium">{formatCurrency(p.valor_pago)}</td>
                  <td className="p-2"><span className="text-xs px-2 py-1 rounded bg-gray-100">{p.status_financeiro_os}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar pagamento">
        <Select label="Ordem de Serviço" value={form.id_os} onChange={(e) => setForm({ ...form, id_os: e.target.value })}>
          <option value="">Selecione</option>
          {ordens.map((o) => (
            <option key={o.id_os} value={o.id_os}>OS #{o.id_os} - {o.cliente_nome} ({formatCurrency(o.valor_total_final)})</option>
          ))}
        </Select>
        <Select label="Forma" className="mt-3" value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}>
          <option>PIX</option><option>Dinheiro</option><option>Cartão</option><option>Boleto</option><option>Transferência</option>
        </Select>
        <Input label="Valor" type="number" className="mt-3" value={form.valor_pago} onChange={(e) => setForm({ ...form, valor_pago: e.target.value })} />
        <div className="flex justify-end mt-4"><Button onClick={save}>Registrar</Button></div>
      </Modal>
    </>
  );
}
