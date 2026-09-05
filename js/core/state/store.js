/**
 * core/state — package root docs live in core/state.js (the facade).
 */

import { sanitizeSettings } from '../config.js';
import { debounce } from '../utils.js';
import { normalizeCustomContentMap } from '../schema.js';
import { loadState, saveState } from '../storage.js';
import { initialState, pickPersisted, PERSISTED_KEYS } from './initial.js';
import { reduce } from './reducer.js';
import { sanitizeRestoredPayload } from './restore.js';

class Store {
  constructor() {
    this.state = initialState();
    this._listeners = new Set();
    this._persistFailed = false;
    // v3.7: multi-action atomicity. A single logical user gesture (e.g. one
    // tasbih tap = counter update + statistics + history) used to notify
    // subscribers — and therefore re-render the whole app via innerHTML —
    // once PER dispatch. Batched dispatches coalesce into exactly one
    // notification + one persist after the outermost batch exits.
    this._batchDepth = 0;
    this._batchDirty = false;
    // (v4.2) dirty-slice persistence: ephemeral actions (player ticks,
    // surahPlayback ayah changes, the cheap SPEECH_SET_ACTIVE render
    // nudges) produce new state objects but never touch a persisted slice.
    // They used to trigger the debounced saveState anyway — serializing the
    // FULL persisted blob (customContent + dailyHistory + history + …,
    // potentially hundreds of KB) and writing localStorage on every one.
    // During continuous recitation that was a full serialize per ayah.
    this._persistDirty = false;
    // FIX (review v3.1 A4): a quota-exceeded (or otherwise failing) save used
    // to be swallowed silently — the app appeared to save and didn't.
    // Register a callback to tell the person, once, that persistence is
    // broken (every further write this session is being lost).
    this.onPersistError = null;
    this._persist = debounce(() => {
      this._persistNow();
    }, 200);
    // (v4.3) the debounce is trailing-edge: during sustained tasbih tapping
    // (<200ms apart — the canonical rhythm) NO write lands until the taps
    // stop. Swiping the app away inside that final 200ms window silently
    // lost the whole burst. flushPersist() runs the pending save
    // synchronously from pagehide/visibilitychange, where localStorage
    // writes still complete reliably.
    this._persistPending = false;
  }

  hydrate() {
    const result = loadState();
    if (result.success && result.value) {
      this.state = {
        ...this.state,
        ...sanitizeRestoredPayload(result.value),
        // FIX (review v3.3 B1/B4/B5): settings from storage are untrusted
        // (tampered localStorage, hostile/older backup imports). The old
        // shallow spread let crafted strings reach HTML attributes
        // (stored XSS) and dropped every default key a partial payload
        // lacked, silently disabling features. sanitizeSettings validates
        // every field, clamps numbers, checks enums, and deep-merges the
        // nested objects (prayer / audio / mushafPrefs) over their
        // defaults.
        settings: sanitizeSettings(result.value.settings),
        // Defense-in-depth: localStorage can end up holding malformed custom
        // content from a bad import, manual tampering, or a bug in an older
        // version of this app. Normalize on every load so a single corrupted
        // field can never crash boot — see the "type confusion" incident in
        // the product review (a string where an array was expected crashed
        // the entire app on every subsequent load until storage was wiped).
        customContent: normalizeCustomContentMap(result.value.customContent),
      };
    }
    return this.state;
  }

  /** Run the pending debounced persist NOW (if any). Safe to call when
   *  nothing is dirty — the write is skipped entirely. */
  flushPersist() {
    if (!this._persistPending) return;
    this._persist.cancel?.();
    this._persistNow();
  }

  _persistNow() {
    this._persistPending = false;
    const result = saveState(pickPersisted(this.state));
    if (!result.success && !this._persistFailed) {
      this._persistFailed = true;
      this.onPersistError?.(result.error);
    }
    if (result.success) this._persistFailed = false;
  }

  getState() {
    return this.state;
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  dispatch(action) {
    const prev = this.state;
    const next = reduce(prev, action);
    if (next === prev) return; // no-op action, skip render + persist churn
    const persistedChanged = this._persistedChanged(prev, next);
    this.state = next;
    if (this._batchDepth > 0) {
      // Inside a batch: hold notifications until the outermost batch exits.
      this._batchDirty = true;
      this._batchLastAction = action;
      this._persistDirty = this._persistDirty || persistedChanged;
      return;
    }
    this._notifyAll(action);
    if (persistedChanged) {
      this._persistPending = true;
      this._persist();
    }
  }

  /** True when any PERSISTED slice's reference changed between two states
   *  — the honest signal that localStorage is now out of date. Reference
   *  equality is safe: the reducer never mutates, so a changed persisted
   * slice ALWAYS arrives as a new object. */
  _persistedChanged(prev, next) {
    for (const k of PERSISTED_KEYS) if (prev[k] !== next[k]) return true;
    return false;
  }

  /**
   * Run a multi-action mutation as ONE logical update: subscribers fire
   * (and the app re-renders) exactly once after the whole mutator has run,
   * instead of once per dispatch. Nesting is supported; state reads inside
   * the batch always see the latest composed state immediately.
   */
  batch(mutator) {
    this._batchDepth++;
    try {
      mutator();
    } finally {
      this._batchDepth--;
      if (this._batchDepth === 0 && this._batchDirty) {
        this._batchDirty = false;
        // Subscribers see the LAST action of the batch (the app only ever
        // inspects action.type, e.g. its NAVIGATE modal-close safety net).
        const lastAction = this._batchLastAction;
        this._batchLastAction = null;
        const dirty = this._persistDirty;
        this._persistDirty = false;
        this._notifyAll(lastAction);
        if (dirty) {
          this._persistPending = true;
          this._persist();
        }
      }
    }
  }

  _notifyAll(action) {
    this._listeners.forEach((fn) => {
      try {
        fn(this.state, action);
      } catch (err) {
        console.error('[state] subscriber error', err);
      }
    });
  }
}

/* ---------------------------------------------------------------- */
/* Reducer                                                           */
/* ---------------------------------------------------------------- */

export const store = new Store();
