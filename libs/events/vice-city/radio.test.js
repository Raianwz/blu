const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'radio.js'), 'utf8');

function setup({ now = Date.parse('2026-11-16T12:00:00-03:00'), theme = true,
  hostname = 'blu.rwz.app', search = '', metadataBytes = null } = {}) {
  const classes = new Set(theme ? ['vice-city-theme'] : []);
  const timers = new Map();
  const audios = [];
  const requests = [];
  const listeners = new Map();
  let mutation;
  let nextTimer = 0;

  function element() {
    const listeners = new Map();
    const attributes = new Map();
    const children = new Map();
    const elementClasses = new Set();
    return {
      listeners, attributes, hidden: false, paused: true,
      style: { values: new Map(), setProperty(name, value) { this.values.set(name, value); } },
      classList: {
        toggle(name, active) { if (active) elementClasses.add(name); else elementClasses.delete(name); },
        add: name => elementClasses.add(name),
        remove: name => elementClasses.delete(name),
        contains: name => elementClasses.has(name)
      },
      addEventListener(name, callback) { listeners.set(name, callback); },
      setAttribute(name, value) { attributes.set(name, value); },
      querySelector(selector) {
        if (!children.has(selector)) {
          const child = element();
          if (selector === '.vice-radio__volume') child.value = '15';
          children.set(selector, child);
        }
        return children.get(selector);
      },
      appendChild(child) { child.parent = this; this.child = child; },
      remove() { if (this.parent) this.parent.child = null; this.removed = true; },
      removeAttribute(name) { if (name === 'src') this.src = ''; },
      focus() {},
      click() { listeners.get('click')?.(); }
    };
  }

  class Audio {
    constructor(src = '') {
      Object.assign(this, element(), { src, paused: true, volume: 1 });
      audios.push(this);
    }
    load() {}
    play() {
      this.paused = false;
      this.listeners.get('play')?.();
      this.listeners.get('playing')?.();
      return Promise.resolve();
    }
    pause() { this.paused = true; this.listeners.get('pause')?.(); }
    emit(name) { this.listeners.get(name)?.(); }
  }

  const body = element();
  body.classList.contains = name => classes.has(name);
  const topbar = element();
  const document = {
    body,
    getElementById(id) { return id === 'topbar' ? topbar : null; },
    createElement() { return element(); },
    addEventListener(name, callback) { listeners.set(name, callback); }
  };
  const window = {
    location: { hostname, search },
    addEventListener(name, callback) { listeners.set(`window:${name}`, callback); }
  };
  class MutationObserver {
    constructor(callback) { mutation = callback; }
    observe() {}
  }
  vm.runInNewContext(source.replace('window.initViceCityRadio = initViceCityRadio;',
    'window.testReadId3 = readId3; window.initViceCityRadio = initViceCityRadio;'), {
    document, window, Audio, MutationObserver, URLSearchParams,
    TextDecoder,
    Math: { floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max, random: () => 0 },
    requestAnimationFrame(callback) { callback(); },
    fetch(url, options) {
      requests.push({ url, options });
      return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(
        metadataBytes ? metadataBytes.buffer.slice(metadataBytes.byteOffset,
          metadataBytes.byteOffset + metadataBytes.byteLength) : new ArrayBuffer(0)) });
    },
    Date: { now: () => now, parse: Date.parse },
    setTimeout(callback, delay) { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); }
  });
  window.initViceCityRadio();
  return {
    audios, body, topbar, timers, classes, requests, readId3: window.testReadId3,
    setTime(value) { now = value; },
    dispatch(name) { listeners.get(name)?.(); },
    sync() { mutation(); },
    timer(delay) {
      const entry = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(entry, `missing timer ${delay}`);
      timers.delete(entry[0]);
      entry[1].callback();
    }
  };
}

test('checks audio before mounting; local preview keeps the original order', () => {
  const state = setup({ hostname: 'localhost', search: '?radio-preview=1' });
  assert.equal(state.topbar.child, undefined);
  assert.match(state.audios[0].src, /Blood%20In%20Your%20Eyes\.mp3$/);
  state.audios[0].emit('loadedmetadata');
  assert.ok(state.topbar.child);
  assert.equal(state.audios.length, 1);
  state.topbar.child.click();
  assert.equal(state.audios[1].volume, .15);
  assert.equal(state.body.child.querySelector('.vice-radio__volume-value').textContent, '15%');
  assert.equal(state.audios[1].paused, false);
  assert.equal(state.body.child.hidden, false);
  state.body.child.querySelector('.vice-radio__next').click();
  assert.match(state.audios[1].src, /Bright%20Lights%2C%20Big%20City\.mp3$/);
  state.body.child.querySelector('.vice-radio__previous').click();
  assert.match(state.audios[1].src, /Blood%20In%20Your%20Eyes\.mp3$/);
  const volume = state.body.child.querySelector('.vice-radio__volume');
  volume.value = '55';
  volume.listeners.get('input')({ target: volume });
  assert.equal(state.audios[1].volume, .55);
  assert.equal(volume.attributes.get('aria-valuetext'), '55%');
  assert.equal(state.body.child.querySelector('.vice-radio__volume-value').textContent, '55%');
  assert.equal(state.body.child.querySelector('.vice-radio__volume-control').style.values.get('--volume-position'), '55%');
  state.classes.delete('vice-city-theme');
  state.sync();
  assert.equal(state.audios[1].paused, true);
  assert.equal(state.topbar.child, null);
});

