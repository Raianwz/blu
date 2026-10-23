// Optional custom export for Blû Offline.
(function () {
  function load({ collectState, normalizeTag, escapeHtml, openModal, requestModalDismiss, notify }) {
    const menu = document.getElementById('submenu-dados');
    if (!menu) throw new Error('Menu de dados indisponível');
    if (document.getElementById('customExportModal')) return true;

    const exportButton = document.createElement('button');
    exportButton.innerHTML = '<svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg><span class="menu-btn-label">Exportação Personalizada</span>';
    exportButton.type = 'button';
    exportButton.className = 'menu-btn';
    exportButton.title = 'Escolher dados e formato da exportação';
    exportButton.onclick = () => window.openCustomExportModal();
    menu.insertBefore(exportButton, menu.querySelector('.menu-sep'));

    document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg" id="customExportModal">
    <div class="modal custom-export-modal">
      <h2>🧰 Exportação Personalizada</h2>
      <div class="custom-export-tabs" role="tablist" aria-label="Etapas da exportação"><button id="customExportConfigTab" class="active" type="button" role="tab" aria-selected="true" onclick="setCustomExportTab('config')">Configurar</button><button id="customExportPreviewTab" type="button" role="tab" aria-selected="false" onclick="setCustomExportTab('preview')">Prévia</button></div>
      <div id="customExportConfigPanel" class="custom-export-panel">
        <div class="custom-export-top-grid">
          <label>Preset<select id="customExportPreset" onchange="applyCustomExportPreset(this.value)"><option value="index">Índice de seções e botões</option><option value="full">Backup completo</option><option value="content">Somente conteúdo</option><option value="names">Somente nomes</option><option value="spreadsheet">Planilha de botões</option><option value="documentation">Documentação Markdown</option><option value="custom">Personalizado</option></select></label>
          <label>Formato<select id="customExportFormat" onchange="updateCustomExportUI()"><option value="json">JSON</option><option value="text">Texto</option><option value="markdown">Markdown</option><option value="csv">CSV</option></select></label>
          <label>Escopo<select id="customExportScope" onchange="updateCustomExportUI()"><option value="all">Tudo</option><option value="search">Resultados da pesquisa</option><option value="public">Somente públicos</option><option value="private">Somente privados</option><option value="other">Visibilidade “Outro”</option><option value="sections">Seções selecionadas</option><option value="tags">Tags selecionadas</option></select></label>
          <label>Organização<select id="customExportStructure" onchange="markCustomExportCustomized()"><option value="hierarchy">Preservar hierarquia</option><option value="flat">Lista plana</option></select></label>
        </div>
        <div class="custom-export-options-scroll">
          <section id="customExportScopeOptions" class="custom-export-group" hidden><div class="custom-export-group-head"><strong id="customExportScopeTitle">Selecionar itens</strong><span><button type="button" onclick="toggleCustomExportScopeItems(true)">Todos</button><button type="button" onclick="toggleCustomExportScopeItems(false)">Nenhum</button></span></div><div id="customExportScopeList" class="custom-export-scope-list"></div></section>
          <section class="custom-export-group"><div class="custom-export-group-head"><strong>Estrutura e seções</strong><span><button type="button" onclick="toggleCustomExportFields('section',true)">Todos</button><button type="button" onclick="toggleCustomExportFields('section',false)">Nenhum</button></span></div><div class="custom-export-check-grid"><label><input type="checkbox" data-export-field="globalTags" data-field-group="section"> Lista global de tags</label><label><input type="checkbox" data-export-field="sections" data-field-group="section"> Incluir seções</label><label><input type="checkbox" data-export-field="sectionId" data-field-group="section"> IDs das seções</label><label><input type="checkbox" data-export-field="sectionName" data-field-group="section"> Nomes das seções</label><label><input type="checkbox" data-export-field="sectionCollapsed" data-field-group="section"> Estado das seções</label><label><input type="checkbox" data-export-field="sectionCount" data-field-group="section"> Quantidade de botões</label><label><input type="checkbox" data-export-field="includeEmpty" data-field-group="section"> Incluir seções vazias</label><label><input type="checkbox" data-export-field="metadata" data-field-group="section"> Metadados</label></div></section>
          <section class="custom-export-group"><div class="custom-export-group-head"><strong>Botões</strong><span><button type="button" onclick="toggleCustomExportFields('button',true)">Todos</button><button type="button" onclick="toggleCustomExportFields('button',false)">Nenhum</button></span></div><div class="custom-export-check-grid"><label><input type="checkbox" data-export-field="buttons" data-field-group="button"> Incluir botões</label><label><input type="checkbox" data-export-field="buttonId" data-field-group="button"> IDs dos botões</label><label><input type="checkbox" data-export-field="buttonName" data-field-group="button"> Nomes dos botões</label><label><input type="checkbox" data-export-field="buttonText" data-field-group="button"> Textos dos botões</label><label><input type="checkbox" data-export-field="buttonTag" data-field-group="button"> Tags dos botões</label><label><input type="checkbox" data-export-field="buttonVisibility" data-field-group="button"> Visibilidade</label><label><input type="checkbox" data-export-field="buttonSection" data-field-group="button"> Seção de origem</label></div></section>
          <section class="custom-export-group"><div class="custom-export-group-head"><strong>Transformações</strong></div><div class="custom-export-control-grid"><label>Estado das seções<select id="customExportSectionState" onchange="markCustomExportCustomized()"><option value="current">Preservar atual</option><option value="expanded">Todas expandidas</option><option value="collapsed">Todas minimizadas</option><option value="omit">Não incluir</option></select></label><label>Ordenação<select id="customExportOrder" onchange="markCustomExportCustomized()"><option value="current">Ordem atual</option><option value="alphabetical">Ordem alfabética</option></select></label><label id="customExportDelimiterWrap" hidden>Separador CSV<select id="customExportDelimiter" onchange="markCustomExportCustomized()"><option value="semicolon">Ponto e vírgula</option><option value="comma">Vírgula</option></select></label></div><div class="custom-export-check-grid compact"><label><input id="customExportRemoveEmpty" type="checkbox" onchange="markCustomExportCustomized()"> Remover campos vazios</label><label><input id="customExportNormalizeTags" type="checkbox" onchange="markCustomExportCustomized()"> Normalizar tags</label><label><input id="customExportStripEmoji" type="checkbox" onchange="markCustomExportCustomized()"> Remover emojis dos nomes</label><label><input id="customExportSimplifyBreaks" type="checkbox" onchange="markCustomExportCustomized()"> Simplificar quebras de linha</label><label><input id="customExportCompactJson" type="checkbox" onchange="markCustomExportCustomized()"> JSON compacto</label><label><input id="customExportCsvBom" type="checkbox" checked onchange="markCustomExportCustomized()"> CSV compatível com Excel</label></div></section>
        </div>
      </div>
      <div id="customExportPreviewPanel" class="custom-export-panel" hidden><textarea id="customExportPreview" readonly spellcheck="false" wrap="soft" aria-label="Prévia do arquivo"></textarea></div>
      <div id="customExportSummary" class="custom-export-summary"></div><div id="customExportWarnings" class="custom-export-warnings"></div>
      <div class="modal-footer custom-export-footer"><button class="mbtn cancel" type="button" onclick="closeModal('customExportModal')">Cancelar</button><button class="mbtn ghost" type="button" onclick="setCustomExportTab('preview')">Visualizar</button><button id="customExportDownloadBtn" class="mbtn primary" type="button" onclick="downloadCustomExport()">Exportar</button></div>
    </div>
  </div>`);
    const background = document.getElementById('customExportModal');
    background.addEventListener('click', event => {
      if (event.target === background) requestModalDismiss(background.id);
    });

    const presets = {
      index: { format: 'json', scope: 'all', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'includeEmpty'] },
      full: { format: 'json', scope: 'all', structure: 'hierarchy', fields: ['globalTags', 'sections', 'sectionId', 'sectionName', 'sectionCollapsed', 'buttons', 'buttonId', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'includeEmpty'] },
      content: { format: 'json', scope: 'all', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility'] },
      names: { format: 'text', scope: 'all', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName'] },
      spreadsheet: { format: 'csv', scope: 'all', structure: 'flat', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'buttonSection'] },
      documentation: { format: 'markdown', scope: 'all', structure: 'hierarchy', fields: ['sections', 'sectionName', 'buttons', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility'] }
    };
    const selections = { sections: new Set(), tags: new Set() };
    const el = id => document.getElementById(id);
    const fields = () => new Set([...document.querySelectorAll('[data-export-field]:checked')].map(input => input.dataset.exportField));
    const byteLength = value => new TextEncoder().encode(String(value)).length;
    const fileSize = bytes => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  
    window.openCustomExportModal = function () {
      populateScope(true); applyCustomExportPreset('index'); setCustomExportTab('config'); openModal('customExportModal');
      document.getElementById('menuOverlay')?.classList.remove('open');
    };
    window.setCustomExportTab = function (tab) {
      const preview = tab === 'preview';
      el('customExportConfigPanel').hidden = preview; el('customExportPreviewPanel').hidden = !preview;
      el('customExportConfigTab').classList.toggle('active', !preview); el('customExportPreviewTab').classList.toggle('active', preview);
      el('customExportConfigTab').setAttribute('aria-selected', String(!preview)); el('customExportPreviewTab').setAttribute('aria-selected', String(preview));
      if (preview) updatePreview();
    };
    window.applyCustomExportPreset = function (name) {
      const preset = presets[name]; if (!preset) return;
      el('customExportPreset').value = name; el('customExportFormat').value = preset.format; el('customExportScope').value = preset.scope; el('customExportStructure').value = preset.structure;
      document.querySelectorAll('[data-export-field]').forEach(input => { input.checked = preset.fields.includes(input.dataset.exportField); });
      el('customExportSectionState').value = 'current'; el('customExportOrder').value = 'current';
      ['customExportRemoveEmpty', 'customExportNormalizeTags', 'customExportStripEmoji', 'customExportSimplifyBreaks', 'customExportCompactJson'].forEach(id => { el(id).checked = false; });
      el('customExportCsvBom').checked = true; updateCustomExportUI(false);
    };
    window.markCustomExportCustomized = function () { el('customExportPreset').value = 'custom'; updateCustomExportUI(false); };
    window.updateCustomExportUI = function (custom = true) {
      if (custom) el('customExportPreset').value = 'custom';
      const format = el('customExportFormat').value; const search = el('customExportScope').querySelector('[value="search"]');
      search.disabled = !el('searchInput')?.value.trim(); if (search.disabled && el('customExportScope').value === 'search') el('customExportScope').value = 'all';
      el('customExportDelimiterWrap').hidden = format !== 'csv'; el('customExportCompactJson').closest('label').hidden = format !== 'json'; el('customExportCsvBom').closest('label').hidden = format !== 'csv';
      el('customExportStructure').disabled = format === 'csv'; if (el('customExportStructure').disabled) el('customExportStructure').value = 'flat';
      populateScope(); dependencies(); updatePreview();
    };
    function dependencies() {
      const selected = fields(); const sectionChildren = ['sectionId', 'sectionName', 'sectionCollapsed', 'sectionCount']; const buttonChildren = ['buttonId', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'buttonSection'];
      document.querySelectorAll('[data-export-field]').forEach(input => {
        input.disabled = (sectionChildren.includes(input.dataset.exportField) && !selected.has('sections')) || (buttonChildren.includes(input.dataset.exportField) && !selected.has('buttons'));
        input.closest('label').classList.toggle('disabled', input.disabled);
      });
    }
    window.toggleCustomExportFields = function (group, checked) { document.querySelectorAll(`[data-field-group="${group}"]`).forEach(input => { input.checked = checked; }); markCustomExportCustomized(); };
    function populateScope(reset = false) {
      const scope = el('customExportScope')?.value; if (!scope) return;
      const panel = el('customExportScopeOptions'); const list = el('customExportScopeList'); const active = ['sections', 'tags'].includes(scope); panel.hidden = !active; if (!active) return;
      const state = collectState(); const items = scope === 'sections' ? state.sections.map(section => [section.id, section.name]) : [...new Set(state.tags.concat(state.sections.flatMap(section => section.buttons.map(button => button.tag))).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(tag => [tag, tag]);
      if (reset || !selections[scope].size) selections[scope] = new Set(items.map(item => item[0]));
      el('customExportScopeTitle').textContent = scope === 'sections' ? 'Selecionar seções' : 'Selecionar tags';
      list.innerHTML = items.length ? items.map(([value, label]) => `<label><input type="checkbox" value="${escapeHtml(value)}" ${selections[scope].has(value) ? 'checked' : ''}> ${escapeHtml(label)}</label>`).join('') : '<span>Nenhum item disponível.</span>';
      list.querySelectorAll('input').forEach(input => input.onchange = () => { input.checked ? selections[scope].add(input.value) : selections[scope].delete(input.value); el('customExportPreset').value = 'custom'; updatePreview(); });
    }
    window.toggleCustomExportScopeItems = function (checked) { const scope = el('customExportScope').value; el('customExportScopeList').querySelectorAll('input').forEach(input => { input.checked = checked; checked ? selections[scope].add(input.value) : selections[scope].delete(input.value); }); el('customExportPreset').value = 'custom'; updatePreview(); };
    function config() { return { format: el('customExportFormat').value, scope: el('customExportScope').value, structure: el('customExportStructure').value, fields: fields(), state: el('customExportSectionState').value, order: el('customExportOrder').value, delimiter: el('customExportDelimiter').value === 'comma' ? ',' : ';', removeEmpty: el('customExportRemoveEmpty').checked, normalizeTags: el('customExportNormalizeTags').checked, stripEmoji: el('customExportStripEmoji').checked, simplifyBreaks: el('customExportSimplifyBreaks').checked, compactJson: el('customExportCompactJson').checked, csvBom: el('customExportCsvBom').checked }; }
    function clean(value, options, name = false) { let result = String(value ?? ''); if (options.simplifyBreaks) result = result.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); if (name && options.stripEmoji) result = result.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').replace(/\s{2,}/g, ' ').trim(); return result; }
    function prepare(options) {
      const state = collectState(); const selected = selections[options.scope] || new Set(); const visibleSections = new Set([...document.querySelectorAll('.section-wrap:not(.search-hidden)')].map(node => node.dataset.id)); const visibleButtons = new Set([...document.querySelectorAll('.btn-wrap:not(.search-hidden)')].map(node => node.dataset.id));
      let sections = state.sections.map(section => ({ ...section, buttons: section.buttons.map(button => ({ ...button })) }));
      if (options.scope === 'sections') sections = sections.filter(section => selected.has(section.id));
      if (options.scope === 'search') sections = sections.filter(section => visibleSections.has(section.id)).map(section => ({ ...section, buttons: section.buttons.filter(button => visibleButtons.has(button.id)) }));
      sections = sections.map(section => ({ ...section, buttons: section.buttons.filter(button => !['public', 'private', 'other'].includes(options.scope) || button.vis === options.scope).filter(button => options.scope !== 'tags' || selected.has(button.tag) || selected.has(normalizeTag(button.tag))) }));
      if (!options.fields.has('includeEmpty')) sections = sections.filter(section => section.buttons.length);
      sections.forEach(section => { section.name = clean(section.name, options, true); if (options.state === 'expanded') section.collapsed = false; if (options.state === 'collapsed') section.collapsed = true; section.buttons.forEach(button => { button.name = clean(button.name, options, true); button.text = clean(button.text, options); if (options.normalizeTags) button.tag = normalizeTag(button.tag); }); if (options.order === 'alphabetical') section.buttons.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')); });
      if (options.order === 'alphabetical') sections.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      return { tags: [...new Set(state.tags.map(tag => options.normalizeTags ? normalizeTag(tag) : tag).filter(Boolean))], sections };
    }
    function assign(target, key, value, options) { if (!options.removeEmpty || !(value === '' || value == null || (Array.isArray(value) && !value.length))) target[key] = value; }
    function buttonObject(button, section, options) {
      const out = {}; const f = options.fields;
      if (f.has('buttonId')) assign(out, 'id', button.id, options); if (f.has('buttonName')) assign(out, 'name', button.name, options); if (f.has('buttonText')) assign(out, 'text', button.text, options); if (f.has('buttonTag')) assign(out, 'tag', button.tag, options); if (f.has('buttonVisibility')) assign(out, 'vis', button.vis, options);
      if (f.has('buttonSection')) { assign(out, 'section', section.name, options); assign(out, 'sectionId', section.id, options); }
      return out;
    }
    function objectData(data, options) {
      const root = {}; const f = options.fields;
      if (f.has('metadata')) root.metadata = { app: 'Blû Offline', exportedAt: new Date().toISOString(), format: options.format, scope: options.scope };
      if (f.has('globalTags')) root.tags = data.tags;
      if (!f.has('sections')) { if (f.has('buttons')) root.buttons = data.sections.flatMap(section => section.buttons.map(button => buttonObject(button, section, options))); return root; }
      if (options.structure === 'flat') { root.buttons = f.has('buttons') ? data.sections.flatMap(section => section.buttons.map(button => buttonObject(button, section, options))) : []; return root; }
      root.sections = data.sections.map(section => { const out = {}; if (f.has('sectionId')) assign(out, 'id', section.id, options); if (f.has('sectionName')) assign(out, 'name', section.name, options); if (f.has('sectionCollapsed') && options.state !== 'omit') out.collapsed = section.collapsed; if (f.has('sectionCount')) out.buttonCount = section.buttons.length; if (f.has('buttons')) out.buttons = section.buttons.map(button => buttonObject(button, section, options)); return out; }); return root;
    }
    function rows(data, options) { return data.sections.flatMap(section => {
      if (!options.fields.has('buttons')) { const out = {}; if (options.fields.has('sectionId')) out.sectionId = section.id; if (options.fields.has('sectionName')) out.section = section.name; if (options.fields.has('sectionCollapsed') && options.state !== 'omit') out.collapsed = section.collapsed; if (options.fields.has('sectionCount')) out.buttonCount = section.buttons.length; return Object.keys(out).length ? [out] : []; }
      return section.buttons.map(button => { const out = buttonObject(button, section, options); if (options.fields.has('sectionId') && !out.sectionId) out.sectionId = section.id; if (options.fields.has('sectionName') && !out.section) out.section = section.name; return out; });
    }); }
    function delimited(records, separator) { const headers = [...new Set(records.flatMap(Object.keys))]; if (!headers.length) return ''; const cell = value => `"${String(typeof value === 'object' ? JSON.stringify(value) : value ?? '').replace(/"/g, '""')}"`; return [headers.map(cell).join(separator), ...records.map(row => headers.map(key => cell(row[key])).join(separator))].join('\r\n'); }
    function readable(data, options, markdown) { const f = options.fields; const lines = []; if (f.has('metadata')) lines.push(markdown ? '# Exportação do Blû Offline' : 'Exportação do Blû Offline', `Gerado em: ${new Date().toLocaleString('pt-BR')}`, ''); if (f.has('globalTags')) lines.push(`Tags: ${data.tags.join(', ') || 'Nenhuma'}`, ''); data.sections.forEach(section => { if (f.has('sectionName')) lines.push(markdown ? `## ${section.name}` : section.name); if (f.has('sectionId')) lines.push(`ID da seção: ${section.id}`); if (f.has('sectionCount')) lines.push(`Botões: ${section.buttons.length}`); if (f.has('buttons')) section.buttons.forEach(button => { lines.push(`${markdown ? '- ' : '• '}${f.has('buttonName') ? button.name : 'Botão'}`); if (f.has('buttonId')) lines.push(`  ID: ${button.id}`); if (f.has('buttonText')) lines.push(`  Texto: ${button.text}`); if (f.has('buttonTag')) lines.push(`  Tag: ${button.tag}`); if (f.has('buttonVisibility')) lines.push(`  Visibilidade: ${button.vis}`); if (f.has('buttonSection')) lines.push(`  Seção: ${section.name}`); }); lines.push(''); }); return lines.join('\n').trim(); }
    function hasUsefulContent(data, options) {
      const f = options.fields;
      if (f.has('globalTags') && data.tags.length) return true;
  
      const sectionFields = ['sectionId', 'sectionName', 'sectionCollapsed', 'sectionCount'];
      if (f.has('sections') && data.sections.length && sectionFields.some(field => f.has(field))) return true;
  
      const buttonFields = ['buttonId', 'buttonName', 'buttonText', 'buttonTag', 'buttonVisibility', 'buttonSection'];
      return f.has('buttons')
        && buttonFields.some(field => f.has(field))
        && data.sections.some(section => section.buttons.length);
    }
    function generate() { const options = config(); const data = prepare(options); const records = rows(data, options); let content; if (options.format === 'json') content = JSON.stringify(objectData(data, options), null, options.compactJson ? 0 : 2); else if (options.format === 'csv') content = delimited(records, options.delimiter); else content = readable(data, options, options.format === 'markdown'); return { options, data, content, preview: content, useful: hasUsefulContent(data, options) }; }
    function label(format) { return { text: 'TXT', markdown: 'MARKDOWN', csv: 'CSV', json: 'JSON' }[format]; }
    function updatePreview() { if (!el('customExportPreview')) return; dependencies(); const result = generate(); const count = result.data.sections.reduce((sum, section) => sum + section.buttons.length, 0); el('customExportPreview').value = result.useful ? result.preview : '(O arquivo não possui conteúdo útil com as opções atuais.)'; el('customExportSummary').textContent = `${result.data.sections.length} seção(ões) • ${count} botão(ões) • ${fileSize(byteLength(result.content))} • ${label(result.options.format)}`; el('customExportWarnings').innerHTML = result.useful ? '<div class="custom-export-warning">⚠️ Este arquivo é para consulta/uso externo e não representa necessariamente um backup reimportável completo.</div>' : '<div class="custom-export-warning">⚠️ Selecione ao menos um campo com conteúdo antes de exportar.</div>'; const button = el('customExportDownloadBtn'); button.disabled = !result.useful; button.textContent = `Exportar ${label(result.options.format)}`; }
    function download(content, type, extension) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `blu-offline-${new Date().toISOString().slice(0, 10)}.${extension}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    window.downloadCustomExport = function () { const result = generate(); if (!result.useful) { notify('Selecione ao menos um campo com conteúdo antes de exportar', 'err'); return; } const map = { json: ['application/json', 'json'], text: ['text/plain', 'txt'], markdown: ['text/markdown', 'md'], csv: ['text/csv', 'csv'] }; const [mime, extension] = map[result.options.format]; const content = result.options.format === 'csv' && result.options.csvBom ? `\uFEFF${result.content}` : result.content; download(content, mime, extension); notify(`Exportação ${label(result.options.format)} concluída!`); };
    document.addEventListener('change', event => { if (event.target.matches('#customExportModal [data-export-field]')) markCustomExportCustomized(); });

    return true;
  }

  window.BluExtras.register('custom-export', { load });
})();
