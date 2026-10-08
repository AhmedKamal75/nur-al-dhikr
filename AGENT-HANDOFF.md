# AGENT-HANDOFF.md — read this first, then work

**Current head:** `v5.17.136` · branch `main` · upstream `origin/main` is in sync.

Shared source of truth is GitHub `main`. Work from repository history and the current PR/issue trail; do not use ZIP handoffs as the project workflow.

## The one rule that decides whether your work counts

**Run the browser gate and report it honestly, even when it is red.**

A release of this project shipped once with `npm test` at 2831/2831 green and
ten browser tests failing, and reported only the first number. Both numbers are
true; quoting only the flattering one is how a regression reaches users. From
v5.17.136 this is the standing expectation:

```bash
npm run check                            # must be green before you commit
npx playwright test --project=chromium   # must be run; report the real count
```

If the browser gate is red, say so in the commit message and in
`docs/versions/`. An honest red is worth more than a green you did not measure.

## What v5.17.136 is

v5.17.135 unified the Audio sleep timer into one control with one ladder.
Real-Chromium evidence showed that release had a regression which made its own
headline feature unusable, and a second control that did nothing. Both are
fixed here:

- **Disclosure collapse.** Any interaction inside a `<details>` on `#/audio`
  collapsed every disclosure on the route (5 open → 0). Identical actions at
  v5.17.126 preserved all 5. `open` is now treated as a user-owned toggle in
  `js/app/renderer.js`; state-driven disclosures opt in with
  `data-open-controlled`.
- **Dead Home panel switch.** `resolveHomePanels()` only places a panel on Home
  if it is in the saved order, and only the reorder buttons ever wrote that
  order — so unticking a panel's switch changed `hiddenHome` and nothing
  appeared, for nine of twelve panels.

Current gates: `npm run check` **2836/2836** · Chromium **175 passed, 3 skipped,
1 deliberately red** (see below).

## The one red test — read before you touch it

`tests/e2e/smoke.spec.js` expects the prayer method line to carry its
`Source (unverified):` qualifier. The v5.17.x compact hero line dropped it, so
the hero now reads:

