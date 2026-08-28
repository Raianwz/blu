const { Redis } = require('@upstash/redis');
const { Ratelimit } = require('@upstash/ratelimit');
const crypto = require('crypto');

const redis = Redis.fromEnv({ automaticDeserialization: false });

// Reaproveitado entre invocações "quentes" do mesmo runtime — não precisa
// recriar a cada requisição.
const createRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'), // 30 compartilhamentos/hora por IP
  prefix: 'blu:ratelimit:share:create'
});

const TTL_SECONDS = 60 * 60 * 24 * 3; // 3 dias
const MAX_PAYLOAD_BYTES = 600 * 1024; // 600 KB
const ID_LENGTH = 10;
const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function isValidClientId(value) {
  return typeof value === 'string' && /^[a-f0-9]{48}$/.test(value);
}

function hashClientId(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateId(length = ID_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return id;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const ip = getClientIp(req);

  let rateLimitResult;
  try {
    rateLimitResult = await createRatelimit.limit(`ip:${ip}`);
  } catch (error) {
    console.error('Erro ao checar rate limit:', error);
    res.status(500).json({ error: 'internal_error' });
    return;
  }

  res.setHeader('X-RateLimit-Limit', String(rateLimitResult.limit));
  res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));

  if (!rateLimitResult.success) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Muitos compartilhamentos recentes. Tente novamente mais tarde.'
    });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const data = body?.data;
  if (!data || typeof data !== 'string') {
    res.status(400).json({ error: 'invalid_body', message: 'Campo "data" (string) é obrigatório.' });
    return;
  }

  if (Buffer.byteLength(data, 'utf8') > MAX_PAYLOAD_BYTES) {
    res.status(413).json({
      error: 'payload_too_large',
      message: `O conteúdo excede o limite de ${Math.round(MAX_PAYLOAD_BYTES / 1024)}KB.`
    });
    return;
  }

  const clientId = body?.clientId;
  if (clientId !== undefined && !isValidClientId(clientId)) {
    res.status(400).json({ error: 'invalid_client', message: 'Não foi possível identificar este navegador.' });
    return;
  }

  try {
    let id = generateId();
    let attempts = 0;

    // Colisão é extremamente improvável (62^10 combinações), mas o
    // check é barato o suficiente para valer a pena.
    while (attempts < 3 && (await redis.exists(`blu:share:${id}`))) {
      id = generateId();
      attempts++;
    }

    const writes = [redis.set(`blu:share:${id}`, data, { ex: TTL_SECONDS })];
    if (clientId) {
      writes.push(redis.set(`blu:share-owner:${id}`, hashClientId(clientId), { ex: TTL_SECONDS }));
    }
    await Promise.all(writes);

    res.status(201).json({ id, expiresInSeconds: TTL_SECONDS });
  } catch (error) {
    console.error('Erro ao salvar compartilhamento:', error);
    res.status(500).json({ error: 'internal_error', message: 'Não foi possível salvar o compartilhamento.' });
  }
};
