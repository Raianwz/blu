const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const records = new Map();
const redis = {
  async set(key, value, options) {
    if (options.nx && records.has(key)) return null;
    records.set(key, value);
    return 'OK';
  },
  async get(key) { return records.get(key) ?? null; },
  async eval(_script, [key], [previous, next]) {
    if (records.get(key) !== previous) return 0;
    records.set(key, next);
    return 1;
  }
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@upstash/redis') return { Redis: { fromEnv: () => redis } };
  if (request === '@upstash/ratelimit') return {
    Ratelimit: class {
      static slidingWindow() { return {}; }
      async limit() { return { success: true }; }
    }
  };
  return originalLoad.call(this, request, parent, isMain);
};
const create = require('../api/sync');
const access = require('../api/sync/[name]');
Module._load = originalLoad;

function response() {
  return {
    code: null, body: null,
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

const data = { tags: [], sections: [{ id: 's1', name: 'Seção', buttons: [] }] };
const request = (method, body, name) => ({ method, body, query: { name }, headers: {}, socket: { remoteAddress: '127.0.0.1' } });

test('criação reserva nomes equivalentes e leitura não revela a senha', async () => {
  const first = response();
  await create(request('POST', { name: 'Espaço Equipe', password: 'senha segura 123', data }), first);
  assert.equal(first.code, 201);
  assert.equal(first.body.name, 'espaco-equipe');
  const collision = response();
  await create(request('POST', { name: 'ESPACO EQUIPE', password: 'outra senha 123', data }), collision);
  assert.equal(collision.code, 409);
  const read = response();
  await access(request('GET', null, 'espaco-equipe'), read);
  assert.equal(read.code, 200);
  assert.equal(read.body.version, 1);
  assert.equal('credential' in read.body, false);
});

test('publicação exige senha e versão esperada e avança a versão', async () => {
  const badPassword = response();
  await access(request('PATCH', { password: 'senha incorreta', expectedVersion: 1, data }, 'espaco-equipe'), badPassword);
  assert.equal(badPassword.code, 403);
  const published = response();
  await access(request('PATCH', { password: 'senha segura 123', expectedVersion: 1, data }, 'espaco-equipe'), published);
  assert.equal(published.code, 200);
  assert.equal(published.body.version, 2);
  const stale = response();
  await access(request('PATCH', { password: 'senha segura 123', expectedVersion: 1, data }, 'espaco-equipe'), stale);
  assert.equal(stale.code, 409);
});
