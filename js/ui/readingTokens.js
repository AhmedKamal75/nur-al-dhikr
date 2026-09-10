/**
 * ui/readingTokens.js — one-shot reading-animation tokens.
 *
 * (v5.2.16) The neutral home for the two single-use transients that used
 * to live as module state in views/mushafReader.js: the page-flip
 * direction and the fullscreen-transition direction. A tap handler sets
 * the token BEFORE it dispatches a navigation; the next renderMushaf()
 * call consumes it exactly once for the enter animation, then it is gone.
 *
 * Why a module of their own: five app-layer modules set these tokens
 * (events, fullscreen, recitationFollow, handlers/quran), and as long as
 * the tokens lived in the view, every one of those modules statically
 * imported the whole Mushaf view — the exact edge that blocks lazy-
 * loading the heaviest view in the app (F-013). Both layers may import
 * ui/ (views → ui is allowed; app → ui is allowed), so neither side
 * reaches across anymore. Anything that reads content still reads the
 * store; these tokens are animation intent, not content, which is why
 * they live outside the reducer (promoting them would buy a
 * double-render per page turn for zero probe value — same rationale as
 * the documented compromise they replace).
 */

let flipDirection = null;
let fullscreenAnim = null;

/** Page-turn animation for the NEXT render: 'next' | 'prev'. */
export function setFlipDirection(dir) {
  flipDirection = dir;
}

/** Consume-once read for renderMushaf(): second call gets null. */
export function consumeFlipDirection() {
  const dir = flipDirection;
  flipDirection = null;
  return dir;
}

/** Fullscreen-transition animation for the NEXT render: 'in' | 'out'. */
export function setFullscreenAnim(dir) {
  fullscreenAnim = dir;
}

/** Consume-once read for renderMushaf(): second call gets null. */
export function consumeFullscreenAnim() {
  const anim = fullscreenAnim;
  fullscreenAnim = null;
  return anim;
}

/** Test-only: drop both tokens so cases isolate. */
export function resetReadingTokensForTests() {
  flipDirection = null;
  fullscreenAnim = null;
}
