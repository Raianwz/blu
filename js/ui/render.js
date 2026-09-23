// ==========================================================
// Renderização de seções e botões
// ==========================================================

function applyButtonVisualPreference() {
  const modern = getSetting('buttonVisual') === 'new';
  document.body.classList.toggle('button-visual-new', modern);
  const button = document.getElementById('buttonVisualBtn');
  if (!button) return;
  button.classList.toggle('active', modern);
  button.setAttribute('aria-pressed', String(modern));
  button.querySelector('.menu-btn-label').textContent = `Visual dos Botões: ${modern ? 'Novo' : 'Clássico'}`;
}

function toggleButtonVisualPreference() {
  setSetting('buttonVisual', getSetting('buttonVisual') === 'new' ? 'classic' : 'new');
  applyButtonVisualPreference();
}

function buttonVisibilityMarkup(visibility, customVis) {
  if (visibility === 'other') return customButtonIconMarkup(normalizeCustomVis(customVis).icon, 'button-visibility-svg');
  if (visibility !== 'public' && visibility !== 'private') return '';
  const emoji = visibility === 'public' ? '🌎' : '🔒';
  const paths = BLU_LUCIDE_ICONS[visibility === 'public' ? 'globe' : 'lock-keyhole'];
  // Temporary comparison: Bootstrap Icons globe-americas (local SVG source).
  // Keep the Lucide globe available while evaluating the public indicator.
  if (visibility === 'public') {
    const earthPath = 'M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484q-.121.12-.242.234c-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z';
    return `<span class="button-visibility" role="img" aria-label="Público"><span class="button-visibility-emoji" aria-hidden="true">${emoji}</span><svg class="button-visibility-svg bi bi-globe-americas" viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true"><path d="${earthPath}"/></svg></span>`;
  }
  return `<span class="button-visibility" role="img" aria-label="${visibility === 'public' ? 'Público' : 'Privado'}"><span class="button-visibility-emoji" aria-hidden="true">${emoji}</span><svg class="button-visibility-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg></span>`;
}

let textPreviewMode = 'floating';
let textPreviewEnabled = true;
let textPreviewEl = null;
let textPreviewTimer = null;
let textPreviewSource = null;

function updateTextPreviewButtonUI() {
  const button = document.getElementById('textPreviewBtn');
  if (!button) return;
  const labels = { floating: 'Flutuante', native: 'Nativa', off: 'OFF' };
  const descriptions = {
    floating: 'Mostra uma prévia flutuante ao passar o mouse ou tocar e segurar',
    native: 'Usa a dica de texto nativa do navegador',
    off: 'Não mostra o texto antes da cópia'
  };
  button.classList.toggle('active', textPreviewMode !== 'off');
  button.setAttribute('aria-label', `Prévia dos textos: ${labels[textPreviewMode]}`);
  button.title = `${descriptions[textPreviewMode]}. Clique para alterar.`;
  button.querySelector('.menu-btn-label').textContent = `Prévia de Texto: ${labels[textPreviewMode]}`;
}

function getCopyButtonTitle(button) {
  const wrap = button.closest('.btn-wrap');
  const text = button.dataset.fullText || wrap?.dataset.text || '';
  if (!text) return '';
  const visibility = button.dataset.vis || wrap?.dataset.vis;
  return visibility === 'private' ? `🔒 Privado\n\n${text}` : text;
}

function syncCopyButtonTitles() {
  document.querySelectorAll('.copy-btn, .favorite-card-copy').forEach(button => {
    if (textPreviewMode === 'native') {
      const title = getCopyButtonTitle(button);
      if (title) button.title = title;
      else button.removeAttribute('title');
    } else button.removeAttribute('title');
  });
}

function applyTextPreviewState(mode, persist = false) {
  if (mode === true) mode = 'floating';
  if (mode === false) mode = 'native';
  textPreviewMode = ['floating', 'native', 'off'].includes(mode) ? mode : 'floating';
  textPreviewEnabled = textPreviewMode === 'floating';
  updateTextPreviewButtonUI();
  syncCopyButtonTitles();
  if (!textPreviewEnabled) hideButtonPreview();

  if (persist) {
    setSetting('textPreview', textPreviewMode);
  }
}

