// Recursos liberados no Blû principal. Regras sazonais ficam com cada evento.
const BLU_FEATURE_RELEASE = Object.freeze({ sectionIcons: true });

function isBluFeatureAvailable(feature) {
  return BLU_FEATURE_RELEASE[feature] === true;
}
