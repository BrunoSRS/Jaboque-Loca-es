import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { comprasApi, fornecedoresApi, pecasApi, formatCurrency } from '../api/client';
import { PageHeader, Button, Card, CardBody, Input, Select, Modal, Loading, KpiCard } from '../components/ui';

export default function Estoque() {
  const [compras, setCompras] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [baixo, setBaixo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [fornModal, setFornModal] = useState(false);
  const [form, setForm] = useState({ id_fornecedor: '', id_peca: '', quantidade: 1, preco_unitario: 0, nota_fiscal: '', criar_precificacao: true, margem: 30 });
  const [fornForm, setFornForm] = useState({ nome: '', cnpj: '', contato: '', telefone: '', email: '' });
  const [editFornId, setEditFornId] = useState(null);

  const load = async () => {
    setLoading(true);
    const [c, f, p, b] = await Promise.all([comprasApi.list(), fornecedoresApi.list(), pecasApi.list(), pecasApi.estoqueBaixo()]);
    setCompras(c.data);
    setFornecedores(f.data);
    setPecas(p.data);
    setBaixo(b.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const registrarCompra = async () => {
    try {
      await comprasApi.create({
        id_fornecedor: Number(form.id_fornecedor),
        id_peca: Number(form.id_peca),
        quantidade: Number(form.quantidade),
        preco_unitario: Number(form.preco_unitario),
        nota_fiscal: form.nota_fiscal,
        criar_precificacao: form.criar_precificacao ? { margem_lucro: Number(form.margem) } : undefined,
      });
      toast.success('Compra registrada');
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro');
    }
  };

  if (loading) return <Loading full />;

  return (
    <>
      <PageHeader title="Estoque" subtitle="Compras e alertas" actions={<Button onClick={() => setModal(true)}><Plus size={18} /> Nova Compra</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard title="Peças em baixa" value={baixo.length} warning={baixo.length > 0} subtitle="Abaixo do mínimo" />
        <KpiCard title="Fornecedores" value={fornecedores.length} accent />
        <KpiCard title="Compras registradas" value={compras.length} accent />
      </div>
      {baixo.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardBody>
            <h3 className="font-semibold text-amber-700 mb-2">Alerta de estoque</h3>
            <ul className="text-sm space-y-1">
              {baixo.map((p) => (
                <li key={p.id_peca}>{p.nome}: {p.estoque_atual} / mín. {p.estoque_minimo}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
      <Card className="mb-6">
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Fornecedores</h3>
            <Button onClick={() => { setFornForm({ nome: '', cnpj: '', contato: '', telefone: '', email: '' }); setEditFornId(null); setFornModal(true); }}><Plus size={16} /> Novo</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">CNPJ</th><th className="p-2 text-left">Contato</th><th className="p-2">Ações</th></tr></thead>
            <tbody>
              {fornecedores.map((f) => (
                <tr key={f.id_fornecedor} className="border-t">
                  <td className="p-2">{f.nome}</td>
                  <td className="p-2">{f.cnpj}</td>
                  <td className="p-2">{f.contato} {f.telefone}</td>
                  <td className="p-2">
                    <button type="button" onClick={() => { setFornForm(f); setEditFornId(f.id_fornecedor); setFornModal(true); }}><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="font-semibold mb-4">Histórico de compras</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="p-2 text-left">Data</th><th className="p-2 text-left">Peça</th><th className="p-2 text-left">Fornecedor</th><th className="p-2 text-left">Qtd</th><th className="p-2 text-left">Valor</th></tr></thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id_compra} className="border-t">
                  <td className="p-2">{c.data_compra}</td>
                  <td className="p-2">{c.peca_nome}</td>
                  <td className="p-2">{c.fornecedor_nome}</td>
                  <td className="p-2">{c.quantidade}</td>
                  <td className="p-2">{formatCurrency(c.preco_unitario * c.quantidade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar compra" wide>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Fornecedor" value={form.id_fornecedor} onChange={(e) => setForm({ ...form, id_fornecedor: e.target.value })}>
            <option value="">Selecione</option>
            {fornecedores.map((f) => <option key={f.id_fornecedor} value={f.id_fornecedor}>{f.nome}</option>)}
          </Select>
          <Select label="Peça" value={form.id_peca} onChange={(e) => setForm({ ...form, id_peca: e.target.value })}>
            <option value="">Selecione</option>
            {pecas.map((p) => <option key={p.id_peca} value={p.id_peca}>{p.nome}</option>)}
          </Select>
          <Input label="Quantidade" type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
          <Input label="Preço unitário" type="number" value={form.preco_unitario} onChange={(e) => setForm({ ...form, preco_unitario: e.target.value })} />
          <Input label="Nota fiscal" className="col-span-2" value={form.nota_fiscal} onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })} />
          <Input label="Margem %" type="number" value={form.margem} onChange={(e) => setForm({ ...form, margem: e.target.value })} />
        </div>
        <div className="flex justify-end mt-4"><Button onClick={registrarCompra}>Registrar</Button></div>
      </Modal>
      <Modal open={fornModal} onClose={() => setFornModal(false)} title="Fornecedor">
        <Input label="Nome" value={fornForm.nome} onChange={(e) => setFornForm({ ...fornForm, nome: e.target.value })} />
        <Input label="CNPJ" className="mt-3" value={fornForm.cnpj} onChange={(e) => setFornForm({ ...fornForm, cnpj: e.target.value })} />
        <Input label="Contato" className="mt-3" value={fornForm.contato} onChange={(e) => setFornForm({ ...fornForm, contato: e.target.value })} />
        <Input label="Telefone" className="mt-3" value={fornForm.telefone} onChange={(e) => setFornForm({ ...fornForm, telefone: e.target.value })} />
        <Input label="Email" className="mt-3" value={fornForm.email} onChange={(e) => setFornForm({ ...fornForm, email: e.target.value })} />
        <div className="flex justify-end mt-4">
          <Button
            onClick={async () => {
              if (editFornId) await fornecedoresApi.update(editFornId, fornForm);
              else await fornecedoresApi.create(fornForm);
              toast.success('Fornecedor salvo');
              setFornModal(false);
              load();
            }}
          >
            Salvar
          </Button>
        </div>
      </Modal>
    </>
  );
}
