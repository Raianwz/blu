// Scripts clássicos compartilham o escopo global; preserve esta ordem.
(() => {
  const groups = {
    core: [
      'js/core/feature-release.js',
      'js/core/debug.js'
    ],
    libs: [
      'libs/bootstrap-icons/button-icons.js',
      'libs/material-icons/button-icons.js',
      'libs/blu/blu-icons.js'
    ],
    dataAndUi: [
      'js/ui/button-icon-picker.js',
      'js/core/utils.js',
      'js/ui/dialogs.js',
      'js/core/storage.js',
      'js/data/user-data.js',
      'js/features/content-dashboard.js',
      'js/features/archive.js',
      'libs/lucide/lucide-icons.js',
      'js/ui/render.js',
      'js/features/search.js',
      'js/core/crypto.js',
      'js/data/crud.js',
      'js/data/share-options.js',
      'js/experiments/runtime.js',
      'js/features/dnd.js',
      'js/data/json-tools.js',
      'js/data/custom-export.js',
      'js/ui/context-menu.js',
      'js/ui/quick-actions.js',
      'js/features/whats-new.js',
      'js/ui/section-icon-picker.js',
      'js/features/halloween.js'
    ]
  };
  const base = new URL('../', document.currentScript.src);
  const scripts = Object.values(groups).flat();
  let failed = false;

  const loads = scripts.map(path => new Promise(resolve => {
    const script = document.createElement('script');
    script.dataset.bluLoadedByLoader = '';
    script.async = false;
    script.src = new URL(path, base).href;
    script.onload = () => resolve();
    script.onerror = () => {
      failed = true;
      console.error(`Não foi possível carregar ${path}`);
      resolve();
    };
    document.body.appendChild(script);
  }));

  Promise.all(loads).then(() => {
    if (failed) {
      const message = document.createElement('p');
      message.textContent = 'Não foi possível carregar o Blû. Verifique a conexão e atualize a página.';
      message.setAttribute('role', 'alert');
      document.body.prepend(message);
      return;
    }
    const app = document.createElement('script');
    app.dataset.bluLoadedByLoader = '';
    app.src = new URL('js/app.js', base).href;
    app.onerror = () => console.error('Não foi possível carregar js/app.js');
    document.body.appendChild(app);
  });
})();
