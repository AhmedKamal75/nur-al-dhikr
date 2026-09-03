/**
 * sw.js
 * Offline-first caching strategy:
 *  - APP_SHELL (HTML/CSS/JS/manifest/icons/fonts): precached on install,
 *    served cache-first, refreshed on every new SW version.
 *  - /data/*.json (content libraries): stale-while-revalidate via a
 *    MIGRATED (not version-wiped) data cache, so a release never deletes
 *    the surahs/books/tafsir editions the person already downloaded.
 *  - Navigation requests: cached shell served instantly, refreshed in the
 *    background — an offline-first app must not block cold launch on the
 *    network. offline.html is the last-resort fallback.
 */

const VERSION = 'nur-al-dhikr-v5.1.0';
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
  'assets/css/desktop.css',
  'assets/css/accessibility.css',
  'js/app.js',
  'js/app/audioEngine.js',
  'js/app/boot.js',
  'js/app/compassRuntime.js',
  'js/app/drawer.js',
  'js/app/events.js',
  'js/app/fileImports.js',
  'js/app/focusRuntime.js',
  'js/app/forms.js',
  'js/app/fullscreen.js',
  'js/app/hadithData.js',
  'js/app/handlers/audio.js',
  'js/app/handlers/content.js',
  'js/app/handlers/editor.js',
  'js/app/handlers/hifz.js',
  'js/app/handlers/items.js',
  'js/app/handlers/journal.js',
  'js/app/handlers/location.js',
  'js/app/handlers/navigation.js',
  'js/app/handlers/quiz.js',
  'js/app/handlers/quran.js',
  'js/app/handlers/quranAudio.js',
  'js/app/handlers/viewMenus.js',
  'js/app/handlers/system.js',
  'js/app/handlers/tasbih.js',
  'js/app/handlers/worship.js',
  'js/app/handlers/zakat.js',
  'js/app/inputs.js',
  'js/app/installPrompt.js',
  'js/app/lazyData.js',
  'js/app/net.js',
  'js/app/practice.js',
  'js/app/quizDeck.js',
  'js/app/quranData.js',
  'js/app/quranSearch.js',
  'js/app/recitationFollow.js',
  'js/app/renderer.js',
  'js/app/rt.js',
  'js/app/shared.js',
  'js/app/stateSub.js',
  'js/app/tickers.js',
  'js/app/triggers.js',
  'js/core/config.js',
  'js/core/i18n.js',
  'js/core/i18n/ar.js',
  'js/core/i18n/en.js',
  'js/core/icons.js',
  'js/core/migration.js',
  'js/core/router.js',
  'js/core/schema.js',
  'js/core/state.js',
  'js/core/state/actions.js',
  'js/core/state/initial.js',
  'js/core/state/reducer.js',
  'js/core/state/restore.js',
  'js/core/state/selectors.js',
  'js/core/state/store.js',
  'js/core/state/streak.js',
  'js/core/storage.js',
  'js/core/theme.js',
  'js/core/utils.js',
  'js/domain/adhkarTiming.js',
  'js/domain/calendar.js',
  'js/domain/celebrate.js',
  'js/domain/compass.js',
  'js/domain/contentLens.js',
  'js/domain/duaJournal.js',
  'js/domain/fasting.js',
  'js/domain/garden.js',
  'js/domain/hifz.js',
  'js/domain/khatma.js',
  'js/domain/locations.js',
  'js/domain/milestones.js',
  'js/domain/moods.js',
  'js/domain/mutashabihat.js',
  'js/domain/nudge.js',
  'js/domain/onboarding.js',
  'js/domain/prayer.js',
  'js/domain/prayerLog.js',
  'js/domain/qada.js',
  'js/domain/qibla.js',
  'js/domain/quranSearch.js',
  'js/domain/ramadan.js',
  'js/domain/ramadanPlanner.js',
  'js/domain/review.js',
  'js/domain/roots.js',
  'js/domain/search.js',
  'js/domain/sleepTimer.js',
  'js/domain/statistics.js',
  'js/domain/sunnah.js',
  'js/domain/tajweed.js',
  'js/domain/tajweedPractice.js',
  'js/domain/wmm-coefs.js',
  'js/domain/wmm.js',
  'js/domain/wordStudy.js',
  'js/domain/worship.js',
  'js/domain/zakat.js',
  'js/services/alertTriggers.js',
  'js/services/contentPrefs.js',
  'js/services/audioCatalog.js',
  'js/services/audioContext.js',
  'js/services/audioStore.js',
  'js/services/backup.js',
  'js/services/calendarNotes.js',
  'js/services/checklist.js',
  'js/services/dataHealth.js',
  'js/services/editor.js',
  'js/services/hadith.js',
  'js/services/mushaf.js',
  'js/services/notifications.js',
  'js/services/player.js',
  'js/services/prayerSound.js',
  'js/services/recitation.js',
  'js/services/shareCard.js',
  'js/services/soundDesign.js',
  'js/services/speech.js',
  'js/services/surahPlayback.js',
  'js/services/tasbih.js',
  'js/ui/calendarModals.js',
  'js/ui/card.js',
  'js/ui/emptyState.js',
  'js/ui/menus.js',
  'js/ui/modal.js',
  'js/ui/shell.js',
  'js/ui/skeleton.js',
  'js/ui/toast.js',
  'js/ui/viewSheet.js',
  'js/views/about.js',
  'js/views/audioManager.js',
  'js/views/calendar.js',
  'js/views/category.js',
  'js/views/certificate.js',
  'js/views/checklist.js',
  'js/views/collection.js',
  'js/views/collections.js',
  'js/views/editor.js',
  'js/views/garden.js',
  'js/views/favorites.js',
  'js/views/focus.js',
  'js/views/hadith.js',
  'js/views/home.js',
  'js/views/journal.js',
  'js/views/library.js',
  'js/views/mood.js',
  'js/views/mushafReader.js',
  'js/views/mutashabihat.js',
  'js/views/onboardingPanel.js',
  'js/views/playerBar.js',
  'js/views/prayer.js',
  'js/views/qibla.js',
  'js/views/quiz.js',
  'js/views/quran.js',
  'js/views/ramadan.js',
  'js/views/roots.js',
  'js/views/search.js',
  'js/views/settings.js',
  'js/views/statistics.js',
  'js/views/tafsirPanel.js',
  'js/views/tajweedSettings.js',
  'js/views/tajweedPracticeView.js',
  'js/views/tasbih.js',
  'js/views/viewSheets.js',
  'js/views/zakat.js',
  'assets/icons/icon-48.png',
  'assets/icons/icon-72.png',
  'assets/icons/icon-96.png',
  'assets/icons/icon-128.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-256.png',
  'assets/icons/icon-384.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-192.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/fonts/Amiri-Regular.woff2',
  'assets/fonts/Amiri-Bold.woff2',
  'assets/fonts/AmiriQuran.woff2',
  'assets/fonts/OFL.txt',
  'assets/audio/adhan/adhan.mp3',
];
// NOTE: /data/*.json is intentionally NOT precached — every data request is
// served (and cached) by staleWhileRevalidate into DATA_CACHE at runtime,
// so precached copies in SHELL_CACHE would be unreachable dead weight
// (~3.5MB of install bandwidth). First open populates DATA_CACHE instead.

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
  //
  // (v4.3) a failed precache now FAILS the install (precacheShell
  // rethrows): the previous worker keeps serving — and the browser retries
  // the download on the next navigation — instead of a "successfully"
  // installed worker with an empty shell whose activate would delete the
  // old, working shell cache and leave the app offline-dead.
  event.waitUntil(precacheShell());
});

