import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOsCompleta } from './osService.js';
import {
  getDadosEmpresa,
  formatarCnpj,
  formatarCep,
  enderecoCompleto,
} from '../config/empresa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');
const logoPath = path.join(__dirname, '../../../frontend/public/logo-jaboque.png');

const COR = {
  navy: '#012169',
  navyTop: '#002b5c',
  orange: '#F58220',
  texto: '#333333',
  cinza: '#666666',
};

function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function linha(doc, label, valor, opts = {}) {
  const v = valor ?? '—';
  if (opts.destaque) {
    doc.fontSize(10).fillColor(COR.navy).text(`${label}: `, { continued: true });
    doc.fillColor(COR.texto).text(String(v));
  } else {
    doc.fontSize(9).fillColor(COR.texto).text(`${label}: ${v}`);
  }
}

function secao(doc, titulo) {
  const y = doc.y;
  if (y > 700) {
    doc.addPage();
  }
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor(COR.navy).text(titulo);
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor(COR.orange).lineWidth(1).stroke();
  doc.moveDown(0.35);
}

function tabelaCabecalho(doc, colunas) {
  const widths = [220, 55, 75, 85];
  let x = 50;
  doc.fontSize(8).fillColor(COR.navy);
  colunas.forEach((col, i) => {
    doc.text(col, x, doc.y, { width: widths[i], continued: false });
    x += widths[i];
  });
  doc.moveDown(0.35);
  doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.25);
}

function cabecalhoEmpresa(doc, empresa, numero, tipoDocumento) {
  const top = 40;
  doc.rect(50, top, 495, 95).fill(COR.navyTop);
  doc.rect(50, top + 95, 495, 4).fill(COR.orange);

  let textX = 58;
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 58, top + 8, { fit: [130, 78], align: 'left', valign: 'center' });
      textX = 200;
    } catch {
      /* ignora se logo falhar */
    }
  }

  doc.fillColor('#ffffff');
  doc.fontSize(11).text(empresa.nome_fantasia || 'JABOQUE LOCAÇÕES', textX, top + 12, { width: 340 });
  doc.fontSize(8).text(empresa.razao_social, textX, doc.y, { width: 340 });
  doc.fontSize(8).text(
    `CNPJ: ${formatarCnpj(empresa.cnpj)}  |  ${empresa.porte ? `Porte: ${empresa.porte}` : ''}`,
    textX,
    doc.y,
    { width: 340 }
  );
  doc.fontSize(7).text(enderecoCompleto(empresa), textX, doc.y, { width: 340 });
  doc.text(
    `Tel: ${empresa.telefone || '—'}  |  ${empresa.telefone_suporte ? `Suporte: ${empresa.telefone_suporte}` : ''}  |  ${empresa.email || ''}`,
    textX,
    doc.y,
    { width: 340 }
  );

  doc.y = top + 108;
  doc.fillColor(COR.orange).fontSize(15).text(tipoDocumento, 50, doc.y, { align: 'center', width: 495 });
  doc.fillColor(COR.texto).fontSize(11).text(`${numero}`, 50, doc.y + 2, { align: 'center', width: 495 });
  if (empresa.slogan) {
    doc.fontSize(8).fillColor(COR.cinza).text(empresa.slogan, 50, doc.y + 2, { align: 'center', width: 495 });
  }
  doc.moveDown(0.8);
}

function blocoPrestadorTomador(doc, empresa, dados, numero) {
  const y0 = doc.y;
  const colW = 235;

  doc.fontSize(9).fillColor(COR.navy).text('PRESTADOR DE SERVIÇOS', 50, y0, { width: colW });
  doc.fontSize(8).fillColor(COR.texto);
  let y = y0 + 14;
  const prestador = [
    ['Razão social', empresa.razao_social],
    ['Nome fantasia', empresa.nome_fantasia],
    ['CNPJ', formatarCnpj(empresa.cnpj)],
    ['Endereço', enderecoCompleto(empresa)],
    ['E-mail', empresa.email],
    ['Telefone', empresa.telefone],
  ];
  prestador.forEach(([l, v]) => {
    doc.text(`${l}: ${v || '—'}`, 50, y, { width: colW });
    y = doc.y + 2;
  });

  doc.fontSize(9).fillColor(COR.navy).text('DADOS DO DOCUMENTO', 310, y0, { width: colW });
  y = y0 + 14;
  const docInfo = [
    ['Nº da OS', numero],
    ['Emissão', new Date().toLocaleDateString('pt-BR')],
    ['Status', dados.status],
    ['Abertura', formatDate(dados.data_abertura)],
    ['Previsão entrega', formatDate(dados.data_previsao_entrega)],
    ['Conclusão', formatDate(dados.data_conclusao)],
    ['Prioridade', dados.prioridade || 'Normal'],
    ['Técnico', dados.tecnico_responsavel],
  ];
  docInfo.forEach(([l, v]) => {
    doc.fontSize(8).fillColor(COR.texto).text(`${l}: ${v || '—'}`, 310, y, { width: colW });
    y = doc.y + 2;
  });

  doc.y = Math.max(doc.y, y) + 8;
  doc.strokeColor('#eeeeee').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}

