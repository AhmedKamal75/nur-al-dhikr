import { scrollBehavior } from '../core/utils.js';
import { rt } from './rt.js';
import { playFlipSound } from './inputs.js';
import * as gapTelemetry from '../services/gapTelemetry.js';

import { VIEWS } from '../core/config.js';
import { go } from '../core/router.js';
import {
  clampPage,
  mushafSpreadActive,
  resolvePage as resolveMushafPage,
  spreadRightPage,
} from '../services/mushaf.js';
import { setFlipDirection } from '../ui/readingTokens.js';

/**
 * app/recitationFollow.js — follow-along effects for continuous
 * recitation (auto-scroll + Mushaf page flips per ayah).
 */

/* Continuous recitation: follow effects (v3.10)                        */
/* ------------------------------------------------------------------ */
// The engine mirrors progress into state.surahPlayback; this effect keeps
// the VIEW synced when "follow" is on: the classic reader scrolls to the
// reciting ayah, the Mushaf flips to the right PAGE and then scrolls the
// ayah into view. Fires only on ayah CHANGES — never on every render — so
// the person can still scroll freely between verses.

function perfNow() {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function')
      return performance.now();
  } catch {
    /* fall through */
  }
  return Date.now();
}

export function maybeFollowRecitation(state) {
  const sp = state.surahPlayback;
  if (!sp.active || !sp.ayah) {
    rt.lastFollowedAyahKey = null;
    return;
  }
  if (!(state.settings.audio.ayahFollow ?? true)) return;
  const key = `${sp.surah}:${sp.ayah}`;
  if (key === rt.lastFollowedAyahKey) return;
  rt.lastFollowedAyahKey = key;
  // (v5.11.0 C) follow-effect cost: time the sync decision work; the
  // applied mark lands at each completion point below. Both no-op unless
  // gap telemetry is opted in. The gap deliberately stops at effect
  // EXECUTION, not paint (see gapTelemetry.js).
  const measure = gapTelemetry.isEnabled();
  const t0 = measure ? perfNow() : 0;
  const done = () => {
    if (!measure) return;
    gapTelemetry.recordEffect(perfNow() - t0);
    gapTelemetry.markApplied(key);
  };

  if (
    state.activeView === VIEWS.QURAN &&
    String(state.activeParams?.id || '') === String(sp.surah)
  ) {
    requestAnimationFrame(() => {
      document
        .getElementById(`ayah-${CSS.escape(String(sp.ayah))}`)
        ?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
      done();
    });
    return;
  }

  if (state.activeView === VIEWS.MUSHAF) {
    const meta = state.mushaf.meta;
    const page = meta ? resolveMushafPage(meta.ayahPages, sp.surah, sp.ayah) : null;
    if (!page) return;
    const current = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
    // In a two-page spread both facing pages are already on screen — only
    // turn when the ayah's spread differs from the visible one. Comparing
    // raw pages here flipped pointlessly (and pushed a history entry) every
    // time recitation crossed from the right to the left facing page.
    const spreadOn = mushafSpreadActive(state.settings.mushafPrefs);
    const target = spreadOn ? spreadRightPage(page) : page;
    const shown = spreadOn ? spreadRightPage(current) : current;
    if (target !== shown) {
      setFlipDirection(target > shown ? 'next' : 'prev');
      playFlipSound();
      go(VIEWS.MUSHAF, { page: String(page) });
      done();
      return;
    }
    requestAnimationFrame(() => {
      document
        .querySelector(`.mushaf-ayah[data-surah="${sp.surah}"][data-ayah="${sp.ayah}"]`)
        ?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
      done();
    });
  }
}
