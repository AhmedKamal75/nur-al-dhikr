# NEXT HANDOFF — Nūr al-Dhikr local-agent run

For the independent reviewer. Read `RUN-SUMMARY.md` first; it contains the
numbers. This file is what to *do next* and what to * distrust*.

---

## 1. State of the tree

| | |
|---|---|
| Owner's working tree | **untouched**, still dirty exactly as found — nothing restored, reverted, stashed, cleaned, committed or overwritten |
| Work happened in | `/tmp/opencode/nur-5177`, a `git worktree add --detach` copy at `0b038bc` |
| Release produced | **5.17.78**, from the handoff's 5.17.77 |
| Commits made | **none** — see §6 |

Because the work is a detached worktree under `/tmp`, **nothing has been
committed and nothing has touched the owner's branch.** Merging is a deliberate
act, not a side effect. That was the instruction, and it is also the safe
default: the reviewer should read the diff before it lands anywhere.

---

## 2. What I changed

Full detail in `CHANGES.md`. In one line each:

1. `manifest.json` split version markers (the defect you flagged) + the contract
   that let it through, now exact, plus `package-lock` pinned as a sixth marker.
2. 24 files that failed the repo's own `prettier --check`, fixed with the
   sanctioned command.
3. Raw `z-index: 1` → `var(--z-raised)`; the contract now also scans `index.html`
   inline styles.
4. `--color-text-muted` 4.22:1 → 5.04:1 (was failing on ~30 views).
5. **The contrast gate now resolves the real cascade** instead of one hardcoded
   file — the gate had been certifying an overridden token.
6. `midnight` palette dark-mode primary text 4.43:1 → 4.75:1.
7. Gold-on-gold chip 3.72:1 → 4.74:1.
8. `opacity` removed from a text rule whose colour came from another file
   (3.00:1 light / 2.13:1 dark → above AA).
9. Chip hit-area apron un-clipped: `overflow: clip` + `overflow-clip-margin`.
10. `.segmented` wraps at ≤480px — **English-only 66px page-scroll defect**.
11. `mushaf-drag` test race fixed by waiting for the node instead of sleeping.

---

## 3. What I verified (exact)

```bash
npm run check
  # lint + format:check + manifest:check + node --test
  # EXIT 0 — # tests 2730 / # pass 2730 / # fail 0 / # suites 640

npm run manifest:check
  # data manifest: valid (2350 files, full, v5.17.78)   EXIT 0

npm run e2e -- --project=chromium
  # EXIT 0 — 173 passed, 3 skipped, 0 failed  (10.4 min)
  # before the fixes: 21 failed, 152 passed
```

Targeted runs used during triage, all in isolation:

```bash
npx playwright test --project=chromium tests/e2e/mushaf-drag.spec.js                    # 3x: 2 passed
npx playwright test --project=chromium tests/e2e/a11y-matrix.spec.js --grep STATISTICS  # 3x: 2 passed
npm run e2e -- --project=chromium --grep a11y                                           # triage
npm test                                                                                # 9 consecutive clean runs
```

Browser environment, viewport support and the one contention caveat are in
`BROWSER-ENVIRONMENT.md`.

---

## 4. Screenshots

`evidence/LOCAL-AGENT-RESULTS/screenshots/` — **194 files**: the full
192-cell matrix (12 routes × EN/AR × light/dark × 4 viewports) plus 2 `BEFORE__`
captures of the segmented defect from the pristine build. Indexed in
`SCREENSHOT-INDEX.md`, which also carries the Gate E geometry breakdown.

---

## 5. Remaining defects

`OPEN-FINDINGS.md` has all eight with evidence. The three that matter:

- **P1 · `.reciter-row__meta` clipped in Settings at every viewport, including
  1440×900.** 960px of metadata inside a 596px row, cut off by
  `.view--settings { overflow-x: clip }`. Pre-existing. **Not fixed** — the fix
  is a design decision (truncate / wrap / own line / shrink) and belongs to the
  owner.
