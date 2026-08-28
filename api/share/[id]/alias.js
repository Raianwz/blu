const { Redis } = require('@upstash/redis');
const { Ratelimit } = require('@upstash/ratelimit');
const crypto = require('crypto');

const redis = Redis.fromEnv({ automaticDeserialization: false });

const aliasRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  prefix: 'blu:ratelimit:share:alias'
});

const ALIAS_PATTERN = /^(?=.*[A-Z])(?=.*\d)[A-Za-z][A-Za-z0-9_-]{5,31}$/;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function isValidClientId(value) {
  return typeof value === 'string' && /^[a-f0-9]{48}$/.test(value);
}

function hashClientId(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashesMatch(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

module.exports = async (req, res) => {
  if (!['POST', 'DELETE'].includes(req.method)) {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let rateLimitResult;
  try {
    rateLimitResult = await aliasRatelimit.limit(`ip:${getClientIp(req)}`);
  } catch (error) {
    console.error('Erro ao checar rate limit de alias:', error);
    res.status(500).json({ error: 'internal_error' });
    return;
  }

  if (!rateLimitResult.success) {
    res.status(429).json({ error: 'rate_limited', message: 'Muitas tentativas recentes. Tente novamente mais tarde.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const clientId = body?.clientId;
  if (!id || !isValidClientId(clientId)) {
    res.status(400).json({ error: 'invalid_request', message: 'Não foi possível validar esta solicitação.' });
    return;
  }

  try {
    const [ownerHash, ttl] = await Promise.all([
      redis.get(`blu:share-owner:${id}`),
      redis.ttl(`blu:share:${id}`)
    ]);

    if (!ownerHash || ttl <= 0) {
      res.status(404).json({ error: 'not_found', message: 'Este compartilhamento não existe ou expirou.' });
      return;
    }

    if (!hashesMatch(String(ownerHash), hashClientId(clientId))) {
      res.status(403).json({ error: 'forbidden', message: 'Não foi possível personalizar este link neste navegador.' });
      return;
    }

    const currentAlias = await redis.get(`blu:share-current-alias:${id}`);

    if (req.method === 'DELETE') {
      if (currentAlias) await redis.del(`blu:share-alias:${currentAlias}`);
      await redis.del(`blu:share-current-alias:${id}`);
      res.status(200).json({ removed: true });
      return;
    }

    const alias = typeof body?.alias === 'string' ? body.alias.trim() : '';
    if (!ALIAS_PATTERN.test(alias)) {
      res.status(400).json({
        error: 'invalid_alias',
        message: 'Use de 6 a 32 caracteres, começando por uma letra e incluindo uma maiúscula e um número.'
      });
      return;
    }

    const normalizedAlias = alias.toLowerCase();
    if (String(currentAlias || '') !== normalizedAlias) {
      const reserved = await redis.set(`blu:share-alias:${normalizedAlias}`, id, { nx: true, ex: ttl });
      if (!reserved) {
        res.status(409).json({ error: 'alias_unavailable', message: 'Este nome não está disponível no momento. Tente outro.' });
        return;
      }

      if (currentAlias) await redis.del(`blu:share-alias:${currentAlias}`);
      await redis.set(`blu:share-current-alias:${id}`, normalizedAlias, { ex: ttl });
    }

    res.status(200).json({ alias, expiresInSeconds: ttl });
  } catch (error) {
    console.error('Erro ao personalizar link:', error);
    res.status(500).json({ error: 'internal_error', message: 'Não foi possível personalizar o link.' });
  }
};
