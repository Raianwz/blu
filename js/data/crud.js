// ==========================================================
// CRUD de botões, seções e tags + export/import
// ==========================================================

let currentSectionId = null;
let currentBtnId = null;
const protectedEditModals = new Set(['btnModal', 'sectionModal']);
const modalInitialValues = new Map();
let modalDismissPending = false;

// Criptografia do backup: controlada via atalho Alt+C (não há mais
// checkbox no menu — o estado liga/desliga e reflete como um pequeno
// cadeado no botão Exportar Backup).
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
  const modal = document.getElementById(id);
  modal.classList.add('open');

  if (protectedEditModals.has(id)) {
    modalInitialValues.set(id, getModalFormValues(modal));
  }

  if (id === 'tagModal') {
    const filterInput = document.getElementById('tagFilterInput');
    if (filterInput) filterInput.value = '';
    renderTagList();
    renderTagDiagnostics();
  }

  let input;
  if (id === 'tagModal') input = document.querySelector('#tagModal .tag-modal-panel.active input');
  else if (id === 'jsonModal') input = document.querySelector('#jsonModal .json-modal-panel.active textarea');
  else input = document.querySelector(`#${id} input, #${id} textarea`);
  if (input) setTimeout(() => input.focus(), 50);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  modalInitialValues.delete(id);
}

function getModalFormValues(modal) {
  return JSON.stringify([...modal.querySelectorAll('input, textarea, select')].map(field => ({
    id: field.id,
    value: field.value,
    checked: field.type === 'checkbox' || field.type === 'radio' ? field.checked : undefined
  })));
}

function modalHasUnsavedFormChanges(id) {
  const modal = document.getElementById(id);
  const initial = modalInitialValues.get(id);
  return Boolean(modal && initial !== undefined && initial !== getModalFormValues(modal));
}

async function requestModalDismiss(id) {
  const modal = document.getElementById(id);
  if (!modal?.classList.contains('open') || modalDismissPending) return;

  if (!protectedEditModals.has(id) || !modalHasUnsavedFormChanges(id)) {
    closeModal(id);
    return;
  }

  modalDismissPending = true;
  const confirmed = await confirmDialog(
    'As alterações feitas neste formulário ainda não foram salvas. Deseja sair mesmo assim?',
    {
      title: 'Descartar alterações?',
      confirmText: 'Sair sem salvar',
      cancelText: 'Continuar editando',
      danger: true,
      variant: 'unsaved-changes',
      focusCancel: true
    }
  );
  modalDismissPending = false;
  if (confirmed) closeModal(id);
}

// --- Seções --------------------------------------------------

