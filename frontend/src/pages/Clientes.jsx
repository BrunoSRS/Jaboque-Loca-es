import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientesApi } from '../api/client';
import { PageHeader, Button, Card, CardBody, Input, Modal, Loading } from '../components/ui';

const empty = { nome: '', cpf_cnpj: '', telefone: '', email: '', endereco: '' };

export default function Clientes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true);
    clientesApi.list(q || undefined).then((r) => setList(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [q]);

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = (c) => {
    setForm({ nome: c.nome, cpf_cnpj: c.cpf_cnpj || '', telefone: c.telefone || '', email: c.email || '', endereco: c.endereco || '' });
    setEditId(c.id_cliente);
    setModal(true);
  };

  const save = async () => {
    try {
      if (editId) await clientesApi.update(editId, form);
      else await clientesApi.create(form);
      toast.success('Cliente salvo');
      setModal(false);
      load();
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const remove = async (id) => {
    if (!confirm('Excluir cliente?')) return;
    try {
      await clientesApi.remove(id);
      toast.success('Excluído');
      load();
    } catch {
      toast.error('Não foi possível excluir');
    }
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes"
        actions={<Button onClick={openNew}><Plus size={18} /> Novo Cliente</Button>}
      />
      <Card className="mb-4">
        <CardBody>
          <Input placeholder="Buscar por nome ou CPF/CNPJ..." value={q} onChange={(e) => setQ(e.target.value)} />
        </CardBody>
      </Card>
      {loading ? <Loading /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">CPF/CNPJ</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Email</th>
                  <th className="p-3 w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id_cliente} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.nome}</td>
                    <td className="p-3">{c.cpf_cnpj}</td>
                    <td className="p-3">{c.telefone}</td>
                    <td className="p-3">{c.email}</td>
                    <td className="p-3 flex gap-2">
                      <button type="button" onClick={() => openEdit(c)} className="text-jaboque-navy"><Pencil size={16} /></button>
                      <button type="button" onClick={() => remove(c.id_cliente)} className="text-red-600"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Cliente' : 'Novo Cliente'} wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input label="CPF/CNPJ" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
          <Input label="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Endereço" className="sm:col-span-2" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </div>
      </Modal>
    </>
  );
}
