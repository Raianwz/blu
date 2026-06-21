let editMode = false;
let tags = [];
let dragEl = null;
let placeholder = null;
let currentSectionId = null;
let currentBtnId = null;
let history = [];
let redoStack = [];
const REDO_LIMIT = 10;
const VERSION = '3.8.3 Beta';
let lastCommittedComparableState = '';
const BASE_TITLE = 'Blû';
const isPopoutWindow = !!window.opener && ['BluLGPopOut', 'BluLGPopout'].includes(window.name);

function getComparableStateString() {
  const state = collectState();
  return JSON.stringify({
    tags: [...state.tags],
    sections: state.sections.map(section => ({
      id: section.id,
      name: section.name,
      buttons: section.buttons.map(button => ({
        id: button.id,
        name: button.name,
        text: button.text,
        tag: button.tag,
        vis: button.vis
      }))
    }))
  });
}

function hasUnsavedChanges() {
  if (!lastCommittedComparableState) return false;
  return getComparableStateString() !== lastCommittedComparableState;
}

function updateUnsavedChangesUI() {
  const dirty = hasUnsavedChanges();
  const versionBadge = document.getElementById('appVersion');
  const exportBtn = document.getElementById('exportBtn');

  if (versionBadge) {
    versionBadge.classList.toggle('unsaved', dirty);
    versionBadge.textContent = dirty ? `Blû ${VERSION} • alterações não salvas` : `Blû ${VERSION}`;
    versionBadge.title = dirty
      ? 'Há alterações não salvas. Exporte para salvar o progresso antes de fechar ou recarregar.'
      : `Blû ${VERSION}`;
  }

  if (exportBtn) {
    exportBtn.classList.toggle('active', dirty);
    exportBtn.textContent = dirty ? '📤 Exportar •' : '📤 Exportar';
    exportBtn.title = dirty ? 'Exportar JSON — há alterações não salvas' : 'Exportar JSON';
  }

  document.title = dirty ? `● ${BASE_TITLE}` : BASE_TITLE;
}

function markCurrentStateAsSaved() {
  lastCommittedComparableState = getComparableStateString();
  updateUnsavedChangesUI();
}

window.addEventListener('beforeunload', event => {
  if (isPopoutWindow || !hasUnsavedChanges()) return;
  event.preventDefault();
  event.returnValue = '';
});

function init() {
  const demo = {
    tags: ['mestre', 'taverna', 'loja', 'secreto'],
    sections: [
      {
        id: 's1',
        name: '🎲 Mesa do Mestre',
        collapsed: false,
        buttons: [
          { id: 'b1', name: 'Crítico!', text: '🎉 CRÍTICO NATURAL 20! Conte-me como você imagina essa cena épica.', tag: 'mestre', vis: 'public' },
          { id: 'b2', name: 'Falha Crítica', text: '💀 Falha crítica (1 no dado)... as coisas estão prestes a piorar.', tag: 'mestre', vis: 'public' },
          { id: 'b3', name: 'Rolar Iniciativa', text: '⚔️ Combate iniciado! Todos rolem iniciativa (d20 + modificador de Destreza).', tag: 'mestre', vis: 'public' },
          { id: 'b4', name: 'Descanso Longo', text: '🌙 Vocês descansam por 8 horas. Recuperam todos os pontos de vida e metade dos dados de vida gastos.', tag: 'mestre', vis: 'public' }
        ]
      },
      {
        id: 's2',
        name: '🍻 Taverna do Javali Dourado',
        collapsed: false,
        buttons: [
          { id: 'b5', name: 'Bem-vindo, Aventureiro', text: 'Seja bem-vindo(a) ao Javali Dourado! Cerveja, ensopado de javali ou um quarto pra noite?', tag: 'taverna', vis: 'public' },
          { id: 'b6', name: 'Rumores Locais', text: 'Dizem que luzes estranhas foram vistas saindo da Torre Esquecida, ao norte da vila...', tag: 'taverna', vis: 'public' },
          { id: 'b7', name: 'Recompensa no Mural', text: '📜 PROCURA-SE: criatura que ataca o gado da região. Recompensa: 50 peças de ouro. Procurar o Prefeito Aldric.', tag: 'taverna', vis: 'public' }
        ]
      },
      {
        id: 's3',
        name: '🧙 Loja do Velho Mago',
        collapsed: false,
        buttons: [
          { id: 'b8', name: 'Poção de Cura', text: 'Poção de Cura (2d4+2 PV) — 50 peças de ouro. "Sabor de cereja, garanto!"', tag: 'loja', vis: 'public' },
          { id: 'b9', name: 'Pergaminho Misterioso', text: 'Pergaminho selado, runas desconhecidas. O vendedor jura que não é amaldiçoado. Jura mesmo.', tag: 'loja', vis: 'other' },
          { id: 'b10', name: 'Sem Troco Hoje', text: 'Ah, sinto muito, viajante... hoje o caixa está vazio. Volte amanhã!', tag: 'loja', vis: 'public' }
        ]
      },
      {
        id: 's4',
        name: '🗝️ Notas Secretas do Mestre',
        collapsed: true,
        buttons: [
          { id: 'b11', name: 'Plot Twist', text: 'O "mercador gentil" do capítulo 2 é, na verdade, o vilão disfarçado. Guardar para o momento certo.', tag: 'secreto', vis: 'private' },
          { id: 'b12', name: 'HP do Chefão', text: 'Dragão Vermelho Jovem: 178 PV | CA 18 | Resistente a fogo, óbvio.', tag: 'secreto', vis: 'private' }
        ]
      }
    ]
  };

  tags = [...demo.tags];
  renderAll(demo.sections);
  updateTagDatalist();
  updateToggleSectionsBtnLabel();
  markCurrentStateAsSaved();
}

