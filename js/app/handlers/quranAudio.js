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
import { icon } from '../../core/icons.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import { nextSleepRung } from '../../domain/sleepTimer.js';
import { rt } from '../rt.js';
import * as mediaSession from '../../services/mediaSession.js';
import * as player from '../../services/player.js';
import * as surahPlayback from '../../services/surahPlayback.js';
import { loadCatalog, searchReciters } from '../../services/audioCatalog.js';

/**
 * (v5.10.5) Start a verse-by-verse session for a surah, ensuring metadata
 * first. Extracted from the 'surah-play' handler so the mode toggle
 * (recite-mode-ayah) and other callers start the identical session —
 * one code path, no drift.
 */
export async function startVerseSurah(
  surah,
  { from = 1, to = null, surahTo = NaN, loop = 1 } = {}
) {
  if (!Number.isFinite(surah) || surah < 1 || surah > 114) return;
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
    // data-surah-to past the start surah becomes a cross-surah stopAt.
    const endSurahTo = Math.floor(Number(surahTo));
    const stopAt =
      Number.isFinite(endSurahTo) && endSurahTo > surah
        ? { surah: Math.min(endSurahTo, 114), ayah: Math.floor(Number(to)) || 1 }
        : Number.isFinite(endSurahTo) && endSurahTo === surah
          ? { surah, ayah: Math.floor(Number(to)) || 1 }
          : null;
    surahPlayback.start({
      surah,
      from: Math.floor(Number(from)) || 1,
      to: to == null ? null : Math.floor(Number(to)),
      stopAt,
      total: state.quran.meta.surahs.find((x) => Number(x.number) === surah)?.ayahCount,
      reciterId: state.settings.reciter,
      reciterIdB: state.settings.reciterB,
      compare: state.settings.reciterCompare === true,
      surahsMeta: state.quran.meta.surahs,
      repeat: state.settings.audio?.ayahRepeat,
      loop: Math.floor(Number(loop)) || 1,
      speed: state.settings.audio?.verseRate ?? 1,
      baseVolume: state.settings.audio?.verseVolume ?? 1,
    });
  } catch (err) {
    console.error('[surah-playback] failed to start', err);
    showToast(t('audio.reciteStartFailed', store.getState().settings.language));
  }
}

/**
 * (v5.12.0) Echo-pause <option> list for the range picker — pure over
 * (savedMs, lang) so tests pin the selected marking without a modal.
 */
export function echoPauseOptions(savedMs, lang) {
  const cur = surahPlayback.ECHO_PAUSE_CHOICES.includes(savedMs)
    ? savedMs
    : surahPlayback.ECHO_PAUSE_DEFAULT_MS;
  return surahPlayback.ECHO_PAUSE_CHOICES.map(
    (ms) =>
      `<option value="${ms}"${ms === cur ? ' selected' : ''}>${escapeHTML(t('audio.echoPauseOpt', lang, { n: ms / 1000 }))}</option>`
  ).join('');
}

