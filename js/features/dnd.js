// ==========================================================
// Drag-and-drop de botões + reordenação de seções (modo Shift)
// ==========================================================

// --- Drag-and-drop de botões dentro/entre seções -----------

let dragEl = null;
let placeholder = null;
let draggedButtonOrigin = null;
let dragOrganizingFrame = 0;
let advancedOrganizingEnabled = false;

function updateAdvancedOrganizingButtonUI() {
  const button = document.getElementById('advancedOrganizingBtn');
  if (!button) return;
  button.classList.toggle('active', advancedOrganizingEnabled);
  button.setAttribute('aria-pressed', String(advancedOrganizingEnabled));
  button.querySelector('.menu-btn-label').textContent = `Estabilizar ao Arrastar: ${advancedOrganizingEnabled ? 'ON' : 'OFF'}`;
}

function initAdvancedOrganizingPreference() {
  advancedOrganizingEnabled = getSetting('advancedOrganizing') === 'on';
  updateAdvancedOrganizingButtonUI();
}

function toggleAdvancedOrganizing() {
  advancedOrganizingEnabled = !advancedOrganizingEnabled;
  setSetting('advancedOrganizing', advancedOrganizingEnabled ? 'on' : 'off');
  updateAdvancedOrganizingButtonUI();
  notify(`Estabilização ao arrastar ${advancedOrganizingEnabled ? 'ativada' : 'desativada'}`);
}

function prepareAdvancedDragLayout() {
  if (!advancedOrganizingEnabled) return;

  document.querySelectorAll('.section-body').forEach(body => {
    body.style.setProperty('--advanced-drag-body-height', `${body.getBoundingClientRect().height}px`);
  });
  document.body.classList.add('advanced-drag-organizing');
}

function clearAdvancedDragLayout() {
  document.body.classList.remove('advanced-drag-organizing');
  document.querySelectorAll('.section-body').forEach(body => {
    body.style.removeProperty('--advanced-drag-body-height');
  });
}

function setDragOrganizing(active) {
  if (!active && dragOrganizingFrame) {
    cancelAnimationFrame(dragOrganizingFrame);
    dragOrganizingFrame = 0;
  }
  document.body.classList.toggle('drag-organizing', active);
  if (!active) clearAdvancedDragLayout();
}

function scheduleNativeDragOrganizing(element, targetPlaceholder) {
  dragOrganizingFrame = requestAnimationFrame(() => {
    dragOrganizingFrame = 0;
    if (dragEl !== element || !targetPlaceholder) return;

    // Alterar o fluxo ainda dentro de dragstart pode deslocar a origem antes
    // de o navegador consolidar o arraste. No quadro seguinte isso é seguro.
    setDragOrganizing(true);
    const compactRect = element.getBoundingClientRect();
    targetPlaceholder.style.setProperty('--drag-placeholder-width', `${compactRect.width}px`);
    targetPlaceholder.style.setProperty('--drag-placeholder-height', `${compactRect.height}px`);
  });
}

// Mantém o espaço de destino estável com uma cópia visual do item arrastado.
// A cópia é inerte: existe apenas para representar tamanho e aparência.
function createDragPlaceholder(element, className) {
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true);

  clone.classList.remove('dragging', 'pointer-dragging');
  clone.classList.add(className);
  clone.removeAttribute('id');
  clone.removeAttribute('draggable');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.style.setProperty('--drag-placeholder-width', `${rect.width}px`);
  clone.style.setProperty('--drag-placeholder-height', `${rect.height}px`);

  clone.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
  clone.querySelectorAll('[draggable]').forEach(child => child.removeAttribute('draggable'));

  return clone;
}

// --- Preferência "Destino ao Arrastar" (preview visual do drag) -----
// Desativado por padrão. Importante: mesmo desativado, o placeholder
// CONTINUA sendo posicionado no DOM normalmente — o CSS só o retira do
// fluxo visual (body.drag-preview-off). Isso preserva o
// posicionamento correto no drop (onDrop depende de placeholder.parentNode
// para saber onde inserir o item), sem exibir a "caixa" pra quem não quer vê-la.

let dragPreviewEnabled = false;

