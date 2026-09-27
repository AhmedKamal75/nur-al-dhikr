/**
 * app/offlineJobs.js — offline-library batch downloads (v5.3.0).
 *
 * One tap warms the service worker's data cache for every on-demand
 * corpus: each URL goes through fetchJSON (validating, SW-cached) and
 * its body is discarded — state is never loaded, so bulk-fetching 50MB
 * of hadith costs bandwidth and disk, not memory. 3-wide pool (the
 * audio batch's proven shape), cancellable, quota-preflighted, with
 * throttled progress dispatches and per-group completion persisted to
 * settings.offline (explicit downloads only; casual browsing warms the
 * same cache untracked).
 */

import { fetchJSON } from './net.js';
import { actions, store } from '../core/state.js';
import { t } from '../core/i18n.js';
import { showToast } from '../ui/toast.js';
import { rt } from './rt.js';
import { audioCacheUsage } from '../services/audioStore.js';
import {
  OFFLINE_GROUPS,
  quranUrls,
  translationUrls,
  mushafUrls,
  wordsUrls,
  hadithUrls,
  tafsirUrls,
} from '../domain/offline.js';

const POOL_WIDTH = 3;
const PROGRESS_EVERY_FILES = 10;
const PROGRESS_EVERY_MS = 500;

/**
 * The only two groups that are small enough to ship as the app's baseline
 * promise: ~2.7 MB gzipped for the whole Qur'an text plus all 604 mushaf
 * pages. Translations, hadith, tafsir and word-study are 10-50x larger and
 * stay opt-in on the Offline screen — that choice is honest there, but it
 * made the About line "works offline" false for the corpus people actually
 * recite from.
 */
const ESSENTIAL_GROUPS = Object.freeze(['quran', 'mushaf']);

/** Test-only view of the list, so a test can assert on it without guessing. */
export const ESSENTIAL_GROUPS_TEST = ESSENTIAL_GROUPS;

/**
 * How long after boot the essentials batch may start. A floor, not a timeout:
 * a background download of ~2.7 MB across ~1,400 requests has no business
 * competing with the library load or the reader's first tap.
 */
export const ESSENTIALS_DEFER_MS = 15000;

/**
 * True once a group is recorded fully downloaded (measured, not requested).
 *
 * Strict equality on purpose: a row claiming MORE files than the group has
 * is a corrupt row, and reading it as "downloaded" would strand the reader
 * behind a permanently false Offline row. The engine can only ever write
 * done <= total, so this costs nothing and refuses to believe a liar.
 */
function groupComplete(settings, id) {
  const row = settings?.offline?.[id];
  if (!row) return false;
  const total = Number(row.total);
  const done = Number(row.done);
  return Number.isFinite(total) && total > 0 && done === total;
}

/**
 * Should the essentials batch start right now? Every condition is a
 * reason NOT to spend a reader's bandwidth unasked, so this returns a
 * reason string for the caller to log rather than a bare boolean.
 */
export function essentialsAutoBlocker(settings, online) {
  if (settings?.offlineEssentialsAuto === false) return 'opted-out';
  if (!online) return 'offline';
  if (ESSENTIAL_GROUPS.every((id) => groupComplete(settings, id))) return 'complete';
  // A batch already in flight owns the cache and the progress row.
  if (settings === null) return 'no-settings';
  // Respect an explicit data-saver. This is the one signal a reader on a
  // metered connection has given us, and it outranks our own claim.
  const conn = typeof navigator !== 'undefined' ? navigator.connection : null;
  if (conn?.saveData === true) return 'save-data';
  if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return 'slow-connection';
  return null;
}

/**
 * Warm the essential corpus in the background once the app is usable.
 *
 * Deliberately NOT part of the service worker's install-time addAll: that
 * call is all-or-nothing, so folding 1,436 corpus files into it would let
 * one flaky fetch fail the entire shell install. This reuses the same
 * tolerant, resumable, per-group-counted engine as a manual download, so
 * the Offline screen's "downloaded" rows are measured the same way whether
 * the batch was tapped or automatic.
 */
