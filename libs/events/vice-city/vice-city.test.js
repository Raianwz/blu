const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, 'vice-city.js'), 'utf8');

function setup() {
  const classes = new Set();
  const listeners = new Map();
  const timers = new Map();
  const audios = [];
  const branding = Object.fromEntries(['bluFavicon', 'aboutBluLogo'].map(id => [id, {
    attributes: new Map(),
    getAttribute(name) { return this.attributes.get(name) || null; },
    setAttribute(name, value) { this.attributes.set(name, value); }
  }]));
  const body = {
    classList: {
      contains: name => classes.has(name),
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
    getElementById(id) { return branding[id] || null; },
    createElement() {
      return {
        listeners: new Map(),
        setAttribute() {},
        addEventListener(name, fn) { this.listeners.set(name, fn); },
        remove() { body.children.splice(body.children.indexOf(this), 1); }
      };
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
  vm.runInNewContext(source, {
    document, window, MutationObserver, Audio, URL,
    setTimeout(fn, ms) { timers.set(++nextTimer, { fn, ms }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); }
  });
  window.initViceCityIntro();
  return {
    classes, body, listeners, timers, document, branding, audios, changed: () => changed(),
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
  assert.equal(state.classes.has('vice-city-theme'), true);
  state.changed();
  assert.equal(state.body.children.length, 1);
  state.body.children[0].listeners.get('click')();
  keys.forEach(key => send(key));
  assert.equal(state.classes.has('vice-city-theme'), false);
  state.changed();
  assert.equal(state.branding.bluFavicon.getAttribute('href'), 'assets/icons/blu.svg');
});