function initTextPreviewPreference() {
  const stored = getSetting('textPreview');
  const migratedMode = stored === 'on' ? 'floating' : stored === 'off' ? 'native' : stored;
  applyTextPreviewState(migratedMode);
}

function toggleTextPreview() {
  const modes = ['floating', 'native', 'off'];
  applyTextPreviewState(modes[(modes.indexOf(textPreviewMode) + 1) % modes.length], true);
}

function getTextPreviewEl() {
  if (textPreviewEl) return textPreviewEl;
  textPreviewEl = document.createElement('div');
  textPreviewEl.id = 'buttonPreviewTooltip';
  textPreviewEl.setAttribute('role', 'tooltip');
  document.body.appendChild(textPreviewEl);
  return textPreviewEl;
}

function showButtonPreview(button, force = false) {
  if (
    !textPreviewEnabled
    || !button.isConnected
    || (!force && !button.matches(':hover'))
    || !button.dataset.preview
    || button.closest('.search-hidden')
    || document.querySelector('.btn-wrap.dragging')
  ) return;

  const tooltip = getTextPreviewEl();
  tooltip.textContent = button.dataset.preview;
  tooltip.classList.add('show');

  const buttonRect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 8;
  const centeredLeft = buttonRect.left + (buttonRect.width - tooltipRect.width) / 2;
  const maxLeft = Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding);
  const left = Math.min(Math.max(centeredLeft, viewportPadding), maxLeft);
  const preferredTop = buttonRect.top >= tooltipRect.height + gap + viewportPadding
    ? buttonRect.top - tooltipRect.height - gap
    : buttonRect.bottom + gap;
  const topbarBottom = document.getElementById('topbar')?.getBoundingClientRect().bottom || 0;
  const debugPanel = document.getElementById('debugPanel');
  const viewportBottom = debugPanel && !debugPanel.hidden
    ? debugPanel.getBoundingClientRect().top
    : window.innerHeight;
  const minTop = topbarBottom + viewportPadding;
  const maxTop = Math.max(minTop, viewportBottom - tooltipRect.height - viewportPadding);
  const top = Math.min(Math.max(preferredTop, minTop), maxTop);

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function hideButtonPreview() {
  clearTimeout(textPreviewTimer);
  textPreviewTimer = null;
  textPreviewSource = null;
  textPreviewEl?.classList.remove('show');
}

function bindButtonTextPreview(button, text, visibility = 'other') {
  button.dataset.fullText = text || '';
  button.dataset.vis = visibility;
  button.dataset.preview = visibility === 'private'
    ? `🔒 Privado\n\n${previewText(text)}`
    : previewText(text);

  if (textPreviewMode === 'native') {
    const title = getCopyButtonTitle(button);
    if (title) button.title = title;
  }

  button.addEventListener('mouseenter', () => {
    if (!textPreviewEnabled) return;
    hideButtonPreview();
    textPreviewSource = button;
    textPreviewTimer = setTimeout(() => {
      if (textPreviewSource === button) showButtonPreview(button);
    }, 700);
  });
  button.addEventListener('mouseleave', hideButtonPreview);

  let touchPreviewStart = null;
  let touchPreviewShown = false;
  button.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || editMode || !textPreviewEnabled) return;
    touchPreviewShown = false;
    touchPreviewStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    clearTimeout(textPreviewTimer);
    textPreviewTimer = setTimeout(() => {
      if (!touchPreviewStart || touchPreviewStart.id !== event.pointerId) return;
      textPreviewSource = button;
      touchPreviewShown = true;
      showButtonPreview(button, true);
    }, 450);
  });
  button.addEventListener('pointermove', event => {
    if (!touchPreviewStart || touchPreviewStart.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - touchPreviewStart.x, event.clientY - touchPreviewStart.y) > 10) {
      touchPreviewStart = null;
      clearTimeout(textPreviewTimer);
    }
  });
  button.addEventListener('pointerup', event => {
    if (touchPreviewStart?.id === event.pointerId) touchPreviewStart = null;
    clearTimeout(textPreviewTimer);
  });
  button.addEventListener('pointercancel', () => {
    touchPreviewStart = null;
    touchPreviewShown = false;
    hideButtonPreview();
  });
  button.addEventListener('click', event => {
    if (!touchPreviewShown) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    touchPreviewShown = false;
  }, true);
}

