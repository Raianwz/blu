const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'whats-new.js'), 'utf8');

test('novidades sazonais desaparecem após o encerramento do Vice City', () => {
  const end = Date.parse('2026-11-28T17:00:00-03:00');
  let now = end - 1;
  let modal = null;
  let html = '';
  const document = {
    getElementById(id) { return id === 'whatsNewModal' ? modal : null; },
    body: {
      insertAdjacentHTML(_position, value) {
        html = value;
        modal = {
          dataset: {},
          addEventListener() {},
          remove() { modal = null; }
        };
      }
    }
  };
  const context = { document, Date: { now: () => now, parse: Date.parse } };
  vm.runInNewContext(source, context);

  context.ensureWhatsNewModal();
  assert.match(html, /Rádio Vice City/);
  assert.match(html, /#BlûViceCity19/);

  now = end;
  context.ensureWhatsNewModal();
  assert.doesNotMatch(html, /Rádio Vice City|#BlûViceCity19/);
  assert.match(html, /Busca mais útil/);
});
