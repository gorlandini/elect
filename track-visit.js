const { getDb } = require('../lib/db');

// Incrementa o contador de visitas, guardado como mais uma linha
// na tabela "settings" já existente (chave "visit_count").
// Não cria tabela nova e não toca em vote_counts.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const db = getDb();

  try {
    await db.execute(
      `INSERT INTO settings (key, value) VALUES ('visit_count', '1')
       ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1`
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar visita: ' + err.message });
  }
};
