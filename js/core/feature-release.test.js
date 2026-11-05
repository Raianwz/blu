const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'feature-release.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);

test('libera somente recursos registrados no núcleo', () => {
  assert.equal(vm.runInContext("isBluFeatureAvailable('sectionIcons')", context), true);
  assert.equal(vm.runInContext("isBluFeatureAvailable('halloween')", context), false);
  assert.equal(vm.runInContext("isBluFeatureAvailable('unknown')", context), false);
});
