const { getDb } = require('../lib/db');
const { containsBlacklisted, getClientIp } = require('../lib/utils');

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MIN_GAP_MS = 8000;

async function getRateLimitConfig(db) {
  const r = await db.execute("SELECT key, value FROM settings WHERE key IN ('rate_limit_max','rate_limit_window_minutes','min_gap_seconds')");
  const cfg = {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
    minGapMs: MIN_GAP_MS
  };
  for (const row of r.rows) {
    if (row.key === 'rate_limit_max') cfg.max = parseInt(row.value, 10) || RATE_LIMIT_MAX;
    if (row.key === 'rate_limit_window_minutes') cfg.windowMs = (parseInt(row.value, 10) || 60) * 60 * 1000;
    if (row.key === 'min_gap_seconds') cfg.minGapMs = (parseInt(row.value, 10) || 8) * 1000;
  }
  return cfg;
}

async function checkRateLimit(db, ip) {
  const cfg = await getRateLimitConfig(db);
  const now = Date.now();

  const r = await db.execute({ sql: 'SELECT * FROM rate_limits WHERE ip = ?', args: [ip] });
  let entry = r.rows[0];

  if (!entry || (now - entry.window_start) > cfg.windowMs) {
    entry = { ip, window_start: now, count: 0, last_submit: 0 };
  }

  if (entry.last_submit && (now - entry.last_submit) < cfg.minGapMs) {
    return { allowed: false, reason: 'fast' };
  }
  if (entry.count >= cfg.max) {
    return { allowed: false, reason: 'limit' };
  }

  entry.count += 1;
  entry.last_submit = now;

  await db.execute({
    sql: `INSERT INTO rate_limits (ip, window_start, count, last_submit) VALUES (?, ?, ?, ?)
          ON CONFLICT(ip) DO UPDATE SET window_start=excluded.window_start, count=excluded.count, last_submit=excluded.last_submit`,
    args: [ip, entry.window_start, entry.count, entry.last_submit]
  });

  return { allowed: true };
}

module.exports = async (req, res) => {
  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT state, count FROM vote_counts');
    const counts = {};
    let total = 0;
    for (const row of result.rows) {
      counts[row.state] = row.count;
      total += row.count;
    }
    res.status(200).json({ counts, total });
    return;
  }

  if (req.method === 'POST') {
    const { state, volunteer, note } = req.body || {};

    if (!state || typeof state !== 'string') {
      res.status(400).json({ error: 'Estado inválido.' });
      return;
    }
    if (!volunteer || typeof volunteer !== 'string' || !volunteer.trim()) {
      res.status(400).json({ error: 'Informe seu nome antes de enviar.' });
      return;
    }
    if (volunteer.length > 40 || (note && note.length > 60)) {
      res.status(400).json({ error: 'Texto excede o limite de caracteres.' });
      return;
    }
    if (containsBlacklisted(volunteer) || containsBlacklisted(note)) {
      res.status(400).json({ error: 'O texto contém uma palavra não permitida.' });
      return;
    }

    const ip = getClientIp(req);
    const rl = await checkRateLimit(db, ip);
    if (!rl.allowed) {
      const msg = rl.reason === 'fast'
        ? 'Muito rápido. Aguarde alguns segundos e tente de novo.'
        : 'Limite de envios atingido para este acesso. Tente novamente mais tarde.';
      res.status(429).json({ error: msg });
      return;
    }

    await db.execute({
      sql: `INSERT INTO vote_counts (state, count) VALUES (?, 1)
            ON CONFLICT(state) DO UPDATE SET count = count + 1`,
      args: [state]
    });

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