export const clickHandlers = {
  'surah-play': async (ds) => {
    const surah = parseInt(ds.surah, 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) return;
    const sp = store.getState().surahPlayback;
    if (sp.active && sp.surah === surah && !ds.from && !ds.to) {
      surahPlayback.stop();
      return;
    }
    await startVerseSurah(surah, {
      from: parseInt(ds.ayah, 10) || parseInt(ds.from, 10) || 1,
      to: ds.to ? parseInt(ds.to, 10) : null,
      surahTo: parseInt(ds.surahTo, 10),
      loop: parseInt(ds.loop, 10) || 1,
    });
  },

  // (v5.10.5) playback-mode switch: persist the pref AND start the other
  // engine for the current surah immediately, so the toggle is audible,
  // not just a setting. Study features (repeat/compare/echo/follow) live
  // and die with the ayah engine — switching to the file explains itself
  // by what the other console offers.
  'recite-mode-surah': async () => {
    store.dispatch(actions.updateSettings({ reciteMode: 'surah' }));
    const st = store.getState();
    const surah = Math.floor(Number(st.surahPlayback?.surah));
    closeModal();
    surahPlayback.stop();
    if (Number.isFinite(surah) && surah >= 1 && surah <= 114) {
      const { startAudioPlay } = await import('../audioEngine.js');
      await startAudioPlay(st.settings.audio.moshafId, surah);
    }
  },

  'recite-mode-ayah': async () => {
    store.dispatch(actions.updateSettings({ reciteMode: 'ayah' }));
    const st = store.getState();
    const surah = Math.floor(Number(st.player?.surah));
    const p = st.player;
    if (p?.moshafId) {
      player.pause();
      store.dispatch(actions.setAudioPlayer({ playing: false }));
    }
    if (Number.isFinite(surah) && surah >= 1 && surah <= 114) {
      await startVerseSurah(surah, {});
    }
  },

  // (v5.10.6) console overflow panel: pure UI toggle (ephemeral state),
  // so the transport row stays clean while every setting stays one tap
  // away. The dispatch re-renders with the panel open/closed.
  'recite-more-toggle': () => {
    store.dispatch(actions.reciteMoreToggle());
  },

  /* (v5.0.0) The ayah-range picker — "play from ayah X to ayah Y", with an
  optional end surah for cross-surah ranges (the engine clamps + rolls). */
  'quran-range-open': (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    const surah = parseInt(ds.surah, 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) return;
    const metas = state.quran.meta?.surahs || [];
    const meta = metas.find((x) => Number(x.number) === surah);
    const count = meta?.ayahCount || 7;
    const name = meta ? `${meta.nameEn || meta.name} ` : '';
    const options = (selected, max) =>
      Array.from(
        { length: max },
        (_, i) =>
          `<option value="${i + 1}" ${i + 1 === selected ? 'selected' : ''}>${i + 1}</option>`
      ).join('');
    // End-surah list: current surah through 114 (never backwards).
    const surahOptions = metas.length
      ? metas
          .filter((m) => Number(m.number) >= surah)
          .map(
            (m) =>
              `<option value="${m.number}" ${Number(m.number) === surah ? 'selected' : ''}>${m.number} — ${escapeHTML(m.nameTransliteration || m.nameEn || '')}</option>`
          )
          .join('')
      : `<option value="${surah}" selected>${surah}</option>`;
    openModal(
      `
      <form class="editor-form" data-form="quran-range" data-surah="${surah}">
        <h2 id="modal-title-range">${t('audio.rangeTitle', lang)}</h2>
        <p class="editor-form__note">${escapeHTML(name)}· ${t('quran.ayahCount', lang, { n: count })}</p>
        <label class="field">${t('audio.rangeFrom', lang)}<select class="select" name="from">${options(1, count)}</select></label>
        <label class="field">${t('audio.rangeToSurah', lang)}<select class="select" name="surahTo">${surahOptions}</select></label>
        <label class="field">${t('audio.rangeTo', lang)}<select class="select" name="to">${options(count, 286)}</select></label>
        <label class="field">${t('audio.rangeLoop', lang)}<select class="select" name="loop">
          ${surahPlayback.LOOP_CYCLE.map(
            (n) =>
              `<option value="${n}" ${n === 1 ? 'selected' : ''}>${n === 1 ? t('audio.loopOnce', lang) : `×${n}`}</option>`
          ).join('')}
        </select></label>
        <label class="field">${t('audio.echoPause', lang)}<select class="select" name="echoPause">
          ${echoPauseOptions(state.settings.audio?.echoPauseMs, lang)}
        </select><span class="editor-form__note">${escapeHTML(t('audio.echoPauseHint', lang))}</span></label>
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

  // Pause/resume mid-ayah (the console's pause button): freezes in place,
  // resumes without restart. Mirrored so the button icon follows instantly.
  'recite-pause-toggle': () => {
    const paused = store.getState().surahPlayback?.paused === true;
    store.dispatch(
      actions.setSurahPlayback(paused ? surahPlayback.resume() : surahPlayback.pause())
    );
  },

  // Reciter picker from inside the player console (both voices): voice A
  // restarts the current ayah immediately; voice B arms compare mode's
  // second pass. Same allowlisted QURAN_RECITERS set as Settings.
  'recite-voice-open': async () => {
    // Fresh query per open; the catalog is idempotent, cached, and never
    // throws — the moshaf section below renders from whatever is loaded.
    rt.reciterPickQuery = '';
    await loadCatalog();
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
    // (v5.12.0 hostile review) echo is dead under infinite repeat — arming
    // ∞ with echo on would strand a live-looking chip, so echo yields with
    // the reason said out loud instead of dying silently underneath.
    const echoOn = store.getState().surahPlayback?.listenRepeat === true;
    store.batch(() => {
      store.dispatch(
        actions.updateSettings({
          audio: { ...store.getState().settings.audio, ayahRepeat: next },
        })
      );
      store.dispatch(actions.setSurahPlayback(surahPlayback.setRepeat(next)));
      if (next === -1 && echoOn) {
        store.dispatch(actions.setSurahPlayback(surahPlayback.setListenRepeat(false)));
        showToast(t('audio.echoNeedsRepeat', store.getState().settings.language));
      }
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

  // (v5.2.75, UP-11) compare A/B role swap: the voices exchange roles and
  // the engine restarts on the voice changes (same path as the picker —
  // setReciter(B) then setReciterB(A), one batch, one re-render).
  'recite-compare-swap': () => {
    const state = store.getState();
    const a = state.settings.reciter;
    const b = state.settings.reciterB;
    if (!a || !b) {
      showToast(t('audio.compareNeedB', state.settings.language));
      return;
    }
    store.batch(() => {
      store.dispatch(actions.updateSettings({ reciter: b, reciterB: a }));
      if (surahPlayback.isActive()) {
        store.dispatch(actions.setSurahPlayback(surahPlayback.setReciter(b)));
        store.dispatch(actions.setSurahPlayback(surahPlayback.setReciterB(a)));
      }
    });
  },

  // Switch voice B from inside the player (the picker rows dispatch
  // set-setting directly; this keeps the session + pref in one gesture).
  // An empty value clears voice B (compare off). The picker re-opens so
  // the check marks reflect the new choice instead of going stale.
  'recite-voice-b': (ds) => {
    if (ds.value == null) return;
    const b = ds.value === '' ? null : ds.value;
    const lang = store.getState().settings.language;
    const flipMode = store.getState().settings.reciteMode !== 'ayah';
    store.batch(() => {
      store.dispatch(
        actions.updateSettings({
          reciterB: b,
          reciterCompare: false,
          ...(flipMode ? { reciteMode: 'ayah' } : {}),
        })
      );
      if (surahPlayback.isActive())
        store.dispatch(actions.setSurahPlayback(surahPlayback.setReciterB(b)));
    });
    if (flipMode) showToast(t('audio.voiceModeAyah', lang));
    if (ds.refresh === 'recite-voice-open')
      openModal(buildReciterPick(store.getState()), { labelledBy: 'modal-title-reciter' });
  },

  // (v5.10.8) whole-surah voice pick from the unified picker: the moshaf
  // becomes the file voice AND the mode follows it to 'surah' (an
  // ayah-engine session could never use a per-surah file — leaving the
  // mode behind would make the pick look broken). Announced only when
  // the mode actually changes; the modal refreshes its check marks.
  'recite-pick-moshaf': (ds) => {
    if (!ds.id) return;
    const lang = store.getState().settings.language;
    const flipMode = store.getState().settings.reciteMode !== 'surah';
    store.batch(() => {
      store.dispatch(actions.setAudioPrefs({ moshafId: ds.id }));
      if (flipMode) store.dispatch(actions.updateSettings({ reciteMode: 'surah' }));
    });
    if (flipMode) showToast(t('audio.voiceModeSurah', lang));
    openModal(buildReciterPick(store.getState()), { labelledBy: 'modal-title-reciter' });
  },

  // (v5.2.0) Echo mode — listen-and-repeat: after each ayah the engine
  // holds a silence for the listener to recite it back, then advances.
  // (v5.12.0) the pause length rides the persisted echoPauseMs pref (range
  // picker) instead of the hardcoded default.
  'recite-echo-toggle': () => {
    const state = store.getState();
    const next = !(state.surahPlayback?.listenRepeat === true);
    // (v5.12.0 hostile review) refuse ON under infinite repeat — the engine
    // returns before the echo gate there, so enabling would be a lie.
    if (next === true && state.surahPlayback?.repeat === -1) {
      showToast(t('audio.echoNeedsRepeat', state.settings.language));
      return;
    }
    const pauseMs = state.settings.audio?.echoPauseMs ?? surahPlayback.ECHO_PAUSE_DEFAULT_MS;
    store.dispatch(actions.setSurahPlayback(surahPlayback.setListenRepeat(next, pauseMs)));
    showToast(t(next ? 'audio.echoOn' : 'audio.echoOff', state.settings.language));
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

  // (v4.4) Sleep timer for listen mode — cycles off → 5 → 15 → 30 → 45 →
  // 60 → off (the same ladder as SLEEP_TIMER_CHOICES). A tap while the timer is
  // armed moves to the NEXT rung, so shrinking an armed 60-minute timer
  // never requires turning it off first. Volume ramps down over the final
  // 90 seconds (domain/sleepTimer.js) instead of a cliff-edge stop.
  'recite-sleep-cycle': () => {
    const snap = surahPlayback.sleepSnapshot();
    const next = nextSleepRung(snap.enabled, snap.minutes);
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
  // (v5.10.8) section C — the whole 312-moshaf catalog, searchable in
  // place. Picking a moshaf sets the file voice AND follows the mode to
  // 'surah' (announced), mirroring the ayah-voice behavior above.
  const customs = state.settings.customReciters || [];
  const q = String(rt.reciterPickQuery || '');
  const hits = searchReciters(q, customs);
  const selectedId = state.settings.audio?.moshafId;
  const shown = hits.slice(0, 30);
  const moshafRows = shown
    .map((r) => {
      const active = r.id === selectedId;
      const name = lang === 'ar' && r.nameAr ? r.nameAr : r.nameEn;
      return `
      <button type="button" class="reciter-row ${active ? 'reciter-row--active' : ''}" data-action="recite-pick-moshaf" data-id="${escapeHTML(r.id)}" aria-pressed="${active}">
        <span class="reciter-row__name">${escapeHTML(name)}</span>
        ${active ? check : ''}
      </button>`;
    })
    .join('');
  return `
      <div class="reciter-pick">
        <h2 id="modal-title-reciter">${t('audio.chooseReciter', lang)}</h2>
        <p class="panel__subtext">${escapeHTML(t('audio.voiceA', lang))}</p>
        <div class="reciter-list" data-voice="a">${listA}</div>
        <p class="panel__subtext">${escapeHTML(t('audio.voiceB', lang))}</p>
        <div class="reciter-list" data-voice="b">${listB}</div>
        <p class="panel__subtext">${escapeHTML(t('audio.fileVoices', lang))}</p>
        <div class="search-bar">
          <span class="search-bar__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
          <input
            type="search"
            class="search-bar__input"
            id="reciter-pick-input"
            placeholder="${t('audio.searchPh', lang)}"
            aria-label="${t('audio.searchPh', lang)}"
            value="${escapeHTML(q)}"
            data-bind="reciter-pick-search"
            autocomplete="off"
          />
        </div>
        ${
          hits.length
            ? `<div class="reciter-list" data-voice="moshaf">${moshafRows}</div>
        <p class="empty-hint">${t('audio.moshafShown', lang, { x: shown.length, n: hits.length })}</p>`
            : `<p class="empty-hint">${t('search.noResults', lang)}</p>`
        }
        <a class="link-btn" href="#/audio" data-action="navigate" data-view="audio">${t('audio.browseAllMoshafs', lang)}</a>
      </div>`;
}

/**
 * change/input registries (Blueprint D): the unified picker search types
 * into ephemeral rt state and rebuilds the modal in place (same debounce
 * + focus-restore pattern as the Audio view's own search).
 */
export const changeHandlers = [
  {
    // (v5.15.0, V5) verse loudness commits on release — the live engine
    // gets the value instantly; the pref persists for the next session.
    sel: '[data-bind="recite-volume"]',
    run: (ds, el) => {
      const v = Math.max(0, Math.min(100, parseFloat(el.value) || 0)) / 100;
      store.dispatch(actions.setAudioPrefs({ verseVolume: v }));
      try {
        surahPlayback.setBaseVolume(v);
      } catch {
        /* no live session — the pref still lands for the next start */
      }
    },
  },
];

export const inputHandlers = [
  {
    // (v5.17.5) live verse loudness while dragging — the engine gets the
    // value instantly with zero dispatches, so the thumb never dies to a
    // mid-drag re-render; persistence waits for change (release), mirroring
    // the file bar's [data-player-volume] input/change split.
    sel: '[data-bind="recite-volume"]',
    run: (ds, el) => {
      const v = Math.max(0, Math.min(100, parseFloat(el.value) || 0)) / 100;
      try {
        surahPlayback.setBaseVolume(v);
      } catch {
        /* no live session — the change arm persists for the next start */
      }
    },
  },
  {
    sel: '[data-bind="reciter-pick-search"]',
    run: (ds, el) => {
      const v = el.value;
      clearTimeout(rt.reciterPickTimer);
      rt.reciterPickTimer = setTimeout(() => {
        rt.reciterPickQuery = v;
        openModal(buildReciterPick(store.getState()), { labelledBy: 'modal-title-reciter' });
        requestAnimationFrame(() => {
          const input = document.getElementById('reciter-pick-input');
          if (input && document.activeElement !== input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      }, 180);
    },
  },
];
