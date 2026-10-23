// Optional Novo/Clássico button appearance adapted from Blû's render.js.
(function () {
  const publicPath = 'M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484q-.121.12-.242.234c-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z';

  function decorate(button) {
    if (!button || button.querySelector('.button-visual-svg')) return;
    const isPublic = button.classList.contains('vis-public');
    if (!isPublic && !button.classList.contains('vis-private')) return;
    const emoji = button.firstElementChild;
    if (!emoji || emoji.classList.contains('btn-label')) return;
    emoji.classList.add('button-visual-emoji');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('button-visual-svg');
    svg.setAttribute('viewBox', isPublic ? '0 0 16 16' : '0 0 24 24');
    svg.setAttribute('fill', isPublic ? 'currentColor' : 'none');
    if (!isPublic) {
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2.4');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
    }
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', isPublic ? 'Público' : 'Privado');
    svg.innerHTML = isPublic ? `<path d="${publicPath}"/>`
      : '<circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/>';
    emoji.after(svg);
  }

  function load({ getSetting, setSetting }) {
    const menu = document.getElementById('submenu-conteudo');
    if (!menu) throw new Error('Menu de conteúdo indisponível');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'buttonVisualBtn';
    button.className = 'menu-btn';
    button.title = 'Alternar o visual dos botões entre Novo e Clássico';
    button.innerHTML = '<svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8" cy="12" r="2"/><path d="M13 12h5"/></svg><span class="menu-btn-label"></span>';
    menu.appendChild(button);

    function apply() {
      const modern = getSetting('buttonVisual', 'classic') === 'new';
      document.body.classList.toggle('button-visual-new', modern);
      button.classList.toggle('active', modern);
      button.setAttribute('aria-pressed', String(modern));
      button.querySelector('.menu-btn-label').textContent = `Visual dos Botões: ${modern ? 'Novo' : 'Clássico'}`;
      document.dispatchEvent(new Event('blu:button-visual-change'));
    }

    button.addEventListener('click', () => {
      setSetting('buttonVisual', getSetting('buttonVisual', 'classic') === 'new' ? 'classic' : 'new');
      apply();
    });
    document.querySelectorAll('.copy-btn').forEach(decorate);
    apply();
    return { decorate, apply };
  }

  window.BluExtras.register('button-visual', { load });
})();
