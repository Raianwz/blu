// ==========================================================
// Importação personalizada de links compartilhados
// ==========================================================

const SHARE_IMPORT_UNDO_KEY = 'blu:pendingImportUndo';
let customImportState = null;
let customImportReturnFocus = null;

function getLocalShareImportData() {
  try {
    const raw = localStorage.getItem('blu:data');
    if (!raw) return null;
    const normalized = normalizeImportedData(JSON.parse(raw));
    return normalized.sections.length ? normalized : null;
  } catch (_) {
    return null;
  }
}

function saveShareImportUndoSnapshot() {
  try {
    const current = localStorage.getItem('blu:data');
    if (current) localStorage.setItem(SHARE_IMPORT_UNDO_KEY, current);
    else localStorage.removeItem(SHARE_IMPORT_UNDO_KEY);
  } catch (_) {}
}

function shareImportButtonFingerprint(button) {
  return JSON.stringify([
    button.name,
    button.text,
    normalizeTag(button.tag),
    button.vis,
    button.vis === 'other' ? normalizeCustomVis(button.customVis) : null
  ]);
}

function shareImportChangedFields(localButton, incomingButton) {
  return ['name', 'text', 'tag', 'vis', 'customVis'].filter(field => {
    if (field === 'customVis') return JSON.stringify(localButton.vis === 'other' ? normalizeCustomVis(localButton.customVis) : null) !== JSON.stringify(incomingButton.vis === 'other' ? normalizeCustomVis(incomingButton.customVis) : null);
    const left = field === 'tag' ? normalizeTag(localButton[field]) : localButton[field];
    const right = field === 'tag' ? normalizeTag(incomingButton[field]) : incomingButton[field];
    return left !== right;
  });
}

function shareImportLooksLikeConflict(localButton, incomingButton, fields) {
  if (!fields.includes('name') || !fields.includes('text')) return false;
  const words = value => new Set((normalizeSearchText(value).match(/[\p{L}\p{N}]+/gu) || []).filter(word => word.length > 2));
  const localWords = words(localButton.name);
  const incomingWords = words(incomingButton.name);
  return ![...localWords].some(word => incomingWords.has(word));
}

function buildCustomImportComparison(localData, incomingData) {
  const localSections = new Map(localData.sections.map(section => [section.id, section]));
  const localButtons = new Map();
  const fingerprints = new Map();

  localData.sections.forEach(section => section.buttons.forEach(button => {
    const record = { button, section };
    localButtons.set(button.id, record);
    const fingerprint = shareImportButtonFingerprint(button);
    if (!fingerprints.has(fingerprint)) fingerprints.set(fingerprint, []);
    fingerprints.get(fingerprint).push(record);
  }));

  const sections = incomingData.sections.map(incomingSection => {
    const localSection = localSections.get(incomingSection.id);
    const sectionChanges = localSection
      ? ['name', 'collapsed', 'icon'].filter(field => (localSection[field] ?? null) !== (incomingSection[field] ?? null))
      : [];
    const sectionStatus = !localSection ? 'new' : sectionChanges.length ? 'altered' : 'same';

    const buttons = incomingSection.buttons.map(incomingButton => {
      const localRecord = localButtons.get(incomingButton.id);
      if (!localRecord) {
        const duplicates = fingerprints.get(shareImportButtonFingerprint(incomingButton)) || [];
        return {
          key: `${incomingSection.id}:${incomingButton.id}`,
          incoming: incomingButton,
          incomingSection,
          local: duplicates[0]?.button || null,
          localSection: duplicates[0]?.section || null,
          status: duplicates.length ? 'possible-duplicate' : 'new',
          fields: [],
          selected: false,
          decision: 'incoming'
        };
      }

      const fields = shareImportChangedFields(localRecord.button, incomingButton);
      const moved = localRecord.section.id !== incomingSection.id;
      let status = 'same';
      if (moved) status = 'moved';
      else if (shareImportLooksLikeConflict(localRecord.button, incomingButton, fields)) status = 'conflict';
      else if (fields.length) status = 'altered';

      return {
        key: `${incomingSection.id}:${incomingButton.id}`,
        incoming: incomingButton,
        incomingSection,
        local: localRecord.button,
        localSection: localRecord.section,
        status,
        fields,
        selected: false,
        decision: status === 'conflict' ? 'local' : 'incoming'
      };
    });

    return {
      incoming: incomingSection,
      local: localSection || null,
      status: sectionStatus,
      fields: sectionChanges,
      selected: false,
      buttons
    };
  });

  return { localData, incomingData, sections };
}

