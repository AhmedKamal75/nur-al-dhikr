/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { actions, store } from '../../core/state.js';
import { buildMcqOptions } from '../../domain/hifz.js';

export const clickHandlers = {
  'hifz-toggle': (ds) => {
    const st = store.getState();
    const s = Number(ds.surah);
    if (st.hifzSession.mode && Number(st.hifzSession.surah) === s) {
      store.dispatch(actions.hifzSessionEnd());
    } else {
      store.dispatch(actions.hifzSessionStart({ surah: s, level: st.hifzSession.level }));
    }
  },

  'hifz-level': (ds) => {
    store.dispatch(actions.hifzLevel(ds.level));
  },

  'hifz-reveal': (ds) => {
    store.dispatch(
      actions.hifzReveal({ ayah: Number(ds.ayah), word: ds.word != null ? Number(ds.word) : null })
    );
  },

  'hifz-rehide': () => {
    store.dispatch(actions.hifzRehide());
  },

  'hifz-mark': (ds) => {
    store.dispatch(actions.hifzMarkMemorized({ surah: Number(ds.surah) }));
  },

  // Recall checks: first-word prompt (render-side) or translation MCQ
  // (a fresh question is dealt immediately so the panel never idles).
  'hifz-test': (ds) => {
    const test = ds.test === 'firstword' || ds.test === 'mcq' ? ds.test : null;
    store.dispatch(actions.hifzTest(test));
    if (test === 'mcq') dealMcq();
  },

  'hifz-mcq-new': () => {
    dealMcq();
  },

  'hifz-mcq-pick': (ds) => {
    store.dispatch(actions.hifzMcqPick(Number(ds.ayah)));
  },

  'hifz-review': (ds) => {
    store.dispatch(
      actions.hifzReview({
        surah: Number(ds.surah),
        grade: ds.grade === 'again' ? 'again' : 'easy',
      })
    );
  },

  // v3.18 voluntary fasting — prefs only; the fasts themselves reuse the
};

/**
 * Deal one translation-matching question from the live memorize surah:
 * a random ayah + distractors from its siblings. No-ops (with the test
 * left armed but questionless) when the surah doc isn't loaded.
 */
function dealMcq() {
  const st = store.getState();
  const sess = st.hifzSession;
  if (!sess?.mode) return;
  const doc = st.quran.surahs[String(sess.surah)];
  const ayahs = doc?.ayahs;
  if (!Array.isArray(ayahs) || !ayahs.length) return;
  const pick = ayahs[Math.floor(Math.random() * ayahs.length)];
  const options = buildMcqOptions(ayahs, pick.number);
  if (!options.length) return;
  store.dispatch(actions.hifzMcqNew({ ayah: pick.number, options }));
}
