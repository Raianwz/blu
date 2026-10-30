// Blû's own icons. Resolve assets relative to this script, including shared links.
const BLU_BRAND_ICONS = Object.freeze([
  {
    id: 'blu:b',
    label: 'Blû',
    src: new URL('b_blu_fill.svg', document.currentScript.src).href
  },
  {
    id: 'blu:legacy',
    label: 'Blû legado',
    src: new URL('b_blu_legacy.svg', document.currentScript.src).href
  }
]);

// Built-in demo fallback icons. They are intentionally absent from the picker.
const BLU_DEMO_SECTION_ICONS = Object.freeze([
  {
    id: 'blu:demo-die',
    label: 'Dado da demo',
    viewBox: '0 0 24 24',
    paths: '<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7.5" cy="7.5" r="1.3"/><circle cx="16.5" cy="7.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="7.5" cy="16.5" r="1.3"/><circle cx="16.5" cy="16.5" r="1.3"/>'
  },
  {
    id: 'blu:tavern',
    label: 'Caneca de taverna',
    viewBox: '0 0 24 24',
    paths: '<path d="M4 7h12v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Zm12 2h2a3 3 0 0 1 0 6h-2M5 7c0-2 2-2 3-1 1-2 3-2 4 0 2-1 4 0 4 1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'blu:wizard-hat',
    label: 'Chapéu de mago',
    viewBox: '0 0 24 24',
    paths: '<path d="m12 3 6 14H6L12 3ZM3 18c5 2 13 2 18 0M12 10v3m-1.5-1.5h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'blu:secret-key',
    label: 'Chave secreta',
    viewBox: '0 0 24 24',
    paths: '<circle cx="7" cy="11" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 11h10v4h-3v-4m-3 0v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  }
]);
