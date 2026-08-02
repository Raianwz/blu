// ==========================================================
// Drag-and-drop de botões + reordenação de seções (modo Shift)
// ==========================================================

// --- Drag-and-drop de botões dentro/entre seções -----------

let dragEl = null;
let placeholder = null;

// --- Preferência "Mostrar Destino" (preview visual do drag) ---------
// Desativado por padrão. Importante: mesmo desativado, o placeholder
// CONTINUA sendo posicionado no DOM normalmente — é só a APARÊNCIA dele
// que fica invisível via CSS (body.drag-preview-off). Isso preserva o
// posicionamento correto no drop (onDrop depende de placeholder.parentNode
// para saber onde inserir o item), sem exibir a "caixa" pra quem não quer vê-la.

let dragPreviewEnabled = false;

function updateDragPreviewButtonUI() {
  const button = document.getElementById('dragPreviewBtn');
  if (!button) return;
  button.classList.toggle('active', dragPreviewEnabled);
  button.querySelector('.menu-btn-label').textContent = `Mostrar Destino: ${dragPreviewEnabled ? 'ON' : 'OFF'}`;
}

function applyDragPreviewState() {
  document.body.classList.toggle('drag-preview-off', !dragPreviewEnabled);
  updateDragPreviewButtonUI();
}

function initDragPreviewPreference() {
  const stored = getSetting('dragPreview');
  dragPreviewEnabled = stored === 'on';
  applyDragPreviewState();
}

function toggleDragPreview() {
  dragPreviewEnabled = !dragPreviewEnabled;
  setSetting('dragPreview', dragPreviewEnabled ? 'on' : 'off');
  applyDragPreviewState();
  notify(dragPreviewEnabled ? 'Preview de movimentação ativado' : 'Preview de movimentação desativado');
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

  // dragover dispara dezenas de vezes por segundo enquanto o mouse se move.
  // Só mexe no DOM quando a posição-alvo realmente muda — do contrário o
  // placeholder fica sendo reinserido sem necessidade, forçando reflow e
  // causando o "flicker" visual.
  if (after) {
    if (placeholder.nextElementSibling !== after) {
      body.insertBefore(placeholder, after);
    }
  } else if (body.lastElementChild !== placeholder) {
    body.appendChild(placeholder);
  }
}

