const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, 'vice-city.js'), 'utf8');

function setup({ pattern = 0 } = {}) {
  const classes = new Set();
  const listeners = new Map();
  const timers = new Map();
  const audios = [];
  const toasts = [];
  const searchInput = { value: '', closest() { return this; } };
  const noResultsMsg = {
    insertAdjacentElement(_position, node) { body.children.push(node); }
  };
  const branding = Object.fromEntries(['bluFavicon', 'aboutBluLogo'].map(id => [id, {
    attributes: new Map(),
    getAttribute(name) { return this.attributes.get(name) || null; },
    setAttribute(name, value) { this.attributes.set(name, value); }
  }]));
  const body = {
    classList: {
      contains: name => classes.has(name),
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      toggle(name) {
        if (classes.has(name)) classes.delete(name);
        else classes.add(name);
      }
    },
    children: [],
    appendChild(node) { this.children.push(node); }
  };
  let changed;
  let nextTimer = 0;
  const document = {
    body,
    currentScript: { src: 'https://blu.example/libs/events/vice-city/vice-city.js' },
    visibilityState: 'visible',
    getElementById(id) {
      return branding[id] || { searchInput, noResultsMsg }[id] || null;
    },
    createElement() {
      const node = {
        listeners: new Map(),
        children: [],
        setAttribute() {},
        addEventListener(name, fn) { this.listeners.set(name, fn); },
        appendChild(child) { this.children.push(child); },
        remove() { body.children.splice(body.children.indexOf(this), 1); }
      };
      node.classList = { add(name) { node.className += ` ${name}`; } };
      return node;
    },
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); }
  };
  class MutationObserver {
    constructor(callback) { changed = callback; }
    observe() {}
  }
  class Audio {
    constructor(src) { this.src = src; this.pauseCount = 0; this.playCount = 0; audios.push(this); }
    addEventListener() {}
    play() { this.playCount++; return Promise.resolve(); }
    pause() { this.pauseCount++; }
  }
  const window = {};
  const random = Object.create(Math);
  random.random = () => pattern ? .9 : .1;
  vm.runInNewContext(source, {
    document, window, MutationObserver, Audio, URL, Math: random,
    normalizeSearchText(value) {
      return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    },
    clearSearch() {
      searchInput.value = '';
      for (const fn of [...(listeners.get('blu:search-updated') || [])]) fn();
    },
    notify(message, type) { toasts.push({ message, type }); },
    setTimeout(fn, ms) { timers.set(++nextTimer, { fn, ms }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); }
  });
  window.initViceCityIntro();
  return {
    classes, body, listeners, timers, document, branding, audios, toasts,
    searchInput, changed: () => changed(),
    dispatch(name, event) { for (const fn of [...(listeners.get(name) || [])]) fn(event); }
  };
}

