// ==========================================================
// Estado, persistência local (autosave) e lembrete de backup
// ==========================================================

const STORAGE_KEY = 'blu:data';
const SETTINGS_STORAGE_KEY = 'blu:settings';
const META_STORAGE_KEY = 'blu:meta';
const CLIENT_ID_STORAGE_KEY = 'blu:clientId';
const PENDING_IMPORT_UNDO_KEY = 'blu:pendingImportUndo';
const VERSION = '1.9';
const BASE_TITLE = 'Blû';

let editMode = false;
let tags = [];
let archivedItems = { buttons: [], sections: [] };
let history = [];
let redoStack = [];
const REDO_LIMIT = 10;
let clearUndoSnapshot = null;
let clearRedoSnapshot = null;

// Última representação estável do estado exibido. Cada alteração concluída
// substitui este snapshot, permitindo que autosave, histórico e indicadores
// reutilizem a mesma coleta do DOM.
let currentStateSnapshot = null;

// Snapshot de referência: o estado no momento do último carregamento
// ou da última exportação. É contra ele que comparamos para saber se
// existem alterações ainda sem backup exportado.
let lastExportedComparableState = '';

const isPopoutWindow = !!window.opener && ['BluePopout', 'BluePopOut'].includes(window.name);

function getOrCreateClientId() {
  try {
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing && existing.length >= 32) return existing;

    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const clientId = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
    return clientId;
  } catch (_) {
    return '';
  }
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
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

function loadMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_STORAGE_KEY) || '{}');
    const source = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    return {
      version: 1,
      migrations: source.migrations && typeof source.migrations === 'object' && !Array.isArray(source.migrations) ? source.migrations : {},
      updates: source.updates && typeof source.updates === 'object' && !Array.isArray(source.updates) ? source.updates : {},
      history: source.history && typeof source.history === 'object' && !Array.isArray(source.history) ? source.history : {}
    };
  } catch (_) {
    return { version: 1, migrations: {}, updates: {}, history: {} };
  }
}

function getMetaValue(group, name, fallback = null) {
  const meta = loadMeta();
  return Object.prototype.hasOwnProperty.call(meta[group] || {}, name) ? meta[group][name] : fallback;
}

function setMetaValue(group, name, value) {
  try {
    const meta = loadMeta();
    if (!meta[group] || typeof meta[group] !== 'object') meta[group] = {};
    meta[group][name] = value;
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    return true;
  } catch (_) {
    return false;
  }
}

function migrateLegacyMeta() {
  const legacyKeys = ['blu:advancedMenuMigrated', 'blu:seenUpdates', 'blu:hasCreatedShareLink'];
  try {
    const meta = loadMeta();
    const advancedMenu = localStorage.getItem(legacyKeys[0]);
    const seenUpdates = localStorage.getItem(legacyKeys[1]);
    const hasCreatedShareLink = localStorage.getItem(legacyKeys[2]);
    let changed = false;

    if (advancedMenu !== null && !Object.prototype.hasOwnProperty.call(meta.migrations, 'advancedMenu')) {
      meta.migrations.advancedMenu = advancedMenu;
      changed = true;
    }
    if (seenUpdates !== null && !Object.prototype.hasOwnProperty.call(meta.updates, 'seenVersion')) {
      meta.updates.seenVersion = seenUpdates;
      changed = true;
    }
    if (hasCreatedShareLink === '1' && !Object.prototype.hasOwnProperty.call(meta.history, 'hasCreatedShareLink')) {
      meta.history.hasCreatedShareLink = true;
      changed = true;
    }

    if (changed || legacyKeys.some(key => localStorage.getItem(key) !== null)) {
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
      legacyKeys.forEach(key => localStorage.removeItem(key));
    }
  } catch (_) {}
}

function clearBluPreferences() {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    ['blu:theme', 'blu:dragPreview', 'blu:textPreview'].forEach(key => localStorage.removeItem(key));
    return true;
  } catch (_) {
    return false;
  }
}