/**
 * Precache with one automatic retry, a client-facing failure signal, and
 * (v4.3) a rethrow on final failure so `install` fails and the PREVIOUS
 * worker keeps controlling the page. addAll() is all-or-nothing: a single
 * transient 500 used to leave the app with an empty shell cache and
 * nothing but a console.warn to show for it — the person then had a
 * "successfully installed" app that was fully network-dependent, and the
 * next activate deleted the old working shell on top of it.
 */
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  const requests = APP_SHELL.map((url) => new Request(url, { cache: 'reload' }));
  try {
    await cache.addAll(requests);
    return;
  } catch (err) {
    console.warn('[sw] precache failed — retrying once', err);
  }
  try {
    await cache.addAll(requests);
  } catch (err) {
    console.warn('[sw] precache failed', err);
    try {
      const clientList = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of clientList) client.postMessage({ type: 'precache-failed' });
    } catch {
      /* no clients to notify */
    }
    // (v4.3) fail the install: an empty shell must never activate over a
    // working one. The page surfaces a Retry toast (triggers.js) which
    // posts PRECACHE_RETRY; a failed install also makes the browser retry
    // on later navigations.
    throw err;
  }
}

// The client-side update flow (app.js) asks a waiting worker to take over
// immediately when the person taps "Refresh" on the update toast. The new
// worker then claims the page (below) and the app reloads into it.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  else if (event.data && event.data.type === 'PRECACHE_RETRY') {
    // (v4.3) the page's "precache failed → Retry" toast gives the failed
    // install another attempt at filling this worker's shell cache.
    event.waitUntil(
      precacheShell().catch(() => {
        try {
          self.clients
            .matchAll({ includeUncontrolled: true })
            .then((clientList) => {
              for (const client of clientList) client.postMessage({ type: 'precache-failed' });
            })
            .catch(() => {});
        } catch {
          /* nothing more we can do */
        }
      })
    );
  } else if (event.data && event.data.type === 'schedule-prayer-triggers') {
    // Prayer-alert reliability (v3.20): the page hands over the next 24h of
    // pre-computed adhan alerts; see the section below.
    event.waitUntil(
      schedulePrayerTriggers(event.data.plan)
        .then((result) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ type: 'schedule-prayer-triggers-result', ...result });
          }
        })
        .catch(() => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
              type: 'schedule-prayer-triggers-result',
              armed: 0,
              supported: false,
            });
          }
        })
    );
  }
});

