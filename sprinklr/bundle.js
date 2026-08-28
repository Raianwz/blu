/* ==========================================================
   bundle.js — concatenated bundle (readable)
   Order: utils.js, dialogs.js, storage.js, render.js (shim),
          search.js, crypto.js, crud.js, dnd.js, app.js
   ========================================================== */

/* ------------------ utils.js ------------------ */
// ==========================================================
// Utilitários gerais (sanitização, formatação, notificações)
// ==========================================================
function sanitizeText(value) {
  return String(value ?? '');
}

function normalizeSearchText(value) {
  return sanitizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeTag(value) {
  return normalizeSearchText(value).replace(/\s+/g, ' ');
}

function previewText(text, max = 220) {
  const clean = sanitizeText(text).trim();
  if (!clean) return '';
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
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

function isTypingField(element) {
  if (!element) return false;
  const tag = element.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable;
}

function notify(msg, type = 'ok') {
  const area = document.getElementById('notifArea');
  if (!area) return;
  const element = document.createElement('div');
  element.className = 'notif' + (type === 'err' ? ' err' : '');
  element.textContent = msg;
  area.appendChild(element);
  setTimeout(() => element.remove(), 3000);
}
const ICONS = {
  chevron_down: `<path d="m6 9 6 6 6-6" />`,
  arrow_up: `<path d="m18 15-6-6-6 6" />`,
  arrow_down: `<path d="m6 9 6 6 6-6" />`,
  palette: `<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />`,
  wrench: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" />`,
  copy: `<rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />`,
  copy_plus: `<rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /><path d="M15 15h6M18 12v6" />`,
  eye: `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />`,
  pencil: `<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /> <path d="m15 5 4 4" />`,
  folder_plus: `<path d="M12 10v6" /> <path d="M9 13h6" /> <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />`,
  tag: `<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /> <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />`,
  download: `<path d="M12 15V3" /> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /> <path d="m7 10 5 5 5-5" />`,
  upload: `<path d="M12 3v12" /> <path d="m17 8-5-5-5 5" /> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />`,
  unfold_vertical: `<path d="M12 22v-6" /> <path d="M12 8V2" /> <path d="M4 12H2" /> <path d="M10 12H8" /> <path d="M16 12h-2" /> <path d="M22 12h-2" /> <path d="m15 19-3 3-3-3" /> <path d="m15 5-3-3-3 3" />`,
  fold_vertical: `<path d="M12 22v-6" /> <path d="M12 8V2" /> <path d="M4 12H2" /> <path d="M10 12H8" /> <path d="M16 12h-2" /> <path d="M22 12h-2" /> <path d="m15 19-3-3-3 3" /> <path d="m15 5-3 3-3-3" />`,
  moon: `<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />`,
  sun: `<circle cx="12" cy="12" r="4" /> <path d="M12 2v2" /> <path d="M12 20v2" /> <path d="m4.93 4.93 1.41 1.41" /> <path d="m17.66 17.66 1.41 1.41" /> <path d="M2 12h2" /> <path d="M20 12h2" /> <path d="m6.34 17.66-1.41 1.41" /> <path d="m19.07 4.93-1.41 1.41" />`,
  monitor: `<rect width="20" height="14" x="2" y="3" rx="2" /> <path d="M8 21h8" /> <path d="M12 17v4" />`,
  keyboard: `<path d="M10 8h.01" /> <path d="M12 12h.01" /> <path d="M14 8h.01" /> <path d="M16 12h.01" /> <path d="M18 8h.01" /> <path d="M6 8h.01" /> <path d="M7 16h10" /> <path d="M8 12h.01" /> <rect width="20" height="16" x="2" y="4" rx="2" />`,
  external_link: `<path d="M15 3h6v6" /> <path d="M10 14 21 3" /> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />`,
  app_window: `<rect x="2" y="4" width="20" height="16" rx="2" /> <path d="M10 4v4" /> <path d="M2 8h20" /> <path d="M6 4v4" />`,
  trash_2: `<path d="M10 11v6" /> <path d="M14 11v6" /> <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /> <path d="M3 6h18" /> <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />`,
  lock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /> <path d="M7 11V7a5 5 0 0 1 10 0v4" />`,
  menu: `<path d="M4 5h16" /> <path d="M4 12h16" /> <path d="M4 19h16" />`,
  search: `<path d="m21 21-4.34-4.34" /> <circle cx="11" cy="11" r="8" />`,
};

function iconSvg(name, extraClass = '') {
  const inner = ICONS[name] || '';
  return `<svg class="menu-icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function setIcon(wrapEl, name) {
  if (!wrapEl) return;
  wrapEl.innerHTML = iconSvg(name);
}

/* ------------------ dialogs.js ------------------ */
// ==========================================================
// Diálogos customizados (substituem confirm()/prompt() nativos)
// ==========================================================
let activeDialogResolve = null;

function getDialogEls() {
  return {
    bg: document.getElementById('dialogModal'),
    title: document.getElementById('dialogTitle'),
    message: document.getElementById('dialogMessage'),
    inputWrap: document.getElementById('dialogInputWrap'),
    input: document.getElementById('dialogInput'),
    confirmBtn: document.getElementById('dialogConfirmBtn'),
    cancelBtn: document.getElementById('dialogCancelBtn')
  };
}

function closeDialog(result) {
  const { bg } = getDialogEls();
  if (bg) bg.classList.remove('open');
  if (activeDialogResolve) {
    const resolve = activeDialogResolve;
    activeDialogResolve = null;
    resolve(result);
  }
}

function openDialog({ title, message, danger = false, showInput = false, inputValue = '', confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  const { bg, title: titleEl, message: messageEl, inputWrap, input, confirmBtn, cancelBtn } = getDialogEls();

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (confirmBtn) {
    confirmBtn.textContent = confirmText;
    confirmBtn.classList.toggle('danger', danger);
  }
  if (cancelBtn) cancelBtn.textContent = cancelText;

  if (showInput && inputWrap && input) {
    inputWrap.style.display = 'block';
    input.value = inputValue;
  } else if (inputWrap) {
    inputWrap.style.display = 'none';
  }

  if (bg) bg.classList.add('open');

  return new Promise(resolve => {
    activeDialogResolve = resolve;
    if (showInput) {
      setTimeout(() => { input.focus(); input.select(); }, 50);
    } else {
      setTimeout(() => confirmBtn && confirmBtn.focus(), 50);
    }
  });
}

// Substitui confirm(): retorna Promise<boolean>
function confirmDialog(message, { title = 'Confirmar ação', danger = false, confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
  return openDialog({ title, message, danger, showInput: false, confirmText, cancelText }).then(result => result === true);
}

// Substitui prompt(): retorna Promise<string|null>
function promptDialog(message, defaultValue = '', { title = 'Editar' } = {}) {
  return openDialog({ title, message, showInput: true, inputValue: defaultValue, confirmText: 'Salvar', cancelText: 'Cancelar' })
    .then(result => {
      if (result !== true) return null;
      const { input } = getDialogEls();
      return input ? input.value : null;
    });
}

function setupDialogEvents() {
  const { bg, confirmBtn, cancelBtn, input } = getDialogEls();
  if (!bg) return;

  confirmBtn?.addEventListener('click', () => closeDialog(true));
  cancelBtn?.addEventListener('click', () => closeDialog(false));

  bg.addEventListener('click', event => {
    if (event.target === bg) closeDialog(false);
  });

  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      closeDialog(true);
    }
  });
}

/* ------------------ storage.js ------------------ */
// ==========================================================
// Estado, persistência local (autosave) e lembrete de backup
// ==========================================================
const STORAGE_KEY = 'blu:data';
const SETTINGS_STORAGE_KEY = 'blu:settings';
const VERSION = '1.6.1 LTS';
const BASE_TITLE = 'Blû';

let editMode = false;
let tags = [];
let history = [];
let redoStack = [];
const REDO_LIMIT = 10;
let clearUndoSnapshot = null;
let clearRedoSnapshot = null;

let lastExportedComparableState = '';

const isPopoutWindow = !!window.opener && ['BluePopout', 'BluePopOut'].includes(window.name);

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) { return {}; }
}

function getSetting(name, fallback = null) {
  const settings = loadSettings();
  return Object.prototype.hasOwnProperty.call(settings, name) ? settings[name] : fallback;
}

function setSetting(name, value) {
  try {
    const settings = loadSettings();
    settings[name] = value;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {}
}

function migrateLegacySettings() {
  const settings = loadSettings();
  try {
    const legacyTheme = localStorage.getItem('blu:theme');
    if (!Object.prototype.hasOwnProperty.call(settings, 'theme') && legacyTheme !== null) settings.theme = legacyTheme;
    if (legacyTheme !== null) localStorage.removeItem('blu:theme');
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {}
}

function clearBluLocalStorage() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith('blu:')) localStorage.removeItem(key);
    }
  } catch (_) {}
}

function clearBluPreferences() {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem('blu:theme');
    localStorage.removeItem('blu:textPreview');
    return true;
  } catch (error) {
    console.error('Erro ao redefinir preferências:', error);
    return false;
  }
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
  if (!lastExportedComparableState) return false;
  return getComparableStateString() !== lastExportedComparableState;
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
    return true;
  } catch (error) {
    console.error('Erro ao salvar localmente:', error);
    notify('Não foi possível salvar localmente (armazenamento cheio?)', 'err');
    return false;
  }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao carregar dados salvos:', error);
    return null;
  }
}

