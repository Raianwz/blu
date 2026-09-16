// ==========================================================
// Arquivo de botões e seções
// ==========================================================

let activeArchiveTab = 'buttons';

function isArchiveContextMenuEnabled() {
  return getSetting('archiveContextMenu', 'on') === 'on';
}

function updateArchiveContextMenuButtonUI() {
  const button = document.getElementById('archiveContextMenuBtn');
  if (!button) return;
  const enabled = isArchiveContextMenuEnabled();
  button.classList.toggle('active', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.querySelector('.menu-btn-label').textContent = `Arquivar pelo Menu: ${enabled ? 'ON' : 'OFF'}`;
}

function toggleArchiveContextMenuPreference() {
  const enabled = !isArchiveContextMenuEnabled();
  setSetting('archiveContextMenu', enabled ? 'on' : 'off');
  updateArchiveContextMenuButtonUI();
  notify(`Arquivar pelo menu ${enabled ? 'ativado' : 'desativado'}`);
}

function getArchiveCount() {
  return (archivedItems.buttons?.length || 0) + (archivedItems.sections?.length || 0);
}

function updateArchiveMenuCount() {
  const count = getArchiveCount();
  const badge = document.getElementById('archiveMenuCount');
  const button = document.getElementById('archiveViewBtn');
  if (badge) {
    badge.textContent = count;
    badge.hidden = count === 0;
  }
  if (button) {
    const active = typeof activeContentView !== 'undefined' && activeContentView === 'archive';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? 'Voltar à tela inicial' : 'Ver botões e seções arquivados';
  }
  updateArchiveContextMenuButtonUI();
}

function openArchiveView() {
  if (typeof activeContentView !== 'undefined' && activeContentView === 'archive') {
    showContentView('home');
    return;
  }
  showContentView('archive');
  renderArchiveView();
}

function setArchiveTab(tab) {
  activeArchiveTab = tab === 'sections' ? 'sections' : 'buttons';
  renderArchiveView();
}

function archiveButton(sectionId, buttonId) {
  const state = collectState();
  const section = state.sections.find(item => item.id === String(sectionId));
  const buttonIndex = section?.buttons.findIndex(item => item.id === String(buttonId)) ?? -1;
  if (!section || buttonIndex < 0) return;
  const [item] = section.buttons.splice(buttonIndex, 1);
  state.archived.buttons.unshift({
    item,
    sectionId: section.id,
    sectionName: section.name,
    originalIndex: buttonIndex,
    archivedAt: new Date().toISOString()
  });
  pushHistory();
  restoreState(state);
  notifyUndo('Botão arquivado!');
}

async function archiveSection(sectionId) {
  const state = collectState();
  const sectionIndex = state.sections.findIndex(item => item.id === String(sectionId));
  if (sectionIndex < 0) return;
  const section = state.sections[sectionIndex];
  const ok = await confirmDialog(`Arquivar “${section.name}” e seus ${section.buttons.length} botão(ões)?`, {
    title: 'Arquivar seção', confirmText: 'Arquivar'
  });
  if (!ok) return;
  const [item] = state.sections.splice(sectionIndex, 1);
  state.archived.sections.unshift({ item, originalIndex: sectionIndex, archivedAt: new Date().toISOString() });
  pushHistory();
  restoreState(state);
  notifyUndo('Seção arquivada!');
}

function restoreArchivedButton(index) {
  const state = collectState();
  const record = state.archived.buttons[index];
  if (!record) return;
  let section = state.sections.find(item => item.id === record.sectionId);
  if (!section) {
    section = { id: record.sectionId || `s${Date.now()}`, name: record.sectionName || 'Itens restaurados', collapsed: false, buttons: [] };
    state.sections.push(section);
  }
  const targetIndex = Math.min(record.originalIndex, section.buttons.length);
  section.buttons.splice(targetIndex, 0, record.item);
  state.archived.buttons.splice(index, 1);
  pushHistory();
  restoreState(state);
  renderArchiveView();
  notifyUndo(`Botão restaurado em “${section.name}”!`);
}

async function restoreArchivedSection(index, { confirm = false } = {}) {
  const state = collectState();
  const record = state.archived.sections[index];
  if (!record) return false;
  if (confirm) {
    const ok = await confirmDialog(`Restaurar “${record.item.name}” e seus ${record.item.buttons.length} botão(ões) na tela inicial?`, {
      title: 'Restaurar seção arquivada', confirmText: 'Restaurar seção', focusCancel: true
    });
    if (!ok) return false;
  }
  const targetIndex = Math.min(record.originalIndex, state.sections.length);
  state.sections.splice(targetIndex, 0, record.item);
  state.archived.sections.splice(index, 1);
  pushHistory();
  restoreState(state);
  renderArchiveView();
  notifyUndo('Seção restaurada!');
  return true;
}

async function deleteArchivedItem(type, index) {
  const state = collectState();
  const records = state.archived[type];
  const record = records?.[index];
  if (!record) return;
  const label = record.item?.name || 'Item arquivado';
  const ok = await confirmDialog(`Excluir definitivamente “${label}”?`, {
    title: 'Excluir item arquivado', danger: true, confirmText: 'Excluir definitivamente'
  });
  if (!ok) return;
  pushHistory();
  records.splice(index, 1);
  restoreState(state);
  renderArchiveView();
  notifyUndo('Item arquivado excluído!');
}

function formatArchivedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `Arquivado em ${date.toLocaleDateString('pt-BR')}`;
}

