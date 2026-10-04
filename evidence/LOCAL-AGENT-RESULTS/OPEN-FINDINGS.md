# OPEN FINDINGS — Nūr al-Dhikr local-agent run

Everything here is **open**. Nothing in this file is fixed, and nothing in it is
dismissed. Severity is my judgement; the evidence under each is not.

Legend — **P0** blocks the release · **P1** a reader is materially worse off ·
**P2** a real defect with limited reach · **P3** worth knowing.

---

## P1 — 1 · Segmented control widens the whole page in English (FIXED this run)

Found, fixed and pinned. Recorded here because it is the most interesting
finding in the run, and because it demonstrates the failure mode the whole
project is exposed to.

- **Where:** `.segmented`, notably `.quran-mode-switch` (5 buttons), on
  `#/tajweed-course`, `#/quran`, `#/mushaf`, `#/focus` at 360×800 and 393×852.
- **Measured (pristine v5.17.77 build, before):** `scrollWidth` **413** vs
  `clientWidth` **334**, `overflow-x: visible` → **66px of unintended horizontal
  scroll on the entire page**, and **4 of 5** options fully visible. The reader
  could swipe the whole app sideways to reach the fifth option.
- **Arabic was never broken:** the same control measured 334/334 and fit
  exactly. This is the sharpest possible argument for the project's bilingual
  rule — an English-only geometry check would have shipped this, and an
  Arabic-only one would have hidden it.
- **Fix:** `flex-wrap: wrap` inside a `max-width: 480px` breakpoint. Chosen over
  `overflow-x: auto`, which also zeroes the page scroll but leaves the fifth
  option behind a scroller (measured 4/5 visible).
- **After (measured):** `max page horizontal overflow 0px` across all 40
  re-measured cells; 5/5 options visible; every wrapped button ≥ 44px tall;
  **Arabic layout unchanged** (still one row).
- **Evidence:** `screenshots/BEFORE__tajweed-course__en-{light,dark}__en__{light,dark}__360x800.png`
  against the corresponding `tajweed-course__en-*__...__360x800.png`.
- **Pinned by:** `tests/cssDesign.test.js` → "a segmented control wraps on a
  phone instead of widening the page", proven to fail on the reintroduced
  defect and on the scroller variant.

---

## P1 — 2 · `reciter-row__meta` is clipped at every viewport (NOT FIXED)

- **Where:** `#/settings`, `.reciter-row__meta`, inside `.reciter-list`.
- **Measured at 1440×900 (desktop, English):** the meta element measures
  `501..1461` — **960px wide inside a 596px `.reciter-row`** — and its ancestor
  `.view.view--settings` declares `overflow-x: clip`, so the overflow is cut
  off. `documentElement.scrollWidth - clientWidth` is 0, which is why it never
  shows up as page scroll: the clip hides it.
- **Reach:** all 12 settings cells in the Gate E sweep (4 viewports × EN/AR,
  both themes) — i.e. **not** a narrow-screen artefact, it happens on desktop.
- **Pre-existing:** reproduced identically on the pristine v5.17.77 build.
- **Why not fixed:** the honest fix is a decision about what a reciter row
  should do when its metadata is wider than its name column — truncate, wrap,
  move the meta to its own line, or shrink it. Each is a visible design change
  to a settings row, and `AGENTS.md` §5 says UX-contract changes get a proposal,
  not an agent's guess. **This is the proposal, not the patch.**

## P2 — 3 · Browser-startup timeout under 4-worker contention (NOT FIXED)

- **Seen once:** `a11y-matrix › theme: light › STATISTICS` failed with
  `Test timeout of 45000ms exceeded while setting up "page"`. That is
  **Chromium startup** timing out, not an assertion.
- **Evidence it is contention, not the product:** the test passes in isolation in
  ~9s, 3/3. `playwright.config.js:60-70` documents this exact trade-off on this
  very box shape — 4 workers → clean; 6 workers → four tests timing out at 45s.
