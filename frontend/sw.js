/**
 * sw.js — e-chemEd Offline-First Service Worker
 * 
 * Strategy:
 * 1. API calls (/api/*): Network-only, never cached (preserves attendance/auth security).
 * 2. Static Assets (fonts, images, css, js): Cache-First with network fallback.
 * 3. HTML Pages & Data JSONs: Stale-While-Revalidate for instant render & background refresh.
 */

const CACHE_NAME = 'echemed-cache-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/tokens.css',
  './assets/css/base.css',
  './assets/css/components.css',
  './assets/css/motion.css',
  './assets/css/pages/home.css',
  './assets/js/config.js',
  './assets/js/auth.js',
  './assets/js/main.js',
  './assets/js/motion.js',
  './assets/js/components.js',
  './assets/js/data-store.js',
  './assets/js/search.js',
  './assets/fonts/instrument-sans-normal-400.woff2',
  './assets/fonts/newsreader-normal-600.woff2',
  './assets/img/logo.jpg',
  './assets/img/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache non-critical warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never cache non-GET requests or backend API routes
  if (event.request.method !== 'GET' || url.pathname.includes('/api/')) {
    return;
  }

  // 2. Static Assets: Cache-First
  const isStatic = url.pathname.match(/\.(woff2|svg|jpg|jpeg|png|webp|css|js)$/i);
  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. HTML Pages & JSON Data: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
