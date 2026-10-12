# MEMORY.md — the working memory of Nūr al-Dhikr

**Read this first, in every session, before touching code.** It exists because a
long-running project lost its thread when a session context was compacted and
nothing on disk carried the state forward. Everything here is verified against
the tree, not remembered. When something here is wrong, fix this file in the
same change that fixes the code.

Last verified: **v5.17.138**, `npm run check` green (2870 pass / 0 fail), Chromium E2E green (180 passed, 3 skipped).

---

## 1. The six things that will bite you

1. **Five version markers move together or not at all.** `package.json`,
   `APP_VERSION` (`js/core/config.js`), `VERSION` (`sw.js`), `manifest.json`
   (`version` + `version_name`), and the newest `## vX` heading in
   `docs/RELEASES.md`. Then `npm run snapshot-shell` and
   `npm run manifest:generate`. `tests/contracts.test.js` enforces all of it.
2. **Cache-first bytes are pinned.** Any change to a `js/`, `assets/css/`, or
   `sw.js` file makes `tests/contracts.test.js` fail until you re-stamp the
   shell snapshot. This is intentional; do not "fix" the test.
3. **Never invent religious data.** Grades, timings, reciter names and scripture
   text come from a verified source or degrade to an honest empty/Unknown. No
   placeholders, no plausible-looking guesses, no mass-generated commentary.
4. **Every user-facing string exists in Arabic AND English.** The i18n parity
   gate is a hard failure, not a warning.
5. **Commit your work, with a real message.** (Owner ruling, 2026-09-27.)
   Local commits are authorised and expected; the message is the only durable
   record of why, so one logical change per commit, no `wip`/`fixes`, both
   gates green first. Never push, never amend, never force.
   5a. **"Scholar-gated" means unattributed, not unwritten.** (Owner ruling,
   2026-09-27.) Religious content may be taken from any _verifiable public
   source_ — a classical text, an institution, an open textbook, a published
   curriculum — if you name it, quote rather than paraphrase into authority,
   carry provenance structurally, surface disagreement instead of picking a
   side, and keep a review state until signed off. The gate is **attribution,
   not authorship**. What is still forbidden: writing a hadith, tafsir, grade,
   timing or rule definition from memory and presenting it as sourced.

6. **Itqan — do the work excellently, not merely done.** A gate you did not
   run is not a gate you passed. Prefer the honest red you can explain over
   the green you cannot. A commit message claiming a number nobody read is the
   worst thing in this repo, because it is the only failure nothing downstream
   can catch.


    Prefer sophisticated simplicity: solve the whole problem with the smallest clear, testable
    design. Never add complexity for its own sake; this complements and never relaxes existing rules.

## 2. Architecture in one page

- **Stack:** vanilla ES modules, no build step, no framework, no dependencies.
  Plain CSS in `assets/css/` with a strict load order. `python3 -m http.server`
  for local serving.
- **Two audio engines, one voice at a time.** Verse-by-verse
  (`js/services/surahPlayback.js` + driver `js/services/recitation.js`, pooled
  `<audio>` elements, adaptive lookahead k∈[2,8] seeded at 5) and full-surah
  single file (`js/services/player.js`, 312 moshafs). Whichever starts, stops
  the other.
- **The content lens is the heart of the data layer.** Bundled libraries are
  immutable; every user change (hide / reorder / re-target / edit / delete /
  add) lives in `settings.contentPrefs` as a lens over them. "Restore defaults"
  is therefore always just "delete the override key". Custom libraries live in
  `state.customContent` and use the editor service instead.
- **Rendering:** `#main` is re-rendered through a patch layer; views are pure
  `state → HTML` functions; no view attaches listeners (delegated
  `data-action` handlers only).
- **Caps that exist on purpose:** `js/views/mushafReader.js` < 800 lines;
  renderer static-view imports ≤ 22; change/input registry counts are pinned.
  When you approach a cap, extract instead of growing.

## 3. Where the state of the product is written down

