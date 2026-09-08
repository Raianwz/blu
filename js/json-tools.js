// ==========================================================
// Diagnóstico, reparo seguro e visualização do JSON atual
// ==========================================================

let activeJsonModalTab = 'diagnostic';
let jsonIntegrityIdSequence = 0;

function openJsonModal(tab = 'diagnostic') {
  setJsonModalTab(tab);
  openModal('jsonModal');
}

function setJsonModalTab(tab) {
  activeJsonModalTab = tab === 'view' ? 'view' : 'diagnostic';
  const isView = activeJsonModalTab === 'view';
  const diagnosticTab = document.getElementById('jsonDiagnosticTab');
  const viewTab = document.getElementById('jsonViewTab');
  const diagnosticPanel = document.getElementById('jsonDiagnosticPanel');
  const viewPanel = document.getElementById('jsonViewPanel');
  const title = document.getElementById('jsonModalTitle');
  const modal = document.querySelector('#jsonModal .json-modal');

  modal?.classList.toggle('view-active', isView);
  diagnosticTab?.classList.toggle('active', !isView);
  viewTab?.classList.toggle('active', isView);
  diagnosticTab?.setAttribute('aria-selected', String(!isView));
  viewTab?.setAttribute('aria-selected', String(isView));
  diagnosticPanel?.classList.toggle('active', !isView);
  viewPanel?.classList.toggle('active', isView);
  if (diagnosticPanel) diagnosticPanel.hidden = isView;
  if (viewPanel) viewPanel.hidden = !isView;
  if (title) title.textContent = isView ? '📄 Visualizar JSON' : '📄 Diagnóstico dos Dados';

  if (isView) refreshJsonView();
  else renderJsonDiagnostics();
}

function getJsonDiagnostics(state = collectState()) {
  const issues = [];
  const sectionIds = new Set();
  const buttonIds = new Set();
  const knownTags = new Set(state.tags || []);
  const validVisibilities = new Set(['public', 'private', 'other']);

  const canonicalTags = new Set();
  (state.tags || []).forEach(tag => {
    const canonical = normalizeTag(tag);
    if (!canonical) {
      issues.push({ kind: 'tag', repairable: true, message: 'A lista contém uma tag vazia.' });
    } else if (canonical !== tag) {
      issues.push({ kind: 'tag', repairable: true, message: `Tag não normalizada: “${tag}” → “${canonical}”.` });
    } else if (canonicalTags.has(canonical)) {
      issues.push({ kind: 'tag', repairable: true, message: `Tag duplicada na lista: “${tag}”.` });
    }
    if (canonical) canonicalTags.add(canonical);
  });

  (state.sections || []).forEach((section, sectionIndex) => {
    const sectionLabel = section.name?.trim() || `Seção ${sectionIndex + 1}`;
    const sectionId = String(section.id || '');

    if (!sectionId) {
      issues.push({ kind: 'id', repairable: true, message: `“${sectionLabel}” está sem ID.` });
    } else if (sectionIds.has(sectionId)) {
      issues.push({ kind: 'id', repairable: true, message: `ID de seção duplicado: “${sectionId}”.` });
    }
    if (sectionId) sectionIds.add(sectionId);

    if (!section.name?.trim()) {
      issues.push({ kind: 'content', repairable: false, message: `Seção ${sectionId || sectionIndex + 1} está sem nome.` });
    }

    (section.buttons || []).forEach((button, buttonIndex) => {
      const buttonLabel = button.name?.trim() || `Botão ${buttonIndex + 1} de “${sectionLabel}”`;
      const buttonId = String(button.id || '');

      if (!buttonId) {
        issues.push({ kind: 'id', repairable: true, message: `“${buttonLabel}” está sem ID.` });
      } else if (buttonIds.has(buttonId)) {
        issues.push({ kind: 'id', repairable: true, message: `ID de botão duplicado: “${buttonId}”.` });
      }
      if (buttonId) buttonIds.add(buttonId);

      if (!button.name?.trim()) {
        issues.push({ kind: 'content', repairable: false, message: `Botão ${buttonId || buttonIndex + 1} em “${sectionLabel}” está sem nome.` });
      }
      if (!button.text?.trim()) {
        issues.push({ kind: 'content', repairable: false, message: `“${buttonLabel}” está sem texto para copiar.` });
      }
      if (!validVisibilities.has(button.vis)) {
        issues.push({ kind: 'visibility', repairable: true, message: `“${buttonLabel}” tem visibilidade inválida: “${button.vis || 'vazia'}”.` });
      }
      if (button.tag && normalizeTag(button.tag) !== button.tag) {
        issues.push({ kind: 'tag', repairable: true, message: `“${buttonLabel}” usa uma tag não normalizada: “${button.tag}”.` });
      } else if (button.tag && !knownTags.has(button.tag)) {
        issues.push({ kind: 'tag', repairable: true, message: `“${buttonLabel}” usa a tag não registrada “${button.tag}”.` });
      }
    });
  });

  const buttonCount = (state.sections || []).reduce((total, section) => total + (section.buttons?.length || 0), 0);
  return {
    state,
    issues,
    repairableCount: issues.filter(issue => issue.repairable).length,
    counts: { sections: state.sections?.length || 0, buttons: buttonCount, tags: state.tags?.length || 0 }
  };
}