function customImportStatusMeta(status) {
  return {
    new: ['Novo', 'new'],
    altered: ['Alterado', 'changed'],
    moved: ['Movido', 'moved'],
    conflict: ['Conflito', 'conflict'],
    'possible-duplicate': ['Possível duplicata', 'duplicate'],
    same: ['Idêntico', 'same']
  }[status];
}

function customImportItems() {
  return customImportState?.sections.flatMap(section => section.buttons) || [];
}

function customImportCounts() {
  const counts = { newSections: 0, alteredSections: 0, newButtons: 0, changedButtons: 0, conflicts: 0, duplicates: 0, same: 0 };
  customImportState.sections.forEach(section => {
    if (section.status === 'new') counts.newSections++;
    if (section.status === 'altered') counts.alteredSections++;
    section.buttons.forEach(item => {
      if (item.status === 'new') counts.newButtons++;
      else if (['altered', 'moved'].includes(item.status)) counts.changedButtons++;
      else if (item.status === 'conflict') counts.conflicts++;
      else if (item.status === 'possible-duplicate') counts.duplicates++;
      else counts.same++;
    });
  });
  return counts;
}

function openCustomImport(localData, incomingData) {
  customImportReturnFocus = document.activeElement;
  customImportState = buildCustomImportComparison(localData, incomingData);
  document.getElementById('customImportShowSame').checked = false;
  document.getElementById('customImportSearch').value = '';
  document.getElementById('customImportTree').replaceChildren();
  document.getElementById('customImportPreset').value = 'new';
  applyCustomImportPreset('new');
  setCustomImportStep('compare');
  document.getElementById('customImportModal').classList.add('open');
  requestAnimationFrame(() => document.getElementById('customImportPreset')?.focus());
}

function closeCustomImport() {
  document.getElementById('customImportModal').classList.remove('open');
  customImportReturnFocus?.focus?.();
  customImportReturnFocus = null;
}

function applyCustomImportPreset(preset) {
  if (!customImportState) return;
  customImportState.sections.forEach(section => {
    section.selected = preset === 'new'
      ? section.status === 'new'
      : preset === 'update'
        ? ['new', 'altered'].includes(section.status)
        : false;

    section.buttons.forEach(item => {
      item.decision = item.status === 'conflict' ? 'local' : 'incoming';
      item.selected = preset === 'new'
        ? item.status === 'new'
        : preset === 'update'
          ? ['new', 'altered', 'moved'].includes(item.status)
          : false;
    });
  });
  renderCustomImportTree();
}

function renderCustomImportSummary() {
  const counts = customImportCounts();
  const entries = [
    ['newSections', 'Seções novas', 'new'],
    ['alteredSections', 'Seções alteradas', 'changed'],
    ['newButtons', 'Botões novos', 'new'],
    ['changedButtons', 'Alterados/movidos', 'moved'],
    ['conflicts', 'Conflitos', 'conflict'],
    ['duplicates', 'Possíveis duplicatas', 'duplicate'],
    ['same', 'Idênticos', 'same']
  ];
  document.getElementById('customImportSummary').innerHTML = entries
    .map(([key, label, style]) => `<div class="custom-import-count ${style}"><strong>${counts[key]}</strong><span>${label}</span></div>`)
    .join('');
}

function customImportDifferenceHtml(item) {
  if (!item.local) return '';
  const rows = [];
  const labels = { name: 'Nome', text: 'Texto', tag: 'Tag', vis: 'Visibilidade', customVis: 'Aparência' };
  item.fields.forEach(field => rows.push(`
    <div class="custom-import-diff-row">
      <strong>${labels[field]}</strong>
      <span><small>Meu</small>${escapeHtml(field === 'customVis' ? normalizeCustomVis(item.local.customVis).icon || 'Sem ícone' : item.local[field]) || '—'}</span>
      <span><small>Compartilhado</small>${escapeHtml(field === 'customVis' ? normalizeCustomVis(item.incoming.customVis).icon || 'Sem ícone' : item.incoming[field]) || '—'}</span>
    </div>`));
  if (item.localSection?.id !== item.incomingSection.id) rows.push(`
    <div class="custom-import-diff-row">
      <strong>Seção</strong>
      <span><small>Minha</small>${escapeHtml(item.localSection?.name || '—')}</span>
      <span><small>Compartilhada</small>${escapeHtml(item.incomingSection.name)}</span>
    </div>`);
  return rows.length ? `<div class="custom-import-diffs">${rows.join('')}</div>` : '';
}

function customImportItemMatchesSearch(item, query) {
  return [item.incoming.name, item.incoming.text, item.incoming.tag]
    .some(value => normalizeSearchText(value).includes(query));
}

