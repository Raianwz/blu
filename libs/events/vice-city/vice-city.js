// Optional seasonal theme and intro, activated by the Konami code.
(() => {
  const THEME = 'vice-city-theme';
  const SETTING = 'vice-city';
  const DURATION = 7000;
  const OUTRO_DURATION = 2000;
  const ACTIVATION_DELAY = 500;
  const IDLE_CURSOR_DELAY = 5 * 60 * 1000;
  const VICE_LOGO = 'libs/events/vice-city/icons/blu-vice-city.svg';
  const INTRO_AUDIO = new URL('sounds/ViceCity.ogg', document.currentScript.src).href;
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const CLUE_QUERY = '#bluvicecity19';
  const CLUE_PATTERNS = [[1, 3, 5, 6, 8], [0, 2, 4, 7, 9]];
  const CLUE_SYMBOLS = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    b: 'B', a: 'A'
  };
  let active = false;
  let pending = false;
  let overlay = null;
  let outroOverlay = null;
  let finishTimer = null;
  let activationTimer = null;
  let introAudio = null;
  let konamiIndex = 0;
  let clueRoot = null;
  let clueSlots = [];
  let cluePattern = [];
  let clueProgress = 0;
  let clueResetTimer = null;
  let idleCursorTimer = null;
  let idleCursorActive = false;

  function stopIdleCursor() {
    clearTimeout(idleCursorTimer);
    idleCursorTimer = null;
    idleCursorActive = false;
    if (document.body.classList.contains('vice-city-idle-cursor')) {
      document.body.classList.remove('vice-city-idle-cursor');
    }
  }

  function scheduleIdleCursor() {
    clearTimeout(idleCursorTimer);
    idleCursorTimer = null;
    if (!eligible() || document.visibilityState !== 'visible' || idleCursorActive) return;
    idleCursorTimer = setTimeout(() => {
      idleCursorTimer = null;
      if (!eligible() || document.visibilityState !== 'visible') return;
      idleCursorActive = true;
      document.body.classList.add('vice-city-idle-cursor');
    }, IDLE_CURSOR_DELAY);
  }

  function syncIdleCursor() {
    if (!eligible()) {
      stopIdleCursor();
    } else if (document.visibilityState !== 'visible') {
      clearTimeout(idleCursorTimer);
      idleCursorTimer = null;
    } else if (!idleCursorActive && idleCursorTimer === null) {
      scheduleIdleCursor();
    }
  }

  function isClueSearch() {
    const input = document.getElementById('searchInput');
    return input && normalizeSearchText(input.value) === CLUE_QUERY;
  }

  function clueSymbol(key) {
    return CLUE_SYMBOLS[key] || (key === ' ' ? '␣' : key.length === 1 ? key.toUpperCase() : '×');
  }

  function renderClue(wrongKey = null) {
    if (!clueRoot) return;
    clueSlots.forEach((slot, index) => {
      const reached = index < clueProgress;
      const isWrong = wrongKey !== null && index === clueProgress;
      slot.className = 'vice-city-clue__slot';
      if (isWrong) slot.classList.add('wrong');
      else if (reached && wrongKey === null) slot.classList.add('lit');
      slot.textContent = isWrong ? clueSymbol(wrongKey)
        : reached || cluePattern.includes(index) ? clueSymbol(KONAMI[index]) : '';
    });
    clueRoot.setAttribute('aria-label', `Sequência misteriosa: ${clueProgress} de 10 passos corretos`);
  }

  function updateClueSearch() {
    if (!isClueSearch()) {
      clearTimeout(clueResetTimer);
      clueResetTimer = null;
      clueRoot?.remove();
      clueRoot = null;
      clueSlots = [];
      clueProgress = 0;
      konamiIndex = 0;
      return;
    }
    if (clueRoot) return;
    const results = document.getElementById('noResultsMsg');
    if (!results) return;
    cluePattern = CLUE_PATTERNS[Math.floor(Math.random() * CLUE_PATTERNS.length)];
    clueRoot = document.createElement('div');
    clueRoot.className = 'vice-city-clue';
    clueRoot.setAttribute('role', 'group');
    clueSlots = KONAMI.map(() => {
      const slot = document.createElement('span');
      slot.className = 'vice-city-clue__slot';
      slot.setAttribute('aria-hidden', 'true');
      clueRoot.appendChild(slot);
      return slot;
    });
    clueProgress = 0;
    konamiIndex = 0;
    results.insertAdjacentElement('afterend', clueRoot);
    renderClue();
  }

  function toggleViceCityTheme() {
    if (document.body.classList.contains(THEME)) {
      setSetting(SETTING, 'off');
      document.body.classList.remove(THEME);
      syncTheme();
      return;
    }
    // Start inside the key gesture so browsers can permit audible playback.
    if (!document.body.classList.contains('halloween-theme')) {
      active = true;
      pending = true;
      startIntro(true);
    }
    activationTimer = setTimeout(() => {
      activationTimer = null;
      setSetting(SETTING, 'on');
      document.body.classList.add(THEME);
      syncTheme();
    }, ACTIVATION_DELAY);
  }

  function applyViceCityPreference() {
    const enabled = getSetting(SETTING, 'off') === 'on';
    const currentlyEnabled = document.body.classList.contains(THEME);
    if (enabled === currentlyEnabled) {
      syncBranding();
      syncIdleCursor();
      return;
    }
    document.body.classList.toggle(THEME, enabled);
    // Restaurar a escolha após F5 não deve repetir a intro nem a música.
    if (enabled) {
      active = eligible();
      pending = false;
      syncBranding();
      syncIdleCursor();
    } else {
      syncTheme();
    }
  }

  function onKonamiKeyDown(event) {
    if (overlay || outroOverlay || activationTimer !== null) {
      konamiIndex = 0;
      return;
    }
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
      konamiIndex = 0;
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (clueRoot && isClueSearch()) {
      if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(key) ||
          (event.target === document.getElementById('searchInput') &&
            ['Backspace', 'Delete'].includes(key)) ||
          (event.target?.closest?.('input, textarea, select, [contenteditable="true"]') &&
            event.target !== document.getElementById('searchInput'))) return;
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      else event.stopPropagation?.();
      if (clueResetTimer !== null) return;
      if (clueProgress === KONAMI.length) {
        clueProgress = 0;
        renderClue();
      }
      if (key === KONAMI[clueProgress]) {
        clueProgress++;
        renderClue();
        if (clueProgress === KONAMI.length) {
          toggleViceCityTheme();
          clearSearch();
        }
      } else {
        renderClue(key);
        notify('Quase lá, tente novamente', 'err', { duration: 2000 });
        clueResetTimer = setTimeout(() => {
          clueResetTimer = null;
          clueProgress = 0;
          renderClue();
        }, 2000);
      }
      return;
    }
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
      konamiIndex = 0;
      return;
    }
    konamiIndex = key === KONAMI[konamiIndex] ? konamiIndex + 1 : Number(key === KONAMI[0]);
    if (konamiIndex !== KONAMI.length) return;
    konamiIndex = 0;
    toggleViceCityTheme();
  }

  function eligible() {
    return document.body.classList.contains(THEME) &&
      !document.body.classList.contains('halloween-theme');
  }

  function syncBranding() {
    const halloween = document.body.classList.contains('halloween-theme');
    const faviconPath = halloween ? 'libs/events/halloween/icons/blu-halloween.svg'
      : eligible() ? VICE_LOGO : 'assets/icons/blu.svg';
    const aboutLogoPath = halloween ? 'libs/events/halloween/icons/blu-halloween.svg'
      : eligible() ? VICE_LOGO : 'assets/icons/icon-192.png';
    const favicon = document.getElementById('bluFavicon');
    if (favicon?.getAttribute('href') !== faviconPath) favicon?.setAttribute('href', faviconPath);
    const aboutLogo = document.getElementById('aboutBluLogo');
    if (aboutLogo?.getAttribute('src') !== aboutLogoPath) aboutLogo?.setAttribute('src', aboutLogoPath);
  }

  function stopAudio() {
    if (!introAudio) return;
    introAudio.pause();
    introAudio.currentTime = 0;
    introAudio = null;
  }

  function playAudio() {
    stopAudio();
    try {
      const audio = new Audio(INTRO_AUDIO);
      audio.volume = 0.45;
      audio.addEventListener('ended', () => {
        if (introAudio === audio) introAudio = null;
      }, { once: true });
      introAudio = audio;
      audio.play().catch(() => {
        if (introAudio === audio) introAudio = null;
      });
    } catch (_) {
      // The optional intro remains usable if audio is unavailable.
      introAudio = null;
    }
  }

  function finishIntro(stopSound = true) {
    if (stopSound) stopAudio();
    if (!overlay) return;
    clearTimeout(finishTimer);
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    overlay = null;
  }

  function onKeyDown(event) {
    if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' ||
        event.key === 'Alt' || event.key === 'Meta') return;
    event.preventDefault();
    finishIntro();
  }

  function startIntro(beforeTheme = false) {
    if (overlay || outroOverlay || (!beforeTheme && !eligible()) ||
        document.body.classList.contains('halloween-theme') ||
        document.visibilityState !== 'visible') return;
    overlay = document.createElement('div');
    overlay.className = 'vice-city-intro';
    overlay.setAttribute('role', 'img');
    overlay.setAttribute('aria-label', 'Logo do Blû surgindo em luzes de néon. Clique ou pressione uma tecla para pular a abertura.');
    overlay.innerHTML = `
      <div class="vice-city-intro__horizon" aria-hidden="true"></div>
      <div class="vice-city-intro__frame" aria-hidden="true">
        <!-- Geometria do logo em assets/icons/blu.svg, mantida inline para animar os traços. -->
        <svg class="vice-city-intro__logo" viewBox="0 0 512 512" aria-hidden="true">
          <defs>
            <linearGradient id="vice-neon-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#ffad83"/>
              <stop offset=".5" stop-color="#ff72b8"/>
              <stop offset="1" stop-color="#74e9ec"/>
            </linearGradient>
            <linearGradient id="vice-neon-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#ff986e"/>
              <stop offset=".52" stop-color="#ed4a9a"/>
              <stop offset="1" stop-color="#693eac"/>
            </linearGradient>
            <clipPath id="vice-b-cutouts">
              <path d="m159 106h230v322h-230zm154.1 62.1c0-19.08-16.45-34.5-36.8-34.5-20.35 0-36.8 15.42-36.8 34.5 0 19.08 16.45 34.5 36.8 34.5 20.35 0 36.8-15.42 36.8-34.5zm20.7 156.4c0-26.71-21.59-48.3-48.3-48.3-26.71 0-48.3 21.59-48.3 48.3 0 26.71 21.59 48.3 48.3 48.3 26.71 0 48.3-21.59 48.3-48.3z"/>
            </clipPath>
            <path id="vice-square" d="m120 0h272c66.27 0 120 53.73 120 120v272c0 66.27-53.73 120-120 120h-272c-66.27 0-120-53.73-120-120v-272c0-66.27 53.73-120 120-120z"/>
            <g id="vice-b">
              <path d="m175.1 106h18.4c8.89 0 16.1 7.21 16.1 16.1v266.8c0 8.89-7.21 16.1-16.1 16.1h-18.4c-8.89 0-16.1-7.21-16.1-16.1v-266.8c0-8.89 7.21-16.1 16.1-16.1z"/>
              <path d="m202.7 106h82.8c21.59 0 39.1 17.51 39.1 39.1v57.5c0 21.59-17.51 39.1-39.1 39.1h-82.8c-21.59 0-39.1-17.51-39.1-39.1v-57.5c0-21.59 17.51-39.1 39.1-39.1z"/>
              <path d="m205 239.4h105.8c22.86 0 41.4 18.54 41.4 41.4v82.8c0 22.86-18.54 41.4-41.4 41.4h-105.8c-22.86 0-41.4-18.54-41.4-41.4v-82.8c0-22.86 18.54-41.4 41.4-41.4z"/>
            </g>
          </defs>
          <use href="#vice-square" class="vice-city-intro__square-fill"/>
          <use href="#vice-square" class="vice-city-intro__square-trace"/>
          <use href="#vice-b" clip-path="url(#vice-b-cutouts)" class="vice-city-intro__b-fill"/>
          <use href="#vice-b" clip-path="url(#vice-b-cutouts)" class="vice-city-intro__b-trace"/>
        </svg>
      </div>
      <span class="vice-city-intro__skip">Clique ou pressione uma tecla para pular</span>`;
    overlay.addEventListener('click', finishIntro);
    document.body.appendChild(overlay);
    pending = false;
    document.addEventListener('keydown', onKeyDown, true);
    playAudio();
    finishTimer = setTimeout(() => finishIntro(false), DURATION);
  }

  function startOutro() {
    if (outroOverlay || document.visibilityState !== 'visible') return;
    outroOverlay = document.createElement('div');
    outroOverlay.className = 'vice-city-outro';
    outroOverlay.setAttribute('role', 'img');
    outroOverlay.setAttribute('aria-label', 'Logo original do Blû retornando ao centro da tela.');
    outroOverlay.innerHTML = '<img src="assets/icons/blu.svg" alt="" aria-hidden="true">';
    document.body.appendChild(outroOverlay);
    setTimeout(() => {
      outroOverlay?.remove();
      outroOverlay = null;
      if (pending) startIntro();
    }, OUTRO_DURATION);
  }

  function syncTheme() {
    syncBranding();
    syncIdleCursor();
    const enabled = eligible();
    if (!enabled) {
      if (activationTimer !== null && !document.body.classList.contains('halloween-theme')) return;
      const wasActive = active;
      active = false;
      pending = false;
      finishIntro();
      if (wasActive && !document.body.classList.contains(THEME) &&
          !document.body.classList.contains('halloween-theme')) startOutro();
      return;
    }
    if (active) return;
    active = true;
    pending = true;
    startIntro();
  }

  function initViceCityIntro() {
    applyViceCityPreference();
    active = eligible();
    pending = false;
    document.addEventListener('keydown', onKonamiKeyDown, true);
    document.addEventListener('blu:search-updated', updateClueSearch);
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(name => {
      document.addEventListener(name, () => {
        if (idleCursorTimer !== null) scheduleIdleCursor();
      }, { passive: true });
    });
    new MutationObserver(syncTheme).observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
    document.addEventListener('visibilitychange', () => {
      syncIdleCursor();
      if (document.visibilityState === 'visible' && pending) startIntro();
      if (document.visibilityState !== 'visible') finishIntro();
    });
    window.addEventListener('storage', event => {
      if (event.key === 'blu:settings' || event.key === null) applyViceCityPreference();
    });
    syncTheme();
    updateClueSearch();
  }

  window.initViceCityIntro = initViceCityIntro;
  window.applyViceCityPreference = applyViceCityPreference;
})();
