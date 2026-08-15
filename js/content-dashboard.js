// ==========================================================
// Prateleira de favoritos e painel secundário de conteúdo
// ==========================================================

let activeContentView = 'home';

function isFavoritesShelfEnabled() {
  return getSetting('favoritesShelf', 'on') !== 'off';
}

function isContentDashboardEnabled() {
  return getSetting('contentDashboard', 'on') !== 'off';
}

function isFavoritesShelfCollapsed() {
  return getSetting('favoritesShelfCollapsed', 'off') === 'on';
}

function isFavoriteContextMenuEnabled() {
  return getSetting('favoriteContextMenu', 'on') !== 'off';
}

function updateContentPreferenceButtons() {
  const shelfButton = document.getElementById('favoritesShelfBtn');
  const dashboardButton = document.getElementById('contentDashboardBtn');
  const contextButton = document.getElementById('favoriteContextMenuBtn');
  const shelfEnabled = isFavoritesShelfEnabled();
  const dashboardEnabled = isContentDashboardEnabled();
  if (shelfButton) {
    shelfButton.classList.toggle('active', shelfEnabled);
    shelfButton.querySelector('.menu-btn-label').textContent = `Exibir Favoritos: ${shelfEnabled ? 'ON' : 'OFF'}`;
  }
  if (dashboardButton) {
    dashboardButton.classList.toggle('active', dashboardEnabled);
    dashboardButton.querySelector('.menu-btn-label').textContent = `Aba de Estatísticas: ${dashboardEnabled ? 'ON' : 'OFF'}`;
  }
  if (contextButton) {
    const enabled = isFavoriteContextMenuEnabled();
    contextButton.classList.toggle('active', enabled);
    contextButton.querySelector('.menu-btn-label').textContent = `Favoritar pelo Menu: ${enabled ? 'ON' : 'OFF'}`;
  }
}

function toggleFavoritesShelfPreference() {
  setSetting('favoritesShelf', isFavoritesShelfEnabled() ? 'off' : 'on');
  updateContentPreferenceButtons();
  renderFavoritesShelf();
}

function toggleContentDashboardPreference() {
  const enabled = !isContentDashboardEnabled();
  setSetting('contentDashboard', enabled ? 'on' : 'off');
  if (!enabled) showContentView('home');
  updateContentPreferenceButtons();
  updateContentViewSwitcher();
}

function toggleFavoriteContextMenuPreference() {
  setSetting('favoriteContextMenu', isFavoriteContextMenuEnabled() ? 'off' : 'on');
  updateContentPreferenceButtons();
}

function toggleFavoritesShelfCollapsed() {
  const collapsed = !isFavoritesShelfCollapsed();
  setSetting('favoritesShelfCollapsed', collapsed ? 'on' : 'off');
  renderFavoritesShelf();
}

function createFavoriteCard(info, removable = false) {
  const card = document.createElement('div');
  card.className = 'favorite-card';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'favorite-card-copy';
  copy.innerHTML = `<strong>${escapeHtml(info.name)}</strong><small>${escapeHtml(info.section)}</small>`;
  copy.title = `Copiar ${info.name} • ${info.section}`;
  copy.onclick = () => copyUserDataButton(info.id);
  card.appendChild(copy);
  if (removable) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'favorite-card-remove';
    remove.textContent = '×';
    remove.title = 'Remover dos favoritos';
    remove.onclick = () => toggleFavoriteButton(info.id);
    card.appendChild(remove);
  }
  return card;
}

function renderFavoritesShelf() {
  const shelf = document.getElementById('favoritesShelf');
  const list = document.getElementById('favoritesShelfList');
  const count = document.getElementById('favoritesShelfCount');
  if (!shelf || !list || !count) return;
  const entries = userData.favorites.map(getButtonInfo).filter(Boolean);
  const collapsed = isFavoritesShelfCollapsed();
  const searchActive = !!document.getElementById('searchInput')?.value.trim();
  shelf.hidden = !isFavoritesShelfEnabled() || entries.length === 0 || activeContentView !== 'home' || searchActive;
  shelf.classList.toggle('collapsed', collapsed);
  shelf.querySelector('.favorites-shelf-head')?.setAttribute('aria-expanded', String(!collapsed));
  count.textContent = entries.length;
  list.replaceChildren(...entries.map(info => createFavoriteCard(info)));
}

