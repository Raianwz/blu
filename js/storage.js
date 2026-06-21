// ==========================================================
// Estado, persistência local (autosave) e lembrete de backup
// ==========================================================

const STORAGE_KEY = 'blu:data';
const VERSION = '1.0';
const BASE_TITLE = 'Blû';

let editMode = false;
let tags = [];
let history = [];
let redoStack = [];
const REDO_LIMIT = 10;

// Snapshot de referência: o estado no momento do último carregamento
// ou da última exportação. É contra ele que comparamos para saber se
// existem alterações ainda sem backup exportado.
let lastExportedComparableState = '';

const isPopoutWindow = !!window.opener && ['BluePopout', 'BluePopOut'].includes(window.name);

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

function evaluateBackupBanner(dirty) {
  const banner = document.getElementById('backupBanner');
  if (!banner) return;

  // Em janelas pop-out/secundárias o lembrete de backup não faz sentido:
  // elas são um atalho de cópia rápida, não a superfície principal de edição.
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

// --- Histórico (undo/redo) ---------------------------------

function pushHistory() {
  history.push(JSON.stringify(collectState()));
  if (history.length > 30) history.shift();

  // Qualquer nova ação manual invalida o histórico de refazer.
  redoStack = [];
}

function pushRedoState(stateString) {
  redoStack.push(stateString);
  if (redoStack.length > REDO_LIMIT) redoStack.shift();
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

function undoLastAction() {
  if (history.length === 0) return;

  try {
    pushRedoState(JSON.stringify(collectState()));
    const previousState = JSON.parse(history.pop());
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
    history.push(JSON.stringify(collectState()));
    if (history.length > 30) history.shift();

    const nextState = JSON.parse(redoStack.pop());
    restoreState(nextState);
    notify('Refeito!');
  } catch (error) {
    console.error('Erro ao refazer:', error);
    notify('Não foi possível refazer', 'err');
  }
}
