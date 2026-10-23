// Optional, local search history for Blû Offline.
(function () {
  const storageKey = 'blu:offline:searchHistory';
  const limit = 6;
  const typeLabels = Object.freeze({ all: 'Tudo', name: 'Nome', tag: 'Tag', category: 'Seção', text: 'Texto' });
  const historyIcon = '<svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/></svg>';
  const removeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m18 6-12 12"/><path d="m6 6 12 12"/></svg>';

  function load({ getSetting, setSetting, normalizeSearchText, doSearch, updateSearchGuidance, notify }) {
    const menu = document.getElementById('submenu-conteudo');
    const searchWrap = document.getElementById('searchWrap');
    const input = document.getElementById('searchInput');
    const type = document.getElementById('searchType');
    const shortcuts = document.querySelector('#shortcutsModal tbody');
    if (!menu || !searchWrap || !input || !type) throw new Error('Busca indisponível');

    let saveTimer = null;
    const enabled = () => getSetting('searchHistory', 'off') === 'on';

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'searchHistoryBtn';
    button.className = 'menu-btn';
    button.title = 'Guardar neste dispositivo as pesquisas que encontrarem resultados — Alt + H';
    button.innerHTML = `${historyIcon}<span class="menu-btn-label"></span>`;
    menu.appendChild(button);

    const popover = document.createElement('div');
    popover.id = 'searchHistoryPopover';
    popover.className = 'search-history-popover';
    popover.setAttribute('aria-label', 'Pesquisas recentes');
    popover.hidden = true;
    popover.innerHTML = '<div class="search-history-head"><span>Pesquisas recentes</span><button type="button" class="search-history-clear">Limpar</button></div><div class="search-history-list"></div>';
    const list = popover.querySelector('.search-history-list');
    searchWrap.appendChild(popover);

    const tip = document.createElement('div');
    tip.id = 'searchHistoryTip';
    tip.className = 'search-history-tip';
    tip.setAttribute('role', 'status');
    tip.innerHTML = '<span>💡 Ative ou desative o histórico de pesquisas com <kbd>Alt</kbd> + <kbd>H</kbd></span><button type="button" title="Fechar dica" aria-label="Fechar dica">×</button>';
    searchWrap.appendChild(tip);

    input.setAttribute('aria-controls', popover.id);
    input.setAttribute('aria-expanded', 'false');
    if (shortcuts) {
      const row = document.createElement('tr');
      row.innerHTML = '<td><kbd>Alt</kbd> + <kbd>H</kbd></td><td>Ativar/desativar histórico de pesquisas</td>';
      shortcuts.appendChild(row);
    }

    function read() {
      try {
        const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!Array.isArray(data)) return [];
        return data.filter(item => item && typeof item.query === 'string')
          .map(item => ({
            query: item.query.trim().slice(0, 200),
            type: Object.prototype.hasOwnProperty.call(typeLabels, item.type) ? item.type : 'all'
          }))
          .filter(item => item.query.length >= 2).slice(0, limit);
      } catch (_) { return []; }
    }

    function write(entries) {
      try { localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, limit))); }
      catch (_) {}
    }

    function hidePopover() {
      popover.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }

    function showPopover() {
      const entries = read();
      if (!enabled() || input.value || !entries.length) return hidePopover();
      list.replaceChildren(...entries.map((entry, index) => {
        const row = document.createElement('div');
        row.className = 'search-history-item';
        const use = document.createElement('button');
        use.type = 'button';
        use.className = 'search-history-use';
        use.title = `Pesquisar novamente por ${entry.query}`;
        use.innerHTML = historyIcon;
        const term = document.createElement('span');
        term.textContent = entry.query;
        const label = document.createElement('small');
        label.textContent = typeLabels[entry.type];
        use.append(term, label);
        use.addEventListener('click', () => {
          input.value = entry.query;
          type.value = entry.type;
          updateSearchGuidance();
          doSearch();
          remember();
          hidePopover();
          input.focus();
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'search-history-remove';
        remove.title = 'Remover pesquisa';
        remove.setAttribute('aria-label', `Remover pesquisa ${entry.query}`);
        remove.innerHTML = removeIcon;
        remove.addEventListener('click', () => {
          const current = read();
          current.splice(index, 1);
          write(current);
          showPopover();
        });
        row.append(use, remove);
        return row;
      }));
      popover.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function remember() {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (!enabled()) return;
      const query = input.value.trim();
      const quotedEmpty = query.startsWith('"') && query.endsWith('"') && !query.slice(1, -1).trim();
      if (query.length < 2 || query === '@' || quotedEmpty || !document.querySelector('.section-wrap:not(.search-hidden)')) return;
      const normalized = normalizeSearchText(query);
      const entries = read().filter(entry => normalizeSearchText(entry.query) !== normalized || entry.type !== type.value);
      entries.unshift({ query: query.slice(0, 200), type: type.value });
      write(entries);
    }

    function schedule() {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (enabled() && input.value.trim()) saveTimer = setTimeout(remember, 700);
    }

    function updateTip() {
      tip.hidden = enabled()
        || getSetting('searchHistoryTipDismissed', 'no') === 'yes'
        || !searchWrap.contains(document.activeElement);
    }

    function refresh() {
      clearTimeout(saveTimer);
      saveTimer = null;
      const active = enabled();
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('.menu-btn-label').textContent = `Histórico de Pesquisas: ${active ? 'ON' : 'OFF'}`;
      updateTip();
      if (!active) hidePopover();
      else if (document.activeElement === input) showPopover();
    }

    button.addEventListener('click', () => {
      const active = !enabled();
      setSetting('searchHistory', active ? 'on' : 'off');
      setSetting('searchHistoryTipDismissed', 'yes');
      refresh();
      notify(`Histórico de pesquisas ${active ? 'ativado' : 'desativado'}`);
    });
    tip.querySelector('button').addEventListener('click', () => {
      setSetting('searchHistoryTipDismissed', 'yes');
      tip.hidden = true;
    });
    popover.querySelector('.search-history-clear').addEventListener('click', () => {
      try { localStorage.removeItem(storageKey); } catch (_) {}
      hidePopover();
      notify('Histórico de pesquisas limpo');
    });
    input.addEventListener('focus', () => { showPopover(); updateTip(); });
    searchWrap.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!searchWrap.contains(document.activeElement)) hidePopover();
        updateTip();
      }, 0);
    });
    input.addEventListener('input', () => {
      if (input.value) hidePopover();
      else showPopover();
      schedule();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { remember(); hidePopover(); }
      if (event.key === 'Escape') hidePopover();
    });
    type.addEventListener('change', schedule);
    document.getElementById('clearSearchBtn')?.addEventListener('click', showPopover);
    document.addEventListener('pointerdown', event => {
      if (!searchWrap.contains(event.target)) {
        hidePopover();
        tip.hidden = true;
      }
    });
    document.addEventListener('keydown', event => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.repeat && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        button.click();
      }
    });
    window.addEventListener('storage', event => {
      if (event.key === storageKey || event.key === 'blu:offline:settings') {
        refresh();
        if (!popover.hidden) showPopover();
      }
    });

    refresh();
    return { refresh };
  }

  window.BluExtras.register('search-history', { load });
})();
