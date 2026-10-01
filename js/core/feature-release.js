// Release flags are manual. Preview is restricted to loopback development hosts.
const BLU_FEATURE_RELEASE = Object.freeze({ sectionIcons: true, halloween: true });

function isBluLocalPreview(hostname = window.location.hostname) {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname.toLowerCase());
}

function isBluFeatureAvailable(feature, now = new Date()) {
  if (!Object.prototype.hasOwnProperty.call(BLU_FEATURE_RELEASE, feature)) return false;
  if (isBluLocalPreview()) return true;
  if (!BLU_FEATURE_RELEASE[feature]) return false;
  // October 1–31 (local time); the visual returns to normal on November 1.
  return feature !== 'halloween' || now.getMonth() === 9;
}
