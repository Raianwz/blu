// Appearance is optional and never changes visibility permissions.
const BLU_OTHER_COLORS = Object.freeze([
  { color: '#7C3AED', label: 'Roxo' },
  { color: '#15803D', label: 'Verde' },
  { color: '#0F766E', label: 'Turquesa' },
  { color: '#C2410C', label: 'Laranja' },
  { color: '#BE185D', label: 'Rosa' },
  { color: '#4338CA', label: 'Índigo' }
]);

function normalizeCustomVis(value) {
  const icon = BLU_BUTTON_ICONS.some(entry => entry.id === value?.icon) ? value.icon : null;
  let color = value?.color === 'legacy-gradient' ? 'legacy-gradient'
    : BLU_OTHER_COLORS.find(entry => entry.color.toLowerCase() === String(value?.color || '').toLowerCase())?.color || null;
  // Earlier icon-only records carried purple even when no color was chosen.
  const colorSelected = Boolean(color && (value?.colorSelected === true || color !== '#7C3AED'));
  if (!colorSelected) color = null;
  return { color, icon, colorSelected };
}

function otherButtonBackground(value) {
  const color = normalizeCustomVis(value).color;
  if (color === 'legacy-gradient') return 'linear-gradient(135deg, #667eea, #764ba2)';
  return color;
}

function applyOtherButtonColor(element, visibility, value) {
  if (visibility !== 'other') return;
  const background = otherButtonBackground(value);
  if (background) element.style.setProperty('--other-button-bg', background);
}

function customVisFromElement(element) {
  try { return normalizeCustomVis(JSON.parse(element?.dataset.customVis || '{}')); }
  catch { return normalizeCustomVis(null); }
}

function customButtonIconMarkup(id, className = '') {
  const entry = BLU_BUTTON_ICONS.find(item => item.id === id);
  return entry ? `<svg class="${className}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${entry.paths}</svg>` : '';
}

function toggleButtonIconPicker() {
  document.getElementById('buttonIconSearch').value = '';
  filterButtonIconPicker();
  openModal('buttonIconModal');
  document.getElementById('buttonIconTrigger').setAttribute('aria-expanded', 'true');
}

function filterButtonIconPicker() {
  const query = document.getElementById('buttonIconSearch').value.trim().toLocaleLowerCase('pt-BR');
  document.querySelectorAll('#buttonIconPicker .button-icon-choice').forEach(choice => {
    choice.hidden = !choice.title.toLocaleLowerCase('pt-BR').includes(query);
  });
}

function openButtonColorPicker() {
  openModal('buttonColorModal');
  document.getElementById('buttonColorTrigger').setAttribute('aria-expanded', 'true');
  document.querySelector('#buttonColorPicker [aria-pressed="true"]')?.focus();
}

function updateButtonIconTrigger(icon) {
  const entry = BLU_BUTTON_ICONS.find(item => item.id === icon);
  document.getElementById('buttonIconTriggerPreview').innerHTML = customButtonIconMarkup(icon);
  document.getElementById('buttonIconTriggerText').textContent = entry?.label || 'Sem ícone';
}

function updateButtonColorTrigger(color) {
  const entry = BLU_OTHER_COLORS.find(item => item.color === color);
  const label = color === 'legacy-gradient' ? 'Gradiente antigo' : entry?.label || 'Cor padrão';
  document.getElementById('buttonColorTriggerText').textContent = label;
  document.getElementById('buttonColorTriggerPreview').style.background = color === 'legacy-gradient'
    ? 'linear-gradient(135deg, #667eea, #764ba2)' : entry?.color
      || (document.body.classList.contains('button-visual-new') ? '#7C3AED' : 'linear-gradient(135deg, #667eea, #764ba2)');
}

function initButtonIconPicker(value) {
  const picker = document.getElementById('buttonIconPicker');
  const custom = normalizeCustomVis(value);
  picker.dataset.color = custom.color || '';
  document.getElementById('bCustomColor').value = picker.dataset.color;
  picker.dataset.icon = custom.icon || '';
  document.getElementById('bCustomIcon').value = picker.dataset.icon;
  updateButtonIconTrigger(custom.icon);
  updateButtonColorTrigger(custom.color);
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
      closeModal('buttonIconModal');
    });
    picker.appendChild(choice);
  });
  updateButtonIconPickerVisibility();
  updateButtonColorPicker();
}

function updateButtonColorPicker() {
  const picker = document.getElementById('buttonColorPicker');
  const selected = document.getElementById('buttonIconPicker').dataset.color;
  picker.replaceChildren();
  [{ color: '', label: 'Padrão' }, ...BLU_OTHER_COLORS, { color: 'legacy-gradient', label: 'Gradiente antigo' }].forEach(entry => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'button-color-choice';
    choice.title = entry.label;
    choice.setAttribute('aria-label', entry.label);
    choice.setAttribute('aria-pressed', String(entry.color === selected));
    const swatch = document.createElement('span');
    swatch.className = 'button-color-swatch';
    swatch.style.background = entry.color === 'legacy-gradient'
      ? 'linear-gradient(135deg, #667eea, #764ba2)' : entry.color || 'var(--surface)';
    const label = document.createElement('span');
    label.textContent = entry.label;
    choice.append(swatch, label);
    choice.addEventListener('click', () => {
      document.getElementById('buttonIconPicker').dataset.color = entry.color;
      document.getElementById('bCustomColor').value = entry.color;
      updateButtonColorTrigger(entry.color);
      picker.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button === choice));
      });
      closeModal('buttonColorModal');
    });
    picker.appendChild(choice);
  });
}

function updateButtonIconPickerVisibility() {
  const visible = document.getElementById('bVis').value === 'other';
  document.getElementById('buttonIconOptions').hidden = !visible;
  if (!visible) {
    closeModal('buttonIconModal');
    closeModal('buttonColorModal');
  }
}

function selectedButtonCustomVis() {
  const picker = document.getElementById('buttonIconPicker');
  return normalizeCustomVis({ color: picker.dataset.color || null, icon: picker.dataset.icon || null, colorSelected: !!picker.dataset.color });
}
