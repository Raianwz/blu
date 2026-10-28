const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'feature-release.js'), 'utf8');
const context = vm.createContext({ window: { location: { hostname: 'blu.rwz.app' } }, Date });
vm.runInContext(source, context);
const available = date => vm.runInContext(`isBluFeatureAvailable('halloween', new Date('${date}'))`, context);
const farewell = date => vm.runInContext(`isHalloweenFarewellTime(new Date('${date}'))`, context);

test('Halloween de 2026 termina exatamente em 02/11 às 20h de São Paulo', () => {
  assert.equal(available('2026-10-01T02:59:59Z'), false);
  assert.equal(available('2026-10-01T03:00:00Z'), true);
  assert.equal(available('2026-11-02T22:59:59Z'), true);
  assert.equal(available('2026-11-02T23:00:00Z'), false);
  assert.equal(available('2026-11-03T00:00:00Z'), false);
});

test('despedida aparece somente no último dia da temporada', () => {
  assert.equal(farewell('2026-11-02T02:59:59Z'), false);
  assert.equal(farewell('2026-11-02T03:00:00Z'), true);
  assert.equal(farewell('2026-11-02T22:59:59Z'), true);
  assert.equal(farewell('2026-11-02T23:00:00Z'), false);
});

test('localhost continua permitindo prévia fora da janela pública', () => {
  context.window.location.hostname = 'localhost';
  assert.equal(available('2026-11-03T00:00:00Z'), true);
});
