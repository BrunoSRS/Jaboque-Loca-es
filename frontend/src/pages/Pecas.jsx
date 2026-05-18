import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { pecasApi, precificacoesApi, formatCurrency } from '../api/client';
import { PageHeader, Button, Card, Input, Select, Modal, Loading } from '../components/ui';

const empty = {
  codigo_barras: '',
  nome: '',
  categoria: '',
  aplicacao_maquinas: '',
  fabricante: '',
  unidade_medida: 'UN',
  estoque_minimo: 0,
  estoque_atual: 0,
  local_armazenamento: '',
};

const FILTROS_ESTOQUE = [
  { value: '', label: 'Todas as peças' },
  { value: 'critico', label: 'No mínimo ou abaixo (inclui zerado)' },
  { value: 'zerado', label: 'Estoque zerado' },
  { value: 'baixo', label: 'Abaixo do mínimo (com saldo)' },
  { value: 'ok', label: 'Acima do mínimo' },
];

const ORDENACAO = [
  { value: 'nome', label: 'Nome (A–Z)' },
  { value: 'estoque_asc', label: 'Menor quantidade primeiro' },
  { value: 'estoque_desc', label: 'Maior quantidade primeiro' },
];

function statusEstoque(p) {
  if (p.estoque_atual === 0) return { label: 'Zerado', className: 'bg-red-100 text-red-800' };
  if (p.estoque_atual <= p.estoque_minimo) return { label: 'Baixo', className: 'bg-amber-100 text-amber-800' };
  return { label: 'OK', className: 'bg-green-100 text-green-800' };
}

