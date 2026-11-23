/**
 * domain/timezone.js — the clock the prayer times are expressed on.
 *
 * (v5.17.143) Until now every call site derived the UTC offset from the
 * DEVICE (`-date.getTimezoneOffset() / 60`), so a reader who saved a city
 * in another time zone saw times that silently followed the phone's clock
 * while the stored IANA timezone sat unused (2026-11-23 phone QA, item 3).
 *
 * The fix has two halves, and both live here so every view agrees:
 *
 *  1. `zoneOffsetHours(timeZone, date)` — the UTC offset of an IANA zone on
 *     a given date (DST-correct), computed through Intl. Returns null for a
 *     missing/invalid zone so callers can fall back to the device.
 *  2. `zoneLocalHours(timeZone, date)` — the wall-clock hour-of-day in the
 *     zone, for "next prayer in N minutes" math. Comparing device-local
 *     hours against location-clock times would lie by the tz difference.
 *
 * `prayerClock(settings, date)` bundles both with the device fallback and a
 * `source` flag so the UI can be honest about which clock is on screen.
 */

/** Cached per (zone, utcHour) — offsets only change on DST transitions. */
const offsetCache = new Map();

/**
 * UTC offset of an IANA time zone at `date`, in hours (e.g. Africa/Cairo
 * in winter -> 2). Null when the zone is empty or not a real IANA name.
 * @param {string} timeZone
 * @param {Date} date
 * @returns {number|null}
 */
export function zoneOffsetHours(timeZone, date) {
  const zone = typeof timeZone === 'string' ? timeZone.trim() : '';
  if (!zone || !(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const key = `${zone}@${Math.floor(date.getTime() / 3600000)}`;
  if (offsetCache.has(key)) return offsetCache.get(key);
  let offset = null;
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = {};
    for (const part of dtf.formatToParts(date)) parts[part.type] = part.value;
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    offset = (asUTC - date.getTime()) / 3600000;
    // Whole-day sanity: no real zone exceeds ±14h; a garbage parse must not
    // reach the prayer engine.
    if (!Number.isFinite(offset) || Math.abs(offset) > 14) offset = null;
  } catch {
    offset = null;
  }
  if (offsetCache.size > 256) offsetCache.clear();
  offsetCache.set(key, offset);
  return offset;
}

/**
 * Wall-clock hour-of-day (0..24, fractional) in an IANA zone. Null on any
 * problem so callers fall back to device-local hours.
 * @param {string} timeZone
 * @param {Date} date
 * @returns {number|null}
 */
export function zoneLocalHours(timeZone, date) {
  const zone = typeof timeZone === 'string' ? timeZone.trim() : '';
  if (!zone || !(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = {};
    for (const part of dtf.formatToParts(date)) parts[part.type] = part.value;
    const h = Number(parts.hour);
    const m = Number(parts.minute);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h + m / 60;
  } catch {
    return null;
  }
}

/**
 * The clock for prayer-time math: the saved location's IANA zone when it
 * resolves, otherwise the device clock. `source` tells the UI which one it
 * got so a mismatch note never has to guess.
 *
 * @param {{timezone?: string}} prayerSettings  settings.prayer
 * @param {Date} date
 * @returns {{offsetHours: number, localHours: number, source: 'location'|'device', timeZone: string, date: Date}}
 */
export function prayerClock(prayerSettings, date = new Date()) {
  const zone = typeof prayerSettings?.timezone === 'string' ? prayerSettings.timezone : '';
  const deviceOffset = -date.getTimezoneOffset() / 60;
  const offset = zone ? zoneOffsetHours(zone, date) : null;
  if (offset != null) {
    const localHours = zoneLocalHours(zone, date);
    if (localHours != null) {
      return {
        offsetHours: offset,
        localHours,
        source: 'location',
        timeZone: zone,
        // A Date whose device-local getters return the zone's wall time.
        // nextPrayer/currentPrayer and the countdown helpers read
        // getHours()/getMinutes() — comparing those against zone-clock
        // times through the raw device Date would lie by the tz gap.
        date: new Date(date.getTime() + (offset - deviceOffset) * 3600000),
      };
    }
  }
  return {
    offsetHours: deviceOffset,
    localHours: date.getHours() + date.getMinutes() / 60,
    source: 'device',
    timeZone: zone,
    date,
  };
}
