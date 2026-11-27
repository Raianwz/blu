// Optional seasonal theme and intro, activated by the Konami code.
(() => {
  const THEME = 'vice-city-theme';
  const SETTING = 'vice-city';
  const THEME_END = Date.parse('2026-11-28T17:00:00-03:00');
  const DURATION = 7000;
  const AUDIO_FADE_DURATION = 250;
  const OUTRO_DURATION = 2000;
  const SHUTDOWN_ANIMATION_DURATION = 6000;
  const SNOW_DURATION = 30000;
  const SNOW_FLAKES = 24;
  const END_MODE = new URLSearchParams(window.location.search).get('vice-end');
  const ACTIVATION_DELAY = 500;
  const IDLE_CURSOR_DELAY = 5 * 60 * 1000;
  const IDLE_CURSOR_REPEAT_DELAY = 2 * 60 * 1000;
  const CURSOR_MIN_SIZE = 16;
  const CURSOR_MAX_SIZE = 32;
  const CURSOR_STEP = 2;
  const CURSOR_BASE = new URL('cursor/', document.currentScript.src);
  const CURSOR_ASSETS = {
    arrow: 'ViceCity_Cursor_32.png',
    hand: 'ViceCity_Hand.svg',
    idle: 'ViceCity_VI_32.png'
  };
  const VICE_LOGO = 'libs/events/vice-city/icons/blu-vice-city.svg';
  const INTRO_AUDIO = new URL('sounds/ViceCity.ogg', document.currentScript.src).href;
  const RETURN_AUDIO = new URL('sounds/ocarina.ogg', document.currentScript.src).href;
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const CLUE_QUERY = '#bluvicecity19';
  const CLUE_PATTERNS = [[1, 3, 5, 6, 8], [0, 2, 4, 7, 9]];
  const TOUCH_CLUE = window.matchMedia?.('(any-pointer: coarse)')?.matches === true;
  const CLUE_SYMBOLS = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    b: 'B', a: 'A'
  };
  const CLUE_KEY_NAMES = {
    ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda',
    ArrowRight: 'direita', b: 'B', a: 'A'
  };
  let active = false;
  let pending = false;
  let overlay = null;
  let outroOverlay = null;
  let shutdownOverlay = null;
  let shutdownAnimationTimer = null;
  let shutdownWaitingForGesture = false;
  let shutdownGestureAction = null;
  let previewPrompt = null;
  let finishTimer = null;
  let introRemaining = DURATION;
  let introStartedAt = null;
  let introPaused = false;
  let activationTimer = null;
  let shutdownTimer = null;
  let introAudio = null;
  let returnAudio = null;
  let snowOverlay = null;
  let snowTimer = null;
  let audioFadeTimers = [];
  let konamiIndex = 0;
  let clueRoot = null;
  let clueSlots = [];
  let cluePattern = [];
  let clueProgress = 0;
  let clueResetTimer = null;
  let idleCursorTimer = null;
  let idleCursorActive = false;
  let idleCursorShown = false;
  let cursorSize = CURSOR_MAX_SIZE;
  let cursorRevision = 0;
  let cursorImagesPromise = null;
  const cursorSizeCache = new Map();
  let cursorTipShown = false;

  function setCursorReady(ready) {
    const classList = document.body.classList;
    if (classList.contains('vice-city-cursor-ready') === ready) return;
    classList.toggle('vice-city-cursor-ready', ready);
  }

  function showCursorTip() {
    if (cursorTipShown || TOUCH_CLUE || !eligible() || overlay || outroOverlay ||
        document.visibilityState !== 'visible') return;
    cursorTipShown = true;
    notify('Você pode ajustar o tamanho do ponteiro: segure Shift e use a roda do mouse.',
      'ok', { duration: 7000 });
  }

  function clearCursorSizeStyles() {
    for (const name of Object.keys(CURSOR_ASSETS)) {
      document.body.style.removeProperty(`--vice-cursor-${name}`);
    }
  }

  function resetCursorSize() {
    if (cursorSize === CURSOR_MAX_SIZE) return;
    cursorSize = CURSOR_MAX_SIZE;
    cursorRevision++;
    clearCursorSizeStyles();
  }

  function loadCursorImages() {
    if (!cursorImagesPromise) {
      cursorImagesPromise = Promise.all(Object.entries(CURSOR_ASSETS).map(([name, file]) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve([name, image]);
          image.onerror = reject;
          image.src = new URL(file, CURSOR_BASE).href;
        })
      )).catch(error => {
        cursorImagesPromise = null;
        throw error;
      });
    }
    return cursorImagesPromise;
  }

  function renderCursorImage(image, size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  }

  async function setCursorSize(size) {
    cursorSize = size;
    const revision = ++cursorRevision;
    if (size === CURSOR_MAX_SIZE) {
      clearCursorSizeStyles();
      return;
    }
    try {
      let styles = cursorSizeCache.get(size);
      if (!styles) {
        const images = await loadCursorImages();
        if (revision !== cursorRevision || !eligible()) return;
        styles = Object.fromEntries(images.map(([name, image]) => {
          const hotspot = name.startsWith('hand') ? [12, 2]
            : name.startsWith('idle') ? [11, 30] : [0, 0];
          const [x, y] = hotspot.map(value => Math.round(value * size / CURSOR_MAX_SIZE));
          return [name, `url("${renderCursorImage(image, size)}") ${x} ${y}`];
        }));
        cursorSizeCache.set(size, styles);
      }
      if (revision !== cursorRevision || !eligible()) return;
      for (const [name, value] of Object.entries(styles)) {
        document.body.style.setProperty(`--vice-cursor-${name}`, value);
      }
    } catch {
      if (revision !== cursorRevision || !eligible()) return;
      resetCursorSize();
      notify('Não foi possível ajustar o tamanho do cursor', 'err');
    }
  }

  function onCursorSizeWheel(event) {
    if (!eligible() || !event.shiftKey) return;
    const delta = event.deltaY || event.deltaX;
    if (!delta) return;
    event.preventDefault();
    const nextSize = Math.max(CURSOR_MIN_SIZE,
      Math.min(CURSOR_MAX_SIZE, cursorSize + (delta < 0 ? CURSOR_STEP : -CURSOR_STEP)));
    if (nextSize !== cursorSize) setCursorSize(nextSize);
  }

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
    if (!eligible() || !document.body.classList.contains('vice-city-cursor-ready') ||
        document.visibilityState !== 'visible' || idleCursorActive) return;
    idleCursorTimer = setTimeout(() => {
      idleCursorTimer = null;
      if (!eligible() || !document.body.classList.contains('vice-city-cursor-ready') ||
          document.visibilityState !== 'visible') return;
      idleCursorActive = true;
      idleCursorShown = true;
      document.body.classList.add('vice-city-idle-cursor');
    }, idleCursorShown ? IDLE_CURSOR_REPEAT_DELAY : IDLE_CURSOR_DELAY);
  }

  function noteIdleCursorClick() {
    if (!idleCursorActive || !eligible() || document.visibilityState !== 'visible') return;
    stopIdleCursor();
    scheduleIdleCursor();
  }

  function syncIdleCursor() {
    if (!eligible() || !document.body.classList.contains('vice-city-cursor-ready')) {
      stopIdleCursor();
    } else if (document.visibilityState !== 'visible') {
      clearTimeout(idleCursorTimer);
      idleCursorTimer = null;
    } else if (idleCursorActive && !document.body.classList.contains('vice-city-idle-cursor')) {
      document.body.classList.add('vice-city-idle-cursor');
    } else if (!idleCursorActive && idleCursorTimer === null) {
      scheduleIdleCursor();
    }
  }

  function isClueSearch() {
    const input = document.getElementById('searchInput');
    return !hasEnded() && END_MODE !== 'true' && END_MODE !== 'demo' &&
      input && normalizeSearchText(input.value) === CLUE_QUERY;
  }

  function clueSymbol(key) {
    return CLUE_SYMBOLS[key] || (key === ' ' ? '␣' : key.length === 1 ? key.toUpperCase() : '×');
  }

  function renderClue(wrongKey = null) {
    if (!clueRoot) return;
    clueSlots.forEach((slot, index) => {
      const reached = index < clueProgress;
      const wrongIndex = TOUCH_CLUE && wrongKey !== null && typeof wrongKey === 'object'
        ? wrongKey.index : clueProgress;
      const isWrong = wrongKey !== null && index === wrongIndex;
      slot.className = 'vice-city-clue__slot';
      if (isWrong) slot.classList.add('wrong');
      else if (reached && wrongKey === null) slot.classList.add('lit');
      slot.textContent = !TOUCH_CLUE && isWrong ? clueSymbol(wrongKey)
        : TOUCH_CLUE || reached || cluePattern.includes(index) ? clueSymbol(KONAMI[index]) : '';
    });
    clueRoot.setAttribute('aria-label', `${TOUCH_CLUE ? 'Toque os símbolos na ordem. ' : ''}Sequência misteriosa: ${clueProgress} de 10 passos corretos`);
  }

  function advanceClue(key, index = null) {
    if (clueResetTimer !== null) return;
    if (clueProgress === KONAMI.length) {
      clueProgress = 0;
      renderClue();
    }
    if (key === KONAMI[clueProgress] && (index === null || index === clueProgress)) {
      clueProgress++;
      renderClue();
      if (clueProgress === KONAMI.length) {
        toggleViceCityTheme();
        clearSearch();
      }
    } else {
      renderClue(TOUCH_CLUE ? { index } : key);
      notify('Quase lá, tente novamente', 'err', { duration: 2000 });
      clueResetTimer = setTimeout(() => {
        clueResetTimer = null;
        clueProgress = 0;
        renderClue();
      }, 2000);
    }
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
    clueRoot.className = TOUCH_CLUE ? 'vice-city-clue vice-city-clue--touch' : 'vice-city-clue';
    clueRoot.setAttribute('role', 'group');
    clueSlots = KONAMI.map((key, index) => {
      const slot = document.createElement(TOUCH_CLUE ? 'button' : 'span');
      slot.className = 'vice-city-clue__slot';
      if (TOUCH_CLUE) {
        slot.type = 'button';
        slot.setAttribute('aria-label', `Passo ${index + 1}: ${CLUE_KEY_NAMES[key]}`);
        slot.addEventListener('click', () => advanceClue(key, index));
      } else {
        slot.setAttribute('aria-hidden', 'true');
      }
      clueRoot.appendChild(slot);
      return slot;
    });
    if (!TOUCH_CLUE) {
      const keyboard = document.createElement('div');
      keyboard.className = 'vice-city-clue__keyboard';
      keyboard.setAttribute('aria-hidden', 'true');
      for (const [name, symbol] of [
        ['left', '←'], ['up', '↑'], ['right', '→'],
        ['down', '↓'], ['a', 'A'], ['b', 'B']
      ]) {
        const key = document.createElement('kbd');
        key.className = `vice-city-clue__key vice-city-clue__key--${name}`;
        key.textContent = symbol;
        keyboard.appendChild(key);
      }
      clueRoot.appendChild(keyboard);
    }
    clueProgress = 0;
    konamiIndex = 0;
    results.insertAdjacentElement('afterend', clueRoot);
    renderClue();
  }

  function hasEnded() {
    return Date.now() >= THEME_END;
  }

  function scheduleShutdown() {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
    if (!active && !pending && !document.body.classList.contains(THEME)) return;
    const remaining = THEME_END - Date.now();
    if (remaining > 0) shutdownTimer = setTimeout(shutdownViceCity, remaining);
  }

  function shutdownViceCity({ preview = false } = {}) {
    const animate = document.body.classList.contains(THEME) || preview;
    previewPrompt?.remove();
    previewPrompt = null;
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
    clearTimeout(activationTimer);
    activationTimer = null;
    if (getSetting(SETTING, 'off') === 'on') setSetting(SETTING, 'off');
    active = false;
    document.body.classList.remove(THEME);
    pending = false;
    syncTheme();
    updateClueSearch();
    if (preview) startShutdownAnimation();
    else if (animate) armShutdownAnimation();
  }

  function toggleViceCityTheme() {
    if (shutdownOverlay) return;
    if (hasEnded()) {
      shutdownViceCity();
      return;
    }
    if (document.body.classList.contains(THEME)) {
      setSetting(SETTING, 'off');
      setCursorReady(false);
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
    scheduleShutdown();
    activationTimer = setTimeout(() => {
      activationTimer = null;
      if (hasEnded()) {
        shutdownViceCity();
        return;
      }
      setSetting(SETTING, 'on');
      document.body.classList.add(THEME);
      syncTheme();
      showCursorTip();
    }, ACTIVATION_DELAY);
  }

  function applyViceCityPreference() {
    if (hasEnded()) {
      shutdownViceCity();
      return;
    }
    const enabled = getSetting(SETTING, 'off') === 'on';
    const currentlyEnabled = document.body.classList.contains(THEME);
    if (enabled === currentlyEnabled) {
      syncBranding();
      syncIdleCursor();
      scheduleShutdown();
      return;
    }
    document.body.classList.toggle(THEME, enabled);
    // Restaurar a escolha após F5 não deve repetir a intro nem a música.
    if (enabled) {
      setCursorReady(true);
      active = eligible();
      pending = false;
      syncBranding();
      syncIdleCursor();
      scheduleShutdown();
    } else {
      syncTheme();
    }
  }

  function onKonamiKeyDown(event) {
    if (shutdownOverlay) return;
    if (hasEnded()) {
      konamiIndex = 0;
      if (document.body.classList.contains(THEME)) shutdownViceCity();
      return;
    }
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
      if (TOUCH_CLUE && ['Enter', ' '].includes(key) &&
          event.target?.closest?.('.vice-city-clue__slot')) return;
      if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(key) ||
          (event.target === document.getElementById('searchInput') &&
            ['Backspace', 'Delete'].includes(key)) ||
          (event.target?.closest?.('input, textarea, select, [contenteditable="true"]') &&
            event.target !== document.getElementById('searchInput'))) return;
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      else event.stopPropagation?.();
      advanceClue(key);
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
    return !hasEnded() && document.body.classList.contains(THEME) &&
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
    audioFadeTimers.forEach(clearTimeout);
    audioFadeTimers = [];
    if (!introAudio) return;
    introAudio.pause();
    introAudio.currentTime = 0;
    introAudio = null;
  }

  function fadeOutAudio() {
    const audio = introAudio;
    if (!audio) return;
    const initialVolume = audio.volume;
    const steps = 5;
    for (let step = 1; step <= steps; step++) {
      audioFadeTimers.push(setTimeout(() => {
        if (introAudio !== audio) return;
        audio.volume = initialVolume * (1 - step / steps);
        if (step === steps) stopAudio();
      }, AUDIO_FADE_DURATION * step / steps));
    }
  }

  function playAudio(onBlocked) {
    stopAudio();
    try {
      const audio = new Audio(INTRO_AUDIO);
      audio.volume = 0.45;
      audio.addEventListener('ended', () => {
        if (introAudio === audio) {
          audioFadeTimers.forEach(clearTimeout);
          audioFadeTimers = [];
          introAudio = null;
        }
      }, { once: true });
      introAudio = audio;
      audio.play().catch(() => {
        if (introAudio === audio) {
          introAudio = null;
          onBlocked?.();
        }
      });
    } catch (_) {
      // The optional intro remains usable if audio is unavailable.
      introAudio = null;
    }
  }

  function stopReturnAudio() {
    if (!returnAudio) return;
    returnAudio.pause();
    returnAudio.currentTime = 0;
    returnAudio = null;
  }

  function playReturnAudio() {
    stopReturnAudio();
    try {
      const audio = new Audio(RETURN_AUDIO);
      audio.volume = 0.12;
      audio.addEventListener('ended', () => {
        if (returnAudio === audio) returnAudio = null;
      }, { once: true });
      returnAudio = audio;
      audio.play().catch(() => {
        if (returnAudio === audio) returnAudio = null;
      });
    } catch (_) {
      returnAudio = null;
    }
  }

  function showOcarinaToast() {
    const toast = notify('Uma ocarina? O tempo está mudando...', 'ok', { duration: 30000 });
    if (!toast) return;
    toast.classList.add('vice-city-ocarina-toast');
    toast.title = 'Clique para fechar';
    toast.addEventListener('click', () => toast.remove(), { once: true });
    const icon = document.createElement('span');
    icon.className = 'vice-city-ocarina-toast__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1 7 10h10L12 1ZM6.5 11 1.5 20h10l-5-9Zm11 0-5 9h10l-5-9Z"/></svg>';
    toast.prepend(icon);
  }

  function stopSnow() {
    clearTimeout(snowTimer);
    snowTimer = null;
    snowOverlay?.remove();
    snowOverlay = null;
  }

  function startSnow() {
    stopSnow();
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    snowOverlay = document.createElement('div');
    snowOverlay.className = 'vice-city-snow';
    snowOverlay.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < SNOW_FLAKES; index++) {
      const flake = document.createElement('span');
      flake.className = 'vice-city-snow__flake';
      const x = (index * 43 + 7) % 100;
      const size = 2 + index % 4;
      const duration = 12 + index % 8;
      const delay = -((index * 7) % duration);
      const sway = (index % 7 - 3) * 12;
      flake.setAttribute('style', `--snow-x:${x}%;--snow-size:${size}px;--snow-duration:${duration}s;--snow-delay:${delay}s;--snow-sway:${sway}px`);
      snowOverlay.appendChild(flake);
    }
    document.body.appendChild(snowOverlay);
    snowTimer = setTimeout(stopSnow, SNOW_DURATION);
  }

  function finishIntro(stopSound = true) {
    if (stopSound) stopAudio();
    if (!overlay) return;
    clearTimeout(finishTimer);
    finishTimer = null;
    introRemaining = DURATION;
    introStartedAt = null;
    introPaused = false;
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    overlay = null;
    if (eligible() || activationTimer !== null) {
      setCursorReady(true);
      syncIdleCursor();
    }
    showCursorTip();
  }

  function scheduleIntroFinish() {
    introStartedAt = Date.now();
    finishTimer = setTimeout(() => finishIntro(false), introRemaining);
  }

  function pauseIntro() {
    if (!overlay || introPaused) return;
    introRemaining = Math.max(0, introRemaining - (Date.now() - introStartedAt));
    clearTimeout(finishTimer);
    finishTimer = null;
    introStartedAt = null;
    introPaused = true;
    overlay.classList.add('vice-city-intro--paused');
    introAudio?.pause();
  }

  function resumeIntro() {
    if (!overlay || !introPaused) return;
    overlay.classList.remove('vice-city-intro--paused');
    introPaused = false;
    if (introAudio) introAudio.play().catch(() => {});
    if (introRemaining > 0) scheduleIntroFinish();
    else finishIntro(false);
  }

  function onKeyDown(event) {
    if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' ||
        event.key === 'Alt' || event.key === 'Meta') return;
    event.preventDefault();
    skipIntro();
  }

  function skipIntro() {
    if (!overlay) return;
    finishIntro(false);
    fadeOutAudio();
  }

  function createNeonOverlay() {
    const neon = document.createElement('div');
    neon.className = 'vice-city-intro';
    neon.setAttribute('role', 'img');
    neon.innerHTML = `
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
    return neon;
  }

  function startIntro(beforeTheme = false) {
    if (hasEnded() || overlay || outroOverlay || shutdownOverlay || (!beforeTheme && !eligible()) ||
        document.body.classList.contains('halloween-theme') ||
        document.visibilityState !== 'visible') return;
    stopReturnAudio();
    stopSnow();
    setCursorReady(false);
    overlay = createNeonOverlay();
    overlay.setAttribute('aria-label', 'Logo do Blû surgindo em luzes de néon. Clique ou pressione uma tecla para pular a abertura.');
    overlay.addEventListener('click', skipIntro);
    document.body.appendChild(overlay);
    pending = false;
    document.addEventListener('keydown', onKeyDown, true);
    playAudio();
    introRemaining = DURATION;
    introPaused = false;
    scheduleIntroFinish();
  }

  function finishShutdownAnimation() {
    clearTimeout(shutdownAnimationTimer);
    shutdownAnimationTimer = null;
    if (!shutdownOverlay) return;
    fadeOutAudio();
    startOutro(true);
    shutdownOverlay.remove();
    shutdownOverlay = null;
  }

  function startShutdownAnimation() {
    if (shutdownOverlay || outroOverlay) return;
    stopReturnAudio();
    stopSnow();
    shutdownOverlay = createNeonOverlay();
    shutdownOverlay.classList.add('vice-city-intro--reverse');
    shutdownOverlay.setAttribute('aria-label', 'As luzes do logo Vice City se apagam antes do retorno ao Blû.');
    shutdownOverlay.innerHTML += '<img class="vice-city-intro__blue-logo" src="assets/icons/blu.svg" alt="" aria-hidden="true"><span class="vice-city-intro__sound-hint">Clique para ativar o som</span>';
    const retryAudio = () => {
      if (!shutdownOverlay?.classList.contains('vice-city-intro--needs-audio')) return;
      shutdownOverlay.classList.remove('vice-city-intro--needs-audio');
      playAudio(() => shutdownOverlay?.classList.add('vice-city-intro--needs-audio'));
    };
    shutdownOverlay.addEventListener('click', retryAudio);
    document.body.appendChild(shutdownOverlay);
    playAudio(() => shutdownOverlay?.classList.add('vice-city-intro--needs-audio'));
    shutdownAnimationTimer = setTimeout(finishShutdownAnimation, SHUTDOWN_ANIMATION_DURATION);
  }

  function onShutdownGesture(event) {
    if (!shutdownWaitingForGesture || event.isTrusted === false) return;
    if (event.key && (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key) ||
        event.altKey || event.ctrlKey || event.metaKey || event.isComposing)) return;
    shutdownWaitingForGesture = false;
    const action = shutdownGestureAction;
    shutdownGestureAction = null;
    document.removeEventListener('click', onShutdownGesture, true);
    document.removeEventListener('keydown', onShutdownGesture, true);
    document.removeEventListener('input', onShutdownGesture, true);
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    action?.();
  }

  function armShutdownAnimation(action = startShutdownAnimation) {
    if (shutdownWaitingForGesture || shutdownOverlay) return;
    shutdownWaitingForGesture = true;
    shutdownGestureAction = action;
    document.addEventListener('click', onShutdownGesture, true);
    document.addEventListener('keydown', onShutdownGesture, true);
    document.addEventListener('input', onShutdownGesture, true);
  }

  function showShutdownPreview() {
    if (previewPrompt || shutdownOverlay) return;
    previewPrompt = document.createElement('div');
    previewPrompt.className = 'vice-city-end-preview';
    previewPrompt.setAttribute('role', 'dialog');
    previewPrompt.setAttribute('aria-modal', 'true');
    previewPrompt.setAttribute('aria-label', 'Prévia do encerramento Vice City');
    const start = document.createElement('button');
    start.type = 'button';
    start.textContent = 'Iniciar saída com som';
    start.addEventListener('click', () => shutdownViceCity({ preview: true }));
    previewPrompt.appendChild(start);
    document.body.appendChild(previewPrompt);
    start.focus?.();
  }

  function startOutro(afterShutdown = false) {
    if (outroOverlay || document.visibilityState !== 'visible') return;
    outroOverlay = document.createElement('div');
    outroOverlay.className = afterShutdown ? 'vice-city-outro vice-city-outro--after-shutdown' : 'vice-city-outro';
    outroOverlay.setAttribute('role', 'img');
    outroOverlay.setAttribute('aria-label', 'Logo original do Blû retornando ao centro da tela.');
    outroOverlay.innerHTML = '<img src="assets/icons/blu.svg" alt="" aria-hidden="true">';
    document.body.appendChild(outroOverlay);
    setTimeout(() => {
      outroOverlay?.remove();
      outroOverlay = null;
      if (afterShutdown) {
        playReturnAudio();
        startSnow();
        showOcarinaToast();
      }
      if (pending) startIntro();
    }, OUTRO_DURATION);
  }

  function syncTheme() {
    if (hasEnded() && (document.body.classList.contains(THEME) || pending ||
        activationTimer !== null || getSetting(SETTING, 'off') === 'on')) {
      shutdownViceCity();
      return;
    }
    syncBranding();
    syncIdleCursor();
    const enabled = eligible();
    if (!enabled) {
      setCursorReady(false);
      resetCursorSize();
      if (activationTimer !== null && !document.body.classList.contains('halloween-theme')) return;
      const wasActive = active;
      active = false;
      pending = false;
      scheduleShutdown();
      finishIntro(!shutdownOverlay);
      if (wasActive && !document.body.classList.contains(THEME) &&
          !document.body.classList.contains('halloween-theme')) startOutro();
      return;
    }
    scheduleShutdown();
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
    document.addEventListener('wheel', onCursorSizeWheel, { passive: false });
    document.addEventListener('click', noteIdleCursorClick, true);
    new MutationObserver(syncTheme).observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
    document.addEventListener('visibilitychange', () => {
      syncTheme();
      syncIdleCursor();
      if (document.visibilityState !== 'visible') pauseIntro();
      else if (overlay) resumeIntro();
      else if (pending) startIntro();
    });
    window.addEventListener('storage', event => {
      if (event.key === 'blu:settings' || event.key === null) applyViceCityPreference();
    });
    window.addEventListener('pageshow', applyViceCityPreference);
    syncTheme();
    updateClueSearch();
    if (END_MODE === 'true') setTimeout(showShutdownPreview, 700);
    else if (END_MODE === 'demo') armShutdownAnimation(() => shutdownViceCity({ preview: true }));
  }

  window.initViceCityIntro = initViceCityIntro;
  window.applyViceCityPreference = applyViceCityPreference;
})();