function onDrop(event) {
  event.preventDefault();
  if (!dragEl || !placeholder || !placeholder.parentNode) return;

  pushHistory();
  placeholder.parentNode.insertBefore(dragEl, placeholder);
  placeholder.remove();

  document.querySelectorAll('.section-body').forEach(body => updateSectionCount(body.dataset.section));
  applyButtonReorderControls();
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

// --- Modo Shift: reordenar seções e alternar controles ------
// Pressionar Shift uma vez ativa o modo temporariamente (arrastar
// seções enquanto segura). Shift duplo (duplo toque rápido) ou
// Ctrl+Shift trava o modo (shiftLocked) — nesse estado os botões
// ganham setas [‹] [›] para reordenação horizontal.

let shiftActive = false;
let shiftLocked = false;
let lastShiftPress = 0;

let draggingSectionEl = null;
let sectionPlaceholderEl = null;
let isDraggingSection = false;

function updateShiftMode() {
  if (!editMode) {
    shiftActive = false;
    shiftLocked = false;
    document.body.classList.remove('shift-mode', 'shift-locked');
    applyButtonReorderControls();
    updateOrganizeModeButtonUI();
    return;
  }

  document.body.classList.toggle('shift-mode', shiftActive || shiftLocked);
  document.body.classList.toggle('shift-locked', shiftLocked);
  applyButtonReorderControls();
  updateOrganizeModeButtonUI();
}

// Ponto único que reflete shiftLocked no botão do menu — chamado sempre
// por dentro de updateShiftMode(), então tanto o clique no botão quanto
// o atalho de teclado (duplo Shift / Ctrl+Shift) mantêm a UI em sincronia
// automaticamente, sem duplicar lógica em dois lugares.
function updateOrganizeModeButtonUI() {
  const button = document.getElementById('organizeModeBtn');
  if (!button) return;

  button.disabled = !editMode;
  button.classList.toggle('active', shiftLocked);
  button.setAttribute('aria-pressed', String(shiftLocked));
  button.querySelector('.menu-btn-label').textContent = `Modo Organização: ${shiftLocked ? 'ON' : 'OFF'}`;
}

// Alterna o Modo Organização a partir do clique no botão do menu — usa a
// mesma variável e o mesmo updateShiftMode() que o atalho de teclado.
function toggleOrganizeMode() {
  if (!editMode) return; // botão fica desabilitado nesse caso; defesa extra
  shiftLocked = !shiftLocked;
  updateShiftMode();
  notify(shiftLocked ? 'Modo Organização ativado' : 'Modo Organização desativado');
}

function getSectionPlaceholder() {
  if (!sectionPlaceholderEl) {
    sectionPlaceholderEl = document.createElement('div');
    sectionPlaceholderEl.className = 'section-drag-placeholder';
  }
  return sectionPlaceholderEl;
}

function moveSectionUp(btn) {
  const section = btn.closest('.section-wrap');
  const prev = section.previousElementSibling;
  if (!prev) return;

  pushHistory();
  section.parentNode.insertBefore(section, prev);
  updateUnsavedChangesUI();
}

function moveSectionDown(btn) {
  const section = btn.closest('.section-wrap');
  const next = section.nextElementSibling;
  if (!next) return;

  pushHistory();
  section.parentNode.insertBefore(next, section);
  updateUnsavedChangesUI();
}

window.addEventListener('keydown', event => {
  if (!editMode) return;

  if (event.key === 'Shift') {
    if (isDraggingSection) return;

    const now = Date.now();
    if (!shiftActive && now - lastShiftPress < 400) {
      shiftLocked = !shiftLocked;
    } else {
      shiftActive = true;
    }

    lastShiftPress = now;
    updateShiftMode();
  }

  if (event.ctrlKey && event.key === 'Shift') {
    shiftLocked = !shiftLocked;
    updateShiftMode();
  }
});

window.addEventListener('keyup', event => {
  if (event.key === 'Shift') {
    shiftActive = false;
    updateShiftMode();
  }
});

window.addEventListener('mousedown', event => {
  if (!editMode || !document.body.classList.contains('shift-mode')) return;

  const section = event.target.closest('.section-wrap');
  if (!section) return;

  draggingSectionEl = section;
  isDraggingSection = true;
  section.classList.add('dragging');
});

window.addEventListener('mousemove', event => {
  if (!isDraggingSection || !draggingSectionEl) return;

  const target = event.target.closest('.section-wrap');
  if (!target || target === draggingSectionEl) return;

  const rect = target.getBoundingClientRect();
  const mid = rect.top + rect.height / 2;
  const parent = target.parentNode;
  const ph = getSectionPlaceholder();

  // Mesma lógica anti-flicker do drag de botões: só mexe no DOM se a
  // posição-alvo realmente mudou desde o último mousemove.
  if (event.clientY < mid) {
    if (ph.nextElementSibling !== target) parent.insertBefore(ph, target);
  } else {
    if (target.nextElementSibling !== ph) parent.insertBefore(ph, target.nextSibling);
  }
});

window.addEventListener('mouseup', () => {
  if (!isDraggingSection || !draggingSectionEl) return;

  const ph = document.querySelector('.section-drag-placeholder');
  if (ph && ph.parentNode) {
    ph.parentNode.insertBefore(draggingSectionEl, ph);
    ph.remove();
  }

  draggingSectionEl.classList.remove('dragging');
  draggingSectionEl = null;
  isDraggingSection = false;

  pushHistory();
  updateUnsavedChangesUI();
});

// --- Reordenação horizontal de botões ([‹] [botão] [›]) -----
// Ativa quando o modo Shift está travado (shiftLocked), trocando
// os botões de editar/excluir por setas de mover.

function isButtonShiftLockActive() {
  return editMode && shiftLocked;
}

function getButtonWrappersFromSection(section) {
  if (!section) return [];
  const body = section.querySelector('.section-body') || section;
  return Array.from(body.querySelectorAll('.btn-wrap')).filter(btn => btn.querySelector('.copy-btn'));
}

function refreshButtonMoveDisabledState(buttonWrap) {
  const section = buttonWrap.closest('.section-wrap');
  const buttons = getButtonWrappersFromSection(section);
  const index = buttons.indexOf(buttonWrap);

  const prev = buttonWrap.querySelector('.blu-btn-move-prev');
  const next = buttonWrap.querySelector('.blu-btn-move-next');

  if (prev) prev.disabled = index <= 0;
  if (next) next.disabled = index === -1 || index >= buttons.length - 1;
}

function afterButtonMove(buttonWrap) {
  updateUnsavedChangesUI();
  applyButtonReorderControls();

  const copyBtn = buttonWrap.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.classList.add('blu-button-moved-feedback');
    setTimeout(() => copyBtn.classList.remove('blu-button-moved-feedback'), 260);
  }
}

function moveButtonPrev(buttonWrap) {
  const section = buttonWrap.closest('.section-wrap');
  const buttons = getButtonWrappersFromSection(section);
  const index = buttons.indexOf(buttonWrap);
  if (index <= 0) return;

  pushHistory();
  buttons[index - 1].before(buttonWrap);
  afterButtonMove(buttonWrap);
}

function moveButtonNext(buttonWrap) {
  const section = buttonWrap.closest('.section-wrap');
  const buttons = getButtonWrappersFromSection(section);
  const index = buttons.indexOf(buttonWrap);
  if (index === -1 || index >= buttons.length - 1) return;

  pushHistory();
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

  blockDragFromChild(btn);
  return btn;
}

function enableButtonReorder(buttonWrap) {
  const copyBtn = buttonWrap.querySelector('.copy-btn');
  if (!copyBtn) return;

  buttonWrap.querySelectorAll('.btn-edit, .btn-del').forEach(btn => btn.classList.add('blu-button-hidden-in-shiftlock'));

  if (!buttonWrap.classList.contains('blu-button-shift-row')) {
    buttonWrap.classList.add('blu-button-shift-row');
    const prev = createMoveButton('prev', buttonWrap);
    const next = createMoveButton('next', buttonWrap);
    copyBtn.before(prev);
    copyBtn.after(next);
  }

  refreshButtonMoveDisabledState(buttonWrap);
}

function disableButtonReorder(buttonWrap) {
  buttonWrap.querySelectorAll('.blu-btn-move-horizontal').forEach(btn => btn.remove());
  buttonWrap.classList.remove('blu-button-shift-row');
  buttonWrap.querySelectorAll('.blu-button-hidden-in-shiftlock').forEach(btn => btn.classList.remove('blu-button-hidden-in-shiftlock'));
}

function applyButtonReorderControls() {
  const shouldShow = isButtonShiftLockActive();
  document.querySelectorAll('.btn-wrap').forEach(buttonWrap => {
    if (shouldShow) enableButtonReorder(buttonWrap);
    else disableButtonReorder(buttonWrap);
  });
}