function saveSection() {
  const name = document.getElementById('sName').value.trim();
  if (!name) {
    notify('Informe o nome da seção', 'err');
    return;
  }

  pushHistory();
  const section = { id: 's' + Date.now(), name, collapsed: false, buttons: [] };
  renderSection(section, document.getElementById('sections'));
  recordActivityEvent('created', { target: 'section', targetId: section.id, name });
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
  recordActivityEvent('updated', { target: 'section', targetId: sectionId, name: newName.trim(), details: { previousName: current } });
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
  const sectionName = wrap.querySelector('.section-title')?.textContent || 'Seção sem nome';
  pushHistory();
  const removedButtons = [...wrap.querySelectorAll('.btn-wrap')];
  removedButtons.forEach(button => recordUserActivity('deleted', button.dataset.id));
  recordActivityEvent('deleted', { target: 'section', targetId: sectionId, name: sectionName, details: { buttonCount: count } });
  wrap.remove();
  affectedTags.forEach(removeTagIfOrphan);
  pruneUserData();
  mobileHaptic('danger');
  notifyUndo('Seção removida!');
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
  const tag = normalizeTag(document.getElementById('bTag').value);
  const vis = document.getElementById('bVis').value || 'other';

  if (!name || !text) {
    notify('Preencha nome e texto', 'err');
    return;
  }

  if (!currentSectionId) {
    notify('Selecione uma seção antes de salvar o botão', 'err');
    return;
  }

  if (tag && !tags.includes(tag)) {
    tags.push(tag);
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
    const previous = {
      name: old.querySelector('.btn-label')?.textContent || '',
      text: old.dataset.text || '',
      tag: old.dataset.tag || '',
      vis: old.dataset.vis || 'other'
    };
    old.replaceWith(createBtnEl(button, currentSectionId));
    recordUserActivity('edited', currentBtnId);
    recordActivityEvent('updated', {
      target: 'button', targetId: currentBtnId, name,
      sectionId: currentSectionId,
      sectionName: body.closest('.section-wrap')?.querySelector('.section-title')?.textContent || '',
      details: {
        changedFields: Object.keys(previous).filter(field => previous[field] !== button[field]),
        previousName: previous.name
      }
    });
    if (oldTag && oldTag !== tag) removeTagIfOrphan(oldTag);
    notify('Botão atualizado!');
  } else {
    body.appendChild(createBtnEl(button, currentSectionId));
    recordUserActivity('created', button.id);
    recordActivityEvent('created', {
      target: 'button', targetId: button.id, name,
      sectionId: currentSectionId,
      sectionName: body.closest('.section-wrap')?.querySelector('.section-title')?.textContent || ''
    });
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
  const removedName = target.querySelector('.btn-label')?.textContent || 'Botão sem nome';
  const sectionName = target.closest('.section-wrap')?.querySelector('.section-title')?.textContent || '';

  pushHistory();
  recordUserActivity('deleted', btnId);
  recordActivityEvent('deleted', { target: 'button', targetId: btnId, name: removedName, sectionId, sectionName });
  target.remove();
  removeButtonUserData(btnId);
  if (removedTag) removeTagIfOrphan(removedTag);
  updateSectionCount(sectionId);
  mobileHaptic('danger');
  notifyUndo('Botão removido!');
  doSearch();
  updateUnsavedChangesUI();
}

// --- Tags --------------------------------------------------

let activeTagModalTab = 'manage';

function openTagModal(tab = 'manage') {
  setTagModalTab(tab);
  openModal('tagModal');
}

function setTagModalTab(tab) {
  activeTagModalTab = tab === 'diagnostic' ? 'diagnostic' : 'manage';
  const isDiagnostic = activeTagModalTab === 'diagnostic';
  const manageTab = document.getElementById('tagManageTab');
  const diagnosticTab = document.getElementById('tagDiagnosticTab');
  const managePanel = document.getElementById('tagManagePanel');
  const diagnosticPanel = document.getElementById('tagDiagnosticPanel');
  const title = document.getElementById('tagModalTitle');

  manageTab?.classList.toggle('active', !isDiagnostic);
  diagnosticTab?.classList.toggle('active', isDiagnostic);
  manageTab?.setAttribute('aria-selected', String(!isDiagnostic));
  diagnosticTab?.setAttribute('aria-selected', String(isDiagnostic));
  managePanel?.classList.toggle('active', !isDiagnostic);
  diagnosticPanel?.classList.toggle('active', isDiagnostic);
  if (managePanel) managePanel.hidden = isDiagnostic;
  if (diagnosticPanel) diagnosticPanel.hidden = !isDiagnostic;
  if (title) title.textContent = isDiagnostic ? '🏷️ Diagnóstico de Tags' : '🏷️ Gerenciar Tags';

  if (isDiagnostic) renderTagDiagnostics();
}

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

  const newTag = normalizeTag(newNameRaw);
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
  const value = normalizeTag(input.value);
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
  renderTagDiagnostics();
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

// --- Compartilhar via link (/share/:codigo) -----------------
// Diferente do export para arquivo, o compartilhamento SEMPRE criptografa
// antes de enviar — independente do estado do Alt+C (que só afeta o
// download local). O servidor (Upstash Redis) nunca vê o conteúdo em
// texto puro, apenas um blob opaco. Link expira em 3 dias.
//
// Fluxo: clicar em "Compartilhar" abre um modal de prévia (contagem de
// seções/botões/tags + aviso de botões privados) ANTES de qualquer coisa
// ir para o servidor. Se já existe um link válido para o estado ATUAL
// (dados não mudaram desde a última vez), o modal mostra esse link em vez
// de criar um novo — só copia. Um novo link só é gerado se o anterior
// expirou, os dados mudaram, ou a pessoa pedir explicitamente.

const LAST_SHARE_KEY = 'blu:lastShare';
const SHARE_MAX_PAYLOAD_BYTES = 600 * 1024;

function getLastShareRecord() {
  try {
    const raw = localStorage.getItem(LAST_SHARE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function saveLastShareRecord(record) {
  try { localStorage.setItem(LAST_SHARE_KEY, JSON.stringify(record)); } catch (_) {}
}

function isValidShareAlias(value) {
  return /^(?=.*[A-Z])(?=.*\d)[A-Za-z][A-Za-z0-9_-]{5,31}$/.test(String(value || '').trim());
}

function formatTimeRemaining(msRemaining) {
  if (msRemaining <= 0) return 'expirado';

  const totalMinutes = Math.floor(msRemaining / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} dia${days === 1 ? '' : 's'} e ${hours} hora${hours === 1 ? '' : 's'}`;
  if (hours > 0) return `${hours} hora${hours === 1 ? '' : 's'} e ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
}

function getUtf8ByteLength(value) {
  return new TextEncoder().encode(String(value || '')).byteLength;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function estimateEncryptedPayloadBytes(jsonString) {
  const plainBytes = getUtf8ByteLength(jsonString);
  const encryptedBytes = plainBytes + 16; // tag de autenticação do AES-GCM
  const encryptedBase64Length = 4 * Math.ceil(encryptedBytes / 3);
  const estimatedPayload = JSON.stringify({
    blu_encrypted: true,
    alg: 'AES-GCM-256',
    iv: 'A'.repeat(16),
    data: 'A'.repeat(encryptedBase64Length)
  });
  return getUtf8ByteLength(estimatedPayload);
}

function getShareSizeInfo(state) {
  const jsonString = JSON.stringify(state);
  const jsonBytes = getUtf8ByteLength(jsonString);
  const payloadBytes = estimateEncryptedPayloadBytes(jsonString);
  return {
    jsonBytes,
    payloadBytes,
    exceedsLimit: payloadBytes > SHARE_MAX_PAYLOAD_BYTES,
    usagePercent: Math.round((payloadBytes / SHARE_MAX_PAYLOAD_BYTES) * 100)
  };
}

function buildShareCountsHtml(state) {
  const sectionCount = state.sections.length;
  const buttonCount = state.sections.reduce((sum, s) => sum + s.buttons.length, 0);
  const tagCount = state.tags.length;
  const sizeInfo = getShareSizeInfo(state);
  const privateCount = state.sections.reduce(
    (sum, s) => sum + s.buttons.filter(b => b.vis === 'private').length,
    0
  );

  let html = `
    <div class="share-counts">
      <span>${iconSvg('folder_plus')} ${sectionCount} seç${sectionCount === 1 ? 'ão' : 'ões'}</span>
      <span>${iconSvg('tag')} ${tagCount} tag${tagCount === 1 ? '' : 's'}</span>
      <span>${iconSvg('share')} ${buttonCount} botã${buttonCount === 1 ? 'o' : 'o'}${buttonCount === 1 ? '' : 's'}</span>
      <span title="Tamanho do JSON antes da criptografia">JSON: ${formatFileSize(sizeInfo.jsonBytes)}</span>
    </div>
    <div class="share-size-check ${sizeInfo.exceedsLimit ? 'limit-exceeded' : sizeInfo.usagePercent >= 85 ? 'near-limit' : ''}">
      <div class="share-size-label">
        <span>Payload estimado</span>
        <strong>${formatFileSize(sizeInfo.payloadBytes)} / ${formatFileSize(SHARE_MAX_PAYLOAD_BYTES)}</strong>
      </div>
      <div class="share-size-track" aria-label="${sizeInfo.usagePercent}% do limite de compartilhamento utilizado">
        <span style="width:${Math.min(sizeInfo.usagePercent, 100)}%"></span>
      </div>
      ${sizeInfo.exceedsLimit ? '<p>O conteúdo ultrapassa o limite e não poderá ser compartilhado.</p>' : ''}
    </div>
  `;

  if (privateCount > 0) {
    html += `<div class="share-warning">${iconSvg('lock')} ${privateCount} botão(ões) marcado(s) como Privado ${privateCount === 1 ? 'será' : 'serão'} incluído(s) no link.</div>`;
  }

  return html;
}

// Monta e abre o modal — decide sozinho, a cada abertura, se mostra a
// prévia de criação ou o link já ativo (comparando o estado atual com o
// registro do último compartilhamento salvo).
function openShareModal() {
  if (!navigator.onLine) {
    notify('Sem conexão: o compartilhamento está indisponível.', 'err');
    return;
  }

  const state = collectState();
  const sizeInfo = getShareSizeInfo(state);
  const currentComparable = getComparableStateString();
  const lastShare = getLastShareRecord();
  const stillValid = !!(lastShare && lastShare.comparableState === currentComparable && lastShare.expiresAt > Date.now());

  const titleEl = document.getElementById('shareModalTitle');
  const bodyEl = document.getElementById('shareModalBody');
  const footerEl = document.getElementById('shareModalFooter');
  const countsHtml = buildShareCountsHtml(state);

  if (stillValid) {
    titleEl.textContent = '🔗 Link Ativo';
    bodyEl.innerHTML = `
      <p class="share-modal-desc">Você já tem um link válido para os dados atuais:</p>
      <div class="form-group share-link-field">
        <input id="shareResultInput" type="text" readonly value="${escapeHtmlAttr(lastShare.url)}">
        ${lastShare.id ? `<button id="customizeShareBtn" class="share-link-edit" type="button" title="${lastShare.alias ? 'Alterar apelido' : 'Personalizar link'}" aria-label="${lastShare.alias ? 'Alterar apelido do link' : 'Personalizar link'}">${iconSvg('pencil')}</button>` : ''}
      </div>
      <p class="share-expiry">⏱️ Expira em ${formatTimeRemaining(lastShare.expiresAt - Date.now())}</p>
      ${countsHtml}
    `;

    footerEl.innerHTML = '';
    const regenBtn = document.createElement('button');
    regenBtn.className = 'mbtn secondary';
    regenBtn.id = 'regenerateShareBtn';
    regenBtn.textContent = 'Gerar novo link mesmo assim';
    regenBtn.onclick = () => shareData();
    regenBtn.dataset.payloadBlocked = String(sizeInfo.exceedsLimit);
    if (sizeInfo.exceedsLimit) regenBtn.title = 'O payload ultrapassa o limite de 600 KB';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'mbtn primary';
    copyBtn.textContent = 'Copiar';
    copyBtn.onclick = copyShareLink;

    footerEl.append(regenBtn, copyBtn);
    document.getElementById('customizeShareBtn')?.addEventListener('click', openShareAliasEditor);
  } else {
    titleEl.textContent = '🔗 Compartilhar Dados';
    bodyEl.innerHTML = `
      <p class="share-modal-desc">Isso vai gerar um link público (válido por 3 dias) com os dados abaixo:</p>
      ${countsHtml}
    `;

    footerEl.innerHTML = '';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = `mbtn ${sizeInfo.exceedsLimit ? 'primary' : 'secondary'}`;
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = () => closeModal('shareModal');

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'mbtn primary';
    confirmBtn.id = 'confirmShareBtn';
    confirmBtn.textContent = 'Compartilhar';
    confirmBtn.onclick = () => shareData();
    confirmBtn.dataset.payloadBlocked = String(sizeInfo.exceedsLimit);
    if (sizeInfo.exceedsLimit) {
      confirmBtn.disabled = true;
      confirmBtn.title = 'O payload ultrapassa o limite de 600 KB';
      confirmBtn.setAttribute('aria-label', 'Compartilhamento indisponível: payload acima do limite de 600 KB');
    }

    footerEl.append(cancelBtn, confirmBtn);
  }

  openModal('shareModal');
}

// Cria de fato um novo link (chamada pelos botões "Compartilhar" e "Gerar
// novo link mesmo assim" dentro do modal — a decisão de reaproveitar ou
// não já foi tomada em openShareModal() antes de chegar aqui).
async function shareData() {
  if (!navigator.onLine) {
    notify('Sem conexão: conecte-se à internet para compartilhar.', 'err');
    return;
  }

  const state = collectState();
  const jsonString = JSON.stringify(state);
  const jsonBytes = getUtf8ByteLength(jsonString);
  const estimatedPayloadBytes = estimateEncryptedPayloadBytes(jsonString);

  if (estimatedPayloadBytes > SHARE_MAX_PAYLOAD_BYTES) {
    notify(`O compartilhamento tem cerca de ${formatFileSize(estimatedPayloadBytes)} e excede o limite de ${formatFileSize(SHARE_MAX_PAYLOAD_BYTES)}.`, 'err');
    console.warn('[Compartilhamento] Payload acima do limite antes da criptografia.', {
      estimatedPayloadBytes,
      limitBytes: SHARE_MAX_PAYLOAD_BYTES
    });
    return;
  }

  console.info('[Compartilhamento] Preparando dados.', {
    jsonBytes,
    jsonSize: formatFileSize(jsonBytes),
    sections: state.sections.length,
    buttons: state.sections.reduce((sum, section) => sum + section.buttons.length, 0),
    tags: state.tags.length
  });

  let encryptedPayload;
  let payloadBytes = 0;
  try {
    encryptedPayload = await encryptJsonString(jsonString);
    payloadBytes = getUtf8ByteLength(encryptedPayload);
    console.info('[Compartilhamento] Payload criptografado.', {
      payloadBytes,
      payloadSize: formatFileSize(payloadBytes),
      apiLimitBytes: SHARE_MAX_PAYLOAD_BYTES,
      apiLimitSize: formatFileSize(SHARE_MAX_PAYLOAD_BYTES)
    });
  } catch (error) {
    console.error('Erro ao criptografar para compartilhamento:', error);
    notify('Não foi possível preparar o compartilhamento (criptografia indisponível neste navegador).', 'err');
    return;
  }

  if (payloadBytes > SHARE_MAX_PAYLOAD_BYTES) {
    notify(`O compartilhamento tem ${formatFileSize(payloadBytes)} e excede o limite de ${formatFileSize(SHARE_MAX_PAYLOAD_BYTES)}.`, 'err');
    console.warn('[Compartilhamento] Payload criptografado acima do limite.', {
      payloadBytes,
      limitBytes: SHARE_MAX_PAYLOAD_BYTES
    });
    return;
  }

  const confirmBtn = document.getElementById('confirmShareBtn');
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    console.info('[Compartilhamento] Enviando payload para /api/share.');
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: encryptedPayload, clientId: getOrCreateClientId() })
    });

    const responseBody = await res.json().catch(() => ({}));
    console.info('[Compartilhamento] Resposta da API.', {
      status: res.status,
      ok: res.ok,
      error: responseBody.error || null,
      message: responseBody.message || null
    });

    if (!res.ok) {
      const requestError = new Error(`HTTP ${res.status}${responseBody.error ? ` (${responseBody.error})` : ''}`);
      requestError.userMessage = responseBody.message || '';
      throw requestError;
    }

    const { id, expiresInSeconds } = responseBody;
    if (!id || !expiresInSeconds) throw new Error('Resposta da API incompleta.');
    const url = `${window.location.origin}/share/${id}`;

    saveLastShareRecord({
      id,
      comparableState: getComparableStateString(),
      url,
      originalUrl: url,
      alias: null,
      expiresAt: Date.now() + expiresInSeconds * 1000
    });

    console.info('[Compartilhamento] Link criado com sucesso.', { expiresInSeconds });

    openShareModal(); // reabre já mostrando o link recém-criado (Estado 2)
  } catch (error) {
    console.error('Erro ao compartilhar:', error);
    notify(error.userMessage || 'Não foi possível criar o link de compartilhamento.', 'err');
  } finally {
    updateShareConnectivityUI();
  }
}

