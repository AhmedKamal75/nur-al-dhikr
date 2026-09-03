/**
 * notifications.js
 * Schedules local (client-side only) reminders using the Notification API and
 * setTimeout chains re-armed on each check. No server, no push service —
 * reminders only fire while the app/tab is open or via the service worker's
 * periodic sync where supported.
 */

import { t } from '../core/i18n.js';
import { appliesToDate } from './calendarNotes.js';
import { dateKey } from '../core/utils.js';
import { calculateTimes, formatClock } from '../domain/prayer.js';
import { playAlert, refreshCustomAdhanFlags } from './prayerSound.js';
import { toHijri } from '../domain/calendar.js';
import { ramadanAlertTimes } from '../domain/ramadan.js';
import { daysUntilHawl } from '../domain/zakat.js';
import { remindCategoriesFor, FASTING_CATEGORIES } from '../domain/fasting.js';

let checkTimer = null;
const firedToday = new Set();

// (review v3.21): the in-memory dedup dies with the page — and the
// day-granular blocks below (voluntary-fasting day-before, zakat hawl)
// fire across a WIDE evening window with no 2-minute catch-up bound, so
// every app open during the evening re-fired the same notification. A
// tiny localStorage-backed set keyed by fireKey survives reloads; entries
// are kept only for the day they belong to, so it self-prunes daily.
const DAY_DEDUP_STORAGE_KEY = 'nurAlDhikr:v2:notifDayFired';
let dayFiredCache = null;
let dayFiredDay = null;

function loadDayFired(todayKey) {
  if (dayFiredCache && dayFiredDay === todayKey) return dayFiredCache;
  dayFiredDay = todayKey;
  dayFiredCache = {};
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(DAY_DEDUP_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, day] of Object.entries(parsed)) {
          if (day === todayKey) dayFiredCache[k] = day;
        }
      }
    }
  } catch {
    /* private mode / corrupt value — session dedup still applies */
  }
  return dayFiredCache;
}

/** True when this fireKey already fired today, across reloads too. */
export function wasDayFired(fireKey, todayKey) {
  if (firedToday.has(fireKey)) return true;
  return Object.prototype.hasOwnProperty.call(loadDayFired(todayKey), fireKey);
}

/** Record a day-granular fire (in-memory + persisted for the day). */
export function markDayFired(fireKey, todayKey) {
  firedToday.add(fireKey);
  const store = loadDayFired(todayKey);
  store[fireKey] = todayKey;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DAY_DEDUP_STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    /* best effort — the in-memory set still covers this session */
  }
}
// FIX (review v3.3 B6): the dedup set is keyed per-day but was never
// cleared, so it grew for the life of the tab (a small leak and a small
// lie about its own name). Track the day it belongs to and reset it when
// the date rolls over — dedup still holds within a day, which is all the
// catch-up logic ever promised.
let firedTodayKey = null;

export function permissionState() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

function notify(title, body, tag, targetView) {
  if (permissionState() !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: 'assets/icons/icon-192.png',
      silent: false,
    });
    n.onclick = () => {
      // Most platforms don't auto-focus the originating tab/window on
      // notification click — do it explicitly so tapping the reminder
      // actually brings the app forward instead of doing nothing.
      window.focus();
      // (v5.0.0) scheduled azkar/section/banner reminders deep-link back
      // to what they schedule (a strict in-app hash; anything else is
      // ignored so a crafted backup can't redirect the click).
      if (targetView && typeof targetView === 'string' && /^#\/[A-Za-z0-9/_-]*$/.test(targetView)) {
        window.location.hash = targetView.slice(1);
      }
      n.close();
    };
  } catch (err) {
    console.warn('[notifications] failed to show notification', err);
  }
}

/**
 * Start the reminder scheduler. Call once at boot with accessor functions
 * for reminders, calendar notes, and prayer settings (so we always read
 * fresh state, never a stale snapshot from boot time). `lang` may be a
 * plain string or — better — an accessor function, so notification copy
 * follows a language switch without a reload (review v3.21).
 */
let adhanFlagsWarmed = false;

export function startScheduler(
  getReminders,
  lang = 'en',
  getCalendarNotes = () => [],
  getPrayerSettings = () => null,
  getZakatHistory = () => [],
  getFastingPrefs = () => null
) {
  stopScheduler();
  // v3.8: warm the "does the user have custom adhan recordings?" cache once
  // per session (async, best-effort — the fire path reads the cached flags).
  if (!adhanFlagsWarmed) {
    adhanFlagsWarmed = true;
    refreshCustomAdhanFlags();
  }
  // (review v3.21): resolve the language per tick — a frozen string kept
  // notifications in the boot language for the whole session.
  const getLang = typeof lang === 'function' ? lang : () => lang;
  const tickFn = () =>
    tick(
      getReminders(),
      getLang(),
      getCalendarNotes(),
      getPrayerSettings(),
      getZakatHistory(),
      getFastingPrefs()
    );
  checkTimer = setInterval(tickFn, 30 * 1000);
  tickFn();
}

