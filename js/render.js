// ==========================================================
// Renderização de seções e botões
// ==========================================================

let textPreviewEnabled = true;
let textPreviewEl = null;
let textPreviewTimer = null;
let textPreviewSource = null;

function updateTextPreviewButtonUI() {
  const button = document.getElementById('textPreviewBtn');
  if (!button) return;
  button.classList.toggle('active', textPreviewEnabled);
  button.querySelector('.menu-btn-label').textContent = `Prévia de Texto: ${textPreviewEnabled ? 'ON' : 'OFF'}`;
}

function getCopyButtonTitle(button) {
  const wrap = button.closest('.btn-wrap');
  const text = wrap?.dataset.text || '';
  if (!text) return '';
  return wrap?.dataset.vis === 'private' ? `🔒 Privado\n\n${text}` : text;
}

function syncCopyButtonTitles() {
  document.querySelectorAll('.copy-btn').forEach(button => {
    if (textPreviewEnabled) {
      button.removeAttribute('title');
    } else {
      const title = getCopyButtonTitle(button);
      if (title) button.title = title;
      else button.removeAttribute('title');
    }
  });
}

function applyTextPreviewState(enabled, persist = false) {
  textPreviewEnabled = !!enabled;
  updateTextPreviewButtonUI();
  syncCopyButtonTitles();
  if (!textPreviewEnabled) hideButtonPreview();

  if (persist) {
    setSetting('textPreview', textPreviewEnabled ? 'on' : 'off');
  }
}

function initTextPreviewPreference() {
  const stored = getSetting('textPreview');
  applyTextPreviewState(stored !== 'off');
}

function toggleTextPreview() {
  applyTextPreviewState(!textPreviewEnabled, true);
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

window.addEventListener('scroll', hideButtonPreview, true);
window.addEventListener('resize', hideButtonPreview);
document.addEventListener('pointerdown', event => {
  if (textPreviewEl?.classList.contains('show') && !event.target.closest('.copy-btn')) {
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
  wrap.draggable = editMode;

  const vis = wrap.dataset.vis;
  const visIcon = vis === 'public' ? '🌎' : vis === 'private' ? '🔒' : '';
  const visClass = `vis-${vis}`;

  const copyBtn = document.createElement('button');
  copyBtn.className = `copy-btn ${visClass}`;
  copyBtn.dataset.preview = vis === 'private'
    ? `🔒 Privado\n\n${previewText(wrap.dataset.text)}`
    : previewText(wrap.dataset.text);
  if (!textPreviewEnabled && wrap.dataset.text) {
    copyBtn.title = vis === 'private' ? `🔒 Privado\n\n${wrap.dataset.text}` : wrap.dataset.text;
  }
  copyBtn.innerHTML = `${visIcon ? `<span>${visIcon}</span>` : ''}<span class="btn-label">${escapeHtml(button.name || '')}</span>`;
  copyBtn.onclick = () => doCopy(wrap.dataset.text || '', copyBtn);

  copyBtn.addEventListener('mouseenter', () => {
    if (!textPreviewEnabled) return;
    hideButtonPreview();
    textPreviewSource = copyBtn;
    textPreviewTimer = setTimeout(() => {
      if (textPreviewSource === copyBtn) showButtonPreview(copyBtn);
    }, 700);
  });
  copyBtn.addEventListener('mouseleave', () => {
    hideButtonPreview();
  });

  let touchPreviewStart = null;
  let touchPreviewShown = false;
  copyBtn.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || editMode || !textPreviewEnabled) return;
    touchPreviewShown = false;
    touchPreviewStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    clearTimeout(textPreviewTimer);
    textPreviewTimer = setTimeout(() => {
      if (!touchPreviewStart || touchPreviewStart.id !== event.pointerId) return;
      textPreviewSource = copyBtn;
      touchPreviewShown = true;
      showButtonPreview(copyBtn, true);
    }, 450);
  });
  copyBtn.addEventListener('pointermove', event => {
    if (!touchPreviewStart || touchPreviewStart.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - touchPreviewStart.x, event.clientY - touchPreviewStart.y) > 10) {
      touchPreviewStart = null;
      clearTimeout(textPreviewTimer);
    }
  });
  copyBtn.addEventListener('pointerup', event => {
    if (touchPreviewStart?.id === event.pointerId) touchPreviewStart = null;
    clearTimeout(textPreviewTimer);
  });
  copyBtn.addEventListener('pointercancel', () => {
    touchPreviewStart = null;
    touchPreviewShown = false;
    hideButtonPreview();
  });
  copyBtn.addEventListener('click', event => {
    if (!touchPreviewShown) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    touchPreviewShown = false;
  }, true);

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
    notify('Erro ao copiar. Verifique se a página está em HTTPS ou localhost.', 'err');
  }
}

async function copyToClipboard(text) {
  if (!text) throw new Error('Texto vazio para cópia');

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    mobileHaptic('tap');
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, textArea.value.length);

  const success = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!success) throw new Error('Não foi possível copiar o texto');
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
  button.querySelector('.menu-btn-label').textContent = hasCollapsed ? 'Expandir Categorias' : 'Minimizar Categorias';
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
  notify(hasCollapsed ? 'Categorias expandidas' : 'Categorias minimizadas');
}
