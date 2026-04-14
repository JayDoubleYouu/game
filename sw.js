// MANORS Service Worker - caches game shell + image assets
const CACHE_NAME = 'manors-v4-1';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for images (unsplash etc), network-first for app shell
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url.pathname) || url.host.includes('unsplash') || url.host.includes('images');

  if (isImage) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((resp) => {
          if (resp && resp.status === 200 && resp.type !== 'opaque') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          } else if (resp && resp.type === 'opaque') {
            // Still cache opaque CORS responses (unsplash)
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return resp;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // App shell: network, fall back to cache
  e.respondWith(
    fetch(e.request).then((resp) => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      return resp;
    }).catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
  );
});
