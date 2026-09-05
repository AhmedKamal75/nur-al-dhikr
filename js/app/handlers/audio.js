/**
 * app/handlers — feature-scoped controller modules. Each exports a
 * partial click-handler map (pure (dataset, element, event) functions);
 * app/events.js merges them into the single delegation table.
 */

import { rt } from '../../app/rt.js';
import { downloadOne, startAudioPlay } from '../audioEngine.js';
import { fetchJSON } from '../net.js';
import { MUSHAF_META_URL, QURAN_META_URL } from '../../core/config.js';
import { t } from '../../core/i18n.js';
import { actions, store } from '../../core/state.js';
import { buildConfirm, buildTextPrompt } from '../../ui/menus.js';
import { closeModal, openModal } from '../../ui/modal.js';
import { showToast } from '../../ui/toast.js';
import * as audioStore from '../../services/audioStore.js';
import * as mediaSession from '../../services/mediaSession.js';
import * as player from '../../services/player.js';
import * as surahPlayback from '../../services/surahPlayback.js';

export const clickHandlers = {
  'audio-select-moshaf': (ds) => {
    store.dispatch(actions.setAudioPrefs({ moshafId: ds.id }));
  },

  'audio-download-surah': async (ds) => {
    const lang = store.getState().settings.language;
    const key = audioStore.audioKey(ds.moshaf, parseInt(ds.surah, 10));
    if (store.getState().audioDownloading[key]) return; // already in flight
    store.dispatch(actions.markAudioDownloadStart(key));
    showToast(t('audio.downloading', lang));
    // v4.1: try/finally — a throw between Start/End used to wedge
    // audioDownloading[key] true forever, dead-ending the button.
    let res;
    try {
      res = await downloadOne(ds.moshaf, parseInt(ds.surah, 10));
    } finally {
      store.dispatch(actions.markAudioDownloadEnd(key));
    }
    // FIX (review A5/B6): say how it ended — silence after "Downloading…"
    // left people guessing whether 2MB landed.
    showToast(
      t(res.ok ? 'audio.downloadDone' : 'audio.downloadFailed', lang),
      res.ok ? {} : { assertive: true }
    );
  },

  'audio-delete-surah': async (ds) => {
    await audioStore.deleteAudio(ds.moshaf, parseInt(ds.surah, 10));
    store.dispatch(
      actions.markAudioDownload(audioStore.audioKey(ds.moshaf, parseInt(ds.surah, 10)), 0, true)
    );
  },

  'audio-download-all': async (ds) => {
    const state = store.getState();
    const lang = state.settings.language;
    rt.batchCancelled = false;
    const missing = [];
    for (let n = 1; n <= 114; n += 1) {
      if (!state.audioDownloads[`${ds.moshaf}:${n}`]) missing.push(n);
    }
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
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      if (quotaHit) showToast(t('audio.quota', lang), { assertive: true });
    } finally {
      const cancelled = rt.batchCancelled;
      rt.batchCancelled = false;
      store.dispatch(actions.setAudioBatchRunning(false));
      showToast(
        cancelled
          ? t('audio.batchCancelled', lang, { n: ok })
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
    store.dispatch(actions.removeCustomReciter(ds.id));
  },

  'quran-play-surah': (ds) => {
    const state = store.getState();
    const surah = parseInt(ds.surah, 10);
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

  // Save the range picker's current from/to into an existing queue.
  'playlist-save-range': (ds, el) => {
    const lang = store.getState().settings.language;
    const form = el?.closest?.('form');
    const fd = form ? new FormData(form) : null;
    const surah = parseInt(form?.dataset.surah || ds.surah, 10);
    const from = Math.max(1, parseInt(fd?.get('from'), 10) || 1);
    let to = Math.max(1, parseInt(fd?.get('to'), 10) || 1);
    if (to < from) to = from;
    const id = String(fd?.get('playlist') || ds.playlist || '');
    if (!Number.isFinite(surah) || !id) return;
    store.dispatch(actions.addPlaylistItem(id, { surah, from, to }));
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
    mediaSession.clearMetadata();
    store.dispatch(
      actions.setAudioPlayer({ moshafId: null, surah: null, playing: false, offline: false })
    );
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
    const cur = store.getState().settings.audio.repeat === 'one' ? 'off' : 'one';
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