/* ------------------------------------------------------------------ */
/* Prayer-alert reliability (v3.20)                                    */
/* ------------------------------------------------------------------ */
// Until now, adhan alerts only fired while a tab was open. The page (via
// js/alertTriggers.js, a pure ES module) computes the next 24h of alerts
// and posts them here. This worker stores the plan in IndexedDB, arms each
// entry as a browser-level timestamped notification trigger where the
// Notification Triggers API exists (fires even with every tab closed),
// cancels stale arms, and — where periodic background sync is available —
// shows any alert whose time passed while nothing was open.
//
// NOTE: sw.js is a CLASSIC worker and cannot import ES modules. The three
// small helpers below are deliberate inline mirrors of js/alertTriggers.js
// (sanitizePlan / selectDueAlerts / pruneFiredMap); tests/alertTriggers.test.js
// asserts these mirror markers exist so the two cannot silently diverge.

const ALERT_DB = 'nur-alerts';
const ALERT_DB_VERSION = 1;
const ALERT_PLAN_KEY = 'plan';
const ALERT_FIRED_KEY = 'fired';
const ALERT_TAG_PREFIX = 'prayer-';
const ALERT_MAX_LATENESS_MS = 15 * 60 * 1000;

function alertDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ALERT_DB, ALERT_DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // (review v3.21): an upgrade blocked by a lingering old-generation
    // connection previously hung the promise forever — fail it instead.
    req.onblocked = () => reject(new Error('alert DB open blocked'));
  });
}