function updateDragPreviewButtonUI() {
  const button = document.getElementById('dragPreviewBtn');
  if (!button) return;
  button.classList.toggle('active', dragPreviewEnabled);
  button.querySelector('.menu-btn-label').textContent = `Destino ao Arrastar: ${dragPreviewEnabled ? 'ON' : 'OFF'}`;
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
  const originSection = this.closest('.section-wrap');
  draggedButtonOrigin = {
    sectionId: originSection?.dataset.id || '',
    sectionName: originSection?.querySelector('.section-title')?.textContent || '',
    position: [...(originSection?.querySelectorAll('.btn-wrap') || [])].indexOf(this) + 1
  };
  hideButtonPreview();
  this.querySelector('.copy-btn')?.removeAttribute('title');
  prepareAdvancedDragLayout();
  this.classList.add('dragging');
  placeholder = createDragPlaceholder(this, 'drag-placeholder');
  event.dataTransfer.effectAllowed = 'move';
  scheduleNativeDragOrganizing(this, placeholder);
}

function onDragEnd() {
  if (dragEl) {
    dragEl.classList.remove('dragging');
    const copyButton = dragEl.querySelector('.copy-btn');
    if (copyButton && textPreviewMode === 'native') {
      const title = getCopyButtonTitle(copyButton);
      if (title) copyButton.title = title;
    }
  }
  placeholder?.remove();
  setDragOrganizing(false);
  dragEl = null;
  placeholder = null;
  draggedButtonOrigin = null;
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

  const destinationSection = dragEl.closest('.section-wrap');
  const destinationName = destinationSection?.querySelector('.section-title')?.textContent || '';
  const destinationPosition = [...(destinationSection?.querySelectorAll('.btn-wrap') || [])].indexOf(dragEl) + 1;
  const eventType = draggedButtonOrigin?.sectionId !== destinationSection?.dataset.id ? 'transferred' : 'reordered';
  if (eventType === 'transferred' || draggedButtonOrigin?.position !== destinationPosition) {
    recordActivityEvent(eventType, {
      target: 'button', targetId: dragEl.dataset.id,
      name: dragEl.querySelector('.btn-label')?.textContent || 'Botão sem nome',
      sectionId: destinationSection?.dataset.id || '', sectionName: destinationName,
      fromSectionName: draggedButtonOrigin?.sectionName || '', toSectionName: destinationName,
      fromPosition: draggedButtonOrigin?.position, toPosition: destinationPosition
    });
  }

  document.querySelectorAll('.section-body').forEach(body => updateSectionCount(body.dataset.section));
  applyButtonReorderControls();
  updateUnsavedChangesUI();
}

function getDragAfter(container, x) {
  const elements = [...container.querySelectorAll('.btn-wrap:not(.dragging):not(.drag-placeholder)')];

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
let draggedSectionOriginPosition = null;

function updateShiftMode() {
  if (!editMode) {
    shiftActive = false;
    shiftLocked = false;
    document.body.classList.remove('shift-mode', 'shift-locked');
    applyButtonReorderControls();
    updateOrganizeModeButtonUI();
    if (typeof updateQuickActionsUI === 'function') updateQuickActionsUI();
    return;
  }

  document.body.classList.toggle('shift-mode', shiftActive || shiftLocked);
  document.body.classList.toggle('shift-locked', shiftLocked);
  applyButtonReorderControls();
  updateOrganizeModeButtonUI();
  if (typeof updateQuickActionsUI === 'function') updateQuickActionsUI();
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
  button.querySelector('.menu-btn-label').textContent = `Modo de Organização: ${shiftLocked ? 'ON' : 'OFF'}`;
}

// Alterna o modo de organização a partir do clique no botão do menu — usa a
// mesma variável e o mesmo updateShiftMode() que o atalho de teclado.
function toggleOrganizeMode() {
  if (!editMode) return; // botão fica desabilitado nesse caso; defesa extra
  shiftLocked = !shiftLocked;
  updateShiftMode();
  mobileHaptic('toggle');
  notify(shiftLocked ? 'Modo de organização ativado' : 'Modo de organização desativado');
}

function getSectionPlaceholder() {
  if (!sectionPlaceholderEl && draggingSectionEl) {
    sectionPlaceholderEl = createDragPlaceholder(draggingSectionEl, 'section-drag-placeholder');
  }
  return sectionPlaceholderEl;
}

function moveSectionUp(btn) {
  const section = btn.closest('.section-wrap');
  const prev = section.previousElementSibling;
  if (!prev) return;

  pushHistory();
  section.parentNode.insertBefore(section, prev);
  recordActivityEvent('reordered', {
    target: 'section', targetId: section.dataset.id,
    name: section.querySelector('.section-title')?.textContent || 'Seção sem nome',
    fromPosition: [...section.parentNode.children].indexOf(section) + 2,
    toPosition: [...section.parentNode.children].indexOf(section) + 1
  });
  updateUnsavedChangesUI();
}

function moveSectionDown(btn) {
  const section = btn.closest('.section-wrap');
  const next = section.nextElementSibling;
  if (!next) return;

  pushHistory();
  const fromPosition = [...section.parentNode.children].indexOf(section) + 1;
  section.parentNode.insertBefore(next, section);
  recordActivityEvent('reordered', {
    target: 'section', targetId: section.dataset.id,
    name: section.querySelector('.section-title')?.textContent || 'Seção sem nome',
    fromPosition, toPosition: [...section.parentNode.children].indexOf(section) + 1
  });
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
  draggedSectionOriginPosition = [...section.parentNode.children].indexOf(section) + 1;
  isDraggingSection = true;
  prepareAdvancedDragLayout();
  section.classList.add('dragging');
  setDragOrganizing(true);
});

