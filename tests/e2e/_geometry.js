/**
 * tests/e2e/_geometry.js — the layout probes the bilingual sweep shares.
 *
 * These live in ONE module for a reason that is a rule, not a style choice.
 * The overflow check existed only inside `type-scale-200.spec.js`, hardcoded
 * to `language: 'en'` at line 31, so Arabic was never measured anywhere in
 * the repo. One copy of a probe, in one file, is what makes "run it in both
 * languages" cheap enough that nobody skips it — a second copy is a second
 * place to forget the language argument.
 *
 * Two classes of defect, deliberately NOT treated alike:
 *
 *   HARD overflow — the document scrolls sideways. An element with no
 *   scrollable ancestor whose right edge passes the viewport. Always a bug.
 *
 *   HARD clip — text-bearing element whose content is wider than its box AND
 *   which has no ellipsis and no line-clamp. The text is silently truncated
 *   with nothing to indicate it. Always a bug.
 *
 *   SOFT clip — the same measurement on an element that DOES ellipsis or
 *   line-clamp. Usually deliberate (a long reciter name in a fixed column),
 *   so it is REPORTED and ranked, never failed. Failing here would produce
 *   hundreds of false positives on the ~30 intentional `nowrap`+`ellipsis`
 *   sites and the gate would get switched off within a week.
 *
 * The sweep deliberately measures the CHROME too (#topbar, #bottomnav,
 * #playerbar, #immersive-chrome), not only `#main`. `.topbar__brand-text` is
 * `nowrap` + `overflow:hidden` + `ellipsis` inside a hard `height:44px`
 * (assets/css/layout.css:63,98) and holds Arabic — and because `#topbar` is
 * a sibling of `#app`, no `#main`-scoped probe in this repo could ever see it.
 */

/** Regions a defect in any of these is a real, visible defect. */
export const CHROME_SELECTORS = ['#topbar', '#bottomnav', '#playerbar', '#immersive-chrome'];

const MAX_REPORTED = 8;

/**
 * The probe. Runs inside the page; keep it self-contained (no closures over
 * module scope) because Playwright serialises it to source — anything it
 * needs must arrive as an argument, not as a module constant.
 */
export function layoutProbe(opts) {
  const chromeSelectors = opts.chromeSelectors;
  const maxReported = opts.maxReported;
  const doc = document.documentElement;
  const viewport = doc.clientWidth;

  // An element inside a horizontal scroll container is SUPPOSED to be wider
  // than the viewport — that is what a chip row or a wide table is. Only an
  // element with no scrollable ancestor can push the document sideways, and
  // only that is a defect. (Same reasoning as type-scale-200.spec.js:66.)
  const inScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };

  // An element wider than the viewport whose overflow is HIDDEN by an ancestor
  // does not scroll the document — it is silently cut at the screen edge,
  // which is a different defect with a different fix (the ancestor needs to
  // wrap, ellipsise, or scroll) and a misleading symptom (document slack is
  // 0, so a slack-only probe reports the page as clean). Distinguishing the
  // two is what stops "the document does not scroll" from being mistaken for
  // "nothing is wrong".
  const clippingAncestor = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'hidden' || ox === 'clip') {
        return `${p.tagName.toLowerCase()}.${String(p.className || '').slice(0, 40)}`;
      }
    }
    return null;
  };

  // Rendered, and not a decorative or assistive node. `offsetParent === null`
  // is the wrong visibility test: it is null for EVERY position:fixed
  // element, which would silently skip #playerbar and the immersive chrome.
  const isLive = (el) => {
    if (el.closest('script, style, svg, defs, [aria-hidden="true"], .sr-only')) return false;
    const rects = el.getClientRects();
    if (rects.length === 0) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    // Direct text only: a wrapper's width is set by its children, so
    // measuring it reports the child twice and names the wrong culprit.
    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('');
    return ownText.length > 0 || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  };

  const describe = (el) => ({
    tag: el.tagName.toLowerCase(),
    cls: String(el.className || '').slice(0, 56),
    text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44),
    ...(() => {
      const r = el.getBoundingClientRect();
      return {
        right: Math.round(r.right),
        width: Math.round(r.width),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      };
    })(),
  });

  const overflow = [];
  const hardClips = [];
  const softClips = [];

  const scope = [doc.querySelector('#main'), ...chromeSelectors.map((s) => doc.querySelector(s))]
    .filter(Boolean)
    .flatMap((root) => [root, ...root.querySelectorAll('*')]);

  for (const el of scope) {
    if (!isLive(el)) continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    // --- HARD overflow: past the viewport edge with nowhere to scroll ---
    if (rect.width > 0 && rect.right > viewport + 1 && !inScroller(el)) {
      overflow.push({
        ...describe(el),
        right: Math.round(rect.right),
        clippedBy: clippingAncestor(el),
      });
    }

    // --- clipping: content wider than the box ---
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    if (el.clientWidth === 0) continue;
    if (inScroller(el)) continue;
    const elided =
      cs.textOverflow === 'ellipsis' ||
      cs.webkitLineClamp !== 'none' ||
      (cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis');
    const entry = describe(el);
    if (elided) softClips.push(entry);
    else if (cs.overflow === 'hidden' || cs.overflow === 'clip') hardClips.push(entry);
  }

  return {
    viewport,
    slack: doc.scrollWidth - doc.clientWidth,
    // Ordered worst-first so the top of a failure is the actual cause rather
    // than whichever element the DOM happened to visit first.
    overflow: overflow.sort((a, b) => b.right - a.right).slice(0, maxReported),
    overflowCount: overflow.length,
    hardClips: hardClips.slice(0, maxReported),
    hardClipCount: hardClips.length,
    softClipCount: softClips.length,
    softClips: softClips.slice(0, maxReported),
  };
}