async function alertKvGet(key) {
  const db = await alertDb();
  // (review v3.21): connections were leaked (never closed) — close them.
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function alertKvPut(key, value) {
  const db = await alertDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// --- inline mirrors of js/alertTriggers.js (keep in sync; test-enforced) ---
function alertCleanStr(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function sanitizePlan(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const ts = Number(e.ts);
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const key = alertCleanStr(e.key, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      kind: e.kind === 'prayer' ? 'prayer' : '',
      name: alertCleanStr(e.name, 30),
      ts,
      title: alertCleanStr(e.title, 300),
      body: alertCleanStr(e.body, 300),
      tag: alertCleanStr(e.tag, 60),
    });
    if (out.length >= 16) break;
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

function selectDueAlerts(plan, nowMs, firedMap, maxLatenessMs = ALERT_MAX_LATENESS_MS) {
  if (!Array.isArray(plan)) return [];
  const fired = firedMap && typeof firedMap === 'object' ? firedMap : {};
  return plan.filter(
    (e) =>
      e &&
      Number.isFinite(e.ts) &&
      e.ts <= nowMs &&
      nowMs - e.ts <= maxLatenessMs &&
      !Object.prototype.hasOwnProperty.call(fired, e.key)
  );
}

function pruneFiredMap(firedMap, nowMs, maxAgeMs = 48 * 60 * 60 * 1000, maxKeys = 200) {
  const fired = firedMap && typeof firedMap === 'object' ? firedMap : {};
  const cutoff = nowMs - maxAgeMs;
  const out = {};
  for (const k of Object.keys(fired)) {
    const at = Number(fired[k]);
    if (Number.isFinite(at) && at >= cutoff) out[k] = at;
  }
  // (review v3.21): the mirror omitted the module's 200-key cap — a drift
  // the marker-grep test could never see. Body now matches js/alertTriggers.js.
  const keys = Object.keys(out).sort((a, b) => out[a] - out[b]);
  while (keys.length > maxKeys) delete out[keys.shift()];
  return out;
}
// --------------------------------------------------------------------------

function alertTriggersSupported() {
  try {
    return (
      typeof Notification !== 'undefined' &&
      'showTrigger' in Notification.prototype &&
      typeof self.TimestampTrigger === 'function'
    );
  } catch {
    return false;
  }
}

async function showPrayerAlert(entry) {
  const options = {
    body: entry.body || '',
    tag: entry.tag || entry.key,
    icon: 'assets/icons/icon-192.png',
    data: { key: entry.key },
  };
  if (alertTriggersSupported()) options.showTrigger = new TimestampTrigger(entry.ts);
  await self.registration.showNotification(entry.title || '', options);
}

async function schedulePrayerTriggers(plan) {
  const clean = sanitizePlan(plan);
  try {
    await alertKvPut(ALERT_PLAN_KEY, { plan: clean, savedAt: Date.now() });
  } catch (err) {
    console.warn('[sw] alert plan persist failed', err);
  }

  let supported = false;
  let armed = 0;
  try {
    supported = alertTriggersSupported();
  } catch {
    supported = false;
  }

  if (supported) {
    // Cancel previously armed triggers that are no longer in the plan
    // (toggled-off prayer, revoked permission, replaced plan). includeTriggered
    // only exists on browsers with the triggers API; degrade quietly.
    const keepTags = new Set(clean.map((e) => e.tag || e.key).filter(Boolean));
    let existing = [];
    try {
      existing = await self.registration.getNotifications({ includeTriggered: true });
    } catch {
      try {
        existing = await self.registration.getNotifications();
      } catch {
        existing = [];
      }
    }
    for (const n of existing) {
      if (typeof n.tag === 'string' && n.tag.startsWith(ALERT_TAG_PREFIX) && !keepTags.has(n.tag)) {
        try {
          n.close();
        } catch {
          /* already gone */
        }
      }
    }
    for (const entry of clean) {
      try {
        await showPrayerAlert(entry);
        armed += 1;
      } catch (err) {
        console.warn('[sw] alert trigger arm failed', err);
      }
    }
  }

  return { armed, supported };
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'prayer-alert-sync') return;
  event.waitUntil(handlePrayerAlertSync());
});

// (review v3.21): tapping a worker-shown prayer alert used to do nothing —
// focus the running app if any window is open, otherwise open it.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/');
    })()
  );
});

