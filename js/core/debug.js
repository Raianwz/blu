// ==========================================================
// Modo de depuração — console visível dentro do Blû
// ==========================================================

const DEBUG_MAX_ENTRIES = 200;
const debugEntries = [];
let debugModeEnabled = false;
let debugModeMinimized = false;
let debugLevelFilter = 'all';
const debugEntryElements = new WeakMap();

function formatDebugValue(value) {
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'undefined';
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;

  try {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, item) => {
      if (typeof item === 'bigint') return `${item}n`;
      if (typeof item === 'object' && item !== null) {
        if (seen.has(item)) return '[Circular]';
        seen.add(item);
      }
      return item;
    }, 2);
  } catch (_) {
    return String(value);
  }
}

function getFilteredDebugEntries() {
  return debugLevelFilter === 'all'
    ? debugEntries
    : debugEntries.filter(entry => entry.level === debugLevelFilter);
}

function getDebugEntriesText(entries = getFilteredDebugEntries()) {
  return entries
    .map(entry => `[${entry.time}] ${entry.level.toUpperCase()} ${entry.message}`)
    .join('\n');
}

function renderDebugEntry(entry) {
  const log = document.getElementById('debugLog');
  if (!log || (debugLevelFilter !== 'all' && entry.level !== debugLevelFilter)) return;

  const empty = log.querySelector('.debug-empty');
  if (empty) empty.remove();

  const line = document.createElement('div');
  line.className = `debug-entry debug-${entry.level}`;
  debugEntryElements.set(line, entry);
  const meta = document.createElement('span');
  meta.className = 'debug-entry-meta';
  meta.textContent = `${entry.time} ${entry.level.toUpperCase()}`;
  const message = document.createElement('pre');
  message.textContent = entry.message;
  line.append(meta, message);
  log.appendChild(line);

  while (log.children.length > DEBUG_MAX_ENTRIES) log.firstElementChild.remove();
  log.scrollTop = log.scrollHeight;
}

function updateDebugCount() {
  const count = document.getElementById('debugEntryCount');
  if (!count) return;
  const visibleCount = getFilteredDebugEntries().length;
  const visibleLabel = `${visibleCount} ${visibleCount === 1 ? 'evento' : 'eventos'}`;
  count.textContent = debugLevelFilter === 'all'
    ? `${visibleLabel} nesta sessão`
    : `${visibleLabel} de ${debugEntries.length}`;
}

function addDebugEntry(level, values) {
  const message = values.map(formatDebugValue).join(' ');
  const previous = debugEntries[debugEntries.length - 1];
  const now = Date.now();
  if (previous && previous.level === level && previous.message === message && now - previous.timestamp < 100) return;

  const entry = {
    level,
    message,
    timestamp: now,
    time: new Date(now).toLocaleTimeString('pt-BR')
  };

  debugEntries.push(entry);
  if (debugEntries.length > DEBUG_MAX_ENTRIES) debugEntries.shift();
  if (debugModeEnabled) renderDebugEntry(entry);
  updateDebugCount();
}

function renderDebugEntries() {
  const log = document.getElementById('debugLog');
  if (!log) return;
  log.replaceChildren();

  if (!debugEntries.length) {
    const empty = document.createElement('div');
    empty.className = 'debug-empty';
    empty.textContent = 'Nenhum evento registrado nesta sessão.';
    log.appendChild(empty);
  } else {
    debugEntries.forEach(renderDebugEntry);
  }
  updateDebugCount();
}

function setDebugMode(enabled) {
  debugModeEnabled = Boolean(enabled);
  const panel = document.getElementById('debugPanel');
  const button = document.getElementById('debugModeBtn');
  if (panel) panel.hidden = !debugModeEnabled;
  document.body.classList.toggle('debug-mode-open', debugModeEnabled);
  if (!debugModeEnabled) {
    debugModeMinimized = false;
    document.body.classList.remove('debug-mode-minimized');
    const minimizeButton = document.getElementById('debugMinimizeBtn');
    if (minimizeButton) {
      minimizeButton.textContent = '−';
      minimizeButton.title = 'Minimizar';
      minimizeButton.setAttribute('aria-label', 'Minimizar modo de depuração');
    }
  }

  if (button) {
    button.classList.toggle('active', debugModeEnabled);
    const label = button.querySelector('.menu-btn-label');
    if (label) label.textContent = `Modo de Depuração: ${debugModeEnabled ? 'ON' : 'OFF'}`;
  }
  if (debugModeEnabled) renderDebugEntries();
  requestAnimationFrame(() => {
    if (typeof syncBackupBannerNotificationOffset === 'function') syncBackupBannerNotificationOffset();
  });
}

