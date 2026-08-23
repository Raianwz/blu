// ==========================================================
// Exportacao personalizada de dados
// ==========================================================

const CUSTOM_EXPORT_PRESETS = {
  index: { format: 'json', scope: 'all', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'includeEmpty'] },
  full: { format: 'json', scope: 'all', structure: 'hierarchy', fields: ['globalTags', 'sections', 'sectionId', 'sectionName', 'sectionCollapsed', 'buttons', 'buttonId', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'includeEmpty'] },
  content: { format: 'json', scope: 'all', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility'] },
  names: { format: 'text', scope: 'all', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName'] },
  public: { format: 'json', scope: 'public', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility'] },
  favorites: { format: 'json', scope: 'favorites', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'buttonFavorite'] },
  spreadsheet: { format: 'csv', scope: 'all', structure: 'flat', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'buttonSection'] },
  documentation: { format: 'markdown', scope: 'all', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility'] }
};

let customExportScopeSelections = { sections: new Set(), tags: new Set() };

function customExportEl(id) { return document.getElementById(id); }
function getCustomExportFields() {
  return new Set([...document.querySelectorAll('[data-export-field]:checked')].map(input => input.dataset.exportField));
}

function openCustomExportModal() {
  populateCustomExportScopeOptions(true);
  applyCustomExportPreset('index');
  setCustomExportTab('config');
  openModal('customExportModal');
}

function setCustomExportTab(tab) {
  const preview = tab === 'preview';
  customExportEl('customExportConfigPanel').hidden = preview;
  customExportEl('customExportPreviewPanel').hidden = !preview;
  customExportEl('customExportConfigTab').classList.toggle('active', !preview);
  customExportEl('customExportPreviewTab').classList.toggle('active', preview);
  customExportEl('customExportConfigTab').setAttribute('aria-selected', String(!preview));
  customExportEl('customExportPreviewTab').setAttribute('aria-selected', String(preview));
  if (preview) updateCustomExportPreview();
}

function applyCustomExportPreset(name) {
  const preset = CUSTOM_EXPORT_PRESETS[name];
  if (!preset) return;
  customExportEl('customExportPreset').value = name;
  customExportEl('customExportFormat').value = preset.format;
  customExportEl('customExportScope').value = preset.scope;
  customExportEl('customExportStructure').value = preset.structure;
  document.querySelectorAll('[data-export-field]').forEach(input => { input.checked = preset.fields.includes(input.dataset.exportField); });
  customExportEl('customExportSectionState').value = 'current';
  customExportEl('customExportOrder').value = 'current';
  ['customExportRemoveEmpty', 'customExportNormalizeTags', 'customExportStripEmoji', 'customExportSimplifyBreaks', 'customExportCompactJson'].forEach(id => { customExportEl(id).checked = false; });
  customExportEl('customExportCsvBom').checked = true;
  updateCustomExportUI(false);
}

function markCustomExportCustomized() {
  customExportEl('customExportPreset').value = 'custom';
  updateCustomExportUI(false);
}

function updateCustomExportUI(markCustom = true) {
  if (markCustom) customExportEl('customExportPreset').value = 'custom';
  const format = customExportEl('customExportFormat').value;
  const scope = customExportEl('customExportScope').value;
  const searchOption = customExportEl('customExportScope').querySelector('[value="search"]');
  searchOption.disabled = !customExportEl('searchInput')?.value.trim();
  if (scope === 'search' && searchOption.disabled) customExportEl('customExportScope').value = 'all';
  customExportEl('customExportDelimiterWrap').hidden = format !== 'csv';
  customExportEl('customExportCompactJson').closest('label').hidden = format !== 'json';
  customExportEl('customExportCsvBom').closest('label').hidden = format !== 'csv';
  customExportEl('customExportStructure').disabled = format === 'csv';
  if (format === 'csv') customExportEl('customExportStructure').value = 'flat';
  populateCustomExportScopeOptions();
  updateCustomExportDependencies();
  updateCustomExportPreview();
}

function updateCustomExportDependencies() {
  const fields = getCustomExportFields();
  const sectionChildren = ['sectionId', 'sectionName', 'sectionCollapsed', 'sectionCount'];
  const buttonChildren = ['buttonId', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'buttonSection', 'buttonFavorite', 'buttonStats'];
  document.querySelectorAll('[data-export-field]').forEach(input => {
    const disabled = (sectionChildren.includes(input.dataset.exportField) && !fields.has('sections'))
      || (buttonChildren.includes(input.dataset.exportField) && !fields.has('buttons'));
    input.disabled = disabled;
    input.closest('label').classList.toggle('disabled', disabled);
  });
}

function toggleCustomExportFields(group, checked) {
  document.querySelectorAll(`[data-field-group="${group}"]`).forEach(input => { input.checked = checked; });
  markCustomExportCustomized();
}

function populateCustomExportScopeOptions(reset = false) {
  const scope = customExportEl('customExportScope')?.value;
  if (!scope) return;
  const panel = customExportEl('customExportScopeOptions');
  const list = customExportEl('customExportScopeList');
  const selectable = scope === 'sections' || scope === 'tags';
  panel.hidden = !selectable;
  if (!selectable) return;
  const state = collectState();
  const items = scope === 'sections'
    ? state.sections.map(section => ({ value: section.id, label: section.name }))
    : [...new Set(state.tags.concat(state.sections.flatMap(section => section.buttons.map(button => button.tag))).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR')).map(tag => ({ value: tag, label: tag }));
  if (reset || !customExportScopeSelections[scope].size) customExportScopeSelections[scope] = new Set(items.map(item => item.value));
  customExportEl('customExportScopeTitle').textContent = scope === 'sections' ? 'Selecionar seções' : 'Selecionar tags';
  list.innerHTML = items.length ? items.map(item => `<label><input type="checkbox" value="${escapeHtml(item.value)}" ${customExportScopeSelections[scope].has(item.value) ? 'checked' : ''}> ${escapeHtml(item.label)}</label>`).join('') : '<span class="muted">Nenhum item disponível.</span>';
  list.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
    if (input.checked) customExportScopeSelections[scope].add(input.value);
    else customExportScopeSelections[scope].delete(input.value);
    customExportEl('customExportPreset').value = 'custom';
    updateCustomExportPreview();
  }));
}

