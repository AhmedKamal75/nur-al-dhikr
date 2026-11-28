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
  if (h >= start && h < end) return true;
  // (v4.3) day-relative wrap: prayer times are hours since midnight of the
  // computation date, so at high latitudes Isha (and even Maghrib) can be
  // >= 24 — the evening window [Asr, Isha) then continues past midnight as
  // [0, Isha−24). Without this, the evening badge never showed at all in
  // summer at e.g. Reykjavik latitudes (Isha wrapped to 00:28 while Asr was
  // still 18:22 — an empty numeric range).
  return end >= 24 && h >= 0 && h < end - 24;
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

/**
 * (v5.17.188, C18) the start/end bounds of one adhkar window in decimal
 * hours. recommendedAdhkarWindow() answers WHICH window is active; the
 * reminder scheduler needs WHEN it began (to add the lead time) and when
 * it closes (so a late fire stays silent). Same source order as
 * recommendedAdhkarWindow: the real prayer times when all four boundary
 * times are finite, the fixed clock windows otherwise. `end` may be
 * >= 24 at high latitudes (see inWindow's wrap note). Returns null for
 * an unknown window name — callers stay silent.
 *
 * @param {'morning'|'evening'} window
 * @param {{fajr:number, dhuhr:number, asr:number, isha:number}|null} [prayerTimes]
 * @returns {{start:number, end:number} | null}
 */
export function adhkarWindowTimes(window, prayerTimes = null) {
  const t =
    prayerTimes &&
    Number.isFinite(prayerTimes.fajr) &&
    Number.isFinite(prayerTimes.dhuhr) &&
    Number.isFinite(prayerTimes.asr) &&
    Number.isFinite(prayerTimes.isha)
      ? prayerTimes
      : null;
  if (window === 'morning') {
    return t
      ? { start: t.fajr, end: t.dhuhr }
      : { start: MORNING_WINDOW.startHour, end: MORNING_WINDOW.endHour };
  }
  if (window === 'evening') {
    return t
      ? { start: t.asr, end: t.isha }
      : { start: EVENING_WINDOW.startHour, end: EVENING_WINDOW.endHour };
  }
  return null;
}

/** The lead-time choices the Settings select offers (minutes after the window starts). */
export const ADHKAR_LEAD_CHOICES = Object.freeze([0, 15, 30, 60]);

/**
 * (v5.17.188, C18) reminder due-state for one window at one moment:
 *  - 'due': the fire time (window start + leadMinutes) has passed and the
 *    window is still open — fire now (the caller dedups once per day);
 *  - 'pending': the fire time hasn't come yet (or the window hasn't
 *    opened);
 *  - 'closed': the window has closed — stay silent rather than late;
 *  - null: unknown window or uncomputable bounds — stay silent.
 * Wrap-aware like inWindow: a window whose end spills past midnight stays
 * open into the small hours, and a fire time past 24:00 lands there too.
 *
 * @param {'morning'|'evening'} window
 * @param {Date} [date]
 * @param {{fajr:number, dhuhr:number, asr:number, isha:number}|null} [prayerTimes]
 * @param {number} [leadMinutes] minutes after the window start (default 30)
 * @returns {'due'|'pending'|'closed'|null}
 */
export function adhkarReminderState(
  window,
  date = new Date(),
  prayerTimes = null,
  leadMinutes = 30
) {
  const bounds = adhkarWindowTimes(window, prayerTimes);
  if (!bounds) return null;
  const lead = ADHKAR_LEAD_CHOICES.includes(leadMinutes) ? leadMinutes : 30;
  const h = date.getHours() + date.getMinutes() / 60;
  if (!inWindow(h, bounds.start, bounds.end)) {
    // Before the window opens it can still fire today; after it closed
    // the day is done. (In the wrapped tail h < start holds while the
    // window is open — inWindow already returned true for that.)
    return h < bounds.start ? 'pending' : 'closed';
  }
  const fireH = bounds.start + lead / 60;
  // Day-relative hours: in the wrapped tail (window open past midnight,
  // h < start) the fire time is behind us on the previous clock day.
  const hRel = h < bounds.start && bounds.end >= 24 ? h + 24 : h;
  return hRel >= fireH ? 'due' : 'pending';
}
