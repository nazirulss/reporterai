/**
 * REPORTER AI — Progressive Web App (PWA) Service Worker
 * Version: 1.0.1
 */

const CACHE_NAME = 'reporter-ai-cache-v1.0.1';
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Install: Cache critical static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[ServiceWorker] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge old cache versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first with Cache fallback for app shell, Network-only for live API
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Live Apps Script API calls: Always network, no caching of dynamic mutations
  if (requestUrl.hostname.includes('script.google.com') || requestUrl.hostname.includes('googleusercontent.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static Assets / Page requests: Network-First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If response is valid, clone and update cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback from cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Default fallback to index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('index.html');
          }
        });
      })
  );
});
