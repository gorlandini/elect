// Rode este script UMA VEZ, localmente, depois de configurar o .env
// (veja README.md). Comando: node scripts/seed.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

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

const INITIAL_VOTES = {
  "AC": 20, "AL": 16, "AP": 21, "AM": 25, "BA": 15, "CE": 16, "DF": 28,
  "ES": 22, "GO": 16, "MA": 20, "MT": 24, "MS": 15, "MG": 22, "PA": 18,
  "PB": 15, "PR": 16, "PE": 21, "PI": 21, "RJ": 15, "RN": 18, "RS": 15,
  "RO": 22, "RR": 21, "SC": 14, "SP": 28, "SE": 23, "TO": 16
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

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no arquivo .env antes de rodar este script.');
    process.exit(1);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Criando tabelas...');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await db.execute(stmt);
  }

  console.log('Inserindo estados (contagem inicial: 523 votos no total)...');
  for (const uf of ESTADOS) {
    await db.execute({
      sql: 'INSERT INTO vote_counts (state, count) VALUES (?, ?) ON CONFLICT(state) DO NOTHING',
      args: [uf, INITIAL_VOTES[uf] || 0]
    });
  }

  console.log('Inserindo candidatos...');
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
  } else {
    console.log('Candidatos já existem, pulando.');
  }

  console.log('Inserindo configurações padrão...');
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    await db.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
      args: [key, DEFAULT_SETTINGS[key]]
    });
  }

  console.log('Pronto! Banco inicializado com sucesso.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
