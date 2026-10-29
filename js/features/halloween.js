// Optional seasonal presentation; never rewrites content or button colors.
let halloweenVisualWasEnabled = null;
let halloweenPaletteNoticePending = false;
let halloweenUpdateCheckComplete = false;
const HALLOWEEN_PALETTE_NOTICE_REVISION = 'palettes-v33';
const HALLOWEEN_FAREWELL_SETTING = 'halloweenFarewell2026Seen';
// The built-in JSON demo cycles its webs visually without changing copy statistics.
const halloweenDemoWebCooldowns = new Map();
let halloweenSpiderWebs = new WeakSet();
const halloweenSectionSpiders = new Map();
const HALLOWEEN_SPIDER_WAIT_MS = 60_000;
const HALLOWEEN_SPIDER_WEB_MS = 15_000;
const HALLOWEEN_IDLE_GHOST_MS = 120_000;
let halloweenIdleGhostTimer = null;
let halloweenIdleGhost = null;
let halloweenIdleGhostClicks = 0;
let halloweenIdleGhostPointer = null;
let halloweenIdleGhostFrame = 0;

function canShowHalloweenIdleGhost() {
  return document.body.classList.contains('halloween-theme') && document.visibilityState === 'visible' &&
    window.matchMedia?.('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function removeHalloweenIdleGhost() {
  if (halloweenIdleGhostFrame) cancelAnimationFrame(halloweenIdleGhostFrame);
  halloweenIdleGhostFrame = 0;
  halloweenIdleGhost?.remove();
  halloweenIdleGhost = null;
  halloweenIdleGhostClicks = 0;
}

function clearHalloweenIdleGhost() {
  clearTimeout(halloweenIdleGhostTimer);
  halloweenIdleGhostTimer = null;
  removeHalloweenIdleGhost();
}

function positionHalloweenIdleGhost() {
  if (!halloweenIdleGhost || !halloweenIdleGhostPointer || halloweenIdleGhostFrame) return;
  halloweenIdleGhostFrame = requestAnimationFrame(() => {
    halloweenIdleGhostFrame = 0;
    if (!halloweenIdleGhost || !halloweenIdleGhostPointer) return;
    halloweenIdleGhost.style.left = `${Math.max(4, Math.min(innerWidth - 36, halloweenIdleGhostPointer.x + 18))}px`;
    halloweenIdleGhost.style.top = `${Math.max(4, Math.min(innerHeight - 36, halloweenIdleGhostPointer.y + 18))}px`;
    halloweenIdleGhost.classList.add('visible');
  });
}

function showHalloweenIdleGhost() {
  halloweenIdleGhostTimer = null;
  if (!canShowHalloweenIdleGhost()) return;
  halloweenIdleGhost = document.createElement('span');
  halloweenIdleGhost.className = 'halloween-idle-ghost';
  halloweenIdleGhost.setAttribute('aria-hidden', 'true');
  document.body.appendChild(halloweenIdleGhost);
  halloweenIdleGhostClicks = 2 + Math.floor(Math.random() * 4);
  positionHalloweenIdleGhost();
}

function scheduleHalloweenIdleGhost() {
  if (!canShowHalloweenIdleGhost()) {
    clearHalloweenIdleGhost();
    return;
  }
  if (!halloweenIdleGhost && !halloweenIdleGhostTimer)
    halloweenIdleGhostTimer = setTimeout(showHalloweenIdleGhost, HALLOWEEN_IDLE_GHOST_MS);
}

document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  halloweenIdleGhostPointer = { x: event.clientX, y: event.clientY };
  positionHalloweenIdleGhost();
}, { passive: true });

document.addEventListener('click', event => {
  if (!event.target?.closest?.('button')) return;
  if (!canShowHalloweenIdleGhost()) {
    clearHalloweenIdleGhost();
    return;
  }
  if (halloweenIdleGhost) {
    halloweenIdleGhostClicks--;
    if (halloweenIdleGhostClicks > 0) return;
    removeHalloweenIdleGhost();
  } else {
    clearTimeout(halloweenIdleGhostTimer);
    halloweenIdleGhostTimer = null;
  }
  scheduleHalloweenIdleGhost();
}, true);