window.addEventListener('mousemove', event => {
  if (!isDraggingSection || !draggingSectionEl) return;

  const target = event.target.closest('.section-wrap:not(.section-drag-placeholder)');
  if (!target || target === draggingSectionEl) return;

  const rect = target.getBoundingClientRect();
  const mid = rect.top + rect.height / 2;
  const parent = target.parentNode;
  const ph = getSectionPlaceholder();
  if (!ph) return;

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
    // Neste ponto a seção original ainda está na posição antiga; somente o
    // marcador visual está no destino. O snapshot precisa ser feito agora.
    pushHistory();
    ph.parentNode.insertBefore(draggingSectionEl, ph);
    ph.remove();
  }

  draggingSectionEl.classList.remove('dragging');
  const movedSection = draggingSectionEl;
  const destinationPosition = [...movedSection.parentNode.children].indexOf(movedSection) + 1;
  draggingSectionEl = null;
  sectionPlaceholderEl = null;
  isDraggingSection = false;
  setDragOrganizing(false);

  if (draggedSectionOriginPosition !== destinationPosition) {
    recordActivityEvent('reordered', {
      target: 'section', targetId: movedSection.dataset.id,
      name: movedSection.querySelector('.section-title')?.textContent || 'Seção sem nome',
      fromPosition: draggedSectionOriginPosition, toPosition: destinationPosition
    });
  }
  draggedSectionOriginPosition = null;
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
  recordActivityEvent('reordered', {
    target: 'button', targetId: buttonWrap.dataset.id,
    name: buttonWrap.querySelector('.btn-label')?.textContent || 'Botão sem nome',
    sectionId: section.dataset.id, sectionName: section.querySelector('.section-title')?.textContent || '',
    fromPosition: index + 1, toPosition: index
  });
  afterButtonMove(buttonWrap);
}

