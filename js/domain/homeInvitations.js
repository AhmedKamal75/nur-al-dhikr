/**
 * domain/homeInvitations.js — (v5.17.56, merged-plan item 9) the three
 * below-fold home invitations: a Hijri date note, a Friday Al-Kahf
 * invitation, and a Ramadan countdown/companion invitation.
 *
 * Why invitations, not banners: the Ramadan banner only painted in-season,
 * the Friday prompt lived behind a Settings switch, and the Hijri date was
 * a chip beside the greeting — none of them ever invited anyone anywhere.
 * These three cards sit BELOW the adhkar grid (browse-by-need first, chrome
 * after) and each carries one honest door: the calendar, Surah Al-Kahf, the
 * Ramadan companion.
 *
 * Rule 6 — every trigger derives from a module that already owns it, so
 * the tree cannot drift from itself:
 *   - Friday from reminderPresets.fridayAnchor (the same anchor the
 *     Jumu'ah calendar preset recurs from — no second definition of
 *     "which Friday");
 *   - Ramadan from ramadan.ramadanInfo/nextRamadan (the companion's own
 *     season math, tabular ±1–2 days with the estimate said out loud);
 *   - Hijri occasions from calendar.islamicEventsForYear/EVENT_LABELS (the
 *     calendar view's own event list, same estimate caveat).
 *
 * Adab, test-pinned: invitational language only — no missed-day counting,
 * no urgency words, no streak/shame vocabulary, no personalization (no
 * name, no history read), no push (no notification armed from here).
 * Dismissal stamps the device's own today into persisted settings through
 * the normal SETTINGS_UPDATE pipeline, so "no today" survives a reload
 * and the next trigger day starts clean — calm, never held against anyone.
 * Pure (date/dismissed → decision); the view in js/views/home.js renders.
 */

import { toHijri, islamicEventsForYear } from './calendar.js';
import { ramadanInfo, nextRamadan } from './ramadan.js';
import { fridayAnchor, dayKey } from './reminderPresets.js';
import { shouldReofferInstall, INSTALL_INVITE_MIN_ACTIVE_DAYS } from './install.js';

/** The invitation ids, in render order. */
export const INVITE_IDS = Object.freeze(['hijri', 'friday', 'ramadan', 'install']);

/**
 * Ramadan countdown window: outside it the card stays silent most of the
 * year instead of counting down three hundred days at a reader. 60 keeps
 * Sha'ban's approach visible without manufacturing anticipation.
 */
export const RAMADAN_COUNTDOWN_DAYS = 60;

/** YYYY-MM-DD key for a Date (local time) — mirrors reminderPresets. */
export function inviteDayKey(date = new Date()) {
  return dayKey(date);
}

/**
 * This week's Friday key via the preset anchor (reminderPresets owns what
 * "the Friday" means). On a Friday it equals today — that equality IS the
 * Friday trigger, so home.js never redefines Friday with getDay().
 */
export function fridayOf(date = new Date()) {
  return fridayAnchor(dayKey(date));
}

/** True on a Friday (the card's trigger), derived from the anchor. */
export function isFridayInviteDay(date = new Date()) {
  const today = dayKey(date);
  return fridayOf(date) === today;
}

/**
 * Ramadan card state for a day: in-season (day N of the fast), near
 * (countdown, honest estimate), or far (silent). Day counts come from
 * nextRamadan — never a pinned number here.
 */
export function ramadanInviteState(date = new Date()) {
  const { inRamadan, hijri } = ramadanInfo(date);
  if (inRamadan) return { mode: 'in', day: hijri.day };
  const next = nextRamadan(date);
  if (next.daysUntil <= RAMADAN_COUNTDOWN_DAYS) {
    return { mode: 'near', daysUntil: next.daysUntil, hijriYear: next.hijriYear };
  }
  return { mode: 'far', daysUntil: next.daysUntil, hijriYear: next.hijriYear };
}

/**
 * Hijri card state for a day: today's Hijri date plus the next upcoming
 * Islamic occasion (this Gregorian year, falling back to next year's —
 * a December reader still gets an invitation, not an empty card).
 * Labels stay in EVENT_LABELS (bilingual at render); dates are real
 * Dates, formatted by the view in the reader's locale.
 */
export function hijriInviteState(date = new Date()) {
  const hijri = toHijri(date);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const upcoming = (year) =>
    islamicEventsForYear(year)
      .filter((e) => e.date >= start)
      .sort((a, b) => a.date - b.date);
  const found = upcoming(date.getFullYear())[0] ?? upcoming(date.getFullYear() + 1)[0] ?? null;
  return {
    hijri,
    eventKey: found?.key ?? null,
    eventDate: found?.date ?? null,
  };
}

/**
 * Persistent calm dismissal: hidden when stamped today (settings-persisted,
 * so a reload honors the "no"), visible again when the day rolls over.
 * Hostile shapes (arrays, forged keys, non-strings) read as never
 * dismissed — junk can neither hide a card forever nor leak into the DOM.
 */
export function isInviteDismissed(dismissedInvites, id, date = new Date()) {
  if (
    !dismissedInvites ||
    typeof dismissedInvites !== 'object' ||
    Array.isArray(dismissedInvites)
  ) {
    return false;
  }
  const stamp = dismissedInvites[id];
  return typeof stamp === 'string' && stamp === dayKey(date);
}

/**
 * Whether an invitation may show on a day: dismissed-today wins over every
 * trigger (the reader said no; today honors it), then each card's own
 * season — Hijri always (orientation, not occasion), Friday on Fridays,
 * Ramadan in-season or approaching.
 */
export function shouldShowInvite(id, date = new Date(), dismissedInvites = {}) {
  if (!INVITE_IDS.includes(id)) return false;
  if (isInviteDismissed(dismissedInvites, id, date)) return false;
  if (id === 'hijri') return true;
  if (id === 'friday') return isFridayInviteDay(date);
  if (id === 'ramadan') return ramadanInviteState(date).mode !== 'far';
  // 'install' needs device + activity inputs this signature does not
  // carry — shouldShowInstallInvite below owns that trigger.
  return false;
}

/**
 * (v5.17.189, C19) the install invitation's trigger. Shown only to a
 * returning reader — INSTALL_INVITE_MIN_ACTIVE_DAYS distinct active days
 * (statistics owns what "active" means), so never on a first run — and
 * only while this device still has something to install: not already
 * installed, no "not now" inside its 7-day cooldown (install.js owns the
 * deferral memory), and today's calm dismissal clear. Every input is
 * injected; the view derives them from the store.
 */
export function shouldShowInstallInvite({
  activeDayCount = 0,
  platform = 'desktop',
  deferral = null,
  dismissedInvites = {},
  date = new Date(),
} = {}) {
  if (platform === 'installed') return false;
  if (!Number.isFinite(activeDayCount) || activeDayCount < INSTALL_INVITE_MIN_ACTIVE_DAYS) {
    return false;
  }
  if (!shouldReofferInstall(deferral, date.getTime())) return false;
  return !isInviteDismissed(dismissedInvites, 'install', date);
}
