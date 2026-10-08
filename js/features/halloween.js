// Optional seasonal presentation; never rewrites content or button colors.
let halloweenVisualWasEnabled = null;
let halloweenPaletteNoticePending = false;
let halloweenUpdateCheckComplete = false;
const HALLOWEEN_PALETTE_NOTICE_REVISION = 'palettes-v33';

function showHalloweenCopyEffect(button) {
  if (!document.body.classList.contains('halloween-theme') ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !button?.isConnected) return;

  const bounds = button.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const effects = ['bubbles', 'ghosts', 'bats', 'hats', 'brooms'];
  const effect = effects[Math.floor(Math.random() * effects.length)];
  const burst = document.createElement('div');
  burst.className = `halloween-copy-effect halloween-copy-effect--${effect}`;
  burst.setAttribute('aria-hidden', 'true');
  burst.style.left = `${bounds.left + bounds.width / 2}px`;
  burst.style.top = `${bounds.top + bounds.height / 2}px`;

  const count = effect === 'brooms' ? 3 : 5;
  for (let index = 0; index < count; index++) {
    const particle = document.createElement('span');
    particle.className = 'halloween-copy-particle';
    const spread = (index - (count - 1) / 2) * (effect === 'bats' ? 19 : 15);
    particle.style.setProperty('--copy-x', `${effect === 'brooms' ? 42 + Math.random() * 20 : spread + (Math.random() - .5) * 12}px`);
    particle.style.setProperty('--copy-y', `${effect === 'brooms' ? spread - 12 : -30 - Math.random() * 25}px`);
    particle.style.setProperty('--copy-delay', `${index * (effect === 'brooms' ? 65 : 35)}ms`);
    burst.appendChild(particle);
  }

  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 950);
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
