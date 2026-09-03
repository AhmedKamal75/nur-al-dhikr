import { scrollBehavior } from '../core/utils.js';
import { rt } from './rt.js';
import { playFlipSound } from './inputs.js';

import { VIEWS } from '../core/config.js';
import { go } from '../core/router.js';
import { clampPage, resolvePage as resolveMushafPage } from '../services/mushaf.js';
import { setFlipDirection } from '../views/mushafReader.js';

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

  if (
    state.activeView === VIEWS.QURAN &&
    String(state.activeParams?.id || '') === String(sp.surah)
  ) {
    requestAnimationFrame(() => {
      document
        .getElementById(`ayah-${CSS.escape(String(sp.ayah))}`)
        ?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    });
    return;
  }

  if (state.activeView === VIEWS.MUSHAF) {
    const meta = state.mushaf.meta;
    const page = meta ? resolveMushafPage(meta.ayahPages, sp.surah, sp.ayah) : null;
    if (!page) return;
    const current = clampPage(state.activeParams.page || state.mushafBookmark.page || 1);
    if (page !== current) {
      setFlipDirection(page > current ? 'next' : 'prev');
      playFlipSound();
      go(VIEWS.MUSHAF, { page: String(page) });
      return;
    }
    requestAnimationFrame(() => {
      document
        .querySelector(`.mushaf-ayah[data-surah="${sp.surah}"][data-ayah="${sp.ayah}"]`)
        ?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    });
  }
}
