/**
 * core/state — package root docs live in core/state.js (the facade).
 */

import { MUSHAF_PAGE_COUNT } from '../config.js';
import { cleanObject, clone, isSafeKey } from '../utils.js';
import { isReturningUser } from '../../domain/onboarding.js';
import { defaultTajweedPracticeStats } from '../../domain/tajweedPractice.js';
import { sanitizeHifzRecords } from '../../domain/hifz.js';
import { sanitizeFastingPrefs } from '../../domain/fasting.js';
import { sanitizeSadaqahLog } from '../../domain/worship.js';
import { sanitizeSunnahLog } from '../../domain/sunnah.js';
import { sanitizeQadaLog } from '../../domain/qada.js';
import { sanitizeLocationProfiles } from '../../domain/locations.js';
import { sanitizeDuaJournal, sanitizeReflections } from '../../domain/duaJournal.js';
import { sanitizeHijriDayLog } from '../../domain/ramadanPlanner.js';
import { sanitizeNudgeState } from '../../domain/nudge.js';
import { PERSISTED_KEYS, pickPersisted } from './initial.js';
/**
 * Defensively coerce every array/object-shaped field of an imported (or
 * otherwise externally-supplied) payload to its expected type, dropping
 * anything that doesn't match rather than letting one bad field crash a
 * render somewhere downstream. Unlike normalizeCustomContentMap (which
 * repairs content item-by-item), this operates on the coarse top-level
 * shape — good enough to prevent crashes, not a full schema pass.
 */
// (review v3.21): the continue-reading bookmark is rendered into HTML
// attributes and hrefs — a canonical surah-number string (1..114) or nothing.
function validSurahBookmarkId(value) {
  const s = String(value ?? '').trim();
  const n = /^\d{1,3}$/.test(s) ? Number(s) : 0;
  return n >= 1 && n <= 114 ? String(n) : null;
}

// (review v3.21): session slices must never ride in through a backup —
// they are runtime-only state (caches, modals, player, arm status).
// (v4.2) enforcement moved from a delete-after-spread blacklist to the
// PERSISTED_KEYS ALLOWLIST at the top of sanitizeRestoredPayload: only
// persisted keys may ever enter live state, so ephemeral slices (player,
// install, hifzSession, hadith/quran caches, …) are dropped by omission.

/**
 * Personal hadith notes from a backup: same "<bookId>:<n>" key shape as
 * bookmarks (S3: the book half must pass isSafeKey — the regex alone still
 * matches `__proto__`), plain text values capped at 2000 chars, blank
 * texts dropped, whole map capped at 1000 entries.
 */
function cleanHadithNotes(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const k of Object.keys(src)) {
    if (Object.keys(out).length >= 1000) break;
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    const parts = String(k).split(':');
    if (parts.length !== 2 || !isSafeKey(parts[0]) || !/^[A-Za-z0-9_-]{1,40}:\d{1,6}$/.test(k))
      continue;
    const v = src[k];
    if (typeof v !== 'string' || !v.trim()) continue;
    out[k] = v.slice(0, 2000);
  }
  return cleanObject(out);
}

/**
 * Recitation queues from a backup: at most 50 lists, safe-key ids,
 * trimmed names, at most 200 range items each with surah 1–114 and
 * positive from/to ints. Anything else drops silently.
 */
function cleanPlaylists(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const p of raw.slice(0, 50)) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) continue;
    if (typeof p.id !== 'string' || !isSafeKey(p.id)) continue;
    if (out.some((q) => q.id === p.id)) continue;
    const items = [];
    if (Array.isArray(p.items)) {
      for (const it of p.items.slice(0, 200)) {
        if (!it || typeof it !== 'object' || Array.isArray(it)) continue;
        const surah = Math.floor(Number(it.surah));
        if (!Number.isFinite(surah) || surah < 1 || surah > 114) continue;
        const from = Math.floor(Number(it.from));
        const to = it.to == null ? null : Math.floor(Number(it.to));
        items.push({
          surah,
          from: Number.isFinite(from) && from >= 1 ? from : 1,
          to: Number.isFinite(to) && to >= 1 ? to : null,
        });
      }
    }
    out.push({
      id: p.id,
      name: typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 80) : 'Queue',
      items,
      createdAt: Number.isFinite(p.createdAt) ? p.createdAt : null,
    });
  }
  return out;
}

