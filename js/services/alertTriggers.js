/**
 * alertTriggers.js (v3.20)
 * Prayer-alert reliability. Until now, adhan alerts only fired while a tab
 * was open and the 30s in-tab check interval (notifications.js) was running
 * — a briefly closed tab silently skipped a prayer. This module computes
 * the NEXT 24 HOURS of alerts as a plain, pre-resolved plan (timestamp +
 * title + body + tag per alert). app.js hands that plan to the service
 * worker on every app open / relevant settings change, and the worker:
 *   (a) registers each entry as a real browser-level timestamped trigger
 *       where the Notification Triggers API exists (Chromium) — these fire
 *       even when every tab is closed;
 *   (b) stores the plan in IndexedDB so its `periodicsync` handler can show
 *       any alert whose time passed while nothing was open (best-effort
 *       catch-up, browser-controlled cadence);
 *   (c) cancels previously armed triggers that are no longer in the plan.
 * Where neither API exists (Firefox, Safari), the in-tab scheduler remains
 * the only path and the Prayer view's status row says so honestly.
 *
 * Pure module: no DOM, no IndexedDB, no service worker — node tests can
 * drive midnight rollovers and stale plans directly. sw.js is a CLASSIC
 * worker and cannot import ES modules, so it carries small inline mirrors
 * of sanitizePlan / selectDueAlerts / pruneFiredMap; a static test asserts
 * those mirror markers exist so the two cannot silently diverge.
 */

import { t } from '../core/i18n.js';
import { calculateTimes, decimalHoursToDate } from '../domain/prayer.js';

export const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** How far ahead one arming pass covers. Re-armed on every app open, so a
 * day never needs more than this. */
export const PLAN_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Never arm more than this many triggers in one pass (browser budgets are
 * finite; 6 alerts/day leaves generous headroom). */
export const MAX_PLAN = 16;
/** periodicsync catch-up: an alert missed by more than this stays silent —
 * a notification about Fajr arriving at noon is noise, not devotion. */
export const MAX_LATENESS_MS = 15 * 60 * 1000;
/** Tag prefix shared with the in-tab scheduler in notifications.js, so a
 * trigger and a live in-tab notification for the same prayer REPLACE each
 * other (same tag) instead of stacking two notifications. */
export const TRIGGER_TAG_PREFIX = 'prayer-';

/**
 * Build the next-24h alert plan from the current prayer settings.
 * @param {object} args
 * @param {Date} args.now - "current" instant (injectable for tests)
 * @param {object|null} args.prayerSettings - settings.prayer shape
 * @param {string} [args.lang]
 * @param {Function} [args.calcTimes] - solar engine injection for tests
 *   (defaults to the app's real calculateTimes)
 * @returns {Array<{key,kind,name,ts,title,body,tag}>} sorted by ts, capped
 *   at MAX_PLAN. Empty for hostile shapes — never throws.
 */
export function buildTriggerPlan({ now, prayerSettings, lang = 'en', calcTimes = calculateTimes }) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return [];
  if (!prayerSettings || typeof prayerSettings !== 'object') return [];
  if (prayerSettings.latitude == null || prayerSettings.longitude == null) return [];
  const alerts =
    prayerSettings.alerts && typeof prayerSettings.alerts === 'object' ? prayerSettings.alerts : {};
  if (!PRAYER_ORDER.some((n) => alerts[n])) return [];

  const startMs = now.getTime();
  const windowEnd = startMs + PLAN_WINDOW_MS; // alerts beyond this wait for the next app open
  const seen = new Set();
  const plan = [];

  for (const dayOffset of [0, 1]) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    let times;
    try {
      times = calcTimes({
        date: day,
        latitude: prayerSettings.latitude,
        longitude: prayerSettings.longitude,
        timezoneOffsetHours: -day.getTimezoneOffset() / 60,
        method: prayerSettings.method,
        asr: prayerSettings.asr,
      });
    } catch {
      times = null;
    }
    if (!times) continue;
    for (const name of PRAYER_ORDER) {
      if (!alerts[name]) continue;
      const ts = decimalHoursToDate(day, times[name]).getTime();
      if (ts <= startMs || ts > windowEnd) continue;
      const key = `prayer-${name}|${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      plan.push({
        key,
        kind: 'prayer',
        name,
        ts,
        title: t('prayer.' + name, lang),
        // (review v3.21): a pre-scheduled notification fires AT the prayer
        // time — "Next Prayer" was copy for the in-tab header, not for a
        // lockscreen alert arriving at Fajr.
        body: t('prayer.timeFor', lang, { name: t('prayer.' + name, lang) }),
        tag: TRIGGER_TAG_PREFIX + name,
      });
    }
  }

  plan.sort((a, b) => a.ts - b.ts);
  return plan.slice(0, MAX_PLAN);
}

/** Cheap change-detector so settings churn doesn't spam the worker with
 * identical plans (the browser replaces same-tag triggers, but why pay).
 * (review v3.21): title/body are included — otherwise a language switch
 * produced a fingerprint-equal plan and notifications kept the old copy. */
export function planFingerprint(plan) {
  if (!Array.isArray(plan)) return '';
  return plan.map((e) => `${e.key}:${e.ts}:${e.title}:${e.body}`).join(',');
}

const MAX_KEY = 120;
const MAX_STR = 300;
const MAX_TAG = 60;

function cleanStr(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

/**
 * Hostile-shape filter for a plan arriving over postMessage (or out of
 * IndexedDB). Keeps only well-formed entries; dedupes by key; sorts by ts;
 * caps at MAX_PLAN. The service worker's inline mirror MUST match this.
 */
export function sanitizePlan(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const ts = Number(e.ts);
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const key = cleanStr(e.key, MAX_KEY);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      kind: e.kind === 'prayer' ? 'prayer' : '',
      name: cleanStr(e.name, 30),
      ts,
      title: cleanStr(e.title, MAX_STR),
      body: cleanStr(e.body, MAX_STR),
      tag: cleanStr(e.tag, MAX_TAG),
    });
    if (out.length >= MAX_PLAN) break;
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

/**
 * Alerts that should fire right now for the catch-up path: their time has
 * passed, but not by more than maxLatenessMs, and they have not been shown
 * yet. `firedMap` is a plain { [key]: shownAtMs } record.
 */
export function selectDueAlerts(plan, nowMs, firedMap, maxLatenessMs = MAX_LATENESS_MS) {
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

/**
 * Drop fired-map entries older than 48h (and cap the whole map) so the
 * IndexedDB record cannot grow forever across months of use.
 */
export function pruneFiredMap(firedMap, nowMs, maxAgeMs = 48 * 60 * 60 * 1000, maxKeys = 200) {
  const fired = firedMap && typeof firedMap === 'object' ? firedMap : {};
  const cutoff = nowMs - maxAgeMs;
  const out = {};
  for (const k of Object.keys(fired)) {
    const at = Number(fired[k]);
    if (Number.isFinite(at) && at >= cutoff) out[k] = at;
  }
  const keys = Object.keys(out).sort((a, b) => out[a] - out[b]);
  while (keys.length > maxKeys) delete out[keys.shift()];
  return out;
}

/**
 * Browser-side feature detection (page context). Notification Triggers
 * exist when `showTrigger` is accepted by showNotification's options —
 * prototype presence is the standard runtime probe. In node this returns
 * false, which is exactly what tests want.
 */
export function triggersSupported() {
  try {
    return typeof Notification !== 'undefined' && 'showTrigger' in Notification.prototype;
  } catch {
    return false;
  }
}
