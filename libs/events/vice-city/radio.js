// Optional Vice City radio. Audio stays on R2 and is never requested until needed.
(() => {
  const BASE = 'https://rd.blu.rwz.app/vice-city/';
  const START = Date.parse('2026-11-16T00:00:00-03:00');
  const END = Date.parse('2026-11-28T16:00:00-03:00');
  const LOCAL_PREVIEW = ['localhost', '127.0.0.1'].includes(window.location?.hostname) &&
    new URLSearchParams(window.location.search).has('radio-preview');
  const TRACKS = [
    'Blood In Your Eyes.mp3',
    'Bright Lights, Big City.mp3',
    'Don’t Chart.mp3',
    'Flower In A Hurricane (feat. Tame Impala, SZA, King Gizzard & The Lizard Wizard).mp3',
    'GTA VI - Main Theme Music - Dan Allen Gaming.mp3',
    'Gta Vice City Theme - kepopay.mp3',
    'Last Thing You Need.mp3',
    'Macacoa 2000.mp3',
    'RHYNO.mp3',
    'Sexy Magic.mp3',
    'Suzuki.mp3',
    'That’s It (feat. Future & Metro Boomin).mp3',
    'The Pointer Sisters - Hot Together.mp3'
  ];
  const trackUrl = index => BASE + encodeURIComponent(TRACKS[index]);
  const trackTitle = index => TRACKS[index].replace(/\.mp3$/i, '');
  let button = null;
  let panel = null;
  let player = null;
  let probe = null;
  let probeTimer = null;
  let calendarTimer = null;
  let generation = 0;
  let trackIndex = 0;
  let order = TRACKS.map((_, index) => index);
  let orderPosition = 0;
  let metadataRequest = 0;
  const metadata = new Map();
  let failedTracks = 0;

  function shuffleOrder() {
    order = TRACKS.map((_, index) => index);
    if (LOCAL_PREVIEW) return;
    for (let index = order.length - 1; index > 0; index--) {
      const random = Math.floor(Math.random() * (index + 1));
      [order[index], order[random]] = [order[random], order[index]];
    }
  }

  function decodeText(bytes) {
    if (!bytes.length) return '';
    const encoding = bytes[0];
    let payload = bytes.subarray(1);
    try {
      if (encoding === 1 || encoding === 2) {
        let charset = 'utf-16be';
        if (encoding === 1 && payload[0] === 0xff && payload[1] === 0xfe) {
          charset = 'utf-16le';
          payload = payload.subarray(2);
        } else if (encoding === 1 && payload[0] === 0xfe && payload[1] === 0xff) {
          payload = payload.subarray(2);
        }
        return new TextDecoder(charset).decode(payload).replace(/\0/g, '').trim();
      }
      return new TextDecoder(encoding === 3 ? 'utf-8' : 'windows-1252')
        .decode(payload).replace(/\0/g, '').trim();
    } catch { return ''; }
  }

  function readId3(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 10 || String.fromCharCode(...bytes.subarray(0, 3)) !== 'ID3') return {};
    const version = bytes[3];
    if (version !== 3 && version !== 4) return {};
    const tagSize = ((bytes[6] & 127) << 21) | ((bytes[7] & 127) << 14) |
      ((bytes[8] & 127) << 7) | (bytes[9] & 127);
    const end = Math.min(bytes.length, tagSize + 10);
    const fields = {};
    for (let offset = 10; offset + 10 <= end;) {
      const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const size = version === 4
        ? ((bytes[offset + 4] & 127) << 21) | ((bytes[offset + 5] & 127) << 14) |
          ((bytes[offset + 6] & 127) << 7) | (bytes[offset + 7] & 127)
        : (bytes[offset + 4] * 0x1000000) + (bytes[offset + 5] << 16) +
          (bytes[offset + 6] << 8) + bytes[offset + 7];
      if (!size || offset + 10 + size > end) break;
      if (id === 'TIT2' || id === 'TPE1' || id === 'TALB') {
        fields[{ TIT2: 'title', TPE1: 'artist', TALB: 'album' }[id]] =
          decodeText(bytes.subarray(offset + 10, offset + 10 + size));
      }
      offset += 10 + size;
    }
    return fields;
  }

  async function loadMetadata(index) {
    const request = ++metadataRequest;
    if (metadata.has(index)) { updateControls(); return; }
    try {
      const response = await fetch(trackUrl(index), { headers: { Range: 'bytes=0-262143' } });
      if (!response.ok) return;
      const tags = readId3(await response.arrayBuffer());
      metadata.set(index, tags);
      if (request === metadataRequest && player && trackIndex === index) updateControls();
    } catch { /* The audio can play even when the R2 bucket does not allow CORS. */ }
  }

  function eligible() {
    const now = Date.now();
    return (LOCAL_PREVIEW || (now >= START && now < END)) &&
      document.body.classList.contains('vice-city-theme') &&
      !document.body.classList.contains('halloween-theme');
  }

  function scheduleBoundary() {
    clearTimeout(calendarTimer);
    if (LOCAL_PREVIEW) return;
    const now = Date.now();
    const next = now < START ? START : now < END ? END : null;
    if (next !== null) calendarTimer = setTimeout(syncRadio, next - now);
  }

  function stopProbe() {
    clearTimeout(probeTimer);
    probeTimer = null;
    if (!probe) return;
    probe.pause();
    probe.removeAttribute('src');
    probe = null;
  }

  function removeRadio() {
    generation++;
    stopProbe();
    if (player) {
      player.pause();
      player.removeAttribute('src');
      player = null;
    }
    button?.remove();
    panel?.remove();
    button = panel = null;
    trackIndex = 0;
    orderPosition = 0;
    metadataRequest++;
    failedTracks = 0;
  }

  function updateControls() {
    if (!button || !panel) return;
    const playing = !!player && !player.paused;
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-label', playing ? 'Rádio Vice City tocando' : 'Ligar rádio Vice City');
    const playButton = panel.querySelector('.vice-radio__play');
    playButton.textContent = playing ? '❚❚' : '▶';
    playButton.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
    playButton.title = playing ? 'Pausar' : 'Reproduzir';
    const tags = metadata.get(trackIndex) || {};
    const title = tags.title || trackTitle(trackIndex);
    const titleText = panel.querySelector('.vice-radio__track-text');
    if (titleText.textContent !== title) {
      titleText.textContent = title;
      if (!panel.hidden) requestAnimationFrame(refreshTitleMotion);
    }
    panel.querySelector('.vice-radio__artist').textContent = [tags.artist, tags.album].filter(Boolean).join(' · ');
    panel.querySelector('.vice-radio__count').textContent = `${orderPosition + 1}/${TRACKS.length}`;
  }

  function refreshTitleMotion() {
    if (!panel || panel.hidden) return;
    const viewport = panel.querySelector('.vice-radio__track');
    const titleText = panel.querySelector('.vice-radio__track-text');
    titleText.classList.remove('is-scrolling');
    if (!viewport.clientWidth) return;
    const distance = Math.ceil(titleText.scrollWidth - viewport.clientWidth);
    if (distance <= 2) return;
    titleText.style.setProperty('--scroll-distance', `${distance}px`);
    titleText.style.setProperty('--scroll-duration', `${Math.max(12, Math.ceil(distance / 22 / .37))}s`);
    titleText.classList.add('is-scrolling');
  }

  function play() {
    if (!player || !eligible()) return;
    player.play().catch(() => {
      if (player) updateControls();
    });
  }

  function changeTrack(direction) {
    if (!player || !eligible()) return;
    if (direction > 0 && orderPosition === TRACKS.length - 1) {
      const last = trackIndex;
      shuffleOrder();
      if (!LOCAL_PREVIEW && order[0] === last) [order[0], order[1]] = [order[1], order[0]];
    }
    orderPosition = (orderPosition + direction + TRACKS.length) % TRACKS.length;
    trackIndex = order[orderPosition];
    player.src = trackUrl(trackIndex);
    updateControls();
    loadMetadata(trackIndex);
    play();
  }

  function nextTrack() { changeTrack(1); }

  function updateVolumeIndicator(input) {
    const volume = Math.max(0, Math.min(100, Number(input.value) || 0));
    const control = panel.querySelector('.vice-radio__volume-control');
    control.style.setProperty('--volume-position', `${volume}%`);
    panel.querySelector('.vice-radio__volume-value').textContent = `${volume}%`;
    input.setAttribute('aria-valuetext', `${volume}%`);
    if (player) player.volume = volume / 100;
  }

  function startPlayer() {
    if (player) return;
    shuffleOrder();
    orderPosition = 0;
    trackIndex = order[0];
    player = new Audio(trackUrl(trackIndex));
    player.preload = 'none';
    player.volume = .15;
    player.addEventListener('play', updateControls);
    player.addEventListener('pause', updateControls);
    player.addEventListener('ended', () => {
      failedTracks = 0;
      nextTrack();
    });
    player.addEventListener('playing', () => { failedTracks = 0; });
    player.addEventListener('error', () => {
      if (++failedTracks >= TRACKS.length) removeRadio();
      else nextTrack();
    });
    loadMetadata(trackIndex);
  }

  function showPanel() {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(refreshTitleMotion);
  }

  function mountRadio() {
    if (!eligible() || button) return;
    const topbar = document.getElementById('topbar');
    if (!topbar) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'vice-radio__button';
    button.title = 'Rádio Vice City';
    button.setAttribute('aria-controls', 'viceRadioPanel');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 9 14-5M5 9h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><circle cx="8" cy="15" r="2"/><path d="M14 14h4m-4 3h4"/></svg>';
    panel = document.createElement('div');
    panel.id = 'viceRadioPanel';
    panel.className = 'vice-radio__panel';
    panel.hidden = true;
    panel.innerHTML = '<div class="vice-radio__heading"><strong>Rádio Vice City</strong><button class="vice-radio__close" type="button" aria-label="Fechar controles">×</button></div><div class="vice-radio__song"><div class="vice-radio__song-info"><span class="vice-radio__track"><span class="vice-radio__track-text"></span></span><span class="vice-radio__artist"></span></div><span class="vice-radio__count"></span></div><div class="vice-radio__controls"><button class="vice-radio__previous" type="button" aria-label="Música anterior" title="Música anterior">❮</button><button class="vice-radio__play" type="button" aria-label="Reproduzir" title="Reproduzir">▶</button><button class="vice-radio__next" type="button" aria-label="Próxima música" title="Próxima música">❯</button><label class="vice-radio__volume-wrap"><span aria-hidden="true">♫</span><span class="vice-radio__volume-control"><input class="vice-radio__volume" type="range" min="0" max="100" value="15" aria-label="Volume do rádio"><output class="vice-radio__volume-value" aria-hidden="true">15%</output></span></label></div>';
    button.addEventListener('click', () => {
      if (!player) {
        startPlayer();
        showPanel();
        play();
      } else if (panel.hidden) showPanel();
      else {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
      }
    });
    panel.querySelector('.vice-radio__close').addEventListener('click', () => {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    });
    panel.querySelector('.vice-radio__play').addEventListener('click', () => {
      if (player?.paused) play();
      else player?.pause();
    });
    panel.querySelector('.vice-radio__next').addEventListener('click', nextTrack);
    panel.querySelector('.vice-radio__previous').addEventListener('click', () => changeTrack(-1));
    const volumeInput = panel.querySelector('.vice-radio__volume');
    volumeInput.addEventListener('input', event => updateVolumeIndicator(event.target));
    updateVolumeIndicator(volumeInput);
    topbar.appendChild(button);
    document.body.appendChild(panel);
    updateControls();
  }

  function checkAudio() {
    if (probe || button || !eligible()) return;
    const attempt = ++generation;
    let completed = false;
    probe = new Audio();
    probe.preload = 'metadata';
    const finish = available => {
      if (attempt !== generation || completed) return;
      completed = true;
      stopProbe();
      if (available) mountRadio();
    };
    probe.addEventListener('loadedmetadata', () => finish(true), { once: true });
    probe.addEventListener('error', () => finish(false), { once: true });
    probeTimer = setTimeout(() => finish(false), 8000);
    probe.src = trackUrl(0);
    probe.load();
  }

  function syncRadio() {
    scheduleBoundary();
    if (!eligible()) {
      if (button || probe || player) removeRadio();
      return;
    }
    checkAudio();
  }

  function initViceCityRadio() {
    new MutationObserver(syncRadio).observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
    document.addEventListener('visibilitychange', syncRadio);
    window.addEventListener('pageshow', syncRadio);
    window.addEventListener?.('resize', () => requestAnimationFrame(refreshTitleMotion));
    syncRadio();
  }

  window.initViceCityRadio = initViceCityRadio;
})();
