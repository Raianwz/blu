const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');

function setup({ now = Date.parse('2026-11-22T12:00:00-03:00'), search = '' } = {}) {
  const classList = () => {
    const classes = new Set();
    return {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
      contains: name => classes.has(name)
    };
  };
  const buttons = [
    { dataset: { name: 'dragao-vermelho', tag: 'aventura/rpg', text: 'Uma história antiga.' }, classList: classList() },
    { dataset: { name: 'sombra✨', tag: 'magia', text: 'O dragão guarda um segredo! Porta-secreta.' }, classList: classList() }
  ];
  const section = {
    classList: classList(),
    querySelectorAll: selector => selector === '.btn-wrap' ? buttons : []
  };
  const input = { value: '' };
  const type = { value: 'all' };
  const notice = { hidden: true };
  const noResults = { classList: classList(), textContent: '', innerHTML: '' };
  const addSection = { hidden: false };
  const clearButton = { hidden: true };
  const elements = {
    searchInput: input,
    searchType: type,
    searchFallbackNotice: notice,
    noResultsMsg: noResults,
    addSectionBtn: addSection,
    clearSearchBtn: clearButton
  };
  const document = {
    getElementById: id => elements[id] || null,
    querySelectorAll: selector => selector === '.btn-wrap' ? buttons
      : selector === '.section-wrap' ? [section] : [],
    dispatchEvent() {}
  };
  const context = {
    document,
    Date: { now: () => now, parse: Date.parse },
    window: { location: { search }, matchMedia: () => ({ matches: false }) },
    URLSearchParams,
    CustomEvent: class { constructor(type) { this.type = type; } },
    clearTimeout() {},
    getSetting: (_key, fallback) => fallback,
    hideButtonPreview() {},
    updateToggleSectionsBtnLabel() {},
    setSectionCollapsed() {},
    escapeHtml: value => value,
    normalizeSearchText: value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  };
  vm.runInNewContext(source, context);
  return {
    input, type, notice, noResults, buttons,
    search(query, filter = 'all') {
      input.value = query;
      type.value = filter;
      context.doSearch();
      return buttons.map(button => !button.classList.contains('search-hidden'));
    }
  };
}

test('Tudo prioriza nome e tag antes do texto', () => {
  const state = setup();
  assert.deepEqual(state.search('dragão'), [true, false]);
  assert.equal(state.notice.hidden, true);
  assert.deepEqual(state.search('dragão vermelho'), [true, false]);
  assert.deepEqual(state.search('dragaovermelho'), [true, false]);
  assert.deepEqual(state.search('aventura rpg'), [true, false]);
  assert.deepEqual(state.search('magia'), [false, true]);
  assert.deepEqual(state.search('✨'), [false, true]);
  assert.equal(state.notice.hidden, true);
});

test('Tudo usa texto somente sem resultados prioritários e mostra o aviso', () => {
  const state = setup();
  assert.deepEqual(state.search('segredo'), [false, true]);
  assert.equal(state.notice.hidden, false);
  assert.equal(state.noResults.classList.contains('show'), false);
  assert.deepEqual(state.search('porta secreta'), [false, true]);
  assert.deepEqual(state.search('portasecreta'), [false, true]);
  assert.deepEqual(state.search('inexistente'), [false, false]);
  assert.equal(state.notice.hidden, true);
  assert.equal(state.noResults.classList.contains('show'), true);
  assert.deepEqual(state.search('!!!'), [false, false]);
  assert.equal(state.notice.hidden, true);
  state.search('');
  assert.equal(state.notice.hidden, true);
});

test('aspas e filtro Texto buscam diretamente sem aviso de fallback', () => {
  const state = setup();
  state.search('segredo');
  assert.equal(state.notice.hidden, false);
  assert.deepEqual(state.search('"dragão"'), [false, true]);
  assert.equal(state.notice.hidden, true);
  assert.deepEqual(state.search('"porta secreta"'), [false, true]);
  assert.deepEqual(state.search('dragão', 'text'), [false, true]);
  assert.equal(state.notice.hidden, true);
});

test('busca especial após o evento aponta para Leonida sem exibir a pista', () => {
  const end = Date.parse('2026-11-28T17:00:00-03:00');
  const farewellEnd = Date.parse('2026-12-01T00:00:00-03:00');
  const before = setup({ now: end - 1 });
  before.search('#BlûViceCity19');
  assert.equal(before.noResults.innerHTML.includes('Leonida'), false);

  const after = setup({ now: end });
  after.buttons[0].dataset.name = '#BlûViceCity19';
  assert.deepEqual(after.search('#BlûViceCity19'), [false, false]);
  assert.equal(after.noResults.innerHTML,
    '🔍 Nenhum resultado para <strong>"#BlûViceCity19"</strong> procure em Leonida.');

  const lastMoment = setup({ now: farewellEnd - 1 });
  lastMoment.search('#BlûViceCity19');
  assert.match(lastMoment.noResults.innerHTML, /procure em Leonida\./);

  const december = setup({ now: farewellEnd });
  december.search('#BlûViceCity19');
  assert.equal(december.noResults.innerHTML,
    '🔍 Nenhum resultado para <strong>"#BlûViceCity19"</strong>');
});

test('prévias vice-end mostram a busca pós-evento antes da data', () => {
  for (const mode of ['demo', 'true']) {
    const state = setup({ search: `?vice-end=${mode}` });
    assert.deepEqual(state.search('#BlûViceCity19'), [false, false]);
    assert.equal(state.noResults.innerHTML,
      '🔍 Nenhum resultado para <strong>"#BlûViceCity19"</strong> procure em Leonida.');
    const december = setup({
      now: Date.parse('2026-12-01T00:00:00-03:00'), search: `?vice-end=${mode}`
    });
    december.search('#BlûViceCity19');
    assert.equal(december.noResults.innerHTML.includes('Leonida'), false);
  }
});
