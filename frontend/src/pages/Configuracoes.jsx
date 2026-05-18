import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PageHeader, Card, CardBody, Input, Textarea, Button, Loading } from '../components/ui';
import api from '../api/client';

export default function Configuracoes() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/empresa')
      .then((r) => setCfg(r.data))
      .catch(() => toast.error('Erro ao carregar dados da empresa'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/empresa', cfg);
      setCfg(data);
      toast.success('Dados da empresa salvos (usados no PDF de cobrança)');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setCfg((c) => ({ ...c, [field]: value }));

  if (loading || !cfg) return <Loading full />;

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Dados da empresa exibidos no relatório PDF de cobrança das OS"
      />
      <Card>
        <CardBody className="space-y-6">
          <div>
            <h3 className="font-semibold text-jaboque-navy mb-3">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Razão social" value={cfg.razao_social || ''} onChange={(e) => set('razao_social', e.target.value)} />
              <Input label="Nome fantasia" value={cfg.nome_fantasia || ''} onChange={(e) => set('nome_fantasia', e.target.value)} />
              <Input label="CNPJ" value={cfg.cnpj || ''} onChange={(e) => set('cnpj', e.target.value)} />
              <Input label="Data de abertura" value={cfg.data_abertura || ''} onChange={(e) => set('data_abertura', e.target.value)} />
              <Input label="Natureza jurídica" value={cfg.natureza_juridica || ''} onChange={(e) => set('natureza_juridica', e.target.value)} />
              <Input label="Porte" value={cfg.porte || ''} onChange={(e) => set('porte', e.target.value)} />
              <Input label="Inscrição estadual" value={cfg.inscricao_estadual || ''} onChange={(e) => set('inscricao_estadual', e.target.value)} />
              <Input label="Slogan" value={cfg.slogan || ''} onChange={(e) => set('slogan', e.target.value)} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-jaboque-navy mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Logradouro" value={cfg.logradouro || ''} onChange={(e) => set('logradouro', e.target.value)} />
              <Input label="Número" value={cfg.numero || ''} onChange={(e) => set('numero', e.target.value)} />
              <Input label="Complemento" className="md:col-span-2" value={cfg.complemento || ''} onChange={(e) => set('complemento', e.target.value)} />
              <Input label="Bairro" value={cfg.bairro || ''} onChange={(e) => set('bairro', e.target.value)} />
              <Input label="Município" value={cfg.municipio || ''} onChange={(e) => set('municipio', e.target.value)} />
              <Input label="UF" value={cfg.uf || ''} onChange={(e) => set('uf', e.target.value)} />
              <Input label="CEP" value={cfg.cep || ''} onChange={(e) => set('cep', e.target.value)} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-jaboque-navy mb-3">Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Telefone" value={cfg.telefone || ''} onChange={(e) => set('telefone', e.target.value)} />
              <Input label="Telefone suporte" value={cfg.telefone_suporte || ''} onChange={(e) => set('telefone_suporte', e.target.value)} />
              <Input label="E-mail" className="md:col-span-2" value={cfg.email || ''} onChange={(e) => set('email', e.target.value)} />
              <Input label="Site" className="md:col-span-2" value={cfg.site || ''} onChange={(e) => set('site', e.target.value)} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-jaboque-navy mb-3">PDF de cobrança</h3>
            <Textarea
              label="Atividade principal (rodapé legal)"
              value={cfg.atividade_principal || ''}
              onChange={(e) => set('atividade_principal', e.target.value)}
            />
            <Textarea
              label="Observações de cobrança"
              className="mt-3"
              value={cfg.observacoes_cobranca || ''}
              onChange={(e) => set('observacoes_cobranca', e.target.value)}
            />
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar dados da empresa'}
          </Button>
        </CardBody>
      </Card>
    </>
  );
}