function isHalloweenDemoJson() {
  if (typeof getDemoState !== 'function') return false;
  const current = collectState();
  const demo = getDemoState();
  return current.archived.buttons.length === 0 && current.archived.sections.length === 0 &&
    current.sections.length === demo.sections.length &&
    demo.sections.every((section, index) => {
      const actual = current.sections[index];
      return actual.id === section.id && actual.name === section.name &&
        actual.buttons.length === section.buttons.length &&
        section.buttons.every((button, buttonIndex) => {
          const shown = actual.buttons[buttonIndex];
          return ['id', 'name', 'text', 'tag', 'vis'].every(key => shown[key] === button[key]);
        });
    });
}

function clearHalloweenDemoWebCooldowns() {
  halloweenDemoWebCooldowns.forEach(clearTimeout);
  halloweenDemoWebCooldowns.clear();
}

function noteHalloweenDemoButtonCopy(id) {
  if (!document.body.classList.contains('halloween-theme') || !isHalloweenDemoJson() ||
      ![...document.querySelectorAll('#sections .btn-wrap')].some(button => button.dataset.id === id)) return;

  clearTimeout(halloweenDemoWebCooldowns.get(id));
  const timer = setTimeout(() => {
    if (halloweenDemoWebCooldowns.get(id) !== timer) return;
    halloweenDemoWebCooldowns.delete(id);
    refreshHalloweenButtonWebs();
  }, 2000 + Math.random() * 3000);
  halloweenDemoWebCooldowns.set(id, timer);

  if (halloweenDemoWebCooldowns.size === document.querySelectorAll('#sections .btn-wrap').length) {
    clearHalloweenDemoWebCooldowns();
  }
}

function refreshHalloweenButtonWebs() {
  const halloweenEnabled = document.body.classList.contains('halloween-theme');
  const demoJson = halloweenEnabled && isHalloweenDemoJson();
  if (!demoJson) clearHalloweenDemoWebCooldowns();
  document.querySelectorAll('#sections .btn-wrap').forEach(button => {
    const id = button.dataset.id;
    button.classList.toggle('halloween-webbed',
      halloweenEnabled && !!id && (halloweenSpiderWebs.has(button) || (demoJson
        ? !halloweenDemoWebCooldowns.has(id)
        : !(userData.stats[id]?.copies > 0))));
  });
}

function releaseHalloweenSpiderTarget(state, completed = false) {
  const target = state.target;
  if (target && state.reservedDemoWeb) {
    halloweenDemoWebCooldowns.delete(target.dataset.id);
    if (!completed && target.isConnected) noteHalloweenDemoButtonCopy(target.dataset.id);
  }
  state.target = null;
  state.reservedDemoWeb = false;
  state.dwellMs = 0;
}

function clearHalloweenSpider(state, completed = false) {
  state.spider?.remove();
  state.spider = null;
  releaseHalloweenSpiderTarget(state, completed);
}

function positionHalloweenSpider(state, section) {
  const body = section.querySelector('.section-body');
  const button = state.target?.querySelector('.copy-btn');
  if (!body || !button || !state.spider) return;
  const bodyRect = body.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  state.spider.style.transform = `translate(${Math.round(buttonRect.left - bodyRect.left + Math.min(12, buttonRect.width / 2))}px, ${Math.round(buttonRect.top - bodyRect.top - 4)}px)`;
}

