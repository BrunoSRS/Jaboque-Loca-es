import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { servicosApi, formatCurrency } from '../api/client';
import { PageHeader, Button, Card, Input, Modal, Loading } from '../components/ui';

const empty = { nome: '', descricao: '', valor_padrao: 0, tempo_estimado_horas: 1, tipo_maquina_aplicavel: '' };

export default function Servicos() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = () => {
    setLoading(true);
    servicosApi.list().then((r) => setList(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = { ...form, valor_padrao: Number(form.valor_padrao), tempo_estimado_horas: Number(form.tempo_estimado_horas) };
    try {
      if (editId) await servicosApi.update(editId, payload);
      else await servicosApi.create(payload);
      toast.success('Serviço salvo');
      setModal(false);
      load();
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  return (
    <>
      <PageHeader title="Serviços Técnicos" subtitle="Catálogo de serviços da oficina" actions={<Button onClick={() => { setForm(empty); setEditId(null); setModal(true); }}><Plus size={18} /> Novo</Button>} />
      {loading ? <Loading /> : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Valor</th><th className="p-3 text-left">Horas</th><th className="p-3">Ações</th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id_servico} className="border-t">
                  <td className="p-3">{s.nome}</td>
                  <td className="p-3">{formatCurrency(s.valor_padrao)}</td>
                  <td className="p-3">{s.tempo_estimado_horas}h</td>
                  <td className="p-3 flex gap-2">
                    <button type="button" onClick={() => { setForm(s); setEditId(s.id_servico); setModal(true); }}><Pencil size={16} /></button>
                    <button type="button" onClick={async () => { await servicosApi.remove(s.id_servico); load(); }} className="text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Serviço" wide>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome" className="col-span-2" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input label="Descrição" className="col-span-2" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <Input label="Valor padrão" type="number" value={form.valor_padrao} onChange={(e) => setForm({ ...form, valor_padrao: e.target.value })} />
          <Input label="Horas estimadas" type="number" value={form.tempo_estimado_horas} onChange={(e) => setForm({ ...form, tempo_estimado_horas: e.target.value })} />
          <Input label="Tipo máquina" className="col-span-2" value={form.tipo_maquina_aplicavel} onChange={(e) => setForm({ ...form, tipo_maquina_aplicavel: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4"><Button onClick={save}>Salvar</Button></div>
      </Modal>
    </>
  );
}
