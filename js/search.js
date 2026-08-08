// ==========================================================
// Pesquisa (nome, tag, @seção)
// ==========================================================

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
  if (!msg) return;

  if (!query) {
    msg.classList.remove('show');
    msg.textContent = '';
    return;
  }

  const hasVisibleSection = [...document.querySelectorAll('.section-wrap')]
    .some(section => !section.classList.contains('search-hidden'));

  if (hasVisibleSection) {
    msg.classList.remove('show');
    msg.textContent = '';
    return;
  }

  msg.innerHTML = `🔍 Nenhum resultado para <strong>"${escapeHtml(query)}"</strong>`;
  msg.classList.add('show');
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
