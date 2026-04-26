/* Sigma service worker — offline-first asset cache.
 *
 * Strategy:
 *  - On install, precache the app shell (index.html + manifest + icons).
 *  - On fetch:
 *     - Navigation requests → network-first, fall back to cached index.html.
 *       This keeps the app installable and usable when offline, while still
 *       allowing fresh deploys to land when online.
 *     - JS/CSS/image GETs → stale-while-revalidate against the SW cache.
 *     - Anything else → pass through (no caching).
 *
 *  Note: API calls to AI providers go straight to the network; we don't proxy
 *  or cache them here.
 */
const VERSION = 'sigma-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(APP_SHELL.filter(Boolean)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Don't cache cross-origin (AI provider calls etc.)
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(VERSION);
          cache.put('/index.html', fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(VERSION);
          const cached = await cache.match('/index.html');
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (/\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|ico|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((resp) => {
            if (resp && resp.ok) cache.put(req, resp.clone());
            return resp;
          })
          .catch(() => cached || Response.error());
        return cached || fetchPromise;
      })(),
    );
  }
});