function updateShareConnectivityUI(announce = false) {
  const online = navigator.onLine;
  const menuButton = document.getElementById('shareBtn');
  if (menuButton) {
    menuButton.disabled = !online;
    menuButton.classList.toggle('offline', !online);
    menuButton.title = online
      ? 'Compartilhar dados via link (expira em 3 dias)'
      : 'Compartilhamento indisponível: sem conexão';
    menuButton.querySelector('.menu-btn-label').textContent = online ? 'Compartilhar' : 'Compartilhar: Offline';
  }

  const confirmButton = document.getElementById('confirmShareBtn');
  if (confirmButton) {
    confirmButton.disabled = !online || confirmButton.dataset.payloadBlocked === 'true';
    confirmButton.title = !online
      ? 'Compartilhamento indisponível: sem conexão'
      : confirmButton.dataset.payloadBlocked === 'true' ? 'O payload ultrapassa o limite de 600 KB' : '';
  }

  const regenerateButton = document.getElementById('regenerateShareBtn');
  if (regenerateButton) {
    regenerateButton.disabled = !online;
    regenerateButton.title = !online
      ? 'Compartilhamento indisponível: sem conexão'
      : regenerateButton.dataset.payloadBlocked === 'true' ? 'O payload ultrapassa o limite de 600 KB' : '';
  }

  const customizeButton = document.getElementById('customizeShareBtn');
  if (customizeButton) {
    customizeButton.disabled = !online;
    customizeButton.title = online ? 'Criar ou alterar o apelido deste link' : 'Personalização indisponível: sem conexão';
  }

  const aliasInput = document.getElementById('shareAliasInput');
  if (aliasInput) {
    aliasInput.disabled = !online;
    const removeAliasButton = document.getElementById('removeShareAliasBtn');
    if (removeAliasButton) removeAliasButton.disabled = !online;
    const saveAliasButton = document.getElementById('saveShareAliasBtn');
    if (saveAliasButton) {
      const currentAlias = getLastShareRecord()?.alias || '';
      saveAliasButton.disabled = !online || !isValidShareAlias(aliasInput.value) || aliasInput.value.trim() === currentAlias;
    }
    const aliasError = document.getElementById('shareAliasError');
    if (aliasError) aliasError.textContent = online ? '' : 'Conecte-se à internet para personalizar o link.';
  }

  if (announce) {
    notify(online ? 'Conexão restabelecida' : 'Sem conexão: compartilhamento indisponível', online ? 'ok' : 'err');
  }
}

