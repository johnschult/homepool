// Bump this on any change to this file's caching logic — it's the only thing
// that makes the browser notice the service worker itself changed and go
// through install/activate again.
const CACHE_NAME = 'homepool-v3';
// index.html/navigations are intentionally NOT precached here — see the
// fetch handler below, they're network-first so a refresh always picks up a
// new deploy instead of being pinned to whatever build was cached first.
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept auth routes
  if (url.pathname.startsWith('/auth/')) return;

  // API: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigations (and index.html directly): Network First. index.html
  // references content-hashed asset filenames from whatever the latest build
  // is — serving a cached copy here can pin the browser to a build whose
  // hashed assets no longer exist on the server after a redeploy. The cache
  // is only a fallback for when there's no network at all.
  if (event.request.mode === 'navigate' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Everything else (content-hashed JS/CSS, icons, manifest): Cache First is
  // safe because the filename itself changes whenever the content does.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