function moveButtonNext(buttonWrap) {
  const section = buttonWrap.closest('.section-wrap');
  const buttons = getButtonWrappersFromSection(section);
  const index = buttons.indexOf(buttonWrap);
  if (index === -1 || index >= buttons.length - 1) return;

  pushHistory();
  buttons[index + 1].after(buttonWrap);
  recordActivityEvent('reordered', {
    target: 'button', targetId: buttonWrap.dataset.id,
    name: buttonWrap.querySelector('.btn-label')?.textContent || 'Botão sem nome',
    sectionId: section.dataset.id, sectionName: section.querySelector('.section-title')?.textContent || '',
    fromPosition: index + 1, toPosition: index + 2
  });
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

// --- Pointer drag para touch/pen ------------------------------------
// No mobile, o drag só começa após uma pressão curta e somente no Modo
// Organização. Assim, rolar a página e tocar para copiar continuam seguros.

let pointerDragCandidate = null;
let pointerDragState = null;
let pointerDragTimer = null;
let suppressPointerClick = false;

function clearPointerDragCandidate() {
  clearTimeout(pointerDragTimer);
  pointerDragTimer = null;
  pointerDragCandidate = null;
}

function beginPointerDrag(candidate) {
  if (!candidate?.element?.isConnected) return;
  pointerDragState = candidate;
  pointerDragCandidate = null;
  suppressPointerClick = true;
  hideButtonPreview();
  prepareAdvancedDragLayout();
  candidate.element.classList.add('dragging', 'pointer-dragging');
  setDragOrganizing(true);

  if (candidate.type === 'button') {
    dragEl = candidate.element;
    placeholder = createDragPlaceholder(candidate.element, 'drag-placeholder');
  } else {
    draggingSectionEl = candidate.element;
    isDraggingSection = true;
  }

  mobileHaptic('dragStart');
}

function updatePointerButtonDrag(x, y) {
  const target = document.elementFromPoint(x, y);
  const body = target?.closest('.section-body');
  if (!body || !dragEl || !placeholder) return;
  const targetButton = target.closest('.btn-wrap:not(.dragging):not(.drag-placeholder)');
  if (!targetButton) {
    body.appendChild(placeholder);
    return;
  }
  const rect = targetButton.getBoundingClientRect();
  const insertAfter = y > rect.top + rect.height / 2
    || (y >= rect.top && y <= rect.bottom && x > rect.left + rect.width / 2);
  body.insertBefore(placeholder, insertAfter ? targetButton.nextSibling : targetButton);
}

function updatePointerSectionDrag(x, y) {
  const target = document.elementFromPoint(x, y)?.closest('.section-wrap:not(.section-drag-placeholder)');
  if (!target || target === draggingSectionEl) return;
  const rect = target.getBoundingClientRect();
  const ph = getSectionPlaceholder();
  if (!ph) return;
  if (y < rect.top + rect.height / 2) target.before(ph);
  else target.after(ph);
}

function finishPointerDrag(cancelled = false) {
  if (!pointerDragState) return;
  const { type, element } = pointerDragState;
  let moved = false;

  if (!cancelled && type === 'button' && placeholder?.parentNode) {
    pushHistory();
    placeholder.parentNode.insertBefore(element, placeholder);
    moved = true;
  } else if (!cancelled && type === 'section') {
    const ph = document.querySelector('.section-drag-placeholder');
    if (ph?.parentNode) {
      pushHistory();
      ph.parentNode.insertBefore(element, ph);
      moved = true;
    }
  }

  element.classList.remove('dragging', 'pointer-dragging');
  placeholder?.remove();
  sectionPlaceholderEl?.remove();
  dragEl = null;
  placeholder = null;
  draggingSectionEl = null;
  sectionPlaceholderEl = null;
  isDraggingSection = false;
  pointerDragState = null;
  setDragOrganizing(false);

  if (moved) {
    document.querySelectorAll('.section-body').forEach(body => updateSectionCount(body.dataset.section));
    applyButtonReorderControls();
    updateUnsavedChangesUI();
    mobileHaptic('success');
    notifyUndo(type === 'button' ? 'Botão movido!' : 'Seção movida!');
  }
  setTimeout(() => { suppressPointerClick = false; }, 0);
}

document.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' || !editMode || event.button !== 0) return;
  if (event.target.closest('.btn-edit, .btn-del, .blu-btn-move-horizontal, .section-move-controls, .section-collapse-btn, .section-add-btn')) return;

  const button = event.target.closest('.btn-wrap');
  const section = event.target.closest('.section-wrap');
  if (!button && (!section || !shiftLocked)) return;
  const element = button || section;

  pointerDragCandidate = {
    id: event.pointerId,
    type: button ? 'button' : 'section',
    element,
    x: event.clientX,
    y: event.clientY
  };
  pointerDragTimer = setTimeout(() => beginPointerDrag(pointerDragCandidate), 320);
}, true);

document.addEventListener('pointermove', event => {
  if (pointerDragCandidate?.id === event.pointerId) {
    const distance = Math.hypot(event.clientX - pointerDragCandidate.x, event.clientY - pointerDragCandidate.y);
    if (distance > 10) clearPointerDragCandidate();
    return;
  }
  if (!pointerDragState || pointerDragState.id !== event.pointerId) return;
  event.preventDefault();
  if (pointerDragState.type === 'button') updatePointerButtonDrag(event.clientX, event.clientY);
  else updatePointerSectionDrag(event.clientX, event.clientY);
}, { capture: true, passive: false });

document.addEventListener('pointerup', event => {
  if (pointerDragCandidate?.id === event.pointerId) clearPointerDragCandidate();
  if (pointerDragState?.id === event.pointerId) finishPointerDrag(false);
}, true);

document.addEventListener('pointercancel', event => {
  if (pointerDragCandidate?.id === event.pointerId) clearPointerDragCandidate();
  if (pointerDragState?.id === event.pointerId) finishPointerDrag(true);
}, true);

document.addEventListener('click', event => {
  if (!suppressPointerClick) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
