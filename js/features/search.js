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
const SEARCH_HISTORY_STORAGE_KEY = 'blu:searchHistory';
const SEARCH_HISTORY_LIMIT = 6;
const SEARCH_TYPE_LABELS = {
  all: 'Tudo',
  name: 'Nome',
  tag: 'Tag',
  category: 'Seção',
  text: 'Texto'
};
let searchPlaceholderIndex = 0;
let searchPlaceholderTimer = null;
let searchPlaceholderSwapTimer = null;
let searchHistorySaveTimer = null;

function isSearchHistoryEnabled() {
  return getSetting('searchHistory', 'off') === 'on';
}

function loadSearchHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item.query === 'string')
      .map(item => ({
        query: item.query.trim().slice(0, 200),
        type: Object.prototype.hasOwnProperty.call(SEARCH_TYPE_LABELS, item.type) ? item.type : 'all'
      }))
      .filter(item => item.query.length >= 2)
      .slice(0, SEARCH_HISTORY_LIMIT);
  } catch (_) {
    return [];
  }
}

function saveSearchHistory(entries) {
  try {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, SEARCH_HISTORY_LIMIT)));
  } catch (_) {}
}

function updateSearchHistoryButtonUI() {
  const button = document.getElementById('searchHistoryBtn');
  if (!button) return;
  const enabled = isSearchHistoryEnabled();
  button.classList.toggle('active', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.querySelector('.menu-btn-label').textContent = `Histórico de Pesquisas: ${enabled ? 'ON' : 'OFF'}`;
}

function hideSearchHistory() {
  const popover = document.getElementById('searchHistoryPopover');
  if (popover) popover.hidden = true;
  document.getElementById('searchInput')?.setAttribute('aria-expanded', 'false');
}

function hideSearchHistoryTip() {
  const tip = document.getElementById('searchHistoryTip');
  if (tip) tip.hidden = true;
}

function showSearchHistoryTip() {
  const tip = document.getElementById('searchHistoryTip');
  if (!tip || isSearchHistoryEnabled() || getSetting('searchHistoryTipDismissed', 'no') === 'yes') return;
  tip.hidden = false;
}

function dismissSearchHistoryTip() {
  setSetting('searchHistoryTipDismissed', 'yes');
  hideSearchHistoryTip();
}

function renderSearchHistory() {
  const input = document.getElementById('searchInput');
  const popover = document.getElementById('searchHistoryPopover');
  const list = document.getElementById('searchHistoryList');
  if (!input || !popover || !list || !isSearchHistoryEnabled() || input.value) {
    hideSearchHistory();
    return;
  }

  const entries = loadSearchHistory();
  if (!entries.length) {
    hideSearchHistory();
    return;
  }

  list.replaceChildren(...entries.map((entry, index) => {
    const row = document.createElement('div');
    row.className = 'search-history-item';

    const use = document.createElement('button');
    use.className = 'search-history-use';
    use.type = 'button';
    use.title = `Pesquisar novamente por ${entry.query}`;
    use.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/></svg>';
    const term = document.createElement('span');
    term.textContent = entry.query;
    const type = document.createElement('small');
    type.textContent = SEARCH_TYPE_LABELS[entry.type];
    use.append(term, type);
    use.onclick = () => useSearchHistoryEntry(entry);

    const remove = document.createElement('button');
    remove.className = 'search-history-remove';
    remove.type = 'button';
    remove.title = 'Remover pesquisa';
    remove.setAttribute('aria-label', `Remover pesquisa ${entry.query}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m18 6-12 12"/><path d="m6 6 12 12"/></svg>';
    remove.onclick = event => {
      event.stopPropagation();
      removeSearchHistoryEntry(index);
    };

    row.append(use, remove);
    return row;
  }));
  popover.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function hasVisibleSearchResults() {
  return [...document.querySelectorAll('.section-wrap')]
    .some(section => !section.classList.contains('search-hidden'));
}

function rememberCurrentSearch() {
  clearTimeout(searchHistorySaveTimer);
  searchHistorySaveTimer = null;
  if (!isSearchHistoryEnabled()) return;
  const input = document.getElementById('searchInput');
  const type = document.getElementById('searchType')?.value || 'all';
  const query = input?.value.trim() || '';
  const quotedQuery = getQuotedTextQuery(query);
  if (query.length < 2 || query === '@' || quotedQuery === '' || !hasVisibleSearchResults()) return;

  const normalized = normalizeSearchText(query);
  const entries = loadSearchHistory().filter(entry => (
    normalizeSearchText(entry.query) !== normalized || entry.type !== type
  ));
  entries.unshift({ query: query.slice(0, 200), type });
  saveSearchHistory(entries);
}

function scheduleCurrentSearch() {
  clearTimeout(searchHistorySaveTimer);
  searchHistorySaveTimer = null;
  if (!isSearchHistoryEnabled()) return;
  searchHistorySaveTimer = setTimeout(rememberCurrentSearch, 700);
}

function useSearchHistoryEntry(entry) {
  const input = document.getElementById('searchInput');
  const type = document.getElementById('searchType');
  if (!input || !type) return;
  input.value = entry.query;
  type.value = entry.type;
  updateSearchGuidance();
  doSearch();
  rememberCurrentSearch();
  hideSearchHistory();
  input.focus();
}

function removeSearchHistoryEntry(index) {
  const entries = loadSearchHistory();
  entries.splice(index, 1);
  saveSearchHistory(entries);
  renderSearchHistory();
}

function clearSearchHistory({ silent = false } = {}) {
  clearTimeout(searchHistorySaveTimer);
  searchHistorySaveTimer = null;
  try {
    localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
  } catch (_) {}
  hideSearchHistory();
  if (!silent) notify('Histórico de pesquisas limpo');
}

function toggleSearchHistoryPreference() {
  const enabled = !isSearchHistoryEnabled();
  setSetting('searchHistory', enabled ? 'on' : 'off');
  setSetting('searchHistoryTipDismissed', 'yes');
  updateSearchHistoryButtonUI();
  if (typeof updateContentPreferenceButtons === 'function') updateContentPreferenceButtons();
  hideSearchHistory();
  hideSearchHistoryTip();
  notify(`Histórico de pesquisas ${enabled ? 'ativado' : 'desativado'}`);
}

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

  input.addEventListener('focus', () => {
    stopSearchPlaceholderRotation();
    renderSearchHistory();
    showSearchHistoryTip();
  });
  input.addEventListener('blur', () => {
    updateSearchGuidance();
    setTimeout(() => {
      if (!document.getElementById('searchWrap')?.contains(document.activeElement)) hideSearchHistoryTip();
    }, 0);
  });
  input.addEventListener('input', () => {
    if (input.value) stopSearchPlaceholderRotation();
    if (input.value) {
      hideSearchHistory();
    }
    else renderSearchHistory();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      doSearch();
      rememberCurrentSearch();
      hideSearchHistory();
    } else if (event.key === 'Escape') {
      hideSearchHistory();
    }
  });
  type.addEventListener('change', updateSearchGuidance);
  desktopSearchGuidanceMedia.addEventListener('change', updateSearchGuidance);
  reducedMotionMedia.addEventListener('change', updateSearchGuidance);
  updateSearchGuidance();
  updateSearchClearButton();
  updateSearchHistoryButtonUI();
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('#searchWrap')) {
      hideSearchHistory();
      hideSearchHistoryTip();
    }
  });
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

function getQuotedTextQuery(raw) {
  if (raw.length < 2 || !raw.startsWith('"') || !raw.endsWith('"')) return null;
  return raw.slice(1, -1).trim();
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
  const raw = document.getElementById('searchInput').value.trim();
  const q = normalizeSearchText(raw);
  const type = document.getElementById('searchType').value;
  if (typeof updateFavoritesShelfSearchState === 'function') updateFavoritesShelfSearchState(!!raw);

  // A pesquisa atua sobre os botões da tela inicial. Se o usuário começar
  // a digitar enquanto visualiza as estatísticas, retorna ao início antes
  // de aplicar o filtro para que o resultado fique imediatamente visível.
  if (raw && typeof activeContentView !== 'undefined' && activeContentView !== 'home') {
    showContentView('home');
  }

  if (!raw) {
    clearTimeout(searchHistorySaveTimer);
    searchHistorySaveTimer = null;
    if (collapseOnClear) {
      collapseAllSectionsAfterSearchClear();
    } else {
      showAllSearchResults();
    }
    return;
  }

  scheduleCurrentSearch();

  // Aspas ativam uma busca direta no conteúdo, sem alterar ou depender
  // da opção selecionada no dropdown.
  const quotedTextQuery = getQuotedTextQuery(raw);
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

  // @ sozinho não executa ação especial.
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