function syncHalloweenSectionSpiders() {
  const now = Date.now();
  const enabled = document.body.classList.contains('halloween-theme') &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!enabled) {
    if (!halloweenSectionSpiders.size) return;
    halloweenSectionSpiders.forEach(state => clearHalloweenSpider(state));
    halloweenSectionSpiders.clear();
    halloweenSpiderWebs = new WeakSet();
    refreshHalloweenButtonWebs();
    return;
  }

  const sections = [...document.querySelectorAll('#sections > .section-wrap')];
  for (const [section, state] of halloweenSectionSpiders) {
    if (sections.includes(section)) continue;
    clearHalloweenSpider(state);
    halloweenSectionSpiders.delete(section);
  }

  sections.forEach(section => {
    let state = halloweenSectionSpiders.get(section);
    if (!state) {
      state = { openMs: 0, dwellMs: 0, lastTick: now, target: null, spider: null, reservedDemoWeb: false };
      halloweenSectionSpiders.set(section, state);
    }
    const elapsed = Math.max(0, now - state.lastTick);
    state.lastTick = now;
    if (document.visibilityState !== 'visible') {
      state.spider?.remove();
      state.spider = null;
      return;
    }
    if (section.classList.contains('collapsed') || section.classList.contains('search-hidden') ||
        !section.getClientRects().length) {
      clearHalloweenSpider(state);
      state.openMs = 0;
      return;
    }

    state.openMs += elapsed;
    if (state.openMs < HALLOWEEN_SPIDER_WAIT_MS) return;
    if (state.target && (!state.target.isConnected || state.target.classList.contains('search-hidden') ||
        state.target.classList.contains('halloween-webbed'))) clearHalloweenSpider(state);

    if (!state.target) {
      const available = [...section.querySelectorAll('.btn-wrap:not(.search-hidden):not(.halloween-webbed)')]
        .filter(button => button.querySelector('.copy-btn'));
      if (!available.length) {
        state.spider?.remove();
        state.spider = null;
        return;
      }
      state.target = available[Math.floor(Math.random() * available.length)];
      const cooldown = halloweenDemoWebCooldowns.get(state.target.dataset.id);
      if (cooldown !== undefined) {
        clearTimeout(cooldown);
        halloweenDemoWebCooldowns.set(state.target.dataset.id, null);
        state.reservedDemoWeb = true;
      }
      state.dwellMs = 0;
    } else {
      state.dwellMs += elapsed;
    }

    if (!state.spider) {
      state.spider = document.createElement('span');
      state.spider.className = 'halloween-roaming-spider';
      state.spider.setAttribute('aria-hidden', 'true');
      section.querySelector('.section-body')?.appendChild(state.spider);
    }
    positionHalloweenSpider(state, section);
    if (state.dwellMs >= HALLOWEEN_SPIDER_WEB_MS) {
      halloweenSpiderWebs.add(state.target);
      state.target.classList.add('halloween-webbed');
      releaseHalloweenSpiderTarget(state, true);
      // O mesmo elemento atravessa até o próximo botão no próximo ciclo.
    }
  });
}

function noteHalloweenSpiderButtonCopy(id) {
  document.querySelectorAll('#sections .btn-wrap').forEach(button => {
    if (button.dataset.id === id) halloweenSpiderWebs.delete(button);
  });
  halloweenSectionSpiders.forEach(state => {
    if (state.target?.dataset.id === id) clearHalloweenSpider(state);
  });
}

setInterval(syncHalloweenSectionSpiders, 1000);
document.addEventListener('visibilitychange', () => {
  halloweenSectionSpiders.forEach(state => { state.lastTick = Date.now(); });
  syncHalloweenSectionSpiders();
});
window.addEventListener('resize', syncHalloweenSectionSpiders);

function activateHalloweenLivingEye() {
  if (!document.body.classList.contains('halloween-theme') ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelector('#buttonViewTitle svg')?.classList.add('halloween-living-eye');
}

function resetHalloweenEyePupil() {
  const pupil = document.querySelector('#buttonViewTitle .halloween-living-eye circle');
  if (pupil) {
    pupil.setAttribute('cx', '12');
    pupil.setAttribute('cy', '12');
  }
}

const halloweenEyeModal = document.querySelector('#buttonViewModal .modal');
if (halloweenEyeModal) {
  halloweenEyeModal.addEventListener('pointermove', event => {
    if (!document.body.classList.contains('halloween-theme') ||
        !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const pupil = halloweenEyeModal.querySelector('.halloween-living-eye circle');
    if (!pupil) return;
    const eye = pupil.ownerSVGElement.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - eye.left - eye.width / 2) / 80));
    const y = Math.max(-1, Math.min(1, (event.clientY - eye.top - eye.height / 2) / 80));
    pupil.setAttribute('cx', String(12 + x * 1.5));
    pupil.setAttribute('cy', String(12 + y * 1.5));
  });
  halloweenEyeModal.addEventListener('pointerleave', resetHalloweenEyePupil);
  document.addEventListener('blu:modal-closed', resetHalloweenEyePupil);
}

const halloweenWebObserver = new MutationObserver(refreshHalloweenButtonWebs);
const halloweenSections = document.getElementById('sections');
if (halloweenSections) halloweenWebObserver.observe(halloweenSections, { childList: true, subtree: true });

