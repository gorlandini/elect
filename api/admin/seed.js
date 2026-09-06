const { getDb } = require('../../lib/db');
const { isAdminAuthorized } = require('../../lib/utils');

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const INITIAL_VOTES = {
  "AC": 20, "AL": 16, "AP": 21, "AM": 25, "BA": 15, "CE": 16, "DF": 28,
  "ES": 22, "GO": 16, "MA": 20, "MT": 24, "MS": 15, "MG": 22, "PA": 18,
  "PB": 15, "PR": 16, "PE": 21, "PI": 21, "RJ": 15, "RN": 18, "RS": 15,
  "RO": 22, "RR": 21, "SC": 14, "SP": 28, "SE": 23, "TO": 16
};

const CANDIDATOS = {
  "AC": [{"name":"Márcio Bittar","number":222,"party":"PL"},{"name":"Mara Rocha","number":100,"party":"Republicanos"}],
  "AL": [{"name":"Marina JHC","number":456,"party":"PSDB"},{"name":"Arthur Lira","number":111,"party":"PP"}],
  "AP": [{"name":"Rayssa Furlan","number":200,"party":"Podemos"},{"name":"Lucas Barreto","number":555,"party":"PSD"}],
  "AM": [{"name":"Capitão Alberto Neto","number":222,"party":"PL"}],
  "BA": [{"name":"João Roma","number":222,"party":"PL"},{"name":"Angelo Coronel","number":100,"party":"Republicanos"}],
  "CE": [{"name":"Alcides Fernandes","number":222,"party":"PL"},{"name":"Capitão Wagner","number":445,"party":"União"}],
  "DF": [{"name":"Michelle Bolsonaro","number":222,"party":"PL"},{"name":"Bia Kicis","number":223,"party":"PL"}],
  "ES": [{"name":"Maguinha Malta","number":222,"party":"PL"},{"name":"Evair de Melo","number":100,"party":"Republicanos"}],
  "GO": [{"name":"Gustavo Gayer","number":222,"party":"PL"},{"name":"Oséias Varão","number":227,"party":"PL"}],
  "MA": [{"name":"Cidônio Gonçalves","number":222,"party":"PL"}],
  "MT": [{"name":"José Medeiros","number":222,"party":"PL"}],
  "MS": [{"name":"Reinaldo Azambuja","number":222,"party":"PL"},{"name":"Capitão Contar","number":221,"party":"PL"}],
  "MG": [{"name":"Domingos Sávio","number":222,"party":"PL"}],
  "PA": [{"name":"Delegado Éder Mauro","number":222,"party":"PL"},{"name":"Zequinha Marinho","number":200,"party":"Podemos"}],
  "PB": [{"name":"Marcelo Queiroga","number":222,"party":"PL"}],
  "PR": [{"name":"Deltan Dallagnol","number":300,"party":"Novo"},{"name":"Filipe Barros","number":222,"party":"PL"}],
  "PE": [{"name":"Mendonça Filho","number":222,"party":"PL"}],
  "PI": [{"name":"Tiago Junqueira","number":222,"party":"PL"}],
  "RJ": [{"name":"Carlos Portinho","number":222,"party":"PL"},{"name":"Carlos Jordy","number":221,"party":"PL"}],
  "RN": [{"name":"Styvenson Valentim","number":200,"party":"Podemos"},{"name":"Coronel Hélio Oliveira","number":222,"party":"PL"}],
  "RS": [{"name":"Sanderson","number":222,"party":"PL"},{"name":"Marcel van Hattem","number":300,"party":"Novo"}],
  "RO": [{"name":"Fernando Máximo","number":221,"party":"PL"},{"name":"Bruno Scheid","number":222,"party":"PL"}],
  "RR": [{"name":"Hélio Lopes","number":222,"party":"PL"},{"name":"Nicoletti","number":227,"party":"PL"}],
  "SC": [{"name":"Carlos Bolsonaro","number":222,"party":"PL"},{"name":"Caroline de Toni","number":221,"party":"PL"}],
  "SP": [{"name":"André do Prado","number":222,"party":"PL"},{"name":"Guilherme Derrite","number":111,"party":"PP"}],
  "SE": [{"name":"Rodrigo Valadares","number":222,"party":"PL"},{"name":"Coronel Rocha","number":270,"party":"PL"}],
  "TO": [{"name":"Eduardo Gomes","number":222,"party":"PL"},{"name":"Carlos Gaguim","number":444,"party":"União"}]
};

const DEFAULT_SETTINGS = {
  title: "Um voto pelo Senado",
  description: "Eleger Flávio Bolsonaro não basta — precisamos de um Senado forte o suficiente para levar adiante o impeachment de Alexandre de Moraes. O compromisso desta campanha é simples: cada pessoa aqui se compromete a conversar com um amigo ou familiar e conquistar um voto a mais para esse objetivo.",
  goal: "10000",
  progress_label: "Meta dos próximos 3 dias",
  first_round_date: "2026-10-04",
  second_round_date: "2026-10-25",
  rate_limit_max: "5",
  rate_limit_window_minutes: "60",
  min_gap_seconds: "8"
};

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS vote_counts (
    state TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT NOT NULL,
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    party TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL,
    last_submit INTEGER NOT NULL
  )`
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const db = getDb();
  const log = [];

  try {
    for (const stmt of SCHEMA_STATEMENTS) {
      await db.execute(stmt);
    }
    log.push('Tabelas criadas ou já existentes.');

    for (const uf of ESTADOS) {
      await db.execute({
        sql: 'INSERT INTO vote_counts (state, count) VALUES (?, ?) ON CONFLICT(state) DO NOTHING',
        args: [uf, INITIAL_VOTES[uf] || 0]
      });
    }
    log.push('Estados inseridos (ou já existiam).');

    const existing = await db.execute('SELECT COUNT(*) as c FROM candidates');
    if (existing.rows[0].c === 0) {
      for (const uf of Object.keys(CANDIDATOS)) {
        for (const c of CANDIDATOS[uf]) {
          await db.execute({
            sql: 'INSERT INTO candidates (state, name, number, party) VALUES (?, ?, ?, ?)',
            args: [uf, c.name, c.number, c.party]
          });
        }
      }
      log.push('Candidatos inseridos.');
    } else {
      log.push('Candidatos já existiam, não foram alterados.');
    }

    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
        args: [key, DEFAULT_SETTINGS[key]]
      });
    }
    log.push('Configurações padrão inseridas (ou já existiam).');

    res.status(200).json({ ok: true, log });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao inicializar banco: ' + err.message, log });
  }
};