const SAVED_PHRASES = [
  'salvo no navegador',
  'salvo localmente',
  'foi muito bem salvo',
  'salvo com segurança',
  'todos os dados salvos',
  'salvo, mas faz backup!'
];

let isVersionBadgeHovering = false;

function getBaseBadgeText(dirty) {
  return dirty ? 'Blû • salvo localmente, sem backup exportado' : `Blû ${VERSION} • salvo localmente`;
}

function getVersionedBadgeText(dirty) {
  if (dirty) return `Blû ${VERSION} • salvo localmente, sem backup exportado`;
  const phrase = SAVED_PHRASES[Math.floor(Math.random() * SAVED_PHRASES.length)];
  return `Blû ${VERSION} • ${phrase}`;
}

function updateUnsavedChangesUI() {
  persistState();

  const dirty = hasUnsavedChanges();
  const versionBadge = document.getElementById('appVersion');
  const exportBtn = document.getElementById('exportBtn');

  if (versionBadge) {
    versionBadge.classList.toggle('unsaved', dirty);
    versionBadge.dataset.dirty = String(dirty);
    versionBadge.textContent = isVersionBadgeHovering ? getVersionedBadgeText(dirty) : getBaseBadgeText(dirty);
    versionBadge.title = dirty
      ? 'Seus dados estão salvos neste navegador. Exporte um JSON para ter um backup fora do navegador.'
      : 'Seus dados estão salvos neste navegador e com backup exportado.';
  }

  if (exportBtn) {
    exportBtn.classList.toggle('active', dirty);
    exportBtn.title = dirty ? 'Exportar JSON — há alterações sem backup' : 'Exportar JSON';
  }

  document.title = dirty ? `● ${BASE_TITLE}` : BASE_TITLE;
  evaluateBackupBanner(dirty);
}

function setupVersionBadgeHover() {
  const versionBadge = document.getElementById('appVersion');
  if (!versionBadge) return;

  let hoverTimer = null;

  versionBadge.addEventListener('mouseenter', () => {
    hoverTimer = setTimeout(() => {
      isVersionBadgeHovering = true;
      versionBadge.textContent = getVersionedBadgeText(versionBadge.dataset.dirty === 'true');
    }, 1500);
  });

  versionBadge.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    isVersionBadgeHovering = false;
    versionBadge.textContent = getBaseBadgeText(versionBadge.dataset.dirty === 'true');
  });
}

function markCurrentStateAsExported() {
  lastExportedComparableState = getComparableStateString();
  updateUnsavedChangesUI();
}

window.addEventListener('beforeunload', event => {
  if (isPopoutWindow || !hasUnsavedChanges()) return;
  event.preventDefault();
  event.returnValue = '';
});

let backupBannerDismissedFor = '';

function evaluateBackupBanner(dirty) {
  const banner = document.getElementById('backupBanner');
  if (!banner) return;

  if (isPopoutWindow) {
    banner.classList.remove('show');
    return;
  }

  const current = getComparableStateString();
  if (!dirty || backupBannerDismissedFor === current) {
    banner.classList.remove('show');
    return;
  }

  banner.classList.add('show');
}

function dismissBackupBanner() {
  backupBannerDismissedFor = getComparableStateString();
  evaluateBackupBanner(hasUnsavedChanges());
}

function pushHistory() {
  history.push(JSON.stringify(collectState()));
  if (history.length > 30) history.shift();
  redoStack = [];
  clearRedoSnapshot = null;
}

function pushRedoState(stateString) {
  redoStack.push(stateString);
  if (redoStack.length > REDO_LIMIT) redoStack.shift();
}

function restoreState(state) {
  const normalizedState = normalizeImportedData(state);
  tags = [...normalizedState.tags];
  updateTagDatalist();
  renderAll(normalizedState.sections);

  if (editMode) {
    document.querySelectorAll('.btn-wrap').forEach(button => button.draggable = true);
  }

  doSearch();
  updateUnsavedChangesUI();
}

function undoLastAction() {
  if (history.length === 0) return;

  try {
    const currentStateString = JSON.stringify(collectState());
    pushRedoState(currentStateString);
    const previousStateString = history.pop();
    if (clearUndoSnapshot?.stateString === previousStateString) {
      clearRedoSnapshot = { stateString: currentStateString, exportedComparableState: lastExportedComparableState };
      lastExportedComparableState = clearUndoSnapshot.exportedComparableState;
      clearUndoSnapshot = null;
    }
    const previousState = JSON.parse(previousStateString);
    restoreState(previousState);
    notify('Desfeito!');
  } catch (error) {
    console.error('Erro ao desfazer:', error);
    notify('Não foi possível desfazer', 'err');
  }
}

function redoLastAction() {
  if (redoStack.length === 0) return;

  try {
    const currentStateString = JSON.stringify(collectState());
    history.push(currentStateString);
    if (history.length > 30) history.shift();

    const nextStateString = redoStack.pop();
    if (clearRedoSnapshot?.stateString === nextStateString) {
      clearUndoSnapshot = { stateString: currentStateString, exportedComparableState: lastExportedComparableState };
      lastExportedComparableState = clearRedoSnapshot.exportedComparableState;
      clearRedoSnapshot = null;
    }
    const nextState = JSON.parse(nextStateString);
    restoreState(nextState);
    notify('Refeito!');
  } catch (error) {
    console.error('Erro ao refazer:', error);
    notify('Não foi possível refazer', 'err');
  }
}

/* ------------------ render.js (shim) ------------------ */
// ==========================================================

let textPreviewEnabled = true;
let textPreviewEl = null;
let textPreviewTimer = null;
let textPreviewSource = null;

function getTextPreviewEl() {
  if (textPreviewEl) return textPreviewEl;
  textPreviewEl = document.createElement('div');
  textPreviewEl.id = 'buttonPreviewTooltip';
  textPreviewEl.setAttribute('role', 'tooltip');
  document.body.appendChild(textPreviewEl);
  return textPreviewEl;
}

function getCopyButtonTitle(button) {
  const wrap = button.closest('.btn-wrap');
  const text = wrap?.dataset.text || '';
  if (!text) return '';
  return wrap?.dataset.vis === 'private' ? `🔒 Privado\n\n${text}` : text;
}

function syncCopyButtonTitles() {
  document.querySelectorAll('.copy-btn').forEach(button => {
    const title = getCopyButtonTitle(button);
    if (textPreviewEnabled && title.length <= 220) button.removeAttribute('title');
    else if (title) button.title = title;
  });
}

function applyTextPreviewState(enabled, persist = false) {
  textPreviewEnabled = !!enabled;
  const button = document.getElementById('textPreviewBtn');
  button?.classList.toggle('active', textPreviewEnabled);
  const label = button?.querySelector('.menu-btn-label');
  if (label) label.textContent = `Prévia de Texto: ${textPreviewEnabled ? 'ON' : 'OFF'}`;
  syncCopyButtonTitles();
  if (!textPreviewEnabled) hideButtonPreview();
  if (persist) setSetting('textPreview', textPreviewEnabled ? 'on' : 'off');
}

function initTextPreviewPreference() {
  applyTextPreviewState(getSetting('textPreview') !== 'off');
}

function toggleTextPreview() {
  applyTextPreviewState(!textPreviewEnabled, true);
}