function migrateLegacySettings() {
  const legacyKeys = {
    theme: 'blu:theme',
    dragPreview: 'blu:dragPreview',
    textPreview: 'blu:textPreview'
  };
  const settings = loadSettings();
  let changed = false;

  // Preferência removida quando a busca por texto passou a ficar sempre
  // disponível no seletor.
  if (Object.prototype.hasOwnProperty.call(settings, 'textSearch')) {
    delete settings.textSearch;
    changed = true;
  }

  // A primeira versão da dica marcava como vista apenas por aparecer.
  // O novo estado só registra quando o usuário a dispensa explicitamente.
  if (Object.prototype.hasOwnProperty.call(settings, 'searchHistoryTipSeen')) {
    delete settings.searchHistoryTipSeen;
    changed = true;
  }

  // Reapresenta uma vez a dica contextual para quem ainda nÃ£o ativou o
  // histÃ³rico. A revisÃ£o impede que o X seja desfeito a cada carregamento.
  if (settings.searchHistoryTipRevision !== 'focus-v1') {
    if (settings.searchHistory !== 'on') delete settings.searchHistoryTipDismissed;
    settings.searchHistoryTipRevision = 'focus-v1';
    changed = true;
  }

  try {
    Object.entries(legacyKeys).forEach(([name, key]) => {
      const legacyValue = localStorage.getItem(key);
      if (!Object.prototype.hasOwnProperty.call(settings, name) && legacyValue !== null) {
        settings[name] = legacyValue;
        changed = true;
      }
      if (legacyValue !== null) localStorage.removeItem(key);
    });

    if (changed) localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (_) {}
}

function clearBluLocalStorage({ includeClientId = false } = {}) {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (!includeClientId && key === CLIENT_ID_STORAGE_KEY) continue;
      if (key?.startsWith('blu:')) localStorage.removeItem(key);
    }
  } catch (_) {}
}

function collectState() {
  const sections = [];

  // Réplicas de destino do drag-and-drop são apenas elementos visuais e nunca
  // podem entrar em autosave, exportação ou snapshots de desfazer/refazer.
  document.querySelectorAll('.section-wrap:not(.section-drag-placeholder)').forEach(section => {
    const buttons = [];

    section.querySelectorAll('.btn-wrap:not(.drag-placeholder)').forEach(button => {
      const label = button.querySelector('.btn-label');
      buttons.push({
        id: button.dataset.id,
        name: label ? label.textContent : '',
        text: button.dataset.text || '',
        tag: button.dataset.tag || '',
        vis: button.dataset.vis || 'other',
        ...(button.dataset.vis === 'other' ? { customVis: customVisFromElement(button) } : {})
      });
    });

    sections.push({
      id: section.dataset.id,
      name: section.querySelector('.section-title').textContent,
      ...(section.dataset.icon ? { icon: section.dataset.icon } : {}),
      collapsed: section.classList.contains('collapsed'),
      buttons
    });
  });

  return {
    tags: [...tags],
    sections,
    archived: JSON.parse(JSON.stringify(archivedItems))
  };
}

function resetCustomButtonStyles() {
  const state = collectState();
  const buttons = [
    ...state.sections.flatMap(section => section.buttons),
    ...state.archived.buttons.map(record => record.item),
    ...state.archived.sections.flatMap(record => record.item.buttons)
  ];
  const customized = buttons.filter(button => {
    if (button.vis !== 'other') return false;
    const style = normalizeCustomVis(button.customVis);
    return !!(style.color || style.icon);
  });
  if (!customized.length) return false;

  pushHistory();
  customized.forEach(button => { button.customVis = normalizeCustomVis(null); });
  restoreState(state);
  return true;
}

function createStateSnapshot(state = collectState()) {
  const stateString = JSON.stringify(state);
  const comparableStateString = JSON.stringify({
    tags: [...state.tags],
    sections: state.sections.map(section => ({
      id: section.id,
      name: section.name,
      ...(section.icon ? { icon: section.icon } : {}),
      buttons: section.buttons.map(button => ({
        id: button.id,
        name: button.name,
        text: button.text,
        tag: button.tag,
        vis: button.vis,
        ...(button.vis === 'other' ? { customVis: normalizeCustomVis(button.customVis) } : {})
      }))
    })),
    archived: state.archived
  });

  return { state, stateString, comparableStateString };
}

function getCurrentStateSnapshot() {
  if (!currentStateSnapshot) currentStateSnapshot = createStateSnapshot();
  return currentStateSnapshot;
}

function getComparableStateString(snapshot = getCurrentStateSnapshot()) {
  return snapshot.comparableStateString;
}

function hasUnsavedChanges(snapshot = getCurrentStateSnapshot()) {
  if (!lastExportedComparableState) return false;
  return snapshot.comparableStateString !== lastExportedComparableState;
}

