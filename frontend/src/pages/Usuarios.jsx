import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usuariosApi } from '../api/client';
import { PageHeader, Button, Card, Input, Select, Modal, Loading } from '../components/ui';

const empty = { nome: '', login: '', senha: '', perfil: 'atendente', ativo: true };

export default function Usuarios() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => {
    setLoading(true);
    usuariosApi.list().then((r) => setList(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await usuariosApi.create(form);
      toast.success('Usuário criado');
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro');
    }
  };

  return (
    <>
      <PageHeader title="Usuários" subtitle="Gestão de acesso (admin)" actions={<Button onClick={() => { setForm(empty); setModal(true); }}><Plus size={18} /> Novo</Button>} />
      {loading ? <Loading /> : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Login</th><th className="p-3 text-left">Perfil</th><th className="p-3 text-left">Ativo</th><th className="p-3">Ações</th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id_usuario} className="border-t">
                  <td className="p-3">{u.nome}</td>
                  <td className="p-3">{u.login}</td>
                  <td className="p-3">{u.perfil}</td>
                  <td className="p-3">{u.ativo ? 'Sim' : 'Não'}</td>
                  <td className="p-3">
                    <button type="button" className="text-red-600" onClick={async () => { await usuariosApi.remove(u.id_usuario); load(); }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo usuário">
        <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <Input label="Login" className="mt-3" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
        <Input label="Senha" type="password" className="mt-3" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
        <Select label="Perfil" className="mt-3" value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
          <option value="admin">Admin</option>
          <option value="tecnico">Técnico</option>
          <option value="atendente">Atendente</option>
        </Select>
        <div className="flex justify-end mt-4"><Button onClick={save}>Salvar</Button></div>
      </Modal>
    </>
  );
}