updateUnsavedChangesUI();

function sanitizeText(value) { return String(value ?? ''); }

function normalizeSearchText(value) {
  return sanitizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function previewText(text, max = 220) {
  const clean = sanitizeText(text).trim();
  if (!clean) return '';
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

function renderAll(sectionsData) {
  const container = document.getElementById('sections');
  container.innerHTML = '';
  sectionsData.forEach(section => renderSection(section, container));
  updateToggleSectionsBtnLabel();
}

function renderSection(section, container) {
  const wrap = document.createElement('div');
  wrap.className = 'section-wrap' + (section.collapsed ? ' collapsed' : '');
  wrap.dataset.id = String(section.id);

  const count = Array.isArray(section.buttons) ? section.buttons.length : 0;
  const safeSectionId = String(section.id).replace(/'/g, "\\'");

  wrap.innerHTML = `
        <div class="section-head">
          <button class="section-collapse-btn" onclick="toggleCollapse(this)" title="${section.collapsed ? 'Expandir' : 'Recolher'}">▾</button>
          <button class="section-add-btn" onclick="openAddBtn('${safeSectionId}')" title="Adicionar botão em ${escapeHtmlAttr(section.name)}">＋</button>
          <span class="section-title">${escapeHtml(section.name)}</span>
          <span class="section-count" title="${count} botão(ões)">${count}</span>
          <button class="section-rename-btn" onclick="renameSection('${safeSectionId}')" title="Renomear seção">✏️</button>
          <button class="section-del-btn" onclick="deleteSection('${safeSectionId}')" title="Excluir seção">🗑️</button>
        </div>
        <div class="section-body" data-section="${escapeHtmlAttr(String(section.id))}"></div>
      `;

  const body = wrap.querySelector('.section-body');
  (section.buttons || []).forEach(button => body.appendChild(createBtnEl(button, String(section.id))));
  setupDrop(body);
  container.appendChild(wrap);
  return wrap;
}

function createBtnEl(button, sectionId) {
  const wrap = document.createElement('div');
  wrap.className = 'btn-wrap';
  wrap.dataset.id = String(button.id || ('b' + Date.now()));
  wrap.dataset.name = normalizeSearchText(button.name);
  wrap.dataset.tag = normalizeSearchText(button.tag);
  wrap.dataset.text = sanitizeText(button.text);
  wrap.dataset.vis = sanitizeText(button.vis || 'other') || 'other';
  wrap.draggable = editMode;

  const vis = wrap.dataset.vis;
  const visIcon = vis === 'public' ? '🌎' : vis === 'private' ? '🔒' : '';
  const visClass = `vis-${vis}`;

  const copyBtn = document.createElement('button');
  copyBtn.className = `copy-btn ${visClass}`;
  copyBtn.dataset.preview = vis === 'private'
    ? `🔒 Privado\n\n${previewText(wrap.dataset.text)}`
    : previewText(wrap.dataset.text);
  copyBtn.title = vis === 'private'
    ? `🔒 Privado\n\n${wrap.dataset.text || ''}`
    : (wrap.dataset.text || '');
  copyBtn.innerHTML = `${visIcon ? `<span>${visIcon}</span>` : ''}<span class="btn-label">${escapeHtml(button.name || '')}</span>`;
  copyBtn.onclick = () => doCopy(wrap.dataset.text || '', copyBtn);

  let tipTimer;
  copyBtn.addEventListener('mouseenter', () => {
    tipTimer = setTimeout(() => copyBtn.classList.add('show-tip'), 700);
  });
  copyBtn.addEventListener('mouseleave', () => {
    clearTimeout(tipTimer);
    copyBtn.classList.remove('show-tip');
  });

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-edit';
  editBtn.title = 'Editar botão';
  editBtn.innerHTML = '✏️';
  editBtn.onclick = event => {
    event.stopPropagation();
    openEditBtn(sectionId, wrap.dataset.id);
  };

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-del';
  delBtn.title = 'Remover botão';
  delBtn.textContent = '✕';
  delBtn.onclick = event => {
    event.stopPropagation();
    deleteBtn(sectionId, wrap.dataset.id);
  };

  blockDragFromChild(copyBtn);
  blockDragFromChild(editBtn);
  blockDragFromChild(delBtn);

  wrap.append(copyBtn, editBtn, delBtn);
  wrap.addEventListener('dragstart', onDragStart);
  wrap.addEventListener('dragend', onDragEnd);
  return wrap;
}

function blockDragFromChild(el) {
  ['mousedown', 'pointerdown', 'touchstart', 'dragstart'].forEach(evt => {
    el.addEventListener(evt, event => {
      event.stopPropagation();
      if (evt === 'dragstart') event.preventDefault();
    });
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  const input = document.querySelector(`#${id} input, #${id} textarea`);
  if (input) setTimeout(() => input.focus(), 50);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function saveSection() {
  const name = document.getElementById('sName').value.trim();
  if (!name) {
    notify('Informe o nome da seção', 'err');
    return;
  }

  pushHistory();
  renderSection({ id: 's' + Date.now(), name, collapsed: false, buttons: [] }, document.getElementById('sections'));
  closeModal('sectionModal');
  document.getElementById('sName').value = '';
  notify('Seção criada!');
  updateToggleSectionsBtnLabel();
  updateUnsavedChangesUI();
}

function renameSection(sectionId) {
  const wrap = document.querySelector(`.section-wrap[data-id="${cssEscape(sectionId)}"]`);
  if (!wrap) return;

  const titleEl = wrap.querySelector('.section-title');
  const current = titleEl.textContent;
  const newName = prompt('Novo nome da seção:', current);
  if (!newName || newName.trim() === current) return;

  pushHistory();
  titleEl.textContent = newName.trim();
  wrap.querySelector('.section-add-btn').title = `Adicionar botão em ${newName.trim()}`;
  notify('Seção renomeada!');
  doSearch();
  updateUnsavedChangesUI();
}

function deleteSection(sectionId) {
  const wrap = document.querySelector(`.section-wrap[data-id="${cssEscape(sectionId)}"]`);
  if (!wrap) return;

  const count = wrap.querySelectorAll('.btn-wrap').length;
  const msg = count > 0
    ? `Esta seção contém ${count} botão(ões). Deseja excluir tudo mesmo assim?`
    : 'Excluir esta seção?';
  if (!confirm(msg)) return;

  pushHistory();
  wrap.remove();
  notify('Seção removida!');
  updateToggleSectionsBtnLabel();
  updateUnsavedChangesUI();
}

function toggleCollapse(btn) {
  const wrap = btn.closest('.section-wrap');
  const isCollapsed = wrap.classList.toggle('collapsed');
  btn.title = isCollapsed ? 'Expandir' : 'Recolher';
  wrap.querySelector('.section-count').textContent = wrap.querySelectorAll('.btn-wrap').length;
  updateToggleSectionsBtnLabel();
}

// ==========================================================
// Expandir/minimizar categorias
// ==========================================================

function getVisibleSections() {
  return [...document.querySelectorAll('.section-wrap')]
    .filter(section => !section.classList.contains('search-hidden'));
}

function setSectionCollapsed(section, collapsed) {
  section.classList.toggle('collapsed', collapsed);
  const button = section.querySelector('.section-collapse-btn');
  if (button) button.title = collapsed ? 'Expandir' : 'Recolher';
}

function updateToggleSectionsBtnLabel() {
  const button = document.getElementById('toggleSectionsBtn');
  if (!button) return;

  const visibleSections = getVisibleSections();
  const targetSections = visibleSections.length
    ? visibleSections
    : [...document.querySelectorAll('.section-wrap')];

  const hasCollapsed = targetSections.some(section => section.classList.contains('collapsed'));
  button.textContent = hasCollapsed ? '⬇️ Expandir Categorias' : '⬆️ Minimizar Categorias';
}

function toggleAllSections() {
  const visibleSections = getVisibleSections();
  const targetSections = visibleSections.length
    ? visibleSections
    : [...document.querySelectorAll('.section-wrap')];

  if (!targetSections.length) return;

  const hasCollapsed = targetSections.some(section => section.classList.contains('collapsed'));
  targetSections.forEach(section => setSectionCollapsed(section, !hasCollapsed));

  updateToggleSectionsBtnLabel();
  notify(hasCollapsed ? 'Categorias expandidas' : 'Categorias minimizadas');
}

// Limpar a pesquisa, tudo aparece e todas as categorias são minimizadas.
function showAllSearchResults() {
  document.querySelectorAll('.btn-wrap').forEach(button => {
    button.classList.remove('search-hidden');
  });

  document.querySelectorAll('.section-wrap').forEach(section => {
    section.classList.remove('search-hidden');
  });

  updateToggleSectionsBtnLabel();
}

function collapseAllSectionsAfterSearchClear() {
  showAllSearchResults();

  document.querySelectorAll('.section-wrap').forEach(section => {
    setSectionCollapsed(section, true);
  });

  updateToggleSectionsBtnLabel();
}

function openAddBtn(sectionId) {
  currentSectionId = sectionId;
  currentBtnId = null;
  document.getElementById('btnModalTitle').textContent = '➕ Novo Botão';
  document.getElementById('bName').value = '';
  document.getElementById('bText').value = '';
  document.getElementById('bTag').value = '';
  document.getElementById('bVis').value = 'other';
  openModal('btnModal');
}

function openEditBtn(sectionId, btnId) {
  currentSectionId = sectionId;
  currentBtnId = btnId;

  const wrap = document.querySelector(`.btn-wrap[data-id="${cssEscape(btnId)}"]`);
  if (!wrap) {
    notify('Botão não encontrado para edição', 'err');
    return;
  }

  const label = wrap.querySelector('.btn-label');
  document.getElementById('btnModalTitle').textContent = '✏️ Editar Botão';
  document.getElementById('bName').value = label ? label.textContent : '';
  document.getElementById('bText').value = wrap.dataset.text || '';
  document.getElementById('bTag').value = wrap.dataset.tag || '';
  document.getElementById('bVis').value = wrap.dataset.vis || 'other';
  openModal('btnModal');
}

function saveBtn() {
  const name = document.getElementById('bName').value.trim();
  const text = document.getElementById('bText').value.trim();
  const tag = document.getElementById('bTag').value.trim();
  const vis = document.getElementById('bVis').value || 'other';

  if (!name || !text) {
    notify('Preencha nome e texto', 'err');
    return;
  }

  if (!currentSectionId) {
    notify('Selecione uma seção antes de salvar o botão', 'err');
    return;
  }

  if (tag && !tags.includes(tag.toLowerCase())) {
    tags.push(tag.toLowerCase());
    updateTagDatalist();
  }

  const body = document.querySelector(`.section-body[data-section="${cssEscape(currentSectionId)}"]`);
  if (!body) {
    notify('Seção não encontrada', 'err');
    return;
  }

  pushHistory();

  const button = {
    id: currentBtnId || ('b' + Date.now()),
    name,
    text,
    tag,
    vis
  };

  if (currentBtnId) {
    const old = body.querySelector(`.btn-wrap[data-id="${cssEscape(currentBtnId)}"]`);
    if (!old) {
      notify('Botão original não encontrado', 'err');
      return;
    }
    old.replaceWith(createBtnEl(button, currentSectionId));
    notify('Botão atualizado!');
  } else {
    body.appendChild(createBtnEl(button, currentSectionId));
    notify('Botão adicionado!');
  }

  updateSectionCount(currentSectionId);
  closeModal('btnModal');
  doSearch();
  updateUnsavedChangesUI();
}

function deleteBtn(sectionId, btnId) {
  const target = document.querySelector(`.btn-wrap[data-id="${cssEscape(btnId)}"]`);
  if (!target) {
    notify('Botão não encontrado', 'err');
    return;
  }

  if (!confirm('Remover este botão?')) return;

  pushHistory();
  target.remove();
  updateSectionCount(sectionId);
  notify('Botão removido!');
  doSearch();
  updateUnsavedChangesUI();
}

function updateSectionCount(sectionId) {
  const wrap = document.querySelector(`.section-wrap[data-id="${cssEscape(sectionId)}"]`);
  if (!wrap) return;
  wrap.querySelector('.section-count').textContent = wrap.querySelectorAll('.btn-wrap').length;
}

async function doCopy(text, btn) {
  const originalHTML = btn.innerHTML;
  const originalDisabled = btn.disabled;

  try {
    btn.disabled = true;
    await copyToClipboard(text);
    btn.innerHTML = '✓ Copiado!';
    btn.classList.add('copied');
    notify('Copiado!');

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
      btn.disabled = originalDisabled;
    }, 1500);
  } catch (err) {
    console.error('Erro ao copiar:', err);
    btn.disabled = originalDisabled;
    notify('Erro ao copiar. Verifique se a página está em HTTPS ou localhost.', 'err');
  }
}

async function copyToClipboard(text) {
  if (!text) throw new Error('Texto vazio para cópia');

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);

  const success = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!success) throw new Error('Não foi possível copiar o texto');
}

// ==========================================================
// Pesquisa com @ para categorias
// ==========================================================

function doSearch(options = {}) {
  const { collapseOnClear = false } = options;
  const raw = document.getElementById('searchInput').value.trim();
  const q = normalizeSearchText(raw);
  const type = document.getElementById('searchType').value;

  if (!raw) {
    if (collapseOnClear) {
      collapseAllSectionsAfterSearchClear();
    } else {
      showAllSearchResults();
    }
    return;
  }

  // @ sozinho não executa ação especial.
  if (raw === '@') return;

  if (raw.startsWith('@')) {
    searchCategoriesByName(raw);
    return;
  }

  searchButtons(q, type);
  updateToggleSectionsBtnLabel();
}

function searchCategoriesByName(raw) {
  const categoryQuery = normalizeSearchText(raw.slice(1));

  document.querySelectorAll('.btn-wrap').forEach(button => {
    button.classList.remove('search-hidden');
  });

  document.querySelectorAll('.section-wrap').forEach(section => {
    const title = normalizeSearchText(section.querySelector('.section-title')?.textContent || '');
    const showSection = categoryQuery && title.includes(categoryQuery);

    section.classList.toggle('search-hidden', !showSection);
    if (showSection) setSectionCollapsed(section, false);
  });

  updateToggleSectionsBtnLabel();
}

function searchButtons(query, type) {
  document.querySelectorAll('.btn-wrap').forEach(button => {
    if (!query) {
      button.classList.remove('search-hidden');
      return;
    }

    const matchName = (button.dataset.name || '').includes(query);
    const matchTag = (button.dataset.tag || '').includes(query);

    let show = false;
    if (type === 'all') show = matchName || matchTag;
    if (type === 'name') show = matchName;
    if (type === 'tag') show = matchTag;

    button.classList.toggle('search-hidden', !show);
  });

  document.querySelectorAll('.section-wrap').forEach(section => {
    if (!query) {
      section.classList.remove('search-hidden');
      return;
    }

    const hasVisibleButton = [...section.querySelectorAll('.btn-wrap')]
      .some(button => !button.classList.contains('search-hidden'));

    section.classList.toggle('search-hidden', !hasVisibleButton);
    if (hasVisibleButton) setSectionCollapsed(section, false);
  });
}

function setupDrop(body) {
  body.addEventListener('dragover', onDragOver);
  body.addEventListener('drop', onDrop);
}

function onDragStart(event) {
  if (!editMode || event.target.closest('.copy-btn, .btn-edit, .btn-del')) {
    event.preventDefault();
    return;
  }

  dragEl = this;
  this.classList.add('dragging');
  placeholder = document.createElement('div');
  placeholder.className = 'drag-placeholder';
  event.dataTransfer.effectAllowed = 'move';
}

function onDragEnd() {
  dragEl?.classList.remove('dragging');
  placeholder?.remove();
  dragEl = null;
  placeholder = null;
}

function onDragOver(event) {
  if (!dragEl) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';

  const body = event.currentTarget;
  const after = getDragAfter(body, event.clientX);
  if (after) body.insertBefore(placeholder, after);
  else body.appendChild(placeholder);
}

function onDrop(event) {
  event.preventDefault();
  if (!dragEl || !placeholder || !placeholder.parentNode) return;

  pushHistory();
  placeholder.parentNode.insertBefore(dragEl, placeholder);
  placeholder.remove();

  document.querySelectorAll('.section-body').forEach(body => updateSectionCount(body.dataset.section));
  updateUnsavedChangesUI();
}

function getDragAfter(container, x) {
  const elements = [...container.querySelectorAll('.btn-wrap:not(.dragging)')];

  return elements.reduce((closest, element) => {
    const box = element.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;

    if (offset < 0 && offset > closest.offset) return { offset, element };
    return closest;
  }, { offset: -Infinity }).element;
}

function toggleEditMode() {
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);
  document.querySelectorAll('.btn-wrap').forEach(button => button.draggable = editMode);

  const button = document.getElementById('editModeBtn');
  button.textContent = `✏️ Modo Edição: ${editMode ? 'ON' : 'OFF'}`;
  button.classList.toggle('active', editMode);
  notify(editMode ? 'Modo edição ativado' : 'Modo edição desativado');
}

function toggleTheme() {
  const dark = document.body.classList.toggle('dark');
  document.getElementById('themeBtn').textContent = dark ? '☀️ Tema Claro' : '🌙 Tema Escuro';
}

function toggleMenu() {
  document.getElementById('menuOverlay').classList.toggle('open');
}

document.addEventListener('click', event => {
  const overlay = document.getElementById('menuOverlay');
  if (!overlay.classList.contains('open')) return;

  if (!overlay.contains(event.target) && event.target.id !== 'hamburger') {
    overlay.classList.remove('open');
  }
});

function renderTagList() {
  const list = document.getElementById('tagList');
  list.innerHTML = '';

  tags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${escapeHtml(tag)} <button onclick="removeTag('${String(tag).replace(/'/g, "\\'")}')" title="Remover tag">✕</button>`;
    list.appendChild(chip);
  });
}