function toggleDebugMode() {
  setDebugMode(!debugModeEnabled);
}

function toggleDebugMinimized() {
  if (!debugModeEnabled) return;
  debugModeMinimized = !debugModeMinimized;
  document.body.classList.toggle('debug-mode-minimized', debugModeMinimized);

  const button = document.getElementById('debugMinimizeBtn');
  if (button) {
    const action = debugModeMinimized ? 'Restaurar' : 'Minimizar';
    button.textContent = debugModeMinimized ? '□' : '−';
    button.title = action;
    button.setAttribute('aria-label', `${action} modo de depuração`);
  }
  requestAnimationFrame(() => {
    if (typeof syncBackupBannerNotificationOffset === 'function') syncBackupBannerNotificationOffset();
  });
}

function clearDebugEntries() {
  debugEntries.length = 0;
  renderDebugEntries();
}

function setDebugLevelFilter(level) {
  const allowedLevels = new Set(['all', 'error', 'warn', 'info', 'log', 'debug']);
  debugLevelFilter = allowedLevels.has(level) ? level : 'all';
  const select = document.getElementById('debugLevelFilter');
  if (select && select.value !== debugLevelFilter) select.value = debugLevelFilter;
  renderDebugEntries();
}

async function copyDebugText(text, successMessage) {
  if (!text) return;
  try {
    if (typeof copyToClipboard === 'function') await copyToClipboard(text);
    else await navigator.clipboard.writeText(text);
    if (typeof notify === 'function') notify(successMessage);
  } catch (_) {
    addDebugEntry('error', ['Não foi possível copiar o relatório de depuração.']);
  }
}

async function copyDebugEntries() {
  const text = getDebugEntriesText();
  await copyDebugText(text, 'Relatório de depuração copiado!');
}

function buildDebugReport() {
  const version = document.getElementById('appVersion')?.textContent.trim() || 'Blû';
  const filterLabels = {
    all: 'Todos', error: 'Erros', warn: 'Avisos', info: 'Informações', log: 'Logs', debug: 'Debug'
  };
  const header = [
    'RELATÓRIO DE DEPURAÇÃO — BLÛ',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    `Versão: ${version}`,
    `Origem: ${window.location.origin}`,
    `Navegador: ${navigator.userAgent}`,
    `Filtro: ${filterLabels[debugLevelFilter] || debugLevelFilter}`,
    `Eventos exibidos: ${getFilteredDebugEntries().length} de ${debugEntries.length}`,
    '—'.repeat(72)
  ].join('\n');
  return `${header}\n${getDebugEntriesText() || 'Nenhum evento registrado.'}\n`;
}

function saveDebugReport() {
  const report = buildDebugReport();
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.href = url;
  link.download = `blu-debug-${timestamp}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  if (typeof notify === 'function') notify('Relatório de depuração salvo!');
}

document.addEventListener('contextmenu', event => {
  const log = event.target.closest('#debugLog');
  if (!log || typeof openContextMenu !== 'function') return;
  event.preventDefault();

  const entryElement = event.target.closest('.debug-entry');
  const entry = entryElement ? debugEntryElements.get(entryElement) : null;
  const items = [];

  if (entry) {
    items.push(
      createContextMenuItem('Copiar mensagem', 'copy', () => copyDebugText(entry.message, 'Mensagem copiada!')),
      createContextMenuItem('Copiar registro completo', 'copy', () => copyDebugText(getDebugEntriesText([entry]), 'Registro copiado!')),
      createContextMenuSeparator(),
      createContextMenuItem(`Mostrar apenas ${entry.level.toUpperCase()}`, 'eye', () => setDebugLevelFilter(entry.level)),
      createContextMenuSeparator()
    );
  }

  items.push(
    createContextMenuItem('Copiar console', 'copy', copyDebugEntries, { disabled: !getFilteredDebugEntries().length }),
    createContextMenuItem('Salvar relatório como…', 'download', saveDebugReport),
    createContextMenuSeparator(),
    createContextMenuItem('Limpar console', 'trash_2', clearDebugEntries, { danger: true, disabled: !debugEntries.length })
  );

  openContextMenu(items, event.clientX, event.clientY, entryElement || log);
});

['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
  const original = console[level].bind(console);
  console[level] = (...values) => {
    original(...values);
    addDebugEntry(level, values);
  };
});

window.addEventListener('error', event => {
  const details = event.error
    ? formatDebugValue(event.error)
    : `${event.message} (${event.filename || 'origem desconhecida'}:${event.lineno || 0}:${event.colno || 0})`;
  addDebugEntry('error', [details]);
});

window.addEventListener('unhandledrejection', event => {
  addDebugEntry('error', ['Promise rejeitada:', event.reason]);
});
