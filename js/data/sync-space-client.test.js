const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'sync-space-client.js'), 'utf8');
const space = { name: 'equipe', version: 1, publishedAt: '2026-10-25T00:00:00Z', expiresAt: '2026-10-29T00:00:00Z', data: { sections: [], tags: [] } };

function loadClient(fetch) {
  const window = {};
  vm.runInNewContext(source, { window, fetch, encodeURIComponent, Number });
  return window.BluSyncSpaceClient;
}

function reply(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('carregar o cliente não faz requisições e criar envia o formato da API', async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    calls.push({ url, options });
    return reply(201, space);
  });
  assert.equal(calls.length, 0);
  assert.equal((await client.create({ name: 'Equipe', password: 'senha segura 123', data: space.data })).version, 1);
  assert.equal(calls[0].url, '/api/sync');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { name: 'Equipe', password: 'senha segura 123', data: space.data });
});

test('acessar codifica o nome e publicar envia a versão esperada', async () => {
  const calls = [];
  const client = loadClient(async (url, options) => {
    calls.push({ url, options });
    return reply(200, space);
  });
  await client.access(' Espaço Equipe ');
  await client.publish({ name: 'equipe', password: 'senha segura 123', expectedVersion: 1, data: space.data });
  assert.equal(calls[0].url, '/api/sync/Espa%C3%A7o%20Equipe');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[1].options.method, 'PATCH');
  assert.equal(JSON.parse(calls[1].options.body).expectedVersion, 1);
});

test('erros conhecidos mantêm código e versão para a futura interface', async () => {
  const client = loadClient(async () => reply(409, { error: 'version_conflict', version: 3 }));
  await assert.rejects(client.publish({ name: 'equipe', password: 'senha segura 123', expectedVersion: 1, data: space.data }), error => {
    assert.equal(error.code, 'version_conflict');
    assert.equal(error.status, 409);
    assert.equal(error.version, 3);
    assert.match(error.message, /Busque a versão atual/);
    return true;
  });
});

test('falha de rede e resposta inválida não parecem sucesso', async () => {
  const offline = loadClient(async () => { throw new Error('offline'); });
  await assert.rejects(offline.access('equipe'), { code: 'network_error' });
  const invalid = loadClient(async () => reply(200, { ok: true }));
  await assert.rejects(invalid.access('equipe'), { code: 'invalid_response' });
});

test('senha incorreta tem mensagem diferente da senha curta', async () => {
  const client = loadClient(async () => reply(403, { error: 'invalid_password' }));
  await assert.rejects(client.publish({ name: 'equipe', password: 'errada', expectedVersion: 1, data: space.data }), error => {
    assert.equal(error.code, 'incorrect_password');
    assert.match(error.message, /incorreta/);
    return true;
  });
});

test('nome ocupado, expiração e limite de tentativas têm mensagens próprias', async () => {
  for (const [status, code, fragment] of [
    [409, 'name_unavailable', 'já está em uso'],
    [404, 'not_found', 'expirou'],
    [429, 'rate_limited', 'Muitas tentativas']
  ]) {
    const client = loadClient(async () => reply(status, { error: code }));
    await assert.rejects(client.access('equipe'), error => {
      assert.equal(error.code, code);
      assert.ok(error.message.includes(fragment));
      return true;
    });
  }
});
