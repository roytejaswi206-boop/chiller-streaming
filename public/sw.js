// CHILLER Official Service Worker — PWA App Shell & Offline Experience
// Build: 2026.09.25-v2.1.0-5f0f0b8
const CACHE_NAME = 'chiller-v3';
const CORE_ASSETS = [
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

// Install: Cache core assets and enter waiting state (allows user prompt before activation)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Core asset caching warning:', err);
      });
    })
  );
});

// Message: Support SKIP_WAITING from PwaUpdateManager
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received — skipping waiting to activate now.');
    self.skipWaiting();
  }
});

// Activate: Purge all older CHILLER caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('chiller-') && key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Purging obsolete CHILLER cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Handle network requests with proper isolation
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API routes, admin portal, or non-GET requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin/') ||
    req.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Network-first for HTML navigation with offline fallback
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

  // Cache-first for branding, icons, and static images
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
