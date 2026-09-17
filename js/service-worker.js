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

const CACHE_VERSION = 'v19';
const CACHE_NAME = `blu-cache-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/style.css',
  '/assets/blu.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-192.png',
  '/assets/icons/icon-maskable-512.png',
  '/js/core/debug.js',
  '/js/core/utils.js',
  '/js/ui/dialogs.js',
  '/js/core/storage.js',
  '/js/data/user-data.js',
  '/js/features/content-dashboard.js',
  '/js/features/archive.js',
  '/js/ui/render.js',
  '/js/features/search.js',
  '/js/core/crypto.js',
  '/js/data/crud.js',
  '/js/features/dnd.js',
  '/js/data/json-tools.js',
  '/js/data/custom-export.js',
  '/js/ui/context-menu.js',
  '/js/ui/quick-actions.js',
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
  const requestUrl = new URL(request.url);

  // Só GET, só same-origin — evita cachear POSTs, extensões do
  // navegador, chamadas de outros domínios, etc.
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  // Compartilhamentos dependem da API e podem expirar. Nem a página nem
  // respostas da API devem sobreviver offline por meio do cache do PWA.
  const networkOnly = requestUrl.pathname === '/share.html'
    || requestUrl.pathname.startsWith('/share/')
    || requestUrl.pathname.startsWith('/s/')
    || requestUrl.pathname.startsWith('/api/');
  if (networkOnly) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
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
