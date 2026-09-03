/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { fetchJSON } from '../net.js';

import { MUSHAF_META_URL, QURAN_META_URL } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { escapeHTML } from '../../core/utils.js';
import { openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { SLEEP_TIMER_CHOICES } from '../../domain/sleepTimer.js';
import * as player from '../../services/player.js';
import * as surahPlayback from '../../services/surahPlayback.js';

export const clickHandlers = {
  'surah-play': async (ds) => {
    const surah = parseInt(ds.surah, 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) return;
    const sp = store.getState().surahPlayback;
    if (sp.active && sp.surah === surah && !ds.from && !ds.to) {
      surahPlayback.stop();
      return;
    }
    // The engine needs surah ayahCounts (quran-meta) and, for Mushaf page
    // following, the ayahPages index (mushaf-meta) — both lazily loaded.
    let state = store.getState();
    try {
      if (!state.quran.meta) {
        const meta = await fetchJSON(QURAN_META_URL);
        store.dispatch(actions.setQuranMeta(meta));
        state = store.getState();
      }
      if (!state.mushaf.meta) {
        const meta = await fetchJSON(MUSHAF_META_URL);
        store.dispatch(actions.setMushafMeta(meta));
        state = store.getState();
      }
      // One voice: the full-surah player yields to recitation.
      const p = state.player;
      if (p?.moshafId && p.playing) {
        player.pause();
        store.dispatch(actions.setAudioPlayer({ playing: false }));
      }
      // (v5.0.0) an ayah RANGE (data-from / data-to) bounds the session:
      // "play 1–10" ends at 10; absent both = the whole surah (v4 behavior).
      surahPlayback.start({
        surah,
        from: parseInt(ds.ayah, 10) || parseInt(ds.from, 10) || 1,
        to: ds.to ? parseInt(ds.to, 10) : null,
        total: state.quran.meta.surahs.find((x) => Number(x.number) === surah)?.ayahCount,
        reciterId: state.settings.reciter,
        surahsMeta: state.quran.meta.surahs,
        repeat: state.settings.audio?.ayahRepeat,
      });
    } catch (err) {
      console.error('[surah-playback] failed to start', err);
      showToast(t('audio.reciteStartFailed', store.getState().settings.language));
    }
  },

  /* (v5.0.0) The ayah-range picker — "play from ayah X to ayah Y". */
  'quran-range-open': (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    const surah = parseInt(ds.surah, 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) return;
    const meta = state.quran.meta?.surahs?.find((x) => Number(x.number) === surah);
    const count = meta?.ayahCount || 7;
    const name = meta ? `${meta.nameEn || meta.name} ` : '';
    const options = (selected) =>
      Array.from(
        { length: count },
        (_, i) =>
          `<option value="${i + 1}" ${i + 1 === selected ? 'selected' : ''}>${i + 1}</option>`
      ).join('');
    openModal(
      `
      <form class="editor-form" data-form="quran-range" data-surah="${surah}">
        <h2 id="modal-title-range">${t('audio.rangeTitle', lang)}</h2>
        <p class="editor-form__note">${escapeHTML(name)}· ${t('quran.ayahCount', lang, { n: count })}</p>
        <label class="field">${t('audio.rangeFrom', lang)}<select class="select" name="from">${options(1)}</select></label>
        <label class="field">${t('audio.rangeTo', lang)}<select class="select" name="to">${options(count)}</select></label>
        <div class="editor-form__actions">
          <button type="button" class="btn btn--ghost" data-action="modal-close">${t('editor.cancel', lang)}</button>
          <button type="submit" class="btn btn--primary">${t('audio.rangePlay', lang)}</button>
        </div>
      </form>`,
      { labelledBy: 'modal-title-range' }
    );
  },

  'recite-stop': () => {
    surahPlayback.stop();
  },

  'recite-follow-toggle': () => {
    const next = !(store.getState().settings.audio.ayahFollow ?? true);
    store.dispatch(
      actions.updateSettings({ audio: { ...store.getState().settings.audio, ayahFollow: next } })
    );
    surahPlayback.setFollow(next);
  },

  // v3.17 hifz: per-ayah repeat budget — cycles 1→3→5→10→∞→1, persists as
  // the default for future sessions, and live-applies to the running one.
  // Both dispatches are batched into one render; setRepeat's snapshot is
  // mirrored into state so the chip reflects the change immediately.
  'recite-repeat-toggle': () => {
    const cur = store.getState().settings.audio?.ayahRepeat ?? 1;
    const next = surahPlayback.nextRepeat(cur);
    store.batch(() => {
      store.dispatch(
        actions.updateSettings({
          audio: { ...store.getState().settings.audio, ayahRepeat: next },
        })
      );
      store.dispatch(actions.setSurahPlayback(surahPlayback.setRepeat(next)));
    });
  },

  'recite-ayah-next': () => {
    surahPlayback.skip(1);
  },

  'recite-ayah-prev': () => {
    surahPlayback.skip(-1);
  },

  // (v4.4) Listen mode — continuous multi-surah playback: when the current
  // surah's last ayah ends, the engine rolls on to the next surah instead
  // of closing the session. The chip mirrors the live session snapshot.
  'recite-listen-toggle': () => {
    const state = store.getState();
    const next = !(state.surahPlayback?.continuous === true);
    surahPlayback.setContinuous(next);
    store.dispatch(actions.setSurahPlayback(surahPlayback.snapshot()));
    showToast(t(next ? 'audio.listenOn' : 'audio.listenOff', store.getState().settings.language));
  },

  // (v4.4) Sleep timer for listen mode — cycles off → 15 → 30 → 45 → 60 →
  // off (the same ladder as SLEEP_TIMER_CHOICES). A tap while the timer is
  // armed moves to the NEXT rung, so shrinking an armed 60-minute timer
  // never requires turning it off first. Volume ramps down over the final
  // 90 seconds (domain/sleepTimer.js) instead of a cliff-edge stop.
  'recite-sleep-cycle': () => {
    const snap = surahPlayback.sleepSnapshot();
    const ladder = [null, ...SLEEP_TIMER_CHOICES];
    const idx = snap.enabled ? ladder.indexOf(snap.minutes) : 0;
    const next = ladder[(idx + 1) % ladder.length];
    if (next == null) {
      surahPlayback.clearSleepTimer();
      showToast(t('audio.sleepOff', store.getState().settings.language));
      return;
    }
    surahPlayback.armSleepTimer(next);
    store.dispatch(actions.setSurahPlayback(surahPlayback.snapshot()));
    showToast(t('audio.sleepArmed', store.getState().settings.language, { n: next }));
  },

  // v3.17 hifz memorize mode — session + cloze reveal actions. Session
  // state is ephemeral; record actions delegate to the pure js/hifz.js
};