function createJsonIssueGroup(title, issueList) {
  const section = document.createElement('section');
  section.className = 'json-diagnostic-section';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const list = document.createElement('ul');

  issueList.forEach(issue => {
    const item = document.createElement('li');
    item.textContent = issue.message;
    list.appendChild(item);
  });

  section.append(heading, list);
  return section;
}

function getUnknownJsonFields(state = collectState()) {
  const unknown = [];
  const inspect = (value, allowedKeys, path) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    Object.keys(value).forEach(key => {
      if (!allowedKeys.includes(key)) unknown.push(`${path}.${key}`);
    });
  };

  inspect(state, ['tags', 'sections'], 'raiz');
  (state.sections || []).forEach((section, sectionIndex) => {
    inspect(section, ['id', 'name', 'collapsed', 'buttons'], `sections[${sectionIndex}]`);
    (section.buttons || []).forEach((button, buttonIndex) => {
      inspect(button, ['id', 'name', 'text', 'tag', 'vis'], `sections[${sectionIndex}].buttons[${buttonIndex}]`);
    });
  });
  return unknown;
}

function getJsonReconstruction(state = collectState()) {
  const unknownFields = getUnknownJsonFields(state);
  const normalized = normalizeImportedData(state);
  const { state: rebuilt, changes: repairChanges } = getSafelyRepairedJsonState(normalized);
  return {
    state: rebuilt,
    unknownFields,
    repairChanges,
    changed: JSON.stringify(state) !== JSON.stringify(rebuilt)
  };
}

function createJsonToolButton({ label, description, icon, action, disabled = false, advanced = false }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `json-tool-action${advanced ? ' advanced' : ''}`;
  button.disabled = disabled;
  button.innerHTML = `${iconSvg(icon)}<span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span>`;
  button.onclick = action;
  return button;
}

function renderJsonDiagnostics() {
  const summary = document.getElementById('jsonDiagnosticSummary');
  const issuesWrap = document.getElementById('jsonDiagnosticIssues');
  if (!summary || !issuesWrap) return;

  const diagnostics = getJsonDiagnostics();
  const optimization = getJsonOptimization(diagnostics.state);
  const reconstruction = getJsonReconstruction(diagnostics.state);
  const { sections, buttons, tags: tagCount } = diagnostics.counts;

  summary.className = `json-diagnostic-summary ${diagnostics.issues.length ? 'warning' : 'ok'}`;
  summary.innerHTML = `<strong>${sections}</strong> seção(ões) · <strong>${buttons}</strong> botão(ões) · <strong>${tagCount}</strong> tag(s)<br>${diagnostics.issues.length ? `${diagnostics.issues.length} problema(s) encontrado(s).` : 'Estrutura verificada — tudo certo!'}`;
  issuesWrap.innerHTML = '';

  const toolbox = document.createElement('section');
  toolbox.className = 'json-toolbox';
  toolbox.innerHTML = '<div class="json-toolbox-heading"><strong>Manutenção do JSON</strong><span>Ações compatíveis com Desfazer</span></div>';

  const safeLabel = document.createElement('div');
  safeLabel.className = 'json-toolbox-label';
  safeLabel.textContent = 'Ações seguras';
  const safeGrid = document.createElement('div');
  safeGrid.className = 'json-tool-grid';
  safeGrid.append(
    createJsonToolButton({
      label: 'Corrigir',
      description: diagnostics.repairableCount ? `${diagnostics.repairableCount} ajuste(s) disponível(is)` : 'Nenhum problema reparável',
      icon: 'wrench', action: repairJsonIntegrity, disabled: diagnostics.repairableCount === 0
    }),
    createJsonToolButton({
      label: 'Otimizar',
      description: optimization.changed ? `${formatFileSize(optimization.compactBytes)} após otimização` : 'Estrutura já otimizada',
      icon: 'unfold_vertical', action: optimizeJsonData, disabled: !optimization.changed
    }),
    createJsonToolButton({
      label: 'Copiar relatório', description: 'Resumo técnico sem o conteúdo',
      icon: 'copy', action: copyJsonDiagnosticReport
    })
  );

  const advancedLabel = document.createElement('div');
  advancedLabel.className = 'json-toolbox-label advanced';
  advancedLabel.textContent = 'Ação avançada';
  const advancedGrid = document.createElement('div');
  advancedGrid.className = 'json-tool-grid advanced';
  advancedGrid.appendChild(createJsonToolButton({
    label: 'Reconstruir estrutura',
    description: reconstruction.unknownFields.length
      ? `${reconstruction.unknownFields.length} campo(s) extra(s) serão removidos`
      : reconstruction.changed ? 'Recria o esquema oficial do Blû' : 'Nenhum campo desconhecido',
    icon: 'file_check', action: rebuildJsonStructure, disabled: !reconstruction.changed, advanced: true
  }));
  toolbox.append(safeLabel, safeGrid, advancedLabel, advancedGrid);
  issuesWrap.appendChild(toolbox);

  const groups = [
    ['IDs', diagnostics.issues.filter(issue => issue.kind === 'id')],
    ['Conteúdo incompleto', diagnostics.issues.filter(issue => issue.kind === 'content')],
    ['Visibilidade', diagnostics.issues.filter(issue => issue.kind === 'visibility')],
    ['Tags', diagnostics.issues.filter(issue => issue.kind === 'tag')]
  ];
  groups.forEach(([title, groupIssues]) => {
    if (groupIssues.length) issuesWrap.appendChild(createJsonIssueGroup(title, groupIssues));
  });
}