- **Deliberately not fixed.** Raising the timeout or adding a retry would turn
  a lie into a bigger number, and `AGENTS.md` §9 forbids it. The honest options,
  for the owner to weigh:
  1. leave it and treat a single startup timeout as noise, given 4 consecutive
     full-suite greens were not achieved — see item 4;
  2. lower `PW_WORKERS` on small-RAM machines;
  3. give the a11y matrix its own serial project, at the cost of wall time.

## P2 — 4 · One transient unit-test failure, never reproduced (NOT FIXED)

- First `npm run check` on the overlay: `# pass 2724 / # fail 2`.
  Next run: 2725/1. After the backlog version fix: **9 consecutive runs at
  2729/2729**, then 2730/2730.
- **I cannot name the transient second failure.** That run was piped through
  `tail`, so its name was never captured, and inventing one would be worse than
  the gap. **Unreproduced, left open.**
- The suite contains ~20 files that touch `Date.now()`, `performance.now()`,
  `Math.random()` or `setTimeout`, so a timing-sensitive unit test is a
  plausible home, but that is a hypothesis, not a finding.

## P2 — 5 · The a11y contrast gate could not see a third of the palette (FIXED, but read this)

Not an open defect — an open **risk that is now only partly retired.**

- `js/core/theme.js:65-67` sets `--color-primary-raw` / `--color-accent-raw` as
  **inline styles on `<html>`** from `config.js` PALETTES.
- `assets/css/deslopify.css` also defines `--color-primary-raw` for **all 11
  palettes**, in both light and dark blocks. Those CSS blocks are therefore
  **inert at runtime** — the inline style wins — so the v5.17.7x palette rework
  never actually ships. The Settings swatches and the rendered theme agree with
  each other (both read `config.js`), so a reader sees nothing wrong; the CSS is
  simply dead code that reads as the design of record.
- **Consequence:** there are two sources of truth for every palette colour, and
  only one of them is live. The defect that surfaced from this during the run was
  the `midnight` palette (fixed, `4.43 → 4.75:1`). But the structural exposure
  remains: a future change to `deslopify.css` palette blocks will keep having no
  effect, and may be "verified" by reading the file.
- **For the owner:** decide which file is the source of truth, delete or derive
  the other, and pin it. I did not do this unilaterally because repainting 11
  palettes is a visible, product-wide design decision.

## P3 — 6 · Screenshot matrix has no large-text / forced-colors pass

The matrix covers 4 viewports × EN/AR × light/dark, which is what the protocol
requires. It does **not** cover `--font-scale` / `is-elder` roomy mode, forced
colors, or `prefers-reduced-transparency`. `accessibility.css` has rules for all
three and none of them were visually certified. See `NEXT-HANDOFF.md`.

## P3 — 7 · Only Chromium was run

Firefox (`firefox-1543`) and WebKit (`webkit-2359`) are installed and were
never executed. `playwright.config.js` builds four viewport projects per engine
when `CROSS_ENGINE` is on, so a real cross-engine run is a configuration flag
away — but "available" is not "verified", and I will not report it as either.

## P3 — 8 · My own geometry probe has a known blind spot

Gate E flags any element outside the viewport. I improved it mid-run to ask
whether an ancestor scrolls (which correctly cleared 26 benign flags), but it
still cannot distinguish "clipped by an ancestor with `overflow-x: clip`" from
"clipped by the viewport" — which is exactly why item 2 above is invisible to it.
A stricter probe would compare each element's box against every clipping
ancestor's box. Worth building before the next pass trusts a clean sweep.

---

## Deliberately not reported as defects

- **Prettier reformatting of 24 handoff files.** Mechanical, fixed with the
  sanctioned command, large diff but no semantic change. Called out only so the
  next reader is not surprised by `assets/css/deslopify.css` and
  `docs/BACKLOG.md` showing large diffs.
- **In-scroller items outside the viewport** (26 cells). Legitimate horizontal
  rails — `.chip-row--scroll` with `scrollWidth > clientWidth`. Correctly
  dismissed once the probe learned to ask.
