// Optional section icons for the Novo visual. Section names stay intact in JSON.
(function () {
  const legacyIcons = Object.freeze({
    '🎲': 'blu:demo-die', '🍻': 'blu:tavern', '🧙': 'blu:wizard-hat',
    '🗝️': 'blu:secret-key', '🗝': 'blu:secret-key',
    '💼': 'material:work', '💳': 'material:credit_card',
    '🏦': 'material:account_balance', '🤝': 'material:handshake',
    '📈': 'material:trending_up', '📚': 'material:book2',
    '🧾': 'material:receipt_long', '📊': 'material:table_chart',
    '🏢': 'material:apartment', '💵': 'material:account_balance_wallet',
    '📞': 'material:headset_mic', '⚠️': 'material:warning',
    '👋': 'material:waving_hand', '⭐': 'bootstrap:star-fill',
    '📱': 'material:mobile', '💜': 'bootstrap:heart-fill',
    '🎫': 'material:local_activity'
  });

  function leadingEmoji(name) {
    const text = String(name || '');
    const spaces = /^\s*/u.exec(text)[0];
    const rest = text.slice(spaces.length);
    const first = typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(rest)[Symbol.iterator]().next().value?.segment
      : Array.from(rest)[0];
    if (!first || !/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20E3]/u.test(first)) return null;
    const end = spaces.length + first.length + /^\s*/u.exec(rest.slice(first.length))[0].length;
    return { emoji: first, end };
  }

  function load({ entries, markup, save, openModal, closeModal, requestModalDismiss, notify }) {
    let available = true;
    let editingSection = null;
    const modal = document.createElement('div');
    modal.id = 'sectionIconEditModal';
    modal.className = 'modal-bg';
    modal.innerHTML = `
      <div class="modal section-icon-modal">
        <h2>Editar Seção</h2>
        <div class="form-group"><label for="sectionIconName">Nome da Seção</label>
          <input id="sectionIconName" type="text" autocomplete="off"></div>
        <div class="form-group section-icon-field">
          <label id="sectionIconLabel" for="sectionIconTrigger">Ícone da Seção</label>
          <input id="sectionIconValue" type="hidden">
          <button id="sectionIconTrigger" type="button" class="online-icon-trigger"
            aria-haspopup="listbox" aria-expanded="false" aria-controls="sectionIconList">
            <span class="section-icon-preview" aria-hidden="true"></span>
            <span class="section-icon-name">Automático</span>
            <span class="online-icon-chevron" aria-hidden="true">⌄</span>
          </button>
          <div id="sectionIconList" class="online-icon-list" role="listbox"
            aria-labelledby="sectionIconLabel" hidden></div>
        </div>
        <div class="modal-footer">
          <button class="mbtn cancel" type="button" data-section-action="cancel">Cancelar</button>
          <button class="mbtn primary" type="button" data-section-action="save">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const nameInput = modal.querySelector('#sectionIconName');
    const valueInput = modal.querySelector('#sectionIconValue');
    const trigger = modal.querySelector('#sectionIconTrigger');
    const list = modal.querySelector('#sectionIconList');

    function resolvedIcon(name, chosen) {
      if (chosen === 'none') return '';
      if (chosen) return chosen;
      const emoji = leadingEmoji(name)?.emoji;
      if (emoji === '🔍') return /^🔍\s*Assessoria\b/iu.test(name.trim()) ? 'material:support_agent' : '';
      return legacyIcons[emoji] || '';
    }

    function decorate(section) {
      const title = section.querySelector('.section-title');
      if (!title) return;
      const name = title.textContent;
      const leading = leadingEmoji(name);
      if (leading) {
        const emoji = document.createElement('span');
        emoji.className = 'section-leading-emoji';
        emoji.textContent = name.slice(0, leading.end);
        title.replaceChildren(emoji, document.createTextNode(name.slice(leading.end)));
      } else title.textContent = name;
      let icon = section.querySelector('.section-custom-icon');
      if (!icon) {
        icon = document.createElement('span');
        icon.className = 'section-custom-icon';
        icon.setAttribute('aria-hidden', 'true');
        title.before(icon);
      }
      const chosen = section.dataset.icon || '';
      icon.innerHTML = markup(resolvedIcon(name, chosen), 'section-icon-svg');
    }

    function decorateAll() {
      document.querySelectorAll('#sections .section-wrap').forEach(decorate);
    }

    function setAvailable(value) {
      available = Boolean(value);
      document.body.classList.toggle('section-icons-ready', available);
      if (available) decorateAll();
    }

    function choices() {
      const unique = new Map();
      entries().forEach(entry => { if (entry.id && !unique.has(entry.id)) unique.set(entry.id, entry); });
      const selected = valueInput.value;
      if (selected && selected !== 'none' && !unique.has(selected)) {
        unique.set(selected, { id: selected, label: `Ícone importado (${selected})` });
      }
      return [
        { id: '', label: 'Automático (pelo emoji)' },
        { id: 'none', label: 'Sem ícone' },
        ...unique.values()
      ];
    }

    function updateTrigger() {
      const selected = valueInput.value;
      const entry = choices().find(item => item.id === selected);
      const iconId = resolvedIcon(nameInput.value, selected);
      trigger.querySelector('.section-icon-preview').innerHTML = markup(iconId, 'section-icon-svg');
      trigger.querySelector('.section-icon-name').textContent = entry?.label || 'Automático';
    }

    function closePicker(focus = false) {
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (focus) trigger.focus();
    }

    function openPicker() {
      list.replaceChildren();
      choices().forEach(entry => {
        const choice = document.createElement('button');
        choice.type = 'button';
        choice.className = 'online-icon-choice';
        choice.setAttribute('role', 'option');
        choice.setAttribute('aria-selected', String(entry.id === valueInput.value));
        const preview = document.createElement('span');
        preview.className = 'online-icon-choice-preview';
        preview.setAttribute('aria-hidden', 'true');
        preview.innerHTML = markup(resolvedIcon(nameInput.value, entry.id), 'section-icon-svg');
        const label = document.createElement('span');
        label.textContent = entry.label;
        choice.append(preview, label);
        choice.addEventListener('click', () => {
          valueInput.value = entry.id;
          updateTrigger();
          closePicker(true);
        });
        list.appendChild(choice);
      });
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }

    function openEditor(section) {
      if (!available || !document.body.classList.contains('button-visual-new')) return false;
      editingSection = section;
      nameInput.value = section.querySelector('.section-title').textContent;
      valueInput.value = section.dataset.icon || '';
      closePicker();
      updateTrigger();
      openModal(modal.id);
      return true;
    }

    trigger.addEventListener('click', () => list.hidden ? openPicker() : closePicker());
    nameInput.addEventListener('input', updateTrigger);
    modal.querySelector('[data-section-action="cancel"]').addEventListener('click', () => requestModalDismiss(modal.id));
    modal.querySelector('[data-section-action="save"]').addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) {
        notify('Informe o nome da seção', 'err');
        nameInput.focus();
        return;
      }
      if (editingSection?.isConnected) save(editingSection, name, valueInput.value);
      closePicker();
      closeModal(modal.id);
    });
    modal.addEventListener('click', event => {
      if (event.target === modal) requestModalDismiss(modal.id);
      else if (!list.hidden && !modal.querySelector('.section-icon-field').contains(event.target)) closePicker();
    });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !list.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closePicker(true);
      }
    });
    setAvailable(true);
    return { decorate, setAvailable, isAvailable: () => available, openEditor };
  }

  window.BluExtras.register('section-icons', { load });
})();
