// ────────────────────────────────────────────────────────────────────────────
// Service worker: offline app shell only.
// API responses are never cached here (they contain per-user data); fragment
// metadata for offline use is kept in IndexedDB by the app and cleared on sign-out.
// ────────────────────────────────────────────────────────────────────────────

const SHELL_CACHE = 'fragments-shell-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/icons.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only same-origin static assets; the API (any origin, /v1/*) always goes to the network
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/v1/') || url.pathname === '/health') return;

  // Navigations: network first, fall back to the cached shell when offline
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  // Static assets: cache first, then network (and cache the result)
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
