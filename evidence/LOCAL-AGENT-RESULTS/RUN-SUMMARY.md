# RUN SUMMARY — Nūr al-Dhikr local-agent run (v5.17.77 handoff → v5.17.78)

**Evidence first. No score appears in this packet.** The hostile review has not
been performed yet, by instruction, and the rubric score must not be inferred
from these numbers.

---

## 0. The headline finding

**The supplied v5.17.77 handoff archive does not pass this repository's own
gates.** It was adopted onto a clean full-corpus copy and it failed on the very
first runs, for three separate reasons, all recorded below with reproduction.

The archive's own release note (`docs/FEATURE-HOSTILE-REVIEW-v5.17.77.md`) says
its browser screenshot certification was "open" because the environment "cannot
reliably launch the repository's Chromium stack". That part was true there and
is false here. This machine launches it, and when it did, the browser found
**21 failing accessibility assertions** that no static gate had caught.

---

## 1. Worktree / git state (exact)

The owner's working tree was left **completely untouched** — nothing restored,
reverted, stashed, cleaned, committed, or overwritten there.

| Item | Value |
|---|---|
| Owner's tree | `/home/ahmed_kamal/Projects/Azkar/nur-al-dhikr-claude/nur-al-dhikr` — untouched, still dirty as found |
| Owner's HEAD | `0b038bc` "v5.17.66: the You switch was ten segments in a component built for three" |
| Work used | `/tmp/opencode/nur-5177` — `git worktree add --detach`, detached HEAD, created from `0b038bc` |
| Worktree HEAD | detached at `0b038bc`; release is now **5.17.78** |

