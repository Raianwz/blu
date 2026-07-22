const { Redis } = require('@upstash/redis');
const { Ratelimit } = require('@upstash/ratelimit');

const redis = Redis.fromEnv({ automaticDeserialization: false });

const readRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 h'), // 60 leituras/hora por IP
  prefix: 'blu:ratelimit:share:read'
});

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const ip = getClientIp(req);

  let rateLimitResult;
  try {
    rateLimitResult = await readRatelimit.limit(`ip:${ip}`);
  } catch (error) {
    console.error('Erro ao checar rate limit:', error);
    res.status(500).json({ error: 'internal_error' });
    return;
  }

  if (!rateLimitResult.success) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Muitas requisições. Tente novamente mais tarde.'
    });
    return;
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  try {
    const data = await redis.get(`blu:share:${id}`);

    if (data === null || data === undefined) {
      res.status(404).json({ error: 'not_found', message: 'Este link não existe ou expirou.' });
      return;
    }

    // Defesa extra: com automaticDeserialization desligado o valor já deve
    // vir como string, mas se algum dia vier como objeto (mudança de SDK,
    // etc.), normaliza aqui para nunca quebrar o JSON.parse do cliente.
    const normalizedData = typeof data === 'string' ? data : JSON.stringify(data);

    res.status(200).json({ data: normalizedData });
  } catch (error) {
    console.error('Erro ao buscar compartilhamento:', error);
    res.status(500).json({ error: 'internal_error' });
  }
};
