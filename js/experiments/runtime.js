// ==========================================================
// Runtime isolado para recursos experimentais do Blû
// ==========================================================

(() => {
  const definitions = {
    'advanced-drag-layout': {
      script: 'js/experiments/advanced-drag-layout.js',
      style: 'assets/experiments/advanced-drag-layout.css',
      setting: 'advancedOrganizing',
      buttonId: 'advancedOrganizingBtn',
      label: 'Estabilizar ao Arrastar'
    }
  };

  const registered = new Map();
  const enabled = new Set();
  const loading = new Map();
  const safeMode = new URLSearchParams(location.search).get('safe') === '1';

  function updateButton(id, active, failed = false) {
    const config = definitions[id];
    const button = document.getElementById(config?.buttonId);
    if (!button) return;

    button.classList.toggle('active', active);
    button.classList.toggle('experiment-failed', failed);
    button.setAttribute('aria-pressed', String(active));
    const label = button.querySelector('.menu-btn-label');
    if (label) label.textContent = `${config.label}: ${active ? 'ON' : 'OFF'}`;
  }

  function removeAssets(id) {
    document.querySelectorAll(`[data-blu-experiment="${id}"]`).forEach(asset => asset.remove());
  }

  function containFailure(id, error) {
    console.error(`Experimento "${id}" desativado:`, error);
    try {
      registered.get(id)?.disable?.();
    } catch (cleanupError) {
      console.error(`Falha ao limpar o experimento "${id}":`, cleanupError);
    }
    enabled.delete(id);
    removeAssets(id);
    setSetting(definitions[id].setting, 'off');
    updateButton(id, false, true);
    if (typeof notify === 'function') notify('Um recurso experimental apresentou erro e foi desativado', 'err');
  }

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.bluExperiment = id;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error(`Não foi possível carregar ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  function loadStyle(id, href) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[data-blu-experiment="${id}"]`)) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.bluExperiment = id;
      link.onload = resolve;
      link.onerror = () => {
        link.remove();
        reject(new Error(`Não foi possível carregar ${href}`));
      };
      document.head.appendChild(link);
    });
  }

  async function ensureLoaded(id) {
    if (registered.has(id)) return registered.get(id);
    if (!definitions[id]) throw new Error(`Experimento desconhecido: ${id}`);
    if (!loading.has(id)) {
      loading.set(id, loadScript(id, definitions[id].script).then(() => {
        const experiment = registered.get(id);
        if (!experiment) throw new Error(`O experimento "${id}" não se registrou`);
        return experiment;
      }).finally(() => loading.delete(id)));
    }
    return loading.get(id);
  }

  async function enable(id, { persist = true } = {}) {
    if (safeMode || enabled.has(id)) return false;
    try {
      const experiment = await ensureLoaded(id);
      await loadStyle(id, definitions[id].style);
      experiment.enable?.();
      enabled.add(id);
      if (persist) setSetting(definitions[id].setting, 'on');
      updateButton(id, true);
      return true;
    } catch (error) {
      containFailure(id, error);
      return false;
    }
  }

  function disable(id, { persist = true } = {}) {
    try {
      registered.get(id)?.disable?.();
    } catch (error) {
      console.error(`Falha ao desativar o experimento "${id}":`, error);
    }
    enabled.delete(id);
    removeAssets(id);
    if (persist && definitions[id]) setSetting(definitions[id].setting, 'off');
    updateButton(id, false);
  }

  async function toggle(id) {
    if (enabled.has(id)) {
      disable(id);
      if (typeof notify === 'function') notify('Estabilização ao arrastar desativada');
      return;
    }
    if (await enable(id) && typeof notify === 'function') {
      notify('Estabilização ao arrastar ativada');
    }
  }

  function emit(hook, payload) {
    enabled.forEach(id => {
      try {
        registered.get(id)?.hooks?.[hook]?.(payload);
      } catch (error) {
        containFailure(id, error);
      }
    });
  }

  function resolve(hook, fallback, payload) {
    let value = fallback;
    enabled.forEach(id => {
      try {
        const result = registered.get(id)?.hooks?.[hook]?.(payload);
        if (result !== undefined) value = result;
      } catch (error) {
        containFailure(id, error);
      }
    });
    return value;
  }

  function register(experiment) {
    if (!experiment?.id || !definitions[experiment.id]) {
      throw new Error('Registro de experimento inválido');
    }
    registered.set(experiment.id, experiment);
  }

  async function init() {
    for (const [id, config] of Object.entries(definitions)) {
      updateButton(id, false);
      if (!safeMode && getSetting(config.setting) === 'on') {
        await enable(id, { persist: false });
      }
    }
  }

  function reset() {
    Object.keys(definitions).forEach(id => disable(id));
  }

  window.BluExperiments = { register, emit, resolve, enable, disable, toggle, init, reset };
  window.toggleBluExperiment = id => window.BluExperiments.toggle(id);
  window.initBluExperiments = () => window.BluExperiments.init();
  window.resetBluExperiments = () => window.BluExperiments.reset();
  window.dispatchEvent(new CustomEvent('blu:experiments-ready'));
})();
