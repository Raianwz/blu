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

function initButtonIconPicker(value) {
  const picker = document.getElementById('buttonIconPicker');
  const custom = normalizeCustomVis(value);
  picker.dataset.color = custom.color;
  picker.dataset.icon = custom.icon || '';
  document.getElementById('bCustomIcon').value = picker.dataset.icon;
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
      picker.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button === choice));
      });
    });
    picker.appendChild(choice);
  });
  updateButtonIconPickerVisibility();
}

function updateButtonIconPickerVisibility() {
  document.getElementById('buttonIconOptions').hidden = document.getElementById('bVis').value !== 'other';
}

function selectedButtonCustomVis() {
  const picker = document.getElementById('buttonIconPicker');
  return normalizeCustomVis({ color: picker.dataset.color, icon: picker.dataset.icon || null });
}