// --- Autosave (localStorage) ------------------------------

function persistState(snapshot = createStateSnapshot()) {
  currentStateSnapshot = snapshot;

  try {
    localStorage.setItem(STORAGE_KEY, snapshot.stateString);
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

// --- UI de estado (badge "salvo localmente" / lembrete de backup) ---

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

function updateUnsavedChangesUI(snapshot = createStateSnapshot()) {
  currentStateSnapshot = snapshot;
  persistState(snapshot);

  const dirty = hasUnsavedChanges(snapshot);
  const versionBadge = document.getElementById('appVersion');
  const exportBtn = document.getElementById('exportBtn');

  if (versionBadge) {
    versionBadge.classList.toggle('unsaved', dirty);
    versionBadge.dataset.dirty = String(dirty);
    // Se o mouse já está sobre o badge, mantém a variação com versão visível.
    versionBadge.textContent = isVersionBadgeHovering ? getVersionedBadgeText(dirty) : getBaseBadgeText(dirty);
    versionBadge.title = dirty
      ? 'Seus dados estão salvos neste navegador. Exporte um JSON para ter um backup fora do navegador. Clique para saber mais sobre o Blû.'
      : 'Seus dados estão salvos neste navegador e com backup exportado. Clique para saber mais sobre o Blû.';
  }

  if (exportBtn) {
    exportBtn.classList.toggle('active', dirty);
    exportBtn.title = dirty ? 'Exportar backup — há alterações desde o último backup' : 'Exportar backup';
  }

  // Propaga o mesmo aviso para o cabeçalho do submenu "Dados" — assim dá
  // para perceber que há algo pendente lá dentro mesmo com o grupo fechado.
  const dadosToggle = document.querySelector('.menu-submenu-toggle[data-submenu="dados"]');
  if (dadosToggle) dadosToggle.classList.toggle('active', dirty);

  document.title = dirty ? `● ${BASE_TITLE}` : BASE_TITLE;
  evaluateBackupBanner(dirty, snapshot);
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

function markCurrentStateAsExported(exportedSnapshot = getCurrentStateSnapshot()) {
  lastExportedComparableState = exportedSnapshot.comparableStateString;
  updateUnsavedChangesUI(getCurrentStateSnapshot());
}

window.addEventListener('beforeunload', event => {
  // Esta coleta defensiva também protege contra alguma futura mutação que não
  // tenha passado pelo fechamento central de estado.
  if (isPopoutWindow || !hasUnsavedChanges(createStateSnapshot())) return;
  event.preventDefault();
  event.returnValue = '';
});

// --- Lembrete de backup (banner) ---------------------------

let backupBannerDismissedFor = '';

function syncBackupBannerNotificationOffset() {
  const banner = document.getElementById('backupBanner');
  if (!banner?.classList.contains('show')) {
    document.body.classList.remove('backup-banner-visible');
    document.body.style.removeProperty('--notif-backup-bottom');
    if (typeof updateQuickActionsPosition === 'function') updateQuickActionsPosition();
    return;
  }

  const bannerBottom = Number.parseFloat(getComputedStyle(banner).bottom) || 0;
  document.body.style.setProperty('--notif-backup-bottom', `${Math.ceil(bannerBottom + banner.offsetHeight + 10)}px`);
  document.body.classList.add('backup-banner-visible');
  if (typeof updateQuickActionsPosition === 'function') updateQuickActionsPosition();
}

function consumePendingImportUndoState() {
  try {
    const raw = localStorage.getItem(PENDING_IMPORT_UNDO_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_IMPORT_UNDO_KEY);
    return normalizeImportedData(JSON.parse(raw));
  } catch (_) {
    localStorage.removeItem(PENDING_IMPORT_UNDO_KEY);
    return null;
  }
}

function evaluateBackupBanner(dirty, snapshot = getCurrentStateSnapshot()) {
  const banner = document.getElementById('backupBanner');
  if (!banner) return;

  const current = snapshot.comparableStateString;
  if (!dirty || backupBannerDismissedFor === current) {
    banner.classList.remove('show');
    syncBackupBannerNotificationOffset();
    return;
  }

  banner.classList.add('show');
  requestAnimationFrame(syncBackupBannerNotificationOffset);
}

window.addEventListener('resize', syncBackupBannerNotificationOffset);

function dismissBackupBanner() {
  const snapshot = getCurrentStateSnapshot();
  backupBannerDismissedFor = snapshot.comparableStateString;
  evaluateBackupBanner(hasUnsavedChanges(snapshot), snapshot);
}

// --- Histórico (undo/redo) ---------------------------------

function pushHistory() {
  if (typeof favoriteRemovalUndo !== 'undefined') favoriteRemovalUndo = [];
  history.push(getCurrentStateSnapshot().stateString);
  if (history.length > 30) history.shift();

  // Qualquer nova ação manual invalida o histórico de refazer.
  redoStack = [];
  clearRedoSnapshot = null;
  if (typeof updateQuickActionsUI === 'function') updateQuickActionsUI();
}

function pushRedoState(stateString) {
  redoStack.push(stateString);
  if (redoStack.length > REDO_LIMIT) redoStack.shift();
}

function restoreState(state) {
  const normalizedState = normalizeImportedData(state);
  tags = [...normalizedState.tags];
  archivedItems = JSON.parse(JSON.stringify(normalizedState.archived));
  updateTagDatalist();
  renderAll(normalizedState.sections);
  if (typeof updateArchiveMenuCount === 'function') updateArchiveMenuCount();
  if (typeof activeContentView !== 'undefined' && activeContentView === 'archive' && typeof renderArchiveView === 'function') renderArchiveView();

  if (editMode) {
    document.querySelectorAll('.btn-wrap').forEach(button => button.draggable = true);
  }

  doSearch();
  updateUnsavedChangesUI();
}

function recordRestoredStateItems(beforeState, afterState) {
  const beforeSections = new Map((beforeState?.sections || []).map(section => [section.id, section]));
  (afterState?.sections || []).forEach(section => {
    const previousSection = beforeSections.get(section.id);
    if (!previousSection) {
      recordActivityEvent('restored', {
        target: 'section', targetId: section.id, name: section.name,
        details: { buttonCount: section.buttons?.length || 0 }
      });
      return;
    }
    const previousButtons = new Set((previousSection.buttons || []).map(button => button.id));
    (section.buttons || []).forEach(button => {
      if (previousButtons.has(button.id)) return;
      recordActivityEvent('restored', {
        target: 'button', targetId: button.id, name: button.name,
        sectionId: section.id, sectionName: section.name
      });
    });
  });
}

function undoLastAction() {
  if (typeof undoLegacyFavoriteRemoval === 'function' && undoLegacyFavoriteRemoval()) return;
  if (history.length === 0) return;
  document.querySelectorAll('#notifArea .notif.has-action').forEach(element => element.remove());

  try {
    const currentStateString = getCurrentStateSnapshot().stateString;
    pushRedoState(currentStateString);
    const previousStateString = history.pop();

    if (clearUndoSnapshot?.stateString === previousStateString) {
      clearRedoSnapshot = {
        stateString: currentStateString,
        exportedComparableState: lastExportedComparableState
      };
      lastExportedComparableState = clearUndoSnapshot.exportedComparableState;
      clearUndoSnapshot = null;
    }

    const previousState = JSON.parse(previousStateString);
    restoreState(previousState);
    recordRestoredStateItems(JSON.parse(currentStateString), previousState);
    if (typeof updateQuickActionsUI === 'function') updateQuickActionsUI();
    mobileHaptic('success');
    notify('Desfeito!');
  } catch (error) {
    console.error('Erro ao desfazer:', error);
    notify('Não foi possível desfazer', 'err');
  }
}

function redoLastAction() {
  if (redoStack.length === 0) return;
  document.querySelectorAll('#notifArea .notif.has-action').forEach(element => element.remove());

  try {
    const currentStateString = getCurrentStateSnapshot().stateString;
    history.push(currentStateString);
    if (history.length > 30) history.shift();

    const nextStateString = redoStack.pop();
    if (clearRedoSnapshot?.stateString === nextStateString) {
      clearUndoSnapshot = {
        stateString: currentStateString,
        exportedComparableState: lastExportedComparableState
      };
      lastExportedComparableState = clearRedoSnapshot.exportedComparableState;
      clearRedoSnapshot = null;
    }

    const nextState = JSON.parse(nextStateString);
    restoreState(nextState);
    if (typeof updateQuickActionsUI === 'function') updateQuickActionsUI();
    mobileHaptic('success');
    notify('Refeito!');
  } catch (error) {
    console.error('Erro ao refazer:', error);
    notify('Não foi possível refazer', 'err');
  }
}
