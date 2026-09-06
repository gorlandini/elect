const BLACKLIST = [
  "porra","caralho","merda","puta","putz","bosta","cacete","foda","fodase","foda-se",
  "desgraca","desgraça","cuzao","cuzão","viado","viadinho","corno","arrombado","arrombada",
  "escroto","escrota","babaca","idiota","imbecil","retardado","retardada","otario","otário",
  "vagabundo","vagabunda","vadia","piranha","puto","filho da puta","fdp","pqp","vsf","tnc",
  "safado","safada","canalha","desgracado","desgraçado"
];

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function containsBlacklisted(str) {
  const clean = normalize(str);
  return BLACKLIST.some(word => clean.includes(normalize(word)));
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

function isAdminAuthorized(req) {
  const secret = req.headers['x-admin-secret'];
  return !!process.env.ADMIN_PASSWORD && secret === process.env.ADMIN_PASSWORD;
}

module.exports = { containsBlacklisted, getClientIp, isAdminAuthorized };
