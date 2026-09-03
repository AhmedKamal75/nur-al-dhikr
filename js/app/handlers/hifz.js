/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { actions, store } from '../../core/state.js';

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