function toggleCustomExportScopeItems(checked) {
  const scope = customExportEl('customExportScope').value;
  customExportEl('customExportScopeList').querySelectorAll('input').forEach(input => {
    input.checked = checked;
    if (checked) customExportScopeSelections[scope].add(input.value);
    else customExportScopeSelections[scope].delete(input.value);
  });
  customExportEl('customExportPreset').value = 'custom';
  updateCustomExportPreview();
}

function cleanCustomExportValue(value, options, isName = false) {
  let result = String(value ?? '');
  if (options.simplifyBreaks) result = result.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (isName && options.stripEmoji) result = result.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').replace(/\s{2,}/g, ' ').trim();
  return result;
}

function getCustomExportConfig() {
  return {
    format: customExportEl('customExportFormat').value,
    scope: customExportEl('customExportScope').value,
    structure: customExportEl('customExportStructure').value,
    fields: getCustomExportFields(),
    state: customExportEl('customExportSectionState').value,
    order: customExportEl('customExportOrder').value,
    delimiter: customExportEl('customExportDelimiter').value === 'comma' ? ',' : ';',
    removeEmpty: customExportEl('customExportRemoveEmpty').checked,
    normalizeTags: customExportEl('customExportNormalizeTags').checked,
    stripEmoji: customExportEl('customExportStripEmoji').checked,
    simplifyBreaks: customExportEl('customExportSimplifyBreaks').checked,
    compactJson: customExportEl('customExportCompactJson').checked,
    csvBom: customExportEl('customExportCsvBom').checked
  };
}

function prepareCustomExportData(config) {
  const state = collectState();
  const favoriteIds = new Set(userData?.favorites || []);
  const selected = customExportScopeSelections[config.scope] || new Set();
  const visibleSections = new Set([...document.querySelectorAll('.section-wrap:not(.search-hidden)')].map(el => el.dataset.id));
  const visibleButtons = new Set([...document.querySelectorAll('.btn-wrap:not(.search-hidden)')].map(el => el.dataset.id));
  let sections = state.sections.map(section => ({ ...section, buttons: section.buttons.map(button => ({ ...button })) }));
  if (config.scope === 'sections') sections = sections.filter(section => selected.has(section.id));
  if (config.scope === 'search') sections = sections.filter(section => visibleSections.has(section.id)).map(section => ({ ...section, buttons: section.buttons.filter(button => visibleButtons.has(button.id)) }));
  sections = sections.map(section => ({ ...section, buttons: section.buttons.filter(button => {
    if (config.scope === 'favorites') return favoriteIds.has(button.id);
    if (['public', 'private', 'other'].includes(config.scope)) return button.vis === config.scope;
    if (config.scope === 'tags') return selected.has(button.tag) || selected.has(normalizeTag(button.tag));
    return true;
  }) }));
  if (!config.fields.has('includeEmpty')) sections = sections.filter(section => section.buttons.length);
  sections.forEach(section => {
    section.name = cleanCustomExportValue(section.name, config, true);
    if (config.state === 'expanded') section.collapsed = false;
    if (config.state === 'collapsed') section.collapsed = true;
    section.buttons.forEach(button => {
      button.name = cleanCustomExportValue(button.name, config, true);
      button.text = cleanCustomExportValue(button.text, config);
      if (config.normalizeTags) button.tag = normalizeTag(button.tag);
    });
    if (config.order === 'alphabetical') section.buttons.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });
  if (config.order === 'alphabetical') sections.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const tags = [...new Set((config.normalizeTags ? state.tags.map(normalizeTag) : state.tags).filter(Boolean))];
  if (config.order === 'alphabetical') tags.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return { tags, sections, favoriteIds };
}

