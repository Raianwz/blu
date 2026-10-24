// Keep /sprinklr/ on its original origin while loading the published Offline branch.
(function () {
  if (window.__bluHostedLoaderScript === document.currentScript) return;
  window.__bluHostedLoaderScript = document.currentScript;

  const base = 'https://cdn.jsdelivr.net/gh/Raianwz/blu@blu/offline/';
  // Avoid a long-lived browser cache for branch URLs; the CDN may still update later.
  const refresh = `?v=${Math.floor(Date.now() / 3600000)}`;
  const loaderScript = document.currentScript;
  const fallbackStyle = document.getElementById('offlineFallbackStyle');
  const extraPaths = Object.freeze({
    icons: ['js/extra/icons.js', 'assets/extra/icons.css'],
    'button-colors': ['js/extra/button-colors.js', 'assets/extra/button-colors.css'],
    'button-visual': ['js/extra/button-visual.js', 'assets/extra/button-visual.css'],
    'section-icons': ['js/extra/section-icons.js', 'assets/extra/section-icons.css'],
    'search-history': ['js/extra/search-history.js', 'assets/extra/search-history.css'],
    'custom-export': ['js/extra/custom-export.js', 'assets/extra/custom-export.css']
  });
  const assets = new Map();
  const modules = new Map();

  function loadAsset(file, type) {
    const key = `${type}:${file}`;
    if (assets.has(key)) return assets.get(key);
    const promise = new Promise((resolve, reject) => {
      const element = document.createElement(type === 'script' ? 'script' : 'link');
      const timeout = setTimeout(() => {
        element.remove();
        reject(new Error(`Recurso indisponível: ${file}`));
      }, 10000);
      if (type === 'script') element.src = base + file + refresh;
      else { element.rel = 'stylesheet'; element.href = base + file + refresh; }
      element.crossOrigin = 'anonymous';
      element.onload = () => {
        clearTimeout(timeout);
        if (type === 'script') element.remove();
        resolve(element);
      };
      element.onerror = () => {
        clearTimeout(timeout);
        element.remove();
        reject(new Error(`Recurso indisponível: ${file}`));
      };
      document.head.appendChild(element);
    });
    assets.set(key, promise);
    promise.catch(() => assets.delete(key));
    return promise;
  }

  window.BluExtras = Object.freeze({
    register(name, module) { if (extraPaths[name]) modules.set(name, module); },
    loadScript: file => loadAsset(file, 'script'),
    loadStyle: file => loadAsset(file, 'style'),
    async loadExtra(name, context) {
      const files = extraPaths[name];
      if (!files) throw new Error(`Extra desconhecido: ${name}`);
      await Promise.all([loadAsset(files[0], 'script'), loadAsset(files[1], 'style')]);
      const module = modules.get(name);
      if (!module) throw new Error(`Extra não registrado: ${name}`);
      return module.load(context);
    }
  });

  let fallback = document.getElementById('offlineBootstrap');
  if (!fallback) {
    fallback = document.createElement('main');
    fallback.id = 'offlineBootstrap';
    fallback.setAttribute('role', 'status');
    fallback.innerHTML = '<h1>Blû Offline</h1><p id="offlineBootstrapMessage"></p><button id="offlineBootstrapRetry" type="button" hidden>Tentar novamente</button><div><a href="https://github.com/Raianwz/blu/tree/blu/offline">Arquivos para uso local</a></div>';
    document.body.replaceChildren(fallback);
  }
  document.body.classList.add('offline-loading');
  const message = fallback.querySelector('#offlineBootstrapMessage');
  const retry = fallback.querySelector('#offlineBootstrapRetry');
  let loading = false;

  async function loadApp() {
    if (loading) return;
    loading = true;
    retry.hidden = true;
    fallback.setAttribute('role', 'status');
    message.textContent = 'Carregando o Blû Offline…';
    document.body.classList.add('offline-loading');
    document.body.replaceChildren(fallback);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let response;
      try { response = await fetch(base + 'index.html' + refresh, { cache: 'no-cache', signal: controller.signal }); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error(`HTML indisponível (${response.status})`);

      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      const core = source.body.querySelector('script[src*="js/bundle.js"]');
      const stylesheet = source.head.querySelector('link[rel="stylesheet"]');
      if (!source.getElementById('menuOverlay') || !core || !stylesheet || source.querySelectorAll('script').length !== 1) {
        throw new Error('HTML do Offline incompatível');
      }
      core.remove();
      stylesheet.remove();

      const loadedStyle = await loadAsset('assets/style.css', 'style');
      const baseElement = document.createElement('base');
      baseElement.href = base;
      document.documentElement.lang = source.documentElement.lang || 'pt-BR';
      document.head.replaceChildren(baseElement, ...source.head.childNodes, fallbackStyle, loadedStyle, loaderScript);
      document.body.className = source.body.className;
      document.body.replaceChildren(...source.body.childNodes);

      await loadAsset('js/bundle.js', 'script');
      if (document.getElementById('menuOverlay')?.dataset.organized !== 'true') {
        throw new Error('Não foi possível iniciar o Blû Offline');
      }
    } catch (error) {
      document.body.classList.add('offline-loading');
      document.body.replaceChildren(fallback);
      fallback.setAttribute('role', 'alert');
      message.textContent = 'Não foi possível carregar o Blû Offline pelo CDN. Verifique a conexão e tente novamente.';
      retry.hidden = false;
      console.warn('Blû Offline:', error);
    } finally {
      loading = false;
    }
  }

  retry.addEventListener('click', loadApp);
  loadApp();
})();
