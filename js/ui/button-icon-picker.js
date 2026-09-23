// Appearance is optional and never changes visibility permissions.
function normalizeCustomVis(value) {
  const icon = BLU_BUTTON_ICONS.some(entry => entry.id === value?.icon) ? value.icon : null;
  const color = /^#[0-9a-f]{6}$/i.test(value?.color || '') ? value.color : '#7C3AED';
  return { color, icon };
}

function customVisFromElement(element) {
  try { return normalizeCustomVis(JSON.parse(element?.dataset.customVis || '{}')); }
  catch { return normalizeCustomVis(null); }
}

function customButtonIconMarkup(id, className = '') {
  const entry = BLU_BUTTON_ICONS.find(item => item.id === id);
  return entry ? `<svg class="${className}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${entry.paths}</svg>` : '';
}

function closeButtonIconPicker({ focusTrigger = false } = {}) {
  const picker = document.getElementById('buttonIconPicker');
  const trigger = document.getElementById('buttonIconTrigger');
  if (!picker || !trigger || picker.hidden) return;
  picker.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  if (focusTrigger) trigger.focus();
}

function toggleButtonIconPicker() {
  const picker = document.getElementById('buttonIconPicker');
  if (!picker.hidden) {
    closeButtonIconPicker();
    return;
  }
  picker.hidden = false;
  document.getElementById('buttonIconTrigger').setAttribute('aria-expanded', 'true');
  picker.querySelector('[aria-pressed="true"]')?.focus();
}

function updateButtonIconTrigger(icon) {
  const entry = BLU_BUTTON_ICONS.find(item => item.id === icon);
  document.getElementById('buttonIconTriggerPreview').innerHTML = customButtonIconMarkup(icon);
  document.getElementById('buttonIconTriggerText').textContent = entry?.label || 'Sem ícone';
}

function initButtonIconPicker(value) {
  const picker = document.getElementById('buttonIconPicker');
  const custom = normalizeCustomVis(value);
  picker.dataset.color = custom.color;
  picker.dataset.icon = custom.icon || '';
  document.getElementById('bCustomIcon').value = picker.dataset.icon;
  closeButtonIconPicker();
  updateButtonIconTrigger(custom.icon);
  picker.replaceChildren();
  [{ id: null, label: 'Sem ícone' }, ...BLU_BUTTON_ICONS].forEach(entry => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'button-icon-choice';
    choice.dataset.icon = entry.id || '';
    choice.title = entry.label;
    choice.setAttribute('aria-pressed', String(entry.id === custom.icon));
    choice.innerHTML = customButtonIconMarkup(entry.id);
    const label = document.createElement('span');
    label.textContent = entry.label;
    choice.appendChild(label);
    choice.addEventListener('click', () => {
      picker.dataset.icon = entry.id || '';
      document.getElementById('bCustomIcon').value = picker.dataset.icon;
      updateButtonIconTrigger(entry.id);
      picker.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button === choice));
      });
      closeButtonIconPicker({ focusTrigger: true });
    });
    picker.appendChild(choice);
  });
  updateButtonIconPickerVisibility();
}

function updateButtonIconPickerVisibility() {
  const visible = document.getElementById('bVis').value === 'other';
  document.getElementById('buttonIconOptions').hidden = !visible;
  if (!visible) closeButtonIconPicker();
}

document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.button-icon-picker-wrap')) closeButtonIconPicker();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || document.getElementById('buttonIconPicker')?.hidden !== false) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeButtonIconPicker({ focusTrigger: true });
}, true);

function selectedButtonCustomVis() {
  const picker = document.getElementById('buttonIconPicker');
  return normalizeCustomVis({ color: picker.dataset.color, icon: picker.dataset.icon || null });
}
