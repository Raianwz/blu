// Release flags are manual. Local Halloween preview is closed after development.
const BLU_FEATURE_RELEASE = Object.freeze({ sectionIcons: true, halloween: true });
const BLU_LOCAL_HALLOWEEN_PREVIEW = false;
// Horários de São Paulo (UTC−03:00) para a temporada de 2026.
const HALLOWEEN_START = Date.parse('2026-10-01T00:00:00-03:00');
const HALLOWEEN_FAREWELL_START = Date.parse('2026-11-02T00:00:00-03:00');
const HALLOWEEN_END = Date.parse('2026-11-02T20:00:00-03:00');

function isBluLocalPreview(hostname = window.location.hostname) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname.toLowerCase());
}

function isBluFeatureAvailable(feature, now = new Date()) {
  if (!Object.prototype.hasOwnProperty.call(BLU_FEATURE_RELEASE, feature)) return false;
  if (isBluLocalPreview()) return feature === 'halloween' ? BLU_LOCAL_HALLOWEEN_PREVIEW : true;
  if (!BLU_FEATURE_RELEASE[feature]) return false;
  return feature !== 'halloween' || (now.getTime() >= HALLOWEEN_START && now.getTime() < HALLOWEEN_END);
}

function isHalloweenFarewellTime(now = new Date()) {
  return now.getTime() >= HALLOWEEN_FAREWELL_START && now.getTime() < HALLOWEEN_END;
}
