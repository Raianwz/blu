// ==========================================================
// Novidades da versão — conteúdo dinâmico e controle de leitura
// ==========================================================

// A prévia local da 1.9.5 não antecipa o anúncio na versão em produção.
const WHATS_NEW_195_AVAILABLE = isBluFeatureAvailable('sectionIcons');
const WHATS_NEW_VERSION = WHATS_NEW_195_AVAILABLE ? '1.9.5' : '1.9';

const WHATS_NEW_ITEMS_195 = [
  {
    icon: '🎨',
    type: 'Novo',
    status: 'new',
    title: 'Mais cores para os botões',
    description: 'Escolha entre novas cores sólidas e gradientes para personalizar os botões Outro.'
  },
  {
    icon: '📚',
    type: 'Novo',
    status: 'new',
    title: 'Ícones nas seções',
    description: 'No visual Novo, escolha um ícone ao renomear a seção. Seu nome e conteúdo continuam como você deixou.'
  },
  {
    icon: '🎃',
    type: 'Novo',
    status: 'new',
    title: 'Tema de Dia das Bruxas',
    description: 'Uma aparência sazonal opcional para os temas claro e escuro, com cores temáticas e pequenos detalhes festivos. Desative quando quiser em Menu &gt; Conteúdo.'
  }
];

const WHATS_NEW_ITEMS_19 = [
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
    icon: '📌',
    type: 'Novo',
    status: 'new',
    title: 'Acesso rápido personalizável',
    description: 'Fixe ou desfixe Gerenciar Tags e Compartilhar pelo menu de contexto.'
  },
  {
    icon: '👁️',
    type: 'Melhoria',
    status: 'moved',
    title: 'Modos de prévia de texto',
    description: 'Escolha entre a prévia Flutuante, a dica Nativa do navegador ou desative completamente.'
  },
  {
    icon: '🎨',
    type: 'Novo',
    status: 'new',
    title: 'Visual dos botões',
    description: 'Indicadores mais claros para Público e Privado. Em Outro, escolha uma cor e um ícone para cada botão.'
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
  }
];

const WHATS_NEW_ITEMS = WHATS_NEW_195_AVAILABLE ? WHATS_NEW_ITEMS_195 : WHATS_NEW_ITEMS_19;

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
    halloweenToggle.closest('.whats-new-seasonal-setting').hidden = !isBluFeatureAvailable('halloween');
    halloweenToggle.checked = document.body.classList.contains('halloween-theme');
  }
}

function setWhatsNewButtonVisual(enabled) {
  setSetting('buttonVisual', enabled ? 'new' : 'classic');
  applyButtonVisualPreference();
}

function setWhatsNewHalloweenVisual(enabled) {
  if (!isBluFeatureAvailable('halloween')) return;
  setSetting('halloweenVisual', enabled ? 'on' : 'off');
  applyHalloweenPreference();
  updateWhatsNewVisualToggle();
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
          <h2 id="whatsNewTitle">🦉 O que mudou no Blû</h2>
          <p>Confira os principais recursos, ajustes e melhorias desta atualização.</p>
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
        ${WHATS_NEW_195_AVAILABLE ? `
        <div class="whats-new-visual-setting whats-new-seasonal-setting">
          <div>
            <strong>Visual de Dia das Bruxas</strong>
            <p>Ativado na primeira vez que você abrir estas novidades, se ainda não fez uma escolha. Você pode desativá-lo aqui ou em Menu &gt; Conteúdo.</p>
          </div>
          <label class="whats-new-visual-switch">
            <input id="whatsNewHalloweenVisualSwitch" type="checkbox" role="switch" aria-label="Ativar visual de Dia das Bruxas" onchange="setWhatsNewHalloweenVisual(this.checked)">
            <span aria-hidden="true"></span>
          </label>
        </div>` : ''}
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
  if (markSeen && WHATS_NEW_195_AVAILABLE && isBluFeatureAvailable('halloween') && getSetting('halloweenVisual') === null) {
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
