// Share selection is local UI state; it never edits the user's content.
let shareSelection = { mode: 'all', includeArchived: false, items: [] };
let shareOptionsDraft = null;
let shareOptionsInitial = '';
let shareOptionsSource = null;
let shareOptionsGroups = [];
let shareOptionsExpansion = null;
let shareOptionsDismissPending = false;

function readShareSelection(value, includeArchived = false) {
  return {
    mode: value?.mode === 'custom' ? 'custom' : 'all',
    includeArchived: !!includeArchived,
    items: Array.isArray(value?.items) ? value.items.filter(key => typeof key === 'string') : []
  };
}

function shareSelectionSignature(selection) {
  return JSON.stringify({ mode: selection.mode, includeArchived: selection.includeArchived,
    items: selection.mode === 'custom' ? [...selection.items].sort() : [] });
}

function shareSelectionGroups(state) {
  const groups = [];
  const occurrences = new Map();
  const key = (...parts) => {
    const base = JSON.stringify(parts);
    const occurrence = occurrences.get(base) || 0;
    occurrences.set(base, occurrence + 1);
    return JSON.stringify([base, occurrence]);
  };
  const sectionGroup = (section, kind, record = null) => {
    const groupKey = key(kind, section.id, record?.archivedAt || '');
    groups.push({ key: groupKey, kind, section, record, name: section.name,
      archived: kind !== 'section',
      buttons: section.buttons.map(button => ({key: key(groupKey, button.id), button})) });
  };
  state.sections.forEach(section => sectionGroup(section, 'section'));
  (state.archived?.sections || []).forEach(record => sectionGroup(record.item, 'archived-section', record));
  const looseGroups = new Map();
  (state.archived?.buttons || []).forEach(record => {
    const parent = JSON.stringify([record.sectionId, record.sectionName]);
    if (!looseGroups.has(parent)) {
      const group = {key: key('archived-buttons', parent), kind: 'archived-buttons',
        name: record.sectionName || 'Botões arquivados', archived: true, buttons: []};
      looseGroups.set(parent, group);
      groups.push(group);
    }
    const group = looseGroups.get(parent);
    group.buttons.push({key: key(group.key, record.item.id, record.archivedAt), button: record.item, record});
  });
  return groups;
}

function shareGroupKeys(group) {
  return group.buttons.length ? group.buttons.map(row => row.key) : [group.key];
}

function buildSelectedShareState(source, selection) {
  const state = JSON.parse(JSON.stringify(source));
  if (selection.mode !== 'custom') {
    if (!selection.includeArchived) state.archived = {buttons: [], sections: []};
    return state;
  }
  const selected = new Set(selection.items);
  const result = { tags: [], sections: [], archived: {buttons: [], sections: []} };
  const tags = new Set();
  shareSelectionGroups(state).forEach(group => {
    if (group.archived && !selection.includeArchived) return;
    const rows = group.buttons.filter(row => selected.has(row.key));
    if (!rows.length && (group.buttons.length || !selected.has(group.key))) return;
    rows.forEach(row => { if (row.button.tag) tags.add(row.button.tag); });
    if (group.kind === 'archived-buttons') {
      result.archived.buttons.push(...rows.map(row => row.record));
    } else {
      const section = {...group.section, buttons: rows.map(row => row.button)};
      if (group.kind === 'section') result.sections.push(section);
      else result.archived.sections.push({...group.record, item: section});
    }
  });
  result.tags = [...tags].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return result;
}

function shareStateCounts(state) {
  const archivedSections = state.archived?.sections || [];
  const archivedButtons = state.archived?.buttons || [];
  const buttons = [...state.sections.flatMap(section => section.buttons),
    ...archivedSections.flatMap(record => record.item.buttons), ...archivedButtons.map(record => record.item)];
  return {sections: state.sections.length + archivedSections.length, buttons: buttons.length,
    private: buttons.filter(button => button.vis === 'private').length,
    archived: archivedSections.length + archivedButtons.length};
}

function shareStateHasItems(state) {
  const counts = shareStateCounts(state);
  return counts.sections > 0 || counts.buttons > 0;
}