window.addEventListener('scroll', hideButtonPreview, true);
window.addEventListener('resize', hideButtonPreview);
document.addEventListener('pointerdown', event => {
  if (textPreviewEl?.classList.contains('show') && !event.target.closest('.copy-btn, .favorite-card-copy')) {
    hideButtonPreview();
  }
}, true);

function renderAll(sectionsData) {
  const container = document.getElementById('sections');
  container.innerHTML = '';
  sectionsData.forEach(section => renderSection(section, container));
  updateToggleSectionsBtnLabel();
  applyButtonReorderControls();
}

function renderSection(section, container) {
  const wrap = document.createElement('div');
  wrap.className = 'section-wrap' + (section.collapsed ? ' collapsed' : '');
  wrap.dataset.id = String(section.id);

  const count = Array.isArray(section.buttons) ? section.buttons.length : 0;
  const safeSectionId = String(section.id).replace(/'/g, "\\'");

  wrap.innerHTML = `
    <div class="section-head">
      <button class="section-collapse-btn" onclick="toggleCollapse(this)" title="${section.collapsed ? 'Expandir' : 'Recolher'}">▾</button>
      <button class="section-add-btn" onclick="openAddBtn('${safeSectionId}')" title="Adicionar botão em ${escapeHtmlAttr(section.name)}">＋</button>
      <span class="section-title">${escapeHtml(section.name)}</span>
      <span class="section-count" title="${count} botão(ões)">${count}</span>
      <button class="section-rename-btn" onclick="renameSection('${safeSectionId}')" title="Renomear seção">✏️</button>
      <button class="section-del-btn" onclick="deleteSection('${safeSectionId}')" title="Excluir seção">🗑️</button>
      <div class="section-move-controls">
        <button onclick="moveSectionUp(this)" title="Mover seção para cima">⬆️</button>
        <button onclick="moveSectionDown(this)" title="Mover seção para baixo">⬇️</button>
      </div>
    </div>
    <div class="section-body" data-section="${escapeHtmlAttr(String(section.id))}"></div>
  `;

  const body = wrap.querySelector('.section-body');
  (section.buttons || []).forEach(button => body.appendChild(createBtnEl(button, String(section.id))));
  setupDrop(body);
  container.appendChild(wrap);
  return wrap;
}

function createBtnEl(button, sectionId) {
  const wrap = document.createElement('div');
  wrap.className = 'btn-wrap';
  wrap.dataset.id = String(button.id || ('b' + Date.now()));
  wrap.dataset.name = normalizeSearchText(button.name);
  wrap.dataset.tag = normalizeTag(button.tag);
  wrap.dataset.text = sanitizeText(button.text);
  wrap.dataset.vis = sanitizeText(button.vis || 'other') || 'other';
  if (wrap.dataset.vis === 'other') wrap.dataset.customVis = JSON.stringify(normalizeCustomVis(button.customVis));
  wrap.draggable = editMode;

  const vis = wrap.dataset.vis;
  const visClass = `vis-${vis}`;

  const copyBtn = document.createElement('button');
  copyBtn.className = `copy-btn ${visClass}`;
  copyBtn.innerHTML = `${buttonVisibilityMarkup(vis, button.customVis)}<span class="btn-label">${escapeHtml(button.name || '')}</span>`;
  copyBtn.onclick = () => doCopy(wrap.dataset.text || '', copyBtn);
  bindButtonTextPreview(copyBtn, wrap.dataset.text, vis);

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-edit';
  editBtn.title = 'Editar botão';
  editBtn.innerHTML = '✏️';
  editBtn.onclick = event => {
    event.stopPropagation();
    openEditBtn(sectionId, wrap.dataset.id);
  };

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-del';
  delBtn.title = 'Remover botão';
  delBtn.textContent = '✕';
  delBtn.onclick = event => {
    event.stopPropagation();
    deleteBtn(sectionId, wrap.dataset.id);
  };

  blockDragFromChild(copyBtn);
  blockDragFromChild(editBtn);
  blockDragFromChild(delBtn);

  wrap.append(copyBtn, editBtn, delBtn);
  wrap.addEventListener('dragstart', onDragStart);
  wrap.addEventListener('dragend', onDragEnd);
  return wrap;
}

function blockDragFromChild(el) {
  ['mousedown', 'pointerdown', 'touchstart', 'dragstart'].forEach(evt => {
    el.addEventListener(evt, event => {
      event.stopPropagation();
      if (evt === 'dragstart') event.preventDefault();
    });
  });
}

function updateSectionCount(sectionId) {
  const wrap = document.querySelector(`.section-wrap[data-id="${cssEscape(sectionId)}"]`);
  if (!wrap) return;
  wrap.querySelector('.section-count').textContent = wrap.querySelectorAll('.btn-wrap').length;
}

async function doCopy(text, btn) {
  hideButtonPreview();
  const originalHTML = btn.innerHTML;
  const originalDisabled = btn.disabled;

  try {
    btn.disabled = true;
    await copyToClipboard(text);
    recordButtonCopy(btn.closest('.btn-wrap')?.dataset.id);
    btn.innerHTML = '✓ Copiado!';
    btn.classList.add('copied');
    notify('Copiado!');

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
      btn.disabled = originalDisabled;
    }, 1500);
  } catch (err) {
    console.error('Erro ao copiar:', err);
    btn.disabled = originalDisabled;
    notify('Não foi possível copiar. Ative esta janela e tente novamente.', 'err');
  }
}

