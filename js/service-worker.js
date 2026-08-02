// ==========================================================
// Service Worker do Blû — estratégia NETWORK-FIRST
// ==========================================================
// Prioridade: sempre buscar a versão mais nova na rede quando
// online. O cache só entra em cena como rede de segurança
// (modo offline ou falha de rede) — nunca como fonte primária.
// Isso evita o problema de "corrigi um bug, mas o usuário
// continua vendo a versão antiga" em um projeto com deploys
// frequentes como este.
//
// IMPORTANTE: ao publicar uma mudança que deva invalidar o
// cache antigo de vez (ex: renomeou/removeu um arquivo), basta
// subir a versão abaixo (CACHE_VERSION). Isso cria um cache
// novo e descarta o antigo na ativação.

const CACHE_VERSION = 'v4';
const CACHE_NAME = `blu-cache-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/share.html',
  '/manifest.json',
  '/assets/style.css',
  '/assets/blu.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-192.png',
  '/assets/icons/icon-maskable-512.png',
  '/js/utils.js',
  '/js/dialogs.js',
  '/js/storage.js',
  '/js/render.js',
  '/js/search.js',
  '/js/crypto.js',
  '/js/crud.js',
  '/js/dnd.js',
  '/js/context-menu.js',
  '/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Só GET, só same-origin — evita cachear POSTs, extensões do
  // navegador, chamadas de outros domínios, etc.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Offline ou falha de rede — cai para o cache como rede de segurança.
    const cached = await caches.match(request);
    if (cached) return cached;

    // Sem cache e sem rede: se for navegação de página, tenta ao menos
    // devolver o index.html cacheado como último recurso.
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }

    throw error;
  }
}
