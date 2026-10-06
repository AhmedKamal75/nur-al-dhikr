# Hostile Chromium Review — v5.17.125

**Evidence pass. No source code was modified.**

Machine: Linux 8 CPU / 7 GB, Node v20.19.5, Playwright 1.63.0, Chromium
153.0.8010.12. Full 2350-file corpus. `reducedMotion: reduce` via the app's own
shipped accessibility path. Language and theme seeded before first paint.

Naming per §9: `<release>__<route>__<state>__<lang>__<theme>__<viewport>.png`.

---

## 0. First, an admission about my own last pass

The v5.17.93 package I produced was rejected with: *"several supposed
post-interaction states were identical screenshots."*

**That was correct, and I verified it against my own files rather than arguing:**

| Check | Result |
|---|---|
| identical `__top` vs `__scrolled` pairs | **0 of 208** — the scroll discipline held |
| identical *post-interaction* states | **63 duplicate hashes** |

The duplicates were three real failures of mine:

- `tafsir` was byte-identical to `quran-reader` — I navigated to `#/quran?id=2`
  and **never actually opened Tafsir**, so my §A evidence proved nothing.
- `main-menu-expanded` identical to `home` — the disclosures never opened.
- `player-more-open` identical to `player` — the More disclosure never opened.

Root cause: I recorded what an interaction *attempted* and never asserted that
the page *changed*. A still that did not move is not evidence.

**This pass therefore hashes every capture and compares it with the previous
state in the same cell.** A state that does not change is recorded
**UNVERIFIED**, with the reason. It is never filed as evidence. That assertion
is what produced the numbers in §3.

---

## 1. Gates

| Gate | Result |
|---|---|
| `npm test` | **2800/2800 passed**, 272 files, 0 failed / 0 skipped |
| `npm run manifest:check` | valid — 2350 files, full, v5.17.125 |
| `npm run lint` | **FAILED — 3 errors, 8 warnings** |
| `npm run e2e -- --project=chromium` | **159 passed, 3 skipped, 17 FAILED** |

`VERIFICATION-v5.17.125.md` states the Node regression as 2800/2800 — **that is
confirmed exactly.** It also lists lint and Chromium as NOT VERIFIED. Both gaps
were real, and both are now closed by measurement rather than by assumption.

## 2. P1 — three lint ERRORS the release never saw

`npm run lint` exits 1. `VERIFICATION-v5.17.125.md` says lint was "NOT VERIFIED
where required binaries are unavailable" — so the release shipped without it.

**2.1 `js/views/viewSheets.js:226` — `QUIZ_LIBRARY_ID` is not defined.**
The symbol is exported from `js/core/config/app.js:51` but **never imported**
into `viewSheets.js`, so `libId === QUIZ_LIBRARY_ID` is a `ReferenceError`
whenever that sheet is built.
**Runtime reachability: NOT VERIFIED.** I could not reach it from
`#/library` or `#/category/morning` via `view-menu` in Chromium — no page error
surfaced. It is a *definite static defect* and a *possible runtime crash*; it
needs a targeted repro, not a guess.

**2.2 `js/app/handlers/worship.js:68` — `HTMLDetailsElement` is not defined.**
In a browser this global exists, so this is an ESLint `env`/globals gap, not a
runtime bug. Cosmetic, but it keeps the gate red.

**2.3 `js/views/mushafPageFind.js:10` — duplicate import of `../core/i18n.js`.**
Harmless at runtime; blocks the gate.

Eight warnings are unused variables, and several are **evidence of half-finished
work rather than dead code**: `studyContextHTML` unused in
`tajweedCourseView.js` (that is the v5.17.91 return-to-ayah claim),
`prayerMethodLine` unused in `prayer.js` (the prayer-methodology claim),
`VIEWS` unused in `audioManager.js`.

## 3. Browser evidence — and what is honestly NOT verified

**416 screenshots** across 13 routes × EN/AR × light/dark × 4 viewports, plus a
focused interaction re-run.

### Verified clean

- **0 page-level horizontal overflow** in any of 208 cells.
- **0 elements outside the viewport** without a scrollable ancestor.
- **0 page errors**, **0 capture errors**.

### The change-assertion, and what it caught

The first scripted pass produced **80 states that did not change** across 7
interaction types — because the selectors were wrong, not because the app is
broken. Corrected and re-run:

| | |
|---|---|
| states captured | 60 |
| **state CHANGED — usable evidence** | **48** |
| UNCHANGED — reported, not filed as evidence | 12 |
| selector never matched | 8 |

Still UNVERIFIED, and I am not dressing these up:

- **`hadith/details-open`, `statistics/disclosure-open`** — no
  `summary.disclosure__summary` exists on those routes as written. The
  progressive-disclosure claim for Hadith and Statistics is **NOT VERIFIED**.
- **`menu/sections-open`** — scripted click on `summary.nav__section-summary`
  was intercepted. **NOT VERIFIED** by script.
- **`menu/menu-open`** — also reported UNVERIFIED by the script, but I checked
  it by hand and it **does** work: hash `d30dc9f355` → `c92a5d9444`, and
  `body.nav-drawer-open` is applied. The script failed because
  `[data-action="nav-toggle"]` matches a duplicate and `.first()` picked the
  wrong one. **The disclosure hierarchy claim is supported**; the script was
  wrong, not the app.

