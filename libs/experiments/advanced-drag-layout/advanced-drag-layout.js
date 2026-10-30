// Experimento: organiza temporariamente os botões em uma lista vertical.
(() => {
  const ID = 'advanced-drag-layout';
  const ENABLED_CLASS = 'blu-experiment-advanced-drag-layout';
  const ACTIVE_CLASS = 'blu-experiment-button-drag';
  let events = null;

  function clearDragState() {
    document.body.classList.remove(ACTIVE_CLASS);
  }

  function register() {
    window.BluExperiments.register({
      id: ID,
      enable() {
        document.body.classList.add(ENABLED_CLASS);
        events = new AbortController();
        window.addEventListener('blur', clearDragState, { signal: events.signal });
      },
      disable() {
        events?.abort();
        events = null;
        clearDragState();
        document.body.classList.remove(ENABLED_CLASS);
      },
      hooks: {
        'button-drag:start': () => document.body.classList.add(ACTIVE_CLASS),
        'button-drag:end': clearDragState,
        'button-drag:axis': () => document.body.classList.contains(ACTIVE_CLASS) ? 'vertical' : undefined
      }
    });
  }

  if (window.BluExperiments) register();
  else window.addEventListener('blu:experiments-ready', register, { once: true });
})();
