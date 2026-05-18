import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { osApi, pecasApi, formatCurrency } from '../api/client';
import { Modal, Input, Select, Button } from './ui';

const CONSERVACAO = ['Nova', 'Semi-nova', 'Usada', 'Muito usada'];

export default function StatusChangeModal({ open, onClose, os, onSuccess }) {
  const [novoStatus, setNovoStatus] = useState('');
  const [dataStatus, setDataStatus] = useState(new Date().toISOString().slice(0, 10));
  const [tecnico, setTecnico] = useState('');
  const [maoDeObra, setMaoDeObra] = useState(0);
  const [pecas, setPecas] = useState([]);
  const [novoItem, setNovoItem] = useState({ id_peca: '', quantidade: 1, local_aplicado: '' });
  const [itensLocais, setItensLocais] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && os) {
      setNovoStatus('');
      setTecnico(os.tecnico_responsavel || '');
      setMaoDeObra(os.valor_mao_de_obra || 0);
      setItensLocais([]);
      pecasApi.list().then((r) => setPecas(r.data));
    }
  }, [open, os]);

  const precisaTecnico = novoStatus === 'Em Andamento';
  const precisaPecasMaoObra = novoStatus === 'Aguardando Peças' || novoStatus === 'Concluída';

  const addItemLocal = () => {
    if (!novoItem.id_peca) return;
    const peca = pecas.find((p) => p.id_peca === Number(novoItem.id_peca));
    setItensLocais([
      ...itensLocais,
      {
        ...novoItem,
        id_peca: Number(novoItem.id_peca),
        quantidade: Number(novoItem.quantidade),
        peca_nome: peca?.nome,
      },
    ]);
    setNovoItem({ id_peca: '', quantidade: 1, local_aplicado: '' });
  };

  const confirmar = async () => {
    if (!novoStatus) {
      toast.error('Selecione o novo status');
      return;
    }
    setLoading(true);
    try {
      if (precisaPecasMaoObra) {
        for (const item of itensLocais) {
          await osApi.addItem(os.id_os, item);
        }
        const existentes = os.itens?.length || 0;
        if (itensLocais.length === 0 && existentes === 0) {
          toast.error('Adicione ao menos uma peça');
          setLoading(false);
          return;
        }
      }
      await osApi.status(os.id_os, {
        status: novoStatus,
        data_status_alteracao: dataStatus,
        tecnico_responsavel: precisaTecnico ? tecnico : undefined,
        valor_mao_de_obra: precisaPecasMaoObra ? Number(maoDeObra) : undefined,
      });
      toast.success('Status atualizado');
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao alterar status');
    } finally {
      setLoading(false);
    }
  };

  if (!os) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Alterar status — OS #${os.id_os}`} wide>
      <p className="text-sm text-gray-500 mb-4">Status atual: <strong>{os.status}</strong></p>
      <Select label="Novo status *" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
        <option value="">Selecione</option>
        <option>Orçamento</option>
        <option>Aberta</option>
        <option>Em Andamento</option>
        <option>Aguardando Peças</option>
        <option>Concluída</option>
      </Select>
      <Input label="Data da alteração" type="date" className="mt-3" value={dataStatus} onChange={(e) => setDataStatus(e.target.value)} />

      {precisaTecnico && (
        <Input label="Técnico responsável *" className="mt-3" value={tecnico} onChange={(e) => setTecnico(e.target.value)} />
      )}

      {precisaPecasMaoObra && (
        <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-jaboque-navy">Peças utilizadas</h4>
          {os.itens?.length > 0 && (
            <ul className="text-sm text-gray-600 mb-2">
              {os.itens.map((i) => (
                <li key={i.id_item_os}>• {i.peca_nome} x{i.quantidade}</li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Select label="Peça" value={novoItem.id_peca} onChange={(e) => setNovoItem({ ...novoItem, id_peca: e.target.value })}>
              <option value="">Selecione</option>
              {pecas.map((p) => (
                <option key={p.id_peca} value={p.id_peca}>{p.nome} (est: {p.estoque_atual})</option>
              ))}
            </Select>
            <Input label="Qtd" type="number" value={novoItem.quantidade} onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })} />
            <Input label="Local" value={novoItem.local_aplicado} onChange={(e) => setNovoItem({ ...novoItem, local_aplicado: e.target.value })} />
          </div>
          <Button variant="secondary" onClick={addItemLocal}>Adicionar peça à lista</Button>
          {itensLocais.length > 0 && (
            <ul className="text-sm space-y-1">
              {itensLocais.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{i.peca_nome} x{i.quantidade}</span>
                  <button type="button" className="text-red-500 text-xs" onClick={() => setItensLocais(itensLocais.filter((_, j) => j !== idx))}>remover</button>
                </li>
              ))}
            </ul>
          )}
          <Input label="Mão de obra (R$) *" type="number" value={maoDeObra} onChange={(e) => setMaoDeObra(e.target.value)} />
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} disabled={loading}>{loading ? 'Salvando...' : 'Confirmar'}</Button>
      </div>
    </Modal>
  );
}

export { CONSERVACAO };