function addTag() {
  const input = document.getElementById('newTagInput');
  const value = input.value.trim().toLowerCase();
  if (!value || tags.includes(value)) return;

  tags.push(value);
  renderTagList();
  updateTagDatalist();
  input.value = '';
  updateUnsavedChangesUI();
}

function removeTag(tag) {
  tags = tags.filter(currentTag => currentTag !== tag);

  document.querySelectorAll(`.btn-wrap[data-tag="${cssEscape(tag)}"]`).forEach(button => {
    button.dataset.tag = '';
  });

  renderTagList();
  updateTagDatalist();
  notify(`Tag "${tag}" removida`);
  doSearch();
}

function updateTagDatalist() {
  const dataList = document.getElementById('tagOptions');
  dataList.innerHTML = tags.map(tag => `<option value="${escapeHtmlAttr(tag)}">`).join('');
  renderTagList();
}

function collectState() {
  const sections = [];

  document.querySelectorAll('.section-wrap').forEach(section => {
    const buttons = [];

    section.querySelectorAll('.btn-wrap').forEach(button => {
      const label = button.querySelector('.btn-label');
      buttons.push({
        id: button.dataset.id,
        name: label ? label.textContent : '',
        text: button.dataset.text || '',
        tag: button.dataset.tag || '',
        vis: button.dataset.vis || 'other'
      });
    });

    sections.push({
      id: section.dataset.id,
      name: section.querySelector('.section-title').textContent,
      collapsed: section.classList.contains('collapsed'),
      buttons
    });
  });

  return { tags: [...tags], sections };
}

