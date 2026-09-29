const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function element() {
  const classes = new Set();
  return { value: '', textContent: '', innerHTML: '', dataset: {}, children: [], hidden: false,
    classList: { contains: name => classes.has(name), add: name => classes.add(name), remove: name => classes.delete(name) },
    setAttribute(name, value) { this[name] = value; }, focus() {},
    addEventListener(name, fn) { this[name] = fn; },
    replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); }
  };
}
const els = Object.fromEntries(['renameSectionModal', 'sectionIconModal', 'renameSectionName',
  'renameSectionIcon', 'sectionIconTrigger', 'sectionIconPicker', 'sectionIconSearch', 'sectionIconEmpty']
  .map(id => [id, element()]));
const title = element(); title.textContent = 'Original';
const icon = element(), add = element(), section = element();
section.dataset.icon = '';
section.querySelector = selector => ({ '.section-title': title, '.section-custom-icon': icon, '.section-add-btn': add })[selector];
let history = 0, discard = false;
const body = element(); body.classList.add('button-visual-new');
const ctx = vm.createContext({
  console, URL, BLU_BRAND_ICONS: [],
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
  document: { body, addEventListener() {}, getElementById: id => els[id], createElement: element,
    querySelector: () => section,
    querySelectorAll: selector => els.sectionIconPicker.children.filter(el => selector.endsWith('h3') ? !el.type : !!el.type)
  },
  cssEscape: value => value,
  openModal: id => els[id].classList.add('open'),
  closeModal: id => { els[id].classList.remove('open'); if (id === 'renameSectionModal') els.sectionIconModal.classList.remove('open'); },
  confirmDialog: async () => discard,
  pushHistory: () => history++, recordActivityEvent() {}, doSearch() {}, updateUnsavedChangesUI() {}, notify() {}
});
for (const file of ['libs/bootstrap-icons/button-icons.js', 'libs/material-icons/button-icons.js',
  'js/ui/button-icon-picker.js', 'js/core/utils.js', 'js/ui/section-icon-picker.js']) {
  let source = fs.readFileSync(file, 'utf8');
  if (file === 'js/ui/section-icon-picker.js') {
    assert(source.includes('const SECTION_ICONS_ENABLED = false;'), 'release remains disabled');
    // Exercise the dormant feature without enabling it in the application.
    source = source.replace('const SECTION_ICONS_ENABLED = false;', 'const SECTION_ICONS_ENABLED = true;');
  }
  vm.runInContext(source, ctx);
}
ctx.notify = () => {};

(async () => {
  assert.equal(vm.runInContext('sectionIconsReleased()', ctx), true);
  vm.runInContext('openRenameSection("s1"); openSectionIconPicker()', ctx);
  assert.equal(els.renameSectionModal.inert, true);
  assert(els.sectionIconPicker.children.length > 100);
  const bank = els.sectionIconPicker.children.find(el => el.dataset.search?.includes('material:account_balance '));
  const selected = bank || els.sectionIconPicker.children.find(el => el.dataset.search?.endsWith('material:account_balance'));
  assert(selected);
  selected.click();
  assert.equal(els.renameSectionIcon.value, 'material:account_balance');
  assert.equal(section.dataset.icon, '', 'selection is still a draft');
  els.renameSectionName.value = 'Bank';
  vm.runInContext('saveRenamedSection()', ctx);
  assert.equal(section.dataset.icon, 'material:account_balance');
  assert.equal(title.textContent, 'Bank');
  assert.equal(history, 1);
  assert(icon.innerHTML.includes('<svg'));
  vm.runInContext('openRenameSection("s1"); openSectionIconPicker()', ctx);
  await vm.runInContext('dismissSectionIconPicker()', ctx);
  assert(els.sectionIconModal.classList.contains('open'), 'continue keeps picker open');
  assert.equal(els.sectionIconModal.inert, false);
  els.renameSectionName.value = 'Discard me'; discard = true;
  await vm.runInContext('dismissSectionIconPicker()', ctx);
  assert(!els.renameSectionModal.classList.contains('open'));
  assert.equal(title.textContent, 'Bank', 'discard leaves saved section unchanged');
  body.classList.remove('button-visual-new');
  vm.runInContext('openRenameSection("s1"); openSectionIconPicker()', ctx);
  assert(!els.sectionIconModal.classList.contains('open'), 'classic cannot open picker');
  const state = { tags: [], sections: [{ id: 's1', name: 'Bank', icon: 'material:account_balance', buttons: [] }],
    archived: { buttons: [], sections: [{ item: { id: 's2', name: 'Archive', icon: 'material:work', buttons: [] } }] } };
  ctx.inputState = state;
  const normalized = vm.runInContext('normalizeImportedData(inputState)', ctx);
  assert.equal(normalized.sections[0].icon, 'material:account_balance');
  assert.equal(normalized.archived.sections[0].item.icon, 'material:work');
  const storage = fs.readFileSync('js/core/storage.js', 'utf8');
  vm.runInContext(storage.slice(storage.indexOf('function createStateSnapshot('), storage.indexOf('function getCurrentStateSnapshot(')), ctx);
  const before = vm.runInContext('createStateSnapshot(inputState).comparableStateString', ctx);
  state.sections[0].icon = 'material:work';
  const after = vm.runInContext('createStateSnapshot(inputState).comparableStateString', ctx);
  assert.notEqual(before, after, 'icon-only changes invalidate the saved/share snapshot');
  console.log('PASS: picker draft/save/discard, classic guard, and active/archived import persistence');
})().catch(error => { console.error(error); process.exitCode = 1; });
