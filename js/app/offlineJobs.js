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

export function offlineTotals() {
  return OFFLINE_GROUPS.map((g) => ({ ...g }));
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

/** Refresh the storage meter (called when the Offline view opens). */
export async function ensureOfflineQuota() {
  try {
    const estimate = (await navigator.storage?.estimate?.()) || null;
    if (!estimate) return;
    const quota = {
      usage: Number(estimate.usage) || 0,
      quota: Number(estimate.quota) || 0,
    };
    const prev = store.getState().offlineJobs?.quota;
    if (prev?.usage !== quota.usage || prev?.quota !== quota.quota) {
      setProgress({ quota });
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