/** Convenience wrapper: probe the current page state. */
export function probeLayout(page) {
  return page.evaluate(layoutProbe, {
    chromeSelectors: CHROME_SELECTORS,
    maxReported: MAX_REPORTED,
  });
}

/**
 * One line per defect, for a failure message a human can act on. Offenders
 * are printed rather than swallowed: a gate that reports a count and nothing
 * else cannot be debugged, and "scrollWidth 412 > clientWidth 390" tells you
 * nothing about WHICH chip did it.
 */
export function formatDefects(label, result) {
  const lines = [];
  const pct = (n) => `${Math.round((n / Math.max(1, result.viewport)) * 100)}%`;
  if (result.slack > 1) {
    lines.push(
      `${label}: document scrolls sideways by ${result.slack}px ` +
        `(scrollWidth ${result.viewport + result.slack} > clientWidth ${result.viewport})`
    );
  }
  for (const o of result.overflow) {
    lines.push(
      `${label}: overflow ${o.tag}.${o.cls} "${o.text}" right=${o.right} ` +
        `(${pct(o.right)} of viewport) ×${result.overflowCount}` +
        (o.clippedBy
          ? ` — CUT by ancestor ${o.clippedBy} (overflow-x:hidden; document slack stays 0)`
          : ' — PUSHES the document sideways (no clipping ancestor)')
    );
  }
  for (const c of result.hardClips) {
    lines.push(
      `${label}: CLIPPED ${c.tag}.${c.cls} "${c.text}" ` +
        `scrollWidth=${c.scrollWidth} in clientWidth=${c.clientWidth} ×${result.hardClipCount}`
    );
  }
  for (const c of result.softClips.slice(0, 3)) {
    lines.push(`${label}:   (elided, allowed) ${c.tag}.${c.cls} "${c.text}"`);
  }
  return lines;
}

/**
 * Enforcement is opt-in for one release (owner ruling 2026-10-02): the sweep
 * ships as an INSTRUMENT first, so the findings get triaged and attributed
 * before they can block anyone. Flipping GEOMETRY_ENFORCE=1 turns the same
 * probes into hard assertions with no code change — the measurement was
 * always real, only the verdict was deferred.
 */
export const ENFORCING = process.env.GEOMETRY_ENFORCE === '1';

/**
 * Apply the verdict. Returns the defect lines either way so the run always
 * prints what it found; under ENFORCING it also throws.
 */
export function verdict(defects, testInfo) {
  if (defects.length === 0) return;
  const report = defects.join('\n  ');
  if (!ENFORCING) {
    console.warn(
      `\n[bilingual-matrix] ${defects.length} finding(s) — NOT enforced yet:\n  ${report}`
    );
    testInfo?.attach?.('geometry-findings', {
      body: report,
      contentType: 'text/plain',
    });
    return;
  }
  throw new Error(
    `bilingual layout defects (GEOMETRY_ENFORCE=1):\n  ${report}\n\n` +
      `Offenders are ignored inside horizontal scroll containers by design.`
  );
}
