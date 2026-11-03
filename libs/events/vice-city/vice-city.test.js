const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, 'vice-city.js'), 'utf8');

function setup({ pattern = 0, savedTheme = 'off', touch = false, randomValue = null } = {}) {
  const classes = new Set();
  const removedClasses = [];
  const listeners = new Map();
  const settings = new Map(savedTheme === 'on' ? [['vice-city', 'on']] : []);
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
      remove(name) { removedClasses.push(name); classes.delete(name); },
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
  let now = 0;
  const document = {
    body,
    currentScript: { src: 'https://blu.example/libs/events/vice-city/vice-city.js' },
    visibilityState: 'visible',
    getElementById(id) {
      return branding[id] || { searchInput, noResultsMsg }[id] || null;
    },
    createElement(tagName) {
      const node = {
        tagName: tagName.toUpperCase(),
        listeners: new Map(),
        children: [],
        setAttribute() {},
        addEventListener(name, fn) { this.listeners.set(name, fn); },
        appendChild(child) { this.children.push(child); },
        remove() { body.children.splice(body.children.indexOf(this), 1); }
      };
      node.classList = {
        add(name) { node.className += ` ${name}`; },
        remove(name) { node.className = node.className.split(' ').filter(part => part !== name).join(' '); },
        contains(name) { return node.className.split(' ').includes(name); }
      };
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
  const window = {
    matchMedia() { return { matches: touch }; },
    addEventListener(name, fn) {
      if (!listeners.has(`window:${name}`)) listeners.set(`window:${name}`, new Set());
      listeners.get(`window:${name}`).add(fn);
    }
  };
  const random = Object.create(Math);
  random.random = () => randomValue ?? (pattern ? .9 : .1);
  vm.runInNewContext(source, {
    document, window, MutationObserver, Audio, URL, Math: random, Date: { now: () => now },
    getSetting(name, fallback = null) { return settings.has(name) ? settings.get(name) : fallback; },
    setSetting(name, value) { settings.set(name, value); },
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
    classes, removedClasses, body, listeners, timers, document, branding, audios, toasts, settings,
    searchInput, changed: () => changed(),
    advanceTime(ms) { now += ms; },
    runTimer(ms) {
      const entry = [...timers].find(([, timer]) => timer.ms === ms);
      assert.ok(entry, `temporizador de ${ms} ms não encontrado`);
      timers.delete(entry[0]);
      entry[1].fn();
    },
    dispatch(name, event) { for (const fn of [...(listeners.get(name) || [])]) fn(event); }
  };
}

test('a intro só abre ao ativar o tema e pode ser pulada por clique ou tecla', () => {
  const state = setup();
  assert.equal(state.body.children.length, 0);
  state.classes.add('vice-city-theme');
  state.changed();
  assert.equal(state.body.children.length, 1);
  assert.equal(state.audios[0].src, 'https://blu.example/libs/events/vice-city/sounds/ViceCity.ogg');
  assert.equal(state.audios[0].volume, 0.45);
  assert.equal(state.audios[0].playCount, 1);
  assert.equal(state.branding.bluFavicon.getAttribute('href'),
    'libs/events/vice-city/icons/blu-vice-city.svg');
  assert.equal(state.branding.aboutBluLogo.getAttribute('src'),
    'libs/events/vice-city/icons/blu-vice-city.svg');
  assert.ok(state.body.children[0].innerHTML.includes('class="vice-city-intro__logo"'));
  assert.ok(state.body.children[0].innerHTML.includes('id="vice-square"'));
  assert.ok(state.body.children[0].innerHTML.includes('id="vice-b"'));
  assert.equal(state.body.children[0].innerHTML.includes('vice-city-intro__badge'), false);
  assert.equal([...state.timers.values()].find(timer => timer.ms === 7000).ms, 7000);
  state.body.children[0].listeners.get('click')();
  assert.equal(state.body.children.length, 0);
  assert.equal(state.audios[0].pauseCount, 0);
  [...state.timers.values()].find(timer => timer.ms === 100).fn();
  assert.ok(state.audios[0].volume < 0.45);
  [...state.timers.values()].find(timer => timer.ms === 250).fn();
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
  [...state.timers.values()].find(timer => timer.ms === 250).fn();
  assert.equal(state.audios[1].pauseCount, 1);
});

test('fim natural da intro deixa terminar o trecho de áudio', () => {
  const state = setup();
  state.classes.add('vice-city-theme');
  state.changed();
  [...state.timers.values()].find(timer => timer.ms === 7000).fn();
  assert.equal(state.body.children.length, 0);
  assert.equal(state.audios[0].pauseCount, 0);
  state.classes.delete('vice-city-theme');
  state.changed();
  assert.equal(state.audios[0].pauseCount, 1);
});

test('desativar o tema durante a saída de áudio interrompe o som', () => {
  const state = setup();
  state.classes.add('vice-city-theme');
  state.changed();
  state.body.children[0].listeners.get('click')();
  assert.equal(state.audios[0].pauseCount, 0);
  state.classes.delete('vice-city-theme');
  state.changed();
  assert.equal(state.audios[0].pauseCount, 1);
  assert.equal([...state.timers.values()].some(timer => timer.ms === 250), false);
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

test('Halloween impede a intro; trocar de aba pausa e retoma sem repetir', () => {
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
  const intro = state.body.children[0];
  state.advanceTime(1200);
  state.document.visibilityState = 'hidden';
  state.dispatch('visibilitychange');
  assert.equal(state.body.children[0], intro);
  assert.equal(intro.classList.contains('vice-city-intro--paused'), true);
  assert.equal(state.audios[0].pauseCount, 1);
  assert.equal([...state.timers.values()].some(timer => timer.ms === 7000), false);
  state.advanceTime(10000);
  state.document.visibilityState = 'visible';
  state.dispatch('visibilitychange');
  assert.equal(state.body.children[0], intro);
  assert.equal(intro.classList.contains('vice-city-intro--paused'), false);
  assert.equal(state.audios[0].playCount, 2);
  assert.equal(state.audios.length, 1);
  const remainingTimer = [...state.timers.values()].find(timer => timer.ms === 5800);
  assert.ok(remainingTimer);
  remainingTimer.fn();
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
  assert.equal(state.settings.get('vice-city'), 'on');
  assert.equal(state.branding.bluFavicon.getAttribute('href'),
    'libs/events/vice-city/icons/blu-vice-city.svg');
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

test('salva a escolha e restaura o tema sem repetir intro ou áudio', () => {
  const state = setup({ savedTheme: 'on' });
  assert.equal(state.classes.has('vice-city-theme'), true);
  assert.equal(state.body.children.length, 0);
  assert.equal(state.audios.length, 0);
  assert.equal(state.branding.bluFavicon.getAttribute('href'),
    'libs/events/vice-city/icons/blu-vice-city.svg');

  const keys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  for (const key of keys) state.dispatch('keydown', { key });
  assert.equal(state.settings.get('vice-city'), 'off');
  assert.equal(state.classes.has('vice-city-theme'), false);

  state.settings.set('vice-city', 'on');
  state.dispatch('window:storage', { key: 'blu:settings' });
  assert.equal(state.classes.has('vice-city-theme'), true);
  assert.equal(state.audios.length, 0);
});

test('cursor especial surge após o prazo inicial e não persiste após F5', () => {
  const state = setup({ savedTheme: 'on' });
  const firstTimer = state.timers.keys().next().value;
  assert.ok(firstTimer);
  assert.equal(state.timers.get(firstTimer).ms, 300000);
  state.dispatch('pointermove', {});
  assert.equal(state.timers.has(firstTimer), false);
  const idleTimer = state.timers.values().next().value;
  idleTimer.fn();
  state.changed();
  assert.equal(state.classes.has('vice-city-idle-cursor'), true);
  state.dispatch('pointermove', {});
  assert.equal(state.classes.has('vice-city-idle-cursor'), true);

  state.settings.set('vice-city', 'off');
  state.dispatch('window:storage', { key: 'blu:settings' });
  assert.equal(state.classes.has('vice-city-idle-cursor'), false);
  state.settings.set('vice-city', 'on');
  state.dispatch('window:storage', { key: 'blu:settings' });
  assert.ok([...state.timers.values()].some(timer => timer.ms === 120000));

  const reloaded = setup({ savedTheme: 'on' });
  assert.equal(reloaded.classes.has('vice-city-idle-cursor'), false);
  assert.equal(reloaded.timers.size, 1);
});

test('cursor pisca no décimo clique, sai no vigésimo e reaparece após dois minutos', () => {
  const state = setup({ savedTheme: 'on', randomValue: 0 });
  state.runTimer(state.timers.values().next().value.ms);
  for (let i = 0; i < 9; i++) state.dispatch('click', {});
  assert.equal(state.classes.has('vice-city-idle-cursor'), true);
  state.dispatch('click', {});
  assert.equal(state.classes.has('vice-city-idle-cursor'), true);
  assert.equal(state.classes.has('vice-city-idle-cursor-blink'), true);
  state.changed();
  assert.equal(state.classes.has('vice-city-idle-cursor-blink'), true);
  state.runTimer(140);
  assert.equal(state.classes.has('vice-city-idle-cursor'), true);
  assert.equal(state.classes.has('vice-city-idle-cursor-blink'), false);

  for (let i = 0; i < 10; i++) state.dispatch('click', {});
  assert.equal(state.classes.has('vice-city-idle-cursor'), false);
  const repeatTimer = [...state.timers].find(([, timer]) => timer.ms === 120000)?.[0];
  assert.ok(repeatTimer);
  state.dispatch('pointermove', {});
  assert.equal(state.timers.has(repeatTimer), false);
  state.runTimer(120000);
  assert.equal(state.classes.has('vice-city-idle-cursor'), true);
});

test('cursor pode durar trinta cliques e pisca também no vigésimo', () => {
  const state = setup({ savedTheme: 'on', randomValue: .999 });
  state.runTimer(state.timers.values().next().value.ms);
  for (let i = 0; i < 10; i++) state.dispatch('click', {});
  state.runTimer(140);
  for (let i = 0; i < 10; i++) state.dispatch('click', {});
  assert.equal(state.classes.has('vice-city-idle-cursor'), true);
  assert.equal(state.classes.has('vice-city-idle-cursor-blink'), true);
  state.runTimer(140);
  assert.equal(state.classes.has('vice-city-idle-cursor-blink'), false);
  for (let i = 0; i < 9; i++) state.dispatch('click', {});
  assert.equal(state.classes.has('vice-city-idle-cursor'), true);
  state.dispatch('click', {});
  assert.equal(state.classes.has('vice-city-idle-cursor'), false);
  assert.ok([...state.timers.values()].some(timer => timer.ms === 120000));
});

test('tema inativo não altera a classe do cursor a cada observação', () => {
  const state = setup();
  state.changed();
  state.changed();
  assert.equal(state.removedClasses.includes('vice-city-idle-cursor'), false);
});

test('busca secreta alterna os dois padrões e só surge na consulta exata', () => {
  for (const [pattern, visible] of [[0, [1, 3, 5, 6, 8]], [1, [0, 2, 4, 7, 9]]]) {
    const state = setup({ pattern });
    state.searchInput.value = '#BlûViceCity19';
    state.dispatch('blu:search-updated');
    const clue = state.body.children[0];
    assert.equal(clue.className, 'vice-city-clue');
    assert.equal(clue.children.length, 11);
    assert.deepEqual(clue.children.slice(0, 10).flatMap((slot, index) => slot.textContent ? [index] : []), visible);
    assert.deepEqual(clue.children[10].children.map(key => key.textContent),
      ['←', '↑', '→', '↓', 'A', 'B']);
    state.searchInput.value = '#outra-busca';
    state.dispatch('blu:search-updated');
    assert.equal(state.body.children.length, 0);
  }
});

test('em telas de toque a pista vem completa e exige tocar os dez passos na ordem', () => {
  const state = setup({ touch: true });
  state.searchInput.value = '#BlûViceCity19';
  state.dispatch('blu:search-updated');
  const clue = state.body.children[0];
  assert.ok(clue.children.every(slot => slot.tagName === 'BUTTON' && slot.textContent));

  clue.children[1].listeners.get('click')();
  assert.ok(clue.children[1].className.includes('wrong'));
  assert.equal(state.toasts[0].message, 'Quase lá, tente novamente');
  [...state.timers.values()].find(timer => timer.ms === 2000).fn();
  assert.ok(clue.children.every(slot => !slot.className.includes('wrong')));

  for (let index = 0; index < clue.children.length; index++) {
    clue.children[index].listeners.get('click')();
    if (index < clue.children.length - 1) {
      assert.ok(clue.children[index].className.includes('lit'));
    }
  }
  assert.equal(state.searchInput.value, '');
  [...state.timers.values()].find(timer => timer.ms === 500).fn();
  assert.equal(state.classes.has('vice-city-theme'), true);
  state.body.children[0].listeners.get('click')();

  state.searchInput.value = '#BlûViceCity19';
  state.dispatch('blu:search-updated');
  const secondClue = state.body.children[0];
  secondClue.children.forEach(slot => slot.listeners.get('click')());
  assert.equal(state.classes.has('vice-city-theme'), false);
  assert.equal(state.settings.get('vice-city'), 'off');
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
  assert.ok(clue.children.slice(0, 10).every(slot => slot.className.includes('lit')));
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
  [...state.timers.values()].find(timer => timer.ms === 250).fn();
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
