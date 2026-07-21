const CACHE_NAME = 'edupulse-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/index.jsx',
  '/src/assets/styles.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (e) => {
  // Handle network-first fallback strategies gracefully
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});