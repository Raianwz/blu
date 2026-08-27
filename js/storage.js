// ==========================================================
// Estado, persistência local (autosave) e lembrete de backup
// ==========================================================

const STORAGE_KEY = 'blu:data';
const SETTINGS_STORAGE_KEY = 'blu:settings';
const VERSION = '1.7';
const BASE_TITLE = 'Blû';

let editMode = false;
let tags = [];
let history = [];
let redoStack = [];
const REDO_LIMIT = 10;
let clearUndoSnapshot = null;
let clearRedoSnapshot = null;

// Snapshot de referência: o estado no momento do último carregamento
// ou da última exportação. É contra ele que comparamos para saber se
// existem alterações ainda sem backup exportado.
let lastExportedComparableState = '';

const isPopoutWindow = !!window.opener && ['BluePopout', 'BluePopOut'].includes(window.name);

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

function clearBluLocalStorage() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith('blu:')) localStorage.removeItem(key);
    }
  } catch (_) {}
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

// --- Autosave (localStorage) ------------------------------

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

function updateUnsavedChangesUI() {
  persistState();

  const dirty = hasUnsavedChanges();
  const versionBadge = document.getElementById('appVersion');
  const exportBtn = document.getElementById('exportBtn');

  if (versionBadge) {
    versionBadge.classList.toggle('unsaved', dirty);
    versionBadge.dataset.dirty = String(dirty);
    // Se o mouse já está sobre o badge, mantém a variação com versão visível.
    versionBadge.textContent = isVersionBadgeHovering ? getVersionedBadgeText(dirty) : getBaseBadgeText(dirty);
    versionBadge.title = dirty
      ? 'Seus dados estão salvos neste navegador. Exporte um JSON para ter um backup fora do navegador.'
      : 'Seus dados estão salvos neste navegador e com backup exportado.';
  }

  if (exportBtn) {
    exportBtn.classList.toggle('active', dirty);
    exportBtn.title = dirty ? 'Exportar JSON — há alterações sem backup' : 'Exportar JSON';
  }

  // Propaga o mesmo aviso para o cabeçalho do submenu "Dados" — assim dá
  // para perceber que há algo pendente lá dentro mesmo com o grupo fechado.
  const dadosToggle = document.querySelector('.menu-submenu-toggle[data-submenu="dados"]');
  if (dadosToggle) dadosToggle.classList.toggle('active', dirty);

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

function evaluateBackupBanner(dirty) {
  const banner = document.getElementById('backupBanner');
  if (!banner) return;

  const current = getComparableStateString();
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
  backupBannerDismissedFor = getComparableStateString();
  evaluateBackupBanner(hasUnsavedChanges());
}

// --- Histórico (undo/redo) ---------------------------------

function pushHistory() {
  history.push(JSON.stringify(collectState()));
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
  updateTagDatalist();
  renderAll(normalizedState.sections);

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
  if (history.length === 0) return;
  document.querySelectorAll('#notifArea .notif.has-action').forEach(element => element.remove());

  try {
    const currentStateString = JSON.stringify(collectState());
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
    const currentStateString = JSON.stringify(collectState());
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
