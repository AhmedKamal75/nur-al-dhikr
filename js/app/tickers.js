/**
 * app/tickers.js — the live tickers (next-prayer + Ramadan countdowns),
 * nudge shown-marking, and the one-shot storage estimate probe.
 */

import { rt } from './rt.js';

import { VIEWS } from '../core/config.js';
import { actions, store } from '../core/state.js';
import { dateKey } from '../core/utils.js';
import { calculateTimes, nextPrayer } from '../domain/prayer.js';
import { fastPhase, formatCountdown } from '../domain/ramadan.js';

/* Ramadan: live Suhoor/Iftar countdown                                */
/* ------------------------------------------------------------------ */
// A per-second countdown must not flow through the store — dispatching
// every second would re-render the whole view and hammer localStorage
// (the store persists on every action). Instead, exactly like the Qibla
// compass heading, a single interval patches the countdown DOM node's
// text directly; the view itself only re-renders on real state changes.

export function ramadanTick() {
  const state = store.getState();
  if (state.activeView !== VIEWS.RAMADAN) return;
  const el = document.querySelector('[data-ramadan-countdown]');
  if (!el) return;

  const p = state.settings.prayer;
  if (p.latitude == null || p.longitude == null) return;

  const now = new Date();
  const tz = -now.getTimezoneOffset() / 60;
  const times = calculateTimes({
    date: now,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: tz,
    method: p.method,
    asr: p.asr,
  });
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowTimes = calculateTimes({
    date: tomorrow,
    latitude: p.latitude,
    longitude: p.longitude,
    // (v4.3) tomorrow's own UTC offset — reusing today's put tomorrow's
    // Fajr an hour off on the night a DST shift occurs.
    timezoneOffsetHours: -tomorrow.getTimezoneOffset() / 60,
    method: p.method,
    asr: p.asr,
  });

  const phase = fastPhase(now, times, tomorrowTimes.fajr);
  const nowMs =
    now.getHours() * 3600000 +
    now.getMinutes() * 60000 +
    now.getSeconds() * 1000 +
    now.getMilliseconds();
  let targetMs = phase.targetHours * 3600000;
  if (targetMs <= nowMs) targetMs += 86400000; // night phase counting into tomorrow
  el.textContent = formatCountdown(targetMs - nowMs);

  // Phase rollover (Iftar reached, or Suhoor end reached): the label data
  // is stale, so nudge a cheap re-render through a no-op-ish store action.
  // (v4.2) trigger on the TARGET actually changing, not on the final
  // pre-boundary second: the old `targetMs - nowMs < 1000` fired the tick
  // BEFORE the boundary, then the next tick jumped hours ahead — so the
  // Suhoor/Iftar label stayed stale for hours (until an unrelated render).
  const targetKey = `${phase.phase}:${targetMs}`;
  if (rt.ramadanTickerTarget !== targetKey) {
    rt.ramadanTickerTarget = targetKey;
    if (targetMs - nowMs > 1000) store.dispatch(actions.setSpeakingItem(null));
  }
}

export function updateRamadanLifecycle(state) {
  const onRamadan = state.activeView === VIEWS.RAMADAN;
  if (onRamadan && rt.ramadanTickerHandle == null) {
    ramadanTick();
    rt.ramadanTickerHandle = setInterval(ramadanTick, 1000);
  } else if (!onRamadan && rt.ramadanTickerHandle != null) {
    clearInterval(rt.ramadanTickerHandle);
    rt.ramadanTickerHandle = null;
  }
}

/* ------------------------------------------------------------------ */
/* Home: live next-prayer countdown                                    */
/* ------------------------------------------------------------------ */
// Same discipline as the Ramadan ticker: a per-second clock must not flow
// through the store (it would re-render Home and hit localStorage every
// second). One interval patches [data-home-countdown] directly; the view
// re-renders only on genuine state changes.

