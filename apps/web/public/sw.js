/* NEXORA Smart Edu — service worker
 * Cache name: nexora-v1
 *
 * Strategy:
 *  - Navigation requests: network-first, fall back to cached '/' when offline.
 *  - /_next/static assets + /icons images: cache-first, stale-while-revalidate.
 *  - Everything else (incl. /api/*): network only.
 *  - Only HTTP ok (status 200) opaque-free responses are cached.
 */
const CACHE_NAME = 'nexora-v1';

const PRECACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/teacher/attendance',
  '/teacher/enroll',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin only.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Network-first for page navigations; cached '/' shell offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    // Cache-first, then stale-while-revalidate in the background.
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        // Serve cached copy immediately when present, revalidate in background.
        if (cached) {
          return cached;
        }
        return network;
      })
    );
    return;
  }

  // Everything else (HTML docs, /api/*, etc.): network only.
  return;
});