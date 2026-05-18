import db from '../db/index.js';

export function getEquipamento(id) {
  return db
    .prepare(
      `SELECT e.*, c.nome as cliente_nome
       FROM EQUIPAMENTO e
       LEFT JOIN CLIENTE c ON c.id_cliente = e.id_cliente
       WHERE e.id_equipamento = ? AND e.ativo = 1`
    )
    .get(id);
}

export function listEquipamentos({ tipo, clienteId } = {}) {
  let sql = `SELECT e.*, c.nome as cliente_nome
    FROM EQUIPAMENTO e
    LEFT JOIN CLIENTE c ON c.id_cliente = e.id_cliente
    WHERE e.ativo = 1`;
  const params = [];
  if (tipo) {
    sql += ' AND e.tipo = ?';
    params.push(tipo);
  }
  if (clienteId) {
    sql += ' AND e.id_cliente = ?';
    params.push(clienteId);
  }
  sql += ' ORDER BY e.marca, e.modelo';
  return db.prepare(sql).all(...params);
}

export function validarEquipamentoParaOs(equipamento, idClienteInformado) {
  if (!equipamento) {
    throw new Error('Equipamento não encontrado');
  }
  if (equipamento.tipo === 'cliente') {
    if (!equipamento.id_cliente) {
      throw new Error('Equipamento de cliente sem vínculo de cliente');
    }
    if (idClienteInformado && Number(idClienteInformado) !== equipamento.id_cliente) {
      throw new Error('O cliente da OS deve ser o proprietário do equipamento');
    }
    return equipamento.id_cliente;
  }
  return idClienteInformado;
}

export function snapshotEquipamentoNaOs(equipamento) {
  return {
    equipamento_marca: equipamento.marca,
    equipamento_modelo: equipamento.modelo,
    patrimonio: equipamento.patrimonio,
    estado_conservacao: equipamento.estado_conservacao || null,
  };
}

export function getHistoricoOs(idEquipamento) {
  return db
    .prepare(
      `SELECT os.id_os, os.data_abertura, os.data_previsao_entrega, os.data_conclusao,
        os.status, os.defeito_reclamado, os.valor_total_final, os.prioridade,
        os.tecnico_responsavel, c.nome as cliente_nome
       FROM ORDEM_SERVICO os
       JOIN CLIENTE c ON c.id_cliente = os.id_cliente
       WHERE os.id_equipamento = ?
       ORDER BY os.data_abertura DESC, os.id_os DESC`
    )
    .all(idEquipamento);
}
