// sw.js — Offline Service Worker for Brand Games Arcade Hub
const CACHE_NAME = 'brand-arcade-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './shop.html',
  './manifest.json',
  './assets/arcade-icon.svg',
  './assets/fair-play.js',
  './assets/arcade-daily.js',
  './assets/arcade-passport.js',
  './assets/arcade-inspector.js',
  './assets/arcade-nav.js',
  './assets/arcade-safe.css',
  './assets/arcade-safe.js',
  './assets/arcade-store-config.js',
  './assets/arcade-store.js',
  './assets/arcade-store-boot.js',
  './assets/arcade-cosmetics.css',
  './assets/arcade-cosmetics.js',
  './assets/arcade-content.css',
  './assets/arcade-content.js',
  './assets/arcade-shop.css',
  './assets/arcade-shop.js',
  './assets/arcade-island.js',
  './assets/arcade-island-hooks.js'
];

const GAME_SHELLS = [
  'blockblast', 'solitaire', 'sudoku', 'nonogram', 'minesweeper',
  'mahjong', 'codebreaker', 'wordsearch', 'spidersolitaire', 'spades'
].reduce((acc, g) => {
  acc.push(`./${g}/www/index.html`, `./${g}/www/game.html`, `./${g}/www/store.html`);
  return acc;
}, []);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(CORE_ASSETS).then(() =>
        Promise.allSettled(GAME_SHELLS.map((url) => cache.add(url)))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first with offline cache fallback
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