function initShareConnectivity() {
  updateShareConnectivityUI();
  window.addEventListener('online', () => updateShareConnectivityUI(true));
  window.addEventListener('offline', () => updateShareConnectivityUI(true));
}

async function copyShareLink() {
  const input = document.getElementById('shareResultInput');
  if (!input) return;

  input.select();

  try {
    await copyToClipboard(input.value);
    notify('Link copiado!');
  } catch (error) {
    console.error('Erro ao copiar link:', error);
    notify('Não foi possível copiar. Copie manualmente.', 'err');
  }
}

function openShareAliasEditor() {
  const record = getLastShareRecord();
  const body = document.getElementById('shareModalBody');
  if (!record?.id || !body) return;

  body.querySelector('.share-alias-editor')?.remove();
  const editor = document.createElement('div');
  editor.className = 'share-alias-editor';
  editor.innerHTML = `
    <label for="shareAliasInput">Apelido do link</label>
    <div class="share-alias-input-row">
      <span>${escapeHtml(window.location.origin)}/s/</span>
      <input id="shareAliasInput" type="text" maxlength="32" autocomplete="off" spellcheck="false" value="${escapeHtmlAttr(record.alias || '')}" placeholder="EquipeA1">
    </div>
    <p class="share-alias-help">6 a 32 caracteres, começando por letra, com pelo menos uma maiúscula e um número.</p>
    <p id="shareAliasError" class="share-alias-error" role="alert"></p>
    <div class="share-alias-actions">
      ${record.alias ? '<button class="mbtn ghost" id="removeShareAliasBtn" type="button">Remover apelido</button>' : ''}
      <button class="mbtn secondary" id="cancelShareAliasBtn" type="button">Cancelar</button>
      <button class="mbtn primary" id="saveShareAliasBtn" type="button" disabled>Salvar apelido</button>
    </div>
  `;
  body.appendChild(editor);

  const input = document.getElementById('shareAliasInput');
  const saveButton = document.getElementById('saveShareAliasBtn');
  const updateValidation = () => {
    const valid = isValidShareAlias(input.value);
    saveButton.disabled = !valid || input.value.trim() === record.alias;
    document.getElementById('shareAliasError').textContent = input.value && !valid
      ? 'O apelido precisa começar por letra e conter uma maiúscula e um número.' : '';
  };
  input.addEventListener('input', updateValidation);
  saveButton.onclick = saveShareAlias;
  document.getElementById('cancelShareAliasBtn').onclick = () => editor.remove();
  document.getElementById('removeShareAliasBtn')?.addEventListener('click', removeShareAlias);
  updateValidation();
  input.focus();
  input.select();
}

