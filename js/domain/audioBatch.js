/**
 * domain/audioBatch.js — (NF03-RESUME) pure batch-queue logic.
 *
 * No DOM, no store, no IDB: the persistence edge lives in
 * services/audioStore.js (batchQueue object store) and the orchestration
 * in app/handlers/audio.js. Everything here is a pure function over
 * plain data, trivially unit-testable.
 */

const validSurah = (n) => Number.isFinite(n) && n >= 1 && n <= 114;

function cleanList(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(Number).filter(validSurah))].sort((a, b) => a - b);
}

/**
 * Truly-pending surahs: queued, minus already-downloaded files, minus
 * learned-missing surahs (a 404 is permanent classification, never work).
 * `downloadedKeys` are audioKey strings (`<moshaf>:<surah>`);
 * `missing` is an iterable of surah numbers for the same moshaf.
 */
export function reconcilePending(queued, moshafId, downloadedKeys, missing) {
  const have = new Set();
  if (downloadedKeys && typeof downloadedKeys === 'object') {
    for (const k of downloadedKeys) {
      const m = /^(.+):(\d+)$/.exec(String(k));
      if (m && m[1] === moshafId) have.add(Number(m[2]));
    }
  }
  const gone = new Set((missing || []).map(Number).filter(validSurah));
  return cleanList(queued).filter((n) => !have.has(n) && !gone.has(n));
}

/** Queue remainder after one surah finished (success or permanent miss). */
export function remainingAfter(queue, finishedSurah) {
  const done = Number(finishedSurah);
  return cleanList(queue).filter((n) => n !== done);
}

/** True when there is resumable work left after reconciliation. */
export function hasResumableWork(pending) {
  return Array.isArray(pending) && pending.length > 0;
}