function showHalloweenCopyEffect(button, hadWeb = false) {
  if (!document.body.classList.contains('halloween-theme') ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !button?.isConnected) return;

  const bounds = button.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const effects = ['bubbles', 'ghosts', 'bats', 'hats', 'brooms', 'spiders'];
  const effect = hadWeb && Math.random() < .6
    ? 'spiders' : effects[Math.floor(Math.random() * effects.length)];
  const burst = document.createElement('div');
  burst.className = `halloween-copy-effect halloween-copy-effect--${effect}`;
  burst.classList.toggle('halloween-copy-effect--inverted', Math.random() < .25);
  burst.setAttribute('aria-hidden', 'true');
  burst.style.left = `${bounds.left + bounds.width / 2}px`;
  burst.style.top = `${bounds.top + bounds.height / 2}px`;
  const buttonStyle = getComputedStyle(button);
  const gradientColor = buttonStyle.backgroundImage.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i)?.[0];
  const solidColor = buttonStyle.backgroundColor;
  const copyColor = gradientColor || (solidColor !== 'rgba(0, 0, 0, 0)' && solidColor !== 'transparent' ? solidColor : '') || '#f8c98d';
  burst.style.setProperty('--halloween-copy-color', copyColor);

  const count = effect === 'spiders' && hadWeb ? 4 + Math.floor(Math.random() * 5)
    : ['brooms', 'spiders'].includes(effect) ? 3 : 5;
  const spiderSpacing = hadWeb ? Math.min(24, Math.max(12, bounds.width / count)) : 38;
  const delayStep = effect === 'brooms' ? 65 : effect === 'spiders' ? (hadWeb ? 30 : 45) : 35;
  for (let index = 0; index < count; index++) {
    const particle = document.createElement('span');
    particle.className = 'halloween-copy-particle';
    const spread = (index - (count - 1) / 2) * (effect === 'spiders' ? spiderSpacing : effect === 'bats' ? 19 : 15);
    particle.style.setProperty('--copy-x', `${effect === 'brooms' ? 42 + Math.random() * 20 : spread + (Math.random() - .5) * 12}px`);
    particle.style.setProperty('--copy-y', `${effect === 'brooms' ? spread - 12 : -30 - Math.random() * 25}px`);
    particle.style.setProperty('--copy-delay', `${index * delayStep}ms`);
    burst.appendChild(particle);
  }

  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1260 + (count - 1) * delayStep + 100);
}

function dismissHalloweenPaletteBanner(acknowledged = true) {
  const banner = document.getElementById('halloweenPaletteBanner');
  if (banner) banner.hidden = true;
  if (acknowledged) {
    halloweenPaletteNoticePending = false;
    setSetting('halloweenPaletteNoticeRevision', HALLOWEEN_PALETTE_NOTICE_REVISION);
  }
  queueMicrotask(showHalloweenFarewellWhenReady);
}

function showHalloweenPaletteBannerWhenReady() {
  if (!halloweenPaletteNoticePending || !halloweenUpdateCheckComplete) return;
  if (!document.body.classList.contains('halloween-theme')) {
    halloweenPaletteNoticePending = false;
    return;
  }
  if (document.querySelector('.modal-bg.open') || document.getElementById('updateBanner')?.hidden === false) return;
  const banner = document.getElementById('halloweenPaletteBanner');
  if (!banner) return;
  banner.hidden = false;
  halloweenPaletteNoticePending = false;
}

function showHalloweenFarewellWhenReady() {
  if (!halloweenUpdateCheckComplete || !isHalloweenFarewellTime() ||
      !document.body.classList.contains('halloween-theme') ||
      getMetaValue('updates', HALLOWEEN_FAREWELL_SETTING, false) || halloweenPaletteNoticePending ||
      document.getElementById('halloweenPaletteBanner')?.hidden === false ||
      document.querySelector('.modal-bg.open') || document.getElementById('updateBanner')?.hidden === false) return;

  const toast = notify('Até o próximo Halloween! O visual se despede hoje às 20h.', 'ok', { duration: 6500 });
  toast.classList.add('halloween-farewell');
  toast.querySelector('.halloween-toast-creature')?.style.setProperty(
    '--halloween-toast-icon', 'url("/libs/events/halloween/toast_ghost.svg")');
  setMetaValue('updates', HALLOWEEN_FAREWELL_SETTING, true);
}

function openHalloweenPaletteFromBanner(event) {
  event?.stopPropagation();
  dismissHalloweenPaletteBanner();
  const menu = document.getElementById('menuOverlay');
  const content = document.getElementById('submenu-conteudo');
  if (menu) menu.classList.add('open');
  if (content && !content.classList.contains('open')) toggleSubmenu('conteudo');
  const select = document.getElementById('halloweenPaletteSelect');
  select?.scrollIntoView({ block: 'nearest' });
  select?.focus();
}

