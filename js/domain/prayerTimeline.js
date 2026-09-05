/**
 * domain/prayerTimeline.js (v5.2.0)
 * Full-day prayer timeline: all six times at a glance with a moving "now"
 * indicator. Pure math over the engine's day-relative hours — no DOM.
 *
 * The strip spans 00:00–24:00 of the computation date. Positions are
 * fractions in [0, 1]. High-latitude wrap (hours >= 24 or < 0) and polar
 * fallbacks are normalized honestly: wrap folds into the strip, flagged
 * fallbacks / non-finite entries are omitted, never plotted as gospel.
 */
import { PRAYER_EXPORT_ORDER } from './prayerExport.js';

/** Normalize day-relative hours into [0, 24). Non-finite → null. */
export function stripPosition(decimalHours) {
  if (!Number.isFinite(decimalHours)) return null;
  return (((decimalHours % 24) + 24) % 24) / 24;
}

/**
 * Build the strip model: { markers: [{ name, at }], nowAt, elapsed }.
 * `nowHours` is hours since midnight (same convention as nextPrayer).
 */
export function buildTimeline(times, nowHours) {
  const markers = [];
  for (const name of PRAYER_EXPORT_ORDER) {
    const h = times?.[name];
    if (!Number.isFinite(h)) continue;
    if (times?.unreachable?.[name]) continue;
    markers.push({ name, at: stripPosition(h) });
  }
  const nowAt = Number.isFinite(nowHours)
    ? Math.min(1, Math.max(0, (((nowHours % 24) + 24) % 24) / 24))
    : null;
  return { markers, nowAt };
}

/** Fraction of the day elapsed between two markers (for progress fills). */
export function spanBetween(fromAt, toAt) {
  if (!Number.isFinite(fromAt) || !Number.isFinite(toAt)) return 0;
  return Math.min(1, Math.max(0, toAt - fromAt));
}

/**
 * (v5.2.0) Next-prayer countdown parts for the ambient display (and any
 * other big-countdown surface). Pure: given the engine's day-relative
 * `times` and now, returns { name, totalSec, h, m } with h/m floored for
 * display. Mirrors the prayer view's own arithmetic (hours/minutes until
 * the target, rolling past midnight) without touching the DOM.
 */
export function nextPrayerCountdown(times, now = new Date()) {
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  let pick = null;
  for (const name of order) {
    const h = times?.[name];
    if (Number.isFinite(h) && h > nowHours) {
      pick = { name, hours: h };
      break;
    }
  }
  if (!pick) {
    if (!Number.isFinite(times?.fajr)) return null;
    pick = { name: 'fajr', hours: times.fajr, tomorrow: true };
  }
  let diffH = pick.hours - nowHours;
  if (diffH < 0) diffH += 24;
  const totalSec = Math.max(0, Math.round(diffH * 3600));
  return {
    name: pick.name,
    tomorrow: pick.tomorrow === true,
    totalSec,
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
  };
}
