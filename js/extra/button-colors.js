// Palette and color picker adapted from Blû's button-icon-picker.js.
(function () {
  const solids = [
    { color: '#7C3AED', label: 'Roxo' },
    { color: '#15803D', label: 'Verde' },
    { color: '#0F766E', label: 'Turquesa' },
    { color: '#C2410C', label: 'Laranja' },
    { color: '#B91C1C', label: 'Vermelho' },
    { color: '#856B00', label: 'Amarelo' },
    { color: '#BE185D', label: 'Rosa' },
    { color: '#4338CA', label: 'Índigo' },
    { color: '#3B3330', label: 'Carvão' },
    { color: '#881337', label: 'Vinho' },
    { color: '#596515', label: 'Oliva' },
    { color: '#70452E', label: 'Café' },
    { color: '#A21CAF', label: 'Magenta' }
  ];
  const gradients = [
    { color: 'legacy-gradient', label: 'Gradiente padrão', background: 'linear-gradient(135deg, #667eea, #764ba2)' },
    { color: 'gradient-aurora', label: 'Gradiente aurora', background: 'linear-gradient(135deg, #5B21B6, #9D174D)' },
    { color: 'gradient-forest', label: 'Gradiente floresta', background: 'linear-gradient(135deg, #166534, #0F766E)' },
    { color: 'gradient-ember', label: 'Gradiente brasa', background: 'linear-gradient(135deg, #9A3412, #9D174D)' },
    { color: 'gradient-gold', label: 'Gradiente dourado', background: 'linear-gradient(135deg, #996100, #AD5300)' },
    { color: 'gradient-ocean', label: 'Gradiente oceano', background: 'linear-gradient(135deg, #0F766E, #4338CA)' },
    { color: 'gradient-night', label: 'Gradiente noite', background: 'linear-gradient(135deg, #312E81, #164E63)' },
    { color: 'gradient-vineyard', label: 'Gradiente vinhedo', background: 'linear-gradient(135deg, #86198F, #881337)' },
    { color: 'gradient-autumn', label: 'Gradiente outono', background: 'linear-gradient(135deg, #966400, #A13621)' },
    { color: 'gradient-moss', label: 'Gradiente musgo', background: 'linear-gradient(135deg, #657018, #285438)' },
    { color: 'gradient-cocoa', label: 'Gradiente cacau', background: 'linear-gradient(135deg, #825438, #45271D)' }
  ];
  const palette = [...solids, ...gradients];
  const defaultBackground = gradients[0].background;
  let mounted = false;
  let initialValue = '';

  function backgroundFor(color) {
    const entry = palette.find(item => item.color.toLowerCase() === String(color).toLowerCase());
    if (entry) return entry.background || entry.color;
    return /^#[0-9a-f]{6}$/i.test(color) ? color
      : document.body.classList.contains('button-visual-new') ? solids[0].color : defaultBackground;
  }

  function close(focusTrigger = false) {
    const list = document.getElementById('buttonColorList');
    if (!list) return;
    list.hidden = true;
    const trigger = document.getElementById('buttonColorTrigger');
    trigger.setAttribute('aria-expanded', 'false');
    if (focusTrigger) trigger.focus();
  }

  function isOpen() {
    return !document.getElementById('buttonColorList')?.hidden;
  }

  function updateTrigger() {
    const select = document.getElementById('bCustomColor');
    const selected = select.selectedOptions[0];
    document.getElementById('buttonColorName').textContent = selected?.textContent || 'Cor padrão';
    document.getElementById('buttonColorPreview').style.background = backgroundFor(select.value);
  }

  function setValue(customVis) {
    const select = document.getElementById('bCustomColor');
    if (!select) return;
    const raw = String(customVis?.color || '');
    const requested = raw.toLowerCase() === '#806700' ? '#856B00' : raw;
    const selected = requested && requested !== 'legacy-gradient'
      && (customVis?.colorSelected === true || requested.toLowerCase() !== '#7c3aed')
      ? palette.find(entry => entry.color.toLowerCase() === requested.toLowerCase())?.color || requested
      : '';
    select.replaceChildren(new Option('Cor padrão', ''));
    palette.filter(entry => entry.color !== 'legacy-gradient').forEach(entry => {
      select.add(new Option(entry.label, entry.color));
    });
    if (selected && ![...select.options].some(option => option.value === selected)) {
      select.add(new Option(`Cor importada (${selected})`, selected));
    }
    select.value = selected;
    initialValue = selected;
    updateTrigger();
    close();
    updateVisibility();
  }

  function getValue() {
    const color = document.getElementById('bCustomColor').value || null;
    return { color, colorSelected: Boolean(color), changed: (color || '') !== initialValue };
  }

  function renderChoices() {
    const select = document.getElementById('bCustomColor');
    const list = document.getElementById('buttonColorList');
    list.replaceChildren();
    [...select.options].forEach(option => {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'button-color-choice';
      choice.setAttribute('role', 'option');
      choice.setAttribute('aria-selected', String(option.value === select.value));
      const swatch = document.createElement('span');
      swatch.className = 'button-color-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.background = backgroundFor(option.value);
      const label = document.createElement('span');
      label.textContent = option.textContent;
      choice.append(swatch, label);
      choice.addEventListener('click', () => {
        select.value = option.value;
        updateTrigger();
        close(true);
      });
      list.append(choice);
    });
  }

  function toggle() {
    const list = document.getElementById('buttonColorList');
    if (!list.hidden) return close();
    renderChoices();
    list.hidden = false;
    document.getElementById('buttonColorTrigger').setAttribute('aria-expanded', 'true');
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  function updateVisibility() {
    const visible = document.getElementById('bVis').value === 'other';
    document.getElementById('buttonColorMount').hidden = !visible;
    if (!visible) close();
  }

  function load() {
    if (!mounted) {
      const mount = document.getElementById('buttonColorMount');
      mount.innerHTML = '<label id="buttonColorLabel" for="buttonColorTrigger">Cor do botão</label>'
        + '<select id="bCustomColor" hidden tabindex="-1" aria-hidden="true"></select>'
        + '<button type="button" id="buttonColorTrigger" class="button-color-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="buttonColorList">'
        + '<span id="buttonColorPreview" class="button-color-swatch" aria-hidden="true"></span>'
        + '<span id="buttonColorName">Cor padrão</span><span class="button-color-chevron" aria-hidden="true">⌄</span></button>'
        + '<div id="buttonColorList" class="button-color-list" role="listbox" aria-labelledby="buttonColorLabel" hidden></div>';
      const trigger = document.getElementById('buttonColorTrigger');
      const list = document.getElementById('buttonColorList');
      trigger.addEventListener('click', toggle);
      trigger.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        if (list.hidden) toggle();
        const choices = [...list.querySelectorAll('.button-color-choice')];
        const selected = choices.findIndex(choice => choice.getAttribute('aria-selected') === 'true');
        choices[event.key === 'ArrowUp' ? Math.max(selected - 1, 0) : Math.min(selected + 1, choices.length - 1)]?.focus();
      });
      list.addEventListener('keydown', event => {
        if (event.key === 'Tab') return close();
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const choices = [...list.querySelectorAll('.button-color-choice')];
        const index = choices.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1
          : event.key === 'ArrowDown' ? Math.min(index + 1, choices.length - 1) : Math.max(index - 1, 0);
        choices[next]?.focus();
      });
      document.addEventListener('click', event => {
        if (!mount.contains(event.target)) close();
      });
      document.addEventListener('blu:button-visual-change', () => {
        updateTrigger();
        if (isOpen()) renderChoices();
      });
      mounted = true;
    }
    setValue(null);
    return { setValue, getValue, updateVisibility, isOpen, close };
  }

  window.BluExtras.register('button-colors', { load });
})();