function assignCustomExportField(target, key, value, config) {
  if (config.removeEmpty && (value === '' || value == null || (Array.isArray(value) && !value.length))) return;
  target[key] = value;
}

function customExportButtonObject(button, section, config, favoriteIds) {
  const f = config.fields; const out = {};
  if (f.has('buttonId')) assignCustomExportField(out, 'id', button.id, config);
  if (f.has('buttonName')) assignCustomExportField(out, 'name', button.name, config);
  if (f.has('buttonText')) assignCustomExportField(out, 'text', button.text, config);
  if (f.has('buttonTag')) assignCustomExportField(out, 'tag', button.tag, config);
  if (f.has('buttonVisibility')) assignCustomExportField(out, 'vis', button.vis, config);
  if (f.has('buttonSection')) { assignCustomExportField(out, 'section', section.name, config); assignCustomExportField(out, 'sectionId', section.id, config); }
  if (f.has('buttonFavorite')) out.favorite = favoriteIds.has(button.id);
  if (f.has('buttonStats')) out.stats = { copies: 0, views: 0, edits: 0, lastUsed: null, createdAt: null, ...(userData?.stats?.[button.id] || {}) };
  return out;
}

function buildCustomExportObject(data, config) {
  const f = config.fields; const root = {};
  if (f.has('metadata')) root.metadata = { app: 'Blû', exportedAt: new Date().toISOString(), format: config.format, scope: config.scope };
  if (f.has('globalTags')) root.tags = data.tags;
  if (!f.has('sections')) return root;
  if (config.structure === 'flat') {
    root.buttons = f.has('buttons') ? data.sections.flatMap(section => section.buttons.map(button => customExportButtonObject(button, section, config, data.favoriteIds))) : [];
    return root;
  }
  root.sections = data.sections.map(section => {
    const out = {};
    if (f.has('sectionId')) assignCustomExportField(out, 'id', section.id, config);
    if (f.has('sectionName')) assignCustomExportField(out, 'name', section.name, config);
    if (f.has('sectionCollapsed') && config.state !== 'omit') out.collapsed = section.collapsed;
    if (f.has('sectionCount')) out.buttonCount = section.buttons.length;
    if (f.has('buttons')) out.buttons = section.buttons.map(button => customExportButtonObject(button, section, config, data.favoriteIds));
    return out;
  });
  return root;
}

function getCustomExportRows(data, config) {
  return data.sections.flatMap(section => section.buttons.map(button => {
    const object = customExportButtonObject(button, section, config, data.favoriteIds);
    if (config.fields.has('sectionId') && !('sectionId' in object)) object.sectionId = section.id;
    if (config.fields.has('sectionName') && !('section' in object)) object.section = section.name;
    return object;
  }));
}

function customExportCsv(rows, delimiter) {
  const headers = [...new Set(rows.flatMap(Object.keys))];
  if (!headers.length) return '';
  const cell = value => `"${String(typeof value === 'object' ? JSON.stringify(value) : value ?? '').replace(/"/g, '""')}"`;
  return [headers.map(cell).join(delimiter), ...rows.map(row => headers.map(key => cell(row[key])).join(delimiter))].join('\r\n');
}

function customExportReadable(data, config, markdown) {
  const f = config.fields; const lines = [];
  if (f.has('metadata')) lines.push(markdown ? '# Exportação do Blû' : 'EXPORTAÇÃO DO BLÛ', `Gerado em: ${new Date().toLocaleString('pt-BR')}`, '');
  if (f.has('globalTags')) lines.push(markdown ? `**Tags:** ${data.tags.join(', ') || 'Nenhuma'}` : `Tags: ${data.tags.join(', ') || 'Nenhuma'}`, '');
  data.sections.forEach(section => {
    if (f.has('sectionName')) lines.push(markdown ? `## ${section.name}` : section.name.toUpperCase());
    if (f.has('sectionId')) lines.push(`${markdown ? '- ' : ''}ID da seção: ${section.id}`);
    if (f.has('sectionCount')) lines.push(`${markdown ? '- ' : ''}Botões: ${section.buttons.length}`);
    if (f.has('sectionCollapsed') && config.state !== 'omit') lines.push(`${markdown ? '- ' : ''}Estado: ${section.collapsed ? 'minimizada' : 'expandida'}`);
    if (f.has('buttons')) section.buttons.forEach(button => {
      const prefix = markdown ? '- ' : '• ';
      const title = f.has('buttonName') ? button.name : 'Botão';
      lines.push(`${prefix}${title}`);
      if (f.has('buttonId')) lines.push(`  ID: ${button.id}`);
      if (f.has('buttonText')) lines.push(`  Texto: ${button.text}`);
      if (f.has('buttonTag')) lines.push(`  Tag: ${button.tag}`);
      if (f.has('buttonVisibility')) lines.push(`  Visibilidade: ${button.vis}`);
      if (f.has('buttonSection')) lines.push(`  Seção: ${section.name}`);
      if (f.has('buttonFavorite')) lines.push(`  Favorito: ${data.favoriteIds.has(button.id) ? 'sim' : 'não'}`);
      if (f.has('buttonStats')) lines.push(`  Estatísticas: ${JSON.stringify(userData?.stats?.[button.id] || {})}`);
    });
    lines.push('');
  });
  return lines.join('\n').trim();
}

