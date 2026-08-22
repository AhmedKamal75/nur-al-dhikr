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
export function startScheduler(getReminders, lang = 'en', getCalendarNotes = () => [], getPrayerSettings = () => null) {
  stopScheduler();
  checkTimer = setInterval(() => tick(getReminders(), lang, getCalendarNotes(), getPrayerSettings()), 30 * 1000);
  tick(getReminders(), lang, getCalendarNotes(), getPrayerSettings());
}

export function stopScheduler() {
  if (checkTimer) clearInterval(checkTimer);
  checkTimer = null;
}

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function tick(reminders, lang, calendarNotes, prayerSettings) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayKey = `${now.toDateString()}|${hhmm}`;
  const todayKey = dateKey(now);

  for (const r of reminders || []) {
    if (!r.enabled) continue;
    if (r.time !== hhmm) continue;
    const fireKey = `${r.id}|${dayKey}`;
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
    if (note.reminderTime !== hhmm) continue;
    if (!appliesToDate(note, todayKey)) continue;
    const fireKey = `note-${note.id}|${dayKey}`;
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
        if (formatClock(times[name], false) !== hhmm) continue;
        const fireKey = `prayer-${name}|${dayKey}`;
        if (firedToday.has(fireKey)) continue;
        firedToday.add(fireKey);
        notify(t('prayer.' + name, lang), t('prayer.next', lang), `prayer-${name}`);
        if (document.visibilityState === 'visible') playSound(prayerSettings.alertSound);
      }
    }
  }

  // prevent unbounded growth of the fired-set across a long-running tab
  if (firedToday.size > 500) firedToday.clear();
}

/** Build a default reminder object for the editor UI. */
export function makeReminder({ id, time = '06:00', label = '', body = '', section = null }) {
  return { id, time, label, body, section, enabled: true };
}