function openShareOptions() {
  if (shareRequestPending || document.getElementById('shareOptionsModal').classList.contains('open')) return;
  shareOptionsSource = JSON.parse(JSON.stringify(getCurrentStateSnapshot().state));
  shareOptionsGroups = shareSelectionGroups(shareOptionsSource);
  shareOptionsDraft = {...shareSelection, items: new Set(shareSelection.mode === 'custom'
    ? shareSelection.items : shareOptionsGroups.flatMap(shareGroupKeys))};
  shareOptionsInitial = shareSelectionSignature(shareOptionsDraft);
  shareOptionsExpansion = null;
  document.getElementById('shareOptionsSearch').value = '';
  document.getElementById('shareOptionsArchived').checked = shareOptionsDraft.includeArchived;
  document.getElementById('shareOptionsArchiveLabel').hidden = !shareOptionsGroups.some(group => group.archived);
  document.getElementById('shareOptionsError').textContent = '';
  const tree = document.getElementById('shareOptionsTree');
  tree.replaceChildren();
  shareOptionsGroups.forEach(group => {
    group.expanded = true;
    group.element = document.createElement('section');
    group.element.className = 'share-selection-group';
    const header = document.createElement('div');
    header.className = 'share-selection-header';
    group.checkbox = document.createElement('input');
    group.checkbox.type = 'checkbox';
    group.checkbox.setAttribute('aria-label', `Selecionar ${group.name} e seus botões`);
    group.checkbox.addEventListener('change', () => {
      shareGroupKeys(group).forEach(key => setShareDraftItem(key, group.checkbox.checked));
      syncShareOptionsChecks();
    });
    group.toggle = document.createElement('button');
    group.toggle.type = 'button';
    group.toggle.className = 'share-section-toggle';
    group.toggle.addEventListener('click', () => {
      group.expanded = !group.expanded;
      updateShareGroupExpansion(group);
    });
    header.append(group.checkbox, group.toggle);
    if (group.archived) {
      const badge = document.createElement('small');
      badge.textContent = 'Arquivado';
      header.append(badge);
    }
    group.list = document.createElement('div');
    group.list.className = 'share-selection-buttons';
    group.buttons.forEach(row => {
      row.element = document.createElement('label');
      row.checkbox = document.createElement('input');
      row.checkbox.type = 'checkbox';
      row.checkbox.addEventListener('change', () => {
        setShareDraftItem(row.key, row.checkbox.checked);
        syncShareOptionsChecks();
      });
      const text = document.createElement('span');
      text.textContent = row.button.name || 'Botão sem nome';
      const tag = document.createElement('small');
      tag.textContent = [row.button.tag, row.button.vis === 'private' ? 'Privado' : ''].filter(Boolean).join(' · ');
      row.element.append(row.checkbox, text, tag);
      group.list.append(row.element);
    });
    if (!group.buttons.length) group.list.textContent = 'Seção vazia';
    group.element.append(header, group.list);
    tree.append(group.element);
    updateShareGroupExpansion(group);
  });
  setShareOptionsMode(shareOptionsDraft.mode);
  filterShareOptions();
  document.getElementById('shareModal').inert = true;
  openModal('shareOptionsModal');
  document.getElementById('shareOptionsGear').setAttribute('aria-expanded', 'true');
}

function updateShareGroupExpansion(group) {
  group.list.hidden = !group.expanded;
  group.toggle.textContent = `${group.expanded ? '▾' : '▸'} ${group.name} (${group.buttons.length})`;
  group.toggle.setAttribute('aria-expanded', String(group.expanded));
}

function setShareDraftItem(key, checked) {
  if (checked) shareOptionsDraft.items.add(key);
  else shareOptionsDraft.items.delete(key);
}

function setShareOptionsMode(mode) {
  shareOptionsDraft.mode = mode;
  document.getElementById('shareOptionsCustom').hidden = mode !== 'custom';
  document.querySelectorAll('[name="shareOptionsMode"]').forEach(input => { input.checked = input.value === mode; });
  syncShareOptionsChecks();
}