// Best-effort catch-up for browsers WITHOUT notification triggers: when the
// browser grants a periodic sync (installed PWA, Chromium, its own cadence),
// show any planned alert whose time passed while nothing was open — never
// more than ALERT_MAX_LATENESS_MS late, and never the same alert twice.
async function handlePrayerAlertSync() {
  let stored;
  try {
    stored = await alertKvGet(ALERT_PLAN_KEY);
  } catch {
    return;
  }
  const now = Date.now();
  // (review v3.21): a plan saved more than ~its own 24h window ago is stale
  // — the page would have re-armed on any open. Never show from it.
  if (!stored || !Number.isFinite(stored.savedAt) || now - stored.savedAt > 30 * 60 * 60 * 1000) {
    return;
  }
  const plan = sanitizePlan(stored && stored.plan);
  if (!plan.length) return;
  let fired = {};
  try {
    fired = (await alertKvGet(ALERT_FIRED_KEY)) || {};
  } catch {
    fired = {};
  }
  const due = selectDueAlerts(plan, now, fired);
  let shown = false;
  for (const entry of due) {
    try {
      await showPrayerAlert(entry);
      fired[entry.key] = now;
      shown = true;
    } catch {
      /* notification permission may have been revoked mid-flight */
    }
  }
  if (shown) {
    try {
      await alertKvPut(ALERT_FIRED_KEY, pruneFiredMap(fired, now));
    } catch {
      /* a re-show later is better than a crash here */
    }
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    migrateDataCache()
      .then(() => caches.keys())
      .then(async (keys) => {
        // (v4.3) never delete the old shell cache when the new one is
        // incomplete: a partially-filled shell (a mid-waiting-worker retry,
        // a crashed addAll before the rethrow guard existed) must not leave
        // BOTH shells broken. Old caches are only cleaned up once the new
        // shell is provably complete; leftovers are swept by the next
        // successful activate.
        let newShellCount = -1;
        try {
          const shell = await caches.open(SHELL_CACHE);
          newShellCount = (await shell.keys()).length;
        } catch {
          newShellCount = -1;
        }
        const shellComplete = newShellCount >= APP_SHELL.length;
        if (!shellComplete) {
          console.warn(
            '[sw] new shell incomplete (' +
              newShellCount +
              '/' +
              APP_SHELL.length +
              ') — keeping old caches'
          );
          return;
        }
        await Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * A release must not delete the person's offline content. Every previous
 * version wiped `*-data` wholesale on activate — downloaded Sahih books
 * (13MB Bukhari), visited surahs, tafsir editions — forcing a full re-fetch
 * on bad connections, directly contradicting the "cached offline forever"
 * promise. Before deleting old caches, copy their data entries forward into
 * the new DATA_CACHE (SWR refreshes content freshness afterwards).
 */
async function migrateDataCache() {
  let keys;
  try {
    keys = await caches.keys();
  } catch {
    return;
  }
  const oldDataCaches = keys.filter((k) => k.endsWith('-data') && k !== DATA_CACHE);
  if (!oldDataCaches.length) return;
  let target;
  try {
    target = await caches.open(DATA_CACHE);
  } catch {
    return;
  }
  for (const key of oldDataCaches) {
    let old;
    try {
      old = await caches.open(key);
    } catch {
      continue;
    }
    let requests;
    try {
      requests = await old.keys();
    } catch {
      continue;
    }
    for (const req of requests) {
      try {
        const response = await old.match(req);
        if (response) await target.put(req, response);
      } catch {
        /* quota or eviction — keep as many entries as fit */
      }
    }
  }
}

/**
 * cache.put with quota awareness: on failure evict the least-recently-
 * SERVED third of the cache and retry once. A rejected put used to discard
 * a response that had just arrived successfully over the network, handing
 * the caller the {error:'offline'} stub instead of real data.
 * (v4.3) eviction order is now honest LRU-ish: serving a cached entry
 * re-inserts it (staleWhileRevalidate below), so cache.keys() insertion
 * order tracks recency — the oldest third is the least-recently-used
 * third, and the surah the person is actively reading (always the most
 * recently served) is never the eviction victim.
 */
async function putWithEviction(cache, request, response) {
  try {
    await cache.put(request, response);
    return;
  } catch {
    /* fall through to eviction */
  }
  try {
    const keys = await cache.keys();
    const evict = keys.slice(0, Math.max(1, Math.ceil(keys.length / 3)));
    await Promise.all(evict.map((k) => cache.delete(k)));
    await cache.put(request, response);
  } catch {
    /* genuinely out of quota — serve without caching */
  }
}

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
    event.respondWith(staleWhileRevalidate(request, event));
    return;
  }

  if (request.mode === 'navigate') {
    // Cached shell first, refreshed in the background: a cold launch on a
    // slow connection previously blocked on the network timeout even with
    // the entire shell precached — the opposite of offline-first.
    event.respondWith(cachedShellNavigation(request, event));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cachedShellNavigation(request, event) {
  const cached = await caches.match('index.html');
  const networkFetch = fetch(request)
    .then(async (response) => {
      // (v4.3) status 200 only: a 206 partial (media-style range request)
      // is `ok:true` but cache.put() rejects it with a TypeError.
      if (response && response.status === 200) {
        try {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put('index.html', response.clone());
        } catch {
          /* background refresh is best-effort */
        }
      }
      return response;
    })
    .catch(() => null);
  if (cached) {
    // (v4.3) the background refresh must outlive respondWith — without
    // waitUntil the worker can be terminated before the put lands.
    if (event) event.waitUntil(networkFetch);
    return cached;
  }
  const fresh = await networkFetch;
  return fresh || (await caches.match('offline.html')) || Response.error();
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // (v4.3) status 200 only before caching: 206 responses are ok:true but
    // un-cacheable (put throws); the floating put is also awaited-errored
    // now instead of silently rejecting.
    if (response && response.status === 200) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone()).catch(() => {
        /* best-effort fill; quota errors surface via putWithEviction paths */
      });
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  if (cached && event) {
    // (v4.3) refresh recency on every hit: delete + re-insert moves the
    // entry to the end of cache.keys() insertion order, turning the
    // eviction policy into least-recently-SERVED (see putWithEviction).
    // Clone before handing the original to the browser.
    try {
      const copy = cached.clone();
      event.waitUntil(
        cache
          .delete(request)
          .then(() => cache.put(request, copy))
          .catch(() => {})
      );
    } catch {
      /* clone/put is best-effort freshness bookkeeping */
    }
  }
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        // Store the fresh copy WITHOUT delaying the response: the put rides
        // waitUntil (legal here — respondWith is still awaiting this
        // promise, so the event is active). If the event has already
        // settled (cache-hit path), the put degrades to best-effort.
        const revalidate = putWithEviction(cache, request, response.clone()).catch(() => {});
        try {
          if (event) event.waitUntil(revalidate);
        } catch {
          /* event settled — untracked best-effort refresh */
        }
      }
      return response;
    })
    .catch(() => null);

  return (
    cached ||
    (await networkFetch) ||
    // (v4.3) 503, not 200: the old 200-OK stub slipped through fetchJSON's
    // !res.ok guard and poisoned every error+Retry path — {error:'offline'}
    // got cached as real data, rendered as empty content, and the Retry
    // affordance built in v4.1 never appeared. A 503 makes fetchJSON throw,
    // which is exactly the path the loadErrors machinery was built for.
    new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      statusText: 'Offline',
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
    if (response && response.status === 200) {
      await putWithEviction(cache, request, response.clone());
      return response;
    }
    return response;
  } catch {
    // (v4.3) 503 stub — same rationale as staleWhileRevalidate.
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
