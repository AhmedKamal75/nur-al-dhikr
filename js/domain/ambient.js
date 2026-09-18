/**
 * domain/ambient.js (v5.10.1) — Nightstand content picks. The countdown
 * itself stays live math in the view (domain/prayerTimeline.js); this
 * module owns the two slow-rotation modes: the verse of the day (same
 * deterministic day-seeded pool as Home, theme 'any') and a short dhikr
 * that changes daily (short Arabic only — a nightstand line must fit one
 * glance at arm's length).
 */
import { pickDailyItemThemed } from './dailyAyah.js';

/** Verse slide: null until the library corpus is loaded. */
export function ambientVerse(itemIndex, today = new Date()) {
  const entry = pickDailyItemThemed(itemIndex, 'any', today);
  return entry || null;
}

/**
 * Dhikr slide: day-rotated pick among short items (Arabic ≤ 140 chars,
 * must have Arabic). Null when nothing qualifies (corpus not loaded).
 */
export function ambientDhikr(itemIndex, today = new Date()) {
  const all = Object.values(itemIndex || {}).filter(
    (e) =>
      e?.item?.arabic &&
      typeof e.item.arabic === 'string' &&
      e.item.arabic.length <= 140 &&
      e?.document?.metadata?.id !== 'asma'
  );
  if (!all.length) return null;
  const t = today instanceof Date && !Number.isNaN(today.getTime()) ? today : new Date();
  const seed = t.getFullYear() + (t.getMonth() + 1) + t.getDate();
  return all[seed % all.length];
}
