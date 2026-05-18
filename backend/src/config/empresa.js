import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/empresa.json');

/** Dados oficiais do cartão CNPJ (padrão) */
export const EMPRESA_PADRAO = {
  razao_social: 'JABOQUE LOCACOES LTDA',
  nome_fantasia: 'JABOQUE LOCACOES',
  cnpj: '44.636.855/0001-89',
  data_abertura: '20/12/2021',
  natureza_juridica: 'Sociedade Empresária Limitada',
  porte: 'ME',
  logradouro: 'Q QUADRA 5B',
  numero: 'S/N',
  complemento: 'LOTE 07 GLEBA F RUA ALEMANHA',
  bairro: 'PARQUE ESPLANADA III',
  municipio: 'VALPARAISO DE GOIAS',
  uf: 'GO',
  cep: '72876-373',
  email: 'jaboquelocacoes@hotmail.com',
  telefone: '(61) 8217-0787',
  telefone_suporte: '(61) 99339-9171',
  slogan: 'Soluções pra você e sua empresa',
  site: '',
  inscricao_estadual: '',
  atividade_principal:
    'Locação de outras máquinas e equipamentos comerciais e industriais não especificados anteriormente, sem operador',
  observacoes_cobranca:
    'Documento emitido para fins de cobrança de serviços de manutenção. O pagamento deve ser efetuado conforme condições acordadas com a oficina.',
};

export function getDadosEmpresa() {
  try {
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...EMPRESA_PADRAO, ...saved };
    }
  } catch {
    /* usa padrão */
  }
  return { ...EMPRESA_PADRAO };
}

export function saveDadosEmpresa(dados) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ ...EMPRESA_PADRAO, ...dados }, null, 2), 'utf8');
}

export function formatarCnpj(cnpj) {
  const n = String(cnpj || '').replace(/\D/g, '');
  if (n.length !== 14) return cnpj || '—';
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatarCep(cep) {
  const n = String(cep || '').replace(/\D/g, '');
  if (n.length !== 8) return cep || '—';
  return n.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

export function enderecoCompleto(empresa) {
  const e = empresa || EMPRESA_PADRAO;
  const partes = [
    [e.logradouro, e.numero].filter(Boolean).join(', '),
    e.complemento,
    e.bairro,
    [e.municipio, e.uf].filter(Boolean).join(' - '),
    e.cep ? `CEP ${formatarCep(e.cep)}` : null,
  ].filter(Boolean);
  return partes.join(' — ') || '—';
}
