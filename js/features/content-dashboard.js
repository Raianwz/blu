// ==========================================================
// Prateleira de favoritos e painel secundário de conteúdo
// ==========================================================

let activeContentView = 'home';
let dashboardPeriod = 'total';
let dashboardPeriodCursor = new Date();
const DASHBOARD_PERIODS = ['total', 'year', 'month', 'week', 'day'];

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDashboardPeriodRange(period = dashboardPeriod, cursor = dashboardPeriodCursor) {
  const current = startOfLocalDay(cursor);
  let start;
  let end;
  if (period === 'year') {
    start = new Date(current.getFullYear(), 0, 1);
    end = new Date(current.getFullYear() + 1, 0, 1);
  } else if (period === 'month') {
    start = new Date(current.getFullYear(), current.getMonth(), 1);
    end = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  } else if (period === 'week') {
    const mondayOffset = (current.getDay() + 6) % 7;
    start = new Date(current);
    start.setDate(start.getDate() - mondayOffset);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else {
    start = current;
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

function getPreviousDashboardPeriodRange(range) {
  const cursor = new Date(range.start);
  if (dashboardPeriod === 'year') cursor.setFullYear(cursor.getFullYear() - 1);
  else if (dashboardPeriod === 'month') cursor.setMonth(cursor.getMonth() - 1);
  else if (dashboardPeriod === 'week') cursor.setDate(cursor.getDate() - 7);
  else cursor.setDate(cursor.getDate() - 1);
  return getDashboardPeriodRange(dashboardPeriod, cursor);
}

function aggregateDailyMetrics(range) {
  const activity = sanitizeMetricCounters({});
  const buttons = {};
  const startKey = getLocalDateKey(range.start);
  const endKey = getLocalDateKey(range.end);
  Object.entries(userData.dailyMetrics.days).forEach(([date, entry]) => {
    if (date < startKey || date >= endKey) return;
    USER_ACTIVITY_TYPES.forEach(type => {
      activity[type] += entry.activity?.[type] || 0;
    });
    Object.entries(entry.buttons || {}).forEach(([id, metrics]) => {
      if (!buttons[id]) buttons[id] = sanitizeMetricCounters({});
      USER_ACTIVITY_TYPES.forEach(type => {
        buttons[id][type] += metrics[type] || 0;
      });
    });
  });
  return { activity, buttons };
}

function formatDashboardPeriod(range) {
  const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  if (dashboardPeriod === 'year') return String(range.start.getFullYear());
  if (dashboardPeriod === 'month') {
    const value = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(range.start);
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  if (dashboardPeriod === 'week') {
    const lastDay = new Date(range.end);
    lastDay.setDate(lastDay.getDate() - 1);
    return `${dateFormat.format(range.start)} – ${dateFormat.format(lastDay)}`;
  }
  return dateFormat.format(range.start);
}

function getMetricComparison(current, previous) {
  if (!previous) return current ? { text: 'Novo no período', className: 'positive' } : { text: 'Sem alteração', className: '' };
  const percentage = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${percentage > 0 ? '+' : ''}${percentage}% vs. período anterior`,
    className: percentage > 0 ? 'positive' : percentage < 0 ? 'negative' : ''
  };
}

function updateDashboardPeriodControls(range = null) {
  const select = document.getElementById('dashboardPeriodSelect');
  if (select) select.value = dashboardPeriod;
  const navigator = document.getElementById('dashboardPeriodNavigator');
  const hint = document.getElementById('dashboardPeriodHint');
  if (!navigator || !hint) return;
  const isTotal = dashboardPeriod === 'total';
  navigator.hidden = isTotal;
  hint.textContent = isTotal
    ? 'Todo o período registrado, incluindo os totais anteriores ao histórico diário.'
    : `Histórico diário disponível desde ${new Date(`${userData.dailyMetrics.startedAt}T12:00:00`).toLocaleDateString('pt-BR')}.`;
  if (isTotal || !range) return;
  document.getElementById('dashboardPeriodLabel').textContent = formatDashboardPeriod(range);
  document.getElementById('dashboardNextPeriodBtn').disabled = range.end > startOfLocalDay(new Date());
  const currentButton = document.getElementById('dashboardCurrentPeriodBtn');
  if (currentButton) {
    currentButton.textContent = {
      year: 'Ano atual',
      month: 'Mês atual',
      week: 'Semana atual',
      day: 'Hoje'
    }[dashboardPeriod];
  }
}

function setDashboardPeriod(period) {
  if (!DASHBOARD_PERIODS.includes(period)) return;
  dashboardPeriod = period;
  dashboardPeriodCursor = new Date();
  renderContentDashboard();
}

function moveDashboardPeriod(direction) {
  if (dashboardPeriod === 'total' || ![-1, 1].includes(direction)) return;
  const next = new Date(getDashboardPeriodRange().start);
  if (dashboardPeriod === 'year') next.setFullYear(next.getFullYear() + direction);
  else if (dashboardPeriod === 'month') next.setMonth(next.getMonth() + direction);
  else if (dashboardPeriod === 'week') next.setDate(next.getDate() + (7 * direction));
  else next.setDate(next.getDate() + direction);
  const nextRange = getDashboardPeriodRange(dashboardPeriod, next);
  if (direction > 0 && nextRange.start > startOfLocalDay(new Date())) return;
  dashboardPeriodCursor = next;
  renderContentDashboard();
}

function resetDashboardPeriod() {
  dashboardPeriodCursor = new Date();
  renderContentDashboard();
}

function isFavoritesShelfEnabled() {
  return getSetting('favoritesShelf', 'off') === 'on';
}

function isContentDashboardEnabled() {
  return getSetting('contentDashboard', 'off') === 'on';
}

function isFavoritesShelfCollapsed() {
  return getSetting('favoritesShelfCollapsed', 'off') === 'on';
}

function isFavoriteContextMenuEnabled() {
  return getSetting('favoriteContextMenu', 'off') === 'on';
}

function updateContentPreferenceButtons() {
  const shelfButton = document.getElementById('favoritesShelfBtn');
  const dashboardButton = document.getElementById('contentDashboardBtn');
  const contextButton = document.getElementById('favoriteContextMenuBtn');
  const contentToggle = document.querySelector('.menu-submenu-toggle[data-submenu="conteudo"]');
  const shelfEnabled = isFavoritesShelfEnabled();
  const dashboardEnabled = isContentDashboardEnabled();
  if (shelfButton) {
    shelfButton.classList.toggle('active', shelfEnabled);
    shelfButton.querySelector('.menu-btn-label').textContent = `Favoritos na Tela Inicial: ${shelfEnabled ? 'ON' : 'OFF'}`;
  }
  if (dashboardButton) {
    dashboardButton.classList.toggle('active', dashboardEnabled);
    dashboardButton.querySelector('.menu-btn-label').textContent = `Estatísticas: ${dashboardEnabled ? 'ON' : 'OFF'}`;
  }
  if (contextButton) {
    const enabled = isFavoriteContextMenuEnabled();
    contextButton.classList.toggle('active', enabled);
    contextButton.querySelector('.menu-btn-label').textContent = `Favoritar pelo Menu: ${enabled ? 'ON' : 'OFF'}`;
  }
  contentToggle?.classList.toggle('active', shelfEnabled || dashboardEnabled || isFavoriteContextMenuEnabled() || getSetting('searchHistory', 'off') === 'on');
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
  card.className = `favorite-card vis-${info.vis}`;
  card.dataset.favoriteId = info.id;
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'favorite-card-copy';
  const visibilityIcon = info.vis === 'public' ? '🌎' : info.vis === 'private' ? '🔒' : '';
  copy.innerHTML = `<strong>${visibilityIcon ? `<span>${visibilityIcon}</span> ` : ''}${escapeHtml(info.name)}</strong><small>${escapeHtml(info.section)}</small>`;
  copy.onclick = () => copyUserDataButton(info.id);
  bindButtonTextPreview(copy, info.text, info.vis);
  card.appendChild(copy);
  if (removable || editMode) {
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

const ACTIVITY_ICON_PATHS = {
  created: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  updated: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  deleted: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
  restored: '<path d="M3 7v6h6"/><path d="M5.5 17a8 8 0 1 0 .5-10L3 10"/>',
  duplicated: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  transferred: '<path d="M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3"/>',
  reordered: '<path d="m8 7 4-4 4 4M12 3v18m-4-4 4 4 4-4"/>'
};

function getActivityIcon(type) {
  return `<span class="activity-icon activity-${escapeHtml(type)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACTIVITY_ICON_PATHS[type] || ACTIVITY_ICON_PATHS.updated}</svg></span>`;
}

function getActivityMessage(event) {
  const name = `<strong>${escapeHtml(event.name || (event.target === 'section' ? 'Seção' : 'Botão'))}</strong>`;
  const section = event.sectionName ? ` em <strong>${escapeHtml(event.sectionName)}</strong>` : '';
  if (event.type === 'created') return `${name} ${event.target === 'section' ? 'foi criada' : `foi criado${section}`}`;
  if (event.type === 'updated') {
    if (event.target === 'section' && event.details?.previousName) return `<strong>${escapeHtml(event.details.previousName)}</strong> foi renomeada para ${name}`;
    return `${name} foi editado${event.target === 'button' ? section : ''}`;
  }
  if (event.type === 'deleted') {
    const count = event.target === 'section' && event.details?.buttonCount ? ` com ${event.details.buttonCount} botão(ões)` : '';
    return `${name} foi removid${event.target === 'section' ? 'a' : 'o'}${section}${count}`;
  }
  if (event.type === 'restored') return `${name} foi restaurad${event.target === 'section' ? 'a' : 'o'}${section}`;
  if (event.type === 'duplicated') return `${name} foi duplicad${event.target === 'section' ? 'a' : 'o'}${section}`;
  if (event.type === 'transferred') return `${name} foi movido de <strong>${escapeHtml(event.fromSectionName || 'outra seção')}</strong> para <strong>${escapeHtml(event.toSectionName || event.sectionName)}</strong>`;
  if (event.type === 'reordered') return `${name} mudou da posição ${event.fromPosition || '?'} para ${event.toPosition || '?'}${section}`;
  return `${name} foi alterado`;
}

function formatActivityTime(timestamp, compact = false) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const today = getLocalDateKey();
  const dateKey = getLocalDateKey(date);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: compact ? undefined : '2-digit' });
  if (dateKey === today) return `Hoje às ${time}`;
  return `${date.toLocaleDateString('pt-BR')} às ${time}`;
}

function createActivityRow(event, compact = false) {
  const row = document.createElement('article');
  row.className = `activity-row activity-row-${event.type}`;
  const changed = event.details?.changedFields || [];
  const fieldLabels = { name: 'nome', text: 'texto', tag: 'tag', vis: 'visibilidade' };
  const details = changed.length ? `<small class="activity-change-details">Alterado: ${escapeHtml(changed.map(field => fieldLabels[field] || field).join(', '))}</small>` : '';
  row.innerHTML = `${getActivityIcon(event.type)}<div class="activity-row-content"><div>${getActivityMessage(event)}</div><time datetime="${escapeHtml(event.timestamp)}">${escapeHtml(formatActivityTime(event.timestamp, compact))}</time>${compact ? '' : details}</div>`;
  return row;
}

function getFilteredActivityEvents(filter = 'all', range = null) {
  return (userData.activityLog || []).filter(event => {
    const date = new Date(event.timestamp);
    if (range && (date < range.start || date > range.end)) return false;
    if (filter === 'all') return true;
    if (filter === 'button' || filter === 'section') return event.target === filter;
    if (filter === 'movement') return event.type === 'reordered' || event.type === 'transferred';
    return event.type === filter;
  });
}

function renderActivityPanels() {
  const dashboardList = document.getElementById('dashboardActivityList');
  const dashboardEmpty = document.getElementById('dashboardActivityEmpty');
  if (dashboardList && dashboardEmpty) {
    const range = dashboardPeriod === 'total' ? null : getDashboardPeriodRange();
    const events = getFilteredActivityEvents('all', range).slice(0, 8);
    dashboardList.replaceChildren(...events.map(event => createActivityRow(event, true)));
    dashboardEmpty.hidden = events.length > 0;
  }
  if (document.getElementById('activityModal')?.classList.contains('open')) renderActivityHistory();
}

function renderActivityHistory() {
  const list = document.getElementById('activityHistoryList');
  const empty = document.getElementById('activityHistoryEmpty');
  if (!list || !empty) return;
  const filter = document.getElementById('activityFilter')?.value || 'all';
  const events = getFilteredActivityEvents(filter);
  const children = [];
  let currentDate = '';
  events.forEach(event => {
    const date = new Date(event.timestamp);
    const dateKey = getLocalDateKey(date);
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      const heading = document.createElement('h3');
      heading.className = 'activity-date-heading';
      const today = getLocalDateKey();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = getLocalDateKey(yesterdayDate);
      heading.textContent = dateKey === today ? 'Hoje' : (dateKey === yesterday ? 'Ontem' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
      children.push(heading);
    }
    children.push(createActivityRow(event));
  });
  list.replaceChildren(...children);
  empty.hidden = events.length > 0;
}

function openActivityHistory() {
  renderActivityHistory();
  openModal('activityModal');
}

async function confirmClearActivityLog() {
  const confirmed = await confirmDialog('Limpar todo o histórico de atividade? As métricas totais não serão apagadas.', { title: 'Limpar histórico', danger: true, confirmText: 'Limpar' });
  if (!confirmed) return;
  clearActivityLog();
  renderActivityHistory();
  notify('Histórico de atividade limpo');
}

function renderContentDashboard() {
  const metrics = document.getElementById('dashboardMetricCards');
  const favorites = document.getElementById('dashboardFavoritesList');
  const favoritesEmpty = document.getElementById('dashboardFavoritesEmpty');
  const mostUsed = document.getElementById('dashboardMostUsed');
  const leastUsed = document.getElementById('dashboardLeastUsed');
  if (!metrics || !favorites || !mostUsed || !leastUsed) return;

  const range = dashboardPeriod === 'total' ? null : getDashboardPeriodRange();
  const periodMetrics = range ? aggregateDailyMetrics(range) : null;
  const previousMetrics = range ? aggregateDailyMetrics(getPreviousDashboardPeriodRange(range)) : null;
  const activity = periodMetrics?.activity || userData.activity;
  updateDashboardPeriodControls(range);
  const metricItems = [
    ['Botões atuais', document.querySelectorAll('.btn-wrap').length, null],
    ['Criados', activity.created, 'created'],
    ['Apagados', activity.deleted, 'deleted'],
    ['Editados', activity.edited, 'edited'],
    ['Copiados', activity.copied, 'copied'],
    ['Visualizados', activity.viewed, 'viewed']
  ];
  metrics.replaceChildren(...metricItems.map(([label, value, type]) => {
    const card = document.createElement('div');
    card.className = 'dashboard-metric';
    const comparison = type && previousMetrics
      ? getMetricComparison(value, previousMetrics.activity[type] || 0)
      : null;
    card.innerHTML = `<strong>${value}</strong><span>${escapeHtml(label)}</span>${comparison ? `<small class="${comparison.className}">${escapeHtml(comparison.text)}</small>` : ''}`;
    return card;
  }));

  const favoriteEntries = userData.favorites.map(getButtonInfo).filter(Boolean);
  favoritesEmpty.hidden = favoriteEntries.length > 0;
  favorites.replaceChildren(...favoriteEntries.map(info => createFavoriteCard(info, true)));

  const usage = [...document.querySelectorAll('.btn-wrap')].map(button => {
    const id = button.dataset.id;
    const dailyStats = periodMetrics?.buttons[id];
    const stats = dailyStats
      ? { copies: dailyStats.copied, views: dailyStats.viewed, edits: dailyStats.edited }
      : (periodMetrics ? { copies: 0, views: 0, edits: 0 } : (userData.stats[id] || { copies: 0, views: 0, edits: 0 }));
    return { info: getButtonInfo(id), stats };
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
  renderActivityPanels();
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

document.addEventListener('contextmenu', event => {
  const card = event.target.closest('.favorite-card');
  if (!card) return;
  const buttonId = card.dataset.favoriteId;
  const info = getButtonInfo(buttonId);
  if (!info) return;
  event.preventDefault();
  const sourceButton = document.querySelector(`.btn-wrap[data-id="${cssEscape(buttonId)}"]`);
  openContextMenu([
    createContextMenuItem('Copiar texto', 'copy', () => copyUserDataButton(buttonId)),
    createContextMenuItem('Visualizar botão', 'eye', () => viewContextButton(sourceButton)),
    createContextMenuSeparator(),
    createContextMenuItem('Remover dos favoritos', 'star', () => toggleFavoriteButton(buttonId), { danger: true })
  ], event.clientX, event.clientY, card);
});
