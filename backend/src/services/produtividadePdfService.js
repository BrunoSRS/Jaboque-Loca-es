import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDadosEmpresa, formatarCnpj } from '../config/empresa.js';
import { getDadosRelatorioPdf, LABEL_COLUNA, TIPOS_ATIVIDADE } from './produtividadeService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

const COR = { navy: '#012169', orange: '#F58220', texto: '#333333', cinza: '#666666' };

function brl(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatDateBr(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export async function gerarRelatorioProdutividadeDiario(dataRef) {
  const dados = getDadosRelatorioPdf(dataRef);
  const empresa = getDadosEmpresa();
  const filename = `relatorio-produtividade-${dataRef}.pdf`;
  const filepath = path.join(uploadsDir, filename);

  fs.mkdirSync(uploadsDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.rect(50, 40, 495, 70).fill(COR.navy);
    doc.rect(50, 110, 495, 3).fill(COR.orange);
    doc.fillColor('#ffffff').fontSize(16).text(empresa.nome_fantasia || empresa.razao_social, 58, 52);
    doc.fontSize(11).text('Relatório diário de produtividade', 58, 78);
    doc.fontSize(9).text(`Data: ${formatDateBr(dataRef)}  |  CNPJ: ${formatarCnpj(empresa.cnpj)}`, 58, 96);

    doc.fillColor(COR.texto).fontSize(10);
    doc.y = 125;
    doc.text(
      `OS finalizadas: ${dados.kpis.os_finalizadas}  |  Faturamento: ${brl(dados.kpis.faturamento_dia)}  |  Demandas concluídas: ${dados.kpis.demandas_concluidas}`
    );
    doc.text(
      `Equip. recebidos: ${dados.kpis.equip_recebidos}  |  Equip. entregues: ${dados.kpis.equip_entregues}`
    );

    doc.moveDown(0.8);
    doc.fillColor(COR.navy).fontSize(12).text('OS finalizadas no dia');
    doc.moveDown(0.3);
    if (!dados.os_finalizadas.length) {
      doc.fillColor(COR.cinza).fontSize(9).text('Nenhuma OS finalizada nesta data.');
    } else {
      dados.os_finalizadas.forEach((os) => {
        const eq = `${os.marca || ''} ${os.modelo || ''}`.trim();
        doc
          .fillColor(COR.texto)
          .fontSize(9)
          .text(
            `OS #${os.id_os} — ${os.tecnico_responsavel || '—'} — ${os.cliente_nome} — ${eq} — ${brl(os.valor_total_final)}`
          );
      });
    }

    doc.moveDown(0.8);
    doc.fillColor(COR.navy).fontSize(12).text('Demandas finalizadas');
    doc.moveDown(0.3);
    if (!dados.demandas_finalizadas.length) {
      doc.fillColor(COR.cinza).fontSize(9).text('Nenhuma demanda finalizada nesta data.');
    } else {
      dados.demandas_finalizadas.forEach((d) => {
        doc
          .fillColor(COR.texto)
          .fontSize(9)
          .text(
            `${d.titulo} — ${d.setor} — ${d.responsavel_nome || '—'} — ${LABEL_COLUNA[d.status] || d.status}${d.observacoes ? ` — ${d.observacoes}` : ''}`
          );
      });
    }

    doc.moveDown(0.8);
    doc.fillColor(COR.navy).fontSize(12).text('Ranking de técnicos');
    doc.moveDown(0.3);
    dados.ranking.forEach((r, i) => {
      doc
        .fillColor(COR.texto)
        .fontSize(9)
        .text(`${i + 1}. ${r.nome} — ${r.qtd_os} OS — ${brl(r.valor)}`);
    });

    doc.moveDown(0.8);
    doc.fillColor(COR.navy).fontSize(12).text('Atividades da recepção');
    doc.moveDown(0.3);
    const rec = dados.recepcao;
    doc
      .fillColor(COR.texto)
      .fontSize(9)
      .text(
        `Clientes atendidos: ${rec.clientes_atendidos}  |  OS abertas: ${rec.os_abertas}  |  Orçamentos: ${rec.orcamentos_enviados}  |  Recebidos: ${rec.equip_recebidos}  |  Entregues: ${rec.equip_entregues}`
      );

    doc.moveDown(0.8);
    doc.fillColor(COR.navy).fontSize(12).text('Registro de atividades');
    doc.moveDown(0.3);
    if (!dados.atividades.length) {
      doc.fillColor(COR.cinza).fontSize(9).text('Sem atividades registradas.');
    } else {
      dados.atividades.slice(0, 80).forEach((a) => {
        doc
          .fillColor(COR.texto)
          .fontSize(8)
          .text(
            `${a.horario} — ${a.nome_usuario || '—'} — ${TIPOS_ATIVIDADE[a.tipo] || a.tipo} — ${a.referencia || ''}${a.observacoes ? ` — ${a.observacoes}` : ''}`
          );
      });
    }

    doc.moveDown(1.5);
    doc.fillColor(COR.cinza).fontSize(8).text(
      `Documento gerado em ${new Date().toLocaleString('pt-BR')} — ${empresa.razao_social}`,
      { align: 'center', width: 495 }
    );

    doc.end();
    stream.on('finish', () => resolve({ filename, filepath: `/uploads/${filename}` }));
    stream.on('error', reject);
  });
}