test('a intro só abre ao ativar o tema e pode ser pulada por clique ou tecla', () => {
  const state = setup();
  assert.equal(state.body.children.length, 0);
  state.classes.add('vice-city-theme');
  state.changed();
  assert.equal(state.body.children.length, 1);
  assert.equal(state.audios[0].src, 'https://blu.example/libs/events/vice-city/ViceCity.ogg');
  assert.equal(state.audios[0].volume, 0.45);
  assert.equal(state.audios[0].playCount, 1);
  assert.equal(state.branding.bluFavicon.getAttribute('href'),
    'libs/events/vice-city/blu-vice-city.svg');
  assert.equal(state.branding.aboutBluLogo.getAttribute('src'),
    'libs/events/vice-city/blu-vice-city.svg');
  assert.ok(state.body.children[0].innerHTML.includes('class="vice-city-intro__logo"'));
  assert.ok(state.body.children[0].innerHTML.includes('id="vice-square"'));
  assert.ok(state.body.children[0].innerHTML.includes('id="vice-b"'));
  assert.equal(state.body.children[0].innerHTML.includes('vice-city-intro__badge'), false);
  assert.equal([...state.timers.values()][0].ms, 7000);
  state.body.children[0].listeners.get('click')();
  assert.equal(state.body.children.length, 0);
  assert.equal(state.audios[0].pauseCount, 1);
  state.changed();
  assert.equal(state.body.children.length, 0);
  state.classes.delete('vice-city-theme');
  state.changed();
  assert.equal(state.body.children[0].className, 'vice-city-outro');
  [...state.timers.values()].find(timer => timer.ms === 2000).fn();
  state.classes.add('vice-city-theme');
  state.changed();
  let prevented = false;
  state.dispatch('keydown', { key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(state.body.children.length, 0);
  assert.equal(state.audios[1].pauseCount, 1);
});

test('fim natural da intro deixa terminar o trecho de áudio', () => {
  const state = setup();
  state.classes.add('vice-city-theme');
  state.changed();
  [...state.timers.values()][0].fn();
  assert.equal(state.body.children.length, 0);
  assert.equal(state.audios[0].pauseCount, 0);
  state.classes.delete('vice-city-theme');
  state.changed();
  assert.equal(state.audios[0].pauseCount, 1);
});

test('reativação durante a saída espera a tela azul terminar', () => {
  const state = setup();
  state.classes.add('vice-city-theme');
  state.changed();
  state.body.children[0].listeners.get('click')();
  state.classes.delete('vice-city-theme');
  state.changed();
  state.classes.add('vice-city-theme');
  state.changed();
  assert.equal(state.body.children.length, 1);
  assert.equal(state.body.children[0].className, 'vice-city-outro');
  [...state.timers.values()].find(timer => timer.ms === 2000).fn();
  assert.equal(state.body.children.length, 1);
  assert.equal(state.body.children[0].className, 'vice-city-intro');
});

test('Halloween impede a intro; voltar de uma aba oculta não a repete', () => {
  const state = setup();
  state.classes.add('vice-city-theme');
  state.classes.add('halloween-theme');
  state.changed();
  assert.equal(state.body.children.length, 0);
  assert.equal(state.branding.bluFavicon.getAttribute('href'),
    'libs/events/halloween/icons/blu-halloween.svg');
  state.classes.delete('halloween-theme');
  state.changed();
  assert.equal(state.body.children.length, 1);
  state.document.visibilityState = 'hidden';
  state.dispatch('visibilitychange');
  assert.equal(state.body.children.length, 0);
  state.document.visibilityState = 'visible';
  state.dispatch('visibilitychange');
  assert.equal(state.body.children.length, 0);
});

test('código Konami alterna o tema e ignora digitação em campos', () => {
  const state = setup();
  const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'B', 'A'];
  const send = (key, target) => state.dispatch('keydown', { key, target, preventDefault() {} });
  keys.slice(0, 5).forEach(key => send(key));
  send('x');
  keys.forEach((key, index) => send(key, index === 4 ? { closest: () => ({}) } : undefined));
  assert.equal(state.classes.has('vice-city-theme'), false);
  keys.forEach(key => send(key));
  assert.equal(state.classes.has('vice-city-theme'), false);
  assert.equal(state.body.children.length, 1);
  assert.equal(state.body.children[0].className, 'vice-city-intro');
  assert.equal(state.audios[0].playCount, 1);
  assert.equal(state.branding.bluFavicon.getAttribute('href'), 'assets/icons/blu.svg');
  assert.equal([...state.timers.values()].find(timer => timer.ms === 500).ms, 500);
  [...state.timers.values()].find(timer => timer.ms === 500).fn();
  assert.equal(state.classes.has('vice-city-theme'), true);
  assert.equal(state.branding.bluFavicon.getAttribute('href'),
    'libs/events/vice-city/blu-vice-city.svg');
  state.changed();
  assert.equal(state.body.children.length, 1);
  state.body.children[0].listeners.get('click')();
  keys.forEach(key => send(key));
  assert.equal(state.classes.has('vice-city-theme'), false);
  state.changed();
  assert.equal(state.branding.bluFavicon.getAttribute('href'), 'assets/icons/blu.svg');
  assert.equal(state.body.children.length, 1);
  assert.equal(state.body.children[0].className, 'vice-city-outro');
  assert.ok(state.body.children[0].innerHTML.includes('assets/icons/blu.svg'));
  assert.equal([...state.timers.values()].find(timer => timer.ms === 2000).ms, 2000);
  keys.forEach(key => send(key));
  assert.equal(state.classes.has('vice-city-theme'), false);
  [...state.timers.values()].find(timer => timer.ms === 2000).fn();
  assert.equal(state.body.children.length, 0);
});

test('busca secreta alterna os dois padrões e só surge na consulta exata', () => {
  for (const [pattern, visible] of [[0, [1, 3, 5, 6, 8]], [1, [0, 2, 4, 7, 9]]]) {
    const state = setup({ pattern });
    state.searchInput.value = '#BlûViceCity19';
    state.dispatch('blu:search-updated');
    const clue = state.body.children[0];
    assert.equal(clue.className, 'vice-city-clue');
    assert.equal(clue.children.length, 10);
    assert.deepEqual(clue.children.flatMap((slot, index) => slot.textContent ? [index] : []), visible);
    state.searchInput.value = '#outra-busca';
    state.dispatch('blu:search-updated');
    assert.equal(state.body.children.length, 0);
  }
});

test('sequência na busca ilumina os passos e ativa o tema após completar', () => {
  const state = setup();
  state.searchInput.value = '#BlûViceCity19';
  state.dispatch('blu:search-updated');
  const clue = state.body.children[0];
  const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  for (const key of keys) {
    let prevented = false;
    state.dispatch('keydown', {
      key, target: state.searchInput,
      preventDefault() { prevented = true; }, stopPropagation() {}
    });
    assert.equal(prevented, true);
  }
  assert.ok(clue.children.every(slot => slot.className.includes('lit')));
  assert.equal(state.searchInput.value, '');
  assert.equal(state.body.children.length, 1);
  assert.equal(state.body.children[0].className, 'vice-city-intro');
  assert.equal(state.classes.has('vice-city-theme'), false);
  [...state.timers.values()].find(timer => timer.ms === 500).fn();
  assert.equal(state.classes.has('vice-city-theme'), true);
  state.dispatch('keydown', {
    key: 'Escape', target: state.searchInput,
    preventDefault() {}, stopPropagation() {}
  });
  assert.equal(state.body.children.length, 0);
  assert.equal(state.audios[0].pauseCount, 1);
  assert.equal(state.toasts.length, 0);

  state.searchInput.value = '#BlûViceCity19';
  state.dispatch('blu:search-updated');
  for (const key of keys) state.dispatch('keydown', {
    key, target: state.searchInput, preventDefault() {}, stopPropagation() {}
  });
  assert.equal(state.classes.has('vice-city-theme'), false);
  assert.equal(state.searchInput.value, '');
  assert.equal(state.body.children.length, 1);
  assert.equal(state.body.children[0].className, 'vice-city-outro');
});

test('tecla errada aparece em vermelho e o tabuleiro reinicia após 2 segundos', () => {
  const state = setup();
  state.searchInput.value = '#BlûViceCity19';
  state.dispatch('blu:search-updated');
  const clue = state.body.children[0];
  const send = key => state.dispatch('keydown', {
    key, target: state.searchInput, preventDefault() {}, stopPropagation() {}
  });
  send('ArrowUp');
  assert.equal(clue.children[0].textContent, '↑');
  assert.ok(clue.children[0].className.includes('lit'));
  send('ArrowLeft');
  assert.equal(clue.children[1].textContent, '←');
  assert.ok(clue.children[1].className.includes('wrong'));
  assert.equal(clue.children[0].className.includes('lit'), false);
  assert.equal(state.toasts[0].message, 'Quase lá, tente novamente');
  [...state.timers.values()].find(timer => timer.ms === 2000).fn();
  assert.equal(clue.children[0].textContent, '');
  assert.equal(clue.children[1].textContent, '↑');
  assert.equal(clue.children[1].className.includes('wrong'), false);
});