function pushHistory() {
  history.push(JSON.stringify(collectState()));
  if (history.length > 30) history.shift();

  // Qualquer nova ação manual invalida o histórico de refazer.
  redoStack = [];
}

function restoreState(state) {
  tags = Array.isArray(state.tags) ? [...state.tags] : [];
  updateTagDatalist();
  renderAll(Array.isArray(state.sections) ? state.sections : []);

  if (editMode) {
    document.querySelectorAll('.btn-wrap').forEach(button => button.draggable = true);
  }

  doSearch();
  updateUnsavedChangesUI();
}

function pushRedoState(stateString) {
  redoStack.push(stateString);
  if (redoStack.length > REDO_LIMIT) redoStack.shift();
}

function undoLastAction() {
  if (history.length === 0) return;

  try {
    pushRedoState(JSON.stringify(collectState()));
    const previousState = JSON.parse(history.pop());
    restoreState(previousState);
    updateUnsavedChangesUI();
    notify('Desfeito!');
  } catch (error) {
    console.error('Erro ao desfazer:', error);
    notify('Não foi possível desfazer', 'err');
  }
}

function redoLastAction() {
  if (redoStack.length === 0) return;

  try {
    history.push(JSON.stringify(collectState()));
    if (history.length > 30) history.shift();

    const nextState = JSON.parse(redoStack.pop());
    restoreState(nextState);
    updateUnsavedChangesUI();
    notify('Refeito!');
  } catch (error) {
    console.error('Erro ao refazer:', error);
    notify('Não foi possível refazer', 'err');
  }
}

