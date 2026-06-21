// ==========================================================
// CRUD de botões, seções e tags + export/import
// ==========================================================

let currentSectionId = null;
let currentBtnId = null;

function openModal(id) {
  document.getElementById(id).classList.add('open');
  const input = document.querySelector(`#${id} input, #${id} textarea`);
  if (input) setTimeout(() => input.focus(), 50);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// --- Seções --------------------------------------------------

function saveSection() {
  const name = document.getElementById('sName').value.trim();
  if (!name) {
    notify('Informe o nome da seção', 'err');
    return;
  }

  pushHistory();
  renderSection({ id: 's' + Date.now(), name, collapsed: false, buttons: [] }, document.getElementById('sections'));
  closeModal('sectionModal');
  document.getElementById('sName').value = '';
  notify('Seção criada!');
  updateToggleSectionsBtnLabel();
  updateUnsavedChangesUI();
}

async function renameSection(sectionId) {
  const wrap = document.querySelector(`.section-wrap[data-id="${cssEscape(sectionId)}"]`);
  if (!wrap) return;

  const titleEl = wrap.querySelector('.section-title');
  const current = titleEl.textContent;
  const newName = await promptDialog('Novo nome da seção:', current, { title: '✏️ Renomear Seção' });
  if (newName === null || !newName.trim() || newName.trim() === current) return;

  pushHistory();
  titleEl.textContent = newName.trim();
  wrap.querySelector('.section-add-btn').title = `Adicionar botão em ${newName.trim()}`;
  notify('Seção renomeada!');
  doSearch();
  updateUnsavedChangesUI();
}

async function deleteSection(sectionId) {
  const wrap = document.querySelector(`.section-wrap[data-id="${cssEscape(sectionId)}"]`);
  if (!wrap) return;

  const count = wrap.querySelectorAll('.btn-wrap').length;
  const msg = count > 0
    ? `Esta seção contém ${count} botão(ões). Deseja excluir tudo mesmo assim?`
    : 'Excluir esta seção?';

  const ok = await confirmDialog(msg, { title: '🗑️ Excluir Seção', danger: true, confirmText: 'Excluir' });
  if (!ok) return;

  pushHistory();
  wrap.remove();
  notify('Seção removida!');
  updateToggleSectionsBtnLabel();
  updateUnsavedChangesUI();
}

// --- Botões ----------------------------------------------------

function openAddBtn(sectionId) {
  currentSectionId = sectionId;
  currentBtnId = null;
  document.getElementById('btnModalTitle').textContent = '➕ Novo Botão';
  document.getElementById('bName').value = '';
  document.getElementById('bText').value = '';
  document.getElementById('bTag').value = '';
  document.getElementById('bVis').value = 'other';
  openModal('btnModal');
}

function openEditBtn(sectionId, btnId) {
  currentSectionId = sectionId;
  currentBtnId = btnId;

  const wrap = document.querySelector(`.btn-wrap[data-id="${cssEscape(btnId)}"]`);
  if (!wrap) {
    notify('Botão não encontrado para edição', 'err');
    return;
  }

  const label = wrap.querySelector('.btn-label');
  document.getElementById('btnModalTitle').textContent = '✏️ Editar Botão';
  document.getElementById('bName').value = label ? label.textContent : '';
  document.getElementById('bText').value = wrap.dataset.text || '';
  document.getElementById('bTag').value = wrap.dataset.tag || '';
  document.getElementById('bVis').value = wrap.dataset.vis || 'other';
  openModal('btnModal');
}

function saveBtn() {
  const name = document.getElementById('bName').value.trim();
  const text = document.getElementById('bText').value.trim();
  const tag = document.getElementById('bTag').value.trim();
  const vis = document.getElementById('bVis').value || 'other';

  if (!name || !text) {
    notify('Preencha nome e texto', 'err');
    return;
  }

  if (!currentSectionId) {
    notify('Selecione uma seção antes de salvar o botão', 'err');
    return;
  }

  if (tag && !tags.includes(tag.toLowerCase())) {
    tags.push(tag.toLowerCase());
    updateTagDatalist();
  }

  const body = document.querySelector(`.section-body[data-section="${cssEscape(currentSectionId)}"]`);
  if (!body) {
    notify('Seção não encontrada', 'err');
    return;
  }

  pushHistory();

  const button = {
    id: currentBtnId || ('b' + Date.now()),
    name,
    text,
    tag,
    vis
  };

  if (currentBtnId) {
    const old = body.querySelector(`.btn-wrap[data-id="${cssEscape(currentBtnId)}"]`);
    if (!old) {
      notify('Botão original não encontrado', 'err');
      return;
    }
    old.replaceWith(createBtnEl(button, currentSectionId));
    notify('Botão atualizado!');
  } else {
    body.appendChild(createBtnEl(button, currentSectionId));
    notify('Botão adicionado!');
  }

  updateSectionCount(currentSectionId);
  closeModal('btnModal');
  doSearch();
  applyButtonReorderControls();
  updateUnsavedChangesUI();
}

async function deleteBtn(sectionId, btnId) {
  const target = document.querySelector(`.btn-wrap[data-id="${cssEscape(btnId)}"]`);
  if (!target) {
    notify('Botão não encontrado', 'err');
    return;
  }

  const ok = await confirmDialog('Remover este botão?', { title: '🗑️ Remover Botão', danger: true, confirmText: 'Remover' });
  if (!ok) return;

  pushHistory();
  target.remove();
  updateSectionCount(sectionId);
  notify('Botão removido!');
  doSearch();
  updateUnsavedChangesUI();
}

// --- Tags --------------------------------------------------

function renderTagList() {
  const list = document.getElementById('tagList');
  list.innerHTML = '';

  tags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${escapeHtml(tag)} <button onclick="removeTag('${String(tag).replace(/'/g, "\\'")}')" title="Remover tag">✕</button>`;
    list.appendChild(chip);
  });
}

