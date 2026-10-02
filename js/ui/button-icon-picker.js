// Appearance is optional and never changes visibility permissions.
const BLU_BUTTON_ICONS = Object.freeze((() => {
  const groups = new Map();
  const groupOrder = ['', 'Mensagens e textos', 'Livros e conhecimento', 'Organização',
    'Estrelas e marcadores', 'Avisos e ferramentas', 'Sinais', 'Reações',
    'Ideias e energia', 'Dispositivos', 'Aplicativos', 'Dados', 'Redes e serviços'];
  const familyOrder = {
    'Estrelas e marcadores': ['bootstrap:star', 'bootstrap:star-fill', 'bootstrap:star-half',
      'material:kid_star_out', 'material:kid_star_fill', 'bootstrap:bookmark-star', 'bootstrap:bookmark-star-fill'],
    'Sinais': ['bootstrap:ban', 'material:block', 'material:do_not_disturb_off',
      'bootstrap:dash-lg', 'bootstrap:dash-circle', 'bootstrap:dash-circle-fill', 'bootstrap:dash-circle-dotted',
      'bootstrap:x', 'bootstrap:x-lg', 'bootstrap:x-circle', 'bootstrap:x-circle-fill', 'material:cancel']
  };
  [...BLU_BRAND_ICONS, ...BLU_BOOTSTRAP_ICONS, ...BLU_MATERIAL_ICONS, ...BLU_APP_ICONS].forEach(entry => {
    const group = entry.group || '';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(entry);
  });
  // New groups and icons remain visible even when not explicitly ordered here.
  const orderedGroups = [...new Set([...groupOrder, ...groups.keys()])];
  return orderedGroups.flatMap(group => {
    const entries = groups.get(group) || [];
    const order = familyOrder[group];
    if (!order) return entries;
    const rank = entry => order.includes(entry.id) ? order.indexOf(entry.id) : order.length;
    return entries.sort((a, b) => rank(a) - rank(b));
  });
})());

const BLU_OTHER_COLORS = Object.freeze([
  { color: '#7C3AED', label: 'Roxo' },
  { color: '#15803D', label: 'Verde' },
  { color: '#0F766E', label: 'Turquesa' },
  { color: '#C2410C', label: 'Laranja' },
  { color: '#B91C1C', label: 'Vermelho' },
  { color: '#856B00', label: 'Amarelo' },
  { color: '#BE185D', label: 'Rosa' },
  { color: '#4338CA', label: 'Índigo' },
  { color: '#3B3330', label: 'Carvão' },
  { color: '#881337', label: 'Vinho' },
  { color: '#596515', label: 'Oliva' },
  { color: '#70452E', label: 'Café' },
  { color: '#A21CAF', label: 'Magenta' }
]);

const BLU_OTHER_GRADIENTS = Object.freeze([
  { color: 'legacy-gradient', label: 'Gradiente padrão', background: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { color: 'gradient-aurora', label: 'Gradiente aurora', background: 'linear-gradient(135deg, #5B21B6, #9D174D)' },
  { color: 'gradient-forest', label: 'Gradiente floresta', background: 'linear-gradient(135deg, #166534, #0F766E)' },
  { color: 'gradient-ember', label: 'Gradiente brasa', background: 'linear-gradient(135deg, #9A3412, #9D174D)' },
  { color: 'gradient-gold', label: 'Gradiente dourado', background: 'linear-gradient(135deg, #996100, #AD5300)' },
  { color: 'gradient-ocean', label: 'Gradiente oceano', background: 'linear-gradient(135deg, #0F766E, #4338CA)' },
  { color: 'gradient-night', label: 'Gradiente noite', background: 'linear-gradient(135deg, #312E81, #164E63)' },
  { color: 'gradient-vineyard', label: 'Gradiente vinhedo', background: 'linear-gradient(135deg, #86198F, #881337)' },
  { color: 'gradient-autumn', label: 'Gradiente outono', background: 'linear-gradient(135deg, #966400, #A13621)' },
  { color: 'gradient-moss', label: 'Gradiente musgo', background: 'linear-gradient(135deg, #657018, #285438)' },
  { color: 'gradient-cocoa', label: 'Gradiente cacau', background: 'linear-gradient(135deg, #825438, #45271D)' }
]);

function normalizeCustomVis(value) {
  const requestedIcon = value?.icon === 'bootstrap:bluetooth' ? 'blu:b' : value?.icon;
  const icon = BLU_BUTTON_ICONS.some(entry => entry.id === requestedIcon) ? requestedIcon : null;
  const savedColor = String(value?.color || '').toLowerCase();
  // Keep existing yellow buttons when refining the palette.
  const requestedColor = savedColor === '#806700' ? '#856b00' : savedColor;
  let color = BLU_OTHER_GRADIENTS.find(entry => entry.color === requestedColor)?.color
    || BLU_OTHER_COLORS.find(entry => entry.color.toLowerCase() === requestedColor)?.color || null;
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
  return `<svg class="${className}" viewBox="${entry.viewBox || '0 0 16 16'}" fill="currentColor" aria-hidden="true">${content}</svg>`;
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
  updateButtonColorPicker();
  updateButtonColorTrigger(document.getElementById('buttonIconPicker').dataset.color || '');
  openModal('buttonColorModal');
  document.getElementById('buttonColorTrigger').setAttribute('aria-expanded', 'true');
  document.querySelector('#buttonColorPicker [aria-pressed="true"]')?.focus();
}

function updateButtonIconTrigger(icon) {
  const entry = BLU_BUTTON_ICONS.find(item => item.id === icon);
  document.getElementById('buttonIconTriggerPreview').innerHTML = customButtonIconMarkup(icon);
  document.getElementById('buttonIconTriggerText').textContent = entry?.label || 'Sem ícone';
}

function defaultOtherButtonColor() {
  return document.body.classList.contains('button-visual-new')
    ? BLU_OTHER_COLORS[0] : BLU_OTHER_GRADIENTS[0];
}

function updateButtonColorTrigger(color) {
  const defaultColor = defaultOtherButtonColor();
  const entry = color === defaultColor.color ? null
    : [...BLU_OTHER_COLORS, ...BLU_OTHER_GRADIENTS].find(item => item.color === color);
  document.getElementById('buttonColorTriggerText').textContent = entry?.label || 'Cor padrão';
  document.getElementById('buttonColorTriggerPreview').style.background = entry?.background || entry?.color
    || defaultColor.background || defaultColor.color;
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
  const defaultColor = defaultOtherButtonColor();
  const savedColor = document.getElementById('buttonIconPicker').dataset.color || '';
  const selected = savedColor === defaultColor.color ? '' : savedColor;
  const options = [
    { color: '', label: 'Padrão', background: defaultColor.background || defaultColor.color },
    ...[...BLU_OTHER_COLORS, ...BLU_OTHER_GRADIENTS].filter(entry => entry.color !== defaultColor.color)
  ];
  picker.replaceChildren();
  options.forEach(entry => {
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
