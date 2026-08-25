/**
 * notifications.js
 * Schedules local (client-side only) reminders using the Notification API and
 * setTimeout chains re-armed on each check. No server, no push service —
 * reminders only fire while the app/tab is open or via the service worker's
 * periodic sync where supported.
 */

import { t } from './i18n.js';
import { appliesToDate } from './calendarNotes.js';
import { dateKey } from './utils.js';
import { calculateTimes, formatClock } from './prayer.js';
import { playSound } from './prayerSound.js';
import { toHijri } from './calendar.js';
import { ramadanAlertTimes } from './ramadan.js';
import { daysUntilHawl } from './zakat.js';

let checkTimer = null;
const firedToday = new Set();

export function permissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

function notify(title, body, tag) {
  if (permissionState() !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag, icon: 'assets/icons/icon-192.png', silent: false });
    n.onclick = () => {
      // Most platforms don't auto-focus the originating tab/window on
      // notification click — do it explicitly so tapping the reminder
      // actually brings the app forward instead of doing nothing.
      window.focus();
      n.close();
    };
  } catch (err) {
    console.warn('[notifications] failed to show notification', err);
  }
}

/**
 * Start the reminder scheduler. Call once at boot with accessor functions
 * for reminders, calendar notes, and prayer settings (so we always read
 * fresh state, never a stale snapshot from boot time).
 */
export function startScheduler(getReminders, lang = 'en', getCalendarNotes = () => [], getPrayerSettings = () => null, getZakatHistory = () => []) {
  stopScheduler();
  const tickFn = () => tick(getReminders(), lang, getCalendarNotes(), getPrayerSettings(), getZakatHistory());
  checkTimer = setInterval(tickFn, 30 * 1000);
  tickFn();
}

export function stopScheduler() {
  if (checkTimer) clearInterval(checkTimer);
  checkTimer = null;
}

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Minutes since a "HH:MM" clock time, negative if it hasn't come yet. */
function minutesSince(hhmm, now) {
  const [h, m] = hhmm.split(':').map(Number);
  return (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m);
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

function tick(reminders, lang, calendarNotes, prayerSettings, zakatHistory) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayKey = `${now.toDateString()}|${hhmm.slice(0, 5)}`;
  const todayKey = dateKey(now);

  for (const r of reminders || []) {
    if (!r.enabled) continue;
    if (!shouldFire(r.time, now)) continue;
    const fireKey = `${r.id}|${dayKey.slice(0, dayKey.indexOf('|') + 1)}${r.time}`;
    if (firedToday.has(fireKey)) continue;
    firedToday.add(fireKey);
    notify(
      r.label || t('app.name', lang),
      r.body || t('home.dailyProgress', lang),
      `reminder-${r.id}`
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
  if (prayerSettings?.latitude != null && prayerSettings?.longitude != null && prayerSettings.alerts) {
    const anyEnabled = PRAYER_ORDER.some((n) => prayerSettings.alerts[n]);
    if (anyEnabled) {
      const tzOffsetHours = -now.getTimezoneOffset() / 60;
      const times = calculateTimes({
        date: now,
        latitude: prayerSettings.latitude,
        longitude: prayerSettings.longitude,
        timezoneOffsetHours: tzOffsetHours,
        method: prayerSettings.method,
        asr: prayerSettings.asr
      });
      for (const name of PRAYER_ORDER) {
        if (!prayerSettings.alerts[name]) continue;
        if (!shouldFire(formatClock(times[name], false), now)) continue;
        const fireKey = `prayer-${name}|${todayKey}`;
        if (firedToday.has(fireKey)) continue;
        firedToday.add(fireKey);
        notify(t('prayer.' + name, lang), t('prayer.next', lang), `prayer-${name}`);
        if (document.visibilityState === 'visible') playSound(prayerSettings.alertSound);
      }
    }
  }

  // Ramadan Suhoor/Iftar alerts — same solar engine as prayer alerts, but
  // gated on the day actually being in Ramadan (tabular Hijri check), so
  // the toggles can stay on year-round without firing outside the month.
  const rAlerts = prayerSettings?.ramadanAlerts;
  if (rAlerts && (rAlerts.suhoor || rAlerts.iftar) && prayerSettings?.latitude != null && prayerSettings?.longitude != null) {
    if (toHijri(now).month === 9) {
      const tzOffsetHours = -now.getTimezoneOffset() / 60;
      const times = calculateTimes({
        date: now,
        latitude: prayerSettings.latitude,
        longitude: prayerSettings.longitude,
        timezoneOffsetHours: tzOffsetHours,
        method: prayerSettings.method,
        asr: prayerSettings.asr
      });
      const alertTimes = ramadanAlertTimes(times, rAlerts.suhoorOffset);
      if (rAlerts.suhoor && shouldFire(formatClock(alertTimes.suhoor, false), now)) {
        const fireKey = `ramadan-suhoor|${todayKey}`;
        if (!firedToday.has(fireKey)) {
          firedToday.add(fireKey);
          notify(
            t('ramadan.alertSuhoorTitle', lang),
            t('ramadan.alertSuhoorBody', lang, { n: rAlerts.suhoorOffset || 30, fajr: formatClock(times.fajr) }),
            'ramadan-suhoor'
          );
          if (document.visibilityState === 'visible') playSound(prayerSettings.alertSound);
        }
      }
      if (rAlerts.iftar && shouldFire(formatClock(alertTimes.iftar, false), now)) {
        const fireKey = `ramadan-iftar|${todayKey}`;
        if (!firedToday.has(fireKey)) {
          firedToday.add(fireKey);
          notify(t('ramadan.alertIftarTitle', lang), t('ramadan.alertIftarBody', lang), 'ramadan-iftar');
          if (document.visibilityState === 'visible') playSound(prayerSettings.alertSound);
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
    if (firedToday.has(fireKey)) continue;
    firedToday.add(fireKey);
    notify(
      t('zakat.hawlAlertTitle', lang),
      t('zakat.hawlAlertBody', lang),
      `zakat-hawl-${snap.id}`
    );
  }

  // prevent unbounded growth of the fired-set across a long-running tab
  if (firedToday.size > 500) firedToday.clear();
}

/** Build a default reminder object for the editor UI. */
export function makeReminder({ id, time = '06:00', label = '', body = '', section = null }) {
  return { id, time, label, body, section, enabled: true };
}
