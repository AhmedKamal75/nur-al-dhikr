/**
 * hifz.js
 * Hifz (memorization) support, v3.17. Two halves, both DOM-free:
 *
 *  1. A lightweight spaced-repetition scheduler over per-surah records.
 *     A surah is marked "memorized" once, then resurfaces for review on a
 *     growing interval (1, 3, 7, 14, 30, 60, 120 days). "Recalled well"
 *     climbs the ladder; "struggled" drops back to a 1-day interval. The
 *     records are persisted; due lists and khatma-based suggestions are
 *     computed on demand — no background timers, nothing at boot.
 *
 *  2. The memorize-mode cloze renderer for the classic reader: hide every
 *     word (tap-to-reveal blanks sized to the word's length) or hide the
 *     whole ayah (the translation stays visible as the recall prompt).
 *     Text is always escaped — corpus text is data, never markup.
 *
 * Deliberate residual: "hide-line" belongs to the Mushaf's line layout,
 * which is flowing text today — recorded in TODO.md, not silently dropped.
 */

import { escapeHTML, dateKey, addDays } from '../core/utils.js';

/** Growing review intervals, in days. Index = record level. */
export const HIFZ_INTERVALS = [1, 3, 7, 14, 30, 60, 120];

export const HIFZ_LEVELS = ['word', 'ayah'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeHifzLevel(level) {
  return HIFZ_LEVELS.includes(level) ? level : 'word';
}

/** ISO day + N days, as an ISO day (noon-anchored to dodge DST edges). */
export function plusDays(iso, n) {
  if (!ISO_DATE.test(String(iso))) return null;
  return dateKey(addDays(new Date(`${iso}T12:00:00`), n));
}

/** Whole days between two ISO days (b - a). Non-negative on invalid input. */
export function diffDays(a, b) {
  if (!ISO_DATE.test(String(a)) || !ISO_DATE.test(String(b))) return 0;
  const ms = new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * Sanitize a restored/imported hifzRecords map. Only well-formed
 * {surah: record} entries survive; everything hostile is dropped.
 */
export function sanitizeHifzRecords(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!/^\d{1,3}$/.test(k)) continue; // plain surah-number keys only
    const n = Number(k);
    if (!(n >= 1 && n <= 114)) continue;
    const r = v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    if (!r) continue;
    const iso = (x) => (typeof x === 'string' && ISO_DATE.test(x) ? x : null);
    const since = iso(r.since);
    const due = iso(r.due) ?? since;
    if (!due) continue; // a record with no usable date is unusable
    out[k] = {
      level: Math.min(HIFZ_INTERVALS.length - 1, Math.max(0, Math.floor(Number(r.level)) || 0)),
      due,
      since: since ?? due,
      lastReviewed: iso(r.lastReviewed),
      reviews: Math.max(0, Math.floor(Number(r.reviews)) || 0),
      lapses: Math.max(0, Math.floor(Number(r.lapses)) || 0),
    };
  }
  return out;
}

/** Mark a surah memorized: level 0, first review due tomorrow. Re-marking
 *  deliberately restarts the ladder (a fresh memorization is a fresh ladder). */
export function markMemorized(records, surah, today = dateKey()) {
  const s = Math.floor(Number(surah));
  if (!(s >= 1 && s <= 114) || !ISO_DATE.test(String(today))) return records ?? {};
  return {
    ...(records ?? {}),
    [String(s)]: {
      level: 0,
      since: today,
      lastReviewed: today,
      due: plusDays(today, 1),
      reviews: 0,
      lapses: 0,
    },
  };
}

/** Log a review. grade 'easy' climbs the interval ladder; 'again' resets to
 *  the 1-day interval and counts a lapse. Unknown grade / unknown surah →
 *  records unchanged (pure no-op, never throws). */
export function logReview(records, surah, grade, today = dateKey()) {
  const key = String(Math.floor(Number(surah)));
  const rec = (records ?? {})[key];
  if (!rec || !ISO_DATE.test(String(today))) return records ?? {};
  if (grade !== 'easy' && grade !== 'again') return records;
  const level = grade === 'easy' ? Math.min(rec.level + 1, HIFZ_INTERVALS.length - 1) : 0;
  return {
    ...records,
    [key]: {
      ...rec,
      level,
      lastReviewed: today,
      due: plusDays(today, HIFZ_INTERVALS[level]),
      reviews: rec.reviews + 1,
      lapses: rec.lapses + (grade === 'again' ? 1 : 0),
    },
  };
}

