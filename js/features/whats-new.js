// ==========================================================
// Novidades da versão — conteúdo dinâmico e controle de leitura
// ==========================================================

const WHATS_NEW_VERSION = '1.10.0';
const WHATS_NEW_ITEMS = [
  {
    icon: '🎨',
    type: 'Novo',
    status: 'new',
    title: 'Prévia dos botões ao editar',
    description: 'Veja a cor e o ícone escolhidos antes de salvar um botão.'
  },
  {
    icon: '🧩',
    type: 'Melhoria',
    status: 'changed',
    title: 'Recursos opcionais mais resistentes',
    description: 'Falhas em extras como novidades, diagnóstico e efeitos sazonais não impedem o Blû de abrir.'
  },
  {
    icon: '☆',
    type: 'Removido',
    status: 'removed',
    title: 'Favoritos',
    description: 'A função de favoritos foi retirada do menu, da busca e dos dados de atividade.'
  }
];

function hasSeenWhatsNew(version = WHATS_NEW_VERSION) {
  return getMetaValue('updates', 'seenVersion') === version;
}

function markWhatsNewAsSeen(version = WHATS_NEW_VERSION) {
  setMetaValue('updates', 'seenVersion', version);
  updateWhatsNewButtonUI();
}

function updateWhatsNewButtonUI() {
  const button = document.getElementById('whatsNewBtn');
  const aboutButton = document.getElementById('aboutWhatsNewBtn');
  const unseen = !hasSeenWhatsNew();
  if (button) {
    button.hidden = !unseen;
    button.setAttribute('aria-label', unseen ? 'Novidades não lidas' : 'Ver novidades desta versão');
  }
  if (aboutButton) aboutButton.hidden = false;
}

function updateWhatsNewVisualToggle() {
  const toggle = document.getElementById('whatsNewButtonVisualSwitch');
  if (toggle) toggle.checked = isNewButtonVisualEnabled();
  const halloweenToggle = document.getElementById('whatsNewHalloweenVisualSwitch');
  if (halloweenToggle) {
    halloweenToggle.closest('.whats-new-seasonal-setting').hidden =
      !isBluFeatureAvailable('halloween') || typeof applyHalloweenPreference !== 'function';
    halloweenToggle.checked = document.body.classList.contains('halloween-theme');
  }
}

function setWhatsNewButtonVisual(enabled) {
  setSetting('buttonVisual', enabled ? 'new' : 'classic');
  applyButtonVisualPreference();
}

function setWhatsNewHalloweenVisual(enabled) {
  if (!isBluFeatureAvailable('halloween') || typeof applyHalloweenPreference !== 'function') return;
  setSetting('halloweenVisual', enabled ? 'on' : 'off');
  applyHalloweenPreference();
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
          <p>Confira os principais recursos e mudanças desta versão.</p>
        </header>
        <div class="whats-new-list">${items}</div>
        <div class="whats-new-visual-setting">
          <div>
            <strong>Visual novo dos botões</strong>
            <p>Se você ainda não escolheu um visual, ele é ativado ao abrir as novidades. Altere aqui ou em Menu &gt; Conteúdo.</p>
          </div>
          <label class="whats-new-visual-switch">
            <input id="whatsNewButtonVisualSwitch" type="checkbox" role="switch" aria-label="Ativar visual novo dos botões" onchange="setWhatsNewButtonVisual(this.checked)">
            <span aria-hidden="true"></span>
          </label>
        </div>
        <div class="whats-new-visual-setting whats-new-seasonal-setting">
          <div>
            <strong>Visual de Dia das Bruxas</strong>
            <p>Durante a temporada, ative ou desative este visual aqui ou em Menu &gt; Conteúdo.</p>
          </div>
          <label class="whats-new-visual-switch">
            <input id="whatsNewHalloweenVisualSwitch" type="checkbox" role="switch" aria-label="Ativar visual de Dia das Bruxas" onchange="setWhatsNewHalloweenVisual(this.checked)">
            <span aria-hidden="true"></span>
          </label>
        </div>
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
  if (markSeen && getSetting('buttonVisual') === null) {
    setSetting('buttonVisual', 'new');
    applyButtonVisualPreference();
  }
  if (markSeen && isBluFeatureAvailable('halloween') &&
      typeof applyHalloweenPreference === 'function' && getSetting('halloweenVisual') === null) {
    setSetting('halloweenVisual', 'on');
    applyHalloweenPreference();
  }
  updateWhatsNewVisualToggle();
  document.getElementById('menuOverlay')?.classList.remove('open');
  openModal('whatsNewModal');
  if (markSeen) markWhatsNewAsSeen();
}

function initWhatsNew() {
  updateWhatsNewButtonUI();
  const button = document.getElementById('whatsNewBtn');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!button || button.hidden || window.name === 'BluePopOut' || hasSeenWhatsNew() || reducedMotion) return;
  requestAnimationFrame(() => button.classList.add('whats-new-attention'));
  button.addEventListener('animationend', () => button.classList.remove('whats-new-attention'), { once: true });
}
