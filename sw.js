/**
 * sw.js
 * Offline-first caching strategy:
 *  - APP_SHELL (HTML/CSS/JS/manifest/icons): precached on install, served
 *    cache-first, refreshed on every new SW version.
 *  - /data/*.json (content libraries): stale-while-revalidate, so content
 *    edits ship silently but the app is instantly usable offline.
 *  - Navigation requests fall back to offline.html when nothing is cached.
 */

const VERSION = 'nur-al-dhikr-v2.3.0';
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;

const APP_SHELL = [
  './',
  'index.html',
  'offline.html',
  'manifest.json',
  'assets/css/variables.css',
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/css/components.css',
  'assets/css/cards.css',
  'assets/css/quran.css',
  'assets/css/animations.css',
  'assets/css/accessibility.css',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
  'js/app.js',
  'js/backup.js',
  'js/calendar.js',
  'js/checklist.js',
  'js/compass.js',
  'js/qibla.js',
  'js/mushaf.js',
  'js/recitation.js',
  'js/components/card.js',
  'js/components/menus.js',
  'js/components/modal.js',
  'js/components/shell.js',
  'js/components/toast.js',
  'js/config.js',
  'js/editor.js',
  'js/i18n.js',
  'js/icons.js',
  'js/migration.js',
  'js/notifications.js',
  'js/prayer.js',
  'js/renderer.js',
  'js/router.js',
  'js/schema.js',
  'js/search.js',
  'js/speech.js',
  'js/state.js',
  'js/statistics.js',
  'js/storage.js',
  'js/tasbih.js',
  'js/theme.js',
  'js/utils.js',
  'js/views/about.js',
  'js/views/calendar.js',
  'js/views/category.js',
  'js/views/checklist.js',
  'js/views/collection.js',
  'js/views/collections.js',
  'js/views/editor.js',
  'js/views/favorites.js',
  'js/views/focus.js',
  'js/views/home.js',
  'js/views/library.js',
  'js/views/mushafReader.js',
  'js/views/prayer.js',
  'js/views/qibla.js',
  'js/views/quiz.js',
  'js/views/quran.js',
  'js/views/search.js',
  'js/views/settings.js',
  'js/views/statistics.js',
  'js/views/tasbih.js',
  'data/catalog.json',
  'data/adhkar.json',
  'data/duas.json',
  'data/quranic.json',
  'data/prophet-duas.json',
  'data/asma.json',
  'data/reflections.json',
  'data/pdf-duas.json',
  'data/daily-sunnah.json',
  'data/special-days.json',
  'data/quran-meta.json',
  'data/mushaf-meta.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[sw] precache failed', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isDataRequest(url) {
  return url.pathname.includes('/data/') && url.pathname.endsWith('.json');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isDataRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('index.html').then((r) => r || caches.match('offline.html')))
    );
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((response) => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || (await networkFetch) || new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' } });
}
