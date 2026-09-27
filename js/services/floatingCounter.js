/**
 * services/floatingCounter.js — the counter as a floating window.
 *
 * (v5.17.15) A reader counting while doing something else (working, walking,
 * cooking) currently has to keep the tab in front. A native app ships an
 * Android overlay; we cannot — "no build step, no app store" is a standing
 * constraint (ADR 0002). The web equivalent is **Document Picture-in-Picture**
 * (Chromium 116+): arbitrary HTML in a small always-on-top window, with NO
 * permission prompt, no video element, and no native code.
 *
 * Three rules this module holds to:
 *
 *  1. **Feature-detect, never assume.** Safari and Firefox have no
 *     documentPictureInPicture. Callers must hide the affordance rather than
 *     offering a button that cannot work. `isSupported()` is the single gate.
 *  2. **Degrade honestly.** If the browser refuses the request (it can — a
 *     user gesture is required, and a document can be blocked), we surface an
 *     error the caller can show, and we never leave a stale window behind.
 *  3. **One window, one owner.** Re-opening with a new phrase reuses the open
 *     window instead of spawning a second one. The counter value is pushed in
 *     rather than read, so the floating window never becomes a second source
 *     of truth about what was counted.
 *
 * The floating document is a single stylesheet block plus one element: it has
 * to survive without the app's CSS, and it must render in both languages.
 */

/** CSS for the floating window. Self-contained — the app's stylesheet is not
 *  available inside a picture-in-picture document. */
const FLOAT_CSS = `
  :root { color-scheme: light dark; }
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: #ffffff; color: #0d0d0f;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-user-select: none; user-select: none;
  }
  .nur-float {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 2px; height: 100%; padding: 4px 8px;
  }
  .nur-float__label {
    font-size: 11px; line-height: 1.2; max-inline-size: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    opacity: .65;
  }
  .nur-float__count {
    font-size: 28px; font-weight: 700; line-height: 1.1;
    font-variant-numeric: tabular-nums; letter-spacing: -.02em;
  }
  .nur-float--rtl { direction: rtl; }
  @media (prefers-color-scheme: dark) {
    html, body { background: #0b0b0d; color: #f4f4f6; }
  }
`;

/**
 * The floating window's inner markup. Pure and exported so it can be asserted
 * without a browser: a unit test pins the shape, and the e2e only has to prove
 * the plumbing.
 *
 * @param {string} label   the dhikr/phrase name, already localized
 * @param {number} count   current session count
 * @param {number} target  the target this cycle counts toward
 * @param {string} lang    'ar' | 'en' — decides direction, never inferred
 */
export function floatingCounterHTML({ label, count, target, lang }) {
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const rtl = lang === 'ar' ? ' nur-float--rtl' : '';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return `<!doctype html>
<html lang="${esc(lang)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${FLOAT_CSS}</style>
</head>
<body>
  <div class="nur-float${rtl}" id="nur-float" role="status" aria-live="polite">
    <div class="nur-float__label" id="nur-float-label">${esc(label)}</div>
    <div class="nur-float__count" id="nur-float-count" dir="ltr">${esc(count)} / ${esc(target)}</div>
  </div>
</body>
</html>`;
}

/** Single gate for the whole feature. `false` means: hide the affordance. */
export function isSupported() {
  try {
    return (
      typeof window !== 'undefined' &&
      !!window.documentPictureInPicture &&
      typeof window.documentPictureInPicture.requestWindow === 'function'
    );
  } catch {
    return false;
  }
}

let pipWindow = null;

/** True while a floating counter window is open. */
export function isOpen() {
  return !!pipWindow && !pipWindow.closed;
}

/**
 * Open (or re-target) the floating counter. MUST be called from a user
 * gesture: browsers reject the request otherwise, and that rejection is
 * reported rather than swallowed.
 *
 * @returns {Promise<{ok: true}|{ok: false, reason: string}>}
 */
export async function openFloatingCounter({ label, count, target, lang }) {
  if (!isSupported()) return { ok: false, reason: 'unsupported' };
  try {
    // One window, one owner: reuse the open one instead of spawning a second.
    const win = isOpen() ? pipWindow : await window.documentPictureInPicture.requestWindow();
    pipWindow = win;

    // The document may have been closed by the user between check and use.
    if (!win.document) return { ok: false, reason: 'closed' };
    win.document.open();
    win.document.write(floatingCounterHTML({ label, count, target, lang }));
    win.document.close();

    // Keep the two windows in step when the user closes the floating one.
    win.addEventListener?.('pagehide', () => {
      if (pipWindow === win) pipWindow = null;
    });
    return { ok: true };
  } catch (err) {
    pipWindow = null;
    return { ok: false, reason: 'refused', error: String(err?.message || err) };
  }
}

/**
 * Push a new count into the open window. Cheap and idempotent — safe to call
 * on every counter change, which is exactly what the state subscription does.
 */
export function updateFloatingCounter({ label, count, target, lang }) {
  if (!isOpen()) return false;
  try {
    const doc = pipWindow.document;
    const countEl = doc.getElementById('nur-float-count');
    const labelEl = doc.getElementById('nur-float-label');
    if (countEl) countEl.textContent = `${count} / ${target}`;
    if (labelEl && label != null) labelEl.textContent = String(label);
    const root = doc.documentElement;
    if (root) {
      root.lang = lang || 'en';
      root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
    doc.getElementById('nur-float')?.classList.toggle('nur-float--rtl', lang === 'ar');
    return true;
  } catch {
    // A window torn down mid-update is not an error worth surfacing.
    pipWindow = null;
    return false;
  }
}

/** Close the floating window (the reader dismissed it, or we are resetting). */
export function closeFloatingCounter() {
  if (!isOpen()) return false;
  try {
    pipWindow.close();
  } catch {
    /* already gone */
  }
  pipWindow = null;
  return true;
}