function generateCustomExport() {
  const config = getCustomExportConfig();
  const data = prepareCustomExportData(config);
  const object = buildCustomExportObject(data, config);
  let content;
  if (config.format === 'json') content = JSON.stringify(object, null, config.compactJson ? 0 : 2);
  else if (config.format === 'csv') content = customExportCsv(getCustomExportRows(data, config), config.delimiter);
  else content = customExportReadable(data, config, config.format === 'markdown');
  return { config, data, content };
}

function isCustomExportImportCompatible(config) {
  const required = ['globalTags', 'sections', 'sectionId', 'sectionName', 'sectionCollapsed', 'buttons', 'buttonId', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'includeEmpty'];
  return config.format === 'json' && config.scope === 'all' && config.structure === 'hierarchy'
    && config.state === 'current' && config.order === 'current' && required.every(field => config.fields.has(field))
    && !config.removeEmpty && !config.normalizeTags && !config.stripEmoji && !config.simplifyBreaks;
}

function updateCustomExportPreview() {
  if (!customExportEl('customExportPreview')) return;
  updateCustomExportDependencies();
  const result = generateCustomExport();
  const count = result.data.sections.reduce((total, section) => total + section.buttons.length, 0);
  const size = getUtf8ByteLength(result.content);
  customExportEl('customExportPreview').value = result.content || '(O arquivo não possui conteúdo com as opções atuais.)';
  customExportEl('customExportSummary').textContent = `${result.data.sections.length} seção(ões) • ${count} botão(ões) • ${formatFileSize(size)} • ${result.config.format.toUpperCase()}`;
  const warnings = [];
  if (!result.content) warnings.push('Selecione ao menos um campo que produza conteúdo.');
  if (!isCustomExportImportCompatible(result.config)) warnings.push('Este arquivo é para consulta/uso externo e não representa um backup reimportável completo.');
  const privateCount = result.data.sections.flatMap(section => section.buttons).filter(button => button.vis === 'private').length;
  if (privateCount) warnings.push(`${privateCount} botão(ões) privado(s) será(ão) incluído(s).`);
  if (result.config.fields.has('buttonStats')) warnings.push('As estatísticas são dados pessoais locais e serão incluídas no arquivo.');
  const compatible = isCustomExportImportCompatible(result.config);
  const warningHtml = warnings.map(message => `<div class="custom-export-warning">⚠️ ${escapeHtml(message)}</div>`).join('');
  customExportEl('customExportWarnings').innerHTML = `${compatible ? '<div class="custom-export-warning info">✓ Backup completo compatível com a importação do Blû.</div>' : ''}${warningHtml}`;
  const button = customExportEl('customExportDownloadBtn');
  button.disabled = !result.content;
  button.textContent = `Exportar ${result.config.format === 'text' ? 'TXT' : result.config.format.toUpperCase()}`;
}

function downloadCustomExport() {
  const result = generateCustomExport();
  if (!result.content) { notify('Selecione campos que produzam conteúdo', 'err'); return; }
  const extensions = { json: 'json', csv: 'csv', markdown: 'md', text: 'txt' };
  const mimes = { json: 'application/json', csv: 'text/csv', markdown: 'text/markdown', text: 'text/plain' };
  const date = new Date();
  const stamp = `${getLocalDateKey(date)}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  const content = result.config.format === 'csv' && result.config.csvBom ? `\uFEFF${result.content}` : result.content;
  const url = URL.createObjectURL(new Blob([content], { type: `${mimes[result.config.format]};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `blu-export-personalizado-${stamp}.${extensions[result.config.format]}`;
  link.click();
  URL.revokeObjectURL(url);
  if (isCustomExportImportCompatible(result.config) && typeof markCurrentStateAsExported === 'function') markCurrentStateAsExported();
  notify('Exportação personalizada concluída!');
}

document.addEventListener('change', event => {
  if (!event.target.matches('#customExportModal [data-export-field]')) return;
  markCustomExportCustomized();
});