function addTag() {
  const input = document.getElementById('newTagInput');
  const value = input.value.trim().toLowerCase();
  if (!value || tags.includes(value)) return;

  tags.push(value);
  renderTagList();
  updateTagDatalist();
  input.value = '';
  updateUnsavedChangesUI();
}

function removeTag(tag) {
  tags = tags.filter(currentTag => currentTag !== tag);

  document.querySelectorAll(`.btn-wrap[data-tag="${cssEscape(tag)}"]`).forEach(button => {
    button.dataset.tag = '';
  });

  renderTagList();
  updateTagDatalist();
  notify(`Tag "${tag}" removida`);
  doSearch();
  updateUnsavedChangesUI();
}

function updateTagDatalist() {
  const dataList = document.getElementById('tagOptions');
  dataList.innerHTML = tags.map(tag => `<option value="${escapeHtmlAttr(tag)}">`).join('');
  renderTagList();
}

// --- Export / Import --------------------------------------

function exportData() {
  const state = collectState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const exportDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const exportTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  link.href = url;
  link.download = `blu_data-${exportDate}-${exportTime}.json`;
  link.click();
  URL.revokeObjectURL(url);
  markCurrentStateAsExported();
  notify('Exportado!');
}

function normalizeImportedData(parsed) {
  const base = {
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(tag => String(tag).toLowerCase()) : [],
    sections: []
  };

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
          tag: sanitizeText(button.tag || ''),
          vis: ['public', 'private', 'other'].includes(button.vis) ? button.vis : 'other'
        }))
      : []
  }));

  return base;
}

function triggerImportFilePicker() {
  document.getElementById('importFileInput').click();
}

function setImportFileMeta(message, isError = false) {
  const meta = document.getElementById('importFileMeta');
  if (!meta) return;
  meta.textContent = message;
  meta.style.color = isError ? 'var(--red)' : 'var(--text2)';
}

function clearImportSource() {
  const input = document.getElementById('importFileInput');
  const textarea = document.getElementById('importJson');
  if (input) input.value = '';
  if (textarea) textarea.value = '';
  setImportFileMeta('Nenhum arquivo carregado.');
}

async function handleImportFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const allowed = ['application/json', 'text/plain', ''];
  const isSupportedExt = /\.(json|txt)$/i.test(file.name);
  if (!isSupportedExt && !allowed.includes(file.type)) {
    setImportFileMeta('Formato não suportado. Use um arquivo .json ou .txt.', true);
    notify('Formato não suportado. Use .json ou .txt', 'err');
    event.target.value = '';
    return;
  }

  try {
    const raw = await file.text();
    const textarea = document.getElementById('importJson');

    let finalText = raw;
    try {
      const parsed = JSON.parse(raw);
      finalText = JSON.stringify(parsed, null, 2);
    } catch (_) {
      // Mantém o conteúdo bruto para revisão manual antes de importar.
    }

    textarea.value = finalText;
    const sizeKb = (file.size / 1024).toFixed(file.size >= 1024 ? 1 : 0);
    setImportFileMeta(`Arquivo carregado: ${file.name} (${sizeKb} KB)`);
    notify('Arquivo carregado na área de importação');
  } catch (error) {
    console.error('Erro ao ler arquivo:', error);
    setImportFileMeta('Não foi possível ler o arquivo selecionado.', true);
    notify('Erro ao ler arquivo', 'err');
  }
}

async function importData() {
  const raw = document.getElementById('importJson').value.trim();
  if (!raw) {
    notify('Cole o JSON primeiro', 'err');
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.sections && !parsed.categories) throw new Error('Formato inválido: esperado "sections" ou "categories"');

    const ok = await confirmDialog('Isso substituirá todos os dados atuais. Continuar?', { title: '📥 Importar JSON', danger: true, confirmText: 'Importar' });
    if (!ok) return;

    pushHistory();
    restoreState(normalizeImportedData(parsed));
    markCurrentStateAsExported();
    closeModal('importModal');
    clearImportSource();
    notify('Importado com sucesso!');
  } catch (error) {
    notify('JSON inválido: ' + error.message, 'err');
  }
}

async function clearAll() {
  const ok = await confirmDialog('Limpar TODOS os dados? Esta ação não pode ser desfeita.', { title: '🗑️ Limpar Tudo', danger: true, confirmText: 'Limpar tudo' });
  if (!ok) return;

  pushHistory();
  restoreState({ tags: [], sections: [] });
  notify('Tudo limpo!');
  updateUnsavedChangesUI();

  // Remove o registro salvo (não localStorage.clear(), que ignora o
  // argumento e apagaria TUDO, inclusive preferências como o tema).
  // Assim, num próximo F5 sem nada ter sido adicionado, o demo volta.
  try { localStorage.clear(); } catch (_) {}
}
  