- **P2 · two sources of truth for every palette colour.** `theme.js` sets
  `--color-primary-raw` inline from `config.js`, which silently defeats
  `deslopify.css`'s definitions for all 11 palettes. The v5.17.7x palette rework
  therefore **never ships**. A reader sees nothing wrong; the CSS is dead code
  that reads as the design of record. One real defect already hid here (the
  `midnight` contrast failure). **Not fixed** — repainting 11 palettes is a
  product-wide decision.
- **P2 · one transient unit failure I could not name.** 9 clean runs, never
  reproduced, and I did not capture its name. Left open rather than guessed at.

---

## 6. What I did **not** do, and would not do without you

- **No commits.** `AGENTS.md` §2 authorises committing, but the instruction for
  this run was to work in a separate copy and leave the owner's tree untouched,
  and a detached `/tmp` worktree is the wrong place to create history. Say the
  word and I will commit in the worktree on a branch, or apply the diff to your
  tree as a single reviewed change.
- **No hostile score.** Explicitly deferred until you have read the evidence.
- **No timeout raised and no retry added** to make the one Chromium-startup
  timeout disappear.
- **No edits** to `AGENTS.md` / `MEMORY.md`, and none to the handoff's own review
  documents.

---

## 7. What the reviewer should inspect next, in priority order

1. **The cascade fix in `tests/cssDesign.test.js`.** It is the highest-leverage
   change in the run and the easiest to get subtly wrong: it reinterprets how
   *every* token assertion in that file resolves. Check that
   `EFFECTIVE_CSS_ORDER` genuinely matches `index.html` and that the
   route-lazy tail is right — if it is wrong, that file now certifies the wrong
   things in a new way.
2. **Whether `overflow: clip` + `overflow-clip-margin` degrades safely.**
   `overflow-clip-margin` needs Chrome 90+, Firefox 102+, Safari 16.4+. Older
   engines fall back to plain `overflow: clip`, i.e. today's behaviour. Confirm
   that fallback is acceptable to you, or ask for a `@supports` guard.
3. **`.reciter-row__meta` (§5).** Decide the intended behaviour, then it is a
   small fix with a pin.
4. **The palette single-source-of-truth decision (§5).** The larger call.
5. **Re-run the full matrix with the two fixes in place** — I re-measured all 40
   previously-flagged cells (0 overflow) and re-captured them, but a fresh
   192-cell sweep and screenshot pass after the final snapshot would be the
   clean confirmation.
6. **Visual review of the 194 screenshots.** I captured and measured them; I did
   not judge them. No score has been assigned and none should be inferred.
7. **Coverage the matrix does not have:** large text / `is-elder` roomy mode,
   forced colors, `prefers-reduced-transparency`, Firefox and WebKit (installed,
   never run), real touch hardware, and the install/update surfaces.
8. **A stricter geometry probe.** Mine cannot distinguish "clipped by an ancestor
   with `overflow-x: clip`" from "clipped by the viewport" — which is precisely
   why `reciter-row__meta` is invisible to it. Build that before trusting a
   clean sweep again.

---

## 8. Honest closing note

The handoff archive described itself as the product of several deslopification
passes and carried a source-only 9.9/10. On this machine it **failed its own
formatter, failed its own version-marker contract, and shipped an accessibility
failure on roughly thirty views** that its own contrast gate reported as green.
That is not a criticism of the previous passes so much as a measurement of what
source review can and cannot reach: every defect above was invisible to reading
the code, and visible the moment a browser was asked.

The two gates are green on the full corpus. Counting honestly: **3**
release-contract defects in the archive were fixed, **7** product defects were
found by the browser and geometry sweep and fixed with proof, **1** test race
was fixed at its cause, **5** assertions were added or strengthened (each proven
to fail on the reintroduced defect), and **8** findings remain open with
evidence. That is the whole claim.