function exportData() {
  const state = collectState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const EDdate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const EDtime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;


  link.href = url;
  link.download = `blu_data-${EDdate}-${EDtime}.json`;
  link.click();
  URL.revokeObjectURL(url);
  markCurrentStateAsSaved();
  notify('Exportado!');
}

function normalizeImportedData(parsed) {
  const base = {
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(tag => String(tag).toLowerCase()) : [],
    sections: []
  };

  const sourceSections = Array.isArray(parsed.sections)
    ? parsed.sections
    : Array.isArray(parsed.categories)
      ? parsed.categories.map(category => ({
        id: category.id,
        name: `${sanitizeText(category.icon).trim()} ${sanitizeText(category.name).trim()}`.trim(),
        collapsed: !!category.collapsed,
        buttons: Array.isArray(category.buttons)
          ? category.buttons.map(button => ({
            id: button.id,
            name: button.name ?? button.btnName ?? '',
            text: button.text ?? '',
            tag: button.tag ?? '',
            vis: button.vis ?? 'other'
          }))
          : []
      }))
      : [];

  base.sections = sourceSections.map((section, sectionIndex) => ({
    id: String(section.id || ('s' + Date.now() + sectionIndex)),
    name: sanitizeText(section.name || `Seção ${sectionIndex + 1}`),
    collapsed: !!section.collapsed,
    buttons: Array.isArray(section.buttons)
      ? section.buttons.map((button, buttonIndex) => ({
        id: String(button.id || ('b' + Date.now() + buttonIndex)),
        name: sanitizeText(button.name ?? button.btnName ?? ''),
        text: sanitizeText(button.text),
        tag: sanitizeText(button.tag || ''),
        vis: ['public', 'private', 'other'].includes(button.vis) ? button.vis : 'other'
      }))
      : []
  }));

  return base;
}

