// Bump this version whenever you deploy changes to HTML/JS/CSS/JSON.
const CACHE_NAME = 'ordering-app-v3';

const ASSETS_TO_CACHE = [
  'order.html',
  'pastOrders.html',
  'businessDay.js',
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

const APP_ASSETS = new Set(ASSETS_TO_CACHE);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
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

function cachePathname(url) {
  try {
    return new URL(url).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

function isAppAsset(request) {
  if (request.method !== 'GET') return false;
  const path = cachePathname(request.url);
  return APP_ASSETS.has(path);
}

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
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('order.html');
    }
    throw new Error('Offline and not cached');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, copy);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (isAppAsset(request) || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
