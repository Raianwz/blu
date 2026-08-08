// ==========================================================
// Modo de depuração — console visível dentro do Blû
// ==========================================================

const DEBUG_MAX_ENTRIES = 200;
const debugEntries = [];
let debugModeEnabled = false;

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

function getDebugEntriesText() {
  return debugEntries
    .map(entry => `[${entry.time}] ${entry.level.toUpperCase()} ${entry.message}`)
    .join('\n');
}

function renderDebugEntry(entry) {
  const log = document.getElementById('debugLog');
  if (!log) return;

  const empty = log.querySelector('.debug-empty');
  if (empty) empty.remove();

  const line = document.createElement('div');
  line.className = `debug-entry debug-${entry.level}`;
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
  count.textContent = `${debugEntries.length} ${debugEntries.length === 1 ? 'evento' : 'eventos'} nesta sessão`;
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

  if (button) {
    button.classList.toggle('active', debugModeEnabled);
    const label = button.querySelector('.menu-btn-label');
    if (label) label.textContent = `Modo de Depuração: ${debugModeEnabled ? 'ON' : 'OFF'}`;
  }
  if (debugModeEnabled) renderDebugEntries();
}

function toggleDebugMode() {
  setDebugMode(!debugModeEnabled);
}

function clearDebugEntries() {
  debugEntries.length = 0;
  renderDebugEntries();
}

async function copyDebugEntries() {
  const text = getDebugEntriesText();
  if (!text) return;
  try {
    if (typeof copyToClipboard === 'function') await copyToClipboard(text);
    else await navigator.clipboard.writeText(text);
    if (typeof notify === 'function') notify('Relatório de depuração copiado!');
  } catch (_) {
    addDebugEntry('error', ['Não foi possível copiar o relatório de depuração.']);
  }
}

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