/** Surahs due for review on/before `today`, oldest due first. Defensive
 *  against raw/hostile maps — a garbage entry degrades to "not due". */
export function dueSurahs(records, today = dateKey()) {
  return Object.entries(records ?? {})
    .filter(([, r]) => r && typeof r === 'object' && !Array.isArray(r) && r.due <= today)
    .map(([k, r]) => ({
      surah: Number(k),
      level: r.level,
      due: r.due,
      overdue: diffDays(r.due, today),
    }))
    .sort((a, b) => a.due - b.due || a.surah - b.surah);
}

export function countMemorized(records) {
  return Object.keys(records ?? {}).length;
}

/** Mushaf page range covering a whole surah, from the ayah→page index. */
export function surahPageRange(ayahPages, surah, ayahCount) {
  if (!ayahPages || typeof ayahPages !== 'object') return null;
  const s = Math.floor(Number(surah));
  const n = Math.floor(Number(ayahCount));
  if (!(s >= 1 && s <= 114) || !(n >= 1)) return null;
  let lo = null;
  let hi = null;
  for (let a = 1; a <= n; a++) {
    const p = ayahPages[`${s}:${a}`];
    if (!Number.isInteger(p) || p < 1 || p > 604) continue;
    lo = lo == null ? p : Math.min(lo, p);
    hi = hi == null ? p : Math.max(hi, p);
  }
  return lo == null ? null : [lo, hi];
}

/**
 * Khatma-reuse hook: surahs the person has fully READ (every page in their
 * range sits in mushafPagesRead) but not yet marked memorized — the natural
 * "ready to memorize" suggestions, computed from existing progress data.
 */
export function suggestFromKhatma(records, pagesRead, ayahPages, surahMetaList, limit = 3) {
  const read = pagesRead && typeof pagesRead === 'object' ? pagesRead : {};
  const metas = Array.isArray(surahMetaList) ? surahMetaList : [];
  const out = [];
  for (const meta of metas) {
    const s = Math.floor(Number(meta?.number));
    if (!(s >= 1 && s <= 114)) continue;
    if ((records ?? {})[String(s)]) continue; // already memorized
    const range = surahPageRange(ayahPages, s, meta?.ayahCount);
    if (!range) continue;
    const [lo, hi] = range;
    let fullyRead = true;
    for (let p = lo; p <= hi; p++) {
      if (!read[String(p)]) {
        fullyRead = false;
        break;
      }
    }
    if (fullyRead) {
      out.push({ surah: s, startPage: lo, endPage: hi });
      if (out.length >= limit) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Memorize-mode cloze rendering                                       */
/* ------------------------------------------------------------------ */

export function clozeWords(text) {
  return String(text ?? '')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Render one ayah for memorize mode. `revealed` mirrors the session slice:
 * { all: boolean, words: { [index]: true } } | undefined. Whole-ayah level
 * with the ayah still hidden renders a single reveal button (the word count
 * is the only hint); word level renders per-word blanks sized to the word
 * via `--hifz-w` so the page keeps its shape while the letters wait.
 * `labels.reveal` is a pre-localized aria label supplied by the caller.
 */
export function clozeAyahHTML({ text, level, ayah, revealed, labels }) {
  const n = Math.floor(Number(ayah));
  const safeAyah = Number.isFinite(n) && n >= 1 ? n : 0;
  const words = clozeWords(text);
  const revealLabel = escapeHTML(labels?.reveal ?? 'reveal');

  if (normalizeHifzLevel(level) === 'ayah') {
    if (revealed?.all) {
      return words.map((w) => escapeHTML(w)).join(' ');
    }
    return `<button type="button" class="hifz-ayah-blank" data-action="hifz-reveal" data-ayah="${safeAyah}" aria-label="${revealLabel}">
      <span class="hifz-ayah-blank__dots" aria-hidden="true">\u2022 \u2022 \u2022</span>
      <span class="hifz-ayah-blank__hint" dir="ltr">${words.length}</span>
    </button>`;
  }

  // word level — a revealed whole ayah shows everything; otherwise only
  // individually revealed words show.
  return words
    .map((w, i) => {
      if (revealed?.all || revealed?.words?.[i]) {
        return `<span class="hifz-word">${escapeHTML(w)}</span>`;
      }
      return `<button type="button" class="hifz-word-blank" style="--hifz-w:${Math.max(2, w.length)}ch" data-action="hifz-reveal" data-ayah="${safeAyah}" data-word="${i}" aria-label="${revealLabel}"></button>`;
    })
    .join(' ');
}
