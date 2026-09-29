# AGENTS.md — rules for any AI agent or new maintainer working on Nūr al-Dhikr

This file is the machine-readable contract. It is short on purpose. If a rule
here conflicts with your habit, the habit loses; if a rule here is wrong, fix
this file in the same change that fixes the code.

Human-facing context lives in `MEMORY.md`. Product intent lives in
`docs/PROJECT-PICTURE.md`.

---

## 0. First five minutes

```bash
git status --short          # the worktree is normally DIRTY ON PURPOSE
git log --oneline -5
cat MEMORY.md               # what this project is and what will bite you
node -e "console.log(require('./package.json').version)"
```

Report what you found before you change anything. If the tree state contradicts
what you were told, say so instead of proceeding.

## 1. Non-negotiables

1. **Never invent religious data.** No grade, timing, reciter name, translation,
   tafsir attribution or scripture text from memory or from a plausible pattern.
   Verified source, or an honest `Unknown`/empty state. This is not a
   style preference — it is the product.
   1a. **"Scholar-gated" means unattributed, not unwritten.** (Owner ruling,
   2026-09-27.) Content that needs authority does not have to wait for a
   human to type it into a box. It may be taken from any _verifiable public
   source_ — a published classical text, an institutional ruling body, a
   university/open-source project, an open textbook, a published curriculum —
   provided all five of these hold:

   1. **You name the source.** Author or institution, work, and where a
      reader can verify it. No source, no content.
   2. **You quote, you do not paraphrase into authority.** Prose that will be
      read as religious teaching stays close to the cited text, in its own
      words, with attribution on the same screen.
   3. **The corpus carries provenance structurally**, in the data file
      (`docs/DATA-SCHEMA.md` conventions: bilingual `{en, ar}`, `review` state,
      absent ≠ empty).
   4. **Disagreement is surfaced, not resolved by us.** Where authorities
      differ — makharij are counted 17, 16 or 14 — show the spread and name
      the sources. Picking a side silently is the failure mode.
   5. **Retrieved ≠ certified.** Online material is a _source_, not an
      authority we own. Anything machine-collected keeps a review state and
      the app's existing honest-absence copy until it is signed off.

   What this does **not** permit: writing hadith, tafsir, a grade, a timing, or
   a rule definition from your own memory or from a pattern that "looks right",
   and presenting it as sourced. The gate is **attribution**, not authorship.
   If you cannot cite it, it stays `Unknown` — the speed of the internet does
   not lower the bar, it raises the obligation to cite.

2. **Commit your work, with a real message.** (Owner ruling, 2026-09-27.)
   You are authorised to `git commit`. A commit message is the only durable
   record of _why_ a change happened, so:
   - **Never** write `update`, `fixes`, `wip`, `asdf`, or a bare version bump.
     Say what changed and, when it is not obvious, why.
   - **One logical change per commit.** If a commit needs the word "and" twice
     in its subject, split it.
   - **Both gates green before you commit.** Never commit a red `npm run check`
     or a red e2e run; a red commit is worse than a dirty tree because it
     launders a broken state into history.
   - **Never `git push`,** never `--amend`, never `--force`, never rewrite
     published history. Committing is local; the owner still owns what
     reaches the remote.
   - **Report what you committed** in your summary, so the owner can read the
     log instead of diffing 200 files.
3. **Every user-facing string in Arabic AND English.** One missing language is
   a failing gate, not a nit.
4. **Verify by execution.** A grep is a hypothesis. A test is evidence. Never
   report a finding you did not run.
5. **Fix safely, report loudly.** Small, obvious, covered fixes: just do them
   with a test. Anything touching UX contracts, religious data, or more than
   ~50 lines: report it with a proposal and let the owner decide.

## 2. The version-and-snapshot ritual

Cache-first bytes are pinned on purpose. Any `js/`, `assets/css/`, or `sw.js`
edit requires, in this order:

1. Bump **all five** markers: `package.json`, `APP_VERSION` in
   `js/core/config.js`, `VERSION` in `sw.js`, `version` + `version_name` in
   `manifest.json`, and a new `## vX` heading in `docs/RELEASES.md`.
2. `npm run snapshot-shell` (writes `tests/app-shell-hashes.json`).
3. `npm run manifest:generate` (writes `data/manifest.json`).
4. `npm run compress-data` if you touched anything under `data/`.

Then `npm run check` must be green. `tests/contracts.test.js` enforces every
step; if it fails, you skipped one.

## 3. The gates — what "done" means

```bash
npm run check                          # lint + format + manifest + node --test
npm run e2e -- --project=chromium      # full browser suite
```

Both must pass before you call anything finished. If a test is flaky, prove it
in isolation and say so; do not delete a test to get green.

## 4. Adding things — the checklist that bites

- **New `data-action`**: needs a handler AND an allowlist entry in
  `tests/mushaf-reorg.test.js`. Emit and resolve must both be provable.
- **New file under `js/`**: add it to `APP_SHELL` in `sw.js`, then re-stamp the
  snapshot (`tests/review-v3.3-fixes.test.js` fails otherwise).
- **New settings key**: add it to `js/core/config/sanitize.js`. A key the
  sanitizer does not know is a key that dies on reload.
- **New i18n key**: both languages, or the parity gate fails.
- **New CSS custom property**: must resolve, or `tests/cssDesign.test.js` fails.
  Use logical properties (`inline-size`, `margin-inline-start`) — never physical
  ones — except inside a documented exemption.
- **New view**: keep it lazy. The renderer's static-import budget is capped and
  is already at the cap.
- **Approaching a cap?** `mushafReader.js` is under 800 lines and the renderer
  static budget is 19/19. Extract a module instead of growing a file.

## 5. Style

Match the file you are in. Beyond that: comments explain _why_ a non-obvious
decision was made, never what the next line does. No new dependencies. No
frameworks. No build step. If a change needs a package, it is the wrong change.

## 6. Things that are decided — do not relitigate

Read `MEMORY.md` §4. In short: no accounts, no server, no telemetry, no
gamification of worship, no shame mechanics, translations never leak into
Arabic chrome, transport order never mirrors in RTL, pagination is opt-in and
never interrupts a recitation flow, and honest absence always beats fake
completeness. Bringing any of these up as a "problem" needs new evidence, not
a preference.

## 7. When you are blocked

Say so, and say exactly what you would need. Do not silently narrow the task,
do not stub something and report it as done, and do not quietly skip a gate.
The owner's trust in the green checkmark is the most valuable thing this
project has; a false green costs more than an honest red.

## 8. Before you finish

- [ ] `npm run check` green, and you can say what you ran.
- [ ] New behaviour has a test that would have failed before it.
- [ ] Religious data: source cited, or honestly absent.
- [ ] Both languages for every new string.
- [ ] `MEMORY.md` / `docs/RELEASES.md` updated if the state of the world changed.
- [ ] The owner knows the tree is dirty and exactly what is in it.
