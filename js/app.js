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

function init() {
  const saved = loadPersistedState();
  const importUndoState = consumePendingImportUndoState();
  const sourceData = saved && Array.isArray(saved.sections) ? saved : getDemoState();
  const data = normalizeImportedData(sourceData);

  tags = Array.isArray(data.tags) ? [...data.tags] : [];
  archivedItems = JSON.parse(JSON.stringify(data.archived));
  renderAll(Array.isArray(data.sections) ? data.sections : []);
  if (importUndoState) {
    history.push(JSON.stringify(importUndoState));
  }
  updateTagDatalist();
  updateToggleSectionsBtnLabel();

  // Estado carregado vira a referência: só avisamos sobre backup
  // pendente quando o usuário fizer alterações a partir daqui.
  markCurrentStateAsExported();

  // markCurrentStateAsExported() também persiste esse primeiro snapshot (por
  // exemplo, grava o demo para a próxima sessão na primeira visita).
}

function toggleEditMode() {
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);
  document.querySelectorAll('.btn-wrap').forEach(button => button.draggable = editMode);

  const button = document.getElementById('editModeBtn');
  button.querySelector('.menu-btn-label').textContent = `Modo de Edição: ${editMode ? 'ON' : 'OFF'}`;
  button.classList.toggle('active', editMode);

  updateShiftMode();
  renderFavoritesShelf();
  notify(editMode ? 'Modo de edição ativado' : 'Modo de edição desativado');
}

// "Marca e Versão" — propositalmente NÃO persiste em localStorage:
// é um estado só da sessão atual, sempre volta a aparecer num F5/nova
// visita (pensado como um "modo apresentação" rápido, não preferência).
let versionHidden = false;

function toggleVersionVisibility() {
  versionHidden = !versionHidden;

  const versionBadge = document.getElementById('appVersion');
  if (versionBadge) versionBadge.classList.toggle('version-hidden', versionHidden);

  const button = document.getElementById('hideVersionBtn');
  if (button) {
    button.classList.toggle('active', versionHidden);
    button.querySelector('.menu-btn-label').textContent = `Marca e Versão: ${versionHidden ? 'Ocultas' : 'Visíveis'}`;
  }
}

function toggleTheme() {
  setThemePreference(document.body.classList.contains('dark') ? 'light' : 'dark');
}

function openAboutModal() {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  const version = document.getElementById('aboutVersion');
  const displayMode = document.getElementById('aboutDisplayMode');
  const connection = document.getElementById('aboutConnection');

  if (version) version.textContent = `Versão ${VERSION}`;
  if (displayMode) displayMode.textContent = standalone ? 'Aplicativo instalado (PWA)' : 'Navegador';
  if (connection) connection.textContent = navigator.onLine ? 'Online' : 'Offline';

  document.getElementById('menuOverlay')?.classList.remove('open');
  openModal('aboutModal');
}

function setThemePreference(preference) {
  const value = ['system', 'light', 'dark'].includes(preference) ? preference : 'system';
  setSetting('theme', value);
  applyTheme(value === 'system' ? !!systemThemeQuery?.matches : value === 'dark');
}

const editAnimationMedia = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let editAnimationEnabled = true;

function updateEditAnimationButtonUI() {
  const button = document.getElementById('editAnimationBtn');
  if (!button) return;
  button.classList.toggle('active', editAnimationEnabled);
  button.setAttribute('aria-pressed', String(editAnimationEnabled));
  button.querySelector('.menu-btn-label').textContent = `Animação na Edição: ${editAnimationEnabled ? 'ON' : 'OFF'}`;
}

function applyEditAnimationPreference(value = getSetting('editAnimation')) {
  editAnimationEnabled = value === 'on' || (value !== 'off' && !editAnimationMedia?.matches);
  document.body.classList.toggle('edit-animation-off', !editAnimationEnabled);
  updateEditAnimationButtonUI();
}

function toggleEditAnimationPreference() {
  editAnimationEnabled = !editAnimationEnabled;
  setSetting('editAnimation', editAnimationEnabled ? 'on' : 'off');
  applyEditAnimationPreference(editAnimationEnabled ? 'on' : 'off');
  notify(`Animação na edição ${editAnimationEnabled ? 'ativada' : 'desativada'}`);
}

function initEditAnimationPreference() {
  applyEditAnimationPreference();
  const handleMotionPreferenceChange = () => {
    if (getSetting('editAnimation') === null) applyEditAnimationPreference();
  };
  if (editAnimationMedia?.addEventListener) {
    editAnimationMedia.addEventListener('change', handleMotionPreferenceChange);
  } else {
    editAnimationMedia?.addListener(handleMotionPreferenceChange);
  }
}

