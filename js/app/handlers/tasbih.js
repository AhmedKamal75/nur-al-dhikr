/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { actions, selectors, store } from '../../core/state.js';
import { t } from '../../core/i18n.js';
import { vibrate } from '../../core/utils.js';
import * as tasbih from '../../services/tasbih.js';
import { showToast } from '../../ui/toast.js';
import { triggerRipple } from './items.js';
import { PRESETS as TASBIH_PRESETS } from '../../views/tasbih.js';
import * as floating from '../../services/floatingCounter.js';

/**
 * The reader-facing name of a tasbih phrase, for the floating window's label.
 * Presets carry both scripts ({ ar, en }); a user-authored phrase is free
 * text and is shown as the reader typed it.
 */
function tasbihPhraseLabel(state, phraseId) {
  const lang = state.settings.language;
  const preset = TASBIH_PRESETS.find((p) => p.id === phraseId);
  if (preset) return String(lang === 'ar' ? preset.ar : preset.en || '');
  const customs = Array.isArray(state.tasbihCustom) ? state.tasbihCustom : [];
  const custom = customs.find((c) => c && c.id === phraseId);
  return custom ? String(custom.text || '') : t('nav.tasbih', lang);
}

export const clickHandlers = {
  'tasbih-select': (ds) => {
    store.dispatch(actions.setTasbihActive(ds.phraseId));
  },

  'tasbih-tap': (ds, e) => {
    const target = parseInt(ds.target, 10) || 33;
    tasbih.increment('tasbih:' + ds.phraseId, 'tasbih-dhikr', target);
    const state = store.getState();
    if (state.settings.tapRipple && e) {
      // (see items.js — the re-render detaches the tapped node; defer)
      const phraseId = ds.phraseId;
      requestAnimationFrame(() => {
        const fresh = document.querySelector(
          `.tasbih-stage[data-phrase-id="${CSS.escape(phraseId)}"]`
        );
        if (fresh) triggerRipple(fresh, e);
      });
    }
  },

  'tasbih-reset': (ds) => {
    const preset = TASBIH_PRESETS.find((p) => p.id === ds.phraseId);
    const customs = store.getState().tasbihCustom;
    const custom =
      !preset && Array.isArray(customs) ? customs.find((c) => c && c.id === ds.phraseId) : null;
    tasbih.reset(
      'tasbih:' + ds.phraseId,
      parseInt(ds.target, 10) || preset?.target || custom?.target || 33
    );
  },

  'tasbih-target-step': (ds) => {
    const key = 'tasbih:' + ds.phraseId;
    const counter = tasbih.getCounter(key, 33);
    const delta = parseInt(ds.delta, 10) || 0;
    // Same 100000 ceiling as the direct-set path — an uncapped hold on +
    // used to walk the target into the absurd.
    const nextTarget = Math.min(100000, Math.max(1, counter.target + delta));
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

  // (v5.2.46) user-authored phrases: free text + named goal, same journal
  // discipline (read the live inputs, clear them on save so a stale value
  // never reads as a failed save). The counter rides the generic
  // 'tasbih:'+id key through the shared increment().
  'tasbih-custom-save': () => {
    const lang = store.getState().settings.language;
    const textEl = document.querySelector('[data-bind="tasbih-custom-text"]');
    const targetEl = document.querySelector('[data-bind="tasbih-custom-target"]');
    const text = String(textEl?.value || '').trim();
    if (!text) {
      showToast(t('tasbih.customEmpty', lang));
      return;
    }
    const target = Math.min(100000, Math.max(1, parseInt(targetEl?.value, 10) || 33));
    store.dispatch(actions.tasbihCustomAdd(text, target));
    if (textEl) textEl.value = '';
    if (targetEl) targetEl.value = '33';
    const state = store.getState();
    if (state.settings.hapticsEnabled) vibrate(10);
    showToast(t('tasbih.customAdded', state.settings.language));
  },

  'tasbih-custom-remove': (ds) => {
    if (!ds.id) return;
    store.dispatch(actions.tasbihCustomRemove(ds.id));
  },

  /**
   * (v5.17.15) pop the counter into a floating window so it can be counted
   * while doing something else — a reader working, walking or cooking should
   * not have to keep the tab in front. Backed by Document Picture-in-Picture
   * (no permission, no native code); see services/floatingCounter.js for why
   * the affordance is feature-gated rather than always shown.
   */
  'tasbih-float': async (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    const key = 'tasbih:' + ds.phraseId;
    const counter = selectors.getCounter(state, key) || { count: 0, target: 33 };
    const phrase = tasbihPhraseLabel(state, ds.phraseId);
    if (floating.isOpen()) {
      // Second tap closes it: one control, both directions, and no second
      // orphan window to leave floating with a stale count.
      floating.closeFloatingCounter();
      store.dispatch(actions.tasbihFloatSet(false));
      return;
    }
    const result = await floating.openFloatingCounter({
      label: phrase,
      count: counter.count || 0,
      target: counter.target || 33,
      lang,
    });
    store.dispatch(actions.tasbihFloatSet(result.ok));
    if (!result.ok) {
      // Honest failure. 'unsupported' cannot normally happen (the view hides
      // the button) but a race with a browser update must not be silent.
      showToast(
        t(result.reason === 'unsupported' ? 'tasbih.floatUnsupported' : 'tasbih.floatFailed', lang)
      );
    }
  },
};
