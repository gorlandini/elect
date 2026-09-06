const { getDb } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const db = getDb();
  const result = await db.execute("SELECT key, value FROM settings WHERE key IN ('title','description','goal')");

  const settings = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }

  res.status(200).json(settings);
};