/** Defensively coerce a restored/imported backup marker (v3.26). A future
 *  timestamp is junk — a backup cannot happen ahead of the device — and
 *  would make "days since backup" go negative forever. */
function sanitizeBackupMeta(raw, now = Date.now()) {
  const d = { lastBackupAt: null };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const ts = Number(raw.lastBackupAt);
  if (!Number.isFinite(ts) || ts <= 0 || ts > now) return d;
  return { lastBackupAt: Math.floor(ts) };
}

export function sanitizeRestoredPayload(payload) {
  const p = payload || {};
  const asArray = (v, fallback = []) => (Array.isArray(v) ? v : fallback);
  const asObject = (v, fallback = {}) =>
    v && typeof v === 'object' && !Array.isArray(v) ? v : fallback;
  // FIX (walkthrough v3.4 W-4): strict 24-hour HH:MM clock. Shared by the
  // reminder and calendar-note sanitizers below.
  const CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const stats = asObject(p.statistics);
  const qb = asObject(p.quranBookmark);
  const mb = asObject(p.mushafBookmark);
  const quizStats = asObject(p.quizStats);
  const ob = asObject(p.onboarding);
  const kp = asObject(p.khatmaPlan);
  const tps = asObject(p.tajweedPracticeStats, defaultTajweedPracticeStats());
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const zakatObj = asObject(p.zakat);
  const zakatPrefs = asObject(zakatObj.prefs);
  const zakatInputs = asObject(zakatObj.inputs);
  const asStr = (v, fallback = '') => (typeof v === 'string' ? v : fallback);
  const asNumStr = (v) =>
    typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' ? v : '';
  // (v4.2) per-value coercers for the slices whose VALUES are interpolated
  // into view HTML (counter pills, heatmap titles, bookmark attributes). A
  // coarse object shape-guard let a crafted backup store hostile strings in
  // numeric slots — stored XSS on the next render. Everything rendered must
  // arrive here already typed.
  const asCount = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1e9, Math.floor(n))) : fallback;
  };
  const asId = (v) => {
    const s = String(v ?? '');
    return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : null;
  };

  // (v4.2) ALLOWLIST, not blacklist: the previous `...p` spread let a
  // hostile backup carry ANY extra key (hadith.docs, quran.surahs,
  // editor: {undoStack: 5}, loadErrors, …) straight into live state,
  // defeating the "ephemeral slices never restore" guarantee. Only
  // PERSISTED_KEYS can pass; settings/customContent are sanitized
  // separately downstream (reducer RESTORE_STATE / hydrate).
  const out = {};
  for (const k of PERSISTED_KEYS) if (k in p) out[k] = p[k];
  const overrides = {
    tajweedPracticeStats: {
      totalCorrect: Number.isFinite(tps.totalCorrect) ? tps.totalCorrect : 0,
      totalAttempts: Number.isFinite(tps.totalAttempts) ? tps.totalAttempts : 0,
      currentStreak: Number.isFinite(tps.currentStreak) ? tps.currentStreak : 0,
      bestStreak: Number.isFinite(tps.bestStreak) ? tps.bestStreak : 0,
      // (S3) cleanObject, not bare asObject: an own `__proto__` key from a
      // crafted backup must not ride into live state.
      byRule: cleanObject(tps.byRule),
    },
    // Hifz records (v3.17): only well-formed per-surah entries survive —
    // hostile shapes drop silently rather than poison a later render.
    hifzRecords: sanitizeHifzRecords(p.hifzRecords),
    // Fasting prefs (v3.18): enum-guarded categories + a strict HH:MM clock.
    fastingPrefs: sanitizeFastingPrefs(p.fastingPrefs),
    // Sadaqah quick-log (v3.19): timestamped entries only.
    sadaqahLog: sanitizeSadaqahLog(p.sadaqahLog),
    // (v4.4) Sunnah prayer tracker — date-keyed boolean day maps only.
    sunnahLog: sanitizeSunnahLog(p.sunnahLog),
    // (v4.4) Qada' log — well-formed entries with a valid prayer key.
    qadaLog: sanitizeQadaLog(p.qadaLog),
    // (v4.4) Location profiles — capped, coordinate-checked.
    locationProfiles: sanitizeLocationProfiles(p.locationProfiles),
    // (v4.4) Dua journal + reflections — text entries only.
    duaJournal: sanitizeDuaJournal(p.duaJournal),
    reflections: sanitizeReflections(p.reflections),
    // (v4.4) Ramadan planner logs — hijri-keyed day-boolean maps.
    taraweehLog: sanitizeHijriDayLog(p.taraweehLog),
    itikafLog: sanitizeHijriDayLog(p.itikafLog),
    lastTenLog: sanitizeHijriDayLog(p.lastTenLog),
    // (v4.4) Multi-profile hifz: the non-active profile store gets the
    // same per-profile scrutiny as the active records.
    hifzProfileStore: (() => {
      const raw = p.hifzProfileStore;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      const out = {};
      for (const [id, records] of Object.entries(raw)) {
        // (S3) isSafeKey: `__proto__` passes the length check below.
        if (typeof id === 'string' && id.length <= 40 && isSafeKey(id))
          out[id] = sanitizeHifzRecords(records);
      }
      return out;
    })(),
    hifzActiveProfile:
      typeof p.hifzActiveProfile === 'string' && p.hifzActiveProfile.length <= 40
        ? p.hifzActiveProfile
        : 'main',
    // Gentle-nudge marker (v3.25): only a real, past-or-today day survives.
    nudge: sanitizeNudgeState(p.nudge),
    // Backup marker (v3.26): a finite, past-or-now timestamp survives.
    backupMeta: sanitizeBackupMeta(p.backupMeta),
    // Onboarding: honor an explicit flag from the payload; when absent
    // (pre-onboarding versions, fresh imports), returning users are
    // auto-dismissed so upgrades never meet a first-run wizard, while
    // genuinely new users still get the guided panel.
    onboarding: {
      dismissed: typeof ob.dismissed === 'boolean' ? ob.dismissed : isReturningUser(p),
      settingsVisited: typeof ob.settingsVisited === 'boolean' ? ob.settingsVisited : false,
    },
    // Khatma plan: a schedule layered over reading progress — never trust
    // imported shapes. Requires a valid startDate AND at least one of a
    // valid targetDate or a sane dailyTarget; anything else drops to null.
    khatmaPlan: (() => {
      const startDate = ISO_DATE.test(kp.startDate) ? kp.startDate : null;
      const targetDate = ISO_DATE.test(kp.targetDate) ? kp.targetDate : null;
      const dailyRaw = Number(kp.dailyTarget);
      const dailyTarget =
        Number.isFinite(dailyRaw) && dailyRaw >= 1
          ? Math.min(MUSHAF_PAGE_COUNT, Math.round(dailyRaw))
          : null;
      if (!startDate || (!targetDate && !dailyTarget)) return null;
      return { startDate, targetDate, dailyTarget };
    })(),
    // FIX (review v3.1 A3/B2): the audioDownloads registry is a mirror of
    // the audio IndexedDB — and the blobs do NOT travel inside a backup.
    // Honoring an imported registry had the download grid, offline badges,
    // and "Download All" all lying on the new device. It always starts
    // empty after a restore; re-download what you want offline there.
    audioDownloads: {},
    khatmaHistory: asArray(p.khatmaHistory)
      .filter((h) => h && typeof h === 'object' && Number.isFinite(h.completedAt))
      .map((h) => ({
        id: typeof h.id === 'string' ? h.id : `khatma-${h.completedAt}`,
        completedAt: h.completedAt,
        days: Number.isFinite(h.days) ? h.days : null,
        pages: Number.isFinite(h.pages) ? h.pages : MUSHAF_PAGE_COUNT,
      }))
      .slice(0, 20),
    favorites: asArray(p.favorites).filter((id) => typeof id === 'string'),
    // (v5.2.0) hadith bookmark keys are "<bookId>:<n>" slugs, capped so a
    // hostile backup cannot bloat the persisted blob.
    hadithBookmarks: asArray(p.hadithBookmarks)
      .filter((k) => typeof k === 'string' && /^[A-Za-z0-9_-]{1,40}:\d{1,6}$/.test(k))
      .slice(0, 1000),
    // Personal hadith notes: same key shape, plain capped text values.
    hadithNotes: cleanHadithNotes(p.hadithNotes),
    // Recitation queues: capped counts, safe ids, clamped range ints.
    playlists: cleanPlaylists(p.playlists),
    // (v4.2) surah/ayah/page are typed now: they render into data-*
    // attributes and "surah:ayah" labels in the mushaf bookmark list.
    ayahBookmarks: asArray(p.ayahBookmarks)
      .filter((b) => b && typeof b === 'object' && typeof b.key === 'string')
      .map((b) => {
        const surah = asCount(b.surah, 0);
        const ayah = asCount(b.ayah, 0);
        return {
          key: b.key,
          surah,
          ayah,
          page: Math.max(1, Math.min(MUSHAF_PAGE_COUNT, asCount(b.page, 1) || 1)),
          ts: Number.isFinite(b.ts) ? b.ts : null,
          note: typeof b.note === 'string' ? b.note : '',
          folderId: asId(b.folderId),
        };
      })
      .filter((b) => b.surah >= 1 && b.surah <= 114 && b.ayah >= 1),
    ayahBookmarkFolders: asArray(p.ayahBookmarkFolders)
      .filter((f) => f && typeof f === 'object' && asId(f.id))
      .map((f) => ({
        id: asId(f.id),
        name: typeof f.name === 'string' ? f.name.slice(0, 80) : '',
        createdAt: Number.isFinite(f.createdAt) ? f.createdAt : null,
      }))
      .slice(0, 50),
    // (review v3.21): keys are mushaf pages — anything else (junk keys from
    // a corrupt/hostile backup) previously counted toward forged khatma
    // completions, since completion is keyed on the map's key count.
    mushafPagesRead: (() => {
      const raw = asObject(p.mushafPagesRead);
      const clean = {};
      for (const [k, v] of Object.entries(raw)) {
        if (!/^\d{1,3}$/.test(k)) continue;
        const n = Number(k);
        if (n >= 1 && n <= MUSHAF_PAGE_COUNT && v) clean[String(n)] = true;
      }
      return clean;
    })(),
    // (review v3.21): the word-by-word slice was the one persisted map that
    // passed through the ...p spread uncoerced — a null from a tampered
    // payload crashed renderQuran on every loaded surah.
    quranWords: cleanObject(p.quranWords),
    // Coarse shape guard for the tasbih counters (same class as the rest).
    tasbih: cleanObject(p.tasbih),
    // (audioDownloads intentionally omitted here — see the note above: the
    // registry is always cleared on restore because the IndexedDB blobs
    // never travel inside a backup.)
    ramadanLog: cleanObject(p.ramadanLog),
    zakat: {
      prefs: {
        basis: zakatPrefs.basis === 'silver' ? 'silver' : 'gold',
        goldPricePerGram: asStr(zakatPrefs.goldPricePerGram),
        silverPricePerGram: asStr(zakatPrefs.silverPricePerGram),
        currency: asStr(zakatPrefs.currency),
        fitrPer: asNumStr(zakatPrefs.fitrPer),
        fitrPeople: asNumStr(zakatPrefs.fitrPeople),
      },
      inputs: {
        cash: asNumStr(zakatInputs.cash),
        goldGrams: asNumStr(zakatInputs.goldGrams),
        silverGrams: asNumStr(zakatInputs.silverGrams),
        investments: asNumStr(zakatInputs.investments),
        businessGoods: asNumStr(zakatInputs.businessGoods),
        receivables: asNumStr(zakatInputs.receivables),
        otherAssets: asNumStr(zakatInputs.otherAssets),
        liabilities: asNumStr(zakatInputs.liabilities),
      },
    },
    zakatHistory: asArray(p.zakatHistory)
      .filter((s) => s && typeof s === 'object' && typeof s.id === 'string')
      .slice(0, 30),
    collections: asArray(p.collections)
      .filter((c) => c && typeof c === 'object' && asId(c.id))
      .map((c) => ({
        ...c,
        name: typeof c.name === 'string' ? c.name.slice(0, 120) : '',
        items: asArray(c.items)
          .filter((id) => typeof id === 'string')
          .slice(0, 500),
      }))
      .slice(0, 100),
    // (v4.2) per-value counters: count/target/completedCycles render into
    // the tasbih dial, focus view, and every card's counter pill — a
    // crafted backup previously stored "<img src=x onerror=…>" in `count`
    // and it executed on the next render (stored XSS).
    counters: (() => {
      const raw = asObject(p.counters);
      const clean = {};
      for (const [id, v] of Object.entries(raw).slice(0, 2000)) {
        // (S3) isSafeKey: counter ids copy verbatim as keys below.
        if (!isSafeKey(id)) continue;
        if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
        clean[id] = {
          count: asCount(v.count),
          target: Math.max(1, Math.min(100000, asCount(v.target, 33) || 33)),
          completedCycles: asCount(v.completedCycles),
        };
      }
      return clean;
    })(),
    reminders: asArray(p.reminders)
      .filter((r) => r && typeof r === 'object' && typeof r.id === 'string')
      // FIX (walkthrough v3.4 W-4): a reminder whose time can never parse
      // ("25:99", "9am", NaN …) showed up as a live, enabled reminder in
      // Settings but was silently skipped by the scheduler forever — the
      // worst kind of failure for something that promises to wake you for
      // fajr. Drop anything that isn't a strict 24-hour HH:MM at restore.
      .filter((r) => CLOCK_RE.test(String(r.time)))
      // (v5.0.0) the scheduled-content deep link: strict in-app hash or
      // nothing (a crafted backup can't redirect a notification click).
      .map((r) => ({
        ...r,
        targetView:
          typeof r.targetView === 'string' && /^#\/[A-Za-z0-9/_-]*$/.test(r.targetView)
            ? r.targetView
            : '',
      })),
    calendarNotes: asArray(p.calendarNotes)
      .filter((n) => n && typeof n === 'object' && asId(n.id))
      .map((n) => ({
        ...n,
        title: typeof n.title === 'string' ? n.title.slice(0, 200) : '',
        body: typeof n.body === 'string' ? n.body.slice(0, 4000) : '',
        // (v4.2) these two render into <input value="…"> in the edit form.
        endDate: ISO_DATE.test(String(n.endDate)) ? n.endDate : null,
        intervalDays: Math.max(1, Math.min(365, asCount(n.intervalDays, 3) || 3)),
        // An unparseable reminderTime on a note is a dead reminder —
        // normalize it away rather than keep a silently-broken alert.
        reminderTime: CLOCK_RE.test(String(n.reminderTime)) ? n.reminderTime : null,
      }))
      .slice(0, 500),
    history: asArray(p.history)
      // v4.1: the ONLY array slice that had no per-item validation — one
      // `null` entry (a hostile/corrupt backup) would throw inside
      // home.js's render on EVERY boot and brick the app until storage
      // was cleared. Also capped like the reducer caps it (50).
      .filter((h) => h && typeof h === 'object' && typeof h.itemId === 'string' && h.itemId)
      .slice(0, 50),
    search: {
      historyList: asArray(asObject(p.search).historyList).filter((q) => typeof q === 'string'),
    },
    quranBookmark: {
      surah: validSurahBookmarkId(qb.surah),
      ts: Number.isFinite(qb.ts) ? qb.ts : null,
    },
    mushafBookmark: {
      page: Number.isFinite(mb.page) ? mb.page : null,
      ts: Number.isFinite(mb.ts) ? mb.ts : null,
    },
    dailyChecklist: cleanObject(p.dailyChecklist),
    quizStats: {
      bestScore: Number.isFinite(quizStats.bestScore) ? quizStats.bestScore : 0,
      totalAttempts: Number.isFinite(quizStats.totalAttempts) ? quizStats.totalAttempts : 0,
      totalCorrect: Number.isFinite(quizStats.totalCorrect) ? quizStats.totalCorrect : 0,
    },
    statistics: {
      // (v4.2) per-day entries: keys must be local dateKeys, counts must be
      // numbers — `${d.count}` renders straight into the heatmap and week
      // chart. Capped at 731 entries (2 years + today); the oldest are
      // dropped, newest kept (keys sort lexicographically as dates).
      dailyHistory: (() => {
        const raw = asObject(stats.dailyHistory);
        const keys = Object.keys(raw)
          .filter((k) => ISO_DATE.test(k))
          .sort()
          .slice(-731);
        const clean = {};
        for (const k of keys) {
          const d = raw[k];
          if (!d || typeof d !== 'object' || Array.isArray(d)) continue;
          clean[k] = {
            recitations: asCount(d.recitations),
            sessions: asCount(d.sessions),
            itemIds: Array.isArray(d.itemIds)
              ? d.itemIds.filter((x) => typeof x === 'string').slice(0, 200)
              : [],
          };
        }
        return clean;
      })(),
      totalRecitations: asCount(stats.totalRecitations),
      totalSessions: asCount(stats.totalSessions),
      longestStreak: asCount(stats.longestStreak),
      currentStreak: asCount(stats.currentStreak),
      lastActiveDate: ISO_DATE.test(String(stats.lastActiveDate)) ? stats.lastActiveDate : null,
      // (v4.2) values render in the ranked-categories list.
      // (S3) isSafeKey: arbitrary category keys copy verbatim here.
      favoriteCategories: (() => {
        const raw = asObject(stats.favoriteCategories);
        const clean = {};
        for (const [k, v] of Object.entries(raw).slice(0, 100))
          if (isSafeKey(k)) clean[k] = asCount(v);
        return clean;
      })(),
    },
  };
  // Apply the typed overrides over the allowlisted payload. Session-only
  // slices can no longer arrive at all (allowlist), so no delete pass is
  // needed — absent keys simply fall back to initialState defaults.
  return { ...out, ...overrides };
}