| Question                                   | File                      |
| ------------------------------------------ | ------------------------- |
| What does the owner want, macro and micro? | `docs/PROJECT-PICTURE.md` |
| What did each release change?              | `docs/RELEASES.md`        |
| What has been audited and closed?          | `docs/AUDITS.md`          |
| What is still open, and why?               | `docs/OPEN-ISSUES.md`     |
| Which data came from where?                | `data/SOURCES.md`         |
| What can only be checked on a phone?       | `docs/DEVICE-TEST.md`     |
| Architecture rules and why                 | `ARCHITECTURE.md`         |
| Machine rules for agents                   | `AGENTS.md`               |

## 4. Standing product decisions (do not relitigate without new evidence)

- **Zero account, zero server, zero telemetry.** No analytics, no phone-home.
  Gap telemetry is opt-in, local-only, and clearable in one tap.
- **Adab over gamification.** No confetti, no leaderboards, no shame
  mechanics, no streak-loss copy. A streak freeze absorbs one missed day.
  `js/domain/nudge.js` is test-pinned against streak/shame vocabulary.
- **No forced memorization.** Nothing gates content behind a streak.
- **The corpus is the Sunni kutub sittah; this is disclosed, not hidden.** See
  `about.scope.sunni` and `data/SOURCES.md`. Do not silently add other
  madhhab collections — that is a scholarly decision, not an engineering one.
- **Translations never cross into Arabic chrome.** Transliteration and
  translation render in EN only. Proper nouns (surah and reciter names) are the
  deliberate exception, rendering in both scripts.
- **RTL uses logical properties only.** Transport/sequence order (prev → play →
  next) is pinned `direction: ltr` so it never mirrors; icons inside it are not
  flipped.
- **Continuous reading flow is sacred.** Pagination is opt-in. Never insert
  page breaks into a recitation or reading flow the user is inside.
- **Honest absence beats fake completeness.** "Unknown" grade, missing timings,
  no cached audio — each is stated, never faked.

## 5. Open items carried forward

See `docs/OPEN-ISSUES.md` for the full list with owners. The ones most likely to
be forgotten:

- **TOP PRIORITY — Tajweed is wrong in the Mushaf reader (ledger row 99).** The
  classifier was written against the `data/quran/*.json` rasm and is not
  rasm-agnostic. The same ayah is coloured differently depending on which door the
  reader entered, on **1,221 of 6,236 ayahs (19.6%)**. Three spellings cause it:
  Madd Badal lost (267 ayahs — Mushaf writes `hamza-above + fatha`, corpus writes
  `hamza + madda-above`, so Badal falls through to `madd_2`); Madd Iwaḍ spuriously
  added (716); Iqlab crossing a word boundary (260). Normalising the rasm does not
  close the gap. Until this is fixed, **any** Tajweed work measured against the
  corpus is silently wrong in the Mushaf. Details in the handoff doc and row 99.
- **Scholar-gated, never machine-filled:** grades for `pdf-duas`, `daily-sunnah`,
  `reflections`; the 30 quranic items in simplified orthography (F5); whether
  Bismillah-as-interactive-text is acceptable; qalqalah colour convention; a
  wudu/adab line.
- **Needs real hardware:** every row of `docs/DEVICE-TEST.md`.
- **Deliberately out of scope for v5:** UI chrome in Turkish/French/Urdu/Indonesian
  (verse translations ship; chrome does not).

## 6. How to verify a claim in this repo

The house rule is _verify by execution_. Concretely:

```bash
npm run check          # lint + format + data manifest + node --test
npm run e2e -- --project=chromium
npm run snapshot-shell -- --check
```

Never report a finding you did not run. A grep is a hypothesis; a test is
evidence. When you fix something, add the pin that would have caught it —
a sweep that only finds bugs without adding traps is a failed sweep.

## 7. Session hygiene

- Start with `git status --short` and `git log --oneline -5`, and report both.
- The worktree is normally dirty on purpose. Do not revert what you did not
  write; do not revert what you did not understand.
- If a session is compacted or dies, this file plus `docs/RELEASES.md` plus
  `git diff` is the whole recovery path. Keep them current.
