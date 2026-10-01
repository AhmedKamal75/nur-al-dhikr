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

/* ------------------------------------------------------------------ */
/* (v5.17.55, merged-plan item 8) Lamp mode policy + palette            */
/*                                                                     */
/* The lamp is a recitation SHELF, not a second player: it reuses the   */
/* existing verse-engine transport (recite-*-toggle/next/prev) and the  */
/* existing sleep ladder (recite-sleep-cycle) with no new data-actions  */
/* and no new settings keys. Adab: auto-advance defaults OFF and the    */
/* session stays surah-scoped — reaching the last ayah ends it, never   */
/* an endless loop. The view renders no listen/loop/repeat controls.    */
/*                                                                     */
/* Palette (rule 6: static pins name their source — APP-FLOW §5 ambient  */
/* keeps its own exit + wake lock; the warm low-light direction reuses  */
/* the existing fullscreen glass-bar tokens, so no new custom           */
/* properties are introduced):                                          */
/*   ground mirrors --fs-bar-bg (#10201a, assets/css/variables.css),    */
/*   amber  mirrors --fs-bar-gold (#d4bd77, same file).                  */
/* Capped luminance (≤ LAMP_LUMINANCE_CAP) keeps the shelf dim: no pure  */
/* white, no blue-dominant ink.                                         */
/* ------------------------------------------------------------------ */

/** Auto-advance default for the lamp shelf: OFF, always. Pure. */
export function lampAutoAdvanceDefault() {
  return false;
}

/** Should the lamp advance past the current wird on its own? Never — the
 *  person advances ayah by ayah, and the engine stops at the last ayah. */
export function lampShouldAutoAdvance() {
  return false;
}

/** Warm low-light palette (mirrors --fs-bar-bg / --fs-bar-gold). */
export const LAMP_GROUND = '#10201a';
export const LAMP_AMBER = '#d4bd77';
export const LAMP_LUMINANCE_CAP = 0.6;

/** Relative luminance of a #rrggbb hex (WCAG formula). Pure. */
export function lampLuminance(hex) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return NaN;
  const [r, g, b] = [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)].map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Blue-dominant ink reads as cold light — the lamp never uses it. Pure. */
export function lampIsBlueDominant(hex) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return b > r && b > g;
}

/** True when the whole lamp palette holds the dim-warm contract. Pure. */
export function lampPaletteHoldsCap() {
  return (
    [LAMP_GROUND, LAMP_AMBER].every((c) => {
      const l = lampLuminance(c);
      return Number.isFinite(l) && l <= LAMP_LUMINANCE_CAP;
    }) &&
    ![LAMP_GROUND, LAMP_AMBER].some((c) => c.toLowerCase() === '#ffffff') &&
    ![LAMP_GROUND, LAMP_AMBER].some(lampIsBlueDominant)
  );
}
