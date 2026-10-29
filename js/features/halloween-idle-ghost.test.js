const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const file = fs.readFileSync(path.join(__dirname, 'halloween.js'), 'utf8');
const source = file.slice(file.indexOf('const HALLOWEEN_IDLE_GHOST_MS'), file.indexOf('function isHalloweenDemoJson()'));

function setup(random = 0) {
  let time = 0;
  let nextId = 1;
  let visible = true;
  const timers = new Map();
  const listeners = new Map();
  const classes = new Set(['halloween-theme']);
  const body = {
    classList: { contains: name => classes.has(name) },
    appendChild(element) { this.ghost = element; }
  };
  const document = {
    body,
    get visibilityState() { return visible ? 'visible' : 'hidden'; },
    createElement: () => ({
      style: {}, classList: { add() {} }, setAttribute() {},
      remove() { this.removed = true; }
    }),
    addEventListener(name, listener) { listeners.set(name, listener); }
  };
  const context = vm.createContext({
    document, window: { matchMedia: query => ({ matches: query.includes('pointer: fine') }) },
    Math: { random: () => random, floor: Math.floor, min: Math.min, max: Math.max },
    innerWidth: 1000, innerHeight: 800,
    setTimeout(callback, ms) { const id = nextId++; timers.set(id, { due: time + ms, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { const id = nextId++; timers.set(id, { due: time + 1, callback }); return id; },
    cancelAnimationFrame(id) { timers.delete(id); }
  });
  vm.runInContext(source, context);
  return {
    body,
    start() { vm.runInContext('scheduleHalloweenIdleGhost()', context); },
    advance(ms) {
      time += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.due <= time) { timers.delete(id); timer.callback(); }
      }
    },
    click() { listeners.get('click')({ target: { closest: () => ({}) } }); },
    hide() { visible = false; vm.runInContext('scheduleHalloweenIdleGhost()', context); },
    show() { visible = true; vm.runInContext('scheduleHalloweenIdleGhost()', context); }
  };
}

test('aparece após dois minutos sem clique e sai após dois cliques no sorteio mínimo', () => {
  const scene = setup(0);
  scene.start();
  scene.advance(119_999);
  assert.equal(scene.body.ghost, undefined);
  scene.advance(1);
  const ghost = scene.body.ghost;
  assert.ok(ghost);
  scene.click();
  assert.equal(ghost.removed, undefined);
  scene.click();
  assert.equal(ghost.removed, true);
});

test('um clique antes da aparição reinicia a espera', () => {
  const scene = setup();
  scene.start();
  scene.advance(100_000);
  scene.click();
  scene.advance(20_000);
  assert.equal(scene.body.ghost, undefined);
  scene.advance(100_000);
  assert.ok(scene.body.ghost);
});

test('o sorteio máximo mantém o fantasma até o quinto clique', () => {
  const scene = setup(.99);
  scene.start();
  scene.advance(120_000);
  const ghost = scene.body.ghost;
  for (let click = 0; click < 4; click++) scene.click();
  assert.equal(ghost.removed, undefined);
  scene.click();
  assert.equal(ghost.removed, true);
});

test('aba oculta cancela a aparição e recomeça ao voltar', () => {
  const scene = setup();
  scene.start();
  scene.advance(110_000);
  scene.hide();
  scene.advance(120_000);
  assert.equal(scene.body.ghost, undefined);
  scene.show();
  scene.advance(120_000);
  assert.ok(scene.body.ghost);
});
