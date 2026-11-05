const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'loader.js'), 'utf8');
const optionalReady = {
  'js/core/debug.js': 'toggleDebugMode',
  'libs/experiments/runtime.js': 'initBluExperiments',
  'js/data/json-tools.js': 'openJsonModal',
  'js/data/custom-export.js': 'openCustomExportModal',
  'js/ui/quick-actions.js': 'initQuickActions',
  'libs/events/vice-city/vice-city.js': 'initViceCityIntro',
  'js/features/whats-new.js': 'initWhatsNew'
};

async function runLoader({ missing = [], runtimeError = [] } = {}) {
  const loaded = [];
  const started = [];
  const warnings = [];
  const statuses = [];
  const alerts = [];
  const listeners = new Map();
  const controls = Object.fromEntries(
    ['debugModeBtn', 'advancedOrganizingBtn', 'jsonDiagnosticsBtn', 'customExportBtn']
      .map(id => [id, { hidden: true, removeAttribute() { this.hidden = false; } }])
  );
  const window = {
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) { listeners.get(name)?.delete(listener); }
  };
  const document = {
    currentScript: { src: 'https://blu.example/js/loader.js' },
    createElement() { return { dataset: {}, setAttribute(name, value) { this[name] = value; } }; },
    getElementById(id) { return controls[id] || null; },
    dispatchEvent(event) { statuses.push(event.detail); },
    body: {
      prepend(element) { alerts.push(element); },
      appendChild(script) {
        const file = new URL(script.src).pathname.slice(1);
        loaded.push(file);
        if (missing.includes(file)) {
          script.onerror();
          return;
        }
        if (file === 'js/app.js') window.BluCoreReady = true;
        if (optionalReady[file]) window[optionalReady[file]] = () => started.push(file);
        if (runtimeError.includes(file)) {
          listeners.get('error')?.forEach(listener => listener({ filename: script.src }));
        }
        script.onload();
      }
    }
  };
  class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  }
  vm.runInNewContext(source, { document, window, URL, CustomEvent,
    console: { error() {}, warn(message) { warnings.push(message); } } });
  await new Promise(resolve => setImmediate(resolve));
  return { loaded, started, warnings, statuses, alerts, controls, window };
}

test('inicia o app antes dos recursos opcionais', async () => {
  const state = await runLoader();
  const appIndex = state.loaded.indexOf('js/app.js');
  assert.ok(appIndex > 0);
  assert.ok(state.loaded.indexOf('js/core/debug.js') > appIndex);
  assert.equal(state.alerts.length, 0);
  assert.equal(state.statuses.length, 7);
  assert.ok(state.statuses.every(entry => entry.loaded));
  assert.equal(state.controls.customExportBtn.hidden, false);
  assert.ok(state.started.includes('js/features/whats-new.js'));
});

test('um recurso opcional ausente não impede os demais nem a inicialização', async () => {
  const state = await runLoader({ missing: ['js/data/custom-export.js'] });
  assert.ok(state.loaded.includes('js/app.js'));
  assert.equal(state.alerts.length, 0);
  assert.equal(state.controls.customExportBtn.hidden, true);
  assert.equal(state.controls.jsonDiagnosticsBtn.hidden, false);
  assert.equal(state.statuses.find(entry => entry.id === 'custom-export').loaded, false);
  assert.ok(state.started.includes('js/features/whats-new.js'));
});

test('erro ao executar um opcional é isolado', async () => {
  const state = await runLoader({ runtimeError: ['js/data/json-tools.js'] });
  assert.equal(state.controls.jsonDiagnosticsBtn.hidden, true);
  assert.equal(state.controls.customExportBtn.hidden, false);
  assert.equal(state.alerts.length, 0);
});

test('novidades ausentes não bloqueiam o núcleo', async () => {
  const state = await runLoader({ missing: ['js/features/whats-new.js'] });
  assert.equal(state.window.BluCoreReady, true);
  assert.equal(state.alerts.length, 0);
  assert.equal(state.statuses.find(entry => entry.id === 'whats-new').loaded, false);
});

test('falha de arquivo obrigatório impede o início e mostra aviso', async () => {
  const state = await runLoader({ missing: ['js/core/storage.js'] });
  assert.equal(state.loaded.includes('js/app.js'), false);
  assert.equal(state.alerts.length, 1);
  assert.equal(state.alerts[0].role, 'alert');
});

test('arquivos sazonais encerrados não são carregados', async () => {
  const state = await runLoader();
  assert.equal(state.loaded.some(path => path.startsWith('libs/events/halloween/')), false);
  assert.ok(state.started.includes('js/features/whats-new.js'));
  assert.equal(state.alerts.length, 0);
});