**Pre-existing owner state, recorded and NOT touched** (present before this run,
in the owner's tree, still present now):

- `D APP-OVERHAUL-MASTER-ROADMAP-2026-09-24.md` (deleted, 805 lines, tracked)
- `M evidence/overhaul-orth/mushaf-*.png` — 9 modified binaries
- `M evidence/overhaul-orth/orthography-report.json`, `M evidence/overhaul-e2e/route-matrix.json`
- `?? NUR-LOCAL-AGENT-PROMPT-v5.17.77.md`, `?? NUR-LOCAL-AGENT-START-HERE-v5.17.77.md`
- `?? evidence/bilingual-matrix/layout-report.chromium.json`

Owner rulings honoured: the zip is **overlaid**, never treated as a repository
(it omits 2324 tracked corpus files by design); all work happened in the separate
clean copy.

---

## 2. Version markers — exact, before and after

The handoff shipped a **split marker**:

```
manifest.json: "version": "5.17.72"   <-- wrong
               "version_name": "5.17.77"
```

`tests/contracts.test.js` allowed it, because it asserted
`!manifest.version || manifest.version === fromPkg` — a *wrong* marker read the
same as an *absert* one. This is the defect the owner flagged; it was treated as
a real contract break and the assertion was **strengthened, not weakened**.

Because two cache-first bytes had to change (`manifest.json`,
`assets/css/deslopify.css`) and `tests/contracts.test.js` correctly demands a
version bump for exactly that, the release is **5.17.78**, not 5.17.77. This is
the ritual requiring a newer version because additional fixes were made.

| Marker | Handoff as shipped | Now |
|---|---|---|
| `package.json` | 5.17.77 | **5.17.78** |
| `package-lock.json` root | 5.17.77 | **5.17.78** |
| `js/core/config.js` `APP_VERSION` | 5.17.77 | **5.17.78** |
| `sw.js` cache `VERSION` | nur-al-dhikr-v5.17.77 | **nur-al-dhikr-v5.17.78** |
| `manifest.json` `version` | **5.17.72** ✗ | **5.17.78** |
| `manifest.json` `version_name` | 5.17.77 | **5.17.78** |
| `docs/RELEASES.md` newest | `## v5.17.77` | **`## v5.17.78`** |
| `data/manifest.json` | 26 files (seed) | **2350 files, full, 5.17.78** |

Note: the pre-existing `v5.17.66` tree carried `package-lock.json` root
`5.17.2` against `package.json` `5.17.66`. The lock is now pinned as a sixth
marker so that drift cannot recur.

---

## 3. Manifest result

```
$ npm run manifest:generate
data manifest: wrote 2350 files (full, v5.17.78)

$ npm run manifest:check
data manifest: valid (2350 files, full, v5.17.78)
```

Both exit 0. `npm run compress-data` → `compressed 2351 files: 175.6 MB -> 26.4 MB`.

---

## 4. Gate A — `npm run check`

| Run | Result |
|---|---|
| 1st, on the raw overlay | **exit 1** — 24 files failed `format:check`; version-marker defect unproven |
| after fixes | **exit 0** — `# tests 2730 / # pass 2730 / # fail 0`, `# suites 640` |

Full output: `TEST-RESULTS.txt`.

**The handoff failed its own formatter gate with 24 files.** Proven on the
*pristine* archive in a separate directory (`prettier --check` → exit 1, 24
files) before any edit of mine, so this is the archive's defect and not an
artifact of the overlay. Fixed with the sanctioned `npm run format`; the bulk of
the resulting diff is Prettier reflow, which is why `assets/css/deslopify.css`
and `docs/BACKLOG.md` show large but mostly mechanical diffs.

---

## 5. Gate B — `npm run e2e -- --project=chromium`

**Before (raw overlay):** `21 failed, 152 passed, 3 skipped` — 7.8 min. Log:
`e2e-run1-BEFORE-21-failures.log`.

All 21 were `serious` axe violations, and the pattern was one class, not 21 bugs:
light theme failed on a view while **dark passed on the same view**.

| # | Route-level failures (all `color-contrast`, serious) |
|---|---|
| 17 | `a11y-matrix` light: HOME, LIBRARY, MOOD, FOCUS, CALENDAR, RAMADAN, ZAKAT, AUDIO, ROOTS, HADITH, MUSHAF, SETTINGS, ABOUT, JOURNAL, OFFLINE, KIDS, TAJWEED_COURSE |
| 1 | `a11y-matrix` dark: TAJWEED_COURSE |
| 2 | `a11y-all-routes`, `a11y-axe` (aggregates of the above) |
| 1 | `touch-targets` — separate defect, section 6 |

Root cause, proven: `--color-text-muted: #6d756c` measured **4.22:1** on the
paper background `#f6f1e6` (needs 4.5:1) at 12px. One token, ~30 views.

**After:** `173 passed, 3 skipped, 0 failed` — exit 0, 7.5 min. Log:
`e2e-run4-AFTER-GREEN.log`.

Intermediate honest steps, recorded because the count moved for real reasons and
not because anything was suppressed: 21 → 5 (muted token) → 5 → 1 (gold chip +
tajweed opacity) → 1 → 2 (two different infrastructure failures surfaced, see
section 7) → **green**.

---

## 6. Defects found and fixed, with reproduction

Every item below is a *cause* fix, not a symptom patch, and each new assertion
was proven to **fail on the reintroduced defect** before being trusted.

### 6.1 `--color-text-muted` below AA — P1, ~30 views

- **Where:** `assets/css/deslopify.css:20` (added by the handoff).
- **Measured:** `#6d756c` on `#f6f1e6` = **4.22:1**; also 4.44:1 on `#f5f8f2`.
- **Fix:** `#616961` — 5.04:1 on `--color-bg`, 4.64:1 on the darkest light
  surface. Not exempted, not nudged to the threshold: muted ink is still ink.

### 6.2 The contrast gate was reading a token the cascade had already overridden — P0 process defect

**This is the finding that matters most.**

`tests/cssDesign.test.js` asserted "text tiers hold AA on every surface" and
**passed**, while the browser rendered a failing colour. `blockTokens()` read
`CSS['variables.css']` and took the *first* `:root`. The handoff added a second
`:root` in `deslopify.css`, which `index.html` loads **last**, so equal
specificity + later source order meant deslopify's token won — and the gate kept
certifying the dead `#6e6952` (4.90:1, passes) instead of the live `#6d756c`.

A gate that reads an overridden token is worse than no gate: it reports green for
a defect that is on screen.

- **Fix:** `blockTokens()` now resolves the **effective** token set in the shell's
  real cascade order — the stylesheets `index.html` links, in document order,
  then the route-lazy sheets the renderer injects later. Source of truth is the
  shell itself, not a hardcoded filename.
- **Proven:** the repaired contract failed immediately with
  `light: --color-text-muted on #f6f1e6 = 4.23 (need 4.5)`, and also surfaced a
  **second violation the browser run never exercised** (section 6.3).

### 6.3 `midnight` palette primary text below AA in dark mode — P2

- Only reachable because 6.2 was fixed. `config.js` `#111827` mixed 50% with
  white for `--color-primary-text` = **4.43:1** on `#202923` (needs 4.5).
  10 of 11 palettes pass; this one missed by 0.07.
- **Fix:** `#111827` → `#1a2338` (same near-black navy identity), now **4.75:1**.

### 6.4 Gold-on-gold chip — P1

- `.home-hero--line .home-hero__hijri`: `color-mix(--color-gold 88%, --color-text)`
  on its own 10% gold tint `#f6f1e3` = **3.72:1**. Gold text on a gold chip.
- **Fix:** 88% → 70% gold. **4.74:1** on the tint, 5.26:1 on the plain surface.

### 6.5 `opacity` on text defeating a measured token — P1, both themes

- `.taj-course__stage-count` carried `opacity: 0.7` in `tajweed-course.css`
  while its colour was assigned in **another file** as `--color-text-muted`.
  Composited: **3.00:1 light, 2.13:1 dark**. axe flagged `#/tajweed-course` in
  both themes.
- The repo already documents this exact trap in a comment and already removed
  twelve sibling cases in v5.17.64 — but its gate can only see `color` and
  `opacity` in the *same* rule, and states that scope honestly. axe over the
  route matrix is the gate for the cross-file case, and it fired.
- **Fix:** removed the alpha; the token already expresses "secondary".

### 6.6 Chip hit-area apron clipped by its own element — P1 touch target

- **Real defect, not a test artifact.** Reproduced in Chromium via
  `elementFromPoint`: `.card__meta > .chip { overflow: hidden }` (cards.css:81)
  clipped `.chip::after { inset-block: -8px }`, because the apron is a
  **descendant** of the clipped box. The chip looked 40px and *was* effectively
  40px — not the 56px the apron exists to provide. A pointer 5px off the top or
  bottom landed on `.card__top`.
- **Fix:** `overflow: clip` + `overflow-clip-margin: 8px`. Keeps the ellipsis
  (`overflow: clip` clips without becoming a scroll container) and restores the
  apron. Verified in-browser: chip now owns both probed edges, and
  `scrollWidth > clientWidth` still holds so truncation still works.
- **Class enumerated:** a structural scan of every stylesheet found **exactly
  one** rule clipping an apron carrier. Pinned by a new contract.

### 6.7 Raw `z-index: 1` in the new stylesheet — P2

- `assets/css/deslopify.css` shipped `z-index: 1` (Garden timeline icon), which
  the design-system contract forbids in favour of the `--z-*` scale.
- **Fix:** `var(--z-raised)` — the token documented for exactly this local
  stacking. The contract also could not see `index.html`'s inline `<style>`, so
  it now scans that too, with the file-protocol emergency notice documented as
  the one exception.

### 6.8 Segmented control widened the entire page — P1, and English-only

Found by the Gate E geometry sweep, not by any gate. Pre-existing in the
handoff (reproduced on the pristine build).

- `.quran-mode-switch` (5 buttons) at 360×800 measured `scrollWidth` **413**
  against `clientWidth` **334** with `overflow-x: visible` → **66px of
  unintended horizontal scroll on the whole page**, and **4 of 5** options fully
  visible. A reader could swipe the entire app sideways to reach the fifth.
- **Arabic measured 334/334 and was never broken.** This is the sharpest
  argument in the run for the project's bilingual rule: an English-only geometry
  check would have shipped it, and an Arabic-only one would have hidden it.
- **Fix:** `flex-wrap: wrap` inside a `max-width: 480px` breakpoint. Rejected
  `overflow-x: auto`, which also zeroes the page scroll but leaves the fifth
  option behind a scroller (measured 4/5 visible) — the project already distrusts
  scrollers that hide an option.
- **After:** `max page horizontal overflow 0px` across all 40 re-measured cells,
  5/5 options visible, every button ≥ 44px tall, **Arabic unchanged** (1 row).
- Before/after screenshots and the full class breakdown in `SCREENSHOT-INDEX.md`.

---

## 7. Failures I did **not** fix, and why

Reported rather than hidden.

1. **One transient unit-test failure, never reproduced.** The first
   `npm run check` reported `# pass 2724 / # fail 2`; the next run 2725/1; after
   the backlog version fix, **9 consecutive runs at 2729/2729**. I did not
   capture the name of the transient second failure because that run was piped
   through `tail`, and I will not invent it. **Unreproduced, left open.**
2. **`Test timeout of 45000ms exceeded while setting up "page"`** — browser
   *startup* under 4-worker contention on 8 CPUs / 7 GB. Documented in
   `playwright.config.js:60-70`. Passes in isolation in ~9s (3/3). **I did not
   raise the timeout or add a retry**, because a raised timeout is a lie with a
   bigger number. Open finding.
3. **`mushaf-drag` race — fixed at the cause.** `dragBook()` measured
   `.mushaf-book` after a flat `waitForTimeout(2000)`; under load the node was
   still null and it threw on `getBoundingClientRect`. Replaced the sleep with
   `locator('.mushaf-book').first().waitFor({ state: 'attached' })` and dropped
   the flat wait to 400ms. This removes the timing assumption rather than
   lengthening a sleep until it stops complaining. 3/3 in isolation.
4. **Pre-existing dirty owner state** — untouched, section 1.

---

## 8. Visual evidence matrix (Gate C)

**192 screenshots captured**, `screenshots/`, one per
route × language × theme × viewport:

- 12 routes: home, azkar-browser, focus-mode, quran-library, mushaf,
  tajweed-course, tajweed-practice, prayer, you, settings, stats, offline
- 4 modes: EN/light, EN/dark, AR/light, AR/dark
- 4 viewports: 360×800, 393×852, 1024×768, 1440×900

Naming follows the protocol: `<feature>__<lang-theme>__<lang>__<theme>__<w>x<h>.png`.

Gate E geometry probe ran on all 192. **Result: 0 page-level horizontal
overflow after the segmented fix** (4 cells had 66–74px before it).

The 26 cells with elements outside the viewport split three ways, and all three
are recorded rather than summarised away:

| Group | Cells | Verdict |
|---|---:|---|
| `.segmented__btn` | 14 | **Real defect**, fixed and pinned (§6.8) |
| items inside `.chip-row--scroll` | 26 | **Benign** — a horizontal rail, `scrollWidth > clientWidth`, `documentElement.scrollWidth === 0` |
| `.reciter-row__meta` | 12 | **Still open** — 960px inside a 596px row, clipped by `.view--settings { overflow-x: clip }`, at *every* viewport including 1440×900. Pre-existing, **not fixed**: the fix is a design decision. |

My first probe was too naive — it flagged anything outside the viewport without
asking whether an ancestor scrolls. I taught it to ask, which correctly cleared
the 26 benign hits; it still cannot see the `reciter-row__meta` clip, which is a
known blind spot recorded in `OPEN-FINDINGS.md` §8.

`reducedMotion: reduce` was emulated for all captures, using the app's real
shipped accessibility path rather than a test-only stylesheet.

**Not done:** no AR-content inspection at each viewport beyond the automated
geometry probe, no large-text / increased-font-scale pass, no forced-colors pass,
no cross-browser (Firefox/WebKit) capture. These are listed in `NEXT-HANDOFF.md`.

---

## 9. Exact commands run

```bash
git worktree add --detach /tmp/opencode/nur-5177 HEAD
unzip -q -o NUR-AL-DHIKR-LOCAL-AGENT-HANDOFF-v5.17.77.zip -x '*:Zone.Identifier'   # in the worktree
npm install
npm run snapshot-shell      # stamped 276 files at v5.17.78
npm run manifest:generate   # wrote 2350 files (full, v5.17.78)
npm run manifest:check      # valid (2350 files, full, v5.17.78)
npm run compress-data        # compressed 2351 files: 175.6 MB -> 26.4 MB
npm run format              # 24 handoff files were failing prettier
npm run check               # exit 0 — 2729/2729  (later 2730/2730 after the segmented pin)
npm run e2e -- --project=chromium            # 21 failed / 152 passed
#   ... fixes: muted token, gold chip, tajweed opacity ...
npm run e2e -- --project=chromium --grep a11y  # 5 failed / 66 passed  (triage)
#   ... chip apron fix ...
npm run e2e -- --project=chromium            # 2 failed / 171 passed  (two infra failures surfaced)
#   ... mushaf-drag race fix + segmented wrap + pins ...
npm run e2e -- --project=chromium            # exit 0 — 173 passed / 3 skipped
npx playwright test --project=chromium tests/e2e/mushaf-drag.spec.js   # 3x isolation
npx playwright test --project=chromium tests/e2e/a11y-matrix.spec.js --grep STATISTICS  # 3x isolation
node capture-matrix.mjs      # 192 screenshots + Gate E geometry probe
node geometry-sweep.mjs      # Gate E re-measurement across all 192 cells
node verify-flagged.mjs      # re-measured the 40 flagged cells after the fix
node capture-before.mjs      # BEFORE captures from the pristine 5.17.77 build
```

I also ran `npm test` **9 times** consecutively to chase the transient failure in
section 7.1.

---

## 10. What is explicitly **not** claimed

- No hostile score. Not performed yet, by instruction.
- No claim about Firefox or WebKit — never run.
- No claim about real touch hardware or audio output.
- No claim the transient unit failure is fixed. It is unreproduced.
- Nothing here says the product is finished. It says two gates are green on a
  full corpus and that four real defects were found and fixed with proof.
