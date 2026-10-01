/**
 * core/state/slices/shell.js — app-shell slice of the store reducer.
 *
 * Owns navigation, settings, boot/restore/reset, history, reminders,
 * calendar notes, nudge, data-health, alert-trigger status, playback/view
 * transients and the dangling-ref prune. Pure (state, action) => state;
 * returns undefined when the action belongs to another slice (the
 * dispatcher in ../reducer.js tries each slice in turn).
 */

import { VIEWS, resolveKidsView, sanitizeSettings } from '../../config.js';
import { dateKey, isSafeKey } from '../../utils.js';
import { normalizeCustomContentMap } from '../../schema.js';
import { defaultNudgeState } from '../../../domain/nudge.js';
import { CONFIRM_STEPS } from '../../../domain/onboarding.js';
import { initialState } from '../initial.js';
import { sanitizeRestoredPayload } from '../restore.js';
import { lensLibrary, prefsOf } from '../../../domain/contentLens.js';

export function reduceShell(state, action) {
  switch (action.type) {
    case 'BOOT_COMPLETE': {
      // (v5.0.0) The library slice keeps BOTH shapes: `raw` = the immutable
      // bundled documents as fetched (the restore-to-default source of
      // truth), `documents`/`order` = the lensed view the whole app reads.
      // Every contentPrefs change re-derives documents from raw — the
      // book on disk never changes.
      const raw = {
        documents: action.library.documents,
        order: action.library.order,
      };
      const lensed = lensLibrary(raw.documents, raw.order, prefsOf(state));
      return { ...state, booted: true, library: { raw, ...lensed, itemIndex: {} } };
    }

    case 'NAVIGATE': {
      // (v5.2.65, item 22) kids-mode scope: outside the allowlist every
      // route — taps, deep links, palette picks, history traversals —
      // lands on the Kids home. Tap paths toast via handlers/navigation.js;
      // the reducer stays pure and silent.
      const view = resolveKidsView(action.view, state.settings?.kidsMode === true);
      const params =
        action.params && typeof action.params === 'object' && !Array.isArray(action.params)
          ? action.params
          : {};
      // (merged-plan item 2) navigation stamps the last-position slots it
      // can honestly witness. A hadith book opening records book+number;
      // a tajweed-course visit records the session/rule it names. Junk
      // params stamp nothing — absence stays absence.
      const lastPosition = { ...(state.lastPosition || {}) };
      if (view === VIEWS.HADITH && typeof params.id === 'string' && isSafeKey(params.id)) {
        if (/^[A-Za-z0-9_-]{1,40}$/.test(params.id)) {
          const prev = lastPosition.hadith;
          const rawN = params.n == null || params.n === '' ? null : Math.floor(Number(params.n));
          const n =
            rawN != null && Number.isFinite(rawN) && rawN >= 1 ? Math.min(999999, rawN) : null;
          if (prev?.bookId !== params.id || (n != null && n !== prev?.n)) {
            // A new book always stamps (at its start when no number is
            // named); the same book re-stamps only on an explicit number,
            // so pager moves never rewrite a lived position with a guess.
            lastPosition.hadith = { bookId: params.id, n: n ?? 1, ts: Date.now() };
          }
        }
      }
      if (view === VIEWS.TAJWEED_COURSE) {
        if (typeof params.session === 'string' && isSafeKey(params.session)) {
          if (/^[A-Za-z0-9_-]{1,64}$/.test(params.session)) {
            if (lastPosition.tajweedLesson?.sessionId !== params.session) {
              lastPosition.tajweedLesson = { sessionId: params.session, ts: Date.now() };
            }
          }
        }
        if (typeof params.rule === 'string' && isSafeKey(params.rule)) {
          if (/^[A-Za-z0-9_-]{1,64}$/.test(params.rule)) {
            if (lastPosition.tajweedRule?.ruleId !== params.rule) {
              lastPosition.tajweedRule = { ruleId: params.rule, ts: Date.now() };
            }
          }
        }
      }
      const lastChanged =
        lastPosition !== state.lastPosition &&
        Object.keys(lastPosition).some((k) => lastPosition[k] !== state.lastPosition?.[k]);
      const base = {
        ...state,
        activeView: view,
        activeParams: action.params || {},
        ...(lastChanged ? { lastPosition } : null),
        // (v4.4) fullscreen Mushaf is a reading gesture tied to THIS view —
        // leaving the Mushaf (to any other view, incl. back/forward history)
        // must restore the normal shell, exactly like focus-mode does.
        mushafFullscreen: view === VIEWS.MUSHAF ? !!state.mushafFullscreen : false,
        // (v4.5) reader immersive is likewise a reading gesture tied to
        // THIS view — leaving the classic reader restores the shell.
        readerImmersive: view === VIEWS.QURAN ? !!state.readerImmersive : false,
        // (v5.17.54, merged-plan item 7) the inline study tray is a reading
        // gesture tied to its ayah row — navigation anywhere closes it,
        // exactly like the reading modes above.
        studyTray: null,
        // (v4.5.2) manage mode is a per-surface editing gesture — it never
        // survives navigation onto a different surface (same DFA hygiene
        // as the modes above).
        ui: { contentManage: false },
      };
      // The onboarding "Personalize" step completes the first time the
      // person actually opens Settings. Tracked here (not in a view) to
      // keep views pure and the fact observable from state alone.
      if (view === VIEWS.SETTINGS && state.onboarding && !state.onboarding.settingsVisited) {
        return { ...base, onboarding: { ...state.onboarding, settingsVisited: true } };
      }
      return base;
    }

    case 'SETTINGS_UPDATE': {
      const next = { ...state, settings: { ...state.settings, ...action.patch } };
      // (v5.0.0) contentPrefs changed → re-derive the lensed library from
      // the immutable raw documents (four-level content authority).
      if (action.patch && action.patch.contentPrefs && state.library.raw) {
        const lensed = lensLibrary(
          state.library.raw.documents,
          state.library.raw.order,
          action.patch.contentPrefs
        );
        next.library = { ...state.library, ...lensed };
      }
      return next;
    }

    case 'SETTINGS_UPDATE_PRAYER':
      return {
        ...state,
        settings: { ...state.settings, prayer: { ...state.settings.prayer, ...action.patch } },
      };

    case 'SETTINGS_UPDATE_MUSHAF_PREFS':
      return {
        ...state,
        settings: {
          ...state.settings,
          mushafPrefs: { ...state.settings.mushafPrefs, ...action.patch },
        },
      };

    case 'HISTORY_PUSH': {
      const entry = { itemId: action.itemId, categoryId: action.categoryId, ts: Date.now() };
      const filtered = state.history.filter((h) => h.itemId !== action.itemId);
      // (merged-plan item 2) the same tap stamps the adhkar last-position
      // slot — the set (category+item) the reader actually opened. Shaped
      // ids only; junk stamps nothing and history still records the tap.
      const itemId = typeof action.itemId === 'string' ? action.itemId : '';
      const categoryId = typeof action.categoryId === 'string' ? action.categoryId : '';
      const adhkar =
        itemId && itemId.length <= 128 && categoryId && categoryId.length <= 64
          ? { categoryId, itemId, ts: entry.ts }
          : (state.lastPosition?.adhkar ?? null);
      const lastPosition = { ...(state.lastPosition || {}), adhkar };
      return {
        ...state,
        history: [entry, ...filtered].slice(0, 50),
        lastPosition,
      };
    }

    case 'SEARCH_HISTORY_ADD': {
      const q = action.query.trim();
      if (!q) return state;
      const filtered = state.search.historyList.filter((s) => s !== q);
      return { ...state, search: { historyList: [q, ...filtered].slice(0, 10) } };
    }

    case 'SEARCH_HISTORY_CLEAR':
      return { ...state, search: { historyList: [] } };

    // (v4.5.2) The in-place content-manage mode (Library / Category):
    // enter to reorder, hide, re-target or edit items directly on the
    // surface that shows them. Transient by design (see initial state).
    case 'CONTENT_MANAGE_TOGGLE':
      return { ...state, ui: { ...state.ui, contentManage: !state.ui?.contentManage } };

    // (v5.10.6) recitation console overflow panel. Ephemeral like manage
    // mode (per-visit, never restored, never persisted).
    case 'RECITE_MORE_TOGGLE':
      return { ...state, ui: { ...state.ui, reciteMore: !state.ui?.reciteMore } };

    // (v5.12.0) player minimize. Ephemeral like manage mode — a reload
    // restores the full bar, which is the honest default.
    case 'PLAYER_MIN_TOGGLE':
      return { ...state, ui: { ...state.ui, playerMin: !state.ui?.playerMin } };

    case 'PLAYER_MIN_SET':
      if ((state.ui?.playerMin ?? false) === (action.on === true)) return state;
      return { ...state, ui: { ...state.ui, playerMin: action.on === true } };

    // (v5.17.15) floating counter window state (ephemeral, like minimize).
    case 'TASBIH_FLOAT_SET':
      if ((state.ui?.tasbihFloat ?? false) === (action.on === true)) return state;
      return { ...state, ui: { ...state.ui, tasbihFloat: action.on === true } };

    // (v5.12.0) mute mirror for the player chips (ephemeral, like minimize).
    case 'AUDIO_MUTED_SET':
      if ((state.ui?.audioMuted ?? false) === (action.on === true)) return state;
      return { ...state, ui: { ...state.ui, audioMuted: action.on === true } };

    case 'ONBOARDING_DISMISS':
      if (state.onboarding?.dismissed) return state;
      return { ...state, onboarding: { ...state.onboarding, dismissed: true } };

    // (v5.17.48) re-open the introduction from Settings: undismiss, clear
    // the seen-flags (a restart, not a resume) and release the position so
    // the wizard follows the first incomplete step again.
    case 'ONBOARDING_RESHOW': {
      const onboarding =
        state.onboarding && typeof state.onboarding === 'object' ? state.onboarding : {};
      if (onboarding.dismissed === false && state.ui?.onboardingStep == null) {
        const seen = onboarding.stepsSeen;
        if (!seen || (typeof seen === 'object' && Object.keys(seen).length === 0)) return state;
      }
      return {
        ...state,
        onboarding: { ...onboarding, dismissed: false, stepsSeen: {} },
        ui: { ...state.ui, onboardingStep: null },
      };
    }

    // (v5.17.48) wizard confirms (language, location-or-defaults, reciter)
    // + ephemeral position.
    case 'ONBOARDING_STEP_SEEN': {
      if (!CONFIRM_STEPS.includes(action.stepId)) return state;
      const seen = state.onboarding?.stepsSeen;
      const stepsSeen = seen && typeof seen === 'object' && !Array.isArray(seen) ? { ...seen } : {};
      if (stepsSeen[action.stepId] === true) return state;
      stepsSeen[action.stepId] = true;
      return { ...state, onboarding: { ...state.onboarding, stepsSeen } };
    }

    case 'ONBOARDING_STEP_SET': {
      const idx = action.index == null ? null : Math.floor(Number(action.index));
      const next = idx == null || !Number.isFinite(idx) || idx < 0 ? null : idx;
      if ((state.ui?.onboardingStep ?? null) === next) return state;
      return { ...state, ui: { ...state.ui, onboardingStep: next } };
    }

    case 'INSTALL_PROMPT_READY':
      if (state.install?.promptReady) return state;
      return { ...state, install: { ...state.install, promptReady: true } };

    case 'INSTALL_PROMPT_CLEAR':
      if (!state.install?.promptReady) return state;
      return { ...state, install: { ...state.install, promptReady: false } };

    // (v5.17.31) deferral: the offer hides but the stashed browser event
    // survives in rt (see app/installPrompt.js) for the re-offer path.
    case 'INSTALL_PROMPT_DEFER':
      if (!state.install?.promptReady) return state;
      return { ...state, install: { ...state.install, promptReady: false } };

    // (v5.17.31) re-offer after the deferral cooldown — a no-op when
    // already installed or already offering (idempotent like the rest).
    case 'INSTALL_PROMPT_REOFFER':
      if (state.install?.installed || state.install?.promptReady) return state;
      return { ...state, install: { ...state.install, promptReady: true } };

    // (v5.17.31) the dialog's own answer: accepted vs dismissed are
    // different facts (a dismissal stamps deferral memory in settings via
    // the handler; the reducer only records which one happened).
    case 'INSTALL_PROMPT_DONE': {
      const outcome =
        action.outcome === 'accepted' || action.outcome === 'dismissed' ? action.outcome : null;
      if (!outcome) return state;
      if (state.install?.outcome === outcome && !state.install?.promptReady) return state;
      return { ...state, install: { ...state.install, promptReady: false, outcome } };
    }

    // (v5.17.31) shell precache-complete signal from the service worker
    // (see app/triggers.js): the app shell is on-device. Ephemeral — it
    // describes this session's worker, re-announced every boot.
    case 'SHELL_OFFLINE_READY':
      if (state.install?.shellReady) return state;
      return { ...state, install: { ...state.install, shellReady: true } };

    case 'INSTALL_DONE':
      if (state.install?.installed) return state;
      return { ...state, install: { ...state.install, installed: true, promptReady: false } };

    case 'STATS_HEATMAP_MONTH_SHIFT': {
      // Keep the ref inside [current month - 11, current month] so the
      // heatmap browse back through a year of history but never into the
      // (empty) future.
      const base = action.baseRef; // 'YYYY-MM' of the current month
      const [by, bm] = base.split('-').map(Number);
      const [ry, rm] = (state.statsHeatmapRef || base).split('-').map(Number);
      // Work in 0-based months for the arithmetic, then back to 1-based.
      const shifted = ry * 12 + (rm - 1) + action.delta;
      const minY = by * 12 + (bm - 1) - 11;
      const maxY = by * 12 + (bm - 1);
      const clamped = Math.min(maxY, Math.max(minY, shifted));
      const ref = `${Math.floor(clamped / 12)}-${String((clamped % 12) + 1).padStart(2, '0')}`;
      if (ref === state.statsHeatmapRef) return state;
      return { ...state, statsHeatmapRef: ref };
    }

    case 'RECITATION_SET_ACTIVE':
      // (v5.10.6) same-key writes are no-ops: the batched session mirror
      // re-sets an identical key every advance, and a redundant object
      // would force a render that changes nothing.
      if (state.recitingAyahKey === action.key) return state;
      return { ...state, recitingAyahKey: action.key };

    case 'LIBRARY_SET_INDEX':
      return { ...state, library: { ...state.library, itemIndex: action.itemIndex } };

    case 'LOAD_ERROR_SET': {
      // Immutable set/clear of one flag; a no-op when unchanged so repeated
      // success paths never spam re-renders.
      const was = !!state.loadErrors[action.key];
      if (was === !!action.failed) return state;
      const next = { ...state.loadErrors };
      if (action.failed) next[action.key] = true;
      else delete next[action.key];
      return { ...state, loadErrors: next };
    }

    case 'DATA_LOAD_RETRY': {
      // Clear the flag and ALWAYS bump a counter — the bump is what makes
      // the retry dispatch notify subscribers even when the flag was the
      // only change, which re-runs the ensure* fetch in stateSub.
      const next = { ...state.loadErrors };
      delete next[action.key];
      return { ...state, loadErrors: next, loadRetryCount: state.loadRetryCount + 1 };
    }

    case 'TICKER_NUDGE': {
      // (v5.2.77, BUG-01) ephemeral notify-only bump. New root reference
      // forces store notify + re-render; no persisted slice changes, so
      // _persistedChanged stays false and localStorage is never touched.
      // Never writes speech/player — tickers must not steal TTS state.
      return { ...state, tickerSeq: (state.tickerSeq || 0) + 1 };
    }

    // Gentle nudge (v3.25) — both actions write the DEVICE's own today and
    // ignore any action payload, so a forged dispatch cannot schedule,
    // rewind, or suppress future nudges. 'shown' is recorded by the app.js
    // effect the moment the card actually paints; dismiss also hides it
    // for the session (ephemeral, never persisted).
    case 'NUDGE_SHOWN': {
      const todayKey = dateKey(new Date());
      return {
        ...state,
        nudge: { ...(state.nudge || defaultNudgeState()), lastShownKey: todayKey },
      };
    }
    case 'NUDGE_DISMISS': {
      const todayKey = dateKey(new Date());
      return {
        ...state,
        nudge: {
          ...(state.nudge || defaultNudgeState()),
          lastShownKey: todayKey,
          // The persisted dismissed-day: "I said no today" is honored for
          // the whole day, reloads included — the ephemeral session flag
          // alone dies with the session and would re-show the card.
          lastDismissedKey: todayKey,
        },
        nudgeDismissed: true,
      };
    }

    // Data health (v3.26) — the export action stamps the DEVICE's own
    // Date.now() and ignores any payload, so a forged dispatch cannot
    // fake an older (or future) backup. The dry-run/storage reports are
    // session readouts: enum-guarded shapes, junk degrades to null.
    case 'BACKUP_EXPORTED': {
      return { ...state, backupMeta: { ...state.backupMeta, lastBackupAt: Date.now() } };
    }
    // (v5.2.53) rolling auto-snapshot stamp (keeps the manual stamp intact).
    case 'BACKUP_AUTO_SAVED': {
      return { ...state, backupMeta: { ...state.backupMeta, lastAutoBackupAt: Date.now() } };
    }
    case 'DATA_HEALTH_STORAGE': {
      const s = action.value;
      const value =
        s && typeof s === 'object' && !Array.isArray(s)
          ? {
              unsupported: s.unsupported === true,
              usage: Number.isFinite(s.usage) && s.usage >= 0 ? s.usage : 0,
              quota: Number.isFinite(s.quota) && s.quota >= 0 ? s.quota : 0,
            }
          : null;
      return { ...state, dataHealth: { ...(state.dataHealth || {}), storage: value } };
    }
    case 'DATA_HEALTH_DRYRUN': {
      const r = action.value;
      const value =
        r && typeof r === 'object' && !Array.isArray(r) && typeof r.ok === 'boolean'
          ? {
              ok: r.ok,
              total: Number.isFinite(r.total) && r.total >= 0 ? r.total : 0,
              kept: Number.isFinite(r.kept) && r.kept >= 0 ? r.kept : 0,
              slices: r.slices && typeof r.slices === 'object' ? r.slices : {},
              at: Date.now(),
            }
          : null;
      return { ...state, dataHealth: { ...(state.dataHealth || {}), dryRun: value } };
    }

    // Prayer-alert reliability status (v3.20) — ephemeral, enum-guarded.
    // Dispatched by app.js's armPrayerTriggers() after it measures what the
    // current browser can actually do.
    case 'ALERT_TRIGGER_STATUS': {
      const modes = ['unknown', 'off', 'permission', 'tab', 'triggers'];
      const raw = action.status && typeof action.status === 'object' ? action.status : {};
      const mode = modes.includes(raw.mode) ? raw.mode : 'unknown';
      const countNum = Number(raw.count);
      const count =
        Number.isFinite(countNum) && countNum > 0 ? Math.min(64, Math.floor(countNum)) : 0;
      // (review v3.21): idempotent — arm passes run on every visibilitychange;
      // a fresh object for an unchanged status re-rendered the app for nothing.
      if (state.alertTriggerStatus.mode === mode && state.alertTriggerStatus.count === count) {
        return state;
      }
      return { ...state, alertTriggerStatus: { mode, count } };
    }

    case 'PRUNE_DANGLING_REFS': {
      // Remove favorites / collection entries whose item no longer exists in
      // the built index (e.g. after the v2.5 data dedupe removed double-
      // entries). Without this, collection counts keep counting dead ids and
      // backups carry them forever. No-ops when nothing dangles.
      const valid = action.validIds;
      const favorites = state.favorites.filter((id) => valid.has(id));
      let collectionsChanged = false;
      const collections = state.collections.map((c) => {
        const items = c.items.filter((id) => valid.has(id));
        if (items.length !== c.items.length) {
          collectionsChanged = true;
          return { ...c, items };
        }
        return c;
      });
      if (favorites.length === state.favorites.length && !collectionsChanged) return state;
      return { ...state, favorites, collections };
    }

    case 'RESTORE_STATE': {
      const restored = {
        ...initialState(),
        ...sanitizeRestoredPayload(action.payload),
        // sanitizeSettings blocks the crafted-mushafPrefs XSS chain and keeps
        // partial/legacy backups from silently switching features off.
        settings: sanitizeSettings(action.payload?.settings),
        // Same defense as hydrate(): an imported backup is user-supplied
        // (or hand-editable) data and must never be trusted as pre-validated.
        customContent: normalizeCustomContentMap(action.payload.customContent),
        library: state.library,
        booted: true,
      };
      // (v5.0.0) a restored backup carries its own contentPrefs — re-apply
      // the lens over this session's raw documents so the restored
      // customizations render immediately.
      if (state.library.raw) {
        const lensed = lensLibrary(
          state.library.raw.documents,
          state.library.raw.order,
          prefsOf(restored)
        );
        restored.library = { ...state.library, ...lensed };
      }
      return restored;
    }

    case 'RESET_ALL': {
      // (v5.0.0) reset wipes prefs — the lensed library returns to the
      // book exactly as bundled.
      const fresh = { ...initialState(), booted: true, library: state.library };
      if (state.library.raw) {
        const lensed = lensLibrary(state.library.raw.documents, state.library.raw.order, {});
        fresh.library = { ...state.library, ...lensed };
      }
      return fresh;
    }

    default:
      return undefined;
  }
}