> Muslim World League · Asr Juristic Method: Standard (Shafi'i / Maliki / Hanbali)

while `data/prayer-methods.json` records MWL as `"verified": false` and
`data/SOURCES.md` documents that only secondary corroboration exists.

**The test is correct and the copy is the problem.** Restoring the qualifier is
a worship-surface decision that belongs to the owner. Do not "fix" this by
editing the assertion — that deletes the guarantee silently.

## Working rules that will catch you out

- **Never invent religious data.** No grade, timing, reciter, translation or
  ruling from memory. Verified source, or an honest `Unknown`. A name you cannot
  cite stays `Unknown`; citing a verifiable public source is allowed and
  expected, but the attribution must be on the same screen as the claim.
- **Both languages, every string.** One missing language is a failing gate.
- **Release ritual — all five markers or the contract test fails:** `package.json`,
  `APP_VERSION` in `js/core/config.js`, `VERSION` in `sw.js`, `version` +
  `version_name` in `manifest.json`, plus a `## vX` heading in
  `docs/RELEASES.md`. Then `npm run snapshot-shell`, `npm run manifest:generate`,
  and `npm run compress-data` if anything under `data/` moved.
- **New `data-action`** needs a handler _and_ an allowlist entry in
  `tests/mushaf-reorg.test.js`. **New file under `js/`** needs an `APP_SHELL`
  entry in `sw.js` and a fresh snapshot. **New settings key** needs to be known
  to `js/core/config/sanitize.js` or it dies on reload. **New i18n key** needs
  both languages.
- **Commit your work** with a message that says what changed and, when it is not
  obvious, why. One logical change per commit. `update` and `wip` are not
  messages.
- **Prefer dynamic over static.** Derive labels, counts and nav chrome from the
  source of truth rather than pinning parallel lists. A static pin that cannot
  be derived must name its source in a comment and in its test.
- **Per-version records belong in `docs/versions/`.** The project root holds
  16 core documents; release-by-release notes, hostile reviews and verification
  records live under `docs/versions/`. Agent scratch (`.batch-*.txt`, stray
  `*.txt` slices, `*.sha256` of another machine's paths, Windows
  `:Zone.Identifier` markers) is gitignored and must never be committed.

Full contract: [AGENTS.md](AGENTS.md). Product intent:
[docs/PROJECT-PICTURE.md](docs/PROJECT-PICTURE.md). Project memory and the
settled decisions: [MEMORY.md](MEMORY.md).

## Where the open work is

- `docs/OPEN-ISSUES.md` — the durable ledger. Add a row for anything you find;
  a defect with no row will be forgotten.
- `docs/BACKLOG.md` — planned work, with the version the tree is actually on.
- `docs/versions/NUR-AL-DHIKR-PENDING-LEDGER.md` — the persistent request
  ledger.
- Browser/device certification is still **REQUIRED** and still open: large text
  at 200%, reduced motion, forced colours, safe-area insets, keyboard-only
  operation and real-device screen-reader behaviour have no evidence yet.
- **Not yet verified anywhere:** real audio playback and the sleep-timer fade
  (headless has no audio device), Firefox and WebKit, Mushaf Find/spread/
  fullscreen, bookmark reopen, Hadith Reference, oversized-import hardening.

## Next hostile/deslopification wave — 2026-10-08

The owner has replaced ZIP-to-chat handoff with GitHub as the shared source of truth. Work from `main` history and the current PR/issue trail.

### Current candidate

- **PR #11** `fix: restore desktop navigation collapse and actionable menu sections` — implementation candidate, currently 18 commits behind `main`; refresh/rebase required before merge.
- **PR #10** `feat: give Practice its own focused task launcher (current main)` — implementation candidate, currently 14 commits behind `main`; refresh/rebase required before merge.
- **PR #9** `fix: invalidate Mutashabihat pairs when corpus changes` — correctness candidate, currently 13 commits behind `main`; refresh/rebase required before merge.
- All three remain subject to honest GitHub Actions plus local Chromium evidence before merge.

### Hostile-review queue

See GitHub issue #1 for the owner's six current product findings:

1. **Mutashabihat / Look-alike Ayat:** geometry/scaling plus content-depth enrichment. Measure current browser states before CSS changes.
2. **Tajweed Course:** expand from a curriculum/practice shell into a real beginner→advanced written interactive course. Source-backed, bilingual, offline, no invented religious prose.
3. **Calendar:** current dual-date grid needs responsive/visual polish. Evidence first at phone/tablet/desktop and EN/AR light/dark.
4. **Practise IA:** current Practice door is Tasbih + 99 Names Quiz while Tajweed/Mutashabihat practice sits elsewhere. Audit the jobs-to-be-done before adding or moving navigation.
5. **Offline Library:** v5.17.135 fixed the primary switch visibility defect; audit the whole page for remaining density/hierarchy/polish issues without burying Essentials again.
6. **Settings:** Arabic typeface specimen cards and palette swatches need real visual refinement; source-level fixes are not considered certified until current browser evidence proves them.

### Evidence rule

Do not mark a visual issue resolved from source inspection alone. Capture the current state, interaction state where relevant, and EN/AR + light/dark + representative widths. Keep stale selector failures separate from product defects.

### Preserve

No Home dashboard, no generic “More”, no decorative sacred banners, no per-dhikr audio corpus, no invented grades/rulings/methodologies, no timeout inflation, no weakened assertions.

### Active implementation candidates

- **Prayer provenance fix: MERGED.** The focal prayer method line again carries the bilingual `Source (unverified):` qualifier. The merged browser gate recorded `npm run check` **2836/2836** and Chromium **176 passed / 3 skipped / 0 failed**. The repository version marker remains v5.17.136 until the next release bundle is formally versioned.
- **Tajweed noon-Izhar correctness fix: ON MAIN, next release.** The noon lesson no longer points at `izhar_shafawi`; main now has a sourced `izhar` rule, throat-letter classification, canonical/runtime course parity, and deterministic regression coverage. Formal release bump still waits for browser certification and the release ritual.
- **PR #7 — Practice IA:** `feature/practice-ia-current-v2`. Adds a lazy Practice landing with Tasbih, Tajweed Practice, Qur'an Recall and 99 Names while preserving Qur'an ownership of the full Tajweed Course. It is a current-main candidate but must be refreshed against current `main` before merge.
- **PR #8 — Mutashabihat cache correctness:** `fix/mutashabihat-corpus-cache-current`. Keys computed pairs by corpus object identity and adds regression coverage. Refresh against current `main` before merge.
- **PR #6 — desktop navigation/actionability:** `fix/navigation-shell-current-v2`. Restores an explicit desktop rail collapse/expand control, separates parent section navigation from disclosure, and preserves the current mobile active underline. It is currently stale against `main`; refresh before merge.
  - Focused browser gate: `npx playwright test tests/e2e/navigation-shell.spec.js --project=chromium`.
  - Matrix requirement: 1024/1440 desktop and 360/393 mobile, EN/AR, light/dark; verify parent links, child links, app-tail links, collapse/expand, drawer Escape/overlay, RTL chevrons, and mobile underline geometry.