export async function gerarPdfOs(idOs, tipoDocumento = 'Relatório de Cobrança', idUsuario = null) {
  const dados = getOsCompleta(idOs);
  if (!dados) throw new Error('OS não encontrada');

  const empresa = getDadosEmpresa();

  fs.mkdirSync(uploadsDir, { recursive: true });
  const numero = `OS-${String(idOs).padStart(5, '0')}`;
  const filename = `${numero}-cobranca-${Date.now()}.pdf`;
  const filepath = path.join(uploadsDir, filename);

  const eq = dados.equipamento;
  const subtotalServicos = dados.valor_total_servicos || 0;
  const subtotalPecas = dados.valor_total_pecas || 0;
  const maoDeObra = dados.valor_mao_de_obra || 0;
  let desconto = dados.valor_desconto_global || 0;
  if (dados.tipo_desconto_global === 'percentual' && desconto > 0) {
    const base = maoDeObra + subtotalServicos + subtotalPecas;
    desconto = (base * desconto) / 100;
  }
  const totalPago = (dados.pagamentos || [])
    .filter((p) => p.status_pagamento === 'confirmado')
    .reduce((s, p) => s + (p.valor_pago || 0), 0);
  const saldo = Math.max(0, (dados.valor_total_final || 0) - totalPago);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    cabecalhoEmpresa(doc, empresa, numero, tipoDocumento);
    blocoPrestadorTomador(doc, empresa, dados, numero);

    secao(doc, 'Tomador de serviços (cliente — cobrança)');
    linha(doc, 'Nome / Razão social', dados.cliente?.nome, { destaque: true });
    linha(doc, 'CPF/CNPJ', dados.cliente?.cpf_cnpj);
    linha(doc, 'Telefone', dados.cliente?.telefone);
    linha(doc, 'E-mail', dados.cliente?.email);
    linha(doc, 'Endereço', dados.cliente?.endereco);

    secao(doc, 'Equipamento em manutenção');
    linha(doc, 'Marca / Modelo', `${dados.equipamento_marca || eq?.marca || ''} ${dados.equipamento_modelo || eq?.modelo || ''}`.trim());
    linha(doc, 'Patrimônio', dados.patrimonio || eq?.patrimonio);
    linha(doc, 'Estado de conservação', dados.estado_conservacao || eq?.estado_conservacao);
    if (eq?.numero_serie) linha(doc, 'Nº série', eq.numero_serie);
    if (eq?.tipo_equipamento) linha(doc, 'Tipo de equipamento', eq.tipo_equipamento);
    linha(doc, 'Defeito reclamado', dados.defeito_reclamado);

    secao(doc, 'Diagnóstico e serviços executados');
    linha(doc, 'Técnico responsável', dados.tecnico_responsavel);
    linha(doc, 'Diagnóstico técnico', dados.diagnostico_tecnico);
    if (dados.servicos_executados_desc) {
      doc.fontSize(9).fillColor(COR.texto).text('Descrição dos serviços executados:', { width: 495 });
      doc.fontSize(8).text(dados.servicos_executados_desc, { width: 495 });
    }

    if (dados.servicos?.length) {
      secao(doc, 'Serviços prestados');
      tabelaCabecalho(doc, ['Descrição', 'Horas', 'Valor/h', 'Subtotal']);
      dados.servicos.forEach((s) => {
        const horas = s.quantidade_horas || 1;
        const sub = s.valor_praticado * horas;
        doc.fontSize(8).fillColor(COR.texto);
        doc.text(s.servico_nome || 'Serviço', 50, doc.y, { width: 220, continued: true });
        doc.text(String(horas), 270, doc.y, { width: 55, continued: true });
        doc.text(brl(s.valor_praticado), 325, doc.y, { width: 75, continued: true });
        doc.text(brl(sub), 400, doc.y, { width: 85 });
        doc.moveDown(0.15);
      });
      doc.fontSize(9).fillColor(COR.navy).text(`Subtotal serviços: ${brl(subtotalServicos)}`, { align: 'right' });
    }

    if (dados.itens?.length) {
      secao(doc, 'Peças e materiais utilizados');
      tabelaCabecalho(doc, ['Peça', 'Qtd', 'Unitário', 'Subtotal']);
      dados.itens.forEach((i) => {
        const sub = i.preco_unitario_aplicado * i.quantidade - (i.desconto_item || 0);
        doc.fontSize(8).fillColor(COR.texto);
        doc.text(i.peca_nome || 'Peça', 50, doc.y, { width: 220, continued: true });
        doc.text(String(i.quantidade), 270, doc.y, { width: 55, continued: true });
        doc.text(brl(i.preco_unitario_aplicado), 325, doc.y, { width: 75, continued: true });
        doc.text(brl(sub), 400, doc.y, { width: 85 });
        if (i.local_aplicado) {
          doc.fontSize(7).fillColor(COR.cinza).text(`  Aplicação: ${i.local_aplicado}`, 50);
        }
        doc.moveDown(0.12);
      });
      doc.fontSize(9).fillColor(COR.navy).text(`Subtotal peças: ${brl(subtotalPecas)}`, { align: 'right' });
    }

    secao(doc, 'Resumo financeiro para cobrança');
    doc.rect(50, doc.y, 495, 72).fill('#f8f9fc');
    const boxY = doc.y + 10;
    doc.fillColor(COR.texto).fontSize(9);
    doc.text(`Mão de obra: ${brl(maoDeObra)}`, 60, boxY);
    doc.text(`Serviços: ${brl(subtotalServicos)}`, 60, boxY + 14);
    doc.text(`Peças e materiais: ${brl(subtotalPecas)}`, 60, boxY + 28);
    if (desconto > 0) {
      doc.text(
        `Desconto${dados.tipo_desconto_global === 'percentual' ? ` (${dados.valor_desconto_global}%)` : ''}: -${brl(desconto)}`,
        60,
        boxY + 42
      );
    }
    doc.fontSize(13).fillColor(COR.navy).text(`TOTAL A COBRAR: ${brl(dados.valor_total_final)}`, 300, boxY + 18, {
      width: 230,
      align: 'right',
    });
    doc.y = boxY + 78;

    if (dados.pagamentos?.length) {
      secao(doc, 'Pagamentos registrados');
      dados.pagamentos.forEach((p) => {
        doc.fontSize(8).text(
          `${formatDate(p.data_pagamento)} — ${p.forma_pagamento}: ${brl(p.valor_pago)} (${p.status_pagamento})`
        );
      });
      doc.fontSize(9).fillColor(COR.navy).text(`Total pago: ${brl(totalPago)}  |  Saldo em aberto: ${brl(saldo)}`);
    } else if (saldo > 0) {
      doc.fontSize(9).fillColor(COR.navy).text(`Saldo em aberto: ${brl(saldo)}`);
    }

    if (dados.observacoes_cliente) {
      secao(doc, 'Observações ao cliente');
      doc.fontSize(8).fillColor(COR.texto).text(dados.observacoes_cliente, { width: 495 });
    }

    if (empresa.observacoes_cobranca) {
      doc.moveDown(0.5);
      secao(doc, 'Condições e observações');
      doc.fontSize(8).fillColor(COR.texto).text(empresa.observacoes_cobranca, { width: 495 });
    }

    doc.moveDown(1.2);
    doc.fontSize(8).fillColor(COR.cinza).text(
      `${empresa.razao_social} — CNPJ ${formatarCnpj(empresa.cnpj)}. ${empresa.atividade_principal || ''}.`,
      { width: 495, align: 'justify' }
    );

    doc.moveDown(1);
    doc.fontSize(9).fillColor(COR.texto);
    doc.text('Assinatura do cliente: _________________________________________    Data: ____/____/______');
    doc.moveDown(0.6);
    doc.text('Responsável técnico / Empresa: __________________________________    Data: ____/____/______');

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor(COR.cinza).text(
        `Página ${i + 1} de ${range.count} — Documento gerado em ${new Date().toLocaleString('pt-BR')}`,
        50,
        810,
        { align: 'center', width: 495 }
      );
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filename, filepath: `/uploads/${filename}`, numero };
}
