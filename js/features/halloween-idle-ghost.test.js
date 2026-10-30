const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const file = fs.readFileSync(path.join(__dirname, 'halloween.js'), 'utf8');
const source = file.slice(file.indexOf('const HALLOWEEN_IDLE_GHOST_FIRST_MS'), file.indexOf('function isHalloweenDemoJson()'));

function setup(random = 0) {
  let time = 0;
  let nextId = 1;
  let visible = true;
  let focused = true;
  const timers = new Map();
  const listeners = new Map();
  const windowListeners = new Map();
  const classes = new Set(['halloween-theme']);
  const body = {
    classList: {
      contains: name => classes.has(name),
      add: name => classes.add(name),
      remove: name => classes.delete(name)
    },
    appendChild(element) {
      if (element.className === 'halloween-idle-spotlight') this.spotlight = element;
      else this.ghost = element;
    }
  };
  const document = {
    body,
    get visibilityState() { return visible ? 'visible' : 'hidden'; },
    hasFocus: () => focused,
    createElement: () => {
      const elementClasses = new Set();
      return {
        style: { setProperty(name, value) { this[name] = value; } },
        classList: {
          add: (...names) => names.forEach(name => elementClasses.add(name)),
          remove: name => elementClasses.delete(name),
          contains: name => elementClasses.has(name)
        },
        offsetWidth: 32, setAttribute() {}, remove() { this.removed = true; }
      };
    },
    addEventListener(name, listener) { listeners.set(name, listener); }
  };
  const context = vm.createContext({
    document, window: {
      matchMedia: query => ({ matches: query.includes('pointer: fine') }),
      addEventListener(name, listener) { windowListeners.set(name, listener); }
    },
    Date: { now: () => time },
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
    clickOutside() { listeners.get('click')({ target: { closest: () => null } }); },
    clear() { vm.runInContext('clearHalloweenIdleGhost()', context); },
    move(x, y) { listeners.get('pointermove')({ pointerType: 'mouse', clientX: x, clientY: y }); },
    hide() { focused = false; visible = false; windowListeners.get('blur')(); listeners.get('visibilitychange')(); },
    show() { focused = true; visible = true; listeners.get('visibilitychange')(); windowListeners.get('focus')(); }
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
  assert.equal(scene.body.spotlight, undefined);
  scene.click();
  assert.equal(ghost.removed, undefined);
  assert.equal(ghost.classList.contains('halloween-idle-ghost--blink'), true);
  scene.click();
  assert.equal(ghost.classList.contains('halloween-idle-ghost--puff'), true);
  scene.advance(550);
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
  scene.advance(550);
  assert.equal(ghost.removed, true);
});

test('o destaque só inicia ao mover o mouse após voltar ao foco', () => {
  const scene = setup();
  scene.move(100, 100);
  scene.start();
  scene.advance(120_000);
  const ghost = scene.body.ghost;
  assert.equal(scene.body.spotlight, undefined);
  scene.move(200, 200);
  assert.equal(scene.body.spotlight, undefined);
  scene.hide();
  scene.show();
  assert.equal(scene.body.spotlight, undefined);
  const initialLeft = ghost.style.left;
  scene.move(400, 300);
  assert.ok(scene.body.spotlight);
  scene.advance(1_999);
  assert.equal(ghost.style.left, initialLeft);
  scene.advance(1);
  assert.equal(scene.body.spotlight.classList.contains('halloween-idle-spotlight--fade'), true);
  scene.advance(1);
  assert.equal(ghost.style.left, '418px');
});

test('inatividade na aba oculta mostra o fantasma no retorno sem destaque imediato', () => {
  const scene = setup();
  scene.start();
  scene.advance(110_000);
  scene.hide();
  scene.advance(120_000);
  assert.equal(scene.body.ghost, undefined);
  scene.show();
  assert.ok(scene.body.ghost);
  assert.equal(scene.body.spotlight, undefined);
});

test('voltar ao foco antes da aparição não prepara o destaque', () => {
  const scene = setup();
  scene.start();
  scene.advance(30_000);
  scene.hide();
  scene.show();
  scene.advance(90_000);
  assert.ok(scene.body.ghost);
  scene.move(400, 300);
  assert.equal(scene.body.spotlight, undefined);
});

test('depois da primeira aparição, espera dez minutos sem clicar em botões', () => {
  const scene = setup();
  scene.start();
  scene.advance(120_000);
  const firstGhost = scene.body.ghost;
  scene.click();
  scene.advance(30_000);
  scene.click();
  assert.equal(firstGhost.classList.contains('halloween-idle-ghost--puff'), true);
  scene.advance(599_999);
  assert.equal(scene.body.ghost, firstGhost);
  scene.advance(1);
  assert.notEqual(scene.body.ghost, firstGhost);
});

test('cliques antes da próxima aparição reiniciam os dez minutos', () => {
  const scene = setup();
  scene.start();
  scene.advance(120_000);
  const firstGhost = scene.body.ghost;
  scene.click();
  scene.click();
  scene.advance(500_000);
  scene.click();
  scene.advance(100_000);
  assert.equal(scene.body.ghost, firstGhost);
  scene.advance(500_000);
  assert.notEqual(scene.body.ghost, firstGhost);
});

test('fantasma vira cursor após dois minutos visíveis e some após dez cliques', () => {
  const scene = setup(0);
  scene.start();
  scene.advance(120_000);
  const ghost = scene.body.ghost;
  scene.advance(119_999);
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), false);
  scene.advance(1);
  assert.equal(ghost.removed, true);
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), true);
  for (let click = 0; click < 9; click++) scene.clickOutside();
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), true);
  scene.clickOutside();
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), false);
});

test('cursor dura até vinte cliques no sorteio máximo', () => {
  const scene = setup(.99);
  scene.start();
  scene.advance(120_000);
  scene.advance(120_000);
  for (let click = 0; click < 19; click++) scene.clickOutside();
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), true);
  scene.clickOutside();
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), false);
});

test('tempo para virar cursor pausa fora de foco e limpeza restaura o cursor', () => {
  const scene = setup();
  scene.start();
  scene.advance(120_000);
  scene.advance(60_000);
  scene.hide();
  scene.advance(200_000);
  scene.show();
  scene.advance(59_999);
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), false);
  scene.advance(1);
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), true);
  scene.clear();
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), false);
});

test('dispensar o fantasma antes de dois minutos impede a skin do cursor', () => {
  const scene = setup();
  scene.start();
  scene.advance(120_000);
  scene.advance(90_000);
  scene.click();
  scene.click();
  scene.advance(30_000);
  assert.equal(scene.body.classList.contains('halloween-ghost-cursor'), false);
});