function updateFavoritesShelfSearchState(searching) {
  const shelf = document.getElementById('favoritesShelf');
  if (!shelf) return;
  if (searching) shelf.hidden = true;
  else renderFavoritesShelf();
}

function createUsageRow(info, stats) {
  const row = document.createElement('div');
  row.className = 'userdata-row';
  const copies = stats?.copies || 0;
  const views = stats?.views || 0;
  const edits = stats?.edits || 0;
  row.innerHTML = `<div class="userdata-row-meta"><strong>${escapeHtml(info.name)}</strong><small>${escapeHtml(info.section)} • ${copies} cópia(s) • ${views} visualização(ões) • ${edits} edição(ões)</small></div>`;
  return row;
}

function renderContentDashboard() {
  const metrics = document.getElementById('dashboardMetricCards');
  const favorites = document.getElementById('dashboardFavoritesList');
  const favoritesEmpty = document.getElementById('dashboardFavoritesEmpty');
  const mostUsed = document.getElementById('dashboardMostUsed');
  const leastUsed = document.getElementById('dashboardLeastUsed');
  if (!metrics || !favorites || !mostUsed || !leastUsed) return;

  const activity = userData.activity;
  const metricItems = [
    ['Botões atuais', document.querySelectorAll('.btn-wrap').length],
    ['Criados', activity.created],
    ['Apagados', activity.deleted],
    ['Editados', activity.edited],
    ['Copiados', activity.copied],
    ['Visualizados', activity.viewed]
  ];
  metrics.replaceChildren(...metricItems.map(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'dashboard-metric';
    card.innerHTML = `<strong>${value}</strong><span>${escapeHtml(label)}</span>`;
    return card;
  }));

  const favoriteEntries = userData.favorites.map(getButtonInfo).filter(Boolean);
  favoritesEmpty.hidden = favoriteEntries.length > 0;
  favorites.replaceChildren(...favoriteEntries.map(info => createFavoriteCard(info, true)));

  const usage = [...document.querySelectorAll('.btn-wrap')].map(button => {
    const id = button.dataset.id;
    return { info: getButtonInfo(id), stats: userData.stats[id] || { copies: 0, views: 0, edits: 0 } };
  }).filter(entry => entry.info);
  const byCopies = (left, right) => (right.stats.copies || 0) - (left.stats.copies || 0)
    || left.info.name.localeCompare(right.info.name, 'pt-BR');
  mostUsed.replaceChildren(...usage.filter(entry => (entry.stats.copies || 0) > 0).sort(byCopies).slice(0, 8)
    .map(entry => createUsageRow(entry.info, entry.stats)));
  leastUsed.replaceChildren(...usage.sort((left, right) => -byCopies(left, right)).slice(0, 8)
    .map(entry => createUsageRow(entry.info, entry.stats)));

  if (!mostUsed.children.length) {
    const empty = document.createElement('div');
    empty.className = 'userdata-empty';
    empty.textContent = 'Nenhuma cópia registrada ainda.';
    mostUsed.appendChild(empty);
  }
}

function updateContentViewSwitcher() {
  const enabled = isContentDashboardEnabled();
  const switcher = document.getElementById('contentViewSwitcher');
  if (switcher) switcher.hidden = !enabled;
  document.body.classList.toggle('content-dashboard-enabled', enabled);
}

function showContentView(view) {
  const dashboardEnabled = isContentDashboardEnabled();
  activeContentView = view === 'dashboard' && dashboardEnabled ? 'dashboard' : 'home';
  document.getElementById('main').hidden = activeContentView !== 'home';
  document.getElementById('contentDashboard').hidden = activeContentView !== 'dashboard';
  document.getElementById('homeViewBtn')?.classList.toggle('active', activeContentView === 'home');
  document.getElementById('dashboardViewBtn')?.classList.toggle('active', activeContentView === 'dashboard');
  document.getElementById('menuOverlay')?.classList.remove('open');
  renderFavoritesShelf();
  if (activeContentView === 'dashboard') renderContentDashboard();
}

function initContentDashboard() {
  updateContentPreferenceButtons();
  updateContentViewSwitcher();
  showContentView('home');
  renderUserDataPanels();
}
