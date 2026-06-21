// ==========================================================
// Renderização de seções e botões
// ==========================================================

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
  wrap.dataset.tag = normalizeSearchText(button.tag);
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
  copyBtn.title = vis === 'private'
    ? `🔒 Privado\n\n${wrap.dataset.text || ''}`
    : (wrap.dataset.text || '');
  copyBtn.innerHTML = `${visIcon ? `<span>${visIcon}</span>` : ''}<span class="btn-label">${escapeHtml(button.name || '')}</span>`;
  copyBtn.onclick = () => doCopy(wrap.dataset.text || '', copyBtn);

  let tipTimer;
  copyBtn.addEventListener('mouseenter', () => {
    tipTimer = setTimeout(() => copyBtn.classList.add('show-tip'), 700);
  });
  copyBtn.addEventListener('mouseleave', () => {
    clearTimeout(tipTimer);
    copyBtn.classList.remove('show-tip');
  });

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
  const originalHTML = btn.innerHTML;
  const originalDisabled = btn.disabled;

  try {
    btn.disabled = true;
    await copyToClipboard(text);
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
