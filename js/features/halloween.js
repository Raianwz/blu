// Optional seasonal presentation; never rewrites content or button colors.
let halloweenVisualWasEnabled = null;
let halloweenPaletteNoticePending = false;
let halloweenUpdateCheckComplete = false;
const HALLOWEEN_PALETTE_NOTICE_REVISION = 'palettes-v33';
// The built-in JSON demo cycles its webs visually without changing copy statistics.
const halloweenDemoWebCooldowns = new Map();

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
      halloweenEnabled && !!id && (demoJson
        ? !halloweenDemoWebCooldowns.has(id)
        : !(userData.stats[id]?.copies > 0)));
  });
}

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
  const faviconPath = enabled ? 'assets/themes/blu-halloween.svg' : 'assets/blu.svg';
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
  // Keep an already-open What's New dialog in sync when the season ends at midnight.
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
});
document.addEventListener('blu:modal-closed', showHalloweenPaletteBannerWhenReady);
document.addEventListener('blu:update-banner-closed', showHalloweenPaletteBannerWhenReady);
window.addEventListener('focus', applyHalloweenPreference);
window.addEventListener('storage', event => {
  if (event.key === 'blu:settings' || event.key === null) applyHalloweenPreference();
});
// Recheck the calendar at local midnight, including tabs left open overnight.
(function scheduleHalloweenCalendarCheck() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  setTimeout(() => { applyHalloweenPreference(); scheduleHalloweenCalendarCheck(); }, midnight - now + 100);
})();
