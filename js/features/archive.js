// ==========================================================
// Arquivo de botões e seções
// ==========================================================

let activeArchiveTab = 'buttons';

function getArchiveCount() {
  return (archivedItems.buttons?.length || 0) + (archivedItems.sections?.length || 0);
}

function updateArchiveMenuCount() {
  const count = getArchiveCount();
  const badge = document.getElementById('archiveMenuCount');
  if (badge) {
    badge.textContent = count;
    badge.hidden = count === 0;
  }
}

function openArchiveView() {
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

function restoreArchivedSection(index) {
  const state = collectState();
  const record = state.archived.sections[index];
  if (!record) return;
  const targetIndex = Math.min(record.originalIndex, state.sections.length);
  state.sections.splice(targetIndex, 0, record.item);
  state.archived.sections.splice(index, 1);
  pushHistory();
  restoreState(state);
  renderArchiveView();
  notifyUndo('Seção restaurada!');
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

function createArchiveCard(record, type, index) {
  const card = document.createElement('article');
  card.className = `archive-card archive-${type}`;
  const visual = document.createElement('div');
  visual.className = 'archive-card-visual';
  const item = record.item;
  const meta = type === 'buttons'
    ? [record.sectionName, item.tag, { public: 'Público', private: 'Privado', other: 'Outro' }[item.vis]].filter(Boolean).join(' · ')
    : `${item.buttons.length} botão(ões)${item.buttons.length ? ` · ${item.buttons.slice(0, 3).map(button => button.name).join(', ')}` : ''}`;
  visual.innerHTML = `<span class="archive-label">🗃 Arquivado</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(meta)}</small><time>${escapeHtml(formatArchivedDate(record.archivedAt))}</time>`;
  const actions = document.createElement('div');
  actions.className = 'archive-card-actions';
  const restore = document.createElement('button');
  restore.className = 'mbtn primary';
  restore.type = 'button';
  restore.textContent = type === 'sections' ? 'Restaurar seção' : 'Restaurar';
  restore.onclick = () => type === 'sections' ? restoreArchivedSection(index) : restoreArchivedButton(index);
  const remove = document.createElement('button');
  remove.className = 'archive-delete';
  remove.type = 'button';
  remove.innerHTML = iconSvg('trash_2');
  remove.title = 'Excluir definitivamente';
  remove.setAttribute('aria-label', `Excluir definitivamente ${item.name}`);
  remove.onclick = () => deleteArchivedItem(type, index);
  actions.append(restore, remove);
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
  const visible = records.map((record, index) => ({ record, index })).filter(({ record }) => {
    const item = record.item || {};
    const text = activeArchiveTab === 'buttons'
      ? `${item.name} ${item.text} ${item.tag} ${record.sectionName}`
      : `${item.name} ${(item.buttons || []).map(button => `${button.name} ${button.text} ${button.tag}`).join(' ')}`;
    return !query || normalizeSearchText(text).includes(query);
  });
  document.getElementById('archiveButtonsCount').textContent = archivedItems.buttons.length;
  document.getElementById('archiveSectionsCount').textContent = archivedItems.sections.length;
  document.getElementById('archiveButtonsTab').classList.toggle('active', activeArchiveTab === 'buttons');
  document.getElementById('archiveSectionsTab').classList.toggle('active', activeArchiveTab === 'sections');
  document.getElementById('archiveButtonsTab').setAttribute('aria-selected', String(activeArchiveTab === 'buttons'));
  document.getElementById('archiveSectionsTab').setAttribute('aria-selected', String(activeArchiveTab === 'sections'));
  empty.textContent = query ? 'Nenhum item arquivado corresponde à pesquisa.' : `Nenhum${activeArchiveTab === 'sections' ? 'a seção arquivada' : ' botão arquivado'} ainda.`;
  empty.hidden = visible.length > 0;
  list.replaceChildren(...visible.map(({ record, index }) => createArchiveCard(record, activeArchiveTab, index)));
}