export function maybeAutoDownloadEssentials() {
  const state = store.getState();
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const blocker = essentialsAutoBlocker(state.settings, online);
  if (blocker) return blocker;
  if (state.offlineJobs?.running) return 'already-running';
  // Never compete with first paint, the library download, or the reader's
  // first tap. (v5.17.17) This floor is 15s, not ~1s, and the e2e suite is
  // why: a 1,436-request batch kicked off during boot made three unrelated
  // specs time out, because every fresh context was still saturating the
  // static server while the test wanted the main thread. Starting it right
  // after the home screen settles is just as automatic for a reader and
  // costs them nothing they were using.
  const idle = globalThis.requestIdleCallback;
  const start = () => {
    try {
      const again = essentialsAutoBlocker(store.getState().settings, online);
      if (again || store.getState().offlineJobs?.running) return;
      void runOfflineBatch([...ESSENTIAL_GROUPS]);
    } catch (err) {
      console.error('[offline] essentials auto-download failed to start', err);
    }
  };
  setTimeout(() => {
    if (typeof idle === 'function') idle(start, { timeout: 5000 });
    else start();
  }, ESSENTIALS_DEFER_MS);
  return 'started';
}

function builders() {
  return {
    quran: () => quranUrls(),
    translations: () => translationUrls(),
    mushaf: () => mushafUrls(),
    words: () => wordsUrls(),
    hadith: async () => (await hadithUrls(fetchJSON)).urls,
    tafsir: async () => (await tafsirUrls(fetchJSON)).urls,
  };
}

function setProgress(patch) {
  store.dispatch(actions.setOfflineProgress({ ...store.getState().offlineJobs, ...patch }));
}

/** Storage preflight: refuse to start when the device can't hold the rest. */
export async function checkOfflineRoom(groupIds, lang) {
  let estimate = null;
  try {
    estimate = (await navigator.storage?.estimate?.()) || null;
  } catch {
    estimate = null;
  }
  if (!estimate || !Number.isFinite(estimate.quota)) return { ok: true, estimate };
  const compressed = store.getState().settings?.compressedDownloads === true;
  const needMB = OFFLINE_GROUPS.filter((g) => groupIds.includes(g.id)).reduce(
    (n, g) => n + (compressed ? g.gzMB : g.sizeMB),
    0
  );
  const freeMB = (estimate.quota - (estimate.usage || 0)) / (1024 * 1024);
  if (freeMB < needMB + 100) {
    showToast(t('offline.lowStorage', lang), { assertive: true });
    return { ok: false, estimate };
  }
  return { ok: true, estimate };
}

export function stopOfflineBatch() {
  rt.offlineBatchCancelled = true;
}

/**
 * (v5.3.0) wipe the SW data cache (both encodings) + forget measured
 * completion. Used when the storage-mode toggle flips: the old-encoding
 * bytes would otherwise sit beside the new ones, costing MORE storage.
 * Audio (IndexedDB) and the shell precache are untouched.
 */
export async function clearTextCache() {
  try {
    if (typeof caches === 'undefined') return 0;
    const keys = await caches.keys();
    let n = 0;
    for (const k of keys) {
      if (/nur-al-dhikr.*-data$/.test(k) && (await caches.delete(k))) n += 1;
    }
    return n;
  } catch {
    return 0;
  }
}

/**
 * (v5.17.2, audit F-04) explicit study-data budget action: drop text-corpus
 * downloads + measured rows, report the before/after estimate for the
 * storage panel. Audio (IndexedDB) and settings are untouched.
 */
export async function clearStudyData() {
  let before = null;
  try {
    before = (await navigator.storage?.estimate?.()) || null;
  } catch {
    before = null;
  }
  const cachesCleared = await clearTextCache();
  store.dispatch(actions.updateSettings({ offline: {} }));
  setProgress({ quota: null });
  await ensureOfflineQuota();
  return { cachesCleared, before };
}

