const crypto = require('crypto');

const TTL_SECONDS = 4 * 24 * 60 * 60;
const MAX_DATA_BYTES = 600 * 1024;
const KEY_PREFIX = 'blu:sync-space:';

function normalizeSpaceName(value) {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/\s+/g, '-');
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(name) && !name.includes('--') ? name : null;
}

function validateSpaceData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || !Array.isArray(data.sections) || !Array.isArray(data.tags)) return false;
  if (Object.keys(data).some(key => !['tags', 'sections', 'archived'].includes(key))) return false;
  if (data.sections.length > 1000 || data.tags.length > 1000) return false;
  if (!data.tags.every(tag => typeof tag === 'string')) return false;
  if (!data.sections.every(section => section && typeof section === 'object'
    && typeof section.id === 'string' && typeof section.name === 'string'
    && Array.isArray(section.buttons) && section.buttons.length <= 5000
    && section.buttons.every(button => button && typeof button === 'object'
      && typeof button.id === 'string' && typeof button.name === 'string'
      && typeof button.text === 'string' && typeof button.tag === 'string'
      && ['public', 'private', 'other'].includes(button.vis)))) return false;
  if (data.archived !== undefined && (!data.archived || typeof data.archived !== 'object'
    || !Array.isArray(data.archived.buttons) || !Array.isArray(data.archived.sections))) return false;
  try { return Buffer.byteLength(JSON.stringify(data), 'utf8') <= MAX_DATA_BYTES; }
  catch { return false; }
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 32).toString('hex') };
}

function verifyPassword(password, credential) {
  if (!credential || typeof credential.salt !== 'string' || typeof credential.hash !== 'string') return false;
  const actual = Buffer.from(credential.hash, 'hex');
  if (actual.length !== 32) return false;
  const expected = crypto.scryptSync(password, credential.salt, 32);
  return crypto.timingSafeEqual(actual, expected);
}

function publicSpace(record) {
  const { name, version, publishedAt, expiresAt, data } = record;
  return { name, version, publishedAt, expiresAt, data };
}

function keyFor(name) { return `${KEY_PREFIX}${name}`; }

module.exports = {
  TTL_SECONDS, normalizeSpaceName, validateSpaceData, createPasswordHash,
  verifyPassword, publicSpace, keyFor
};