async function copyToClipboard(text) {
  if (!text) throw new Error('Texto vazio para cópia');

  let clipboardError = null;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      mobileHaptic('tap');
      return;
    } catch (error) {
      clipboardError = error;
      console.warn('Clipboard API falhou; tentando método alternativo.', {
        name: error?.name || 'Error',
        message: error?.message || String(error),
        documentFocused: document.hasFocus(),
        visibilityState: document.visibilityState,
        windowName: window.name || 'main'
      });
    }
  }

  const previouslyFocused = document.activeElement;
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';

  let success = false;
  let fallbackError = null;
  try {
    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    success = document.execCommand('copy');
  } catch (error) {
    fallbackError = error;
  } finally {
    textArea.remove();
    if (previouslyFocused?.isConnected && !previouslyFocused.disabled && typeof previouslyFocused.focus === 'function') {
      try {
        previouslyFocused.focus({ preventScroll: true });
      } catch (_) {
        previouslyFocused.focus();
      }
    }
  }

  if (!success) throw clipboardError || fallbackError || new Error('Não foi possível copiar o texto');
  mobileHaptic('tap');
}

// --- Expandir/recolher seções -------------------------------

function getVisibleSections() {
  return [...document.querySelectorAll('.section-wrap')]
    .filter(section => !section.classList.contains('search-hidden'));
}

function setSectionCollapsed(section, collapsed) {
  section.classList.toggle('collapsed', collapsed);
  const button = section.querySelector('.section-collapse-btn');
  if (button) button.title = collapsed ? 'Expandir' : 'Recolher';
}

function toggleCollapse(btn) {
  const wrap = btn.closest('.section-wrap');
  const isCollapsed = wrap.classList.toggle('collapsed');
  btn.title = isCollapsed ? 'Expandir' : 'Recolher';
  wrap.querySelector('.section-count').textContent = wrap.querySelectorAll('.btn-wrap').length;
  updateToggleSectionsBtnLabel();
  persistState();
}

function updateToggleSectionsBtnLabel() {
  const button = document.getElementById('toggleSectionsBtn');
  if (!button) return;

  const visibleSections = getVisibleSections();
  const targetSections = visibleSections.length
    ? visibleSections
    : [...document.querySelectorAll('.section-wrap')];

  const hasCollapsed = targetSections.some(section => section.classList.contains('collapsed'));
  const icon = button.querySelector('.menu-icon');
  if (icon) icon.innerHTML = ICONS[hasCollapsed ? 'unfold_vertical' : 'fold_vertical'];
  button.querySelector('.menu-btn-label').textContent = hasCollapsed ? 'Expandir Seções' : 'Minimizar Seções';
}

function toggleAllSections() {
  const visibleSections = getVisibleSections();
  const targetSections = visibleSections.length
    ? visibleSections
    : [...document.querySelectorAll('.section-wrap')];

  if (!targetSections.length) return;

  const hasCollapsed = targetSections.some(section => section.classList.contains('collapsed'));
  targetSections.forEach(section => setSectionCollapsed(section, !hasCollapsed));

  updateToggleSectionsBtnLabel();
  persistState();
  notify(hasCollapsed ? 'Seções expandidas' : 'Seções minimizadas');
}
