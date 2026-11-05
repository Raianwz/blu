// Integrações do Halloween com o app principal, preservadas junto ao evento.
document.addEventListener('blu:preferences-reset', () => {
  if (typeof applyHalloweenPreference === 'function') applyHalloweenPreference();
});

document.addEventListener('blu:prepare-popout-clone', event => {
  const clone = event.detail?.clone;
  if (!clone) return;

  clone.querySelector('#halloweenPaletteBanner')?.setAttribute('hidden', '');
  clone.querySelectorAll('.halloween-roaming-spider').forEach(spider => spider.remove());
  clone.querySelectorAll('.halloween-idle-ghost').forEach(ghost => ghost.remove());
  clone.querySelectorAll('.halloween-idle-spotlight').forEach(spotlight => spotlight.remove());
  clone.querySelector('body')?.classList.remove('halloween-ghost-cursor');
});