function updateCustomImportToggleSectionsButton() {
  const button = document.getElementById('customImportToggleSectionsBtn');
  const sections = [...document.querySelectorAll('#customImportTree .custom-import-section')];
  if (!button) return;
  const hasExpanded = sections.some(section => section.open);
  button.textContent = hasExpanded ? 'Minimizar tudo' : 'Expandir tudo';
  button.disabled = sections.length === 0;
}

function toggleAllCustomImportSections() {
  const sections = [...document.querySelectorAll('#customImportTree .custom-import-section')];
  const shouldExpand = !sections.some(section => section.open);
  sections.forEach(section => { section.open = shouldExpand; });
  updateCustomImportToggleSectionsButton();
}

function filterCustomImportTree() {
  renderCustomImportTree({ resetScroll: true });
}

function renderCustomImportTree({ resetScroll = false } = {}) {
  if (!customImportState) return;
  renderCustomImportSummary();
  const tree = document.getElementById('customImportTree');
  const renderedSections = [...tree.querySelectorAll('.custom-import-section')];
  const hadRenderedSections = renderedSections.length > 0;
  const expandedSections = new Set(renderedSections.filter(section => section.open).map(section => section.dataset.sectionId));
  const previousScrollTop = tree.scrollTop;
  const showSame = document.getElementById('customImportShowSame').checked;
  const query = normalizeSearchText(document.getElementById('customImportSearch')?.value || '').trim();
  const html = customImportState.sections.map(section => {
    const sectionId = encodeURIComponent(section.incoming.id);
    const sectionMatches = !query || normalizeSearchText(section.incoming.name).includes(query);
    const visibleButtons = section.buttons.filter(item => {
      if (!showSame && item.status === 'same') return false;
      return sectionMatches || customImportItemMatchesSearch(item, query);
    });
    if (query && !sectionMatches && !visibleButtons.length) return '';
    if (!visibleButtons.length && section.status === 'same') return '';
    const sectionMeta = customImportStatusMeta(section.status);
    const actionableButtons = section.buttons.filter(item => item.status !== 'same');
    const sectionActionable = section.status !== 'same' || actionableButtons.length > 0;
    const sectionChecked = section.selected || (actionableButtons.length > 0 && actionableButtons.every(item => item.selected));
    const sectionOpen = query || !hadRenderedSections || expandedSections.has(sectionId);
    const buttonRows = visibleButtons.map(item => {
      const meta = customImportStatusMeta(item.status);
      const key = encodeURIComponent(item.key);
      const actionable = item.status !== 'same';
      const checked = item.selected ? ' checked' : '';
      const decision = item.status === 'conflict' || item.status === 'possible-duplicate'
        ? `<select class="custom-import-decision" onchange="setCustomImportDecision('${key}', this.value)">
            <option value="local"${item.decision === 'local' ? ' selected' : ''}>Manter o meu</option>
            <option value="incoming"${item.decision === 'incoming' ? ' selected' : ''}>Usar compartilhado</option>
            <option value="copy"${item.decision === 'copy' ? ' selected' : ''}>Criar uma cópia</option>
          </select>`
        : '';
      const note = item.status === 'possible-duplicate'
        ? `<small class="custom-import-item-note">Parece igual a “${escapeHtml(item.local?.name)}”, mas possui outro ID.</small>`
        : item.status === 'moved'
          ? `<small class="custom-import-item-note">${escapeHtml(item.localSection?.name)} → ${escapeHtml(item.incomingSection.name)}</small>`
          : '';
      return `<div class="custom-import-item ${meta[1]}">
        <div class="custom-import-item-main">
          <label><input type="checkbox"${checked}${actionable ? '' : ' disabled'} onchange="toggleCustomImportItem('${key}', this.checked)"><span>${escapeHtml(item.incoming.name) || 'Botão sem nome'}</span></label>
          <span class="custom-import-status ${meta[1]}">${meta[0]}</span>
          ${decision}
        </div>
        ${note}
        ${customImportDifferenceHtml(item)}
      </div>`;
    }).join('');

    return `<details class="custom-import-section" data-section-id="${sectionId}"${sectionOpen ? ' open' : ''}>
      <summary>
        <label onclick="event.stopPropagation()"><input type="checkbox"${sectionChecked ? ' checked' : ''}${sectionActionable ? '' : ' disabled'} onchange="toggleCustomImportSection('${sectionId}', this.checked)"></label>
        <span class="custom-import-section-name">${escapeHtml(section.incoming.name)}</span>
        <span class="custom-import-status ${sectionMeta[1]}">${sectionMeta[0]}</span>
        <small>${visibleButtons.length} item(ns)</small>
      </summary>
      <div class="custom-import-section-items">${buttonRows || '<p class="custom-import-empty">Nenhuma diferença nos botões.</p>'}</div>
    </details>`;
  }).join('');
  tree.innerHTML = html || `<p class="custom-import-empty">${query ? 'Nenhum item corresponde à pesquisa.' : 'Os dois conjuntos de dados são idênticos.'}</p>`;
  tree.scrollTop = resetScroll ? 0 : previousScrollTop;
  updateCustomImportToggleSectionsButton();
}