export function homeTick() {
  const state = store.getState();
  if (state.activeView !== VIEWS.HOME) return;
  const el = document.querySelector('[data-home-countdown]');
  if (!el) return;

  const p = state.settings.prayer;
  if (p.latitude == null || p.longitude == null) return;

  const now = new Date();
  const tz = -now.getTimezoneOffset() / 60;
  const times = calculateTimes({
    date: now,
    latitude: p.latitude,
    longitude: p.longitude,
    timezoneOffsetHours: tz,
    method: p.method,
    asr: p.asr,
  });
  if (!times) return;
  const next = nextPrayer(times, now);

  const nowHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const diffHours = (next.hours - nowHours + 24) % 24;
  const totalSec = Math.round(diffHours * 3600);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  el.textContent =
    h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;

  // Prayer rollover: the name/clock-time next to the countdown is now stale.
  // Nudge a cheap re-render the same way the Ramadan ticker does.
  // (v4.2) dispatch when the NEXT-PRAYER TARGET changes, not in the final
  // pre-boundary second: the old `totalSec < 1` nudge re-rendered the view
  // while it still showed the departing prayer, then the following tick
  // jumped to hours — "Next: Isha · 18:04" stayed up beside a countdown to
  // Fajr until some unrelated state change happened to re-render.
  if (rt.homeTickerTarget !== next.name) {
    rt.homeTickerTarget = next.name;
    if (totalSec > 1) store.dispatch(actions.setSpeakingItem(null));
  }

  // (v4.2) day rollover: a PWA left open overnight kept rendering
  // YESTERDAY's Hijri date chip, greeting window, and "today in worship"
  // rows for hours after midnight (this app's exact use case). homeTick
  // already runs every second — piggyback a date-key compare and dispatch
  // the cheap no-op re-render once when the local day flips.
  const dayKey = dateKey(now);
  if (rt.homeTickerDay !== dayKey) {
    const hadDay = rt.homeTickerDay != null;
    rt.homeTickerDay = dayKey;
    if (hadDay) store.dispatch(actions.setSpeakingItem(null));
  }
}

export function updateHomeTickerLifecycle(state) {
  const onHome = state.activeView === VIEWS.HOME;
  if (onHome && rt.homeTickerHandle == null) {
    homeTick();
    rt.homeTickerHandle = setInterval(homeTick, 1000);
  } else if (!onHome && rt.homeTickerHandle != null) {
    clearInterval(rt.homeTickerHandle);
    rt.homeTickerHandle = null;
  }
}

/* ------------------------------------------------------------------ */
/* Home: gentle nudge "shown" marking                                  */
/* ------------------------------------------------------------------ */
// v3.25: the nudge card records "shown" the moment it actually paints on
// Home (the same post-render effect discipline as the tickers above — no
// dispatch from inside the render). The guard is exact: the effect only
// fires when the recorded day differs from the device's today, and the
// reducer ignores any payload and writes its own today, so the loop
// terminates after one write. shouldShowNudge keeps a shown-today card up
// (no flicker after this dispatch); tomorrow the 7-day spacing takes over.

export function maybeMarkNudgeShown(state) {
  if (state.activeView !== VIEWS.HOME) return;
  if (!document.querySelector('[data-nudge-card]')) return;
  const todayKey = dateKey(new Date());
  if (store.getState().nudge?.lastShownKey === todayKey) return;
  store.dispatch(actions.markNudgeShown());
}

/* ------------------------------------------------------------------ */
/* Settings: storage estimate for the data-health panel                */
/* ------------------------------------------------------------------ */
// v3.26: navigator.storage.estimate() is async, so it rides the same
// post-render effect discipline as the tickers — one probe per session,
// dispatched once, rendered from state. Never dispatched on other views.

export function maybeProbeStorage(state) {
  if (rt.storageProbeStarted) return;
  if (state.activeView !== VIEWS.SETTINGS) return;
  rt.storageProbeStarted = true;
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    store.dispatch(actions.setDataHealthStorage({ unsupported: true }));
    return;
  }
  navigator.storage
    .estimate()
    .then(({ usage, quota }) => {
      store.dispatch(
        actions.setDataHealthStorage({
          usage: Number.isFinite(usage) ? usage : 0,
          quota: Number.isFinite(quota) ? quota : 0,
        })
      );
    })
    .catch(() => {
      store.dispatch(actions.setDataHealthStorage({ unsupported: true }));
    });
}
