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