function showButtonPreview(button) {
  if (!textPreviewEnabled || !button.isConnected || !button.matches(':hover') || !button.dataset.preview || button.closest('.search-hidden') || document.querySelector('.btn-wrap.dragging')) return;
  const tooltip = getTextPreviewEl();
  tooltip.textContent = button.dataset.preview;
  tooltip.classList.add('show');
  const buttonRect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const padding = 8;
  const left = Math.min(Math.max(buttonRect.left + (buttonRect.width - tooltipRect.width) / 2, padding), Math.max(padding, innerWidth - tooltipRect.width - padding));
  const preferredTop = buttonRect.top >= tooltipRect.height + gap + padding ? buttonRect.top - tooltipRect.height - gap : buttonRect.bottom + gap;
  const topbarBottom = document.getElementById('topbar')?.getBoundingClientRect().bottom || 0;
  const minTop = topbarBottom + padding;
  const top = Math.min(Math.max(preferredTop, minTop), Math.max(minTop, innerHeight - tooltipRect.height - padding));
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function hideButtonPreview() {
  clearTimeout(textPreviewTimer);
  textPreviewTimer = null;
  textPreviewSource = null;
  textPreviewEl?.classList.remove('show');
}

window.addEventListener('scroll', hideButtonPreview, true);
window.addEventListener('resize', hideButtonPreview);
// Renderização de seções e botões
// ==========================================================

function renderAll(sectionsData) {
  const container = document.getElementById('sections');
  container.innerHTML = '';
  sectionsData.forEach(section => renderSection(section, container));
  updateToggleSectionsBtnLabel();
  applyButtonReorderControls();
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
      <div class="section-move-controls">
        <button onclick="moveSectionUp(this)" title="Mover seção para cima">⬆️</button>
        <button onclick="moveSectionDown(this)" title="Mover seção para baixo">⬇️</button>
      </div>
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
  wrap.dataset.tag = normalizeTag(button.tag);
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
  const nativeTitle = vis === 'private' ? `🔒 Privado\n\n${wrap.dataset.text || ''}` : (wrap.dataset.text || '');
  if (!textPreviewEnabled || nativeTitle.length > 220) copyBtn.title = nativeTitle;
  copyBtn.innerHTML = `${visIcon ? `<span>${visIcon}</span>` : ''}<span class="btn-label">${escapeHtml(button.name || '')}</span>`;
  copyBtn.onclick = () => doCopy(wrap.dataset.text || '', copyBtn);

  copyBtn.addEventListener('mouseenter', () => {
    if (!textPreviewEnabled) return;
    hideButtonPreview();
    textPreviewSource = copyBtn;
    textPreviewTimer = setTimeout(() => {
      if (textPreviewSource === copyBtn) showButtonPreview(copyBtn);
    }, 700);
  });
  copyBtn.addEventListener('mouseleave', () => {
    hideButtonPreview();
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

// --- Expandir/recolher seções -------------------------------

function getVisibleSections() {
  return [...document.querySelectorAll('.section-wrap')]
    .filter(section => !section.classList.contains('search-hidden'));
}

function setSectionCollapsed(section, collapsed) {
  section.classList.toggle('collapsed', collapsed);
  const button = section.querySelector('.section-collapse-btn');
  if (button) button.title = collapsed ? 'Expandir' : 'Recolher';
}

function toggleCollapse(btn) {
  const wrap = btn.closest('.section-wrap');
  const isCollapsed = wrap.classList.toggle('collapsed');
  btn.title = isCollapsed ? 'Expandir' : 'Recolher';
  wrap.querySelector('.section-count').textContent = wrap.querySelectorAll('.btn-wrap').length;
  updateToggleSectionsBtnLabel();
  persistState();
}

function updateToggleSectionsBtnLabel() {
  const button = document.getElementById('toggleSectionsBtn');
  if (!button) return;

  const visibleSections = getVisibleSections();
  const targetSections = visibleSections.length
    ? visibleSections
    : [...document.querySelectorAll('.section-wrap')];

  const hasCollapsed = targetSections.some(section => section.classList.contains('collapsed'));
  const icon = button.querySelector('.menu-icon');
  if (icon) icon.innerHTML = ICONS[hasCollapsed ? 'unfold_vertical' : 'fold_vertical'];
  button.querySelector('.menu-btn-label').textContent = hasCollapsed ? 'Expandir Categorias' : 'Minimizar Categorias';
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
  persistState();
  notify(hasCollapsed ? 'Categorias expandidas' : 'Categorias minimizadas');
}


/* ------------------ search.js ------------------ */
// ==========================================================
// Pesquisa (nome, tag, @seção)
// ==========================================================
const SEARCH_ALL_PLACEHOLDERS = [
  'Pesquisar...',
  'Pesquisar por nome',
  'Pesquisar por tag ou grupo',
  'Pesquisar por @seção',
  'Pesquisar por "texto"',
  'Pesquisar por nome ou tag'
];
const SEARCH_TYPE_PLACEHOLDERS = {
  name: 'Pesquisar por nome...',
  tag: 'Pesquisar por tag ou grupo...',
  category: 'Pesquisar por seção...',
  text: 'Pesquisar no conteúdo dos botões...'
};
const desktopSearchGuidanceMedia = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
let searchPlaceholderIndex = 0;
let searchPlaceholderTimer = null;
let searchPlaceholderSwapTimer = null;

function stopSearchPlaceholderRotation() {
  clearInterval(searchPlaceholderTimer);
  clearTimeout(searchPlaceholderSwapTimer);
  searchPlaceholderTimer = null;
  searchPlaceholderSwapTimer = null;
  document.getElementById('searchInput')?.classList.remove('search-placeholder-changing');
}

function setSearchPlaceholder(text, animate = false) {
  const input = document.getElementById('searchInput');
  if (!input) return;
  clearTimeout(searchPlaceholderSwapTimer);
  if (!animate) {
    input.classList.remove('search-placeholder-changing');
    input.placeholder = text;
    return;
  }
  input.classList.add('search-placeholder-changing');
  searchPlaceholderSwapTimer = setTimeout(() => {
    input.placeholder = text;
    input.classList.remove('search-placeholder-changing');
    searchPlaceholderSwapTimer = null;
  }, 150);
}

function updateSearchGuidance() {
  const input = document.getElementById('searchInput');
  const type = document.getElementById('searchType')?.value || 'all';
  if (!input) return;
  stopSearchPlaceholderRotation();
  if (type !== 'all') {
    setSearchPlaceholder(SEARCH_TYPE_PLACEHOLDERS[type] || 'Pesquisar...');
    return;
  }
  if (!desktopSearchGuidanceMedia.matches) {
    setSearchPlaceholder('Pesquisar...');
    return;
  }
  if (reducedMotionMedia.matches) {
    setSearchPlaceholder('Pesquisar por nome, tag, @seção ou "texto"...');
    return;
  }
  setSearchPlaceholder(SEARCH_ALL_PLACEHOLDERS[searchPlaceholderIndex]);
  if (input.matches(':focus') || input.value) return;
  searchPlaceholderTimer = setInterval(() => {
    searchPlaceholderIndex = (searchPlaceholderIndex + 1) % SEARCH_ALL_PLACEHOLDERS.length;
    setSearchPlaceholder(SEARCH_ALL_PLACEHOLDERS[searchPlaceholderIndex], true);
  }, 2800);
}

function initSearchGuidance() {
  const input = document.getElementById('searchInput');
  const type = document.getElementById('searchType');
  if (!input || !type) return;
  input.addEventListener('focus', stopSearchPlaceholderRotation);
  input.addEventListener('blur', updateSearchGuidance);
  input.addEventListener('input', () => { if (input.value) stopSearchPlaceholderRotation(); });
  type.addEventListener('change', updateSearchGuidance);
  desktopSearchGuidanceMedia.addEventListener('change', updateSearchGuidance);
  reducedMotionMedia.addEventListener('change', updateSearchGuidance);
  updateSearchGuidance();
  updateSearchClearButton();
}

function updateSearchClearButton() {
  const input = document.getElementById('searchInput');
  const button = document.getElementById('clearSearchBtn');
  if (input && button) button.hidden = !input.value;
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.value = '';
  doSearch({ collapseOnClear: true });
  updateSearchGuidance();
  input.focus();
}

function showAllSearchResults() {
  document.querySelectorAll('.btn-wrap').forEach(button => {
    button.classList.remove('search-hidden');
  });

  document.querySelectorAll('.section-wrap').forEach(section => {
    section.classList.remove('search-hidden');
  });

  updateToggleSectionsBtnLabel();
  setNoResultsMessage(null);
}

function setNoResultsMessage(query) {
  const msg = document.getElementById('noResultsMsg');
  const addSectionButton = document.getElementById('addSectionBtn');
  if (!msg) return;

  if (!query) {
    msg.classList.remove('show');
    msg.textContent = '';
    if (addSectionButton) addSectionButton.hidden = false;
    return;
  }

  const hasVisibleSection = [...document.querySelectorAll('.section-wrap')]
    .some(section => !section.classList.contains('search-hidden'));

  if (hasVisibleSection) {
    msg.classList.remove('show');
    msg.textContent = '';
    if (addSectionButton) addSectionButton.hidden = false;
    return;
  }

  msg.innerHTML = `🔍 Nenhum resultado para <strong>"${escapeHtml(query)}"</strong>`;
  msg.classList.add('show');
  if (addSectionButton) addSectionButton.hidden = true;
}

function collapseAllSectionsAfterSearchClear() {
  showAllSearchResults();

  document.querySelectorAll('.section-wrap').forEach(section => {
    setSectionCollapsed(section, true);
  });

  updateToggleSectionsBtnLabel();
  setNoResultsMessage(null);
}

function doSearch(options = {}) {
  hideButtonPreview();
  updateSearchClearButton();
  const { collapseOnClear = false } = options;
  const raw = (document.getElementById('searchInput')?.value || '').trim();
  const q = normalizeSearchText(raw);
  const type = document.getElementById('searchType')?.value || 'all';

  if (!raw) {
    if (collapseOnClear) {
      collapseAllSectionsAfterSearchClear();
    } else {
      showAllSearchResults();
    }
    return;
  }

  const quotedTextQuery = raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')
    ? raw.slice(1, -1).trim()
    : null;
  if (quotedTextQuery !== null) {
    if (!quotedTextQuery) {
      setNoResultsMessage(null);
      return;
    }
    searchButtons(normalizeSearchText(quotedTextQuery), 'text');
    updateToggleSectionsBtnLabel();
    setNoResultsMessage(quotedTextQuery);
    return;
  }

  if (raw === '@') {
    setNoResultsMessage(null);
    return;
  }

  if (raw.startsWith('@')) {
    searchCategoriesByName(raw.slice(1));
    setNoResultsMessage(raw);
    return;
  }

  if (type === 'category') {
    searchCategoriesByName(raw);
    setNoResultsMessage(raw);
    return;
  }

  searchButtons(q, type);
  updateToggleSectionsBtnLabel();
  setNoResultsMessage(raw);
}

function searchCategoriesByName(rawQuery) {
  const categoryQuery = normalizeSearchText(rawQuery);

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
    const matchText = type === 'text' && normalizeSearchText(button.dataset.text || '').includes(query);

    let show = false;
    if (type === 'all') show = matchName || matchTag;
    if (type === 'name') show = matchName;
    if (type === 'tag') show = matchTag;
    if (type === 'text') show = matchText;

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

/* ------------------ crypto.js ------------------ */
// Encryption helpers (unchanged)
const BLU_ENCRYPTION_PASSPHRASE = 'blu-sec-data-key';
const BLU_ENCRYPTED_MARKER = 'blu_encrypted';

let cachedEncryptionKey = null;

async function getEncryptionKey() {
  if (cachedEncryptionKey) return cachedEncryptionKey;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(BLU_ENCRYPTION_PASSPHRASE));
  cachedEncryptionKey = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return cachedEncryptionKey;
}

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function encryptJsonString(jsonString) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(jsonString));

  return JSON.stringify({
    [BLU_ENCRYPTED_MARKER]: true,
    alg: 'AES-GCM-256',
    iv: bufferToBase64(iv),
    data: bufferToBase64(ciphertext)
  });
}

async function decryptJsonPayload(payload) {
  const key = await getEncryptionKey();
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const ciphertextBuffer = base64ToBuffer(payload.data);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextBuffer);
  return new TextDecoder().decode(plainBuffer);
}

function isEncryptedPayload(parsed) {
  return !!(parsed && typeof parsed === 'object' && parsed[BLU_ENCRYPTED_MARKER] === true && parsed.iv && parsed.data);
}

/* ------------------ crud.js ------------------ */
// (content copied verbatim from provided crud.js, unchanged logic)
let currentSectionId = null;
let currentBtnId = null;
let encryptExportEnabled = false;

function setExportEncryption(enabled) {
  encryptExportEnabled = enabled;
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.classList.toggle('encryption-on', enabled);
}

function toggleExportEncryption() {
  setExportEncryption(!encryptExportEnabled);
  notify(encryptExportEnabled ? '🔒 Criptografia ativada para o próximo export' : 'Criptografia desativada');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');

  if (id === 'tagModal') {
    const filterInput = document.getElementById('tagFilterInput');
    if (filterInput) filterInput.value = '';
    renderTagList();
  }

  const input = document.querySelector(`#${id} input, #${id} textarea`);
  if (input) setTimeout(() => input.focus(), 50);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// --- Seções --------------------------------------------------

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

async function renameSection(sectionId) {
  const wrap = document.querySelector(`.section-wrap[data-id="${cssEscape(sectionId)}"]`);
  if (!wrap) return;

  const titleEl = wrap.querySelector('.section-title');
  const current = titleEl.textContent;
  const newName = await promptDialog('Novo nome da seção:', current, { title: '✏️ Renomear Seção' });
  if (newName === null || !newName.trim() || newName.trim() === current) return;

  pushHistory();
  titleEl.textContent = newName.trim();
  wrap.querySelector('.section-add-btn').title = `Adicionar botão em ${newName.trim()}`;
  notify('Seção renomeada!');
  doSearch();
  updateUnsavedChangesUI();
}

async function deleteSection(sectionId) {
  const wrap = document.querySelector(`.section-wrap[data-id="${cssEscape(sectionId)}"]`);
  if (!wrap) return;

  const count = wrap.querySelectorAll('.btn-wrap').length;
  const msg = count > 0
    ? `Esta seção contém ${count} botão(ões). Deseja excluir tudo mesmo assim?`
    : 'Excluir esta seção?';

  const ok = await confirmDialog(msg, { title: '🗑️ Excluir Seção', danger: true, confirmText: 'Excluir' });
  if (!ok) return;

  const affectedTags = new Set(
    [...wrap.querySelectorAll('.btn-wrap')]
      .map(button => button.dataset.tag)
      .filter(Boolean)
  );

  pushHistory();
  wrap.remove();
  affectedTags.forEach(removeTagIfOrphan);
  notify('Seção removida!');
  updateToggleSectionsBtnLabel();
  updateUnsavedChangesUI();
}

// --- Botões ----------------------------------------------------

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
  const tag = normalizeTag(document.getElementById('bTag').value);
  const vis = document.getElementById('bVis').value || 'other';

  if (!name || !text) {
    notify('Preencha nome e texto', 'err');
    return;
  }

  if (!currentSectionId) {
    notify('Selecione uma seção antes de salvar o botão', 'err');
    return;
  }

  if (tag && !tags.includes(tag)) {
    tags.push(tag);
    tags.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }));
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
    const oldTag = old.dataset.tag;
    old.replaceWith(createBtnEl(button, currentSectionId));
    if (oldTag && oldTag !== tag) removeTagIfOrphan(oldTag);
    notify('Botão atualizado!');
  } else {
    body.appendChild(createBtnEl(button, currentSectionId));
    notify('Botão adicionado!');
  }

  updateSectionCount(currentSectionId);
  closeModal('btnModal');
  doSearch();
  applyButtonReorderControls();
  updateUnsavedChangesUI();
}

