const { Redis } = require('@upstash/redis');
const { Ratelimit } = require('@upstash/ratelimit');
const {
  TTL_SECONDS, normalizeSpaceName, validateSpaceData, verifyPassword, publicSpace, keyFor
} = require('../../server/sync-space');

const redis = Redis.fromEnv({ automaticDeserialization: false });
const readLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 h'), prefix: 'blu:ratelimit:sync:read' });
const writeLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'blu:ratelimit:sync:publish' });
const PUBLISH_SCRIPT = `
  if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
  redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
  return 1
`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'PATCH') return res.status(405).json({ error: 'method_not_allowed' });
  const name = normalizeSpaceName(req.query.name);
  if (!name) return res.status(400).json({ error: 'invalid_name' });

  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const limit = await (req.method === 'GET' ? readLimiter : writeLimiter).limit(`ip:${ip}`);
    if (!limit.success) return res.status(429).json({ error: 'rate_limited' });

    const key = keyFor(name);
    const raw = await redis.get(key);
    if (raw === null || raw === undefined) return res.status(404).json({ error: 'not_found' });
    const record = JSON.parse(String(raw));
    if (req.method === 'GET') return res.status(200).json(publicSpace(record));

    const { password, data, expectedVersion } = req.body || {};
    if (typeof password !== 'string' || typeof expectedVersion !== 'number' || !validateSpaceData(data))
      return res.status(400).json({ error: 'invalid_body' });
    if (!verifyPassword(password, record.credential)) return res.status(403).json({ error: 'invalid_password' });
    if (expectedVersion !== record.version) return res.status(409).json({ error: 'version_conflict', version: record.version });

    const now = new Date();
    const next = {
      ...record, version: record.version + 1, publishedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TTL_SECONDS * 1000).toISOString(), data
    };
    const updated = await redis.eval(PUBLISH_SCRIPT, [key], [String(raw), JSON.stringify(next), String(TTL_SECONDS)]);
    if (Number(updated) !== 1) return res.status(409).json({ error: 'version_conflict' });
    return res.status(200).json(publicSpace(next));
  } catch (error) {
    console.error('Erro ao acessar espaço sincronizado:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
};
