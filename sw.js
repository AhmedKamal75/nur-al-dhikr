/**
 * sw.js
 * Offline-first caching strategy:
 *  - APP_SHELL (HTML/CSS/JS/manifest/icons): precached on install, served
 *    cache-first, refreshed on every new SW version.
 *  - /data/*.json (content libraries): stale-while-revalidate, so content
 *    edits ship silently but the app is instantly usable offline.
 *  - Navigation requests fall back to offline.html when nothing is cached.
 */

const VERSION = 'nur-al-dhikr-v3.16.0';
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
// The handful of *extra* tafsir/i'rab editions too large to bundle on-device
// (see TAFSIR_REMOTE_URL in config.js) are fetched from this single public
// host only when the person explicitly taps "Download". Once fetched, the
// response is cached here forever — cache-first, since a classical tafsir's
// text for a given ayah never changes — so it reads offline from then on,
// exactly like every other on-device data file.
const TAFSIR_REMOTE_HOST = 'raw.githubusercontent.com';

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
  'assets/fonts/Amiri-Regular.woff2',
  'assets/fonts/Amiri-Bold.woff2',
  'assets/fonts/AmiriQuran.woff2',
  'assets/audio/adhan/adhan.mp3',
  'js/app.js',
  'js/celebrate.js',
  'js/adhkarTiming.js',
  'js/khatma.js',
  'js/moods.js',
  'js/onboarding.js',
  'js/prayerLog.js',
  'js/shareCard.js',
  'js/backup.js',
  'js/calendar.js',
  'js/calendarNotes.js',
  'js/checklist.js',
  'js/compass.js',
  'js/qibla.js',
  'js/mushaf.js',
  'js/wordStudy.js',
  'js/tajweed.js',
  'js/tajweedPractice.js',
  'js/ramadan.js',
  'js/zakat.js',
  'js/audioCatalog.js',
  'js/audioStore.js',
  'js/player.js',
  'js/recitation.js',
  'js/components/card.js',
  'js/components/calendarModals.js',
  'js/components/menus.js',
  'js/components/modal.js',
  'js/components/shell.js',
  'js/components/toast.js',
  'js/components/skeleton.js',
  'js/components/emptyState.js',
  'js/soundDesign.js',
  'js/config.js',
  'js/editor.js',
  'js/i18n.js',
  'js/icons.js',
  'js/migration.js',
  'js/notifications.js',
  'js/prayer.js',
  'js/prayerSound.js',
  'js/renderer.js',
  'js/router.js',
  'js/quranSearch.js',
  'js/hadith.js',
  'js/surahPlayback.js',
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
  'js/views/mood.js',
  'js/views/mushafReader.js',
  'js/views/tafsirPanel.js',
  'js/views/hadith.js',
  'js/views/tajweedPracticeView.js',
  'js/views/onboardingPanel.js',
  'js/views/prayer.js',
  'js/views/qibla.js',
  'js/views/quiz.js',
  'js/views/quran.js',
  'js/views/ramadan.js',
  'js/views/zakat.js',
  'js/views/audioManager.js',
  'js/views/playerBar.js',
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
  'data/mushaf-meta.json',
  'data/quran-roots.json',
  'data/tafsir-editions.json',
  'data/tajweed-practice.json',
  'data/reciters.json',
  // Ahadeeth (v3.9): the book registry + the two small books are precached
  // (the daily hadith works with zero network, ever). The two big Sahihs
  // load on first open and are kept offline by the /data stale-while-
  // revalidate rule below — same contract as the on-demand tafsir volumes.
  'data/hadith/index.json',
  'data/hadith/nawawi.json',
  'data/hadith/qudsi.json',
];

self.addEventListener('install', (event) => {
  // No skipWaiting() here, deliberately: on an UPDATE the new worker waits
  // until the person taps "Refresh" (app.js posts SKIP_WAITING below), so a
  // running session is never swapped underneath them mid-use. First
  // installs still activate immediately — there's no previous worker to
  // wait for.
  //
  // Precache requests use cache: 'reload' so they bypass the browser's
  // HTTP disk cache: without this, a stale heuristic-cached copy of an
  // asset can land in the brand-new cache and the "updated" app would
  // keep serving the old bytes (observed and reproduced in testing).
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .catch((err) => console.warn('[sw] precache failed', err))
  );
});

// The client-side update flow (app.js) asks a waiting worker to take over
// immediately when the person taps "Refresh" on the update toast. The new
// worker then claims the page (below) and the app reloads into it.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isDataRequest(url) {
  return url.pathname.includes('/data/') && url.pathname.endsWith('.json');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    // Everything cross-origin (audio CDN, etc.) passes straight through
    // uncached — except the one on-demand tafsir host, which gets a
    // permanent cache-first entry the moment the person downloads it.
    if (url.hostname === TAFSIR_REMOTE_HOST) {
      event.respondWith(cacheFirstCrossOrigin(request));
    }
    return;
  }

  if (isDataRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('index.html').then((r) => r || caches.match('offline.html'))
      )
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
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return (
    cached ||
    (await networkFetch) ||
    new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

async function cacheFirstCrossOrigin(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
