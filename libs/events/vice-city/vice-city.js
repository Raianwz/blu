// Optional seasonal theme and intro, activated by the Konami code.
(() => {
  const THEME = 'vice-city-theme';
  const DURATION = 7000;
  const OUTRO_DURATION = 2000;
  const ACTIVATION_DELAY = 500;
  const VICE_LOGO = 'libs/events/vice-city/blu-vice-city.svg';
  const INTRO_AUDIO = new URL('ViceCity.ogg', document.currentScript.src).href;
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let active = false;
  let pending = false;
  let overlay = null;
  let outroOverlay = null;
  let finishTimer = null;
  let activationTimer = null;
  let introAudio = null;
  let konamiIndex = 0;

  function onKonamiKeyDown(event) {
    if (outroOverlay || activationTimer !== null) {
      konamiIndex = 0;
      return;
    }
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
        event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
      konamiIndex = 0;
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    konamiIndex = key === KONAMI[konamiIndex] ? konamiIndex + 1 : Number(key === KONAMI[0]);
    if (konamiIndex !== KONAMI.length) return;
    konamiIndex = 0;
    if (document.body.classList.contains(THEME)) {
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
      document.body.classList.add(THEME);
      syncTheme();
    }, ACTIVATION_DELAY);
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
    document.addEventListener('keydown', onKonamiKeyDown);
    new MutationObserver(syncTheme).observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && pending) startIntro();
      if (document.visibilityState !== 'visible') finishIntro();
    });
    syncTheme();
  }

  window.initViceCityIntro = initViceCityIntro;
})();