function viewArchivedItem(type, index, filteredButtons = null) {
  const record = archivedItems[type]?.[index];
  if (!record) return;
  const item = record.item;
  const title = document.getElementById('buttonViewTitle');
  const meta = document.getElementById('buttonViewMeta');
  const text = document.getElementById('buttonViewText');
  const copy = document.getElementById('buttonViewCopyBtn');
  const restore = document.getElementById('archiveViewRestoreBtn');
  const sectionPreview = document.getElementById('archiveSectionPreview');
  const visibilityLabels = { public: '🌎 Público', private: '🔒 Privado', other: 'Outro' };

  title.textContent = `🗃️ ${item.name}`;
  if (type === 'buttons') {
    meta.textContent = [record.sectionName, item.tag ? `Tag: ${item.tag}` : 'Sem tag', visibilityLabels[item.vis], formatArchivedDate(record.archivedAt)].filter(Boolean).join(' • ');
    text.textContent = item.text;
    text.hidden = false;
    sectionPreview.hidden = true;
    restore.textContent = 'Restaurar botão';
    restore.onclick = () => {
      closeModal('buttonViewModal');
      restoreArchivedButton(index);
    };
  } else {
    const visibleButtons = Array.isArray(filteredButtons) ? filteredButtons : item.buttons;
    const countLabel = visibleButtons.length === item.buttons.length
      ? `${item.buttons.length} botão(ões)`
      : `${visibleButtons.length} de ${item.buttons.length} botão(ões)`;
    meta.textContent = [countLabel, formatArchivedDate(record.archivedAt)].filter(Boolean).join(' • ');
    text.hidden = true;
    sectionPreview.hidden = false;
    sectionPreview.replaceChildren(createArchivedSectionPreview({ ...item, buttons: visibleButtons }, item.buttons.length));
    restore.textContent = 'Restaurar seção';
    restore.onclick = async () => {
      if (await restoreArchivedSection(index, { confirm: true })) closeModal('buttonViewModal');
    };
  }
  copy.hidden = true;
  restore.hidden = false;
  openModal('buttonViewModal');
}

function createArchivedSectionPreview(section, totalButtons = section.buttons.length) {
  const shell = document.createElement('section');
  shell.className = 'archive-section-shell';
  const header = document.createElement('header');
  header.className = 'archive-section-shell-head';
  const countLabel = section.buttons.length === totalButtons ? String(totalButtons) : `${section.buttons.length}/${totalButtons}`;
  header.innerHTML = `<strong>🗃️ ${escapeHtml(section.name)}</strong><span class="section-count">${countLabel}</span>`;
  const body = document.createElement('div');
  body.className = 'archive-section-shell-body';
  const detail = document.createElement('div');
  detail.className = 'archive-section-detail';
  detail.hidden = true;
  const viewButtons = [];
  if (section.buttons.length) {
    section.buttons.forEach(button => body.appendChild(createArchivedSectionButtonRow(button, detail, viewButtons)));
  } else {
    const empty = document.createElement('div');
    empty.className = 'userdata-empty';
    empty.textContent = 'Esta seção não possui botões.';
    body.appendChild(empty);
  }
  shell.append(header, body, detail);
  return shell;
}

function createArchivedSectionButtonRow(button, detail, viewButtons) {
  const row = document.createElement('div');
  row.className = `archive-section-button vis-${button.vis}`;
  const icon = document.createElement('span');
  icon.className = 'archive-section-button-icon';
  icon.textContent = button.vis === 'public' ? '🌎' : button.vis === 'private' ? '🔒' : '🏷️';
  const label = document.createElement('span');
  label.className = 'archive-section-button-label';
  label.textContent = button.name;
  const view = document.createElement('button');
  view.type = 'button';
  view.innerHTML = iconSvg('eye');
  view.title = `Visualizar texto de ${button.name}`;
  view.setAttribute('aria-expanded', 'false');
  viewButtons.push(view);
  view.onclick = () => {
    const opening = !view.classList.contains('active');
    viewButtons.forEach(control => {
      control.classList.remove('active');
      control.setAttribute('aria-expanded', 'false');
    });
    if (!opening) {
      detail.hidden = true;
      detail.replaceChildren();
      return;
    }
    view.classList.add('active');
    view.setAttribute('aria-expanded', 'true');
    const heading = document.createElement('strong');
    heading.textContent = button.name;
    const content = document.createElement('pre');
    content.textContent = button.text;
    detail.replaceChildren(heading, content);
    detail.hidden = false;
  };
  row.append(icon, label, view);
  return row;
}

