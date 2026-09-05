/**
 * nudge.js — the gentle "it's been a while" line (v3.25.0). Pure, DOM-free.
 *
 * The TODO's own framing is the contract: most habit apps punish a broken
 * streak with guilt-inducing copy; this app already has enough real data
 * (last dhikr session, last Qur'an page, last prayer logged) to instead say
 * something quietly kind after a gap, with zero judgment, and mean it. So
 * the nudge:
 *   - fires ONLY on tracked activity that already exists (dhikr
 *     recitations, Qur'an pages, logged prayers) — someone who never used
 *     the app gets nothing, because there is nothing to return to;
 *   - never counts the absence: no "12 days", no dates, no numbers at all
 *     in any copy string (test-pinned);
 *   - never uses streak/shame vocabulary, in either language (test-pinned
 *     banned-word scan over every nudge.* key);
 *   - waits out the day-after-tomorrow boundary: activity yesterday is a
 *     life being lived, not a gap;
 *   - appears at most once per 7 days per quiet stretch, resets the moment
 *     real activity happens after a showing, and its dismissal is never
 *     held against anyone.
 *
 * Sources (read-only, pre-existing — nothing new is recorded):
 *   - state.statistics.dailyHistory[dateKey] ({recitations, pages})
 *   - state.dailyChecklist[dateKey] (tri-state prayer log, prayerLog.js)
 *
 * The only state this feature owns is nudge.lastShownKey (persisted, the
 * day the card last actually painted or was dismissed) and the ephemeral
 * nudgeDismissed session flag. Hostile shapes degrade exactly like
 * worship.js / review.js.
 */

import { dateKey } from '../core/utils.js';
import { keyToDate } from './review.js';
import { loggedCount } from './prayerLog.js';

/** Activity yesterday is not a gap; the nudge waits for a real absence. */
export const NUDGE_MIN_GAP_DAYS = 2;
/** Copy tiers: 2–6 days light, 7–29 warm, 30+ fresh start. */
export const NUDGE_WARM_DAYS = 7;
export const NUDGE_FRESH_DAYS = 30;
/** Quiet-stretch spacing: at most one showing per 7 days. */
export const NUDGE_REPEAT_DAYS = 7;

const DAY_MS = 86400000;

export function defaultNudgeState() {
  return { lastShownKey: null, lastDismissedKey: null };
}

/**
 * Restored/imported nudge slice: only real, today-or-earlier day keys
 * survive. A future "shown" day is junk (a shown-day can never be ahead
 * of the device) and would suppress every future nudge — dropped.
 */
export function sanitizeNudgeState(raw, today = new Date()) {
  const d = defaultNudgeState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const todayKey = dateKey(today);
  const shown = keyToDate(raw.lastShownKey);
  const dismissed = keyToDate(raw.lastDismissedKey);
  const shownKey = shown ? dateKey(shown) : null;
  const dismissedKey = dismissed ? dateKey(dismissed) : null;
  return {
    lastShownKey: shownKey && shownKey <= todayKey ? shownKey : null,
    lastDismissedKey: dismissedKey && dismissedKey <= todayKey ? dismissedKey : null,
  };
}

function objOf(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function asCount(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Whole local days from dateKey `a` to dateKey `b` (null on junk). */
function daysBetween(keyA, keyB) {
  const a = keyToDate(keyA);
  const b = keyToDate(keyB);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * The most recent day with tracked activity, and which kind it was.
 * Kind priority on a shared day: quran > dhikr > prayers — the bookmark
 * pointer is the most concrete "your place is saved" the app can offer.
 * Junk and rolled keys never enter the walk (the v3.21/v3.23 lesson).
 */
export function lastActivity(state, _today = new Date()) {
  // `_today` is accepted for signature symmetry with the module's other
  // entry points (injectable-clock convention); the walk itself is
  // clock-free — it only compares stored day keys.
  const history = objOf(state?.statistics?.dailyHistory);
  const checklist = objOf(state?.dailyChecklist);
  const last = { quran: null, dhikr: null, prayers: null };
  for (const [key, entry] of Object.entries(history)) {
    if (!keyToDate(key)) continue;
    if (asCount(entry?.pages) > 0 && (!last.quran || key > last.quran)) last.quran = key;
    if (asCount(entry?.recitations) > 0 && (!last.dhikr || key > last.dhikr)) last.dhikr = key;
  }
  for (const key of Object.keys(checklist)) {
    if (!keyToDate(key)) continue;
    if (loggedCount(checklist[key]) > 0 && (!last.prayers || key > last.prayers)) {
      last.prayers = key;
    }
  }
  let overall = null;
  for (const k of Object.values(last)) {
    if (k && (!overall || k > overall)) overall = k;
  }
  if (!overall) return null;
  const kind = ['quran', 'dhikr', 'prayers'].find((k) => last[k] === overall);
  return { key: overall, kind };
}

/**
 * The nudge decision. null means "say nothing" — the most common answer,
 * and the only honest one for a stranger to the app or an active day.
 * gapDays is carried for tests and cycle logic only; the view NEVER
 * renders it (the absence is never counted in front of the person).
 */
export function computeNudge(state, today = new Date()) {
  const act = lastActivity(state, today);
  if (!act) return null;
  const gap = daysBetween(act.key, dateKey(today));
  if (gap == null || gap < NUDGE_MIN_GAP_DAYS) return null;
  const tier = gap >= NUDGE_FRESH_DAYS ? 'fresh' : gap >= NUDGE_WARM_DAYS ? 'warm' : 'light';
  return { kind: act.kind, tier, sinceKey: act.key, gapDays: gap };
}

/**
 * Whether the episode may show today. "Shown" means the day the card last
 * actually painted (recorded by the app.js effect); "dismissed" the day it
 * was sent away:
 *   - dismissed TODAY -> hidden for the whole day, reloads included (the
 *     session flag only covers the running session; this persisted marker
 *     means "I said no today" and today is honored);
 *   - never shown -> show;
 *   - shown today -> keep showing (the day's decision stands; the mark
 *     dispatch after render must never flicker the card away);
 *   - 7+ days since shown -> one more line is allowed;
 *   - activity AFTER the last shown day -> fresh episode, show (they came
 *     back on their own; the next quiet stretch deserves its own line).
 * Both stored days are read through sanitizeNudgeState, so hostile or
 * junk keys (including forged future ones) degrade to "never": they can
 * neither schedule a silence nor leak into the DOM.
 */
export function shouldShowNudge(state, nudge, today = new Date()) {
  if (!nudge) return false;
  if (state?.nudgeDismissed === true) return false;
  const clean = sanitizeNudgeState(state?.nudge, today);
  const todayKey = dateKey(today);
  if (clean.lastDismissedKey === todayKey) return false;
  if (!clean.lastShownKey) return true;
  if (clean.lastShownKey === todayKey) return true;
  const since = daysBetween(clean.lastShownKey, todayKey);
  if (since >= NUDGE_REPEAT_DAYS) return true;
  return nudge.sinceKey > clean.lastShownKey;
}
