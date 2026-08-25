/**
 * adhkarTiming.js
 * Pure time-of-day helpers for surfacing the "right" adhkar at the right
 * moment on Home. Kept separate from views so it stays trivially testable
 * (same philosophy as ramadan.js / zakat.js).
 *
 * Two modes, in order of fidelity:
 *
 * 1. Prayer-times mode — when the caller has real times for today (from
 *    prayer.js calculateTimes), the windows follow the actual sun:
 *      morning adhkar: Fajr → Dhuhr
 *      evening adhkar: Asr  → Isha
 *    The morning range is the standard scholarly allowance (the preferred
 *    slot ends at sunrise, with latitude until Dhuhr). The evening range
 *    runs Asr → Isha: the strictest common position ends at Maghrib, and
 *    several scholars permit extending into the night, so Isha is the
 *    honest middle. High latitudes where the engine applies its
 *    one-seventh-of-night fallback are handled automatically, since the
 *    fallback times are what the Prayer view itself displays.
 *
 * 2. Clock fallback — before a location is configured, fixed local-clock
 *    windows approximate the same idea (morning 4:00–12:00, evening
 *    15:00–21:00). Home should feel helpful even before setup; the moment
 *    a location exists, the real windows take over.
 *
 * Outside both windows the answer is "no recommendation", and the Home UI
 * shows no badge rather than a wrong one.
 */

/** Clock-fallback morning window: [4:00, 12:00) local time. */
export const MORNING_WINDOW = Object.freeze({ startHour: 4, endHour: 12 });

/** Clock-fallback evening window: [15:00, 21:00) local time. */
export const EVENING_WINDOW = Object.freeze({ startHour: 15, endHour: 21 });

function inWindow(h, start, end) {
  return h >= start && h < end;
}

/**
 * Which adhkar category (if any) is in its recommended reading window.
 *
 * @param {Date} [date] defaults to now
 * @param {{fajr:number, dhuhr:number, asr:number, isha:number}|null} [prayerTimes]
 *        Today's computed prayer times in decimal hours. When provided,
 *        the real sun-based windows are used; when null/omitted (or missing
 *        any of the four boundary times), the fixed clock windows apply.
 * @returns {'morning' | 'evening' | null}
 */
export function recommendedAdhkarWindow(date = new Date(), prayerTimes = null) {
  const h = date.getHours() + date.getMinutes() / 60;

  const t =
    prayerTimes &&
    Number.isFinite(prayerTimes.fajr) &&
    Number.isFinite(prayerTimes.dhuhr) &&
    Number.isFinite(prayerTimes.asr) &&
    Number.isFinite(prayerTimes.isha)
      ? prayerTimes
      : null;

  if (t) {
    if (inWindow(h, t.fajr, t.dhuhr)) return 'morning';
    if (inWindow(h, t.asr, t.isha)) return 'evening';
    return null;
  }

  if (inWindow(h, MORNING_WINDOW.startHour, MORNING_WINDOW.endHour)) return 'morning';
  if (inWindow(h, EVENING_WINDOW.startHour, EVENING_WINDOW.endHour)) return 'evening';
  return null;
}