async function resetPreferences() {
  const ok = await confirmDialog(
    'As configurações de aparência e comportamento voltarão ao padrão. Seus botões, seções, favoritos e estatísticas não serão alterados.',
    { title: '↺ Redefinir Preferências', confirmText: 'Redefinir' }
  );
  if (!ok) return;

  if (!clearBluPreferences()) {
    notify('Não foi possível redefinir as preferências', 'err');
    return;
  }

  clearSearchHistory({ silent: true });

  setSetting('advancedMenu', 'off');
  applyAdvancedMenuPreference(false);

  applyTheme(!!systemThemeQuery?.matches);
  applyTextPreviewState(true);
  dragPreviewEnabled = false;
  applyDragPreviewState();
  advancedOrganizingEnabled = false;
  updateAdvancedOrganizingButtonUI();
  applyEditAnimationPreference();
  updateSearchHistoryButtonUI();

  versionHidden = false;
  document.getElementById('appVersion')?.classList.remove('version-hidden');
  const hideVersionButton = document.getElementById('hideVersionBtn');
  if (hideVersionButton) {
    hideVersionButton.classList.remove('active');
    hideVersionButton.querySelector('.menu-btn-label').textContent = 'Marca e Versão: Visíveis';
  }

  updateContentPreferenceButtons();
  updateContentViewSwitcher();
  showContentView('home');
  renderFavoritesShelf();
  document.getElementById('menuOverlay')?.classList.remove('open');
  notify('Preferências redefinidas');
}

const systemThemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

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

  // Se o usuário nunca escolheu manualmente, acompanha mudanças do sistema em tempo real.
  systemThemeQuery?.addEventListener('change', event => {
    const currentStored = getSetting('theme');
    if (currentStored === 'system' || (currentStored !== 'dark' && currentStored !== 'light')) applyTheme(event.matches);
  });
}

function toggleMenu() {
  document.getElementById('menuOverlay').classList.toggle('open');
}