function setShareAliasEditorBusy(busy) {
  document.querySelectorAll('.share-alias-editor input, .share-alias-editor button').forEach(element => { element.disabled = busy; });
}

async function saveShareAlias() {
  const record = getLastShareRecord();
  const input = document.getElementById('shareAliasInput');
  const errorEl = document.getElementById('shareAliasError');
  const alias = input?.value.trim() || '';
  if (!record?.id || !isValidShareAlias(alias)) return;

  setShareAliasEditorBusy(true);
  errorEl.textContent = '';
  try {
    const response = await fetch(`/api/share/${encodeURIComponent(record.id)}/alias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias, clientId: getOrCreateClientId() })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { userMessage: payload.message });

    const url = `${window.location.origin}/s/${encodeURIComponent(alias)}`;
    saveLastShareRecord({ ...record, alias, url });
    openShareModal();
    notify('Link personalizado!');
  } catch (error) {
    console.error('Erro ao personalizar link:', error);
    errorEl.textContent = error.userMessage || 'Não foi possível personalizar o link.';
    setShareAliasEditorBusy(false);
  }
}

async function removeShareAlias() {
  const record = getLastShareRecord();
  const errorEl = document.getElementById('shareAliasError');
  if (!record?.id || !record.alias) return;

  setShareAliasEditorBusy(true);
  errorEl.textContent = '';
  try {
    const response = await fetch(`/api/share/${encodeURIComponent(record.id)}/alias`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: getOrCreateClientId() })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { userMessage: payload.message });

    const originalUrl = record.originalUrl || `${window.location.origin}/share/${record.id}`;
    saveLastShareRecord({ ...record, alias: null, url: originalUrl, originalUrl });
    openShareModal();
    notify('Apelido removido');
  } catch (error) {
    console.error('Erro ao remover apelido:', error);
    errorEl.textContent = error.userMessage || 'Não foi possível remover o apelido.';
    setShareAliasEditorBusy(false);
  }
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

    if (parsed.format === 'blu-userdata') {
      if (Number(parsed.version) > USERDATA_FORMAT_VERSION) throw new Error('backup de dados pessoais criado por uma versão mais nova');
      const ok = await confirmDialog('Isso substituirá os favoritos e as estatísticas locais. Seus botões não serão alterados. Continuar?', { title: '📥 Importar dados pessoais', danger: true, confirmText: 'Importar' });
      if (!ok) return;
      replaceUserData(parsed.userdata, getCurrentButtonIds());
      closeModal('importModal');
      clearImportSource();
      notify('Estatísticas e favoritos importados!');
      return;
    }

    if (parsed.format === 'blu-appdata') {
      if (Number(parsed.version) > USERDATA_FORMAT_VERSION) throw new Error('backup completo criado por uma versão mais nova');
      if (!parsed.data?.sections && !parsed.data?.categories) throw new Error('backup completo sem dados de botões válidos');
      const ok = await confirmDialog('Isso substituirá os botões, favoritos e estatísticas atuais. Os botões poderão ser recuperados com Ctrl+Z; os dados pessoais não. Continuar?', { title: '📥 Importar backup do Blû', danger: true, confirmText: 'Importar' });
      if (!ok) return;
      pushHistory();
      restoreState(normalizeImportedData(parsed.data));
      replaceUserData(parsed.userdata, getCurrentButtonIds());
      markCurrentStateAsExported();
      closeModal('importModal');
      clearImportSource();
      notify('Dados, estatísticas e favoritos importados!');
      return;
    }

    if (!parsed.sections && !parsed.categories) throw new Error('Formato inválido: esperado "sections", "categories" ou um backup do Blû');

    const ok = await confirmDialog('Isso substituirá todos os dados atuais. Continuar?', { title: '📥 Importar Backup', danger: true, confirmText: 'Importar' });
    if (!ok) return;

    pushHistory();
    restoreState(normalizeImportedData(parsed));
    pruneUserData();
    markCurrentStateAsExported();
    closeModal('importModal');
    clearImportSource();
    notify(wasEncrypted ? 'Importado com sucesso (arquivo criptografado)!' : 'Importado com sucesso!');
  } catch (error) {
    notify('JSON inválido: ' + error.message, 'err');
  }
}

async function clearAll(event = null) {
  const includeClientId = !!event?.altKey;
  const message = includeClientId
    ? 'Ao limpar ABSOLUTAMENTE TUDO, você NÃO PODERÁ MAIS RENOMEAR LINKS COMPARTILHADOS neste navegador e perderá INFORMAÇÕES, REGISTROS DE LINKS, ESTATÍSTICAS E TODOS OS DEMAIS DADOS LOCAIS. Os BOTÕES E SEÇÕES poderão ser recuperados com Ctrl+Z somente enquanto esta página permanecer aberta. Tem certeza?'
    : 'Limpar TODOS OS DADOS E PREFERÊNCIAS LOCAIS do Blû? Os BOTÕES E SEÇÕES poderão ser recuperados com Ctrl+Z enquanto esta página permanecer aberta. A IDENTIDADE LOCAL usada para gerenciar links compartilhados será preservada.';
  const ok = await confirmDialog(message, {
    title: includeClientId ? '🗑️ Limpeza absoluta' : '🗑️ Limpar Tudo',
    danger: true,
    confirmText: includeClientId ? 'Limpar absolutamente tudo' : 'Limpar tudo',
    variant: 'clear-all',
    confirmDelay: includeClientId ? 15 : 0
  });
  if (!ok) return;

  const stateBeforeClear = JSON.stringify(collectState());
  const exportedStateBeforeClear = lastExportedComparableState;
  pushHistory();
  clearUndoSnapshot = {
    stateString: stateBeforeClear,
    exportedComparableState: exportedStateBeforeClear
  };
  restoreState({ tags: [], sections: [] });
  notifyUndo('Tudo limpo!');

  // Trata o estado vazio como a nova "baseline" — não há nada de fato para
  // fazer backup logo após limpar tudo, então não faz sentido o banner de
  // lembrete aparecer na hora.
  markCurrentStateAsExported();

  // Limpa todo o namespace do Blû sem afetar possíveis dados de outras
  // ferramentas hospedadas na mesma origem. Num próximo F5, o demo e as
  // preferências padrão voltam.
  clearBluLocalStorage({ includeClientId });
  resetUserData();
  updateContentPreferenceButtons();
  updateContentViewSwitcher();
  renderFavoritesShelf();

  // Reflete imediatamente os padrões na interface sem recriar as
  // preferências que acabaram de ser removidas.
  applyTheme(!!systemThemeQuery?.matches);
  applyTextPreviewState(true);
  dragPreviewEnabled = false;
  applyDragPreviewState();
}

// --- Ferramentas (menu "Ferramentas") ------------------------

// Compatibilidade com chamadas antigas; a implementação completa vive em
// json-tools.js.
function checkJsonIntegrity() {
  openJsonModal('diagnostic');
}

function getLevenshteinDistance(left, right) {
  const a = normalizeTag(left);
  const b = normalizeTag(right);
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 1; row <= a.length; row++) {
    const current = [row];
    for (let column = 1; column <= b.length; column++) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function arePotentiallyConflictingTags(left, right) {
  const a = normalizeTag(left);
  const b = normalizeTag(right);
  if (!a || !b || a === b) return false;

  const shortestLength = Math.min(a.length, b.length);
  if (shortestLength < 4) return false;

  const distance = getLevenshteinDistance(a, b);
  return distance <= 1 || (shortestLength >= 8 && distance <= 2);
}

function getTagDiagnostics() {
  const usage = getTagUsageMap();
  const empty = tags.filter(tag => !usage[tag]);
  const nonCanonical = tags.filter(tag => normalizeTag(tag) !== tag);
  const listedTags = new Set(tags);
  const buttonTags = [...document.querySelectorAll('.btn-wrap')]
    .map(button => button.dataset.tag)
    .filter(Boolean);
  const unlisted = [...new Set(buttonTags.filter(tag => !listedTags.has(tag)))];

  const canonicalGroups = {};
  tags.forEach(tag => {
    const canonical = normalizeTag(tag);
    if (!canonicalGroups[canonical]) canonicalGroups[canonical] = [];
    canonicalGroups[canonical].push(tag);
  });
  const duplicates = Object.values(canonicalGroups).filter(group => group.length > 1);

  const conflicts = [];
  for (let leftIndex = 0; leftIndex < tags.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < tags.length; rightIndex++) {
      const left = tags[leftIndex];
      const right = tags[rightIndex];
      if (arePotentiallyConflictingTags(left, right)) conflicts.push([left, right]);
    }
  }

  return { usage, empty, nonCanonical, unlisted, duplicates, conflicts };
}

function createTagDiagnosticSection(title, description) {
  const section = document.createElement('section');
  section.className = 'tag-diagnostic-section';

  const heading = document.createElement('h3');
  heading.textContent = title;
  section.appendChild(heading);

  if (description) {
    const text = document.createElement('p');
    text.textContent = description;
    section.appendChild(text);
  }

  return section;
}

function appendDiagnosticTagChips(container, tagNames, usage) {
  const list = document.createElement('div');
  list.className = 'tag-diagnostic-chip-list';
  tagNames.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = `${tag} (${usage[tag] || 0})`;
    list.appendChild(chip);
  });
  container.appendChild(list);
}

function renderTagDiagnostics() {
  const summary = document.getElementById('tagDiagnosticSummary');
  const issues = document.getElementById('tagDiagnosticIssues');
  if (!summary || !issues) return;

  const diagnostics = getTagDiagnostics();
  const automaticIssueCount = diagnostics.nonCanonical.length + diagnostics.unlisted.length + diagnostics.duplicates.length;
  const issueCount = automaticIssueCount + diagnostics.empty.length + diagnostics.conflicts.length;
  const buttonCount = Object.values(diagnostics.usage).reduce((total, count) => total + count, 0);

  summary.className = `tag-diagnostic-summary ${issueCount ? 'warning' : 'ok'}`;
  summary.textContent = tags.length === 0
    ? 'Nenhuma tag criada para verificar.'
    : issueCount
      ? `Foram encontrados ${issueCount} ponto(s) para revisar em ${tags.length} tag(s).`
      : `Tudo certo: ${tags.length} tag(s) e ${buttonCount} botão(ões) verificados.`;
  issues.innerHTML = '';

  if (automaticIssueCount > 0) {
    const section = createTagDiagnosticSection('Correções automáticas', 'Normaliza nomes, remove duplicatas e registra tags encontradas nos botões.');
    const button = document.createElement('button');
    button.className = 'mbtn primary';
    button.textContent = `Corrigir ${automaticIssueCount} problema(s)`;
    button.onclick = repairTagIntegrity;
    section.appendChild(button);
    issues.appendChild(section);
  }

  if (diagnostics.empty.length > 0) {
    const section = createTagDiagnosticSection('Tags vazias', 'Estas tags não estão associadas a nenhum botão.');
    appendDiagnosticTagChips(section, diagnostics.empty, diagnostics.usage);
    const button = document.createElement('button');
    button.className = 'mbtn ghost';
    button.textContent = `Limpar ${diagnostics.empty.length} tag(s) vazia(s)`;
    button.onclick = clearEmptyTags;
    section.appendChild(button);
    issues.appendChild(section);
  }

  if (diagnostics.conflicts.length > 0) {
    const section = createTagDiagnosticSection('Tags conflitantes', 'Grafias muito próximas podem representar a mesma tag. Escolha qual nome manter.');

    diagnostics.conflicts.forEach(([left, right]) => {
      const row = document.createElement('div');
      row.className = 'tag-conflict-row';

      const names = document.createElement('div');
      names.className = 'tag-conflict-names';
      names.textContent = `${left} (${diagnostics.usage[left] || 0}) ↔ ${right} (${diagnostics.usage[right] || 0})`;

      const actions = document.createElement('div');
      actions.className = 'tag-conflict-actions';
      const keepLeft = document.createElement('button');
      keepLeft.className = 'mbtn ghost';
      keepLeft.textContent = `Usar “${left}”`;
      keepLeft.onclick = () => mergeTagInto(right, left);
      const keepRight = document.createElement('button');
      keepRight.className = 'mbtn ghost';
      keepRight.textContent = `Usar “${right}”`;
      keepRight.onclick = () => mergeTagInto(left, right);
      actions.append(keepLeft, keepRight);
      row.append(names, actions);
      section.appendChild(row);
    });

    issues.appendChild(section);
  }
}

async function repairTagIntegrity() {
  const currentState = collectState();
  const normalizedState = normalizeImportedData(currentState);
  if (JSON.stringify(currentState) === JSON.stringify(normalizedState)) {
    notify('Nenhuma correção automática necessária');
    renderTagDiagnostics();
    return;
  }

  const ok = await confirmDialog('Normalizar tags, mesclar duplicatas exatas e reparar associações ausentes?', { title: '🛠️ Corrigir Tags', confirmText: 'Corrigir' });
  if (!ok) return;

  pushHistory();
  restoreState(normalizedState);
  notify('Tags corrigidas!');
}

async function mergeTagInto(sourceTag, targetTag) {
  if (!sourceTag || !targetTag || sourceTag === targetTag) return;
  const usage = getTagUsageMap();
  const affected = usage[sourceTag] || 0;
  const ok = await confirmDialog(
    `Mesclar “${sourceTag}” em “${targetTag}”? ${affected} botão(ões) será(ão) atualizado(s).`,
    { title: '🔀 Mesclar Tags', confirmText: 'Mesclar' }
  );
  if (!ok) return;

  pushHistory();
  document.querySelectorAll(`.btn-wrap[data-tag="${cssEscape(sourceTag)}"]`).forEach(button => {
    button.dataset.tag = targetTag;
  });
  tags = tags.filter(tag => tag !== sourceTag);
  if (!tags.includes(targetTag)) tags.push(targetTag);
  updateTagDatalist();
  doSearch();
  updateUnsavedChangesUI();
  notify(`Tags mescladas em “${targetTag}”`);
}

// Mantém compatibilidade com chamadas antigas e abre o diagnóstico completo.
function checkTagsIntegrity() {
  openTagModal('diagnostic');
}
