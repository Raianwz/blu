const { Redis } = require('@upstash/redis');
const { Ratelimit } = require('@upstash/ratelimit');
const {
  TTL_SECONDS, normalizeSpaceName, validateSpaceData, createPasswordHash, publicSpace, keyFor
} = require('../server/sync-space');

const redis = Redis.fromEnv({ automaticDeserialization: false });
const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'blu:ratelimit:sync:create' });

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const name = normalizeSpaceName(req.body?.name);
  const password = req.body?.password;
  const data = req.body?.data;
  if (!name) return res.status(400).json({ error: 'invalid_name', message: 'Use 3 a 40 letras, números ou hífens.' });
  if (typeof password !== 'string' || password.length < 12 || password.length > 256)
    return res.status(400).json({ error: 'invalid_password', message: 'Use uma senha de 12 a 256 caracteres.' });
  if (!validateSpaceData(data)) return res.status(400).json({ error: 'invalid_data', message: 'Dados inválidos ou muito grandes.' });

  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const limit = await limiter.limit(`ip:${ip}`);
    if (!limit.success) return res.status(429).json({ error: 'rate_limited' });

    const now = new Date();
    const record = {
      name, version: 1, publishedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TTL_SECONDS * 1000).toISOString(),
      credential: createPasswordHash(password), data
    };
    const created = await redis.set(keyFor(name), JSON.stringify(record), { nx: true, ex: TTL_SECONDS });
    if (created !== 'OK') return res.status(409).json({ error: 'name_unavailable', message: 'Este nome já está em uso.' });
    return res.status(201).json(publicSpace(record));
  } catch (error) {
    console.error('Erro ao criar espaço sincronizado:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
};
