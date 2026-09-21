/**
 * domain/playerShortcuts.js — (v5.12.0) keyboard drills for the players:
 * Space = play/pause, m = mute, ArrowLeft/Right = step (ayah prev/next in
 * verse mode, ∓10s seek in file mode — the dispatcher owns the mode).
 *
 * Pure classifier: given a keydown-ish { key, repeat, ctrlKey, metaKey,
 * altKey, target }, answer 'toggle' | 'mute' | 'arrowLeft' | 'arrowRight'
 * or null (event untouched). The guards are the whole contract:
 *  - modifiers (Ctrl/Cmd/Alt) never hijack — browser/app chords win;
 *  - editable targets (inputs, selects, textareas, contenteditable) never
 *    hijack — typing a search or a journal entry must never pause audio;
 *  - Space on buttons/links keeps its native activate (a focused control
 *    must do its own job, not the player's);
 *  - arrows on ranges/selects keep native behavior (the seek thumb owns
 *    its keys);
 *  - repeats only pass for arrows (held seek); held Space/m would flap.
 * Arrow direction note: ArrowLeft answers the console's LEFT-chevron
 * "next" button in verse mode, and backward-in-time in file mode — each
 * matches its own surface's icons, pinned by tests below.
 */

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function targetOf(e) {
  return e && typeof e === 'object' ? e.target || null : null;
}

function isEditableTarget(t) {
  if (!t || typeof t !== 'object') return false;
  const tag = String(t.tagName || '').toUpperCase();
  if (EDITABLE_TAGS.has(tag)) return true;
  if (t.isContentEditable === true) return true;
  return false;
}

function isInteractiveTarget(t) {
  if (!t || typeof t !== 'object') return false;
  const tag = String(t.tagName || '').toUpperCase();
  if (tag === 'BUTTON' || tag === 'A' || tag === 'AUDIO' || tag === 'VIDEO') return true;
  try {
    if (typeof t.closest === 'function' && t.closest('[role="button"], audio, video')) return true;
  } catch {
    /* hostile target — treat as plain */
  }
  return false;
}

function ownsArrows(t) {
  if (!t || typeof t !== 'object') return false;
  const tag = String(t.tagName || '').toUpperCase();
  if (tag === 'SELECT' || tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') return true; // ranges, numbers, text: native keys win
  try {
    if (typeof t.closest === 'function' && t.closest('input[type="range"], select')) return true;
  } catch {
    /* hostile target — treat as plain */
  }
  // (v5.12.0 hostile review) ayah/word navigation surfaces own Left/Right:
  // a focused ayah or study word walks its run (events.js roving) — the
  // player must not ALSO step the session underneath it (double action
  // from one keypress). Body focus keeps the drills.
  try {
    if (
      typeof t.closest === 'function' &&
      t.closest(
        '.mushaf-ayah[tabindex], .mushaf-ayah__marker[tabindex], .qword[data-action="word-tap"], .pu[data-action="practice-tap"]'
      )
    )
      return true;
  } catch {
    /* hostile target — treat as plain */
  }
  return false;
}

export function shortcutActionForKey(e) {
  if (!e || typeof e !== 'object') return null;
  if (e.ctrlKey === true || e.metaKey === true || e.altKey === true) return null;
  const key = e.key;
  const t = targetOf(e);
  if (key === ' ' || key === 'Spacebar') {
    if (e.repeat === true || isEditableTarget(t) || isInteractiveTarget(t)) return null;
    return 'toggle';
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    if (isEditableTarget(t) || ownsArrows(t)) return null;
    return key === 'ArrowLeft' ? 'arrowLeft' : 'arrowRight';
  }
  if (typeof key === 'string' && key.toLowerCase() === 'm' && key.length === 1) {
    if (e.repeat === true || isEditableTarget(t)) return null;
    return 'mute';
  }
  return null;
}
