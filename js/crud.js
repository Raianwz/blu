// ==========================================================
// CRUD de botões, seções e tags + export/import
// ==========================================================

let currentSectionId = null;
let currentBtnId = null;

// Criptografia do export: controlada via atalho Alt+C (não há mais
// checkbox no menu — o estado liga/desliga e reflete como um pequeno
// cadeado no botão Exportar).
let encryptExportEnabled = false;

function setExportEncryption(enabled) {
  encryptExportEnabled = enabled;
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.classList.toggle('encryption-on', enabled);
}

function toggleExportEncryption() {
  setExportEncryption(!encryptExportEnabled);
  notify(encryptExportEnabled ? '🔒 Criptografia ativada para o próximo export' : 'Criptografia desativada');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');

  if (id === 'tagModal') {
    const filterInput = document.getElementById('tagFilterInput');
    if (filterInput) filterInput.value = '';
    renderTagList();
  }

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

  const affectedTags = new Set(
    [...wrap.querySelectorAll('.btn-wrap')]
      .map(button => button.dataset.tag)
      .filter(Boolean)
  );

  pushHistory();
  wrap.remove();
  affectedTags.forEach(removeTagIfOrphan);
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
    const oldTag = old.dataset.tag;
    old.replaceWith(createBtnEl(button, currentSectionId));
    if (oldTag && oldTag !== normalizeSearchText(tag)) removeTagIfOrphan(oldTag);
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

  const removedTag = target.dataset.tag;

  pushHistory();
  target.remove();
  if (removedTag) removeTagIfOrphan(removedTag);
  updateSectionCount(sectionId);
  notify('Botão removido!');
  doSearch();
  updateUnsavedChangesUI();
}

// --- Tags --------------------------------------------------

function getTagUsageMap() {
  const usage = {};
  document.querySelectorAll('.btn-wrap').forEach(button => {
    const tag = button.dataset.tag;
    if (tag) usage[tag] = (usage[tag] || 0) + 1;
  });
  return usage;
}

