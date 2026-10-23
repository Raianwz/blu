// Optional extras use the published branch by default. ?extras=local loads this checkout for testing.
(function () {
  const projectBase = new URL('../', document.currentScript?.src || document.baseURI);
  const cdnBase = 'https://cdn.jsdelivr.net/gh/Raianwz/blu@blu%2Foffline/';
  const local = new URLSearchParams(location.search).get('extras') === 'local';
  const base = local ? projectBase : cdnBase;
  const assetLoads = new Map();

  function loadAsset(file, type) {
    const key = `${type}:${file}`;
    if (assetLoads.has(key)) return assetLoads.get(key);
    const promise = new Promise((resolve, reject) => {
      const asset = document.createElement(type === 'script' ? 'script' : 'link');
      const timeout = setTimeout(() => {
        asset.remove();
        reject(new Error(`Extra indisponível: ${file}`));
      }, 8000);
      if (type === 'script') {
        asset.src = new URL(file, base).href;
        asset.crossOrigin = 'anonymous';
      } else {
        asset.rel = 'stylesheet';
        asset.href = new URL(file, base).href;
        asset.crossOrigin = 'anonymous';
      }
      asset.onload = () => { clearTimeout(timeout); resolve(asset); };
      asset.onerror = () => {
        clearTimeout(timeout);
        asset.remove();
        reject(new Error(`Extra indisponível: ${file}`));
      };
      document.head.appendChild(asset);
    });
    assetLoads.set(key, promise);
    promise.catch(() => assetLoads.delete(key));
    return promise;
  }

  const loadScript = file => loadAsset(file, 'script');
  const loadStyle = file => loadAsset(file, 'style');
  const extraPaths = Object.freeze({
    icons: { script: 'js/extra/icons.js', style: 'assets/extra/icons.css' }
  });
  const modules = new Map();

  function register(name, module) {
    if (extraPaths[name]) modules.set(name, module);
  }

  async function loadExtra(name) {
    const extra = extraPaths[name];
    if (!extra) throw new Error(`Extra desconhecido: ${name}`);
    await Promise.all([loadScript(extra.script), ...(extra.style ? [loadStyle(extra.style)] : [])]);
    const module = modules.get(name);
    if (!module) throw new Error(`Extra não registrado: ${name}`);
    return module.load();
  }

  window.BluExtras = Object.freeze({ loadExtra, loadScript, loadStyle, register });
})();
