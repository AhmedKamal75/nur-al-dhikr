/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { fetchJSON } from '../net.js';

import { MUSHAF_META_URL, QURAN_META_URL, QURAN_RECITERS } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { escapeHTML } from '../../core/utils.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { SLEEP_TIMER_CHOICES } from '../../domain/sleepTimer.js';
import * as mediaSession from '../../services/mediaSession.js';
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
    // Starting playback from a picker modal (multi-surah page, voice list)
    // dismisses it — otherwise the session plays behind a stale overlay.
    // closeModal() is a safe no-op when nothing is open (toolbar taps).
    closeModal();
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
        reciterIdB: state.settings.reciterB,
        compare: state.settings.reciterCompare === true,
        surahsMeta: state.quran.meta.surahs,
        repeat: state.settings.audio?.ayahRepeat,
        loop: parseInt(ds.loop, 10) || 1,
        speed: state.settings.audio?.verseRate ?? 1,
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
        <label class="field">${t('audio.rangeLoop', lang)}<select class="select" name="loop">
          ${surahPlayback.LOOP_CYCLE.map(
            (n) =>
              `<option value="${n}" ${n === 1 ? 'selected' : ''}>${n === 1 ? t('audio.loopOnce', lang) : `×${n}`}</option>`
          ).join('')}
        </select></label>
        ${buildRangeSaveRow(state, lang)}
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
    mediaSession.clearMetadata();
  },

  // Reciter picker from inside the player console (both voices): voice A
  // restarts the current ayah immediately; voice B arms compare mode's
  // second pass. Same allowlisted QURAN_RECITERS set as Settings.
  'recite-voice-open': () => {
    openModal(buildReciterPick(store.getState()), { labelledBy: 'modal-title-reciter' });
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

  // Bounds loop (A–B loop ×N): cycles 1→2→3→5→10→1 passes over the
  // session bounds. Mirrored into state so the chip shows the live budget.
  'recite-loop-toggle': () => {
    const cur = store.getState().surahPlayback?.loop ?? 1;
    const next = surahPlayback.nextLoop(cur);
    store.dispatch(actions.setSurahPlayback(surahPlayback.setLoop(next)));
    showToast(
      t(next === 1 ? 'audio.loopOff' : 'audio.loopOn', store.getState().settings.language, {
        n: next,
      })
    );
  },

  // Verse speed: cycles the shared ladder and persists it as the default
  // for future sessions (same pattern as the per-ayah repeat default).
  'recite-speed-cycle': () => {
    const cur = store.getState().settings.audio?.verseRate ?? 1;
    const next = surahPlayback.nextSpeed(cur);
    store.batch(() => {
      store.dispatch(
        actions.updateSettings({
          audio: { ...store.getState().settings.audio, verseRate: next },
        })
      );
      store.dispatch(actions.setSurahPlayback(surahPlayback.setSpeed(next)));
    });
  },

  'recite-ayah-next': () => {
    surahPlayback.skip(1);
  },

  'recite-ayah-prev': () => {
    surahPlayback.skip(-1);
  },

  // Compare-two-reciters (A then the same ayah with B): persists the
  // preference AND live-applies it to the running session. Needs a B
  // voice — without one it says so instead of silently doing nothing.
  'recite-compare-toggle': () => {
    const state = store.getState();
    const next = !(state.surahPlayback?.compare === true);
    if (next && !state.settings.reciterB) {
      showToast(t('audio.compareNeedB', state.settings.language));
      return;
    }
    store.batch(() => {
      store.dispatch(actions.updateSettings({ reciterCompare: next }));
      store.dispatch(actions.setSurahPlayback(surahPlayback.setCompare(next)));
    });
    showToast(t(next ? 'audio.compareOn' : 'audio.compareOff', state.settings.language));
  },

  // Switch voice B from inside the player (the picker rows dispatch
  // set-setting directly; this keeps the session + pref in one gesture).
  // An empty value clears voice B (compare off). The picker re-opens so
  // the check marks reflect the new choice instead of going stale.
  'recite-voice-b': (ds) => {
    if (ds.value == null) return;
    const b = ds.value === '' ? null : ds.value;
    store.batch(() => {
      store.dispatch(actions.updateSettings({ reciterB: b, reciterCompare: false }));
      if (surahPlayback.isActive())
        store.dispatch(actions.setSurahPlayback(surahPlayback.setReciterB(b)));
    });
    if (ds.refresh === 'recite-voice-open')
      openModal(buildReciterPick(store.getState()), { labelledBy: 'modal-title-reciter' });
  },

  // (v5.2.0) Echo mode — listen-and-repeat: after each ayah the engine
  // holds a silence for the listener to recite it back, then advances.
  'recite-echo-toggle': () => {
    const next = !(store.getState().surahPlayback?.listenRepeat === true);
    store.dispatch(actions.setSurahPlayback(surahPlayback.setListenRepeat(next)));
    showToast(t(next ? 'audio.echoOn' : 'audio.echoOff', store.getState().settings.language));
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
      // Mirror the cleared timer into state — without this the chip keeps
      // showing the old countdown until some unrelated re-render.
      store.dispatch(actions.setSurahPlayback(surahPlayback.snapshot()));
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

/**
 * Range-picker "save to queue" row: only when at least one queue exists
 * (creation lives in the Audio view's queue panel, one tap away).
 */
function buildRangeSaveRow(state, lang) {
  const lists = state.playlists || [];
  if (!lists.length) return '';
  return `
        <label class="field">${t('playlist.saveRange', lang)}<select class="select" name="playlist">
          ${lists.map((p) => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)} (${p.items.length})</option>`).join('')}
        </select></label>
        <div class="editor-form__actions">
          <button type="button" class="btn btn--secondary btn--sm" data-action="playlist-save-range">${t('playlist.saveRangeBtn', lang)}</button>
        </div>`;
}

/**
 * In-player reciter picker (voices A + B). Pure template over settings —
 * re-rendered in place after each pick so the check marks never go stale.
 */
export function buildReciterPick(state) {
  const lang = state.settings.language;
  const a = state.settings.reciter;
  const b = state.settings.reciterB;
  const check = '<span aria-hidden="true">✓</span>';
  const listA = QURAN_RECITERS.map(
    (r) => `
      <button type="button" class="reciter-row ${a === r.id ? 'reciter-row--active' : ''}" data-action="set-setting" data-key="reciter" data-value="${escapeHTML(r.id)}" data-refresh="recite-voice-open" aria-pressed="${a === r.id}">
        <span class="reciter-row__name">${escapeHTML(lang === 'ar' ? r.nameAr : r.nameEn)}</span>
        ${a === r.id ? check : ''}
      </button>`
  ).join('');
  const listB =
    `
      <button type="button" class="reciter-row ${!b ? 'reciter-row--active' : ''}" data-action="recite-voice-b" data-value="" data-refresh="recite-voice-open" aria-pressed="${!b}">
        <span class="reciter-row__name">${escapeHTML(t('audio.noSecondVoice', lang))}</span>
        ${!b ? check : ''}
      </button>` +
    QURAN_RECITERS.map(
      (r) => `
      <button type="button" class="reciter-row ${b === r.id ? 'reciter-row--active' : ''}" data-action="recite-voice-b" data-value="${escapeHTML(r.id)}" data-refresh="recite-voice-open" aria-pressed="${b === r.id}">
        <span class="reciter-row__name">${escapeHTML(lang === 'ar' ? r.nameAr : r.nameEn)}</span>
        ${b === r.id ? check : ''}
      </button>`
    ).join('');
  return `
      <div class="reciter-pick">
        <h2 id="modal-title-reciter">${t('audio.chooseReciter', lang)}</h2>
        <p class="panel__subtext">${escapeHTML(t('audio.voiceA', lang))}</p>
        <div class="reciter-list" data-voice="a">${listA}</div>
        <p class="panel__subtext">${escapeHTML(t('audio.voiceB', lang))}</p>
        <div class="reciter-list" data-voice="b">${listB}</div>
      </div>`;
}
