export function runMigrations(db) {
  const columns = [
    { table: 'ORDEM_SERVICO', name: 'equipamento_marca', type: 'TEXT' },
    { table: 'ORDEM_SERVICO', name: 'equipamento_modelo', type: 'TEXT' },
    { table: 'ORDEM_SERVICO', name: 'estado_conservacao', type: 'TEXT' },
    { table: 'ORDEM_SERVICO', name: 'defeito_reclamado', type: 'TEXT' },
    { table: 'ORDEM_SERVICO', name: 'foto_equipamento', type: 'TEXT' },
    { table: 'ORDEM_SERVICO', name: 'patrimonio', type: 'TEXT' },
    { table: 'ORDEM_SERVICO', name: 'data_status_alteracao', type: 'TEXT' },
    { table: 'ORDEM_SERVICO', name: 'id_equipamento', type: 'INTEGER REFERENCES EQUIPAMENTO(id_equipamento)' },
  ];

  function columnExists(table, column) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some((c) => c.name === column);
  }

  for (const { table, name, type } of columns) {
    if (!columnExists(table, name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS MINHA_MAQUINA (
      id_minha_maquina INTEGER PRIMARY KEY AUTOINCREMENT,
      marca TEXT NOT NULL,
      modelo TEXT,
      valor REAL DEFAULT 0,
      data_compra TEXT,
      patrimonio TEXT,
      acessorios TEXT,
      status_acompanhamento TEXT DEFAULT 'Ativo',
      data_cadastro TEXT DEFAULT (date('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS EQUIPAMENTO (
      id_equipamento INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK (tipo IN ('empresa', 'cliente')),
      id_cliente INTEGER,
      marca TEXT NOT NULL,
      modelo TEXT,
      patrimonio TEXT,
      acessorios TEXT,
      valor REAL DEFAULT 0,
      data_compra TEXT,
      status_acompanhamento TEXT DEFAULT 'Ativo',
      tipo_equipamento TEXT,
      numero_serie TEXT,
      motorizacao TEXT,
      ano_fabricacao INTEGER,
      estado_conservacao TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      data_cadastro TEXT DEFAULT (date('now')),
      FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente)
    )
  `);

  migrateMinhasMaquinasParaEquipamento(db);
  backfillOsEquipamento(db);

  try {
    db.prepare(`UPDATE ORDEM_SERVICO SET status = 'Orçamento' WHERE status = 'rascunho'`).run();
  } catch {
    /* ignore */
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS DEMANDA (
      id_demanda INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      setor TEXT DEFAULT 'Oficina',
      status TEXT NOT NULL DEFAULT 'pendente',
      prioridade TEXT DEFAULT 'media',
      id_usuario INTEGER,
      data_referencia TEXT DEFAULT (date('now')),
      data_limite TEXT,
      observacoes TEXT,
      data_criacao TEXT DEFAULT (datetime('now')),
      data_finalizacao TEXT,
      FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
    );

    CREATE TABLE IF NOT EXISTS ATIVIDADE_DIA (
      id_atividade INTEGER PRIMARY KEY AUTOINCREMENT,
      data_referencia TEXT DEFAULT (date('now')),
      horario TEXT NOT NULL,
      id_usuario INTEGER,
      nome_usuario TEXT,
      tipo TEXT NOT NULL,
      referencia TEXT,
      observacoes TEXT,
      id_os INTEGER,
      id_demanda INTEGER,
      FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario),
      FOREIGN KEY (id_os) REFERENCES ORDEM_SERVICO(id_os),
      FOREIGN KEY (id_demanda) REFERENCES DEMANDA(id_demanda)
    );
  `);
}

function migrateMinhasMaquinasParaEquipamento(db) {
  const frota = db.prepare('SELECT * FROM MINHA_MAQUINA').all();
  for (const m of frota) {
    const exists = db
      .prepare(
        `SELECT id_equipamento FROM EQUIPAMENTO
         WHERE tipo = 'empresa' AND patrimonio = ? AND marca = ? LIMIT 1`
      )
      .get(m.patrimonio, m.marca);
    if (exists) continue;

    db.prepare(
      `INSERT INTO EQUIPAMENTO (
        tipo, marca, modelo, patrimonio, acessorios, valor, data_compra, status_acompanhamento, data_cadastro
      ) VALUES ('empresa', ?, ?, ?, ?, ?, ?, ?, COALESCE(?, date('now')))`
    ).run(
      m.marca,
      m.modelo,
      m.patrimonio,
      m.acessorios,
      m.valor ?? 0,
      m.data_compra,
      m.status_acompanhamento ?? 'Ativo',
      m.data_cadastro
    );
  }
}

function backfillOsEquipamento(db) {
  const ordens = db
    .prepare(
      `SELECT id_os, id_cliente, equipamento_marca, equipamento_modelo, patrimonio, estado_conservacao
       FROM ORDEM_SERVICO WHERE id_equipamento IS NULL`
    )
    .all();

  for (const os of ordens) {
    if (!os.equipamento_marca) continue;

    let eq = null;
    if (os.patrimonio) {
      eq = db
        .prepare(
          `SELECT id_equipamento FROM EQUIPAMENTO
           WHERE patrimonio = ? AND marca = ? AND ativo = 1 LIMIT 1`
        )
        .get(os.patrimonio, os.equipamento_marca);
    }

    if (!eq) {
      const patrimonio = os.patrimonio || `OS-${os.id_os}`;
      const info = db
        .prepare(
          `INSERT INTO EQUIPAMENTO (
            tipo, id_cliente, marca, modelo, patrimonio, estado_conservacao
          ) VALUES ('cliente', ?, ?, ?, ?, ?)`
        )
        .run(os.id_cliente, os.equipamento_marca, os.equipamento_modelo, patrimonio, os.estado_conservacao);
      eq = { id_equipamento: info.lastInsertRowid };
    }

    db.prepare('UPDATE ORDEM_SERVICO SET id_equipamento = ? WHERE id_os = ?').run(
      eq.id_equipamento,
      os.id_os
    );
  }
}
