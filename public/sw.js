/* Offline cache for the Recipe Box PWA. Scope is /recipes/ only (never the site root). */
const CACHE = 'recipes-app-v3-1';
const BASE = new URL(self.registration.scope).pathname; // '/recipes/'
const PRECACHE = [BASE, `${BASE}index.html`, `${BASE}manifest.webmanifest`, `${BASE}icons/icon.svg`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Only ever delete our own caches; Margory's ('margory-app-*') share this origin.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('recipes-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.registration.scope)) return;

  const isNav =
    request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  if (isNav) {
    // Network-first so new deploys show up quickly.
    event.respondWith(
      fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match(`${BASE}index.html`))),
    );
    return;
  }

  // Cache-first for hashed assets, thumbnails and icons.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
