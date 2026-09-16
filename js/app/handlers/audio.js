/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { rt } from '../../app/rt.js';
import { downloadOne, startAudioPlay, yieldFullSurahPlayer } from '../audioEngine.js';
import { fetchJSON } from '../net.js';
import { MUSHAF_META_URL, QURAN_META_URL, VIEWS } from '../../core/config.js';
import { QURAN_RECITER_IDS, quranAudioUrl } from '../../core/config/quran.js';
import { globalAyahNumber } from '../../services/mushaf.js';
import { go } from '../../core/router.js';
import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { formatCountdown } from '../../domain/ramadan.js';
import { cycleRepeatMode } from '../../domain/audioQueue.js';
import { buildConfirm, buildTextPrompt } from '../../ui/menus.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as audioStore from '../../services/audioStore.js';
import {
  isSurahMissing,
  markSurahMissing,
  missingSurahs,
} from '../../services/moshafAvailability.js';
import * as mediaSession from '../../services/mediaSession.js';
import * as player from '../../services/player.js';
import { SLEEP_TIMER_CHOICES } from '../../domain/sleepTimer.js';
import * as surahPlayback from '../../services/surahPlayback.js';

export const clickHandlers = {
  'audio-select-moshaf': (ds) => {
    store.dispatch(actions.setAudioPrefs({ moshafId: ds.id }));
  },

  // Command-palette pick: select the voice AND land on the Audio view so
  // the choice is visible (a bare select would close the palette onto
  // whatever view was behind it with no feedback).
  'audio-pick-moshaf': (ds) => {
    if (ds.id) store.dispatch(actions.setAudioPrefs({ moshafId: ds.id }));
    go(VIEWS.AUDIO, {});
  },

  'audio-download-surah': async (ds) => {
    const lang = store.getState().settings.language;
    const surah = parseInt(ds.surah, 10);
    const key = audioStore.audioKey(ds.moshaf, surah);
    if (store.getState().audioDownloading[key]) return; // already in flight
    // Known absent from this server: say so without spending the fetch.
    if (isSurahMissing(ds.moshaf, surah)) {
      showToast(t('audio.surahUnavailable', lang), { assertive: true });
      return;
    }
    store.dispatch(actions.markAudioDownloadStart(key));
    showToast(t('audio.downloading', lang));
    // v4.1: try/finally — a throw between Start/End used to wedge
    // audioDownloading[key] true forever, dead-ending the button.
    let res;
    try {
      res = await downloadOne(ds.moshaf, surah);
    } finally {
      store.dispatch(actions.markAudioDownloadEnd(key));
    }
    // FIX (review A5/B6): say how it ended — silence after "Downloading…"
    // left people guessing whether 2MB landed. A 404 is learned
    // availability, reported honestly instead of as a generic failure.
    if (!res.ok && res.error === 'missing') markSurahMissing(ds.moshaf, surah);
    showToast(
      t(
        res.ok
          ? 'audio.downloadDone'
          : res.error === 'missing'
            ? 'audio.surahUnavailable'
            : 'audio.downloadFailed',
        lang
      ),
      res.ok ? {} : { assertive: true }
    );
  },

  'audio-delete-surah': async (ds) => {
    await audioStore.deleteAudio(ds.moshaf, parseInt(ds.surah, 10));
    store.dispatch(
      actions.markAudioDownload(audioStore.audioKey(ds.moshaf, parseInt(ds.surah, 10)), 0, true)
    );
  },

  // (v5.2.61) verse packs: per-surah ayah audio for one voice. Sequential
  // (ayah files are ~100KB; politeness beats a pool here), existing files
  // skipped, status cached incrementally at the end, honest toasts.
  'verse-pack-download': async (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    const voice = QURAN_RECITER_IDS.has(ds.voice) ? ds.voice : null;
    const surah = Math.floor(Number(ds.surah));
    if (!voice || !Number.isFinite(surah) || surah < 1 || surah > 114) return;
    const key = `verse:${voice}:${surah}`;
    if (store.getState().audioDownloading[key]) return; // already in flight
    const { ensureQuranMeta } = await import('../lazyData.js');
    await ensureQuranMeta();
    const meta = store.getState().quran.meta?.surahs;
    const total = Math.floor(Number(meta?.find((s) => Number(s.number) === surah)?.ayahCount)) || 0;
    if (!total) {
      showToast(t('audio.downloadFailed', lang), { assertive: true });
      return;
    }
    const have = new Set(await audioStore.listVerseAyahs(voice));
    const base = (globalAyahNumber(meta, surah, 1) ?? 1) - 1;
    const missing = [];
    for (let a = 1; a <= total; a += 1) {
      if (!have.has(base + a)) missing.push({ ayah: a, globalN: base + a });
    }
    if (!missing.length) {
      store.dispatch(actions.setVersePackStatus({ voice, surah, done: total, total }));
      showToast(t('audio.allDone', lang));
      return;
    }
    store.dispatch(actions.markAudioDownloadStart(key));
    showToast(t('audio.downloading', lang));
    let saved = 0;
    let failed = 0;
    try {
      for (const { globalN } of missing) {
        const res = await audioStore.downloadVerseFile(
          voice,
          globalN,
          quranAudioUrl(voice, globalN)
        );
        if (res.ok) saved += 1;
        else failed += 1;
      }
    } finally {
      store.dispatch(actions.markAudioDownloadEnd(key));
    }
    const done = total - (missing.length - saved);
    store.dispatch(actions.setVersePackStatus({ voice, surah, done, total }));
    if (failed && !saved) showToast(t('audio.downloadFailed', lang), { assertive: true });
    else if (failed) showToast(t('audio.versePackDone', lang, { n: done, m: total }));
    else showToast(t('audio.downloadDone', lang));
  },

  'verse-pack-delete': async (ds) => {
    const voice = QURAN_RECITER_IDS.has(ds.voice) ? ds.voice : null;
    const surah = Math.floor(Number(ds.surah));
    if (!voice || !Number.isFinite(surah) || surah < 1 || surah > 114) return;
    const meta = store.getState().quran.meta?.surahs;
    const total = Math.floor(Number(meta?.find((s) => Number(s.number) === surah)?.ayahCount)) || 0;
    const base = (globalAyahNumber(meta, surah, 1) ?? 1) - 1;
    for (let a = 1; a <= total; a += 1) {
      await audioStore.deleteVerseAudio(voice, base + a);
    }
    store.dispatch(actions.setVersePackStatus({ voice, surah, done: 0, total }));
  },

  'audio-download-all': async (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    rt.batchCancelled = false;
    const missing = [];
    for (let n = 1; n <= 114; n += 1) {
      if (!state.audioDownloads[`${ds.moshaf}:${n}`] && !isSurahMissing(ds.moshaf, n)) {
        missing.push(n);
      }
    }
    const skippedKnown = missingSurahs(ds.moshaf).filter(
      (n) => !state.audioDownloads[`${ds.moshaf}:${n}`]
    ).length;
    let skippedNew = 0;
    if (!missing.length) {
      showToast(t('audio.allDone', lang));
      return;
    }
    // (v4.2) the batch is now CANCELLABLE: the view re-renders with the
    // Download All button flipped to "Stop" while this runs (ephemeral
    // audioManager.batchRunning flag). The old cancel check read a flag
    // nothing ever set — dead code since v3.x, so a mobile-data user
    // starting a 114-file (~1–2GB) batch had NO stop affordance.
    store.dispatch(actions.setAudioBatchRunning(true));
    showToast(t('audio.batchStarted', lang, { n: missing.length }));
    let ok = 0;
    let quotaHit = false;
    try {
      // (v4.3) 3-wide download pool: the batch used to run strictly
      // sequentially, so one slow CDN response stalled the whole 114-file
      // (~1–2GB) queue. Three parallel transfers cut wall time ~2–3× while
      // staying polite to mobile data. Stop/quota flags are checked before
      // each NEW file starts; files already saved stay saved.
      const queue = [...missing];
      const worker = async () => {
        while (queue.length && !rt.batchCancelled && !quotaHit) {
          const n = queue.shift();
          const fileKey = audioStore.audioKey(ds.moshaf, n);
          if (store.getState().audioDownloading[fileKey]) continue;
          store.dispatch(actions.markAudioDownloadStart(fileKey));
          let res;
          try {
            res = await downloadOne(ds.moshaf, n);
          } finally {
            store.dispatch(actions.markAudioDownloadEnd(fileKey));
          }
          if (res.ok) ok += 1;
          else if (res.error === 'quota') quotaHit = true;
          else if (res.error === 'missing') {
            const before = missingSurahs(ds.moshaf).length;
            markSurahMissing(ds.moshaf, n);
            if (missingSurahs(ds.moshaf).length > before) skippedNew += 1;
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      if (quotaHit) showToast(t('audio.quota', lang), { assertive: true });
    } finally {
      const cancelled = rt.batchCancelled;
      rt.batchCancelled = false;
      store.dispatch(actions.setAudioBatchRunning(false));
      const skipped = skippedKnown + skippedNew;
      showToast(
        cancelled
          ? t('audio.batchCancelled', lang, { n: ok })
          : skipped > 0
            ? t('audio.batchDoneSkipped', lang, { n: ok, m: skipped })
            : t('audio.batchDone', lang, { n: ok })
      );
    }
  },

  // (v4.2) the Stop affordance for a running batch: the loop above checks
  // the flag before every file, so cancellation is instant and everything
  // already saved stays saved.
  'audio-batch-stop': () => {
    rt.batchCancelled = true;
  },

  'audio-delete-moshaf': async (ds) => {
    const n = await audioStore.deleteMoshafAudio(ds.moshaf);
    // (v4.3) one batched mutation instead of 114 dispatches: every dispatch
    // used to notify subscribers (a full re-render of the 114-cell download
    // grid) AND schedule a persist — a one-gesture delete cost >100
    // synchronous re-renders of jank on mid-range phones.
    store.batch(() => {
      for (let s = 1; s <= 114; s += 1) {
        store.dispatch(actions.markAudioDownload(audioStore.audioKey(ds.moshaf, s), 0, true));
      }
    });
    const lang = store.getState().settings.language;
    showToast(t('audio.deleted', lang, { n }));
  },

  'audio-remove-custom': (ds) => {
    // (v5.2.67) deleting the voice that is playing stops the element too —
    // the reducer clears the store shape, but only the engine owns sound.
    const p = store.getState().player;
    if (p?.moshafId === ds.id) player.stop();
    store.dispatch(actions.removeCustomReciter(ds.id));
  },

  'quran-play-surah': (ds) => {
    const state = store.getState();
    const surah = parseInt(ds.surah, 10);
    // (UX-7) the tile serves the ONE session: a verse session holding
    // this surah owns the tap (pause/resume in place) whichever engine
    // the glyph came from — no more "which engine will wake" guessing.
    const sp = state.surahPlayback;
    if (sp?.active && Number(sp.surah) === surah) {
      const paused = sp.paused === true;
      store.dispatch(
        actions.setSurahPlayback(paused ? surahPlayback.resume() : surahPlayback.pause())
      );
      return;
    }
    const p = state.player;
    // If this exact track is playing → pause; if paused on it → resume;
    // otherwise start it. Moshaf resolution (incl. loading the lazily
    // fetched catalog) lives inside startAudioPlay — review A1.
    if (p?.moshafId && p.surah === surah) {
      if (p.playing) {
        player.pause();
        store.dispatch(actions.setAudioPlayer({ playing: false }));
      } else {
        player.toggle();
        store.dispatch(actions.setAudioPlayer({ playing: true }));
      }
      return;
    }
    surahPlayback.stop();
    startAudioPlay(state.settings.audio.moshafId, surah);
  },

  'audio-play-moshaf': (ds) => {
    startAudioPlay(ds.moshaf, 1);
  },

  /* ---------------- Recitation queues (playlists) ---------------- */

  'playlist-create': () => {
    const lang = store.getState().settings.language;
    openModal(
      buildTextPrompt({
        title: t('playlist.createTitle', lang),
        placeholder: t('playlist.namePh', lang),
        confirmAction: 'submit-new-playlist',
        lang,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
  },

  'playlist-delete': (ds) => {
    if (!ds.id) return;
    const lang = store.getState().settings.language;
    openModal(
      buildConfirm({
        message: t('playlist.deleteConfirm', lang),
        confirmAction: 'playlist-delete-confirmed',
        confirmData: { id: ds.id },
        lang,
      })
    );
  },

  'playlist-delete-confirmed': (ds) => {
    if (!ds.id) return;
    closeModal();
    store.dispatch(actions.deletePlaylist(ds.id));
    showToast(t('playlist.deleted', store.getState().settings.language));
  },

  // (v5.2.75, UP-11) rename wires the long-present PLAYLIST_RENAME path
  // (same prompt pattern as playlist-create, prefilled).
  'playlist-rename': (ds) => {
    if (!ds.id) return;
    const st = store.getState();
    const pl = (st.playlists || []).find((p) => p.id === ds.id);
    if (!pl) return;
    openModal(
      buildTextPrompt({
        title: t('playlist.renameTitle', st.settings.language),
        placeholder: t('playlist.namePh', st.settings.language),
        value: pl.name || '',
        confirmAction: 'submit-rename-playlist',
        confirmData: { id: ds.id },
        lang: st.settings.language,
      }),
      { labelledBy: 'modal-title-prompt' }
    );
  },

  // Play a queue in order through the verse engine (first resolvable item
  // starts; the rest follow via the engine's queue advance). Empty or
  // fully-unresolvable queues say so instead of failing silently.
  'playlist-play': async (ds) => {
    if (!ds.id) return;
    const lang = store.getState().settings.language;
    const pl = (store.getState().playlists || []).find((p) => p.id === ds.id);
    if (!pl || !pl.items.length) {
      showToast(t('playlist.empty', lang));
      return;
    }
    // Toggle: tapping play on the queue that is already running stops it.
    {
      const st = store.getState();
      const q = st.surahPlayback?.queue;
      if (
        st.surahPlayback?.active &&
        Array.isArray(q) &&
        surahPlayback.queueSignature(q) === surahPlayback.queueSignature(pl.items)
      ) {
        surahPlayback.stop();
        mediaSession.clearMetadata();
        return;
      }
    }
    let state = store.getState();
    try {
      if (!state.quran.meta) {
        store.dispatch(actions.setQuranMeta(await fetchJSON(QURAN_META_URL)));
        state = store.getState();
      }
      if (!state.mushaf.meta) {
        store.dispatch(actions.setMushafMeta(await fetchJSON(MUSHAF_META_URL)));
        state = store.getState();
      }
      const idx = pl.items.findIndex(
        (it, i) => surahPlayback.resolveQueueItem(pl.items, i, state.quran.meta.surahs) != null
      );
      if (idx < 0) {
        showToast(t('playlist.unresolvable', lang), { assertive: true });
        return;
      }
      const r = surahPlayback.resolveQueueItem(pl.items, idx, state.quran.meta.surahs);
      // (v5.2.67) one voice: a playing full-surah track yields (paused,
      // docked) instead of sounding under the verse queue.
      yieldFullSurahPlayer();
      surahPlayback.start({
        surah: r.surah,
        from: r.from,
        to: r.end,
        total: r.total,
        reciterId: state.settings.reciter,
        reciterIdB: state.settings.reciterB,
        compare: state.settings.reciterCompare === true,
        surahsMeta: state.quran.meta.surahs,
        repeat: state.settings.audio?.ayahRepeat,
        loop: 1,
        speed: state.settings.audio?.verseRate ?? 1,
        queue: pl.items,
        qIndex: idx,
      });
      closeModal();
    } catch (err) {
      console.error('[playlist] failed to start', err);
      showToast(t('audio.reciteStartFailed', store.getState().settings.language));
    }
  },

  'playlist-remove-item': (ds) => {
    if (!ds.id || ds.index == null) return;
    store.dispatch(actions.removePlaylistItem(ds.id, parseInt(ds.index, 10)));
  },

  // (v5.2.75, UP-11) reorder one range up/down inside its queue.
  'playlist-move-item': (ds) => {
    if (!ds.id || ds.index == null) return;
    store.dispatch(actions.movePlaylistItem(ds.id, parseInt(ds.index, 10), Number(ds.dir)));
  },

  // Save the range picker's current from/to into an existing queue.
  // NOTE: the dispatcher calls handlers as (dataset, event, element) —
  // the element is the THIRD arg; reading .closest off the second used to
  // silently no-op the whole save path (no toast, no error, empty queues).
  'playlist-save-range': (ds, _e, el) => {
    const lang = store.getState().settings.language;
    const form = el?.closest?.('form');
    const fd = form ? new FormData(form) : null;
    const saved = resolveRangeSave(ds, {
      surah: form?.dataset.surah,
      from: fd?.get('from'),
      to: fd?.get('to'),
      playlist: fd?.get('playlist'),
    });
    if (!saved) return;
    store.dispatch(
      actions.addPlaylistItem(saved.id, { surah: saved.surah, from: saved.from, to: saved.to })
    );
    closeModal();
    showToast(t('playlist.addedRange', lang));
  },

  /* ---------------- Player bar ---------------- */

  'player-toggle': () => {
    const p = store.getState().player;
    if (!p?.moshafId) return;
    if (p.playing) {
      player.pause();
      store.dispatch(actions.setAudioPlayer({ playing: false }));
    } else {
      player.toggle();
      store.dispatch(actions.setAudioPlayer({ playing: true }));
    }
  },

  'player-close': () => {
    player.stop();
    player.clearSleepTimer();
    mediaSession.clearMetadata();
    store.dispatch(
      actions.setAudioPlayer({
        moshafId: null,
        surah: null,
        playing: false,
        offline: false,
        sleepEnabled: false,
        sleepMinutes: null,
        sleepLabel: '',
      })
    );
  },

  // Sleep timer for full-surah listening — same off → 15 → 30 → 45 → 60 →
  // off ladder as the verse engine (domain/sleepTimer.js). The timer
  // survives track changes; closing the player clears it.
  'player-sleep-cycle': () => {
    const lang = store.getState().settings.language;
    const snap = player.sleepSnapshot();
    const ladder = [null, ...SLEEP_TIMER_CHOICES];
    const idx = snap.enabled ? ladder.indexOf(snap.minutes) : 0;
    const next = ladder[(idx + 1) % ladder.length];
    if (next == null) {
      player.clearSleepTimer();
      store.dispatch(
        actions.setAudioPlayer({ sleepEnabled: false, sleepMinutes: null, sleepLabel: '' })
      );
      showToast(t('audio.sleepOff', lang));
      return;
    }
    const armed = player.armSleepTimer(next);
    store.dispatch(
      actions.setAudioPlayer({
        sleepEnabled: true,
        sleepMinutes: armed.minutes,
        sleepLabel: armed.label,
      })
    );
    showToast(t('audio.sleepArmed', lang, { n: next }));
  },

  'player-next': () => {
    const p = store.getState().player;
    if (p?.surah != null && p.surah < 114) startAudioPlay(p.moshafId, p.surah + 1);
  },

  'player-prev': () => {
    const p = store.getState().player;
    if (p?.surah != null && p.surah > 1) startAudioPlay(p.moshafId, p.surah - 1);
  },

  'player-repeat': () => {
    // (v5.2.67) off → one → all: repeat-all wraps 114→1 in the shared
    // advance (domain/audioQueue.js) instead of stopping at a real end.
    const cur = cycleRepeatMode(store.getState().settings.audio?.repeat);
    store.dispatch(actions.setAudioPrefs({ repeat: cur }));
  },

  'player-rate': () => {
    const RATES = [1, 1.25, 1.5, 0.75];
    const cur = store.getState().settings.audio.rate || 1;
    const next = RATES[(RATES.indexOf(cur) + 1) % RATES.length];
    player.setRate(next);
    store.dispatch(actions.setAudioPrefs({ rate: next }));
  },
};

/**
 * change/input registries (Blueprint D): { sel, run(ds, el, e) } owned by
 * the feature that renders the control. events.js dispatches first-match-
 * wins through the same rejection boundary as click handlers.
 */
export const changeHandlers = [
  {
    sel: '[data-player-seek]',
    run: (ds, el) => {
      const pct = parseFloat(el.value) || 0;
      player.seek((pct / 100) * player.duration());
    },
  },
];

export const inputHandlers = [
  {
    // Live time preview while dragging the seek range — the seek itself
    // still commits on change (release), so streaming isn't thrashed.
    sel: '[data-player-seek]',
    run: (ds, el) => {
      const dur = player.duration();
      const bar = document.querySelector('.player-bar');
      const timeEl = bar?.querySelector('[data-player-time]');
      if (timeEl && dur > 0) {
        const pct = parseFloat(el.value) || 0;
        const n = Math.max(0, Math.floor((pct / 100) * dur));
        timeEl.textContent = formatCountdown(n * 1000);
      }
    },
  },
  {
    sel: '[data-bind="audio-search"]',
    run: (ds, el) => {
      const v = el.value;
      clearTimeout(rt.audioSearchTimer);
      rt.audioSearchTimer = setTimeout(() => {
        store.dispatch(actions.setAudioManagerQuery(v));
        requestAnimationFrame(() => {
          const input = document.getElementById('audio-search-input');
          if (input && document.activeElement !== input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      }, 180);
    },
  },
];

/**
 * Pure core of playlist-save-range: resolve { surah, from, to, id } from
 * the picker's dataset + field values, or null when unusable. Hostile or
 * missing values degrade to null (the handler no-ops) — never throw.
 */
export function resolveRangeSave(ds, fields = {}) {
  const surah = parseInt(fields.surah ?? ds?.surah, 10);
  const from = Math.max(1, parseInt(fields.from, 10) || 1);
  let to = Math.max(1, parseInt(fields.to, 10) || 1);
  if (to < from) to = from;
  const id = String(fields.playlist ?? ds?.playlist ?? '');
  if (!Number.isFinite(surah) || surah < 1 || surah > 114 || !id) return null;
  return { surah, from, to, id };
}