function findCustomImportSection(encodedId) {
  const id = decodeURIComponent(encodedId);
  return customImportState.sections.find(section => section.incoming.id === id);
}

function findCustomImportItem(encodedKey) {
  const key = decodeURIComponent(encodedKey);
  return customImportItems().find(item => item.key === key);
}

function markCustomImportManual() {
  document.getElementById('customImportPreset').value = 'manual';
}

function toggleCustomImportSection(encodedId, checked) {
  const section = findCustomImportSection(encodedId);
  if (!section) return;
  section.selected = checked && section.status !== 'same';
  section.buttons.forEach(item => {
    if (item.status === 'same') return;
    item.selected = checked && !['conflict', 'possible-duplicate'].includes(item.status);
    if (!checked) item.decision = item.status === 'conflict' ? 'local' : item.decision;
  });
  markCustomImportManual();
  renderCustomImportTree();
}

function toggleCustomImportItem(encodedKey, checked) {
  const item = findCustomImportItem(encodedKey);
  if (!item) return;
  item.selected = checked;
  if (checked && item.decision === 'local') item.decision = 'incoming';
  if (!checked && item.status === 'conflict') item.decision = 'local';
  markCustomImportManual();
  renderCustomImportTree();
}

function setCustomImportDecision(encodedKey, decision) {
  const item = findCustomImportItem(encodedKey);
  if (!item) return;
  item.decision = decision;
  item.selected = decision !== 'local';
  markCustomImportManual();
  renderCustomImportTree();
}

function selectedCustomImportOperations() {
  const operations = [];
  customImportState.sections.forEach(section => {
    if (section.selected && section.status === 'new') operations.push({ type: 'section-new', section });
    else if (section.selected && section.status === 'altered') operations.push({ type: 'section-update', section });
    section.buttons.forEach(item => {
      if (!item.selected || item.decision === 'local' || item.status === 'same') return;
      operations.push({ type: item.decision === 'copy' ? 'button-copy' : `button-${item.status}`, item });
    });
  });
  return operations;
}

function renderCustomImportReview() {
  const operations = selectedCustomImportOperations();
  const labels = {
    'section-new': 'Adicionar seção',
    'section-update': 'Atualizar seção',
    'button-new': 'Adicionar botão',
    'button-altered': 'Atualizar botão',
    'button-moved': 'Mover/atualizar botão',
    'button-conflict': 'Substituir pelo compartilhado',
    'button-possible-duplicate': 'Adicionar possível duplicata',
    'button-copy': 'Criar cópia'
  };
  const totals = operations.reduce((result, operation) => {
    const group = operation.type.startsWith('section') ? 'sections' : 'buttons';
    result[group]++;
    return result;
  }, { sections: 0, buttons: 0 });

  document.getElementById('customImportReviewSummary').innerHTML = `
    <strong>${operations.length ? 'Importação pronta para revisão' : 'Nada selecionado'}</strong>
    <span>${totals.sections} ação(ões) em seções • ${totals.buttons} ação(ões) em botões</span>`;
  document.getElementById('customImportReviewList').innerHTML = operations.length
    ? operations.map(operation => {
        const target = operation.section?.incoming || operation.item?.incoming;
        const section = operation.section?.incoming || operation.item?.incomingSection;
        return `<div class="custom-import-review-item"><span>${labels[operation.type] || 'Importar'}</span><strong>${escapeHtml(target.name)}</strong><small>${operation.type.startsWith('section') ? '' : escapeHtml(section.name)}</small></div>`;
      }).join('')
    : '<p class="custom-import-empty">Volte à comparação e selecione pelo menos uma alteração.</p>';
  document.getElementById('customImportApplyBtn').disabled = operations.length === 0;
}