async function deleteBtn(sectionId, btnId) {
  const target = document.querySelector(`.btn-wrap[data-id="${cssEscape(btnId)}"]`);
  if (!target) {
    notify('Botão não encontrado', 'err');
    return;
  }

  const ok = await confirmDialog('Remover este botão?', { title: '🗑️ Remover Botão', danger: true, confirmText: 'Remover' });
  if (!ok) return;

  const removedTag = target.dataset.tag;

  pushHistory();
  target.remove();
  if (removedTag) removeTagIfOrphan(removedTag);
  updateSectionCount(sectionId);
  notify('Botão removido!');
  doSearch();
  updateUnsavedChangesUI();
}

// --- Tags --------------------------------------------------

function getTagUsageMap() {
  const usage = {};
  document.querySelectorAll('.btn-wrap').forEach(button => {
    const tag = button.dataset.tag;
    if (tag) usage[tag] = (usage[tag] || 0) + 1;
  });
  return usage;
}

function renderTagList() {
  const list = document.getElementById('tagList');
  const emptyMsg = document.getElementById('tagEmptyMsg');
  const filterInput = document.getElementById('tagFilterInput');
  const filterValue = filterInput ? filterInput.value.trim() : '';
  const filter = normalizeSearchText(filterValue);
  const usage = getTagUsageMap();

  list.innerHTML = '';

  const visibleTags = tags.filter(tag => !filter || normalizeSearchText(tag).includes(filter));

  visibleTags.forEach(tag => {
    const count = usage[tag] || 0;
    const safeTag = String(tag).replace(/'/g, "\\'");
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.title = count > 0 ? `Usada em ${count} botão(ões)` : 'Nenhum botão usa esta tag';
    chip.innerHTML = `${escapeHtml(tag)} <span class="tag-chip-count">${count}</span> <button class="tag-chip-btn tag-chip-edit" onclick="renameTag('${safeTag}')" title="Renomear tag">✏️</button> <button class="tag-chip-btn tag-chip-del" onclick="removeTag('${safeTag}')" title="Remover tag">✕</button>`;
    list.appendChild(chip);
  });

  if (emptyMsg) {
    if (tags.length === 0) {
      emptyMsg.textContent = 'Nenhuma tag criada ainda.';
      emptyMsg.classList.add('show');
    } else if (visibleTags.length === 0) {
      emptyMsg.textContent = `Nenhuma tag encontrada para "${filterValue}".`;
      emptyMsg.classList.add('show');
    } else {
      emptyMsg.classList.remove('show');
    }
  }
}

// Renomeia uma tag existente. Se o novo nome já pertencer a outra tag,
// pergunta se deseja mesclar as duas (todos os botões passam a usar a
// mesma tag, sem duplicar entradas na lista).
async function renameTag(oldTag) {
  const newNameRaw = await promptDialog(`Novo nome para a tag "${oldTag}":`, oldTag, { title: '✏️ Renomear Tag' });
  if (newNameRaw === null) return;

  const newTag = normalizeTag(newNameRaw);
  if (!newTag || newTag === oldTag) return;

  const collides = tags.includes(newTag);
  if (collides) {
    const ok = await confirmDialog(`Já existe uma tag "${newTag}". Deseja mesclar "${oldTag}" com ela? Todos os botões passarão a usar "${newTag}".`, { title: '🔀 Mesclar Tags', confirmText: 'Mesclar' });
    if (!ok) return;
  }

  pushHistory();

  document.querySelectorAll(`.btn-wrap[data-tag="${cssEscape(oldTag)}"]`).forEach(button => {
    button.dataset.tag = newTag;
  });

  const oldIndex = tags.indexOf(oldTag);
  if (oldIndex !== -1) tags.splice(oldIndex, 1);
  if (!tags.includes(newTag)) tags.push(newTag);
  tags.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }));

  updateTagDatalist();
  doSearch();
  notify(collides ? `Tags mescladas em "${newTag}"` : `Tag renomeada para "${newTag}"`);
  updateUnsavedChangesUI();
}

// Tags sem nenhum botão associado (candidatas a limpeza em massa).
function getEmptyTags() {
  const usage = getTagUsageMap();
  return tags.filter(tag => !usage[tag]);
}

async function clearEmptyTags() {
  const emptyTags = getEmptyTags();

  if (emptyTags.length === 0) {
    notify('Nenhuma tag vazia encontrada');
    return;
  }

  const ok = await confirmDialog(
    `Remover ${emptyTags.length} tag(s) sem nenhum botão associado?\n\n${emptyTags.join(', ')}`,
    { title: '🧹 Limpar Tags Vazias', danger: true, confirmText: 'Remover' }
  );
  if (!ok) return;

  pushHistory();
  tags = tags.filter(tag => !emptyTags.includes(tag));
  updateTagDatalist();
  notify(`${emptyTags.length} tag(s) removida(s)`);
  updateUnsavedChangesUI();
}