function createArchiveCard(record, type, index, matchedButtons = null) {
  const card = document.createElement('article');
  card.className = `archive-card archive-${type}`;
  const visual = document.createElement('div');
  visual.className = 'archive-card-visual';
  const item = record.item;
  let meta;
  if (type === 'buttons') {
    meta = [record.sectionName, item.tag, { public: 'Público', private: 'Privado', other: 'Outro' }[item.vis]].filter(Boolean).join(' · ');
  } else {
    const visibleSectionButtons = Array.isArray(matchedButtons) ? matchedButtons : item.buttons;
    const sectionCount = visibleSectionButtons.length === item.buttons.length
      ? `${item.buttons.length} botão(ões)`
      : `${visibleSectionButtons.length} de ${item.buttons.length} botão(ões)`;
    meta = `${sectionCount}${visibleSectionButtons.length ? ` · ${visibleSectionButtons.slice(0, 3).map(button => button.name).join(', ')}` : ''}`;
  }
  visual.innerHTML = `<span class="archive-label">🗃 Arquivado</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(meta)}</small><time>${escapeHtml(formatArchivedDate(record.archivedAt))}</time>`;
  const actions = document.createElement('div');
  actions.className = 'archive-card-actions';
  const restore = document.createElement('button');
  restore.className = 'mbtn primary';
  restore.type = 'button';
  restore.textContent = type === 'sections' ? 'Restaurar seção' : 'Restaurar';
  restore.onclick = () => type === 'sections' ? restoreArchivedSection(index, { confirm: true }) : restoreArchivedButton(index);
  const view = document.createElement('button');
  view.className = 'archive-view-item';
  view.type = 'button';
  view.innerHTML = iconSvg('eye');
  view.title = type === 'sections' ? 'Visualizar conteúdo da seção' : 'Visualizar texto';
  view.setAttribute('aria-label', `${view.title}: ${item.name}`);
  view.onclick = () => viewArchivedItem(type, index, matchedButtons);
  const remove = document.createElement('button');
  remove.className = 'archive-delete';
  remove.type = 'button';
  remove.innerHTML = iconSvg('trash_2');
  remove.title = 'Excluir definitivamente';
  remove.setAttribute('aria-label', `Excluir definitivamente ${item.name}`);
  remove.onclick = () => deleteArchivedItem(type, index);
  actions.append(restore, view, remove);
  card.append(visual, actions);
  return card;
}

function renderArchiveView() {
  updateArchiveMenuCount();
  const list = document.getElementById('archiveList');
  const empty = document.getElementById('archiveEmpty');
  if (!list || !empty) return;
  const query = normalizeSearchText(document.getElementById('archiveSearchInput')?.value || '');
  const records = archivedItems[activeArchiveTab] || [];
  const visible = records.map((record, index) => {
    const item = record.item || {};
    if (activeArchiveTab === 'buttons') {
      const text = `${item.name} ${item.text} ${item.tag} ${record.sectionName}`;
      return { record, index, matches: !query || normalizeSearchText(text).includes(query), matchedButtons: null };
    }
    const sectionMatches = !query || normalizeSearchText(item.name).includes(query);
    const matchedButtons = sectionMatches
      ? (item.buttons || [])
      : (item.buttons || []).filter(button => normalizeSearchText(`${button.name} ${button.text} ${button.tag}`).includes(query));
    return { record, index, matches: sectionMatches || matchedButtons.length > 0, matchedButtons };
  }).filter(entry => entry.matches);
  document.getElementById('archiveButtonsCount').textContent = archivedItems.buttons.length;
  document.getElementById('archiveSectionsCount').textContent = archivedItems.sections.length;
  document.getElementById('archiveButtonsTab').classList.toggle('active', activeArchiveTab === 'buttons');
  document.getElementById('archiveSectionsTab').classList.toggle('active', activeArchiveTab === 'sections');
  document.getElementById('archiveButtonsTab').setAttribute('aria-selected', String(activeArchiveTab === 'buttons'));
  document.getElementById('archiveSectionsTab').setAttribute('aria-selected', String(activeArchiveTab === 'sections'));
  empty.textContent = query ? 'Nenhum item arquivado corresponde à pesquisa.' : `Nenhum${activeArchiveTab === 'sections' ? 'a seção arquivada' : ' botão arquivado'} ainda.`;
  empty.hidden = visible.length > 0;
  list.replaceChildren(...visible.map(({ record, index, matchedButtons }) => createArchiveCard(record, activeArchiveTab, index, matchedButtons)));
}
