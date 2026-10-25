const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'sync-space-store.js'), 'utf8');
const snapshot = (name = 'equipe', version = 1) => ({
  name, version, publishedAt: '2026-10-25T10:00:00Z', expiresAt: '2026-10-29T10:00:00Z',
  data: { tags: ['grupo'], sections: [{ id: 's1', name: 'Seção', buttons: [
    { id: 'b1', name: 'Botão', text: 'Texto', tag: 'grupo', vis: 'other', customVis: { color: 'purple' } }
  ] }], archived: { buttons: [], sections: [] } }
});

function setup() {
  const values = new Map([['blu:data', '{"local":true}']]);
  const writes = [];
  const localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { writes.push(key); values.set(key, value); }
  };
  const window = {};
  vm.runInNewContext(source, { window, localStorage, structuredClone, Date, Number, Set, JSON });
  return { store: window.BluSyncSpaceStore, values, writes };
}

test('módulo é inativo até ser chamado e mantém blu:data intacto', () => {
  const { store, values, writes } = setup();
  assert.deepEqual(writes, []);
  const saved = store.save(snapshot());
  assert.equal(saved.name, 'equipe');
  assert.equal(values.get('blu:data'), '{"local":true}');
  assert.deepEqual(writes, ['blu:data-sync']);
  assert.equal(JSON.parse(values.get('blu:data-sync')).formatVersion, 1);
  assert.equal(store.get('equipe').data.sections[0].buttons[0].customVis.color, 'purple');
});

test('atualizar preserva só a versão mais nova e limita a um espaço', () => {
  const { store, values } = setup();
  store.save(snapshot());
  store.save(snapshot('equipe', 2));
  assert.equal(store.get('equipe').version, 2);
  assert.throws(() => store.save(snapshot('equipe', 1)), { code: 'older_version' });
  assert.throws(() => store.save(snapshot('outro', 1)), { code: 'space_limit' });
  assert.equal(JSON.parse(values.get('blu:data-sync')).spaces.length, 1);
});

test('dados locais inválidos impedem sobrescrita silenciosa', () => {
  const { store, values, writes } = setup();
  values.set('blu:data-sync', '{broken');
  assert.throws(() => store.list(), { code: 'invalid_storage' });
  assert.throws(() => store.save(snapshot()), { code: 'invalid_storage' });
  assert.deepEqual(writes, []);
  assert.equal(values.get('blu:data-sync'), '{broken');
});

test('remover apaga só a cópia recebida', () => {
  const { store, values } = setup();
  store.save(snapshot());
  assert.equal(store.remove('equipe'), true);
  assert.equal(store.get('equipe'), null);
  assert.equal(values.get('blu:data'), '{"local":true}');
});