function triggerImportFilePicker() {
  document.getElementById('importFileInput').click();
}

function setImportFileMeta(message, isError = false) {
  const meta = document.getElementById('importFileMeta');
  if (!meta) return;
  meta.textContent = message;
  meta.style.color = isError ? 'var(--red)' : 'var(--text2)';
}

function clearImportSource() {
  const input = document.getElementById('importFileInput');
  const textarea = document.getElementById('importJson');
  if (input) input.value = '';
  if (textarea) textarea.value = '';
  setImportFileMeta('Nenhum arquivo carregado.');
}

async function handleImportFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const allowed = ['application/json', 'text/plain', ''];
  const isSupportedExt = /\.(json|txt)$/i.test(file.name);
  if (!isSupportedExt && !allowed.includes(file.type)) {
    setImportFileMeta('Formato não suportado. Use um arquivo .json ou .txt.', true);
    notify('Formato não suportado. Use .json ou .txt', 'err');
    event.target.value = '';
    return;
  }

  try {
    const raw = await file.text();
    const textarea = document.getElementById('importJson');

    let finalText = raw;
    try {
      const parsed = JSON.parse(raw);
      finalText = JSON.stringify(parsed, null, 2);
    } catch (_) {
      // Mantém o conteúdo bruto para revisão manual antes de importar.
    }

    textarea.value = finalText;
    const sizeKb = (file.size / 1024).toFixed(file.size >= 1024 ? 1 : 0);
    setImportFileMeta(`Arquivo carregado: ${file.name} (${sizeKb} KB)`);
    notify('Arquivo carregado na área de importação');
  } catch (error) {
    console.error('Erro ao ler arquivo:', error);
    setImportFileMeta('Não foi possível ler o arquivo selecionado.', true);
    notify('Erro ao ler arquivo', 'err');
  }
}

function importData() {
  const raw = document.getElementById('importJson').value.trim();
  if (!raw) {
    notify('Cole o JSON primeiro', 'err');
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.sections && !parsed.categories) throw new Error('Formato inválido: esperado "sections" ou "categories"');
    if (!confirm('Isso substituirá todos os dados atuais. Continuar?')) return;

    pushHistory();
    restoreState(normalizeImportedData(parsed));
    markCurrentStateAsSaved();
    closeModal('importModal');
    clearImportSource();
    notify('Importado com sucesso!');
  } catch (error) {
    notify('JSON inválido: ' + error.message, 'err');
  }
}

function clearAll() {
  if (!confirm('Limpar TODOS os dados? Esta ação não pode ser desfeita.')) return;

  pushHistory();
  restoreState({ tags: [], sections: [] });
  notify('Tudo limpo!');
  updateUnsavedChangesUI();
}

function openPopout() {
  const width = 440;
  const height = 1200;
  window.open(location.href, 'BlueLGPopout', `width=${width},height=${height},left=${(screen.width - width) / 2},top=${(screen.height - height) / 2},resizable=yes,scrollbars=yes`);
}

function openPopoutBlank() {
  const width = 440;
  const height = 1200;

  const win = window.open('', 'BlueLGPopOut',
    `width=${width},height=${height},left=${(screen.width - width) / 2},top=${(screen.height - height) / 2},resizable=yes,scrollbars=yes`
  );

  if (!win) {
    notify('O navegador bloqueou o pop out', 'err');
    return;
  }

  // Escreve o HTML atual
  win.document.write(document.documentElement.outerHTML);
  win.document.close();

  // ?? Injeta favicon manualmente (garante funcionamento)
  const faviconHref = "data:image/svg+xml," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 64 64'>" +
    "<rect width='64' height='64' rx='12' fill='%232563eb'/>" +

    "<rect x='10' y='12' width='12' height='12' rx='3' fill='%23ffffff' opacity='0.25'/>" +
    "<rect x='42' y='40' width='12' height='12' rx='3' fill='%23ffffff' opacity='0.25'/>" +

    "<text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' " +
    "font-family='Segoe UI, Arial, sans-serif' font-size='30' fill='%23ffffff'>B</text>" +
    "</svg>";

  setTimeout(() => {
    const doc = win.document;

    // Remove favicon existente (se tiver)
    const oldIcons = doc.querySelectorAll("link[rel~='icon']");
    oldIcons.forEach(icon => icon.remove());

    // Cria novo favicon
    const link = doc.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = faviconHref;

    doc.head.appendChild(link);
  }, 50); // pequeno delay ajuda na consistência
}

function isTypingField(element) {
  if (!element) return false;
  const tag = element.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable;
}

// ==========================================================
// Atalhos globais
// ==========================================================

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();

  if ((event.ctrlKey || event.metaKey) && key === 'e') {
    if (!isTypingField(document.activeElement)) {
      event.preventDefault();
      toggleAllSections();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    event.preventDefault();

    if (history.length > 0 && confirm('Deseja desfazer a última alteração realizada?')) {
      undoLastAction();
    }

    return;
  }

  if ((event.ctrlKey || event.metaKey) && key === 'y') {
    event.preventDefault();
    redoLastAction();
    return;
  }

  if (event.key === 'Escape') {
    ['btnModal', 'sectionModal', 'tagModal', 'importModal'].forEach(closeModal);
    document.getElementById('menuOverlay').classList.remove('open');
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    if (document.getElementById('btnModal').classList.contains('open')) saveBtn();
    if (document.getElementById('sectionModal').classList.contains('open')) saveSection();
  }
});

document.querySelectorAll('.modal-bg').forEach(background => {
  background.addEventListener('click', event => {
    if (event.target === background) background.classList.remove('open');
  });
});

