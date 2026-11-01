// Classic scripts share a global scope; the required list keeps its execution order.
(() => {
  const base = new URL('../', document.currentScript.src);
  const required = [
    'js/core/feature-release.js',
    'libs/icons/bootstrap-icons/button-icons.js',
    'libs/icons/material-icons/button-icons.js',
    'libs/icons/blu/blu-icons.js',
    'js/ui/button-icon-picker.js',
    'js/core/utils.js',
    'js/ui/dialogs.js',
    'js/core/storage.js',
    'js/data/user-data.js',
    'js/features/content-dashboard.js',
    'js/features/archive.js',
    'libs/icons/lucide/lucide-icons.js',
    'js/ui/render.js',
    'js/features/search.js',
    'js/core/crypto.js',
    'js/data/crud.js',
    'js/data/share-options.js',
    'js/features/dnd.js',
    'js/ui/context-menu.js',
    'js/ui/section-icon-picker.js'
  ];
  const optional = [
    { id: 'debug', path: 'js/core/debug.js', ready: 'toggleDebugMode', controls: ['debugModeBtn'] },
    { id: 'experiments', path: 'libs/experiments/runtime.js', ready: 'initBluExperiments',
      controls: ['advancedOrganizingBtn'], init: () => window.initBluExperiments() },
    { id: 'json-tools', path: 'js/data/json-tools.js', ready: 'openJsonModal',
      controls: ['jsonDiagnosticsBtn'] },
    { id: 'custom-export', path: 'js/data/custom-export.js', ready: 'openCustomExportModal',
      controls: ['customExportBtn'] },
    { id: 'quick-actions', path: 'js/ui/quick-actions.js', ready: 'initQuickActions',
      init: () => window.initQuickActions() },
    { id: 'halloween', path: 'libs/events/halloween/halloween.js', ready: 'applyHalloweenPreference' },
    { id: 'vice-city', path: 'libs/events/vice-city/vice-city.js', ready: 'initViceCityIntro',
      init: () => window.initViceCityIntro() },
    { id: 'whats-new', path: 'js/features/whats-new.js', ready: 'initWhatsNew',
      init: () => window.initWhatsNew() }
  ];

  function loadScript(path, ordered = true) {
    return new Promise(resolve => {
      const src = new URL(path, base).href;
      const script = document.createElement('script');
      let runtimeFailed = false;
      const onRuntimeError = event => {
        if (event.filename === src) runtimeFailed = true;
      };
      window.addEventListener('error', onRuntimeError);
      const finish = loaded => {
        window.removeEventListener('error', onRuntimeError);
        resolve(loaded && !runtimeFailed);
      };
      script.dataset.bluLoadedByLoader = '';
      script.async = !ordered;
      script.src = src;
      script.onload = () => finish(true);
      script.onerror = () => finish(false);
      document.body.appendChild(script);
    });
  }

  function showRequiredFailure() {
    const message = document.createElement('p');
    message.textContent = 'Não foi possível carregar o Blû. Verifique a conexão e atualize a página.';
    message.setAttribute('role', 'alert');
    document.body.prepend(message);
  }

  async function loadOptional(feature) {
    let loaded = await loadScript(feature.path, false);
    if (loaded && typeof window[feature.ready] === 'function') {
      try {
        await feature.init?.();
      } catch (error) {
        loaded = false;
        console.error(`Falha ao iniciar ${feature.path}:`, error);
      }
    } else loaded = false;
    if (loaded) {
      feature.controls?.forEach(id => { document.getElementById(id)?.removeAttribute('hidden'); });
    } else {
      console.warn(`Recurso opcional indisponível: ${feature.path}`);
    }
    document.dispatchEvent(new CustomEvent('blu:optional-status', {
      detail: { id: feature.id, loaded }
    }));
  }

  Promise.all(required.map(loadScript)).then(async results => {
    if (results.some(result => !result)) {
      showRequiredFailure();
      return;
    }
    const appLoaded = await loadScript('js/app.js');
    if (!appLoaded || window.BluCoreReady !== true) {
      showRequiredFailure();
      return;
    }
    await Promise.all(optional.map(loadOptional));
  });
})();
