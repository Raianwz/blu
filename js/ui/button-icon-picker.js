// Appearance is optional and never changes visibility permissions.
const BLU_BUTTON_ICONS = Object.freeze([...BLU_BRAND_ICONS, ...BLU_BOOTSTRAP_ICONS]);

const BLU_OTHER_COLORS = Object.freeze([
  { color: '#7C3AED', label: 'Roxo' },
  { color: '#15803D', label: 'Verde' },
  { color: '#0F766E', label: 'Turquesa' },
  { color: '#C2410C', label: 'Laranja' },
  { color: '#BE185D', label: 'Rosa' },
  { color: '#4338CA', label: 'Índigo' }
]);

const BLU_OTHER_GRADIENTS = Object.freeze([
  { color: 'legacy-gradient', label: 'Gradiente padrão', background: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { color: 'gradient-aurora', label: 'Gradiente aurora', background: 'linear-gradient(135deg, #5B21B6, #9D174D)' },
  { color: 'gradient-forest', label: 'Gradiente floresta', background: 'linear-gradient(135deg, #166534, #0F766E)' },
  { color: 'gradient-ember', label: 'Gradiente brasa', background: 'linear-gradient(135deg, #9A3412, #9D174D)' },
  { color: 'gradient-night', label: 'Gradiente noite', background: 'linear-gradient(135deg, #312E81, #164E63)' }
]);

function normalizeCustomVis(value) {
  const requestedIcon = value?.icon === 'bootstrap:bluetooth' ? 'blu:b' : value?.icon;
  const icon = BLU_BUTTON_ICONS.some(entry => entry.id === requestedIcon) ? requestedIcon : null;
  let color = BLU_OTHER_GRADIENTS.find(entry => entry.color === value?.color)?.color
    || BLU_OTHER_COLORS.find(entry => entry.color.toLowerCase() === String(value?.color || '').toLowerCase())?.color || null;
  // Earlier icon-only records carried purple even when no color was chosen.
  const colorSelected = Boolean(color && (value?.colorSelected === true || color !== '#7C3AED'));
  if (!colorSelected) color = null;
  return { color, icon, colorSelected };
}

function otherButtonBackground(value) {
  const color = normalizeCustomVis(value).color;
  return BLU_OTHER_GRADIENTS.find(entry => entry.color === color)?.background || color;
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
  if (!entry) return '';
  const content = entry.src
    ? `<image href="${new URL(entry.src, document.baseURI).href}" width="16" height="16"/>`
    : entry.paths;
  return `<svg class="${className}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${content}</svg>`;
}

function toggleButtonIconPicker() {
  document.getElementById('buttonIconSearch').value = '';
  filterButtonIconPicker();
  openModal('buttonIconModal');
  document.getElementById('buttonIconTrigger').setAttribute('aria-expanded', 'true');
}

function filterButtonIconPicker() {
  const query = normalizeSearchText(document.getElementById('buttonIconSearch').value.trim());
  const picker = document.getElementById('buttonIconPicker');
  const visibleGroups = new Set();
  let visibleCount = 0;
  picker.querySelectorAll('.button-icon-choice').forEach(choice => {
    choice.hidden = !choice.dataset.search.includes(query);
    if (!choice.hidden) {
      visibleGroups.add(choice.dataset.group);
      visibleCount++;
    }
  });
  picker.querySelectorAll('.button-icon-group-title').forEach(heading => {
    heading.hidden = !visibleGroups.has(heading.dataset.group);
  });
  picker.querySelector('.button-icon-empty').hidden = visibleCount > 0;
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
  const entry = [...BLU_OTHER_COLORS, ...BLU_OTHER_GRADIENTS].find(item => item.color === color);
  document.getElementById('buttonColorTriggerText').textContent = entry?.label || 'Cor padrão';
  document.getElementById('buttonColorTriggerPreview').style.background = entry?.background || entry?.color
    || (document.body.classList.contains('button-visual-new') ? '#7C3AED' : BLU_OTHER_GRADIENTS[0].background);
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
  let previousGroup = '';
  [{ id: null, label: 'Sem ícone' }, ...BLU_BUTTON_ICONS].forEach(entry => {
    const group = entry.group || '';
    if (group && group !== previousGroup) {
      const heading = document.createElement('h3');
      heading.className = 'button-icon-group-title';
      heading.dataset.group = group;
      heading.textContent = group;
      picker.appendChild(heading);
    }
    previousGroup = group;
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'button-icon-choice';
    choice.dataset.icon = entry.id || '';
    choice.dataset.group = group;
    choice.dataset.search = normalizeSearchText(`${entry.label} ${group} ${entry.id || ''}`);
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
  const empty = document.createElement('p');
  empty.className = 'button-icon-empty';
  empty.setAttribute('role', 'status');
  empty.textContent = 'Nenhum ícone encontrado.';
  empty.hidden = true;
  picker.appendChild(empty);
  filterButtonIconPicker();
  updateButtonIconPickerVisibility();
  updateButtonColorPicker();
}

function updateButtonColorPicker() {
  const picker = document.getElementById('buttonColorPicker');
  const selected = document.getElementById('buttonIconPicker').dataset.color;
  picker.replaceChildren();
  [{ color: '', label: 'Padrão' }, ...BLU_OTHER_COLORS, ...BLU_OTHER_GRADIENTS].forEach(entry => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'button-color-choice';
    choice.title = entry.label;
    choice.setAttribute('aria-label', entry.label);
    choice.setAttribute('aria-pressed', String(entry.color === selected));
    const swatch = document.createElement('span');
    swatch.className = 'button-color-swatch';
    swatch.style.background = entry.background || entry.color || 'var(--surface)';
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
