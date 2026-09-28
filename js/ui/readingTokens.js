/**
 * ui/readingTokens.js — one-shot reading-animation tokens.
 *
 * (v5.2.16) The neutral home for the single-use transients that used to
 * live as module state in views/mushafReader.js: the page-flip direction
 * and the fullscreen-transition direction. A tap handler sets the token
 * BEFORE it dispatches a navigation; the next renderMushaf() call consumes
 * it exactly once for the enter animation, then it is gone. (v5.17.21 added
 * the third, mushafTarget — same shape, a reveal request rather than an
 * animation.)
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
 *
 * One token, one setter, one consumer: a consume-once read nulls the
 * variable it read and nothing else. They used to share a blast radius,
 * which only held because the caller happened to sequence them right.
 */

let flipDirection = null;
let fullscreenAnim = null;

/** Page-turn animation for the NEXT render: 'next' | 'prev'. */
export function setFlipDirection(dir) {
  flipDirection = dir;
}

/** Consume-once read for renderMushaf(): second call gets null.
 *
 * (v5.17.21) This clears ONE token, not two. It used to null
 * mushafTarget as a side effect — harmless only because the renderer
 * happens to set the target after the view has already taken the flip,
 * which is an ordering accident, not a contract: reorder those two steps
 * and a mushaf deep link silently stops revealing its ayah. Each token
 * is one intent, one setter, one consumer; a consume-once read must
 * consume only what it read. */
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

/** Test-only: drop every token so cases isolate. */
/**
 * (v5.17.21) "Open the mushaf at 2:255" needs a DOM effect after the patch:
 * reveal the ayah. A view is a pure string template, so the request travels
 * as a one-shot token exactly like the flip and fullscreen animations — set
 * by whoever handled the navigation, consumed by the renderer once, so a
 * reload cannot re-scroll a reader who has since moved on.
 */
let mushafTarget = null;

/** The renderer calls this after the mushaf patch lands. */
export function consumeMushafTarget() {
  const t = mushafTarget;
  mushafTarget = null;
  return t;
}

export function setMushafTarget(surah, ayah) {
  mushafTarget =
    Number.isFinite(Number(surah)) && Number(surah) > 0
      ? { surah: Number(surah), ayah: Number(ayah) }
      : null;
}

export function clearMushafTarget() {
  mushafTarget = null;
}

export function resetReadingTokensForTests() {
  flipDirection = null;
  fullscreenAnim = null;
  mushafTarget = null;
}
