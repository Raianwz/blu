let editingSectionId = null;
let sectionPickerDismissPending = false;
let sectionIconSelectionTouched = false;

function sectionIconsReleased() {
  return isBluFeatureAvailable('sectionIcons');
}

function refreshSectionIconRelease() {
  const released = sectionIconsReleased();
  const enabled = getSetting('sectionIconsVisual', 'on') !== 'off';
  document.body.classList.toggle('section-icons-released', released);
  document.body.classList.toggle('section-icons-enabled', released && enabled);
  const button = document.getElementById('sectionIconsVisualBtn');
  if (button) {
    button.hidden = !released || !document.body.classList.contains('button-visual-new');
    button.classList.toggle('active', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.querySelector('.menu-btn-label').textContent = `Ícones das Seções: ${enabled ? 'ON' : 'OFF'}`;
  }
  return released;
}

function toggleSectionIconPreference() {
  if (!sectionIconsReleased() || !document.body.classList.contains('button-visual-new')) return;
  setSetting('sectionIconsVisual', getSetting('sectionIconsVisual', 'on') === 'off' ? 'on' : 'off');
  refreshSectionIconRelease();
}

refreshSectionIconRelease();

function openRenameSection(id) {
  refreshSectionIconRelease();
  const section = document.querySelector(`.section-wrap[data-id="${cssEscape(id)}"]`);
  if (!section) return;
  editingSectionId = id;
  sectionIconSelectionTouched = false;
  document.getElementById('renameSectionName').value = section.querySelector('.section-title').textContent;
  document.getElementById('renameSectionIcon').value = section.dataset.icon || section.dataset.resolvedIcon || '';
  updateSectionIconTrigger();
  openModal('renameSectionModal');
}

function updateSectionIconTrigger() {
  const icon = document.getElementById('renameSectionIcon').value;
  const trigger = document.getElementById('sectionIconTrigger');
  trigger.innerHTML = customButtonIconMarkup(icon) || '<span aria-hidden="true">＋</span>';
  trigger.title = `Ícone da seção: ${BLU_BUTTON_ICONS.find(item => item.id === icon)?.label || 'Sem ícone'}`;
}

function openSectionIconPicker() {
  if (!refreshSectionIconRelease() || !document.body.classList.contains('button-visual-new')) return;
  const picker = document.getElementById('sectionIconPicker');
  const selected = document.getElementById('renameSectionIcon').value;
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
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button-icon-choice';
    button.dataset.group = group;
    button.dataset.search = normalizeSearchText(`${entry.label} ${group} ${entry.id || ''}`);
    button.setAttribute('aria-pressed', String((entry.id || 'none') === (selected || 'none')));
    button.innerHTML = customButtonIconMarkup(entry.id);
    const label = document.createElement('span');
    label.textContent = entry.label;
    button.appendChild(label);
    button.addEventListener('click', () => {
      sectionIconSelectionTouched = true;
      document.getElementById('renameSectionIcon').value = entry.id || 'none';
      updateSectionIconTrigger();
      closeModal('sectionIconModal');
    });
    picker.appendChild(button);
  });
  document.getElementById('sectionIconSearch').value = '';
  filterSectionIcons();
  openModal('sectionIconModal');
  document.getElementById('renameSectionModal').inert = true;
  document.getElementById('sectionIconTrigger').setAttribute('aria-expanded', 'true');
}

function filterSectionIcons() {
  const query = normalizeSearchText(document.getElementById('sectionIconSearch').value.trim());
  const groups = new Set();
  document.querySelectorAll('#sectionIconPicker .button-icon-choice').forEach(button => {
    button.hidden = !button.dataset.search.includes(query);
    if (!button.hidden) groups.add(button.dataset.group);
  });
  document.querySelectorAll('#sectionIconPicker h3').forEach(heading => {
    heading.hidden = !groups.has(heading.dataset.group);
  });
  document.getElementById('sectionIconEmpty').hidden = groups.size > 0;
}

async function dismissSectionIconPicker() {
  if (sectionPickerDismissPending) return;
  sectionPickerDismissPending = true;
  const picker = document.getElementById('sectionIconModal');
  picker.inert = true;
  try {
    const discard = await confirmDialog('Deseja continuar editando? Sair agora descarta as alterações do nome e do ícone.', {
      title: 'Continuar editando a seção?', confirmText: 'Sair sem salvar',
      cancelText: 'Continuar editando', danger: true, focusCancel: true, variant: 'unsaved-changes'
    });
    if (discard) closeModal('renameSectionModal');
  } finally {
    picker.inert = false;
    sectionPickerDismissPending = false;
    if (picker.classList.contains('open')) document.getElementById('sectionIconSearch').focus();
  }
}

function saveRenamedSection() {
  const section = document.querySelector(`.section-wrap[data-id="${cssEscape(editingSectionId)}"]`);
  if (!section) { closeModal('renameSectionModal'); return; }
  const name = document.getElementById('renameSectionName').value.trim();
  if (!name) { notify('Informe o nome da seção', 'err'); return; }
  const icon = sectionIconSelectionTouched ? document.getElementById('renameSectionIcon').value : (section.dataset.icon || '');
  const resolvedIcon = resolvedSectionIcon(name, icon);
  const title = section.querySelector('.section-title');
  const previousName = title.textContent;
  if (name !== previousName || icon !== (section.dataset.icon || '')) {
    pushHistory();
    title.innerHTML = sectionTitleMarkup(name);
    section.dataset.icon = icon;
    section.dataset.resolvedIcon = resolvedIcon;
    section.querySelector('.section-custom-icon').innerHTML = customButtonIconMarkup(resolvedIcon);
    section.querySelector('.section-add-btn').title = `Adicionar botão em ${name}`;
    recordActivityEvent('updated', { target: 'section', targetId: editingSectionId, name, details: { previousName } });
    doSearch();
    updateUnsavedChangesUI();
    notify('Seção atualizada!');
  }
  closeModal('renameSectionModal');
}

// Keep keyboard navigation within the active editor or picker.
['renameSectionModal', 'sectionIconModal'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const fields = [...event.currentTarget.querySelectorAll('button, input')]
      .filter(element => !element.disabled && element.getClientRects().length);
    const first = fields[0], last = fields[fields.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
});
