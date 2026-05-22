import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  osApi,
  clientesApi,
  equipamentosApi,
  servicosApi,
  pecasApi,
  gerarRelatorioCobranca,
  formatCurrency,
} from '../api/client';
import { PageHeader, Button, Card, CardBody, Input, Select, Textarea, Loading } from '../components/ui';

const CONSERVACAO = ['Nova', 'Semi-nova', 'Usada', 'Muito usada'];

const emptyForm = {
  id_cliente: '',
  id_equipamento: '',
  data_abertura: new Date().toISOString().slice(0, 10),
  data_previsao_entrega: '',
  prioridade: 'Normal',
  equipamento_marca: '',
  equipamento_modelo: '',
  estado_conservacao: '',
  defeito_reclamado: '',
  patrimonio: '',
  observacoes_cliente: '',
  observacoes_internas: '',
  diagnostico_tecnico: '',
  valor_mao_de_obra: 0,
  valor_desconto_global: 0,
  tipo_desconto_global: 'fixo',
  servicos_executados_desc: '',
  tecnico_responsavel: '',
};

export default function OrdemWizard() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNova = !id || id === 'nova';
  const [loading, setLoading] = useState(!isNova);
  const [clientes, setClientes] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [catalogoServicos, setCatalogoServicos] = useState([]);
  const [catalogoPecas, setCatalogoPecas] = useState([]);
  const [osId, setOsId] = useState(isNova ? null : Number(id));
  const [os, setOs] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [novoServico, setNovoServico] = useState({ id_servico: '', valor_praticado: 0, quantidade_horas: 1 });
  const [novoItem, setNovoItem] = useState({ id_peca: '', quantidade: 1, desconto_item: 0, local_aplicado: '' });

  const isOrcamento = os?.status === 'Orçamento' || isNova;

  useEffect(() => {
    clientesApi.list().then((r) => setClientes(r.data));
    equipamentosApi.list().then((r) => setEquipamentos(r.data));
    servicosApi.list().then((r) => setCatalogoServicos(r.data));
    pecasApi.list().then((r) => setCatalogoPecas(r.data));
  }, []);

  useEffect(() => {
    const eqId = searchParams.get('equipamento');
    if (!eqId || !isNova) return;
    equipamentosApi.get(eqId).then(({ data }) => {
      setForm((prev) => ({
        ...prev,
        id_equipamento: data.id_equipamento,
        equipamento_marca: data.marca,
        equipamento_modelo: data.modelo || '',
        patrimonio: data.patrimonio || '',
        estado_conservacao: data.estado_conservacao || prev.estado_conservacao,
        id_cliente: data.tipo === 'cliente' ? data.id_cliente : prev.id_cliente,
      }));
    });
  }, [searchParams, isNova]);

  useEffect(() => {
    if (!isNova && id) {
      osApi.get(id).then((r) => {
        const data = r.data;
        setOs(data);
        setOsId(data.id_os);
        setForm({
          id_cliente: data.id_cliente,
          id_equipamento: data.id_equipamento || '',
          data_abertura: data.data_abertura,
          data_previsao_entrega: data.data_previsao_entrega || '',
          prioridade: data.prioridade || 'Normal',
          equipamento_marca: data.equipamento_marca || '',
          equipamento_modelo: data.equipamento_modelo || '',
          estado_conservacao: data.estado_conservacao || '',
          defeito_reclamado: data.defeito_reclamado || '',
          patrimonio: data.patrimonio || '',
          observacoes_cliente: data.observacoes_cliente || '',
          observacoes_internas: data.observacoes_internas || '',
          diagnostico_tecnico: data.diagnostico_tecnico || '',
          valor_mao_de_obra: data.valor_mao_de_obra || 0,
          valor_desconto_global: data.valor_desconto_global || 0,
          tipo_desconto_global: data.tipo_desconto_global || 'fixo',
          servicos_executados_desc: data.servicos_executados_desc || '',
          tecnico_responsavel: data.tecnico_responsavel || '',
        });
        if (data.foto_equipamento) setFotoPreview(data.foto_equipamento);
        setLoading(false);
      });
    }
  }, [id, isNova]);

  const reloadOs = async (idOs) => {
    const { data } = await osApi.get(idOs);
    setOs(data);
    return data;
  };

  const equipamentosFiltrados = equipamentos.filter(
    (e) => !form.id_cliente || e.tipo === 'empresa' || String(e.id_cliente) === String(form.id_cliente)
  );

  const equipamentoSelecionado = equipamentos.find(
    (e) => e.id_equipamento === Number(form.id_equipamento)
  );

  const aplicarEquipamento = (eq) => {
    if (!eq) return;
    setForm((prev) => ({
      ...prev,
      id_equipamento: eq.id_equipamento,
      equipamento_marca: eq.marca,
      equipamento_modelo: eq.modelo || '',
      patrimonio: eq.patrimonio || '',
      estado_conservacao: eq.estado_conservacao || prev.estado_conservacao,
      id_cliente: eq.tipo === 'cliente' ? eq.id_cliente : prev.id_cliente,
    }));
  };

  const buildPayload = () => ({
    ...form,
    id_cliente: Number(form.id_cliente),
    id_equipamento: Number(form.id_equipamento),
    valor_mao_de_obra: Number(form.valor_mao_de_obra) || 0,
    valor_desconto_global: Number(form.valor_desconto_global) || 0,
  });

  const salvarDadosIniciais = async () => {
    if (!form.id_equipamento) {
      toast.error('Selecione o equipamento em manutenção');
      return;
    }
    if (!form.id_cliente) {
      toast.error('Selecione o cliente da OS');
      return;
    }
    if (!form.defeito_reclamado?.trim()) {
      toast.error('Informe o defeito reclamado');
      return;
    }
    try {
      const payload = { ...buildPayload(), status: 'Orçamento' };
      let currentId = osId;
      if (currentId) {
        await osApi.update(currentId, payload);
      } else {
        const { data } = await osApi.create(payload);
        currentId = data.id_os;
        setOsId(currentId);
        navigate(`/oficina/ordens/${currentId}/editar`, { replace: true });
      }
      if (foto) {
        await osApi.uploadFoto(currentId, foto);
      }
      await reloadOs(currentId);
      toast.success('Dados iniciais salvos');
      if (isNova) navigate('/oficina/ordens');
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const salvarOrcamentoCompleto = async () => {
    try {
      await osApi.update(osId, { ...buildPayload(), status: 'Orçamento' });
      if (foto) await osApi.uploadFoto(osId, foto);
      await osApi.recalcular(osId);
      toast.success('Orçamento atualizado');
      await reloadOs(osId);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const onFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tiposOk = ['image/png', 'image/jpeg'];
    const extOk = /\.(png|jpe?g)$/i.test(file.name);
    if (!tiposOk.includes(file.type) && !extOk) {
      toast.error('Apenas PNG ou JPEG');
      return;
    }
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const addServico = async () => {
    if (!osId || !novoServico.id_servico) return;
    const cat = catalogoServicos.find((s) => s.id_servico === Number(novoServico.id_servico));
    await osApi.addServico(osId, {
      id_servico: Number(novoServico.id_servico),
      valor_praticado: Number(novoServico.valor_praticado) || cat?.valor_padrao || 0,
      quantidade_horas: Number(novoServico.quantidade_horas) || 1,
    });
    await reloadOs(osId);
    setNovoServico({ id_servico: '', valor_praticado: 0, quantidade_horas: 1 });
    toast.success('Serviço adicionado');
  };

  const addItem = async () => {
    if (!osId || !novoItem.id_peca) return;
    try {
      await osApi.addItem(osId, {
        id_peca: Number(novoItem.id_peca),
        quantidade: Number(novoItem.quantidade),
        desconto_item: Number(novoItem.desconto_item) || 0,
        local_aplicado: novoItem.local_aplicado,
      });
      await reloadOs(osId);
      setNovoItem({ id_peca: '', quantidade: 1, desconto_item: 0, local_aplicado: '' });
      toast.success('Peça adicionada');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro');
    }
  };

  if (loading) return <Loading full />;

  const dadosIniciaisSection = (
    <div className="space-y-6">
      <h3 className="font-semibold text-jaboque-navy border-b pb-2">Dados do Cliente</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Cliente da OS *"
          value={form.id_cliente}
          onChange={(e) => setForm({ ...form, id_cliente: e.target.value, id_equipamento: '' })}
          disabled={(!isOrcamento && !isNova) || equipamentoSelecionado?.tipo === 'cliente'}
        >
          <option value="">Selecione o cliente</option>
          {clientes.map((c) => (
            <option key={c.id_cliente} value={c.id_cliente}>{c.nome}</option>
          ))}
        </Select>
        <Input label="Data de Abertura" type="date" value={form.data_abertura} onChange={(e) => setForm({ ...form, data_abertura: e.target.value })} disabled={!isOrcamento && !isNova} />
        <Input label="Previsão de Entrega" type="date" value={form.data_previsao_entrega} onChange={(e) => setForm({ ...form, data_previsao_entrega: e.target.value })} disabled={!isOrcamento && !isNova} />
        <Select label="Prioridade" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} disabled={!isOrcamento && !isNova}>
          <option>Normal</option><option>Alta</option><option>Urgente</option>
        </Select>
      </div>

      <h3 className="font-semibold text-jaboque-navy border-b pb-2">Equipamento em manutenção</h3>
      <p className="text-sm text-gray-500 mb-3">
        A OS atende um equipamento cadastrado. A propriedade (empresa ou cliente) é definida no cadastro do equipamento.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Equipamento *"
          value={form.id_equipamento}
          onChange={(e) => {
            const eq = equipamentos.find((x) => x.id_equipamento === Number(e.target.value));
            aplicarEquipamento(eq);
          }}
          disabled={!isOrcamento && !isNova}
          className="md:col-span-2"
        >
          <option value="">Selecione o equipamento</option>
          {equipamentosFiltrados.map((e) => (
            <option key={e.id_equipamento} value={e.id_equipamento}>
              [{e.tipo === 'empresa' ? 'Empresa' : 'Cliente'}] {e.marca} {e.modelo}
              {e.patrimonio ? ` · ${e.patrimonio}` : ''}
            </option>
          ))}
        </Select>
        {equipamentoSelecionado && (
          <div className="md:col-span-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            <span className="font-medium text-jaboque-navy">
              {equipamentoSelecionado.marca} {equipamentoSelecionado.modelo}
            </span>
            {' · '}
            Propriedade:{' '}
            {equipamentoSelecionado.tipo === 'empresa' ? 'Empresa' : equipamentoSelecionado.cliente_nome}
            {equipamentoSelecionado.patrimonio && ` · Patrimônio: ${equipamentoSelecionado.patrimonio}`}
          </div>
        )}
        <Select label="Estado de conservação (na OS)" value={form.estado_conservacao} onChange={(e) => setForm({ ...form, estado_conservacao: e.target.value })} disabled={!isOrcamento && !isNova}>
          <option value="">Selecione</option>
          {CONSERVACAO.map((e) => <option key={e} value={e}>{e}</option>)}
        </Select>
        <Input label="Patrimônio (snapshot)" value={form.patrimonio} readOnly disabled className="bg-gray-50" />
        <Textarea label="Defeito reclamado *" className="md:col-span-2" value={form.defeito_reclamado} onChange={(e) => setForm({ ...form, defeito_reclamado: e.target.value })} disabled={!isOrcamento && !isNova} />
        <label className="md:col-span-2 block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Foto do equipamento (PNG ou JPEG)</span>
          <input type="file" accept="image/png,image/jpeg,.jpg,.jpeg" onChange={onFotoChange} className="text-sm" disabled={!isOrcamento && !isNova} />
          {fotoPreview && (
            <img src={fotoPreview} alt="Equipamento" className="mt-2 max-h-40 rounded border" />
          )}
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Textarea label="Observações do Cliente" value={form.observacoes_cliente} onChange={(e) => setForm({ ...form, observacoes_cliente: e.target.value })} disabled={!isOrcamento && !isNova} />
        <Textarea label="Observações Internas" value={form.observacoes_internas} onChange={(e) => setForm({ ...form, observacoes_internas: e.target.value })} disabled={!isOrcamento && !isNova} />
      </div>
    </div>
  );

  const orcamentoExtras = isOrcamento && osId && (
    <>
      <h3 className="font-semibold text-jaboque-navy border-b pb-2 mt-8">Serviços (orçamento)</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <Select label="Serviço" value={novoServico.id_servico} onChange={(e) => {
          const s = catalogoServicos.find((x) => x.id_servico === Number(e.target.value));
          setNovoServico({ ...novoServico, id_servico: e.target.value, valor_praticado: s?.valor_padrao || 0 });
        }}>
          <option value="">Catálogo</option>
          {catalogoServicos.map((s) => <option key={s.id_servico} value={s.id_servico}>{s.nome}</option>)}
        </Select>
        <Input label="Valor" type="number" value={novoServico.valor_praticado} onChange={(e) => setNovoServico({ ...novoServico, valor_praticado: e.target.value })} />
        <Input label="Horas" type="number" value={novoServico.quantidade_horas} onChange={(e) => setNovoServico({ ...novoServico, quantidade_horas: e.target.value })} />
        <div className="flex items-end"><Button onClick={addServico}>Adicionar</Button></div>
      </div>
      <ul className="space-y-2 mb-6">
        {os?.servicos?.map((s) => (
          <li key={s.id_servico_os} className="flex justify-between p-3 border rounded-lg text-sm">
            <span>{s.servico_nome} — {formatCurrency(s.valor_praticado)}</span>
            <button type="button" onClick={async () => { await osApi.removeServico(osId, s.id_servico_os); reloadOs(osId); }} className="text-red-500"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>

      <h3 className="font-semibold text-jaboque-navy border-b pb-2">Peças (orçamento)</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <Select label="Peça" value={novoItem.id_peca} onChange={(e) => setNovoItem({ ...novoItem, id_peca: e.target.value })}>
          <option value="">Selecione</option>
          {catalogoPecas.map((p) => <option key={p.id_peca} value={p.id_peca}>{p.nome} (est: {p.estoque_atual})</option>)}
        </Select>
        <Input label="Qtd" type="number" value={novoItem.quantidade} onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })} />
        <Input label="Desconto" type="number" value={novoItem.desconto_item} onChange={(e) => setNovoItem({ ...novoItem, desconto_item: e.target.value })} />
        <Input label="Local" value={novoItem.local_aplicado} onChange={(e) => setNovoItem({ ...novoItem, local_aplicado: e.target.value })} />
        <div className="flex items-end"><Button onClick={addItem}>Adicionar</Button></div>
      </div>
      <ul className="space-y-2 mb-6">
        {os?.itens?.map((i) => (
          <li key={i.id_item_os} className="flex justify-between p-3 border rounded-lg text-sm">
            <span>{i.peca_nome} x{i.quantidade}</span>
            <button type="button" onClick={async () => { await osApi.removeItem(osId, i.id_item_os); reloadOs(osId); }} className="text-red-500"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>

      <h3 className="font-semibold text-jaboque-navy border-b pb-2">Resumo financeiro</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Input label="Mão de obra" type="number" value={form.valor_mao_de_obra} onChange={(e) => setForm({ ...form, valor_mao_de_obra: e.target.value })} />
        <Input label="Desconto global" type="number" value={form.valor_desconto_global} onChange={(e) => setForm({ ...form, valor_desconto_global: e.target.value })} />
        <Select label="Tipo desconto" value={form.tipo_desconto_global} onChange={(e) => setForm({ ...form, tipo_desconto_global: e.target.value })}>
          <option value="fixo">Fixo (R$)</option>
          <option value="percentual">Percentual (%)</option>
        </Select>
        <Input label="Técnico" value={form.tecnico_responsavel} onChange={(e) => setForm({ ...form, tecnico_responsavel: e.target.value })} />
        <Textarea label="Diagnóstico" className="md:col-span-2" value={form.diagnostico_tecnico} onChange={(e) => setForm({ ...form, diagnostico_tecnico: e.target.value })} />
        <Textarea label="Serviços executados" className="md:col-span-2" value={form.servicos_executados_desc} onChange={(e) => setForm({ ...form, servicos_executados_desc: e.target.value })} />
      </div>
      {os && (
        <Card className="bg-jaboque-navy text-white mt-4">
          <CardBody>
            <p className="flex justify-between font-bold text-lg">
              <span>TOTAL</span>
              <span>{formatCurrency(os.valor_total_final)}</span>
            </p>
          </CardBody>
        </Card>
      )}
      <div className="flex gap-2 mt-4 flex-wrap">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await gerarRelatorioCobranca(osId);
              toast.success('Relatório de cobrança gerado');
            } catch {
              toast.error('Erro ao gerar PDF');
            }
          }}
        >
          <FileText size={16} /> Relatório PDF (cobrança)
        </Button>
      </div>
    </>
  );

  const excluirOs = async () => {
    if (!osId) return;
    if (!confirm('Excluir esta ordem de serviço? Os itens voltarão ao estoque.')) return;
    try {
      await osApi.remove(osId);
      toast.success('OS excluída');
      navigate('/oficina/ordens');
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  return (
    <>
      <PageHeader
        title={isNova ? 'Nova Ordem de Serviço' : `OS #${osId}`}
        subtitle={os?.status ? `Status: ${os.status}` : 'Preencha os dados iniciais'}
        actions={
          <div className="flex gap-2 flex-wrap">
            {osId && (
              <>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await gerarRelatorioCobranca(osId);
                      toast.success('Relatório de cobrança gerado');
                    } catch {
                      toast.error('Erro ao gerar PDF');
                    }
                  }}
                >
                  <FileText size={16} /> PDF Cobrança
                </Button>
                <Button variant="danger" onClick={excluirOs}>
                  <Trash2 size={16} /> Excluir OS
                </Button>
              </>
            )}
            <Link to="/oficina/ordens"><Button variant="secondary">Voltar</Button></Link>
          </div>
        }
      />

      {!isOrcamento && os && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Para alterar o status e incluir técnico/peças, use o botão &quot;Alterar status&quot; na lista de ordens.
          {os.data_status_alteracao && <span className="block mt-1">Última alteração: {os.data_status_alteracao}</span>}
          {os.tecnico_responsavel && <span className="block">Técnico: {os.tecnico_responsavel}</span>}
        </div>
      )}

      <Card className="mb-6">
        <CardBody>
          {dadosIniciaisSection}
          {orcamentoExtras}
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        {isNova || (os?.status === 'Orçamento' && !osId) ? (
          <Button onClick={salvarDadosIniciais}>Salvar e concluir</Button>
        ) : isOrcamento && osId ? (
          <Button onClick={salvarOrcamentoCompleto}>Salvar orçamento</Button>
        ) : (
          <Button onClick={salvarDadosIniciais} disabled={!isOrcamento}>Salvar dados iniciais</Button>
        )}
      </div>
    </>
  );
}


