// ==========================================================
// Novidades da versão — conteúdo dinâmico e controle de leitura
// ==========================================================

const WHATS_NEW_VERSION = '1.9';
// Ativar somente no fechamento da versão 1.9, junto ao último incremento
// planejado do cache do service worker (v19 ou, no máximo, v20).
const WHATS_NEW_PUBLIC = false;

const WHATS_NEW_ITEMS = [
  {
    icon: '🗃️',
    type: 'Novo',
    status: 'new',
    title: 'Arquivamento de conteúdo',
    description: 'Guarde botões e seções fora da tela inicial e restaure quando precisar.'
  },
  {
    icon: '🎚️',
    type: 'Melhoria',
    status: 'moved',
    title: 'Menu simplificado e avançado',
    description: 'O modo simplificado destaca o essencial. Opções avançadas continuam disponíveis em Configurações.'
  },
  {
    icon: '🔎',
    type: 'Novo',
    status: 'new',
    title: 'Pesquisas recentes',
    description: 'O histórico opcional guarda somente buscas com resultados e pode ser alternado com <kbd>Alt</kbd> + <kbd>H</kbd>.'
  },
  {
    icon: '⌨️',
    type: 'Novo',
    status: 'new',
    title: 'Atalhos de janela',
    description: 'Use <kbd>Alt</kbd> + <kbd>J</kbd> para uma nova janela e <kbd>Alt</kbd> + <kbd>P</kbd> para o pop-out.'
  },
  {
    icon: '💾',
    type: 'Alterado',
    status: 'changed',
    title: 'Dados reorganizados',
    description: 'Importação, exportação e limpeza agora ficam reunidas, com ações destrutivas visualmente separadas.'
  },
  {
    icon: '👆',
    type: 'Melhoria',
    status: 'moved',
    title: 'Ações mais responsivas',
    description: 'Botões agora apresentam respostas mais claras ao passar o mouse, usar o teclado ou clicar.'
  }
];

function hasSeenWhatsNew(version = WHATS_NEW_VERSION) {
  return getMetaValue('updates', 'seenVersion') === version;
}

function markWhatsNewAsSeen(version = WHATS_NEW_VERSION) {
  setMetaValue('updates', 'seenVersion', version);
  updateWhatsNewButtonUI();
}

function isWhatsNewPreviewEnvironment() {
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  return location.protocol === 'file:' || localHosts.has(location.hostname);
}

function updateWhatsNewButtonUI() {
  const button = document.getElementById('whatsNewBtn');
  const aboutButton = document.getElementById('aboutWhatsNewBtn');
  const available = WHATS_NEW_PUBLIC || isWhatsNewPreviewEnvironment();
  const unseen = !hasSeenWhatsNew();
  if (button) {
    button.hidden = !available || !unseen;
    button.setAttribute('aria-label', unseen ? 'Novidades não lidas' : 'Ver novidades desta versão');
  }
  if (aboutButton) aboutButton.hidden = !available;
}

function ensureWhatsNewModal() {
  const existing = document.getElementById('whatsNewModal');
  if (existing) return existing;

  const items = WHATS_NEW_ITEMS.map(item => `
    <article class="whats-new-item">
      <span class="whats-new-icon" aria-hidden="true">${item.icon}</span>
      <div><span class="custom-import-status ${item.status}">${item.type}</span><h3>${item.title}</h3><p>${item.description}</p></div>
    </article>
  `).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-bg" id="whatsNewModal" role="dialog" aria-modal="true" aria-labelledby="whatsNewTitle">
      <div class="modal whats-new-modal">
        <header class="whats-new-header">
          <span class="whats-new-kicker">Novidades · Blû ${WHATS_NEW_VERSION}</span>
          <h2 id="whatsNewTitle">🐘 O que mudou no Blû</h2>
          <p>Confira os principais recursos, ajustes e melhorias desta atualização.</p>
        </header>
        <div class="whats-new-list">${items}</div>
        <div class="modal-footer"><button class="mbtn primary" type="button" onclick="closeModal('whatsNewModal')">Entendi</button></div>
      </div>
    </div>
  `);

  const modal = document.getElementById('whatsNewModal');
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal('whatsNewModal');
  });
  return modal;
}

function openWhatsNew({ markSeen = true } = {}) {
  ensureWhatsNewModal();
  document.getElementById('menuOverlay')?.classList.remove('open');
  openModal('whatsNewModal');
  if (markSeen) markWhatsNewAsSeen();
}

function shouldShowWhatsNew() {
  return !hasSeenWhatsNew();
}

function initWhatsNew() {
  updateWhatsNewButtonUI();
  const button = document.getElementById('whatsNewBtn');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!button || button.hidden || window.name === 'BluePopOut' || hasSeenWhatsNew() || reducedMotion) return;
  requestAnimationFrame(() => button.classList.add('whats-new-attention'));
  button.addEventListener('animationend', () => button.classList.remove('whats-new-attention'), { once: true });
}