function createJsonIntegrityId(prefix, usedIds) {
  let candidate;
  do {
    candidate = `${prefix}${Date.now().toString(36)}-${++jsonIntegrityIdSequence}`;
  } while (usedIds.has(candidate));
  usedIds.add(candidate);
  return candidate;
}

function getSafelyRepairedJsonState(state) {
  const repaired = JSON.parse(JSON.stringify(state));
  const sectionIds = new Set();
  const buttonIds = new Set();
  const validVisibilities = new Set(['public', 'private', 'other']);
  let changes = 0;

  const normalizedTags = [];
  repaired.tags.forEach(tag => {
    const canonical = normalizeTag(tag);
    if (canonical && !normalizedTags.includes(canonical)) normalizedTags.push(canonical);
  });
  if (JSON.stringify(normalizedTags) !== JSON.stringify(repaired.tags)) {
    repaired.tags = normalizedTags;
    changes++;
  }

  repaired.sections.forEach(section => {
    const sectionId = String(section.id || '');
    if (!sectionId || sectionIds.has(sectionId)) {
      section.id = createJsonIntegrityId('s', sectionIds);
      changes++;
    } else {
      sectionIds.add(sectionId);
    }

    section.buttons.forEach(button => {
      const buttonId = String(button.id || '');
      if (!buttonId || buttonIds.has(buttonId)) {
        button.id = createJsonIntegrityId('b', buttonIds);
        changes++;
      } else {
        buttonIds.add(buttonId);
      }

      if (!validVisibilities.has(button.vis)) {
        button.vis = 'other';
        changes++;
      }

      const canonicalButtonTag = normalizeTag(button.tag);
      if (canonicalButtonTag !== button.tag) {
        button.tag = canonicalButtonTag;
        changes++;
      }
      if (button.tag && !repaired.tags.includes(button.tag)) {
        repaired.tags.push(button.tag);
        changes++;
      }
    });
  });

  return { state: repaired, changes };
}

function getJsonOptimization(state = collectState()) {
  const original = JSON.parse(JSON.stringify(state));
  const { state: repaired, changes: repairChanges } = getSafelyRepairedJsonState(original);
  const usedTags = new Set();
  repaired.sections.forEach(section => {
    section.buttons.forEach(button => {
      if (button.tag) usedTags.add(button.tag);
    });
  });

  const tagCountBefore = repaired.tags.length;
  repaired.tags = repaired.tags
    .filter(tag => usedTags.has(tag))
    .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base', numeric: true }));

  const formattedJson = JSON.stringify(original, null, 2);
  const compactJson = JSON.stringify(repaired);
  return {
    state: repaired,
    compactJson,
    formattedBytes: getUtf8ByteLength(formattedJson),
    compactBytes: getUtf8ByteLength(compactJson),
    repairChanges,
    removedOrphanTags: tagCountBefore - repaired.tags.length,
    changed: JSON.stringify(original) !== compactJson
  };
}

async function optimizeJsonData() {
  const optimization = getJsonOptimization();
  if (!optimization.changed) {
    notify('Os dados já estão estruturalmente otimizados');
    return;
  }

  const details = [];
  if (optimization.repairChanges) details.push(`${optimization.repairChanges} correção(ões) estrutural(is)`);
  if (optimization.removedOrphanTags) details.push(`${optimization.removedOrphanTags} tag(s) sem uso`);
  const ok = await confirmDialog(
    `Aplicar a otimização segura?\n\n${details.join(' · ')}\n\nTags apenas parecidas não serão mescladas e os textos, incluindo suas quebras de linha, não serão alterados.`,
    { title: 'Otimizar JSON', confirmText: 'Otimizar' }
  );
  if (!ok) return;

  pushHistory();
  restoreState(optimization.state);
  renderJsonDiagnostics();
  refreshJsonView();
  notify('JSON otimizado!');
}

