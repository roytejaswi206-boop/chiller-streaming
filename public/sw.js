// CHILLER Official Service Worker — PWA App Shell & Offline Experience
const CACHE_NAME = 'chiller-v1';
const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/branding/chiller-app-icon.png',
  '/branding/chiller-app-icon-maskable.png',
  '/branding/chiller-logo-horizontal.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Core asset caching warning:', err);
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
  const req = event.request;
  const url = new URL(req.url);

  // Do not cache API routes, videos, or external provider requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin/') ||
    req.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Network-first for HTML pages with cache fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        const offlinePage = await cache.match('/offline.html');
        return offlinePage || new Response('Offline — CHILLER', { headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  // Cache-first for branding, icons, and static assets
  if (
    url.pathname.startsWith('/branding/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});