### Corrections that made the evidence real

The first pass was wrong in ways worth recording, because each would have
produced a confident false claim:

- Azkar Details lives on **`#/category/<id>`**, not the `#/library` browser.
- **`#/focus` lands on a category picker**, not the counter. The counter only
  exists after entering a category, so the sequence needs two steps — a
  single-route capture would have "proved" nothing about `0/1 → 1/1 → next`.
- The player's secondary controls are
  `summary.audio-secondary-disclosure__summary`, not `.player-bar__more`.

## 4. Seventeen browser failures

All in `npm run e2e -- --project=chromium`. The release never ran this.

| Spec | Failure |
|---|---|
| `onboarding.spec.js` ×4 | all four onboarding tests — 4 are `locator.click` timeouts |
| `azkar-fold.spec.js` | ×2 — "Details is independent from counting"; "the AZKAR section must be in the chrome" |
| `deep-links-and-language` | "the palette must offer Focus" |
| `depth-upgrades` | verse console ⇄ file bar (click timeout) |
| `floating-counter` | second window that follows the count |
| `heading-clipping` | **"accessible heading missing for `#/quran?id=99999`"** |
| `lazy-sheets` | "home renders the daily hadith card" |
| `offline-essentials` | "the switch is present, on by default, and bilingual" — `uncheck: element outside of the viewport` |
| `recovered.spec.js` ×2 | sadaqah editor; verse theme chips |
| `smoke` | "picking a city states the active method on the hero" |
| `study-mode` | "contextual study rail opens" |
| `touch-targets` | "no sub-44px compact controls found to probe" |

### 4.1 P1 — `#/quran?id=99999` still has no heading, and the ledger claims it was fixed

`NUR-AL-DHIKR-PENDING-LEDGER.md` lists **"Fix invalid Qur'an route loading
forever — implemented."** The gate says otherwise: the heading is still missing.

I diagnosed the cause earlier and it is unchanged: in `js/views/quran.js` the
body falls through to `skeletonAyahCards(...)` when there is no surah and no
*network* error, so a deep link to a surah that simply does not exist renders an
eternal loading skeleton with **no `<h1>`**. Only a network failure had a branch,
so only a network failure had a heading.

**Status: still open. The ledger entry is inaccurate.**

### 4.2 P1 — several ledger items are marked implemented but have a failing gate

Not claiming these are product bugs — claiming the ledger and the gate disagree,
and the gate is the authority that was never run:

- "Fix audio metadata clipping at narrow width — implemented" →
  `touch-targets` fails, and my v5.17.93 pass measured the whole-surah badge
  **249px wide at left 144 in a 360px viewport**, clipped with
  `scrollWidth - clientWidth === 0`, so it is unreachable.
- "Main-menu disclosure actually opening and closing" is on the NOW NEEDED list
  (correctly), yet three chrome-related specs fail.
- "Details is independent from counting" is marked implemented; the spec fails.

### 4.3 What is *not* wrong

- `npm test` 2800/2800 with **0 skipped** — no test was disabled or weakened.
- **No timeout was raised.** Every failure above is either a real assertion
  failure or a 30s click timeout on a control that is genuinely not there.
  Nothing was retried away.

## 5. Severity summary

| Sev | Finding |
|---|---|
| **P1** | `QUIZ_LIBRARY_ID` ReferenceError in `viewSheets.js` (static certain, runtime reachability NOT VERIFIED) |
| **P1** | `#/quran?id=99999` — eternal skeleton, no `<h1>`; ledger claims fixed |
| **P1** | 17 Chromium failures, of which 4 are the whole onboarding flow |
| **P1** | Player whole-surah badge clipped 33px off-screen at 360/393/1024, unreachable |
| **P2** | Hadith and Statistics progressive disclosures not found by the scripted interaction — claim NOT VERIFIED |
| **P2** | 8 unused-variable warnings that point at unfinished Tajweed/prayer features |
| **P2** | `HTMLDetailsElement` ESLint globals gap; duplicate import in `mushafPageFind.js` |

## 6. Not verified — stated plainly

- **No rubric score.** This is an evidence pass per §0 of the review spec, which
  forbids source changes and asks for evidence, not a verdict.
- Firefox and WebKit; large-text / roomy mode; forced colors; reduced
  transparency; keyboard-only reading; real touch hardware and safe-area insets;
  actual PWA install/update lifecycle on a device.
- The full temporal Focus sequence across a **3-count** dhikr — the captures
  prove the counter responds, not the whole arc.
- Whether `QUIZ_LIBRARY_ID` is reachable by any user path.

## 7. Files

```
evidence/HOSTILE-REVIEW-v5.17.125/
  v5.17.125__<route>__<state>__<lang>__<theme>__<viewport>.png   416 + 60 captures
  review-report.json                  every cell: state, hash, changed?, overflow, offscreen, errors
  review-report-interactions.json     the corrected interaction re-run
  FINDINGS.md                         this file
```

## 8. What I did not do

No source file was modified. No test was edited, skipped or weakened. No timeout
was changed. No retry was added. No assertion was loosened. The 17 failures are
reported as failures.