function renderTagList() {
  const list = document.getElementById('tagList');
  const emptyMsg = document.getElementById('tagEmptyMsg');
  const filterInput = document.getElementById('tagFilterInput');
  const filterValue = filterInput ? filterInput.value.trim() : '';
  const filter = normalizeSearchText(filterValue);
  const usage = getTagUsageMap();

  list.innerHTML = '';

  const visibleTags = tags.filter(tag => !filter || normalizeSearchText(tag).includes(filter));

  visibleTags.forEach(tag => {
    const count = usage[tag] || 0;
    const safeTag = String(tag).replace(/'/g, "\\'");
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.title = count > 0 ? `Usada em ${count} botão(ões)` : 'Nenhum botão usa esta tag';
    chip.innerHTML = `${escapeHtml(tag)} <span class="tag-chip-count">${count}</span> <button class="tag-chip-btn tag-chip-edit" onclick="renameTag('${safeTag}')" title="Renomear tag">✏️</button> <button class="tag-chip-btn tag-chip-del" onclick="removeTag('${safeTag}')" title="Remover tag">✕</button>`;
    list.appendChild(chip);
  });

  if (emptyMsg) {
    if (tags.length === 0) {
      emptyMsg.textContent = 'Nenhuma tag criada ainda.';
      emptyMsg.classList.add('show');
    } else if (visibleTags.length === 0) {
      emptyMsg.textContent = `Nenhuma tag encontrada para "${filterValue}".`;
      emptyMsg.classList.add('show');
    } else {
      emptyMsg.classList.remove('show');
    }
  }
}

// Renomeia uma tag existente. Se o novo nome já pertencer a outra tag,
// pergunta se deseja mesclar as duas (todos os botões passam a usar a
// mesma tag, sem duplicar entradas na lista).
async function renameTag(oldTag) {
  const newNameRaw = await promptDialog(`Novo nome para a tag "${oldTag}":`, oldTag, { title: '✏️ Renomear Tag' });
  if (newNameRaw === null) return;

  const newTag = newNameRaw.trim().toLowerCase();
  if (!newTag || newTag === oldTag) return;

  const collides = tags.includes(newTag);
  if (collides) {
    const ok = await confirmDialog(`Já existe uma tag "${newTag}". Deseja mesclar "${oldTag}" com ela? Todos os botões passarão a usar "${newTag}".`, { title: '🔀 Mesclar Tags', confirmText: 'Mesclar' });
    if (!ok) return;
  }

  pushHistory();

  document.querySelectorAll(`.btn-wrap[data-tag="${cssEscape(oldTag)}"]`).forEach(button => {
    button.dataset.tag = newTag;
  });

  const oldIndex = tags.indexOf(oldTag);
  if (oldIndex !== -1) tags.splice(oldIndex, 1);
  if (!tags.includes(newTag)) tags.push(newTag);

  updateTagDatalist();
  doSearch();
  notify(collides ? `Tags mescladas em "${newTag}"` : `Tag renomeada para "${newTag}"`);
  updateUnsavedChangesUI();
}

// Tags sem nenhum botão associado (candidatas a limpeza em massa).
function getEmptyTags() {
  const usage = getTagUsageMap();
  return tags.filter(tag => !usage[tag]);
}

async function clearEmptyTags() {
  const emptyTags = getEmptyTags();

  if (emptyTags.length === 0) {
    notify('Nenhuma tag vazia encontrada');
    return;
  }

  const ok = await confirmDialog(
    `Remover ${emptyTags.length} tag(s) sem nenhum botão associado?\n\n${emptyTags.join(', ')}`,
    { title: '🧹 Limpar Tags Vazias', danger: true, confirmText: 'Remover' }
  );
  if (!ok) return;

  pushHistory();
  tags = tags.filter(tag => !emptyTags.includes(tag));
  updateTagDatalist();
  notify(`${emptyTags.length} tag(s) removida(s)`);
  updateUnsavedChangesUI();
}

// Remove uma tag automaticamente da lista se nenhum botão mais a usa —
// chamada após excluir/editar botões ou seções, nunca após addTag()
// (uma tag recém-criada, ainda sem botão, não deve ser tratada como órfã).
function removeTagIfOrphan(tag) {
  if (!tag) return;
  const stillUsed = document.querySelector(`.btn-wrap[data-tag="${cssEscape(tag)}"]`);
  if (stillUsed) return;

  const index = tags.indexOf(tag);
  if (index === -1) return;

  tags.splice(index, 1);
  updateTagDatalist();
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

async function exportData() {
  const state = collectState();
  let jsonString = JSON.stringify(state, null, 2);

  const shouldEncrypt = encryptExportEnabled;
  let filenameSuffix = '';

  if (shouldEncrypt) {
    try {
      jsonString = await encryptJsonString(jsonString);
      filenameSuffix = '-enc';
    } catch (error) {
      console.error('Erro ao criptografar:', error);
      notify('Não foi possível criptografar. Exportando sem criptografia.', 'err');
    }
  }

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const exportDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  const exportTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  link.href = url;
  link.download = `blu_data-${exportDate}-${exportTime}${filenameSuffix}.json`;
  link.click();
  URL.revokeObjectURL(url);
  markCurrentStateAsExported();
  notify(shouldEncrypt && filenameSuffix ? 'Exportado (criptografado)!' : 'Exportado!');
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
    let parsed = JSON.parse(raw);
    let wasEncrypted = false;

    if (isEncryptedPayload(parsed)) {
      wasEncrypted = true;
      try {
        const decryptedString = await decryptJsonPayload(parsed);
        parsed = JSON.parse(decryptedString);
      } catch (decryptError) {
        console.error('Erro ao descriptografar:', decryptError);
        throw new Error('não foi possível descriptografar este arquivo');
      }
    }

    if (!parsed.sections && !parsed.categories) throw new Error('Formato inválido: esperado "sections" ou "categories"');

    const ok = await confirmDialog('Isso substituirá todos os dados atuais. Continuar?', { title: '📥 Importar JSON', danger: true, confirmText: 'Importar' });
    if (!ok) return;

    pushHistory();
    restoreState(normalizeImportedData(parsed));
    markCurrentStateAsExported();
    closeModal('importModal');
    clearImportSource();
    notify(wasEncrypted ? 'Importado com sucesso (arquivo criptografado)!' : 'Importado com sucesso!');
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
  