// Remove uma tag automaticamente da lista se nenhum botão mais a usa —
// chamada após excluir/editar botões ou seções, nunca após addTag()
// (uma tag recém-criada, ainda sem botão, não deve ser tratada como órfã).
function removeTagIfOrphan(tag) {
  if (!tag) return;
  const stillUsed = document.querySelector(`.btn-wrap[data-tag="${cssEscape(tag)}"]`);
  if (stillUsed) return;

  const index = tags.indexOf(tag);
  if (index === -1) return;

  tags.splice(index, 1);
  updateTagDatalist();
}

function addTag() {
  const input = document.getElementById('newTagInput');
  const value = normalizeTag(input.value);
  if (!value || tags.includes(value)) return;

  tags.push(value);
  tags.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }));
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
  updateUnsavedChangesUI();
}

function updateTagDatalist() {
  const dataList = document.getElementById('tagOptions');
  dataList.innerHTML = tags.map(tag => `<option value="${escapeHtmlAttr(tag)}">`).join('');
  renderTagList();
}

// --- Export / Import --------------------------------------

async function exportData() {
  const state = collectState();
  let jsonString = JSON.stringify(state, null, 2);

  const shouldEncrypt = encryptExportEnabled;
  let filenameSuffix = '';

  if (shouldEncrypt) {
    try {
      jsonString = await encryptJsonString(jsonString);
      filenameSuffix = '-enc';
    } catch (error) {
      console.error('Erro ao criptografar:', error);
      notify('Não foi possível criptografar. Exportando sem criptografia.', 'err');
    }
  }

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const exportDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const exportTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  link.href = url;
  link.download = `blu_data-${exportDate}-${exportTime}${filenameSuffix}.json`;
  link.click();
  URL.revokeObjectURL(url);
  markCurrentStateAsExported();
  notify(shouldEncrypt && filenameSuffix ? 'Exportado (criptografado)!' : 'Exportado!');
}

