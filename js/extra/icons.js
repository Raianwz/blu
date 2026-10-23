// Icon catalogs and their official CDN fallbacks are an optional Offline extra.
(function () {
  const bootstrapIconCdn = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.2/icons/';
  const materialIconCdn = 'https://cdn.jsdelivr.net/npm/@material-symbols/svg-400@0.46.0/outlined/';
  const bootstrapFallbackNames = `chat-text chat-fill chat-dots-fill envelope envelope-fill inbox file-earmark-text-fill sticky-fill exclamation-triangle-fill info-circle-fill question-circle-fill flag robot clock-fill emoji-smile emoji-smile-fill emoji-neutral-fill emoji-frown-fill hand-thumbs-up hand-thumbs-down heart heart-fill heart-half star star-fill star-half bookmark-star bookmark-star-fill dice-1 dice-2 dice-3 dice-4 dice-5 dice-6 facebook instagram twitter tiktok youtube google linkedin messenger folder folder2-open tag tag-fill tags tags-fill pin pin-fill pin-angle pin-angle-fill lightbulb lightbulb-fill lightbulb-off lightbulb-off-fill lightning lightning-fill lightning-charge lightning-charge-fill rocket rocket-fill rocket-takeoff rocket-takeoff-fill ban dash-lg dash-circle dash-circle-fill dash-circle-dotted x x-lg x-circle x-circle-fill`.split(' ');
  const materialFallbackNames = `book2 book_4 book_ribbon mobile mobile_2 mobile_3 kid_star_out kid_star_fill owl block cancel do_not_disturb_off work business_center apartment handshake storefront account_balance credit_card account_balance_wallet trending_up candlestick_chart calculate table_chart description receipt_long balance gavel support_agent headset_mic waving_hand warning error_outline local_activity event`.split(' ');

  async function officialIconFallback(needsBootstrap, needsMaterial) {
    if (!needsBootstrap && !needsMaterial) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    async function sourceAvailable(url) {
      try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        return response.ok && (response.headers.get('content-type') || '').includes('image/svg+xml');
      } catch { return false; }
    }
    try {
      const [bootstrapAvailable, materialAvailable] = await Promise.all([
        needsBootstrap && sourceAvailable(bootstrapIconCdn + 'chat-text.svg'),
        needsMaterial && sourceAvailable(materialIconCdn + 'book_2.svg')
      ]);
      const bootstrap = bootstrapAvailable ? bootstrapFallbackNames.map(name => ({
        id: `bootstrap:${name}`,
        label: name.replaceAll('-', ' '),
        src: `${bootstrapIconCdn}${name}.svg`,
        external: true
      })) : [];
      const material = materialAvailable ? materialFallbackNames.map(name => {
        const fileName = name === 'book2' ? 'book_2' : name.startsWith('kid_star_') ? 'kid_star' : name;
        return {
          id: `material:${name}`,
          label: name.replaceAll('_', ' '),
          src: `${materialIconCdn}${fileName}${name === 'kid_star_fill' ? '-fill' : ''}.svg`,
          external: true
        };
      }) : [];
      return [...bootstrap, ...material];
    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadIcons() {
    await Promise.allSettled([
      window.BluExtras.loadScript('libs/blu/blu-icons.js'),
      window.BluExtras.loadScript('libs/bootstrap-icons/button-icons.js'),
      window.BluExtras.loadScript('libs/material-icons/button-icons.js')
    ]);
    const hasBootstrap = typeof BLU_BOOTSTRAP_ICONS !== 'undefined';
    const hasMaterial = typeof BLU_MATERIAL_ICONS !== 'undefined' && typeof BLU_APP_ICONS !== 'undefined';
    const fallback = await officialIconFallback(!hasBootstrap, !hasMaterial);
    return [
      ...(typeof BLU_BRAND_ICONS !== 'undefined' ? BLU_BRAND_ICONS : []),
      ...(hasBootstrap ? BLU_BOOTSTRAP_ICONS : []),
      ...(hasMaterial ? [...BLU_MATERIAL_ICONS, ...BLU_APP_ICONS] : []),
      ...fallback
    ];
  }

  window.BluExtras.register('icons', { load: loadIcons });
})();
