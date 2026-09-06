const { getDb } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const db = getDb();
  const state = req.query && req.query.state;

  let result;
  if (state) {
    result = await db.execute({ sql: 'SELECT state, name, number, party FROM candidates WHERE state = ? ORDER BY name', args: [state] });
  } else {
    result = await db.execute('SELECT state, name, number, party FROM candidates ORDER BY state, name');
  }

  const byState = {};
  for (const row of result.rows) {
    if (!byState[row.state]) byState[row.state] = [];
    byState[row.state].push({ name: row.name, number: row.number, party: row.party });
  }

  res.status(200).json(byState);
};
