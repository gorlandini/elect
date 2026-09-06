const { getDb } = require('../../lib/db');
const { isAdminAuthorized } = require('../../lib/utils');

const EDITABLE_KEYS = ['title', 'description', 'goal', 'rate_limit_max', 'rate_limit_window_minutes', 'min_gap_seconds'];

module.exports = async (req, res) => {
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT key, value FROM settings');
    const settings = {};
    for (const row of result.rows) settings[row.key] = row.value;
    res.status(200).json(settings);
    return;
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    for (const key of EDITABLE_KEYS) {
      if (body[key] !== undefined) {
        await db.execute({
          sql: `INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          args: [key, String(body[key])]
        });
      }
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
