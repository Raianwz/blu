// ==========================================================
// Utilitários gerais (sanitização, formatação, notificações)
// ==========================================================

function sanitizeText(value) {
  return String(value ?? '');
}

function normalizeSearchText(value) {
  return sanitizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Forma canônica usada para armazenar e comparar tags. Além de ignorar
// maiúsculas e acentos, evita tags duplicadas causadas por espaços extras.
function normalizeTag(value) {
  return normalizeSearchText(value).replace(/\s+/g, ' ');
}

function previewText(text, max = 220) {
  const clean = sanitizeText(text).trim();
  if (!clean) return '';
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replace(/\n/g, '&#10;');
}

function cssEscape(value) {
  if (window.CSS && CSS.escape) return CSS.escape(String(value));
  return String(value).replace(/(["\\.#:[\]()=+*~>^$| ])/g, '\\$1');
}

function isTypingField(element) {
  if (!element) return false;
  const tag = element.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable;
}

function notify(msg, type = 'ok') {
  const area = document.getElementById('notifArea');
  const element = document.createElement('div');
  element.className = 'notif' + (type === 'err' ? ' err' : '');
  element.textContent = msg;
  area.appendChild(element);
  setTimeout(() => element.remove(), 3000);
}
const ICONS = {
  copy: `<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /> <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />`,
  copy_plus: `<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /> <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /> <path d="M15 15h6" /> <path d="M18 12v6" />`,
  eye: `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /> <circle cx="12" cy="12" r="3" />`,
  arrow_up: `<path d="m18 15-6-6-6 6" />`,
  arrow_down: `<path d="m6 9 6 6 6-6" />`,
  pencil: `<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /> <path d="m15 5 4 4" />`,
  folder_plus: `<path d="M12 10v6" /> <path d="M9 13h6" /> <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />`,
  tag: `<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /> <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />`,
  download: `<path d="M12 15V3" /> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /> <path d="m7 10 5 5 5-5" />`,
  upload: `<path d="M12 3v12" /> <path d="m17 8-5-5-5 5" /> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />`,
  unfold_vertical: `<path d="M12 22v-6" /> <path d="M12 8V2" /> <path d="M4 12H2" /> <path d="M10 12H8" /> <path d="M16 12h-2" /> <path d="M22 12h-2" /> <path d="m15 19-3 3-3-3" /> <path d="m15 5-3-3-3 3" />`,
  fold_vertical: `<path d="M12 22v-6" /> <path d="M12 8V2" /> <path d="M4 12H2" /> <path d="M10 12H8" /> <path d="M16 12h-2" /> <path d="M22 12h-2" /> <path d="m15 19-3-3-3 3" /> <path d="m15 5-3 3-3-3" />`,
  moon: `<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />`,
  sun: `<circle cx="12" cy="12" r="4" /> <path d="M12 2v2" /> <path d="M12 20v2" /> <path d="m4.93 4.93 1.41 1.41" /> <path d="m17.66 17.66 1.41 1.41" /> <path d="M2 12h2" /> <path d="M20 12h2" /> <path d="m6.34 17.66-1.41 1.41" /> <path d="m19.07 4.93-1.41 1.41" />`,
  keyboard: `<path d="M10 8h.01" /> <path d="M12 12h.01" /> <path d="M14 8h.01" /> <path d="M16 12h.01" /> <path d="M18 8h.01" /> <path d="M6 8h.01" /> <path d="M7 16h10" /> <path d="M8 12h.01" /> <rect width="20" height="16" x="2" y="4" rx="2" />`,
  external_link: `<path d="M15 3h6v6" /> <path d="M10 14 21 3" /> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />`,
  app_window: `<rect x="2" y="4" width="20" height="16" rx="2" /> <path d="M10 4v4" /> <path d="M2 8h20" /> <path d="M6 4v4" />`,
  trash_2: `<path d="M10 11v6" /> <path d="M14 11v6" /> <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /> <path d="M3 6h18" /> <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />`,
  lock: `<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /> <path d="M7 11V7a5 5 0 0 1 10 0v4" />`,
  share: `<circle cx="18" cy="5" r="3" /> <circle cx="6" cy="12" r="3" /> <circle cx="18" cy="19" r="3" /> <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /> <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />`,
  chevron_down: `<path d="m6 9 6 6 6-6" />`,
  palette: `<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /> <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /> <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /> <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /> <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />`,
  wrench: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" />`,
  target: `<circle cx="12" cy="12" r="10" /> <circle cx="12" cy="12" r="6" /> <circle cx="12" cy="12" r="2" />`,
  file_check: `<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /> <path d="M14 2v5a1 1 0 0 0 1 1h5" /> <path d="m9 15 2 2 4-4" />`,
  menu: `<path d="M4 5h16" /> <path d="M4 12h16" /> <path d="M4 19h16" />`,
  search: `<path d="m21 21-4.34-4.34" /> <circle cx="11" cy="11" r="8" />`,
};

function iconSvg(name, extraClass = '') {
  const inner = ICONS[name] || '';
  return `<svg class="menu-icon ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function setIcon(wrapEl, name) {
  if (!wrapEl) return;
  wrapEl.innerHTML = iconSvg(name);
}

// Normaliza um JSON importado (do fluxo normal de Importar ou de um link
// de compartilhamento) para o formato interno { tags, sections }. Vive em
// utils.js (em vez de crud.js) para poder ser reaproveitada também pela
// página share.html, que não carrega o restante do app.
function normalizeImportedData(parsed) {
  const normalizedTags = [];
  const addNormalizedTag = value => {
    const tag = normalizeTag(value);
    if (tag && !normalizedTags.includes(tag)) normalizedTags.push(tag);
    return tag;
  };

  const base = {
    tags: normalizedTags,
    sections: []
  };

  if (Array.isArray(parsed.tags)) parsed.tags.forEach(addNormalizedTag);

  const sourceSections = Array.isArray(parsed.sections)
    ? parsed.sections
    : Array.isArray(parsed.categories)
      ? parsed.categories.map(category => ({
          id: category.id,
          name: `${sanitizeText(category.icon).trim()} ${sanitizeText(category.name).trim()}`.trim(),
          collapsed: !!category.collapsed,
          buttons: Array.isArray(category.buttons)
            ? category.buttons.map(button => ({
                id: button.id,
                name: button.name ?? button.btnName ?? '',
                text: button.text ?? '',
                tag: button.tag ?? '',
                vis: button.vis ?? 'other'
              }))
            : []
        }))
      : [];

  base.sections = sourceSections.map((section, sectionIndex) => ({
    id: String(section.id || ('s' + Date.now() + sectionIndex)),
    name: sanitizeText(section.name || `Seção ${sectionIndex + 1}`),
    collapsed: !!section.collapsed,
    buttons: Array.isArray(section.buttons)
      ? section.buttons.map((button, buttonIndex) => ({
          id: String(button.id || ('b' + Date.now() + buttonIndex)),
          name: sanitizeText(button.name ?? button.btnName ?? ''),
          text: sanitizeText(button.text),
          tag: addNormalizedTag(button.tag || ''),
          vis: ['public', 'private', 'other'].includes(button.vis) ? button.vis : 'other'
        }))
      : []
  }));

  normalizedTags.sort((left, right) => left.localeCompare(right, 'pt-BR', {
    sensitivity: 'base',
    numeric: true
  }));

  return base;
}
