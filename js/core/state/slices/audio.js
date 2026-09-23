/**
 * core/state/slices/audio.js — audio slice of the store reducer.
 *
 * Owns the recitation player, audio prefs/custom reciters, offline
 * download bookkeeping and the audio-manager transients (catalog query,
 * batch flag). Pure (state, action) => state; returns undefined when the
 * action belongs to another slice (the dispatcher in ../reducer.js tries
 * each in turn).
 */

export function reduceAudio(state, action) {
  switch (action.type) {
    case 'AUDIO_SET_PLAYER':
      return { ...state, player: { ...state.player, ...action.patch } };

    case 'AUDIO_SET_PREFS':
      return {
        ...state,
        settings: { ...state.settings, audio: { ...state.settings.audio, ...action.patch } },
      };

    case 'AUDIO_CUSTOM_ADD':
      return {
        ...state,
        settings: {
          ...state.settings,
          customReciters: [
            ...state.settings.customReciters.filter((c) => c.id !== action.entry.id),
            action.entry,
          ],
        },
      };

    case 'AUDIO_CUSTOM_REMOVE': {
      const remainingCustom = state.settings.customReciters.filter((c) => c.id !== action.id);
      const audioStillValid =
        remainingCustom.some((c) => c.id === state.settings.audio.moshafId) ||
        !String(state.settings.audio.moshafId || '').startsWith('custom-');
      return {
        ...state,
        settings: {
          ...state.settings,
          customReciters: remainingCustom,
          audio: audioStillValid
            ? state.settings.audio
            : { ...state.settings.audio, moshafId: null },
        },
        player:
          state.player.moshafId === action.id
            ? { moshafId: null, surah: null, playing: false, offline: false }
            : state.player,
      };
    }

    case 'AUDIO_DOWNLOAD_DONE': {
      const next = { ...state.audioDownloads };
      if (action.remove) delete next[action.key];
      else next[action.key] = { bytes: action.bytes || 0, ts: Date.now() };
      return { ...state, audioDownloads: next };
    }

    case 'AUDIO_DOWNLOAD_START': {
      if (state.audioDownloading[action.key]) return state;
      return { ...state, audioDownloading: { ...state.audioDownloading, [action.key]: true } };
    }

    case 'AUDIO_DOWNLOAD_END': {
      if (!state.audioDownloading[action.key]) return state;
      const inFlight = { ...state.audioDownloading };
      delete inFlight[action.key];
      return { ...state, audioDownloading: inFlight };
    }

    // (v5.2.61) verse-pack status cache { [voice]: { [surah]: { done, total } } },
    // ephemeral (IDB is the truth; rescanned when the audio view opens).
    case 'VERSE_PACK_STATUS': {
      const voice = typeof action.voice === 'string' && action.voice ? action.voice : null;
      if (!voice) return state;
      const prev = state.audioVerse && typeof state.audioVerse === 'object' ? state.audioVerse : {};
      const packs = { ...(prev[voice] && typeof prev[voice] === 'object' ? prev[voice] : {}) };
      if (action.reset) {
        if (!Object.keys(packs).length) return state;
        const next = { ...prev };
        delete next[voice];
        return { ...state, audioVerse: next };
      }
      // Bulk rescan form: { packs: { [surah]: { done, total } } }.
      if (action.packs && typeof action.packs === 'object' && !Array.isArray(action.packs)) {
        const bulk = {};
        for (const [k, v] of Object.entries(action.packs)) {
          const s = Math.floor(Number(k));
          if (!Number.isFinite(s) || s < 1 || s > 114) continue;
          bulk[s] = {
            done: Math.max(0, Math.floor(Number(v?.done)) || 0),
            total: Math.max(0, Math.floor(Number(v?.total)) || 0),
          };
        }
        return { ...state, audioVerse: { ...prev, [voice]: bulk } };
      }
      const surah = Math.floor(Number(action.surah));
      const done = Math.max(0, Math.floor(Number(action.done)) || 0);
      const total = Math.max(0, Math.floor(Number(action.total)) || 0);
      if (!Number.isFinite(surah) || surah < 1 || surah > 114) return state;
      const prior = packs[surah];
      if (prior && prior.done === done && prior.total === total) return state;
      packs[surah] = { done, total };
      return { ...state, audioVerse: { ...prev, [voice]: packs } };
    }

    case 'AUDIO_CATALOG_READY':
      if (state.audioManager.catalogReady) return state;
      return { ...state, audioManager: { ...state.audioManager, catalogReady: true } };

    case 'AUDIO_MANAGER_QUERY':
      // MUST no-op on an unchanged query: ensureRecitersData nudges this
      // action after the catalog arrives, and a reducer that always returns
      // a fresh object turns that nudge into an infinite render loop.
      if (state.audioManager.query === action.query) return state;
      return { ...state, audioManager: { ...state.audioManager, query: action.query } };

    case 'AUDIO_BATCH_RUNNING':
      // (v4.2) ephemeral: is a "Download All" batch in flight? Drives the
      // Stop button. No-op on an unchanged flag for the same reason as the
      // query above.
      if (state.audioManager.batchRunning === action.running) return state;
      return { ...state, audioManager: { ...state.audioManager, batchRunning: action.running } };

    case 'AUDIO_BATCH_RESUME': {
      // (NF03-RESUME) ephemeral resume prompt rehydrated from the IDB
      // queue. Deep-compare: the sync runs on audio-view renders and must
      // no-op when nothing changed or every dispatch re-renders mid-batch.
      const prev = state.audioManager.batchResume;
      const next = action.resume;
      const same =
        (prev == null && next == null) ||
        (prev != null && next != null && prev.moshaf === next.moshaf && prev.left === next.left);
      if (same) return state;
      return { ...state, audioManager: { ...state.audioManager, batchResume: next } };
    }

    case 'OFFLINE_PROGRESS_SET': {
      // (v5.3.0) offline-library batch progress. Ephemeral; replaces the
      // whole jobs object so throttled dispatches stay cheap. No-ops when
      // nothing changed (a no-op dispatch must never re-render mid-batch).
      const prev = state.offlineJobs || {};
      const q = action.progress.quota;
      const quota =
        q && typeof q === 'object'
          ? { usage: Math.max(0, Number(q.usage) || 0), quota: Math.max(0, Number(q.quota) || 0) }
          : null;
      const next = {
        running: action.progress.running === true,
        group: action.progress.group || null,
        done: Math.max(0, Math.floor(Number(action.progress.done) || 0)),
        total: Math.max(0, Math.floor(Number(action.progress.total) || 0)),
        failed: Math.max(0, Math.floor(Number(action.progress.failed) || 0)),
        quota,
      };
      if (
        prev.running === next.running &&
        prev.group === next.group &&
        prev.done === next.done &&
        prev.total === next.total &&
        prev.failed === next.failed &&
        prev.quota?.usage === next.quota?.usage &&
        prev.quota?.quota === next.quota?.quota
      ) {
        return state;
      }
      return { ...state, offlineJobs: next };
    }

    case 'SURAH_PLAYBACK_SET': {
      const patch =
        action.patch && typeof action.patch === 'object' && !Array.isArray(action.patch)
          ? action.patch
          : {};
      return { ...state, surahPlayback: { ...state.surahPlayback, ...patch } };
    }

    default:
      return undefined;
  }
}
