// Optional seasonal presentation; never rewrites content or button colors.
let halloweenVisualWasEnabled = null;
const HALLOWEEN_PALETTE_NOTICE_REVISION = 'ghost';

function dismissHalloweenPaletteBanner() {
  const banner = document.getElementById('halloweenPaletteBanner');
  if (banner) banner.hidden = true;
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
  if (!enabled) dismissHalloweenPaletteBanner();
  if (justEnabled && getSetting('halloweenPaletteNoticeRevision', '') !== HALLOWEEN_PALETTE_NOTICE_REVISION) {
    const banner = document.getElementById('halloweenPaletteBanner');
    if (banner && document.getElementById('updateBanner')?.hidden !== false) {
      banner.hidden = false;
      setSetting('halloweenPaletteNoticeRevision', HALLOWEEN_PALETTE_NOTICE_REVISION);
    }
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
