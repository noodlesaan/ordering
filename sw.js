// Bump this version whenever you deploy changes to HTML/JS/CSS/JSON.
const CACHE_NAME = 'ordering-app-v1.0.1';

const ASSETS_TO_CACHE = [
  'index.html',
  '404.html',
  'pastOrders.html',
  'services.js',
  'order.js',
  'pastOrders.js',
  'menuData.json',
  'main.css',
  'manifest.json',
  'assets/tailwind.min.css',
  'assets/fonts.css',
  'assets/fonts/Vazirmatn-Thin.ttf',
  'assets/fonts/Vazirmatn-ExtraLight.ttf',
  'assets/fonts/Vazirmatn-Light.ttf',
  'assets/fonts/Vazirmatn-Regular.ttf',
  'assets/fonts/Vazirmatn-Medium.ttf',
  'assets/fonts/Vazirmatn-SemiBold.ttf',
  'assets/fonts/Vazirmatn-Bold.ttf',
  'assets/fonts/Vazirmatn-ExtraBold.ttf',
  'assets/fonts/Vazirmatn-Black.ttf',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, copy);
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match(new URL('404.html', self.registration.scope).href);
    }
    throw new Error('Offline and not cached');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Always prefer deployed files. Cache is only an offline fallback.
  event.respondWith(networkFirst(request));
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