function notify(msg, type = 'ok') {
  const area = document.getElementById('notifArea');
  const element = document.createElement('div');
  element.className = 'notif' + (type === 'err' ? ' err' : '');
  element.textContent = msg;
  area.appendChild(element);
  setTimeout(() => element.remove(), 3000);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replace(/\n/g, '&#10;');
}

function cssEscape(value) {
  if (window.CSS && CSS.escape) return CSS.escape(String(value));
  return String(value).replace(/(["\\.#:[\]()=+*~>^$| ])/g, '\\$1');
}

init();

/* ---- Shift Mode FINAL v10 ---- */
let shiftActive = false;
let shiftLocked = false;
let lastShift = 0;

let draggingEl = null;
let placeholderEl = null;
let isDragging = false;

function updateShiftMode() {
  if (typeof editMode === 'undefined' || !editMode) {
    shiftActive = false;
    shiftLocked = false;
    document.body.classList.remove('shift-mode', 'shift-locked');
    return;
  }

  document.body.classList.toggle('shift-mode', shiftActive || shiftLocked);
  document.body.classList.toggle('shift-locked', shiftLocked);
}

function getPlaceholder() {
  if (!placeholderEl) {
    placeholderEl = document.createElement('div');
    placeholderEl.className = 'drag-placeholder';
  }
  return placeholderEl;
}

function injectMoveControls() {
  document.querySelectorAll('.section-head').forEach(head => {
    if (head.querySelector('.section-move-controls')) return;

    const div = document.createElement('div');
    div.className = 'section-move-controls';
    div.innerHTML = '      <button onclick="moveSectionUp(this)">⬆️</button>      <button onclick="moveSectionDown(this)">⬇️</button>';

    head.appendChild(div);
  });
}

function moveSectionUp(btn) {
  const section = btn.closest('.section-wrap');
  const prev = section.previousElementSibling;
  if (!prev) return;

  section.parentNode.insertBefore(section, prev);

  if (typeof pushHistory === 'function') pushHistory();
  if (typeof updateUnsavedChangesUI === 'function') updateUnsavedChangesUI();
}

function moveSectionDown(btn) {
  const section = btn.closest('.section-wrap');
  const next = section.nextElementSibling;
  if (!next) return;

  section.parentNode.insertBefore(next, section);

  if (typeof pushHistory === 'function') pushHistory();
  if (typeof updateUnsavedChangesUI === 'function') updateUnsavedChangesUI();
}

const bluObserver = new MutationObserver(() => {
  injectMoveControls();
});

window.addEventListener('load', () => {
  bluObserver.observe(document.body, { childList: true, subtree: true });
  injectMoveControls();
  updateShiftMode();
});

window.addEventListener('keydown', e => {
  if (typeof editMode === 'undefined' || !editMode) return;

  if (e.key === 'Shift') {
    if (isDragging) return;

    const now = Date.now();

    if (!shiftActive && now - lastShift < 400) {
      shiftLocked = !shiftLocked;
    } else {
      shiftActive = true;
    }

    lastShift = now;
    updateShiftMode();
  }

  if (e.ctrlKey && e.key === 'Shift') {
    shiftLocked = !shiftLocked;
    updateShiftMode();
  }
});

window.addEventListener('keyup', e => {
  if (e.key === 'Shift') {
    shiftActive = false;
    updateShiftMode();
  }
});

window.addEventListener('mousedown', e => {
  if (typeof editMode === 'undefined' || !editMode) return;
  if (!document.body.classList.contains('shift-mode')) return;

  const section = e.target.closest('.section-wrap');
  if (!section) return;

  draggingEl = section;
  isDragging = true;
  section.classList.add('dragging');
});

window.addEventListener('mousemove', e => {
  if (!isDragging || !draggingEl) return;

  const target = e.target.closest('.section-wrap');
  if (!target || target === draggingEl) return;

  const rect = target.getBoundingClientRect();
  const mid = rect.top + (rect.height / 2);
  const parent = target.parentNode;
  const ph = getPlaceholder();

  if (e.clientY < mid) {
    parent.insertBefore(ph, target);
  } else {
    parent.insertBefore(ph, target.nextSibling);
  }
});

window.addEventListener('mouseup', () => {
  if (!isDragging || !draggingEl) return;

  const ph = document.querySelector('.drag-placeholder');

  if (ph && ph.parentNode) {
    ph.parentNode.insertBefore(draggingEl, ph);
    ph.remove();
  }

  draggingEl.classList.remove('dragging');
  draggingEl = null;
  isDragging = false;

  if (typeof pushHistory === 'function') pushHistory();
  if (typeof updateUnsavedChangesUI === 'function') updateUnsavedChangesUI();
});



/* ---- FINAL FIX: reset shift on edit OFF (no interference) ---- */

(function () {
  const originalToggle = window.toggleEditMode;

  if (typeof originalToggle === 'function') {
    window.toggleEditMode = function () {

      // chama comportamento original
      originalToggle.apply(this, arguments);

      // se saiu do modo edição → limpa tudo
      if (typeof editMode !== 'undefined' && !editMode) {
        if (typeof shiftActive !== 'undefined') shiftActive = false;
        if (typeof shiftLocked !== 'undefined') shiftLocked = false;
        document.body.classList.remove('shift-mode', 'shift-locked');
      }

    }
  }
})();




/* ---- ShiftLock Button Reorder 3.8.3 ----
   Troca edição/exclusão por controles horizontais nos botões:
   [‹] [botão copiável] [›]
*/
(function () {
  const CONFIG = {
    sectionSelector: '.section-wrap',
    sectionBodySelector: '.section-body',
    buttonWrapperSelector: '.btn-wrap',
    copyButtonSelector: '.copy-btn',
    editButtonSelector: '.btn-edit',
    deleteButtonSelector: '.btn-del'
  };

  function isButtonShiftLockActive() {
    return Boolean(
      typeof editMode !== 'undefined' && editMode &&
      typeof shiftLocked !== 'undefined' && shiftLocked
    );
  }

  function getButtonWrappersFromSection(section) {
    if (!section) return [];
    const body = section.querySelector(CONFIG.sectionBodySelector) || section;
    return Array.from(body.querySelectorAll(CONFIG.buttonWrapperSelector))
      .filter(btn => btn.querySelector(CONFIG.copyButtonSelector));
  }

  function refreshDisabledState(buttonWrap) {
    const section = buttonWrap.closest(CONFIG.sectionSelector);
    const buttons = getButtonWrappersFromSection(section);
    const index = buttons.indexOf(buttonWrap);

    const prev = buttonWrap.querySelector('.blu-btn-move-prev');
    const next = buttonWrap.querySelector('.blu-btn-move-next');

    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index === -1 || index >= buttons.length - 1;
  }

  function afterButtonMove(buttonWrap) {
    if (typeof updateUnsavedChangesUI === 'function') updateUnsavedChangesUI();
    applyButtonReorderControls();

    const copyBtn = buttonWrap.querySelector(CONFIG.copyButtonSelector);
    if (copyBtn) {
      copyBtn.classList.add('blu-button-moved-feedback');
      setTimeout(() => copyBtn.classList.remove('blu-button-moved-feedback'), 260);
    }
  }

  function moveButtonPrev(buttonWrap) {
    const section = buttonWrap.closest(CONFIG.sectionSelector);
    const buttons = getButtonWrappersFromSection(section);
    const index = buttons.indexOf(buttonWrap);

    if (index <= 0) return;

    if (typeof pushHistory === 'function') pushHistory();
    buttons[index - 1].before(buttonWrap);
    afterButtonMove(buttonWrap);
  }

  function moveButtonNext(buttonWrap) {
    const section = buttonWrap.closest(CONFIG.sectionSelector);
    const buttons = getButtonWrappersFromSection(section);
    const index = buttons.indexOf(buttonWrap);

    if (index === -1 || index >= buttons.length - 1) return;

    if (typeof pushHistory === 'function') pushHistory();
    buttons[index + 1].after(buttonWrap);
    afterButtonMove(buttonWrap);
  }

  function createMoveButton(direction, buttonWrap) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `blu-btn-move-horizontal blu-btn-move-${direction}`;
    btn.textContent = direction === 'prev' ? '‹' : '›';
    btn.title = direction === 'prev' ? 'Mover botão para posição anterior' : 'Mover botão para próxima posição';
    btn.setAttribute('aria-label', btn.title);

    btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      if (direction === 'prev') moveButtonPrev(buttonWrap);
      else moveButtonNext(buttonWrap);
    });

    if (typeof blockDragFromChild === 'function') blockDragFromChild(btn);

    return btn;
  }

  function enableButtonReorder(buttonWrap) {
    const copyBtn = buttonWrap.querySelector(CONFIG.copyButtonSelector);
    if (!copyBtn) return;

    buttonWrap.querySelectorAll(`${CONFIG.editButtonSelector}, ${CONFIG.deleteButtonSelector}`)
      .forEach(btn => btn.classList.add('blu-button-hidden-in-shiftlock'));

    if (!buttonWrap.classList.contains('blu-button-shift-row')) {
      buttonWrap.classList.add('blu-button-shift-row');

      const prev = createMoveButton('prev', buttonWrap);
      const next = createMoveButton('next', buttonWrap);

      copyBtn.before(prev);
      copyBtn.after(next);
    }

    refreshDisabledState(buttonWrap);
  }

  function disableButtonReorder(buttonWrap) {
    buttonWrap.querySelectorAll('.blu-btn-move-horizontal').forEach(btn => btn.remove());
    buttonWrap.classList.remove('blu-button-shift-row');
    buttonWrap.querySelectorAll('.blu-button-hidden-in-shiftlock')
      .forEach(btn => btn.classList.remove('blu-button-hidden-in-shiftlock'));
  }

  function applyButtonReorderControls() {
    const shouldShow = isButtonShiftLockActive();

    document.querySelectorAll(CONFIG.buttonWrapperSelector).forEach(buttonWrap => {
      if (shouldShow) enableButtonReorder(buttonWrap);
      else disableButtonReorder(buttonWrap);
    });
  }

  window.bluApplyButtonReorderControls = applyButtonReorderControls;
  window.bluMoveButtonPrev = moveButtonPrev;
  window.bluMoveButtonNext = moveButtonNext;

  // Integração com updateShiftMode sem alterar a lógica final já estabilizada.
  if (typeof window.updateShiftMode === 'function' && !window.__blu383ShiftModeWrapped) {
    window.__blu383ShiftModeWrapped = true;
    const originalUpdateShiftMode = window.updateShiftMode;
    window.updateShiftMode = function () {
      const result = originalUpdateShiftMode.apply(this, arguments);
      applyButtonReorderControls();
      return result;
    };
  }

  // Integração com toggleEditMode para limpar/atualizar controles ao sair do modo edição.
  if (typeof window.toggleEditMode === 'function' && !window.__blu383ToggleEditModeWrapped) {
    window.__blu383ToggleEditModeWrapped = true;
    const originalToggleEditMode = window.toggleEditMode;
    window.toggleEditMode = function () {
      const result = originalToggleEditMode.apply(this, arguments);
      applyButtonReorderControls();
      return result;
    };
  }

  if (!window.__blu383ButtonReorderObserverStarted) {
    window.__blu383ButtonReorderObserverStarted = true;
    const observer = new MutationObserver(() => applyButtonReorderControls());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('load', applyButtonReorderControls);
})();