function setCustomImportStep(step) {
  const review = step === 'review';
  document.getElementById('customImportComparePanel').hidden = review;
  document.getElementById('customImportReviewPanel').hidden = !review;
  document.getElementById('customImportCompareTab').classList.toggle('active', !review);
  document.getElementById('customImportReviewTab').classList.toggle('active', review);
  document.getElementById('customImportCompareTab').setAttribute('aria-selected', String(!review));
  document.getElementById('customImportReviewTab').setAttribute('aria-selected', String(review));
  document.getElementById('customImportBackBtn').hidden = !review;
  document.getElementById('customImportNextBtn').hidden = review;
  document.getElementById('customImportApplyBtn').hidden = !review;
  if (review) renderCustomImportReview();
}

function customImportUniqueId(prefix, usedIds) {
  let id;
  do {
    id = `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

function buildCustomImportResult() {
  const result = JSON.parse(JSON.stringify(customImportState.localData));
  const sectionMap = new Map(result.sections.map(section => [section.id, section]));
  const usedSectionIds = new Set(sectionMap.keys());
  const usedButtonIds = new Set(result.sections.flatMap(section => section.buttons.map(button => button.id)));

  function ensureTargetSection(comparisonSection) {
    const incoming = comparisonSection.incoming;
    let target = sectionMap.get(incoming.id);
    if (!target) {
      target = { id: incoming.id, name: incoming.name, ...(incoming.icon ? { icon: incoming.icon } : {}), collapsed: incoming.collapsed, buttons: [] };
      if (usedSectionIds.has(target.id)) target.id = customImportUniqueId('s', usedSectionIds);
      else usedSectionIds.add(target.id);
      result.sections.push(target);
      sectionMap.set(incoming.id, target);
    }
    return target;
  }

  customImportState.sections.forEach(section => {
    const hasSelectedButtons = section.buttons.some(item => item.selected && item.decision !== 'local' && item.status !== 'same');
    if (section.status === 'new' && (section.selected || hasSelectedButtons)) ensureTargetSection(section);
    if (section.status === 'altered' && section.selected) {
      const target = sectionMap.get(section.incoming.id);
      if (target) {
        target.name = section.incoming.name;
        target.collapsed = section.incoming.collapsed;
        if (section.incoming.icon) target.icon = section.incoming.icon;
        else delete target.icon;
      }
    }

    section.buttons.forEach(item => {
      if (!item.selected || item.decision === 'local' || item.status === 'same') return;
      const target = ensureTargetSection(section);
      const incoming = JSON.parse(JSON.stringify(item.incoming));

      if (item.decision === 'copy') {
        incoming.id = customImportUniqueId('b', usedButtonIds);
        target.buttons.push(incoming);
        return;
      }

      if (['altered', 'moved', 'conflict'].includes(item.status)) {
        result.sections.forEach(resultSection => {
          resultSection.buttons = resultSection.buttons.filter(button => button.id !== incoming.id);
        });
      } else if (usedButtonIds.has(incoming.id)) {
        incoming.id = customImportUniqueId('b', usedButtonIds);
      } else {
        usedButtonIds.add(incoming.id);
      }
      target.buttons.push(incoming);
    });
  });

  const tags = new Set((result.tags || []).map(normalizeTag).filter(Boolean));
  result.sections.forEach(section => section.buttons.forEach(button => {
    button.tag = normalizeTag(button.tag);
    if (button.tag) tags.add(button.tag);
  }));
  result.tags = [...tags].sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
  return normalizeImportedData(result);
}

async function applyCustomImport() {
  const operations = selectedCustomImportOperations();
  if (!operations.length) return;
  try {
    const result = buildCustomImportResult();
    saveShareImportUndoSnapshot();
    localStorage.setItem('blu:data', JSON.stringify(result));
    notify('Importação personalizada concluída! Redirecionando…');
    setTimeout(() => { window.location.replace('/'); }, 700);
  } catch (error) {
    console.error('Erro na importação personalizada:', error);
    notify('Não foi possível concluir a importação personalizada.', 'err');
  }
}

document.addEventListener('click', event => {
  if (event.target?.id === 'customImportModal') closeCustomImport();
});

document.getElementById('customImportTree')?.addEventListener('toggle', event => {
  if (event.target.matches('.custom-import-section')) updateCustomImportToggleSectionsButton();
}, true);

document.addEventListener('keydown', event => {
  const modalBackground = document.getElementById('customImportModal');
  if (!modalBackground?.classList.contains('open')) return;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e'
      && !document.getElementById('customImportComparePanel').hidden) {
    event.preventDefault();
    toggleAllCustomImportSections();
    return;
  }

  if (event.key === 'Escape') {
    closeCustomImport();
    return;
  }

  if (event.key === 'Tab') {
    const focusable = [...modalBackground.querySelectorAll('button:not([disabled]):not([hidden]), select:not([disabled]), input:not([disabled]), summary')]
      .filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