test('production radio starts shuffled and can move backward in that order', () => {
  const state = setup();
  state.audios[0].emit('loadedmetadata');
  state.topbar.child.click();
  const first = state.audios[1].src;
  assert.doesNotMatch(first, /Blood%20In%20Your%20Eyes\.mp3$/);
  state.body.child.querySelector('.vice-radio__next').click();
  assert.notEqual(state.audios[1].src, first);
  state.body.child.querySelector('.vice-radio__previous').click();
  assert.equal(state.audios[1].src, first);
});

function id3Tag() {
  const frame = (id, value) => {
    const payload = Buffer.concat([Buffer.from([3]), Buffer.from(value)]);
    const header = Buffer.alloc(10);
    header.write(id, 0);
    header.writeUInt32BE(payload.length, 4);
    return Buffer.concat([header, payload]);
  };
  const frames = Buffer.concat([frame('TIT2', 'Título da faixa'),
    frame('TPE1', 'Artista'), frame('TALB', 'Álbum')]);
  const header = Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, frames.length]);
  return Buffer.concat([header, frames]);
}

test('shows MP3 title, artist and album when the tag is readable', async () => {
  const bytes = id3Tag();
  const state = setup({ hostname: 'localhost', search: '?radio-preview=1', metadataBytes: bytes });
  assert.equal(state.readId3(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)).title, 'Título da faixa');
  state.audios[0].emit('loadedmetadata');
  state.topbar.child.click();
  await new Promise(setImmediate);
  assert.equal(state.body.child.querySelector('.vice-radio__track-text').textContent, 'Título da faixa');
  assert.equal(state.body.child.querySelector('.vice-radio__artist').textContent, 'Artista · Álbum');
  assert.equal(state.requests[0].options.headers.Range, 'bytes=0-262143');
});

test('long song titles pan slowly and short titles stay still', () => {
  const state = setup({ hostname: 'localhost', search: '?radio-preview=1' });
  state.audios[0].emit('loadedmetadata');
  const viewport = state.body.child.querySelector('.vice-radio__track');
  const text = state.body.child.querySelector('.vice-radio__track-text');
  viewport.clientWidth = 100;
  text.scrollWidth = 240;
  state.topbar.child.click();
  assert.equal(text.classList.contains('is-scrolling'), true);
  assert.equal(text.style.values.get('--scroll-distance'), '140px');
  text.scrollWidth = 80;
  state.body.child.querySelector('.vice-radio__next').click();
  assert.equal(text.classList.contains('is-scrolling'), false);
});

test('hides the radio when audio fails or the calendar window is closed', () => {
  const unavailable = setup();
  unavailable.audios[0].emit('error');
  assert.equal(unavailable.topbar.child, undefined);
  const early = setup({ now: Date.parse('2026-11-15T12:00:00-03:00') });
  assert.equal(early.audios.length, 0);
  const extended = setup({ now: Date.parse('2026-11-26T12:00:00-03:00') });
  assert.equal(extended.audios.length, 1);
  const late = setup({ now: Date.parse('2026-11-28T16:00:00-03:00') });
  assert.equal(late.audios.length, 0);
});

test('the radio stops at 16h Brasília on November 28', () => {
  const end = Date.parse('2026-11-28T16:00:00-03:00');
  const state = setup({ now: end - 1000 });
  state.audios[0].emit('loadedmetadata');
  state.topbar.child.click();
  assert.equal(state.audios[1].paused, false);
  state.setTime(end);
  state.timer(1000);
  assert.equal(state.audios[1].paused, true);
  assert.equal(state.topbar.child, null);
});

test('the radio closes on return from a suspended tab after the deadline', () => {
  const end = Date.parse('2026-11-28T16:00:00-03:00');
  const state = setup({ now: end - 1000 });
  state.audios[0].emit('loadedmetadata');
  state.topbar.child.click();
  state.setTime(end);
  state.dispatch('visibilitychange');
  assert.equal(state.audios[1].paused, true);
  assert.equal(state.topbar.child, null);
});

test('local preview bypasses only the calendar', () => {
  const preview = setup({ now: Date.parse('2026-11-15T12:00:00-03:00'),
    hostname: '127.0.0.1', search: '?radio-preview=1' });
  assert.equal(preview.audios.length, 1);
  preview.classes.delete('vice-city-theme');
  preview.sync();
  assert.equal(preview.audios[0].paused, true);
});
