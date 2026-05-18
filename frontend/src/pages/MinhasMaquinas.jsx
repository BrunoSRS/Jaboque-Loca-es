import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { minhasMaquinasApi, formatCurrency } from '../api/client';
import { PageHeader, Button, Card, Input, Select, Modal, Loading } from '../components/ui';

const STATUS_OPCOES = ['Ativo', 'Em manutenção', 'Inativo', 'Vendido', 'Reserva'];

const empty = {
  marca: '',
  modelo: '',
  valor: 0,
  data_compra: '',
  patrimonio: '',
  acessorios: '',
  status_acompanhamento: 'Ativo',
};

export default function MinhasMaquinas() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = () => {
    setLoading(true);
    minhasMaquinasApi.list().then((r) => setList(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(empty);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (m) => {
    setForm({
      marca: m.marca,
      modelo: m.modelo || '',
      valor: m.valor || 0,
      data_compra: m.data_compra || '',
      patrimonio: m.patrimonio || '',
      acessorios: m.acessorios || '',
      status_acompanhamento: m.status_acompanhamento || 'Ativo',
    });
    setEditId(m.id_minha_maquina);
    setModal(true);
  };

  const save = async () => {
    if (!form.marca.trim()) {
      toast.error('Informe a marca');
      return;
    }
    const payload = {
      ...form,
      valor: Number(form.valor) || 0,
    };
    try {
      if (editId) await minhasMaquinasApi.update(editId, payload);
      else await minhasMaquinasApi.create(payload);
      toast.success('Máquina salva');
      setModal(false);
      load();
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const remove = async (id) => {
    if (!confirm('Excluir esta máquina?')) return;
    await minhasMaquinasApi.remove(id);
    toast.success('Excluída');
    load();
  };

  return (
    <>
      <PageHeader
        title="Minhas Máquinas"
        subtitle="Frota e equipamentos da empresa"
        actions={
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Máquina
          </Button>
        }
      />
      {loading ? (
        <Loading />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Modelo</th>
                  <th className="p-3">Patrimônio</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Dt. Compra</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id_minha_maquina} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{m.marca}</td>
                    <td className="p-3">{m.modelo}</td>
                    <td className="p-3">{m.patrimonio}</td>
                    <td className="p-3">{formatCurrency(m.valor)}</td>
                    <td className="p-3">{m.data_compra}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-jaboque-navy/10 text-jaboque-navy">
                        {m.status_acompanhamento}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button type="button" onClick={() => openEdit(m)} className="text-jaboque-navy">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => remove(m.id_minha_maquina)} className="text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Máquina' : 'Nova Máquina'} wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Marca *" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
          <Input label="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          <Input label="Valor (R$)" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          <Input label="Data da compra" type="date" value={form.data_compra} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} />
          <Input label="Patrimônio" value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} />
          <Select label="Status de acompanhamento" value={form.status_acompanhamento} onChange={(e) => setForm({ ...form, status_acompanhamento: e.target.value })}>
            {STATUS_OPCOES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input label="Acessórios" className="sm:col-span-2" value={form.acessorios} onChange={(e) => setForm({ ...form, acessorios: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </div>
      </Modal>
    </>
  );
}
