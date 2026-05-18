import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, History, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { equipamentosApi, clientesApi, formatCurrency } from '../api/client';
import { PageHeader, Button, Card, Input, Select, Modal, Loading } from '../components/ui';

const STATUS_EMPRESA = ['Ativo', 'Em manutenção', 'Inativo', 'Vendido', 'Reserva'];
const CONSERVACAO = ['Nova', 'Semi-nova', 'Usada', 'Muito usada'];

const emptyEmpresa = {
  tipo: 'empresa',
  marca: '',
  modelo: '',
  valor: 0,
  data_compra: '',
  patrimonio: '',
  acessorios: '',
  status_acompanhamento: 'Ativo',
};

const emptyCliente = {
  tipo: 'cliente',
  id_cliente: '',
  tipo_equipamento: '',
  marca: '',
  modelo: '',
  numero_serie: '',
  motorizacao: '',
  ano_fabricacao: '',
  patrimonio: '',
  acessorios: '',
  estado_conservacao: '',
};

export default function Equipamentos() {
  const [filtro, setFiltro] = useState('');
  const [list, setList] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [historicoModal, setHistoricoModal] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [equipamentoHistorico, setEquipamentoHistorico] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyEmpresa);

  const load = () => {
    setLoading(true);
    const params = filtro ? { tipo: filtro } : {};
    equipamentosApi.list(params).then((r) => setList(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    clientesApi.list().then((r) => setClientes(r.data));
  }, []);

  useEffect(() => {
    load();
  }, [filtro]);

  const openNew = (tipo) => {
    setForm(tipo === 'cliente' ? { ...emptyCliente } : { ...emptyEmpresa });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (eq) => {
    if (eq.tipo === 'cliente') {
      setForm({
        tipo: 'cliente',
        id_cliente: eq.id_cliente,
        tipo_equipamento: eq.tipo_equipamento || '',
        marca: eq.marca,
        modelo: eq.modelo || '',
        numero_serie: eq.numero_serie || '',
        motorizacao: eq.motorizacao || '',
        ano_fabricacao: eq.ano_fabricacao || '',
        patrimonio: eq.patrimonio || '',
        acessorios: eq.acessorios || '',
        estado_conservacao: eq.estado_conservacao || '',
      });
    } else {
      setForm({
        tipo: 'empresa',
        marca: eq.marca,
        modelo: eq.modelo || '',
        valor: eq.valor || 0,
        data_compra: eq.data_compra || '',
        patrimonio: eq.patrimonio || '',
        acessorios: eq.acessorios || '',
        status_acompanhamento: eq.status_acompanhamento || 'Ativo',
      });
    }
    setEditId(eq.id_equipamento);
    setModal(true);
  };

  const verHistorico = async (eq) => {
    setEquipamentoHistorico(eq);
    const { data } = await equipamentosApi.historico(eq.id_equipamento);
    setHistorico(data);
    setHistoricoModal(true);
  };

  const save = async () => {
    if (!form.marca?.trim()) {
      toast.error('Informe a marca');
      return;
    }
    if (form.tipo === 'cliente' && !form.id_cliente) {
      toast.error('Selecione o cliente proprietário');
      return;
    }
    const payload =
      form.tipo === 'empresa'
        ? { ...form, valor: Number(form.valor) || 0 }
        : {
            ...form,
            id_cliente: Number(form.id_cliente),
            ano_fabricacao: form.ano_fabricacao ? Number(form.ano_fabricacao) : null,
          };
    try {
      if (editId) await equipamentosApi.update(editId, payload);
      else await equipamentosApi.create(payload);
      toast.success('Equipamento salvo');
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao salvar');
    }
  };

  const remove = async (id) => {
    if (!confirm('Excluir este equipamento?')) return;
    await equipamentosApi.remove(id);
    toast.success('Excluído');
    load();
  };

  const tipoLabel = (tipo) => (tipo === 'empresa' ? 'Empresa' : 'Cliente');

  return (
    <>
      <PageHeader
        title="Equipamentos"
        subtitle="Frota da empresa e equipamentos de clientes — manutenção unificada"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => openNew('empresa')}>
              <Plus size={18} /> Empresa
            </Button>
            <Button onClick={() => openNew('cliente')}>
              <Plus size={18} /> Cliente
            </Button>
          </div>
        }
      />

      <Card className="mb-4 p-4">
        <Select label="Filtrar por propriedade" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-xs">
          <option value="">Todos</option>
          <option value="empresa">Empresa</option>
          <option value="cliente">Clientes</option>
        </Select>
      </Card>

      {loading ? (
        <Loading />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Propriedade</th>
                  <th className="p-3">Marca / Modelo</th>
                  <th className="p-3">Patrimônio</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Detalhes</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((eq) => (
                  <tr key={eq.id_equipamento} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          eq.tipo === 'empresa' ? 'bg-jaboque-navy/10 text-jaboque-navy' : 'bg-jaboque-orange/10 text-jaboque-orange'
                        }`}
                      >
                        {tipoLabel(eq.tipo)}
                      </span>
                    </td>
                    <td className="p-3 font-medium">
                      {eq.marca} {eq.modelo}
                    </td>
                    <td className="p-3">{eq.patrimonio || '-'}</td>
                    <td className="p-3">{eq.cliente_nome || '—'}</td>
                    <td className="p-3 text-gray-600 text-xs">
                      {eq.tipo === 'empresa'
                        ? `${formatCurrency(eq.valor)} · ${eq.status_acompanhamento}`
                        : `${eq.tipo_equipamento || ''} ${eq.numero_serie || ''}`.trim() || '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => verHistorico(eq)} className="text-jaboque-navy" title="Histórico de OS">
                          <History size={16} />
                        </button>
                        <Link
                          to={`/oficina/ordens/nova?equipamento=${eq.id_equipamento}`}
                          className="text-jaboque-orange inline-flex"
                          title="Nova OS"
                        >
                          <Wrench size={16} />
                        </Link>
                        <button type="button" onClick={() => openEdit(eq)} className="text-jaboque-navy">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => remove(eq.id_equipamento)} className="text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar equipamento' : 'Novo equipamento'} wide>
        {form.tipo === 'cliente' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Cliente proprietário *"
              value={form.id_cliente}
              onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}
            >
              <option value="">Selecione</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nome}
                </option>
              ))}
            </Select>
            <Input
              label="Tipo"
              value={form.tipo_equipamento}
              onChange={(e) => setForm({ ...form, tipo_equipamento: e.target.value })}
              placeholder="Ex: Escavadeira"
            />
            <Input label="Marca *" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            <Input label="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            <Input label="Nº série" value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
            <Input label="Motorização" value={form.motorizacao} onChange={(e) => setForm({ ...form, motorizacao: e.target.value })} />
            <Input
              label="Ano"
              type="number"
              value={form.ano_fabricacao}
              onChange={(e) => setForm({ ...form, ano_fabricacao: e.target.value })}
            />
            <Input label="Patrimônio" value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} />
            <Select
              label="Estado de conservação"
              value={form.estado_conservacao}
              onChange={(e) => setForm({ ...form, estado_conservacao: e.target.value })}
            >
              <option value="">—</option>
              {CONSERVACAO.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
            <Input
              label="Acessórios"
              className="sm:col-span-2"
              value={form.acessorios}
              onChange={(e) => setForm({ ...form, acessorios: e.target.value })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Marca *" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            <Input label="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            <Input label="Valor (R$)" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            <Input label="Data da compra" type="date" value={form.data_compra} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} />
            <Input label="Patrimônio" value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} />
            <Select
              label="Status"
              value={form.status_acompanhamento}
              onChange={(e) => setForm({ ...form, status_acompanhamento: e.target.value })}
            >
              {STATUS_EMPRESA.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Input
              label="Acessórios"
              className="sm:col-span-2"
              value={form.acessorios}
              onChange={(e) => setForm({ ...form, acessorios: e.target.value })}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setModal(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </div>
      </Modal>

      <Modal
        open={historicoModal}
        onClose={() => setHistoricoModal(false)}
        title={`Histórico — ${equipamentoHistorico?.marca} ${equipamentoHistorico?.modelo || ''}`}
        wide
      >
        {historico.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma ordem de serviço registrada para este equipamento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">OS</th>
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Defeito</th>
                  <th className="p-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id_os} className="border-t">
                    <td className="p-2">
                      <Link to={`/oficina/ordens/${h.id_os}/editar`} className="text-jaboque-orange font-mono">
                        #{h.id_os}
                      </Link>
                    </td>
                    <td className="p-2">{h.data_abertura}</td>
                    <td className="p-2">{h.status}</td>
                    <td className="p-2 max-w-xs truncate">{h.defeito_reclamado || '—'}</td>
                    <td className="p-2">{formatCurrency(h.valor_total_final)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  );
}

