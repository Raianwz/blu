// ==========================================================
// Dados pessoais locais: estatísticas, atividade e backups
// ==========================================================

const USERDATA_STORAGE_KEY = 'blu:userdata';
const USERDATA_FORMAT_VERSION = 4;
const ACTIVITY_LOG_LIMIT = 500;
const DAILY_METRICS_EPOCH = '2026-08-17';
const USER_ACTIVITY_TYPES = ['created', 'deleted', 'edited', 'copied', 'viewed'];
let userData = loadUserData();

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function sanitizeMetricCounters(source, types = USER_ACTIVITY_TYPES) {
  const counters = {};
  types.forEach(type => {
    counters[type] = Math.max(0, Math.floor(Number(source?.[type]) || 0));
  });
  return counters;
}

function sanitizeDailyMetrics(source) {
  const history = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const startedAt = isValidDateKey(history.startedAt) ? history.startedAt : DAILY_METRICS_EPOCH;
  const days = {};
  if (history.days && typeof history.days === 'object' && !Array.isArray(history.days)) {
    Object.entries(history.days).forEach(([date, entry]) => {
      if (!isValidDateKey(date) || !entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const activity = sanitizeMetricCounters(entry.activity);
      const buttons = {};
      if (entry.buttons && typeof entry.buttons === 'object' && !Array.isArray(entry.buttons)) {
        Object.entries(entry.buttons).forEach(([id, metrics]) => {
          if (!id) return;
          const counters = sanitizeMetricCounters(metrics);
          if (Object.values(counters).some(Boolean)) buttons[String(id)] = counters;
        });
      }
      if (Object.values(activity).some(Boolean) || Object.keys(buttons).length) {
        days[date] = { activity, buttons };
      }
    });
  }
  return { startedAt, days };
}

function sanitizeUserData(source) {
  const value = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const stats = {};
  if (value.stats && typeof value.stats === 'object' && !Array.isArray(value.stats)) {
    Object.entries(value.stats).forEach(([id, entry]) => {
      const copies = Math.max(0, Math.floor(Number(entry?.copies) || 0));
      const views = Math.max(0, Math.floor(Number(entry?.views) || 0));
      const edits = Math.max(0, Math.floor(Number(entry?.edits) || 0));
      const lastUsed = typeof entry?.lastUsed === 'string' && !Number.isNaN(Date.parse(entry.lastUsed))
        ? entry.lastUsed : null;
      const createdAt = typeof entry?.createdAt === 'string' && !Number.isNaN(Date.parse(entry.createdAt))
        ? entry.createdAt : null;
      if (id && (copies || views || edits || lastUsed || createdAt)) {
        stats[String(id)] = { copies, views, edits, lastUsed, createdAt };
      }
    });
  }
  const activitySource = value.activity && typeof value.activity === 'object' ? value.activity : {};
  const activity = {};
  USER_ACTIVITY_TYPES.forEach(type => {
    activity[type] = Math.max(0, Math.floor(Number(activitySource[type]) || 0));
  });
  const activityLog = (Array.isArray(value.activityLog) ? value.activityLog : [])
    .filter(event => event && typeof event === 'object' && typeof event.type === 'string')
    .map(event => ({
      id: String(event.id || `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      type: String(event.type),
      target: event.target === 'section' ? 'section' : 'button',
      targetId: String(event.targetId || ''),
      name: String(event.name || ''),
      sectionId: String(event.sectionId || ''),
      sectionName: String(event.sectionName || ''),
      fromSectionName: String(event.fromSectionName || ''),
      toSectionName: String(event.toSectionName || ''),
      fromPosition: event.fromPosition != null && Number.isFinite(Number(event.fromPosition)) ? Number(event.fromPosition) : null,
      toPosition: event.toPosition != null && Number.isFinite(Number(event.toPosition)) ? Number(event.toPosition) : null,
      details: event.details && typeof event.details === 'object' && !Array.isArray(event.details) ? event.details : {},
      timestamp: typeof event.timestamp === 'string' && !Number.isNaN(Date.parse(event.timestamp)) ? event.timestamp : new Date().toISOString()
    }))
    .slice(0, ACTIVITY_LOG_LIMIT);
  return {
    version: USERDATA_FORMAT_VERSION,
    stats,
    activity,
    dailyMetrics: sanitizeDailyMetrics(value.dailyMetrics),
    activityLog
  };
}

function recordActivityEvent(type, payload = {}) {
  const event = {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    target: payload.target === 'section' ? 'section' : 'button',
    targetId: String(payload.targetId || ''),
    name: String(payload.name || ''),
    sectionId: String(payload.sectionId || ''),
    sectionName: String(payload.sectionName || ''),
    fromSectionName: String(payload.fromSectionName || ''),
    toSectionName: String(payload.toSectionName || ''),
    fromPosition: payload.fromPosition != null && Number.isFinite(Number(payload.fromPosition)) ? Number(payload.fromPosition) : null,
    toPosition: payload.toPosition != null && Number.isFinite(Number(payload.toPosition)) ? Number(payload.toPosition) : null,
    details: payload.details && typeof payload.details === 'object' ? payload.details : {},
    timestamp: new Date().toISOString()
  };
  userData.activityLog.unshift(event);
  if (userData.activityLog.length > ACTIVITY_LOG_LIMIT) userData.activityLog.length = ACTIVITY_LOG_LIMIT;
  persistUserData();
  if (typeof renderActivityPanels === 'function') renderActivityPanels();
  return event;
}

function clearActivityLog() {
  userData.activityLog = [];
  persistUserData();
  renderUserDataPanels();
}

function loadUserData() {
  try {
    const stored = JSON.parse(localStorage.getItem(USERDATA_STORAGE_KEY) || '{}');
    const normalized = sanitizeUserData(stored);
    if (stored && Object.prototype.hasOwnProperty.call(stored, 'favorites')) {
      try { localStorage.setItem(USERDATA_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
    }
    return normalized;
  } catch (_) {
    return sanitizeUserData({});
  }
}

function persistUserData() {
  try {
    localStorage.setItem(USERDATA_STORAGE_KEY, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados pessoais:', error);
    notify('Não foi possível salvar as estatísticas', 'err');
    return false;
  }
}

function replaceUserData(source, validIds = null) {
  userData = sanitizeUserData(source);
  if (validIds) pruneUserData(validIds);
  else persistUserData();
  if (typeof refreshHalloweenButtonWebs === 'function') refreshHalloweenButtonWebs();
  renderUserDataPanels();
}

function resetUserData() {
  userData = sanitizeUserData({});
  userData.dailyMetrics.startedAt = getLocalDateKey();
  if (typeof refreshHalloweenButtonWebs === 'function') refreshHalloweenButtonWebs();
  renderUserDataPanels();
}

function recordDailyMetric(type, buttonId = null) {
  if (!USER_ACTIVITY_TYPES.includes(type)) return;
  const date = getLocalDateKey();
  const history = userData.dailyMetrics;
  if (!history.startedAt || date < history.startedAt) history.startedAt = date;
  if (!history.days[date]) {
    history.days[date] = {
      activity: sanitizeMetricCounters({}),
      buttons: {}
    };
  }
  const day = history.days[date];
  day.activity[type]++;

  const id = String(buttonId || '');
  if (!id) return;
  if (!day.buttons[id]) day.buttons[id] = sanitizeMetricCounters({});
  day.buttons[id][type]++;
}

function getCurrentButtonIds() {
  return new Set([...document.querySelectorAll('.btn-wrap')].map(button => button.dataset.id).filter(Boolean));
}

function pruneUserData(validIds = getCurrentButtonIds()) {
  Object.keys(userData.stats).forEach(id => {
    if (!validIds.has(id)) delete userData.stats[id];
  });
  persistUserData();
}

function removeButtonUserData(buttonId) {
  delete userData.stats[buttonId];
  persistUserData();
  renderUserDataPanels();
}

function recordButtonCopy(buttonId) {
  const id = String(buttonId || '');
  if (!id) return;
  const current = userData.stats[id] || {};
  userData.stats[id] = {
    ...current,
    copies: (current.copies || 0) + 1,
    views: current.views || 0,
    edits: current.edits || 0,
    lastUsed: new Date().toISOString(),
    createdAt: current.createdAt || null
  };
  userData.activity.copied++;
  recordDailyMetric('copied', id);
  persistUserData();
  if (typeof noteHalloweenDemoButtonCopy === 'function') noteHalloweenDemoButtonCopy(id);
  if (typeof refreshHalloweenButtonWebs === 'function') refreshHalloweenButtonWebs();
  renderUserDataPanels();
}

function recordUserActivity(type, buttonId = null) {
  if (!Object.prototype.hasOwnProperty.call(userData.activity, type)) return;
  userData.activity[type]++;
  const id = String(buttonId || '');
  recordDailyMetric(type, id);
  if (id && type !== 'deleted') {
    const current = userData.stats[id] || {};
    userData.stats[id] = {
      copies: current.copies || 0,
      views: (current.views || 0) + (type === 'viewed' ? 1 : 0),
      edits: (current.edits || 0) + (type === 'edited' ? 1 : 0),
      lastUsed: current.lastUsed || null,
      createdAt: type === 'created' ? (current.createdAt || new Date().toISOString()) : (current.createdAt || null)
    };
  }
  persistUserData();
  renderUserDataPanels();
}

function getButtonInfo(buttonId) {
  const button = document.querySelector(`.btn-wrap[data-id="${cssEscape(buttonId)}"]`);
  if (!button) return null;
  return {
    id: buttonId,
    name: button.querySelector('.btn-label')?.textContent || 'Botão sem nome',
    section: button.closest('.section-wrap')?.querySelector('.section-title')?.textContent || '',
    text: button.dataset.text || '',
    vis: ['public', 'private', 'other'].includes(button.dataset.vis) ? button.dataset.vis : 'other',
    customVis: customVisFromElement(button)
  };
}

function renderStatisticsPanel() {
  const summary = document.getElementById('statisticsSummary');
  const list = document.getElementById('statisticsList');
  if (!summary || !list) return;
  const entries = Object.entries(userData.stats)
    .map(([id, stats]) => ({ info: getButtonInfo(id), stats }))
    .filter(entry => entry.info)
    .sort((left, right) => right.stats.copies - left.stats.copies);
  const total = entries.reduce((sum, entry) => sum + (entry.stats.copies || 0), 0);
  summary.textContent = `${total} cópia(s) registrada(s)`;
  list.replaceChildren();
  entries.forEach(({ info, stats }) => {
    const row = document.createElement('div');
    row.className = 'userdata-row';
    const lastUsed = stats.lastUsed ? new Date(stats.lastUsed).toLocaleString('pt-BR') : 'Nunca';
    row.innerHTML = `<div class="userdata-row-meta"><strong>${escapeHtml(info.name)}</strong><small>${stats.copies || 0} cópia(s) • Último uso: ${escapeHtml(lastUsed)}</small></div>`;
    list.appendChild(row);
  });
  document.getElementById('statisticsEmpty').hidden = entries.length > 0;
}

function renderUserDataPanels() {
  renderStatisticsPanel();
  if (typeof renderContentDashboard === 'function') renderContentDashboard();
}

function openStatisticsModal() {
  pruneUserData();
  renderStatisticsPanel();
  openModal('statisticsModal');
}

function downloadJsonFile(payload, prefix) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.href = url;
  link.download = `${prefix}-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportUserDataBackup() {
  pruneUserData();
  downloadJsonFile({
    format: 'blu-userdata',
    version: USERDATA_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    userdata: userData
  }, 'blu_userdata');
  notify('Estatísticas exportadas!');
}

function exportAppDataBackup() {
  pruneUserData();
  const snapshot = getCurrentStateSnapshot();
  downloadJsonFile({
    format: 'blu-appdata',
    version: USERDATA_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: snapshot.state,
    userdata: userData
  }, 'blu_appdata');
  markCurrentStateAsExported(snapshot);
  notify('Dados e estatísticas exportados!');
}

function openUserDataImport() {
  closeModal('statisticsModal');
  openModal('importModal');
}