export default function Pecas() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [precModal, setPrecModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [precForm, setPrecForm] = useState({ id_peca: '', preco_custo: 0, preco_venda_sugerido: 0, margem_lucro: 30 });
  const [editId, setEditId] = useState(null);

  const [busca, setBusca] = useState('');
  const [filtroEstoque, setFiltroEstoque] = useState('');
  const [estoqueMin, setEstoqueMin] = useState('');
  const [estoqueMax, setEstoqueMax] = useState('');
  const [ordenar, setOrdenar] = useState('nome');

  const load = () => {
    setLoading(true);
    const params = { ordenar };
    if (busca.trim()) params.q = busca.trim();
    if (filtroEstoque) params.estoque = filtroEstoque;
    if (estoqueMin !== '') params.estoqueMin = estoqueMin;
    if (estoqueMax !== '') params.estoqueMax = estoqueMax;

    pecasApi
      .list(params)
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filtroEstoque, ordenar]);

  const aplicarFiltros = () => load();

  const limparFiltros = () => {
    setBusca('');
    setFiltroEstoque('');
    setEstoqueMin('');
    setEstoqueMax('');
    setOrdenar('nome');
    setLoading(true);
    pecasApi.list({ ordenar: 'nome' }).then((r) => setList(r.data)).finally(() => setLoading(false));
  };

  const save = async () => {
    const payload = { ...form, estoque_minimo: Number(form.estoque_minimo), estoque_atual: Number(form.estoque_atual) };
    try {
      if (editId) await pecasApi.update(editId, payload);
      else await pecasApi.create(payload);
      toast.success('Peça salva');
      setModal(false);
      load();
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const savePrec = async () => {
    await precificacoesApi.create({
      id_peca: Number(precForm.id_peca),
      preco_custo: Number(precForm.preco_custo),
      preco_venda_sugerido: Number(precForm.preco_venda_sugerido),
      margem_lucro: Number(precForm.margem_lucro),
    });
    toast.success('Precificação atualizada');
    setPrecModal(false);
    load();
  };

  return (
    <>
      <PageHeader
        title="Peças"
        subtitle="Catálogo e estoque"
        actions={
          <Button onClick={() => { setForm(empty); setEditId(null); setModal(true); }}>
            <Plus size={18} /> Nova Peça
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex items-center gap-2 mb-4 text-jaboque-navy">
          <Filter size={18} />
          <span className="font-semibold text-sm">Filtros de estoque</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Input
            label="Buscar"
            placeholder="Nome ou código"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
          />
          <Select label="Situação do estoque" value={filtroEstoque} onChange={(e) => setFiltroEstoque(e.target.value)}>
            {FILTROS_ESTOQUE.map((f) => (
              <option key={f.value || 'todos'} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          <Input
            label="Qtd. mínima"
            type="number"
            min="0"
            placeholder="Ex: 1"
            value={estoqueMin}
            onChange={(e) => setEstoqueMin(e.target.value)}
          />
          <Input
            label="Qtd. máxima"
            type="number"
            min="0"
            placeholder="Ex: 10"
            value={estoqueMax}
            onChange={(e) => setEstoqueMax(e.target.value)}
          />
          <Select label="Ordenar por" value={ordenar} onChange={(e) => setOrdenar(e.target.value)}>
            {ORDENACAO.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <div className="flex items-end gap-2">
            <Button onClick={aplicarFiltros} className="flex-1">
              Filtrar
            </Button>
            <Button variant="secondary" type="button" onClick={limparFiltros}>
              Limpar
            </Button>
          </div>
        </div>
        {!loading && (
          <p className="text-sm text-gray-500 mt-3">
            {list.length} peça{list.length !== 1 ? 's' : ''} encontrada{list.length !== 1 ? 's' : ''}
          </p>
        )}
      </Card>

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-sm">Nenhuma peça encontrada com os filtros selecionados.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Situação</th>
                  <th className="p-3 text-left">Estoque</th>
                  <th className="p-3 text-left">Mínimo</th>
                  <th className="p-3 text-left">Preço venda</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const st = statusEstoque(p);
                  return (
                    <tr
                      key={p.id_peca}
                      className={`border-t hover:bg-gray-50 ${p.estoque_atual <= p.estoque_minimo ? 'bg-amber-50/60' : ''}`}
                    >
                      <td className="p-3 font-medium">{p.nome}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.className}`}>{st.label}</span>
                      </td>
                      <td className="p-3 font-semibold tabular-nums">{p.estoque_atual}</td>
                      <td className="p-3 tabular-nums text-gray-600">{p.estoque_minimo}</td>
                      <td className="p-3">{formatCurrency(p.precificacao_vigente?.preco_venda_sugerido)}</td>
                      <td className="p-3 flex gap-2">
                        <button
                          type="button"
                          title="Precificar"
                          onClick={() => {
                            setPrecForm({ id_peca: p.id_peca, preco_custo: 0, preco_venda_sugerido: 0, margem_lucro: 30 });
                            setPrecModal(true);
                          }}
                          className="text-xs text-jaboque-orange font-medium"
                        >
                          R$
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm(p);
                            setEditId(p.id_peca);
                            setModal(true);
                          }}
                          className="text-jaboque-navy"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Excluir esta peça?')) return;
                            await pecasApi.remove(p.id_peca);
                            toast.success('Peça excluída');
                            load();
                          }}
                          className="text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Peça" wide>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Código barras" value={form.codigo_barras} onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })} />
          <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input label="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
          <Input label="Fabricante" value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} />
          <Input label="Estoque atual" type="number" value={form.estoque_atual} onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })} />
          <Input label="Estoque mínimo" type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
          <Input label="Local" className="col-span-2" value={form.local_armazenamento} onChange={(e) => setForm({ ...form, local_armazenamento: e.target.value })} />
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={save}>Salvar</Button>
        </div>
      </Modal>
      <Modal open={precModal} onClose={() => setPrecModal(false)} title="Nova Precificação">
        <Input label="Preço custo" type="number" value={precForm.preco_custo} onChange={(e) => setPrecForm({ ...precForm, preco_custo: e.target.value })} />
        <Input label="Preço venda" type="number" className="mt-3" value={precForm.preco_venda_sugerido} onChange={(e) => setPrecForm({ ...precForm, preco_venda_sugerido: e.target.value })} />
        <div className="flex justify-end mt-4">
          <Button onClick={savePrec}>Salvar</Button>
        </div>
      </Modal>
    </>
  );
}

