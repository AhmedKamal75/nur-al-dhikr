/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { actions, store } from '../../core/state.js';
import * as tasbih from '../../services/tasbih.js';
import { triggerRipple } from './items.js';
import { PRESETS as TASBIH_PRESETS } from '../../views/tasbih.js';

export const clickHandlers = {
  'tasbih-select': (ds) => {
    store.dispatch(actions.setTasbihActive(ds.phraseId));
  },

  'tasbih-tap': (ds, e) => {
    const target = parseInt(ds.target, 10) || 33;
    const result = tasbih.increment('tasbih:' + ds.phraseId, 'tasbih-dhikr', target);
    tasbih.playTick(result.cycleCompleted ? 'complete' : 'tick');
    // (v5.0.0) the same counting-feedback trio as the azkar cards.
    const state = store.getState();
    if (state.settings.hapticsEnabled && navigator.vibrate) {
      navigator.vibrate(result.cycleCompleted ? [12, 40, 18] : 10);
    }
    if (state.settings.tapRipple && e) {
      // (see items.js — the re-render detaches the tapped node; defer)
      const phraseId = ds.phraseId;
      requestAnimationFrame(() => {
        const fresh =
          document.querySelector(`[data-phrase-id="${CSS.escape(phraseId)}"]`) ||
          document.querySelector('.tasbih-stage');
        if (fresh) triggerRipple(fresh, e);
      });
    }
  },

  'tasbih-reset': (ds) => {
    const preset = TASBIH_PRESETS.find((p) => p.id === ds.phraseId);
    tasbih.reset('tasbih:' + ds.phraseId, parseInt(ds.target, 10) || preset?.target || 33);
  },

  'tasbih-target-step': (ds) => {
    const key = 'tasbih:' + ds.phraseId;
    const counter = tasbih.getCounter(key, 33);
    const delta = parseInt(ds.delta, 10) || 0;
    const nextTarget = Math.max(1, counter.target + delta);
    tasbih.setTarget(key, nextTarget);
  },

  // (v4.2) direct target presets — stepping 33 → 100 one tap at a time was
  // 67 presses. The chips set the target outright; the global announcer
  // (#counter-announcer) speaks the new target via setTarget's announce.
  'tasbih-target-set': (ds) => {
    const key = 'tasbih:' + ds.phraseId;
    const target = Math.max(1, Math.min(100000, parseInt(ds.target, 10) || 33));
    tasbih.setTarget(key, target);
  },
};