function applyHalloweenPreference() {
  const available = isBluFeatureAvailable('halloween');
  const enabled = available && getSetting('halloweenVisual', 'off') === 'on';
  const firstApply = halloweenVisualWasEnabled === null;
  const justEnabled = halloweenVisualWasEnabled === false && enabled;
  halloweenVisualWasEnabled = enabled;
  document.body.classList.toggle('halloween-theme', enabled);
  scheduleHalloweenIdleGhost();
  refreshHalloweenButtonWebs();
  const savedPalette = getSetting('halloweenPalette', 'pumpkin');
  const palette = ['pumpkin', 'zombie', 'vampire', 'witch', 'ghost'].includes(savedPalette) ? savedPalette : 'pumpkin';
  if (enabled) document.body.dataset.halloweenPalette = palette;
  else delete document.body.dataset.halloweenPalette;
  const paletteRow = document.getElementById('halloweenPaletteRow');
  const paletteSelect = document.getElementById('halloweenPaletteSelect');
  if (paletteRow) paletteRow.hidden = !enabled;
  if (paletteSelect) paletteSelect.value = palette;
  const favicon = document.getElementById('bluFavicon');
  const faviconPath = enabled ? 'assets/themes/blu-halloween.svg' : 'assets/icons/blu.svg';
  if (favicon && favicon.getAttribute('href') !== faviconPath) favicon.setAttribute('href', faviconPath);
  const aboutLogo = document.getElementById('aboutBluLogo');
  const aboutLogoPath = enabled ? 'assets/themes/blu-halloween.svg' : 'assets/icons/icon-192.png';
  if (aboutLogo && aboutLogo.getAttribute('src') !== aboutLogoPath) aboutLogo.setAttribute('src', aboutLogoPath);
  const button = document.getElementById('halloweenVisualBtn');
  if (button) {
    button.hidden = !available;
    button.classList.toggle('active', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.querySelector('.menu-btn-label').textContent = `Visual de Halloween: ${enabled ? 'ON' : 'OFF'}`;
  }
  if (!enabled) {
    resetHalloweenEyePupil();
    halloweenPaletteNoticePending = false;
    dismissHalloweenPaletteBanner(false);
  }
  if ((justEnabled || (firstApply && enabled)) && getSetting('halloweenPaletteNoticeRevision', '') !== HALLOWEEN_PALETTE_NOTICE_REVISION) {
    halloweenPaletteNoticePending = true;
    queueMicrotask(showHalloweenPaletteBannerWhenReady);
  }
  queueMicrotask(showHalloweenFarewellWhenReady);
  // Keep an already-open What's New dialog in sync when the season ends.
  if (typeof updateWhatsNewVisualToggle === 'function') updateWhatsNewVisualToggle();
}

function toggleHalloweenPreference() {
  if (!isBluFeatureAvailable('halloween')) return;
  setSetting('halloweenVisual', getSetting('halloweenVisual', 'off') === 'on' ? 'off' : 'on');
  applyHalloweenPreference();
}

function setHalloweenPalette(value) {
  if (!isBluFeatureAvailable('halloween') || getSetting('halloweenVisual', 'off') !== 'on') return;
  if (!['pumpkin', 'zombie', 'vampire', 'witch', 'ghost'].includes(value)) return;
  dismissHalloweenPaletteBanner();
  setSetting('halloweenPalette', value);
  applyHalloweenPreference();
}

applyHalloweenPreference();
document.addEventListener('visibilitychange', applyHalloweenPreference);
document.addEventListener('blu:update-check-complete', () => {
  halloweenUpdateCheckComplete = true;
  showHalloweenPaletteBannerWhenReady();
  showHalloweenFarewellWhenReady();
});
document.addEventListener('blu:modal-closed', () => {
  showHalloweenPaletteBannerWhenReady();
  showHalloweenFarewellWhenReady();
});
document.addEventListener('blu:update-banner-closed', () => {
  showHalloweenPaletteBannerWhenReady();
  showHalloweenFarewellWhenReady();
});
window.addEventListener('focus', applyHalloweenPreference);
window.addEventListener('storage', event => {
  if (event.key === 'blu:settings' || event.key === null) applyHalloweenPreference();
});
// Recheck at each seasonal boundary, including 20h on November 2.
(function scheduleHalloweenCalendarCheck() {
  const now = new Date();
  const next = [HALLOWEEN_START, HALLOWEEN_FAREWELL_START, HALLOWEEN_END]
    .find(boundary => boundary > now.getTime());
  if (next === undefined) return;
  setTimeout(() => { applyHalloweenPreference(); scheduleHalloweenCalendarCheck(); },
    Math.min(next - now.getTime() + 100, 24 * 60 * 60 * 1000));
})();
