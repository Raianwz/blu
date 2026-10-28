const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'halloween.js'), 'utf8')
  .split('function activateHalloweenLivingEye()')[0];

function setup() {
  let now = 0;
  let visible = true;
  const classes = () => {
    const names = new Set();
    return {
      contains: name => names.has(name),
      add: name => names.add(name),
      remove: name => names.delete(name),
      toggle: (name, enabled) => enabled ? names.add(name) : names.delete(name)
    };
  };
  const buttonClasses = classes();
  const copyButton = { getBoundingClientRect: () => ({ left: 20, top: 30, width: 100 }) };
  const button = {
    dataset: { id: 'b1' }, classList: buttonClasses, isConnected: true,
    querySelector: selector => selector === '.copy-btn' ? copyButton : null
  };
  const body = {
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    appendChild(element) { this.spider = element; }
  };
  const sectionClasses = classes();
  const section = {
    classList: sectionClasses,
    getClientRects: () => [1],
    querySelector: selector => selector === '.section-body' ? body : null,
    querySelectorAll: () => buttonClasses.contains('halloween-webbed') ? [] : [button]
  };
  const themeClasses = classes();
  themeClasses.add('halloween-theme');
  const document = {
    body: { classList: themeClasses },
    get visibilityState() { return visible ? 'visible' : 'hidden'; },
    querySelectorAll: selector => selector === '#sections > .section-wrap' ? [section] : [],
    createElement: () => ({ style: {}, setAttribute() {}, remove() { this.removed = true; } }),
    addEventListener() {}
  };
  const window = { matchMedia: () => ({ matches: false }), addEventListener() {} };
  const clock = { now: () => now };
  const context = vm.createContext({ document, window, Date: clock, Map, WeakSet, Math, setInterval() {}, clearTimeout() {} });
  vm.runInContext(source, context);
  return {
    tick(ms) { now += ms; vm.runInContext('syncHalloweenSectionSpiders()', context); },
    body, buttonClasses, sectionClasses,
    setVisible(value) { visible = value; vm.runInContext('halloweenSectionSpiders.forEach(state => { state.lastTick = Date.now(); })', context); }
  };
}

test('só aparece após 60 segundos abertos e cria teia após mais 30 segundos', () => {
  const scene = setup();
  scene.tick(0);
  scene.tick(59_999);
  assert.equal(scene.body.spider, undefined);
  scene.tick(1);
  assert.ok(scene.body.spider);
  scene.tick(29_999);
  assert.equal(scene.buttonClasses.contains('halloween-webbed'), false);
  scene.tick(1);
  assert.equal(scene.buttonClasses.contains('halloween-webbed'), true);
});

test('fechar a seção reinicia a espera e ocultar a aba pausa o tempo', () => {
  const scene = setup();
  scene.tick(0);
  scene.tick(40_000);
  scene.sectionClasses.add('collapsed');
  scene.tick(1_000);
  scene.sectionClasses.remove('collapsed');
  scene.tick(59_000);
  assert.equal(scene.body.spider, undefined);
  scene.setVisible(false);
  scene.tick(90_000);
  scene.setVisible(true);
  scene.tick(1_000);
  assert.ok(scene.body.spider);
});

test('seção exibida pela busca conta; resultado oculto interrompe a espera', () => {
  const scene = setup();
  scene.tick(0);
  scene.sectionClasses.add('search-hidden');
  scene.tick(50_000);
  scene.sectionClasses.remove('search-hidden');
  scene.tick(59_999);
  assert.equal(scene.body.spider, undefined);
  scene.tick(1);
  assert.ok(scene.body.spider);
});
