const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSpaceName, validateSpaceData, createPasswordHash, verifyPassword, publicSpace, keyFor
} = require('./sync-space');

const data = {
  tags: ['grupo'],
  sections: [{ id: 's1', name: 'Seção', buttons: [
    { id: 'b1', name: 'Botão', text: 'Texto', tag: 'grupo', vis: 'other', customVis: { color: 'purple' } }
  ] }],
  archived: { buttons: [], sections: [] }
};

test('nomes equivalentes apontam para a mesma chave e nomes inválidos são recusados', () => {
  assert.equal(normalizeSpaceName('  Espaço da Equipe  '), 'espaco-da-equipe');
  assert.equal(normalizeSpaceName('ESPACO DA EQUIPE'), 'espaco-da-equipe');
  assert.equal(keyFor('espaco-da-equipe'), 'blu:sync-space:espaco-da-equipe');
  assert.equal(normalizeSpaceName('a/b'), null);
  assert.equal(normalizeSpaceName('ab'), null);
  assert.equal(normalizeSpaceName('a--b'), null);
});

test('dados preservam campos opcionais e rejeitam estrutura e tamanho inválidos', () => {
  assert.equal(validateSpaceData(data), true);
  assert.equal(validateSpaceData({ ...data, sections: [{ ...data.sections[0], buttons: [{ ...data.sections[0].buttons[0], vis: 'unknown' }] }] }), false);
  assert.equal(validateSpaceData({ ...data, sections: 'invalid' }), false);
  assert.equal(validateSpaceData({ ...data, userdata: { privateNotes: 'não publicar' } }), false);
  assert.equal(validateSpaceData({ ...data, sections: [{ ...data.sections[0], buttons: [{ ...data.sections[0].buttons[0], text: 'x'.repeat(700000) }] }] }), false);
});

test('senha é verificada sem aparecer na resposta pública', () => {
  const credential = createPasswordHash('senha bem comprida');
  assert.equal(verifyPassword('senha bem comprida', credential), true);
  assert.equal(verifyPassword('senha incorreta', credential), false);
  const visible = publicSpace({ name: 'equipe', version: 1, publishedAt: 'today', expiresAt: 'later', data, credential });
  assert.equal('credential' in visible, false);
  assert.equal(visible.data, data);
});