async function repairJsonIntegrity() {
  const { state, changes } = getSafelyRepairedJsonState(collectState());
  if (!changes) {
    notify('Nenhuma correção automática necessária');
    renderJsonDiagnostics();
    return;
  }

  const ok = await confirmDialog(
    `Aplicar ${changes} correção(ões) segura(s)? IDs ausentes/duplicados serão regenerados e visibilidades inválidas passarão para “Outro”.`,
    { title: '🛠️ Corrigir JSON', confirmText: 'Corrigir' }
  );
  if (!ok) return;

  pushHistory();
  restoreState(state);
  renderJsonDiagnostics();
  refreshJsonView();
  notify('JSON corrigido!');
}

async function rebuildJsonStructure() {
  const reconstruction = getJsonReconstruction();
  if (!reconstruction.changed) {
    notify('O JSON já usa apenas a estrutura oficial do Blû');
    return;
  }

  const removedText = reconstruction.unknownFields.length
    ? `${reconstruction.unknownFields.length} campo(s) desconhecido(s) serão removido(s).`
    : 'A estrutura será recriada usando somente os campos reconhecidos pelo Blû.';
  const ok = await confirmDialog(
    `${removedText}\n\nEssa limpeza preserva seções, botões, textos, tags e visibilidade. Você poderá desfazer com Ctrl+Z.`,
    { title: 'Reconstruir estrutura', danger: true, confirmText: 'Reconstruir' }
  );
  if (!ok) return;

  pushHistory();
  restoreState(reconstruction.state);
  renderJsonDiagnostics();
  refreshJsonView();
  notify('Estrutura JSON reconstruída!');
}

async function copyJsonDiagnosticReport() {
  const diagnostics = getJsonDiagnostics();
  const optimization = getJsonOptimization(diagnostics.state);
  const unknownFields = getUnknownJsonFields(diagnostics.state);
  const formattedBytes = getUtf8ByteLength(JSON.stringify(diagnostics.state, null, 2));
  const lines = [
    'Blû — Diagnóstico JSON',
    `Seções: ${diagnostics.counts.sections}`,
    `Botões: ${diagnostics.counts.buttons}`,
    `Tags: ${diagnostics.counts.tags}`,
    `Tamanho formatado: ${formatFileSize(formattedBytes)}`,
    `Tamanho compacto: ${formatFileSize(optimization.compactBytes)}`,
    `Problemas: ${diagnostics.issues.length}`,
    `Correções seguras: ${diagnostics.repairableCount}`,
    `Campos desconhecidos: ${unknownFields.length}`
  ];
  diagnostics.issues.forEach(issue => lines.push(`- ${issue.message}`));
  unknownFields.forEach(path => lines.push(`- Campo extra: ${path}`));

  try {
    await copyToClipboard(lines.join('\n'));
    notify('Relatório do JSON copiado!');
  } catch (error) {
    console.error('Erro ao copiar diagnóstico JSON:', error);
    notify('Não foi possível copiar o relatório', 'err');
  }
}

function refreshJsonView() {
  const textarea = document.getElementById('jsonViewText');
  const meta = document.getElementById('jsonViewMeta');
  const state = collectState();
  const formattedJson = JSON.stringify(state, null, 2);
  const optimization = getJsonOptimization(state);
  if (textarea) textarea.value = formattedJson;
  if (meta) {
    const formattedBytes = getUtf8ByteLength(formattedJson);
    const savedBytes = Math.max(0, formattedBytes - optimization.compactBytes);
    const savedPercent = formattedBytes ? Math.round((savedBytes / formattedBytes) * 100) : 0;
    meta.textContent = `Tamanho formatado: ${formatFileSize(formattedBytes)} · Compacto: ${formatFileSize(optimization.compactBytes)} · Economia: ${formatFileSize(savedBytes)} (${savedPercent}%)`;
  }
}

async function copyJsonView() {
  refreshJsonView();
  const json = document.getElementById('jsonViewText')?.value || '';
  try {
    await copyToClipboard(json);
    notify('JSON copiado!');
  } catch (error) {
    console.error('Erro ao copiar JSON:', error);
    notify('Não foi possível copiar o JSON', 'err');
  }
}

async function copyOptimizedJson() {
  const optimization = getJsonOptimization();
  try {
    await copyToClipboard(optimization.compactJson);
    notify(`JSON compacto copiado (${formatFileSize(optimization.compactBytes)})!`);
  } catch (error) {
    console.error('Erro ao copiar JSON compacto:', error);
    notify('Não foi possível copiar o JSON compacto', 'err');
  }
}