export function stopScheduler() {
  if (checkTimer) clearInterval(checkTimer);
  checkTimer = null;
}

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** FIX (walkthrough v3.4 W-4): defense in depth for the reminder time.
 * The form's <input type="time"> + native validation covers real users,
 * but programmatic paths (older backups, extensions, future callers) can
 * hand in garbage — a reminder whose time can't parse never fires and
 * fails silently. Invalid input falls back to the default time. */
const CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Minutes since a "HH:MM" clock time, negative if it hasn't come yet. */
function minutesSince(hhmm, now) {
  const [h, m] = hhmm.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
}

/**
 * FIX (review v3.1 A5): the scheduler used to match the exact wall-clock
 * minute on a 30s tick — a throttled or briefly suspended tab could skip
 * the minute entirely and the reminder never fired. A catch-up window of
 * 2 minutes now delivers late instead of never (dedup stays keyed per
 * reminder per day, so nothing double-fires).
 */
const CATCHUP_MINUTES = 2;

export function shouldFire(hhmm, now) {
  const since = minutesSince(hhmm, now);
  return since >= 0 && since <= CATCHUP_MINUTES;
}

function tick(reminders, lang, calendarNotes, prayerSettings, zakatHistory, fastingPrefs) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayKey = `${now.toDateString()}|${hhmm.slice(0, 5)}`;
  const todayKey = dateKey(now);

  // Day rollover: drop the previous day's dedup keys (see firedTodayKey
  // note above) so the set never outlives the day it describes.
  if (firedTodayKey !== todayKey) {
    firedTodayKey = todayKey;
    firedToday.clear();
  }

  for (const r of reminders || []) {
    if (!r.enabled) continue;
    if (!shouldFire(r.time, now)) continue;
    const fireKey = `${r.id}|${dayKey.slice(0, dayKey.indexOf('|') + 1)}${r.time}`;
    if (firedToday.has(fireKey)) continue;
    firedToday.add(fireKey);
    notify(
      r.label || t('app.name', lang),
      r.body || t('home.dailyProgress', lang),
      `reminder-${r.id}`,
      r.targetView
    );
  }

  for (const note of calendarNotes || []) {
    if (!note.reminder || !note.reminderTime) continue;
    if (!shouldFire(note.reminderTime, now)) continue;
    if (!appliesToDate(note, todayKey)) continue;
    const fireKey = `note-${note.id}|${todayKey}`;
    if (firedToday.has(fireKey)) continue;
    firedToday.add(fireKey);
    notify(note.title || t('app.name', lang), note.body || '', `calendar-note-${note.id}`);
  }

  // Smart Prayer Alerts: computed against today's *actual* solar prayer
  // times, not a fixed clock time, so they stay correct through the year.
  if (
    prayerSettings?.latitude != null &&
    prayerSettings?.longitude != null &&
    prayerSettings.alerts
  ) {
    const anyEnabled = PRAYER_ORDER.some((n) => prayerSettings.alerts[n]);
    if (anyEnabled) {
      const tzOffsetHours = -now.getTimezoneOffset() / 60;
      const times = calculateTimes({
        date: now,
        latitude: prayerSettings.latitude,
        longitude: prayerSettings.longitude,
        timezoneOffsetHours: tzOffsetHours,
        method: prayerSettings.method,
        asr: prayerSettings.asr,
      });
      for (const name of PRAYER_ORDER) {
        if (!prayerSettings.alerts[name]) continue;
        if (!shouldFire(formatClock(times[name], false), now)) continue;
        const fireKey = `prayer-${name}|${todayKey}`;
        if (firedToday.has(fireKey)) continue;
        firedToday.add(fireKey);
        notify(
          t('prayer.' + name, lang),
          t('prayer.timeFor', lang, { name: t('prayer.' + name, lang) }),
          `prayer-${name}`
        );
        if (document.visibilityState === 'visible')
          playAlert(prayerSettings, { fajr: name === 'fajr' });
      }
    }
  }

  // Ramadan Suhoor/Iftar alerts — same solar engine as prayer alerts, but
  // gated on the day actually being in Ramadan (tabular Hijri check), so
  // the toggles can stay on year-round without firing outside the month.
  const rAlerts = prayerSettings?.ramadanAlerts;
  if (
    rAlerts &&
    (rAlerts.suhoor || rAlerts.iftar) &&
    prayerSettings?.latitude != null &&
    prayerSettings?.longitude != null
  ) {
    if (toHijri(now).month === 9) {
      const tzOffsetHours = -now.getTimezoneOffset() / 60;
      const times = calculateTimes({
        date: now,
        latitude: prayerSettings.latitude,
        longitude: prayerSettings.longitude,
        timezoneOffsetHours: tzOffsetHours,
        method: prayerSettings.method,
        asr: prayerSettings.asr,
      });
      const alertTimes = ramadanAlertTimes(times, rAlerts.suhoorOffset);
      if (rAlerts.suhoor && shouldFire(formatClock(alertTimes.suhoor, false), now)) {
        const fireKey = `ramadan-suhoor|${todayKey}`;
        if (!firedToday.has(fireKey)) {
          firedToday.add(fireKey);
          notify(
            t('ramadan.alertSuhoorTitle', lang),
            t('ramadan.alertSuhoorBody', lang, {
              n: rAlerts.suhoorOffset || 30,
              fajr: formatClock(times.fajr),
            }),
            'ramadan-suhoor'
          );
          if (document.visibilityState === 'visible') playAlert(prayerSettings, { fajr: true });
        }
      }
      if (rAlerts.iftar && shouldFire(formatClock(alertTimes.iftar, false), now)) {
        const fireKey = `ramadan-iftar|${todayKey}`;
        if (!firedToday.has(fireKey)) {
          firedToday.add(fireKey);
          notify(
            t('ramadan.alertIftarTitle', lang),
            t('ramadan.alertIftarBody', lang),
            'ramadan-iftar'
          );
          if (document.visibilityState === 'visible') playAlert(prayerSettings, { fajr: false });
        }
      }
    }
  }

  // Zakat hawl reminders: once per day (first scheduler pass after
  // midnight) for every saved assessment whose lunar-year anniversary is
  // reached and whose reminder bell is on. Day-granular via daysUntilHawl.
  for (const snap of zakatHistory || []) {
    if (!snap || snap.remind === false || !Number.isFinite(snap.hawlDue)) continue;
    const days = daysUntilHawl(snap.hawlDue, now.getTime());
    if (days !== 0) continue;
    const fireKey = `zakat-hawl-${snap.id}|${todayKey}`;
    if (wasDayFired(fireKey, todayKey)) continue;
    markDayFired(fireKey, todayKey);
    notify(
      t('zakat.hawlAlertTitle', lang),
      t('zakat.hawlAlertBody', lang),
      `zakat-hawl-${snap.id}`
    );
  }

  // Voluntary fasting day-before reminders (v3.18): opt-in per category.
  // Day-granular like the zakat hawl block — after the configured remind
  // time has passed TODAY (wide window, not the 2-minute catch-up), fire
  // once when TOMORROW matches an enabled, reminder-armed category.
  if (fastingPrefs && FASTING_CATEGORIES.some((c) => fastingPrefs[c]?.remind)) {
    const since = minutesSince(
      /^([01]\d|2[0-3]):[0-5]\d$/.test(fastingPrefs.remindTime) ? fastingPrefs.remindTime : '18:00',
      now
    );
    if (since >= 0) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const cats = remindCategoriesFor(fastingPrefs, toHijri(tomorrow), tomorrow);
      if (cats.length) {
        const fireKey = `fasting-day-before|${todayKey}`;
        if (!wasDayFired(fireKey, todayKey)) {
          markDayFired(fireKey, todayKey);
          notify(
            t('fasting.remindTitle', lang),
            t('fasting.remindBody', lang, {
              cats: cats.map((c) => t(`fasting.cat.${c}`, lang)).join(' · '),
            }),
            'fasting-day-before'
          );
        }
      }
    }
  }

  // prevent unbounded growth of the fired-set across a long-running tab.
  // (review v3.21): clear() re-fired every reminder still inside its
  // catch-up window 30s later — drop the oldest half instead (a Set
  // iterates in insertion order, so this evicts the oldest keys).
  if (firedToday.size > 500) {
    let dropped = 0;
    for (const k of firedToday) {
      if (dropped++ >= 250) break;
      firedToday.delete(k);
    }
  }
}

/** Build a default reminder object for the editor UI.
 * FIX (walkthrough v3.4 W-4): defense in depth for the reminder time —
 * programmatic paths (older backups, extensions, future callers) can hand
 * in garbage; invalid input falls back to the default 06:00 rather than
 * becoming a silently-dead reminder. */
export function makeReminder({
  id,
  time = '06:00',
  label = '',
  body = '',
  section = null,
  targetView = '',
}) {
  return {
    id,
    time: CLOCK_RE.test(String(time)) ? time : '06:00',
    label,
    body,
    section,
    // (v5.0.0) the in-app deep link opened when the notification is
    // tapped — scheduling a section lands you on that section.
    targetView:
      typeof targetView === 'string' && /^#\/[A-Za-z0-9/_-]*$/.test(targetView) ? targetView : '',
    enabled: true,
  };
}