function normalizeImportedData(parsed) {
  const normalizedTags = [];
  const addNormalizedTag = value => {
    const tag = normalizeTag(value);
    if (tag && !normalizedTags.includes(tag)) normalizedTags.push(tag);
    return tag;
  };

  const base = {
    tags: normalizedTags,
    sections: []
  };

  if (Array.isArray(parsed.tags)) parsed.tags.forEach(addNormalizedTag);

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
          tag: addNormalizedTag(button.tag || ''),
          vis: ['public', 'private', 'other'].includes(button.vis) ? button.vis : 'other'
        }))
      : []
  }));

  normalizedTags.sort((left, right) => left.localeCompare(right, 'pt-BR', {
    sensitivity: 'base',
    numeric: true
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

async function importData() {
  const raw = document.getElementById('importJson').value.trim();
  if (!raw) {
    notify('Cole o JSON primeiro', 'err');
    return;
  }

  try {
    let parsed = JSON.parse(raw);
    let wasEncrypted = false;

    if (isEncryptedPayload(parsed)) {
      wasEncrypted = true;
      try {
        const decryptedString = await decryptJsonPayload(parsed);
        parsed = JSON.parse(decryptedString);
      } catch (decryptError) {
        console.error('Erro ao descriptografar:', decryptError);
        throw new Error('não foi possível descriptografar este arquivo');
      }
    }

    if (!parsed.sections && !parsed.categories) throw new Error('Formato inválido: esperado "sections" ou "categories"');

    const ok = await confirmDialog('Isso substituirá todos os dados atuais. Continuar?', { title: '📥 Importar JSON', danger: true, confirmText: 'Importar' });
    if (!ok) return;

    pushHistory();
    restoreState(normalizeImportedData(parsed));
    markCurrentStateAsExported();
    closeModal('importModal');
    clearImportSource();
    notify(wasEncrypted ? 'Importado com sucesso (arquivo criptografado)!' : 'Importado com sucesso!');
  } catch (error) {
    notify('JSON inválido: ' + error.message, 'err');
  }
}

async function clearAll() {
  const ok = await confirmDialog('Limpar TODOS os dados e preferências locais do Blû? Os botões e seções poderão ser recuperados com Ctrl+Z enquanto esta página permanecer aberta; as preferências continuarão limpas.', { title: '🗑️ Limpar Tudo', danger: true, confirmText: 'Limpar tudo' });
  if (!ok) return;

  const stateBeforeClear = JSON.stringify(collectState());
  const exportedStateBeforeClear = lastExportedComparableState;
  pushHistory();
  clearUndoSnapshot = { stateString: stateBeforeClear, exportedComparableState: exportedStateBeforeClear };
  restoreState({ tags: [], sections: [] });
  notify('Tudo limpo!');
  markCurrentStateAsExported();
  clearBluLocalStorage();
  applyTheme(!!systemThemeQuery?.matches);
}

/* ------------------ dnd.js ------------------ */
// (copied verbatim)
let dragEl = null;
let placeholder = null;

function setupDrop(body) {
  body.addEventListener('dragover', onDragOver);
  body.addEventListener('drop', onDrop);
}

function onDragStart(event) {
  if (!editMode || event.target.closest('.copy-btn, .btn-edit, .btn-del')) {
    event.preventDefault();
    return;
  }

  hideButtonPreview();

  dragEl = this;
  this.classList.add('dragging');
  placeholder = document.createElement('div');
  // placeholder.className = 'drag-placeholder';
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

let shiftActive = false;
let shiftLocked = false;
let lastShiftPress = 0;

let draggingSectionEl = null;
let sectionPlaceholderEl = null;
let isDraggingSection = false;

// Toggle programático do ShiftLock via botão
function toggleShiftLock() {
  // Só permite alternar quando o modo de edição estiver ativo
  if (!editMode) return;

  shiftLocked = !shiftLocked;
  updateShiftMode();

  // Atualiza o atributo aria e o visual do botão (se existir)
  const btn = document.getElementById('shiftLockBtn');
  if (btn) {
    btn.setAttribute('aria-pressed', String(shiftLocked));
    btn.classList.toggle('active', shiftLocked);
    btn.querySelector('.menu-btn-label').textContent = shiftLocked ? 'Organização: ON' : 'Modo Organização';
  }

  notify(shiftLocked ? 'Modo Organização ativado' : 'Modo Organização desativado');
}

function updateShiftMode() {
  if (!editMode) {
    shiftActive = false;
    shiftLocked = false;
    document.body.classList.remove('shift-mode', 'shift-locked');
    applyButtonReorderControls();
    return;
  }

  document.body.classList.toggle('shift-mode', shiftActive || shiftLocked);
  document.body.classList.toggle('shift-locked', shiftLocked);
  applyButtonReorderControls();
}

function getSectionPlaceholder() {
  if (!sectionPlaceholderEl) {
    sectionPlaceholderEl = document.createElement('div');
    sectionPlaceholderEl.className = 'drag-placeholder';
  }
  return sectionPlaceholderEl;
}

function moveSectionUp(btn) {
  const section = btn.closest('.section-wrap');
  const prev = section.previousElementSibling;
  if (!prev) return;

  section.parentNode.insertBefore(section, prev);
  pushHistory();
  updateUnsavedChangesUI();
}

function moveSectionDown(btn) {
  const section = btn.closest('.section-wrap');
  const next = section.nextElementSibling;
  if (!next) return;

  section.parentNode.insertBefore(next, section);
  pushHistory();
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

  if (event.clientY < mid) parent.insertBefore(ph, target);
  else parent.insertBefore(ph, target.nextSibling);
});

window.addEventListener('mouseup', () => {
  if (!isDraggingSection || !draggingSectionEl) return;

  const ph = document.querySelector('.drag-placeholder');
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

/* ------------------ diagnostics + context menus ------------------ */

function openTagModal(tab = 'manage') {
  openModal('tagModal');
  setTagModalTab(tab);
}

function setTagModalTab(tab) {
  const diagnostic = tab === 'diagnostic';
  document.getElementById('tagManagePanel').hidden = diagnostic;
  document.getElementById('tagDiagnosticPanel').hidden = !diagnostic;
  document.getElementById('tagManageTab').classList.toggle('active', !diagnostic);
  document.getElementById('tagDiagnosticTab').classList.toggle('active', diagnostic);
  if (diagnostic) renderTagDiagnostics();
  else renderTagList();
}

function makeDiagnosticGroup(title, messages, actionLabel, action) {
  const group = document.createElement('section');
  group.className = 'diagnostic-group';
  const heading = document.createElement('h3');
  heading.textContent = title;
  group.appendChild(heading);
  if (messages.length) {
    const list = document.createElement('ul');
    messages.forEach(message => {
      const item = document.createElement('li');
      item.textContent = message;
      list.appendChild(item);
    });
    group.appendChild(list);
  }
  if (actionLabel && action) {
    const actions = document.createElement('div');
    actions.className = 'diagnostic-actions';
    const button = document.createElement('button');
    button.className = 'mbtn primary';
    button.textContent = actionLabel;
    button.onclick = action;
    actions.appendChild(button);
    group.appendChild(actions);
  }
  return group;
}

function getTagDiagnosticData() {
  const usage = getTagUsageMap();
  const nonCanonical = tags.filter(tag => normalizeTag(tag) !== tag);
  const empty = tags.filter(tag => !usage[tag]);
  const listed = new Set(tags);
  const missing = [...new Set([...document.querySelectorAll('.btn-wrap')]
    .map(button => normalizeTag(button.dataset.tag))
    .filter(tag => tag && !listed.has(tag)))];
  const canonicalGroups = new Map();
  tags.forEach(tag => {
    const canonical = normalizeTag(tag);
    if (!canonicalGroups.has(canonical)) canonicalGroups.set(canonical, []);
    canonicalGroups.get(canonical).push(tag);
  });
  const conflicts = [...canonicalGroups.values()].filter(group => group.length > 1);
  return { nonCanonical, empty, missing, conflicts };
}

function renderTagDiagnostics() {
  const summary = document.getElementById('tagDiagnosticSummary');
  const issues = document.getElementById('tagDiagnosticIssues');
  const data = getTagDiagnosticData();
  const issueCount = data.nonCanonical.length + data.empty.length + data.missing.length + data.conflicts.length;
  summary.textContent = issueCount ? `${issueCount} ponto(s) encontrado(s) em ${tags.length} tag(s).` : `Tudo certo: ${tags.length} tag(s) verificadas.`;
  issues.replaceChildren();
  if (!issueCount) return;
  const repairMessages = [
    ...data.nonCanonical.map(tag => `Normalizar “${tag}” para “${normalizeTag(tag)}”.`),
    ...data.missing.map(tag => `Registrar a tag “${tag}” encontrada em um botão.`),
    ...data.conflicts.map(group => `Mesclar duplicatas: ${group.join(', ')}.`)
  ];
  if (repairMessages.length) issues.appendChild(makeDiagnosticGroup('Correções automáticas', repairMessages, 'Corrigir Tags', repairTagIntegrity));
  if (data.empty.length) issues.appendChild(makeDiagnosticGroup('Tags vazias', data.empty, 'Limpar vazias', async () => {
    await clearEmptyTags();
    renderTagDiagnostics();
  }));
}

async function repairTagIntegrity() {
  const ok = await confirmDialog('Normalizar tags, remover duplicatas e reparar associações ausentes?', { title: 'Corrigir Tags', confirmText: 'Corrigir' });
  if (!ok) return;
  pushHistory();
  restoreState(normalizeImportedData(collectState()));
  renderTagDiagnostics();
  notify('Tags corrigidas!');
}

let activeJsonModalTab = 'diagnostic';
let jsonIntegritySequence = 0;

function openJsonModal(tab = 'diagnostic') {
  openModal('jsonModal');
  setJsonModalTab(tab);
}

function setJsonModalTab(tab) {
  activeJsonModalTab = tab === 'view' ? 'view' : 'diagnostic';
  const viewing = activeJsonModalTab === 'view';
  const diagnosticPanel = document.getElementById('jsonDiagnosticPanel');
  const viewPanel = document.getElementById('jsonViewPanel');
  const diagnosticTab = document.getElementById('jsonDiagnosticTab');
  const viewTab = document.getElementById('jsonViewTab');
  document.querySelector('#jsonModal .json-modal')?.classList.toggle('view-active', viewing);
  if (diagnosticPanel) diagnosticPanel.hidden = viewing;
  if (viewPanel) viewPanel.hidden = !viewing;
  diagnosticPanel?.classList.toggle('active', !viewing);
  viewPanel?.classList.toggle('active', viewing);
  diagnosticTab?.classList.toggle('active', !viewing);
  viewTab?.classList.toggle('active', viewing);
  diagnosticTab?.setAttribute('aria-selected', String(!viewing));
  viewTab?.setAttribute('aria-selected', String(viewing));
  const title = document.getElementById('jsonModalTitle');
  if (title) title.textContent = viewing ? '📄 Visualizar JSON' : '📄 Verificar JSON';
  if (viewing) refreshJsonView();
  else renderJsonDiagnostics();
}

function getJsonDiagnostics(state = collectState()) {
  const issues = [];
  const ids = new Set();
  const validVis = new Set(['public', 'private', 'other']);
  state.sections.forEach((section, sectionIndex) => {
    if (!String(section.name || '').trim()) issues.push(`Seção ${sectionIndex + 1} está sem nome.`);
    if (!section.id || ids.has(String(section.id))) issues.push(`Seção “${section.name || sectionIndex + 1}” possui ID ausente ou duplicado.`);
    ids.add(String(section.id));
    section.buttons.forEach((button, buttonIndex) => {
      const label = button.name || `Botão ${buttonIndex + 1}`;
      if (!button.id || ids.has(String(button.id))) issues.push(`“${label}” possui ID ausente ou duplicado.`);
      ids.add(String(button.id));
      if (!String(button.name || '').trim()) issues.push(`Um botão da seção “${section.name}” está sem nome.`);
      if (!String(button.text || '').trim()) issues.push(`“${label}” está sem texto para copiar.`);
      if (!validVis.has(button.vis)) issues.push(`“${label}” possui visibilidade inválida: ${button.vis}.`);
      if (normalizeTag(button.tag) !== button.tag) issues.push(`“${label}” possui tag não normalizada.`);
    });
  });
  return issues;
}

function renderJsonDiagnostics() {
  const state = collectState();
  const issues = getJsonDiagnostics(state);
  const buttonCount = state.sections.reduce((sum, section) => sum + section.buttons.length, 0);
  const summary = document.getElementById('jsonDiagnosticSummary');
  summary.className = `json-diagnostic-summary ${issues.length ? 'warning' : 'ok'}`;
  summary.textContent = issues.length
    ? `${issues.length} problema(s) em ${state.sections.length} seção(ões), ${buttonCount} botão(ões) e ${state.tags.length} tag(s).`
    : `JSON íntegro: ${state.sections.length} seção(ões), ${buttonCount} botão(ões) e ${state.tags.length} tag(s).`;
  updateJsonSizeMeta('jsonDiagnosticSize', state);
  const wrap = document.getElementById('jsonDiagnosticIssues');
  wrap.replaceChildren();

  const optimization = getSprinklrJsonOptimization(state);
  const repairableCount = issues.filter(issue => !issue.includes('está sem texto') && !issue.startsWith('Um botão da seção')).length;
  const toolbox = document.createElement('section');
  toolbox.className = 'json-toolbox';
  toolbox.innerHTML = '<div class="json-toolbox-heading"><strong>Manutenção do JSON</strong><span>Ações compatíveis com Desfazer</span></div><div class="json-toolbox-label">Ações seguras</div>';
  const grid = document.createElement('div');
  grid.className = 'json-tool-grid';
  grid.append(
    createJsonToolAction('Corrigir', repairableCount ? `${repairableCount} ajuste(s) disponível(is)` : 'Nenhuma correção automática', 'wrench', repairJsonIntegrity, !repairableCount),
    createJsonToolAction('Otimizar', optimization.changed ? `${formatJsonFileSize(optimization.compactBytes)} após otimização` : 'Estrutura já otimizada', 'unfold_vertical', optimizeSprinklrJson, !optimization.changed),
    createJsonToolAction('Copiar relatório', 'Resumo técnico sem os textos', 'copy', copySprinklrJsonReport)
  );
  toolbox.appendChild(grid);
  wrap.appendChild(toolbox);
  if (issues.length) wrap.appendChild(makeDiagnosticGroup('Problemas encontrados', issues));
}

function createJsonToolAction(label, description, icon, action, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'json-tool-action';
  button.disabled = disabled;
  button.innerHTML = `${iconSvg(icon)}<span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span>`;
  button.onclick = action;
  return button;
}

function getSprinklrJsonOptimization(state = collectState()) {
  const original = JSON.parse(JSON.stringify(state));
  const optimized = normalizeImportedData(original);
  const usedTags = new Set();
  optimized.sections.forEach(section => section.buttons.forEach(button => { if (button.tag) usedTags.add(button.tag); }));
  const beforeTags = optimized.tags.length;
  optimized.tags = optimized.tags
    .filter(tag => usedTags.has(tag))
    .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base', numeric: true }));
  const compact = JSON.stringify(optimized);
  return {
    state: optimized,
    compact,
    compactBytes: new TextEncoder().encode(compact).byteLength,
    removedOrphanTags: beforeTags - optimized.tags.length,
    changed: JSON.stringify(original) !== compact
  };
}

async function optimizeSprinklrJson() {
  const optimization = getSprinklrJsonOptimization();
  if (!optimization.changed) {
    notify('Os dados já estão estruturalmente otimizados');
    return;
  }
  const detail = optimization.removedOrphanTags
    ? `${optimization.removedOrphanTags} tag(s) sem uso será(ão) removida(s).`
    : 'A estrutura e a ordem das tags serão normalizadas.';
  const ok = await confirmDialog(
    `${detail}\n\nTags apenas parecidas não serão mescladas. Textos e quebras de linha não serão alterados.`,
    { title: 'Otimizar JSON', confirmText: 'Otimizar' }
  );
  if (!ok) return;
  pushHistory();
  restoreState(optimization.state);
  renderJsonDiagnostics();
  refreshJsonView();
  notify('JSON otimizado!');
}

async function copySprinklrJsonReport() {
  const state = collectState();
  const issues = getJsonDiagnostics(state);
  const size = getJsonSizeData(state);
  const buttonCount = state.sections.reduce((sum, section) => sum + section.buttons.length, 0);
  const lines = [
    'Blû Sprinklr — Diagnóstico JSON',
    `Seções: ${state.sections.length}`,
    `Botões: ${buttonCount}`,
    `Tags: ${state.tags.length}`,
    `Tamanho formatado: ${formatJsonFileSize(size.formattedBytes)}`,
    `Tamanho compacto: ${formatJsonFileSize(size.compactBytes)}`,
    `Problemas: ${issues.length}`,
    ...issues.map(issue => `- ${issue}`)
  ];
  try {
    await copyToClipboard(lines.join('\n'));
    notify('Relatório do JSON copiado!');
  } catch (error) {
    console.error('Erro ao copiar diagnóstico JSON:', error);
    notify('Não foi possível copiar o relatório', 'err');
  }
}

async function repairJsonIntegrity() {
  const ok = await confirmDialog('Corrigir IDs, visibilidades e tags com segurança?', { title: 'Corrigir JSON', confirmText: 'Corrigir' });
  if (!ok) return;
  const state = normalizeImportedData(collectState());
  const usedIds = new Set();
  state.sections.forEach(section => {
    if (!section.id || usedIds.has(section.id)) section.id = `s${Date.now().toString(36)}-${++jsonIntegritySequence}`;
    usedIds.add(section.id);
    section.buttons.forEach(button => {
      if (!button.id || usedIds.has(button.id)) button.id = `b${Date.now().toString(36)}-${++jsonIntegritySequence}`;
      usedIds.add(button.id);
      if (!['public', 'private', 'other'].includes(button.vis)) button.vis = 'other';
    });
  });
  pushHistory();
  restoreState(state);
  renderJsonDiagnostics();
  notify('JSON corrigido!');
}

function refreshJsonView() {
  const state = collectState();
  document.getElementById('jsonViewText').value = JSON.stringify(state, null, 2);
  updateJsonSizeMeta('jsonViewSize', state);
}

function getJsonSizeData(state = collectState()) {
  const formatted = JSON.stringify(state, null, 2);
  const compact = JSON.stringify(state);
  return {
    formatted,
    compact,
    formattedBytes: new TextEncoder().encode(formatted).byteLength,
    compactBytes: new TextEncoder().encode(compact).byteLength
  };
}

function formatJsonFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updateJsonSizeMeta(id, state = collectState()) {
  const element = document.getElementById(id);
  if (!element) return;
  const size = getJsonSizeData(state);
  const saved = Math.max(0, size.formattedBytes - size.compactBytes);
  const percent = size.formattedBytes ? Math.round((saved / size.formattedBytes) * 100) : 0;
  element.textContent = `Formatado: ${formatJsonFileSize(size.formattedBytes)} • Compacto: ${formatJsonFileSize(size.compactBytes)} • Economia: ${formatJsonFileSize(saved)} (${percent}%)`;
}

async function copyJsonView() {
  refreshJsonView();
  await copyToClipboard(document.getElementById('jsonViewText').value);
  notify('JSON copiado!');
}

async function copyCompactJsonView() {
  const size = getJsonSizeData();
  await copyToClipboard(size.compact);
  notify('JSON compacto copiado!');
}

let viewedButtonText = '';
let contextIdSequence = 0;

function createContextMenuItem(label, icon, action, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `context-menu-item${options.danger ? ' danger' : ''}`;
  button.disabled = !!options.disabled;
  button.innerHTML = `${iconSvg(icon)}<span>${escapeHtml(label)}</span>`;
  button.onclick = () => { if (!button.disabled) { closeContextMenu(); action(); } };
  return button;
}

function createContextMenuSeparator() {
  const separator = document.createElement('div');
  separator.className = 'context-menu-separator';
  return separator;
}

function openContextMenu(items, x, y) {
  const menu = document.getElementById('contextMenu');
  menu.replaceChildren(...items);
  menu.hidden = false;
  menu.style.visibility = 'hidden';
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(Math.max(x, 8), innerWidth - rect.width - 8)}px`;
  menu.style.top = `${Math.min(Math.max(y, 8), innerHeight - rect.height - 8)}px`;
  menu.style.visibility = 'visible';
}

function closeContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (menu) menu.hidden = true;
}

function getContextButtonData(wrap) {
  return { id: wrap.dataset.id, name: wrap.querySelector('.btn-label')?.textContent || '', text: wrap.dataset.text || '', tag: wrap.dataset.tag || '', vis: wrap.dataset.vis || 'other' };
}

function viewContextButton(wrap) {
  const data = getContextButtonData(wrap);
  viewedButtonText = data.text;
  document.getElementById('buttonViewTitle').textContent = data.name;
  document.getElementById('buttonViewMeta').textContent = `${data.tag || 'Sem tag'} · ${data.vis}`;
  document.getElementById('buttonViewText').textContent = data.text;
  openModal('buttonViewModal');
}

async function copyViewedButtonText() { await copyToClipboard(viewedButtonText); notify('Texto copiado!'); }

function makeContextId(prefix) { return `${prefix}${Date.now().toString(36)}-${++contextIdSequence}`; }

function duplicateContextButton(wrap) {
  const section = wrap.closest('.section-wrap');
  const data = getContextButtonData(wrap);
  const copy = { ...data, id: makeContextId('b'), name: `${data.name} — Cópia` };
  pushHistory();
  wrap.after(createBtnEl(copy, section.dataset.id));
  updateSectionCount(section.dataset.id);
  applyButtonReorderControls();
  doSearch();
  updateUnsavedChangesUI();
  notify('Botão duplicado!');
}

function duplicateContextSection(section) {
  const duplicate = {
    id: makeContextId('s'),
    name: `${section.querySelector('.section-title')?.textContent || 'Seção'} — Cópia`,
    collapsed: section.classList.contains('collapsed'),
    buttons: [...section.querySelectorAll('.btn-wrap')].map(wrap => ({ ...getContextButtonData(wrap), id: makeContextId('b') }))
  };
  pushHistory();
  const rendered = renderSection(duplicate, document.getElementById('sections'));
  section.after(rendered);
  applyButtonReorderControls();
  doSearch();
  updateToggleSectionsBtnLabel();
  updateUnsavedChangesUI();
  notify('Seção duplicada!');
}

document.addEventListener('contextmenu', event => {
  const button = event.target.closest('.btn-wrap');
  if (button) {
    event.preventDefault();
    hideButtonPreview();
    const sectionId = button.closest('.section-wrap')?.dataset.id;
    openContextMenu([
      createContextMenuItem('Copiar texto', 'copy', async () => { await copyToClipboard(button.dataset.text || ''); notify('Texto copiado!'); }),
      createContextMenuItem('Visualizar botão', 'eye', () => viewContextButton(button)),
      createContextMenuSeparator(),
      createContextMenuItem('Editar botão', 'pencil', () => openEditBtn(sectionId, button.dataset.id)),
      createContextMenuItem('Duplicar botão', 'copy_plus', () => duplicateContextButton(button)),
      createContextMenuSeparator(),
      createContextMenuItem('Excluir botão', 'trash_2', () => deleteBtn(sectionId, button.dataset.id), { danger: true })
    ], event.clientX, event.clientY);
    return;
  }
  const section = event.target.closest('.section-wrap');
  if (!section) return;
  event.preventDefault();
  const header = section.querySelector('.section-head');
  openContextMenu([
    createContextMenuItem('Adicionar botão', 'folder_plus', () => openAddBtn(section.dataset.id)),
    createContextMenuItem('Renomear seção', 'pencil', () => renameSection(section.dataset.id)),
    createContextMenuItem('Duplicar seção', 'copy_plus', () => duplicateContextSection(section)),
    createContextMenuSeparator(),
    createContextMenuItem('Mover para cima', 'arrow_up', () => moveSectionUp(header), { disabled: !section.previousElementSibling }),
    createContextMenuItem('Mover para baixo', 'arrow_down', () => moveSectionDown(header), { disabled: !section.nextElementSibling }),
    createContextMenuSeparator(),
    createContextMenuItem('Excluir seção', 'trash_2', () => deleteSection(section.dataset.id), { danger: true })
  ], event.clientX, event.clientY);
});

document.addEventListener('pointerdown', event => { if (!event.target.closest('#contextMenu')) closeContextMenu(); });
window.addEventListener('scroll', closeContextMenu, true);
window.addEventListener('resize', closeContextMenu);

/* ------------------ app.js ------------------ */
// ==========================================================
// Inicialização e funcionalidades gerais do app
// ==========================================================
function getDemoState() {
  return {
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
}

const shiftBtnInit = document.getElementById('shiftLockBtn');
if (shiftBtnInit) {
  shiftBtnInit.disabled = !editMode;
  shiftBtnInit.setAttribute('aria-pressed', shiftLocked ? 'true' : 'false');
  if (shiftLocked) shiftBtnInit.classList.add('active');
}

function init() {
  const saved = loadPersistedState();
  const sourceData = saved && Array.isArray(saved.sections) ? saved : getDemoState();
  const data = normalizeImportedData(sourceData);

  tags = Array.isArray(data.tags) ? [...data.tags] : [];
  renderAll(Array.isArray(data.sections) ? data.sections : []);
  updateTagDatalist();
  updateToggleSectionsBtnLabel();

  markCurrentStateAsExported();
  persistState();
}

function toggleEditMode() {
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);
  document.querySelectorAll('.btn-wrap').forEach(button => button.draggable = editMode);

  const button = document.getElementById('editModeBtn');
  if (button) button.querySelector('.menu-btn-label').textContent = `Modo Edição: ${editMode ? 'ON' : 'OFF'}`;
  if (button) button.classList.toggle('active', editMode);

  // Remover previews visíveis ao alternar para modo edição
  hideButtonPreview();

// Atualiza visibilidade/estado do botão Modo Organização (visível, habilitado apenas com editMode ON)
const shiftBtn = document.getElementById('shiftLockBtn');
if (shiftBtn) {
  // sempre visível; habilita apenas quando editMode = true
  shiftBtn.style.display = 'inline-flex';
  shiftBtn.disabled = !editMode;

  if (!editMode) {
    // ao desligar o modo edição, garante que o ShiftLock seja desativado
    shiftLocked = false;
    updateShiftMode();
    shiftBtn.setAttribute('aria-pressed', 'false');
    shiftBtn.classList.remove('active');
    shiftBtn.querySelector('.menu-btn-label').textContent = 'Modo Organização';
  } else {
    // quando editMode liga, atualiza o rótulo/estado conforme shiftLocked atual
    shiftBtn.setAttribute('aria-pressed', shiftLocked ? 'true' : 'false');
    shiftBtn.classList.toggle('active', shiftLocked);
    shiftBtn.querySelector('.menu-btn-label').textContent = shiftLocked ? 'Organização: ON' : 'Modo Organização';
  }
}



  updateShiftMode();
  notify(editMode ? 'Modo edição ativado' : 'Modo edição desativado');
}

const systemThemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function toggleTheme() {
  setThemePreference(document.body.classList.contains('dark') ? 'light' : 'dark');
}

function setThemePreference(preference) {
  const value = ['system', 'light', 'dark'].includes(preference) ? preference : 'system';
  setSetting('theme', value);
  applyTheme(value === 'system' ? !!systemThemeQuery?.matches : value === 'dark');
}

function updateThemePreferenceUI() {
  const select = document.getElementById('themeSelect');
  if (!select) return;
  const stored = getSetting('theme', 'system');
  const preference = ['system', 'light', 'dark'].includes(stored) ? stored : 'system';
  select.value = preference;
  const icon = select.closest('.menu-setting-row')?.querySelector('.menu-icon');
  if (icon) icon.innerHTML = ICONS[{ system: 'monitor', light: 'sun', dark: 'moon' }[preference]];
}

function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  updateThemePreferenceUI();
}

function initTheme() {
  const stored = getSetting('theme');
  applyTheme(stored === 'dark' || stored === 'light' ? stored === 'dark' : !!systemThemeQuery?.matches);

  systemThemeQuery?.addEventListener('change', event => {
    const currentStored = getSetting('theme');
    if (currentStored === 'system' || (currentStored !== 'dark' && currentStored !== 'light')) applyTheme(event.matches);
  });
}

async function resetPreferences() {
  const ok = await confirmDialog(
    'As configurações de aparência e comportamento voltarão ao padrão. Seus botões, seções e organização não serão alterados.',
    { title: '↺ Redefinir Preferências', confirmText: 'Redefinir' }
  );
  if (!ok) return;
  if (!clearBluPreferences()) {
    notify('Não foi possível redefinir as preferências', 'err');
    return;
  }
  applyTheme(!!systemThemeQuery?.matches);
  applyTextPreviewState(true);
  updateSearchGuidance();
  document.getElementById('menuOverlay')?.classList.remove('open');
  notify('Preferências redefinidas');
}

function openAboutModal() {
  const version = document.getElementById('aboutVersion');
  if (version) version.textContent = `Versão ${VERSION}`;
  document.getElementById('menuOverlay')?.classList.remove('open');
  openModal('aboutModal');
}

function toggleMenu() {
  document.getElementById('menuOverlay').classList.toggle('open');
}

function createSprinklrSubmenu(name, label, icon, buttons) {
  const wrapper = document.createElement('div');
  wrapper.className = 'menu-submenu';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'menu-submenu-toggle';
  toggle.dataset.submenu = name;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', `submenu-${name}`);
  toggle.innerHTML = `${iconSvg(icon)}<span class="menu-btn-label">${escapeHtml(label)}</span>${iconSvg('chevron_down', 'chevron-icon')}`;
  toggle.onclick = () => toggleSubmenu(name);

  const body = document.createElement('div');
  body.className = 'menu-submenu-body';
  body.id = `submenu-${name}`;
  buttons.filter(Boolean).forEach(button => body.appendChild(button));
  wrapper.append(toggle, body);
  return wrapper;
}

function toggleSubmenu(name) {
  const body = document.getElementById(`submenu-${name}`);
  const toggle = document.querySelector(`.menu-submenu-toggle[data-submenu="${name}"]`);
  if (!body || !toggle) return;
  const opening = !body.classList.contains('open');

  document.querySelectorAll('.menu-submenu-body.open').forEach(otherBody => {
    otherBody.classList.remove('open');
    const otherName = otherBody.id.replace('submenu-', '');
    const otherToggle = document.querySelector(`.menu-submenu-toggle[data-submenu="${otherName}"]`);
    otherToggle?.classList.remove('open');
    otherToggle?.setAttribute('aria-expanded', 'false');
  });

  body.classList.toggle('open', opening);
  toggle.classList.toggle('open', opening);
  toggle.setAttribute('aria-expanded', String(opening));
}

function upgradeSprinklrMenu() {
  const overlay = document.getElementById('menuOverlay');
  if (!overlay || overlay.dataset.organized === 'true') return;

  const findByOnclick = value => [...overlay.querySelectorAll('.menu-btn')]
    .find(button => button.getAttribute('onclick') === value);
  const dangerGroup = overlay.querySelector('.menu-btn-danger')?.closest('.menu-group');

  const submenus = [
    createSprinklrSubmenu('dados', 'Dados', 'download', [
      document.getElementById('exportBtn'),
      findByOnclick("openModal('importModal')")
    ]),
    createSprinklrSubmenu('aparencia', 'Aparência', 'palette', [
      document.getElementById('toggleSectionsBtn'),
      document.getElementById('themeSettingRow'),
      document.getElementById('textPreviewBtn')
    ]),
    createSprinklrSubmenu('ferramentas', 'Ferramentas', 'wrench', [
      findByOnclick("openModal('shortcutsModal')"),
      findByOnclick("openJsonModal('diagnostic')"),
      findByOnclick("openTagModal('diagnostic')"),
      findByOnclick('resetPreferences()'),
      findByOnclick('openAboutModal()')
    ]),
    createSprinklrSubmenu('janela', 'Janela', 'app_window', [
      findByOnclick('openPopout()'),
      findByOnclick('openPopoutBlank()')
    ])
  ];

  overlay.querySelectorAll('.menu-sep').forEach(separator => separator.remove());
  overlay.querySelectorAll('.menu-group').forEach(group => {
    if (group !== dangerGroup && !group.children.length) group.remove();
  });

  const fragment = document.createDocumentFragment();
  submenus.forEach(submenu => fragment.appendChild(submenu));
  const separator = document.createElement('div');
  separator.className = 'menu-sep';
  fragment.appendChild(separator);
  overlay.insertBefore(fragment, dangerGroup || null);
  overlay.dataset.organized = 'true';
}

function openPopout() {
  const width = 440;
  const height = 1200;
  window.open(location.href, 'BluePopout', `width=${width},height=${height},left=${(screen.width - width) / 2},top=${(screen.height - height) / 2},resizable=yes,scrollbars=yes`);
}

function openPopoutBlank() {
  const width = 440;
  const height = 1200;

  const win = window.open('', 'BluePopOut', `width=${width},height=${height},left=${(screen.width - width) / 2},top=${(screen.height - height) / 2},resizable=yes,scrollbars=yes`);

  if (!win) {
    notify('O navegador bloqueou o pop out', 'err');
    return;
  }

  const clone = document.documentElement.cloneNode(true);
  clone.querySelector('#backupBanner')?.classList.remove('show');
  clone.querySelector('#menuOverlay')?.classList.remove('open');

  win.document.write(clone.outerHTML);
  win.document.close();

  setTimeout(() => {
    const doc = win.document;
    doc.querySelectorAll("link[rel~='icon']").forEach(icon => icon.remove());

    const link = doc.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = './assets/blu.svg';
    doc.head.appendChild(link);
  }, 50);
}

document.addEventListener('click', event => {
  const overlay = document.getElementById('menuOverlay');
  if (!overlay) return;
  if (!overlay.classList.contains('open')) return;

  if (!overlay.contains(event.target) && !event.target.closest('#hamburger')) {
    overlay.classList.remove('open');
  }
});

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const typing = isTypingField(document.activeElement);

  if ((event.ctrlKey || event.metaKey) && key === 'e') {
    if (!typing) {
      event.preventDefault();
      toggleAllSections();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    if (!typing) {
      event.preventDefault();
      undoLastAction();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && key === 'y') {
    if (!typing) {
      event.preventDefault();
      redoLastAction();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 's') {
    event.preventDefault();
    exportData();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'd') {
    event.preventDefault();
    toggleTheme();
    return;
  }

  if (event.altKey && key === 'n' && !typing) {
    event.preventDefault();
    openModal('sectionModal');
    return;
  }

  if (event.altKey && key === 'g' && !typing) {
    event.preventDefault();
    toggleEditMode();
    return;
  }

  if (event.altKey && key === 'c' && !typing) {
    event.preventDefault();
    toggleExportEncryption();
    return;
  }

  if (event.key === '/' && !typing) {
    event.preventDefault();
    document.getElementById('searchInput').focus();
    return;
  }

  if (event.key === '?' && !typing) {
    event.preventDefault();
    openModal('shortcutsModal');
    return;
  }

  if (event.key === 'Escape') {
    ['btnModal', 'sectionModal', 'tagModal', 'importModal', 'dialogModal', 'shortcutsModal', 'jsonModal', 'buttonViewModal', 'aboutModal'].forEach(closeModal);
    closeContextMenu();
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

setupDialogEvents();
setupVersionBadgeHover();
migrateLegacySettings();
initTheme();
initTextPreviewPreference();
initSearchGuidance();
upgradeSprinklrMenu();
init();

/* End of bundle.js */
