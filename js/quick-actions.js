// ==========================================================
// Ações rápidas — disponíveis apenas em telas mobile touch
// ==========================================================

const quickActionsMedia = window.matchMedia('(max-width: 760px) and (pointer: coarse)');
let quickActionsOpen = false;
let quickActionsReturnTimer = null;
let quickActionsDisplaced = false;

function getQuickActionsObstructionBottom() {
  const obstructions = [];
  const banner = document.getElementById('backupBanner');
  const debugPanel = document.getElementById('debugPanel');
  if (banner?.classList.contains('show')) obstructions.push(banner);
  if (debugPanel && !debugPanel.hidden) obstructions.push(debugPanel);
  if (!obstructions.length) return 0;
  return Math.max(...obstructions.map(element => window.innerHeight - element.getBoundingClientRect().top + 10));
}

function updateQuickActionsPosition() {
  const root = document.getElementById('quickActions');
  const notificationArea = document.getElementById('notifArea');
  if (!root || !notificationArea) return;

  const notifications = [...notificationArea.querySelectorAll('.notif')];
  let bottom = getQuickActionsObstructionBottom();

  if (notifications.length > 1) {
    clearTimeout(quickActionsReturnTimer);
    quickActionsReturnTimer = null;
    quickActionsDisplaced = true;
  } else if (notifications.length === 1 && !quickActionsDisplaced) {
    bottom = Math.max(bottom, window.innerHeight - notificationArea.getBoundingClientRect().top + 10);
  } else if (notifications.length === 0 && quickActionsDisplaced && !quickActionsReturnTimer) {
    quickActionsReturnTimer = setTimeout(() => {
      quickActionsDisplaced = false;
      quickActionsReturnTimer = null;
      updateQuickActionsPosition();
    }, 3000);
  }

  root.classList.toggle('opposite-side', quickActionsDisplaced);
  if (bottom > 0) root.style.setProperty('--quick-actions-bottom', `${Math.ceil(bottom)}px`);
  else root.style.removeProperty('--quick-actions-bottom');
}

function createQuickActionButton({ id, label, icon, action }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = 'quick-action-item';
  button.innerHTML = `<span class="quick-action-label">${escapeHtml(label)}</span><span class="quick-action-icon">${iconSvg(icon)}</span>`;
  button.setAttribute('aria-label', label);
  button.onclick = () => {
    action();
    setQuickActionsOpen(false);
    updateQuickActionsUI();
  };
  return button;
}

function setQuickActionsOpen(open) {
  quickActionsOpen = Boolean(open) && quickActionsMedia.matches;
  const root = document.getElementById('quickActions');
  const toggle = document.getElementById('quickActionsToggle');
  root?.classList.toggle('open', quickActionsOpen);
  toggle?.setAttribute('aria-expanded', String(quickActionsOpen));
  toggle?.setAttribute('aria-label', quickActionsOpen ? 'Fechar ações rápidas' : 'Abrir ações rápidas');
}

function toggleQuickOrganizeMode() {
  if (shiftLocked) {
    toggleOrganizeMode();
    return;
  }
  if (!editMode) toggleEditMode();
  if (!shiftLocked) toggleOrganizeMode();
}

function updateQuickActionsUI() {
  const root = document.getElementById('quickActions');
  if (!root) return;

  root.hidden = !quickActionsMedia.matches;
  if (!quickActionsMedia.matches) setQuickActionsOpen(false);

  const undo = document.getElementById('quickUndoBtn');
  const redo = document.getElementById('quickRedoBtn');
  const edit = document.getElementById('quickEditBtn');
  const organize = document.getElementById('quickOrganizeBtn');
  if (undo) undo.disabled = history.length === 0;
  if (redo) redo.disabled = redoStack.length === 0;
  if (edit) {
    edit.classList.toggle('active', editMode);
    edit.setAttribute('aria-pressed', String(editMode));
  }
  if (organize) {
    organize.classList.toggle('active', shiftLocked);
    organize.setAttribute('aria-pressed', String(shiftLocked));
  }
}

function initQuickActions() {
  if (document.getElementById('quickActions')) return;
  const root = document.createElement('nav');
  root.id = 'quickActions';
  root.className = 'quick-actions';
  root.hidden = !quickActionsMedia.matches;
  root.setAttribute('aria-label', 'Ações rápidas');

  const items = document.createElement('div');
  items.className = 'quick-action-items';
  items.append(
    createQuickActionButton({ id: 'quickUndoBtn', label: 'Desfazer', icon: 'undo', action: undoLastAction }),
    createQuickActionButton({ id: 'quickRedoBtn', label: 'Refazer', icon: 'redo', action: redoLastAction }),
    createQuickActionButton({ id: 'quickEditBtn', label: 'Modo edição', icon: 'pencil', action: toggleEditMode }),
    createQuickActionButton({ id: 'quickOrganizeBtn', label: 'Organizar', icon: 'target', action: toggleQuickOrganizeMode })
  );

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'quickActionsToggle';
  toggle.className = 'quick-actions-toggle';
  toggle.innerHTML = iconSvg('wrench');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'quickActionItems');
  toggle.setAttribute('aria-label', 'Abrir ações rápidas');
  toggle.onclick = () => setQuickActionsOpen(!quickActionsOpen);
  items.id = 'quickActionItems';

  root.append(items, toggle);
  document.body.appendChild(root);
  updateQuickActionsUI();

  document.addEventListener('pointerdown', event => {
    if (quickActionsOpen && !event.target.closest('#quickActions')) setQuickActionsOpen(false);
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setQuickActionsOpen(false);
  });
  quickActionsMedia.addEventListener('change', updateQuickActionsUI);
  new MutationObserver(updateQuickActionsPosition).observe(document.getElementById('notifArea'), { childList: true });
  window.addEventListener('resize', updateQuickActionsPosition);
  updateQuickActionsPosition();
}