function syncShareOptionsChecks() {
  shareOptionsGroups.forEach(group => {
    const keys = shareGroupKeys(group);
    const count = keys.filter(key => shareOptionsDraft.items.has(key)).length;
    group.checkbox.checked = count === keys.length;
    group.checkbox.indeterminate = count > 0 && count < keys.length;
    group.buttons.forEach(row => { row.checkbox.checked = shareOptionsDraft.items.has(row.key); });
  });
  const counts = shareStateCounts(buildSelectedShareState(shareOptionsSource, shareOptionsDraft));
  document.getElementById('shareOptionsSummary').textContent = `${counts.sections} seção(ões) · ${counts.buttons} botão(ões) selecionado(s)`;
  document.getElementById('shareOptionsError').textContent = '';
}

function filterShareOptions() {
  const raw = document.getElementById('shareOptionsSearch').value.trim();
  const sectionSearch = raw.startsWith('@');
  const query = normalizeSearchText(sectionSearch ? raw.slice(1) : raw);
  if (raw && !shareOptionsExpansion) shareOptionsExpansion = new Map(shareOptionsGroups.map(group => [group.key, group.expanded]));
  if (!raw && shareOptionsExpansion) {
    shareOptionsGroups.forEach(group => { group.expanded = shareOptionsExpansion.get(group.key); });
    shareOptionsExpansion = null;
  }
  let visible = 0;
  shareOptionsGroups.forEach(group => {
    const sectionMatch = normalizeSearchText(group.name).includes(query);
    group.buttons.forEach(row => {
      row.element.hidden = !!raw && !(sectionSearch ? sectionMatch
        : normalizeSearchText(`${row.button.name} ${row.button.tag || ''}`).includes(query));
    });
    const matches = group.buttons.length ? group.buttons.some(row => !row.element.hidden) : !raw || (sectionSearch && sectionMatch);
    group.element.hidden = (group.archived && !shareOptionsDraft.includeArchived) || !matches;
    if (!group.element.hidden) visible++;
    if (raw && matches) group.expanded = true;
    updateShareGroupExpansion(group);
  });
  document.getElementById('shareOptionsEmpty').hidden = visible > 0;
  document.getElementById('shareSelectAll').textContent = raw ? 'Selecionar resultados' : 'Selecionar tudo';
  document.getElementById('shareSelectNone').textContent = raw ? 'Desmarcar resultados' : 'Desmarcar tudo';
}

function setShareOptionsArchived(checked) {
  shareOptionsDraft.includeArchived = checked;
  filterShareOptions();
  syncShareOptionsChecks();
}

function selectShareResults(checked) {
  shareOptionsGroups.filter(group => !group.element.hidden).forEach(group => {
    if (!group.buttons.length) setShareDraftItem(group.key, checked);
    group.buttons.filter(row => !row.element.hidden).forEach(row => setShareDraftItem(row.key, checked));
  });
  syncShareOptionsChecks();
}

function closeShareOptions() {
  closeModal('shareOptionsModal');
  document.getElementById('shareModal').inert = false;
  shareOptionsDraft = null;
  const gear = document.getElementById('shareOptionsGear');
  gear.setAttribute('aria-expanded', 'false');
  gear.focus();
}

async function dismissShareOptions() {
  if (shareOptionsDismissPending) return;
  if (shareOptionsDraft && shareSelectionSignature(shareOptionsDraft) !== shareOptionsInitial) {
    shareOptionsDismissPending = true;
    const discard = await confirmDialog('As alterações na seleção ainda não foram confirmadas.', {
      title: 'Descartar alterações na seleção?', confirmText: 'Descartar',
      cancelText: 'Continuar selecionando', danger: true, focusCancel: true, variant: 'unsaved-changes'
    });
    shareOptionsDismissPending = false;
    if (!discard) return;
  }
  closeShareOptions();
}

function confirmShareOptions() {
  const selection = {...shareOptionsDraft, items: shareOptionsDraft.mode === 'custom' ? [...shareOptionsDraft.items] : []};
  if (!shareStateHasItems(buildSelectedShareState(getCurrentStateSnapshot().state, selection))) {
    const error = document.getElementById('shareOptionsError');
    error.textContent = 'Selecione pelo menos uma seção ou um botão para compartilhar.';
    return;
  }
  shareSelection = selection;
  closeShareOptions();
  openShareModal(selection.includeArchived, {preserveSelection: true, forcePreview: true});
}

document.getElementById('shareOptionsModal').addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled)')]
    .filter(control => control.getClientRects().length);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