function toggleSubmenu(name) {
  const body = document.getElementById(`submenu-${name}`);
  const toggleBtn = document.querySelector(`.menu-submenu-toggle[data-submenu="${name}"]`);
  if (!body || !toggleBtn) return;

  const isOpen = body.classList.toggle('open');
  toggleBtn.classList.toggle('open', isOpen);
  toggleBtn.setAttribute('aria-expanded', String(isOpen));

  // Comportamento accordion: abrir um grupo fecha os demais, evitando o
  // menu inteiro ficar "caótico" com vários submenus abertos ao mesmo tempo.
  if (isOpen) {
    document.querySelectorAll('.menu-submenu-body.open').forEach(otherBody => {
      if (otherBody === body) return;
      // Um submenu aninhado permanece aberto junto de seu grupo pai.
      if (otherBody.contains(body) || body.contains(otherBody)) return;
      otherBody.classList.remove('open');

      const otherName = otherBody.id.replace('submenu-', '');
      const otherToggle = document.querySelector(`.menu-submenu-toggle[data-submenu="${otherName}"]`);
      if (otherToggle) {
        otherToggle.classList.remove('open');
        otherToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

const ADVANCED_MENU_MIGRATION_REVISION = 'preferences-v3';

function hasCustomizedAdvancedPreference() {
  return getSetting('dragPreview') === 'on'
    || getSetting('advancedOrganizing') === 'on'
    || getSetting('searchHistory') === 'on';
}

function applyAdvancedMenuPreference(enabled) {
  document.body.classList.toggle('menu-simple', !enabled);

  const button = document.getElementById('advancedMenuBtn');
  if (button) {
    button.classList.toggle('active', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.querySelector('.menu-btn-label').textContent = `Opções Avançadas: ${enabled ? 'ON' : 'OFF'}`;
  }

  if (!enabled) {
    ['organizacao', 'janela', 'ferramentas'].forEach(name => {
      const body = document.getElementById(`submenu-${name}`);
      const toggle = document.querySelector(`.menu-submenu-toggle[data-submenu="${name}"]`);
      body?.classList.remove('open');
      toggle?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    });
  }
}

function initAdvancedMenuPreference() {
  const stored = getSetting('advancedMenu');
  const migrationRevision = getMetaValue('migrations', 'advancedMenu');

  if (migrationRevision === ADVANCED_MENU_MIGRATION_REVISION && (stored === 'on' || stored === 'off')) {
    applyAdvancedMenuPreference(stored === 'on');
    return;
  }

  const enabled = hasCustomizedAdvancedPreference();
  setMetaValue('migrations', 'advancedMenu', ADVANCED_MENU_MIGRATION_REVISION);

  setSetting('advancedMenu', enabled ? 'on' : 'off');
  applyAdvancedMenuPreference(enabled);
}

function toggleAdvancedMenuPreference() {
  const enabled = getSetting('advancedMenu') !== 'on';
  setSetting('advancedMenu', enabled ? 'on' : 'off');
  applyAdvancedMenuPreference(enabled);
  notify(`Opções avançadas ${enabled ? 'ativadas' : 'desativadas'}`);
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

  // Clona o DOM atual, mas "limpa" estados transitórios (como o banner de
  // backup aberto) antes de escrever — assim a nova janela nunca nasce com
  // ele visível, independente do timing de reexecução dos scripts.
  const clone = document.documentElement.cloneNode(true);
  clone.querySelector('#backupBanner')?.classList.remove('show');
  clone.querySelector('#menuOverlay')?.classList.remove('open');

  win.document.write(clone.outerHTML);
  win.document.close();

  // Reaproveita o favicon estático do projeto — mais simples e confiável
  // do que reconstruir um SVG complexo via data URI (renderizadores de
  // favicon costumam ter suporte limitado a clipPath/gradientes).
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

// O worker fica em /js para manter a raiz organizada, mas precisa controlar
// todo o app. O cabeçalho Service-Worker-Allowed configurado na Vercel autoriza
// explicitamente esse escopo mais amplo.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/js/service-worker.js', { scope: '/' })
      .catch(error => console.warn('Não foi possível registrar o service worker:', error));
  });
}

// --- Atalhos globais e wiring de eventos --------------------

document.addEventListener('click', event => {
  const overlay = document.getElementById('menuOverlay');
  if (!overlay.classList.contains('open')) return;

  if (!overlay.contains(event.target) && !event.target.closest('#hamburger')) {
    overlay.classList.remove('open');
  }
});

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const typing = isTypingField(document.activeElement);

  // Alt+J — Nova janela do Blû
  if (event.altKey && !event.ctrlKey && !event.metaKey && key === 'j') {
    event.preventDefault();
    openPopout();
    return;
  }

  // Alt+P — Pop-out em about:blank
  if (event.altKey && !event.ctrlKey && !event.metaKey && key === 'p') {
    event.preventDefault();
    openPopoutBlank();
    return;
  }

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

  // Ctrl+S — Exportar (mapeia no "salvar" mental das pessoas)
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 's') {
    event.preventDefault();
    exportData();
    return;
  }

  // Ctrl+Shift+D — Alternar tema (Ctrl+D sozinho é reservado pelo navegador p/ favoritar)
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'd') {
    event.preventDefault();
    toggleTheme();
    return;
  }

  // Alt+N — Nova Seção
  if (event.altKey && key === 'n' && !typing) {
    event.preventDefault();
    openModal('sectionModal');
    return;
  }

  // Alt+G — Ativar/desativar modo de edição
  if (event.altKey && key === 'g' && !typing) {
    event.preventDefault();
    toggleEditMode();
    return;
  }

  // Alt+C — Ativar/desativar criptografia do próximo export
  if (event.altKey && key === 'c' && !typing) {
    event.preventDefault();
    toggleExportEncryption();
    return;
  }

  // Alt+H — Ativar/desativar histórico de pesquisas
  if (event.altKey && !event.ctrlKey && !event.metaKey && key === 'h') {
    event.preventDefault();
    toggleSearchHistoryPreference();
    return;
  }

  // / — Foca a busca (padrão Slack/GitHub/Notion)
  if (event.key === '/' && !typing) {
    event.preventDefault();
    document.getElementById('searchInput').focus();
    return;
  }

  // ? — Abre o painel de atalhos
  if (event.key === '?' && !typing) {
    event.preventDefault();
    openModal('shortcutsModal');
    return;
  }

  if (event.key === 'Escape') {
    if (document.getElementById('dialogModal')?.classList.contains('open')) {
      closeDialog(false);
      return;
    }

    const openModals = [...document.querySelectorAll('.modal-bg.open')];
    const topModal = openModals[openModals.length - 1];
    if (topModal) {
      event.preventDefault();
      requestModalDismiss(topModal.id);
      return;
    }
    document.getElementById('menuOverlay').classList.remove('open');
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    if (document.getElementById('btnModal').classList.contains('open')) saveBtn();
    if (document.getElementById('sectionModal').classList.contains('open')) saveSection();
  }
});

document.querySelectorAll('.modal-bg').forEach(background => {
  background.addEventListener('click', event => {
    if (event.target === background && background.id !== 'dialogModal') {
      requestModalDismiss(background.id);
    }
  });
});

setupDialogEvents();
setupVersionBadgeHover();
getOrCreateClientId();
migrateLegacySettings();
migrateLegacyMeta();
initAdvancedMenuPreference();
initTheme();
initEditAnimationPreference();
initDragPreviewPreference();
initAdvancedOrganizingPreference();
initTextPreviewPreference();
initSearchGuidance();
initShareLinkEvidence();
initShareConnectivity();
registerServiceWorker();
init();
pruneUserData();
initContentDashboard();
initQuickActions();
initWhatsNew();