/** Refresh the storage meter (called when the Offline view opens). */
export async function ensureOfflineQuota() {
  try {
    const estimate = (await navigator.storage?.estimate?.()) || null;
    if (!estimate) return;
    const quota = {
      usage: Number(estimate.usage) || 0,
      quota: Number(estimate.quota) || 0,
    };
    // (v5.2.75, PERF-02) the audio-cache budget rides the same meter so
    // GB-scale reciter packs stay visible next to the device numbers.
    const audioCache = await audioCacheUsage();
    const prev = store.getState().offlineJobs;
    if (
      prev?.quota?.usage !== quota.usage ||
      prev?.quota?.quota !== quota.quota ||
      JSON.stringify(prev?.audioCache || null) !== JSON.stringify(audioCache)
    ) {
      setProgress({ quota, audioCache });
    }
  } catch {
    /* meter is best-effort */
  }
}

export async function runOfflineBatch(groupIds) {
  const lang = store.getState().settings.language;
  if (store.getState().offlineJobs?.running) return;
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
    showToast(t('offline.needOnline', lang), { assertive: true });
    return;
  }
  const ids = OFFLINE_GROUPS.map((g) => g.id).filter((id) => groupIds.includes(id));
  if (!ids.length) return;
  const room = await checkOfflineRoom(ids, lang);
  if (!room.ok) return;

  rt.offlineBatchCancelled = false;
  const build = builders();
  // Index-first groups resolve their URL lists up front (one catalog
  // fetch each); a failed index fails just that group, not the batch.
  const lists = [];
  for (const id of ids) {
    try {
      lists.push({ id, urls: await build[id]() });
    } catch (err) {
      console.error('[offline] failed to list group', id, err);
      lists.push({ id, urls: [], listFailed: true });
    }
    if (rt.offlineBatchCancelled) break;
  }
  const total = lists.reduce((n, l) => n + l.urls.length, 0);
  setProgress({ running: true, group: null, done: 0, total, failed: 0, quota: null });
  showToast(t('offline.started', lang, { n: total }));

  let done = 0;
  let failed = 0;
  let lastFlush = 0;
  const flush = (force, group) => {
    const now = Date.now();
    if (
      !force &&
      done - (flush.last || 0) < PROGRESS_EVERY_FILES &&
      now - lastFlush < PROGRESS_EVERY_MS
    ) {
      return;
    }
    flush.last = done;
    lastFlush = now;
    setProgress({ running: true, group, done, total, failed });
  };
  const okByGroup = {};
  const failByGroup = {};
  const queue = [];
  for (const l of lists) for (const url of l.urls) queue.push({ group: l.id, url });

  const worker = async () => {
    while (queue.length && !rt.offlineBatchCancelled) {
      const job = queue.shift();
      try {
        await fetchJSON(job.url);
        done += 1;
        okByGroup[job.group] = (okByGroup[job.group] || 0) + 1;
      } catch {
        failed += 1;
        failByGroup[job.group] = (failByGroup[job.group] || 0) + 1;
      }
      flush(false, job.group);
    }
  };
  try {
    await Promise.all(Array.from({ length: POOL_WIDTH }, () => worker()));
  } finally {
    const cancelled = rt.offlineBatchCancelled;
    rt.offlineBatchCancelled = false;
    // Persist per-group completion (measured truth overwrites any stale row).
    const prev = store.getState().settings.offline || {};
    const next = { ...prev };
    const at = Date.now();
    for (const l of lists) {
      const groupTotal = l.urls.length;
      const ok = okByGroup[l.id] || 0;
      if (groupTotal > 0) next[l.id] = { done: ok, total: groupTotal, at };
    }
    store.batch(() => {
      store.dispatch(actions.updateSettings({ offline: next }));
      store.dispatch(
        actions.setOfflineProgress({ running: false, group: null, done, total, failed })
      );
    });
    showToast(
      t(
        cancelled ? 'offline.cancelled' : failed ? 'offline.doneWithErrors' : 'offline.done',
        lang,
        {
          n: done,
        }
      ),
      { assertive: failed > 0 }
    );
  }
}