export function persistedSnapshot(state) {
  return pickPersisted(state);
}

/**
 * The data-health restore DRY RUN (v3.26): push the exact bytes an export
 * would produce through the same sanitizer a real restore applies — in a
 * pure read (the payload is cloned; the store is never touched) — and
 * count what would survive, slice by slice. "Backups people never test
 * are hopes, not backups." Lives here so it can never drift from the
 * sanitizer it exercises.
 */
export function dryRunRestore(payload) {
  let raw;
  try {
    raw = payload && typeof payload === 'object' ? clone(payload) : {};
  } catch {
    return { ok: false, total: 0, kept: 0, slices: {} };
  }
  const countOf = (v) =>
    Array.isArray(v)
      ? v.length
      : v && typeof v === 'object'
        ? Object.keys(v).length
        : typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
          ? 1
          : 0;
  try {
    const cleaned = sanitizeRestoredPayload(raw);
    const slices = {};
    let total = 0;
    let kept = 0;
    for (const key of PERSISTED_KEYS) {
      const t = countOf(raw[key]);
      if (t === 0) continue; // nothing carried in the snapshot -> nothing to survive
      // The sanitizer fills defaults for absent slices; kept must count only
      // what the snapshot CARRIED, so absent-in-raw slices never contribute.
      const k = countOf(cleaned[key]);
      slices[key] = { total: t, kept: k };
      total += t;
      kept += k;
    }
    return { ok: true, total, kept, slices };
  } catch {
    return { ok: false, total: 0, kept: 0, slices: {} };
  }
}
