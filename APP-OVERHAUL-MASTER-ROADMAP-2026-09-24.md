# Nūr al-Dhikr — App Overhaul & Master Roadmap

**Audit date:** 2026-09-24  
**Repository audited:** `nur-al-dhikr-v5.17.8-full(2).zip`  
**Baseline version:** 5.17.8  
**Role:** Independent Lead Auditor / Architect  
**Execution posture:** Safe P0 defects fixed directly; higher-risk/content-heavy work converted into bounded Agent-1 tasks.

---

## 1. Executive Verdict

The v5.17.8 implementation is materially stronger than the Master Auditor Prompt implies in several areas. The repository already contains:

- a real Quran word-study corpus with **77,429 token rows**;
- **100% contextual-study-row coverage** and **100% iʿrab/morphology-row coverage** for those tokens;
- **1,651 unique Qur'anic roots**, with **1,651 root-meaning records** (100% root-key coverage);
- an existing ayah-audio mirror chain and player controls;
- an SVG-framed Mushaf surah banner;
- Tajweed underline preference plumbing;
- Sajdah accent handling and dedicated tests;
- offline/service-worker infrastructure and extensive Node test coverage.

However, three P0 runtime problems in the supplied implementation were worth fixing immediately:

1. Mushaf navigation could route to a page before the lazy page request had completed, making a fast swipe/arrow capable of exposing the loading/blank state.
2. Fullscreen controls were only faded to `opacity: 0.12` and moved by 10px, not actually removed from the viewport.
3. Geolocation denial only produced a toast and did not explain recovery or provide a complete city fallback from the onboarding path.

Those three defects are now patched in the working copy and covered by contract tests.

The largest remaining issue is **lexicon semantics**, not token coverage. The repository has a full token-study row for every Quranic token, but the lemma dictionary currently covers 70,819/77,429 token occurrences (91.46%), synonym lists exist for 10,601 occurrences (13.69%), and antonym lists for 15,441 (19.94%). Those percentages are not defects by themselves: many grammatical particles and function words legitimately do not have useful synonym/antonym sets. The correct product contract is therefore "100% field-aware lexical coverage" — every applicable field is populated or explicitly marked `NOT_APPLICABLE` / `NOT_ATTESTED` with provenance, never silently blank and never fabricated.

---

# 2. Minimal Bundle & Environment Verification Status

## 2.1 Baseline package facts

| Item | Verified result | Verdict |
|---|---:|---|
| Repository package version | 5.17.8 | PASS |
| Original supplied ZIP | ~60 MB | ABOVE requested 20–30 MB seed target |
| Extracted working tree | ~241 MB | Expected for full corpus |
| `data/quran-words` | ~44 MB | Full corpus |
| `data/quran-word-study` | ~19 MB | Full study corpus |
| `data/tafsir` | ~62 MB | Full commentary corpus |
| `data/hadith` | ~60 MB | Full hadith corpus |
| Full Node test run | Timed out before final summary in this environment | UNVERIFIED |
| Targeted Node suites | 58 tests passed, 0 failed | PASS |
| Browser E2E | Browser environment unavailable for the final run | UNVERIFIED |
| Cross-engine | Not executable here | HARDWARE/ENV GAP |

## 2.2 Seed-builder audit

The existing `scripts/build-seed.mjs` already performs the requested semantic pruning:

- Qur'an: 3 surahs (1, 32, 112)
- Adhkar: exactly 15 items
- Hadith: 6 Nawawi samples
- Tafsir/grammar: the three seed surahs
- Word-study: the three seed surahs
- Tajweed practice: seed-surah rows

The script currently uses maximum ZIP compression and produces approximately **7.1 MiB**. A stored/no-compression archive of the same semantic seed is approximately **18.3 MiB**. The requested "20–30 MB" floor is therefore a packaging constraint rather than a content constraint: forcing the archive above 20 MB would require adding bytes that are not required by the seed contract (or intentionally reducing compression).

### Architecture decision

**Do not pad the product archive.** The quality gate should be:

> semantic seed completeness + runnable offline project + **≤30 MB** (with 50 MB as a hard ceiling), not an arbitrary minimum byte count.

Agent-1 should only change the compression/content rule if the owner explicitly requires the 20 MB floor for a distribution reason.

## 2.3 Bundle artifact

A semantic seed bundle is included with this audit. It is intentionally smaller than the requested floor rather than padded with redundant data.

---

# 3. P0 — Mandatory RTL Swipe, Fullscreen UX, Location Permission & 100% Lexicon

## P0-A — Mushaf navigation race: FIXED

### Previous implementation quality

The existing `mushafSwipeTurn()` mapping is internally consistent with the current Arabic book-order model: a leftward finger movement is treated as the next page. Dedicated unit tests pinned that contract. The implementation error was elsewhere: the gesture/key/button handlers could navigate immediately while the destination page was still only being prefetched on a best-effort basis.

### Direct fix applied

New shared navigation contract:

```text
input gesture/button/key
        ↓
compute destination
        ↓
await exact destination page(s)
        ↓
only then change Mushaf route
```

Implemented in:

- `js/app/lazyData.js`
  - added `ensureMushafNavigationPages(page)`
- `js/app/handlers/quran.js`
  - added `navigateMushafPage(direction)`
  - `mushaf-prev` and `mushaf-next` now use the shared path
- `js/app/events.js`
  - keyboard and touch turns now use the same shared path

### Acceptance

- no route change into an unloaded target page;
- both sides of a two-page spread are loaded before navigation;
- network failure leaves the user on the current page and gives a recoverable message;
- swipe, keyboard and arrow controls cannot diverge in their navigation implementation.

### Verification

The following targeted suites passed:

- gesture contract tests;
- Mushaf rendering tests;
- audio mirror tests;
- Quran word-study coverage tests;
- lexical provenance tests;
- new P0 contract tests.

---

## P0-B — True fullscreen chrome removal: FIXED

### Previous implementation quality

The current implementation already had a deliberate fullscreen state machine, wake lock and idle timer, but its visual end-state deliberately used:

- `opacity: 0.12`
- `translateY(10px)`
- `pointer-events: none`

That contradicts the requested immersive contract.

### Direct fix applied

`assets/css/quran.css` now uses:

- `opacity: 0`
- `visibility: hidden`
- `translateY(calc(100% + safe-area + 24px))`
- `pointer-events: none`

Reduced-motion mode still restores visible controls rather than introducing a forced animation state.

A plain click/tap on the Mushaf paper now toggles the immersive chrome without leaving fullscreen; word/action surfaces remain owned by their own handlers.

### Acceptance

1. Enter fullscreen.
2. Wait for idle.
3. Bottom control row is physically below the viewport, not translucent over the text.
4. Tap neutral paper.
5. Controls return.
6. Tap neutral paper again.
7. Controls leave the viewport again.
8. Word taps/buttons retain their normal behavior.

---

## P0-C — Location permission recovery: FIXED

### Previous implementation quality

The old rejection path did exactly this:

```text
permission denied → toast
```

That is technically honest but operationally weak, especially during onboarding.

### Direct fix applied

`js/app/handlers/location.js` now opens a bilingual recovery modal containing:

1. site-information / lock-icon guidance;
2. browser permission guidance;
3. retry instruction;
4. approximate-city fallback.

`js/app/forms.js` now provides a city selector sourced from the existing `CITY_PRESETS` data. Coordinates are not invented in the UI layer.

### Important existing capability

The project already had a broad city preset dataset and city-selection functionality in the Prayer view. The implementation now makes that fallback available directly from the failed permission path as well.

---

# P0-D — Quranic Lexicon: NOT YET COMPLETE; IMPLEMENT AS A DATA PROJECT

## 3.1 What is already genuinely complete

### Token coverage

**77,429 / 77,429** Quranic token rows exist in the word-study layer.

### Contextual study rows

**77,429 / 77,429** have contextual-study records in the current corpus layer.

### Iʿrab / morphology

**77,429 / 77,429** have morphology/iʿrab study records.

### Root coverage

There are **1,651 unique Quranic roots in the token corpus**, and the root-meaning layer contains **1,651 records**. That is 100% root-key coverage.

### Lemma dictionary

The current dictionary layer contains **4,763 lemma entries**, but token-level dictionary attachment is approximately **91.46%** because many token rows do not map to that authored dictionary tier.

### Synonym/antonym availability

Current token-level availability is much lower:

| Field | Token occurrences covered |
|---|---:|
| Synonyms | 10,601 / 77,429 = 13.69% |
| Antonyms | 15,441 / 77,429 = 19.94% |

This must **not** be solved by bulk-generating arbitrary antonyms/synonyms.

## 3.2 Required architectural contract

The popup should stop treating all lexical fields as if they have the same applicability.

Every token should resolve to:

```text
Token
├── contextualMeaning
├── English gloss
├── morphology / iʿrab
├── lemma
├── root (when applicable)
├── classical root study (when applicable)
├── synonyms
│   └── list | NOT_ATTESTED | NOT_APPLICABLE
├── antonyms
│   └── list | NOT_ATTESTED | NOT_APPLICABLE
└── provenance
    ├── source id
    ├── source edition
    ├── reference
    └── review status
```

### Critical semantic rule

**Do not manufacture an antonym for a particle merely to make a coverage counter reach 100%.**

"Complete coverage" means complete *applicable* coverage.

## 3.3 `صَافَّاتٍ` acceptance example

The current token row is structurally complete but not semantically rich enough for the requested popup. Its current compact study note is root-oriented rather than the requested context-specific prose.

The existing tafsir corpus already contains contextual explanations for Qur'an 67:19, including the interpretation that `صَافَّاتٍ` refers to birds spreading their wings in flight. This should become the source-linked contextual field rather than being reconstructed ad hoc in the UI.

The Quranic Arabic Corpus is also a strong source for morphology/iʿrab because it is explicitly a word-by-word Quranic linguistic resource and documents traditional iʿrab terminology. citeturn705506search0turn705506search2

Quran.com's Ibn Kathir, Qurtubi and other editions provide source-linked contextual tafsir for 67:19. citeturn705506search9turn705506search12

## 3.4 Classical-etymology implementation

Do not call a generic model-generated sentence "classical etymology".

Instead create a source-backed lexical layer:

```text
lexiconSourceId
sourceTitleAr
sourceTitleEn
edition
entryReference
root
coreSenseAr
coreSenseEn
classicalUsageAr
classicalUsageEn
quranicBridgeAr
quranicBridgeEn
reviewStatus
```

Preferred scholarly-source families:

1. classical Arabic root dictionaries;
2. recognized Quranic grammar/morphology corpora;
3. established tafsir editions for context;
4. secondary educational material only as explanatory support, never as the authoritative lexical source.

The Quranic Arabic Corpus itself warns that linguistic annotation is an actively reviewed research resource, so the application should preserve source/version metadata rather than presenting corpus data as infallible. citeturn705506search0turn705506search11

## 3.5 Agent-1 task boundary

Do **not** attempt to complete tens of thousands of lexical records manually in application code.

Build:

- source-normalization pipeline;
- deterministic merge by lemma/root/token;
- provenance fields;
- applicability enums;
- coverage report;
- scholar-review queue;
- import validator;
- popup renderer for the richer schema.

The data generation/curation itself should be a separate controlled corpus task.

---

# 4. P0 — Mushaf Orthography, SVG Banners & Audio Mirror Engine

## 4.1 Surah banner: ALREADY IMPLEMENTED WELL ENOUGH

The Mushaf reader already renders an ornament-framed surah cartouche with surah name, ayah count and Bismillah treatment. Do not rebuild it merely to satisfy the wording of the prompt.

Only revisit its geometry after the device screenshot pass proves that vertical occupation remains excessive.

## 4.2 Madd collisions: VERIFY ON REAL FONT/DEVICE MATRIX

The stylesheet already has explicit Tajweed/Madd treatment and line-height rules. Static inspection is not enough to prove that stacked Quranic marks never collide.

### Agent-1 task

Create a deterministic visual fixture containing:

- `الم`
- common madd variants;
- shaddah + fatha/damma/kasra combinations;
- Qur'anic small alifs and superscript marks.

Run at:

- 390×844
- 844×390
- 1024×768
- 1440×900

with every Mushaf font and at scale extremes.

**Acceptance:** no glyph collision, clipping, or vertical overlap in screenshot diff.

## 4.3 Sajdah overline

The current implementation already has a dedicated As-Sajdah 32:15 accent path and tests.

One correction to the incoming prompt must be preserved in the implementation: the exact Qur'anic orthography at 32:15 is `سُجَّدًا`, not `سَجَدُوا`. The displayed Mushaf source should remain authoritative. citeturn921155search0turn921155search6

The current test suite already preserves the `سُجَّدًا` display form while tolerating the alternate annotation token used by the historical audit fixture. Do not alter the Qur'anic text to match the prompt wording.

## 4.4 Tajweed underline toggle

Already implemented and covered by targeted tests. Do not duplicate the settings mechanism.

## 4.5 Dotted underline

A dotted underline still exists intentionally for word-tap affordance and is removed/merged under certain Tajweed conditions. Therefore the correct task is **visual audit**, not blind removal.

Agent-1 should distinguish:

- intentional word-study affordance;
- intentional Tajweed cue;
- accidental duplicate/dotted artefact.

---

# 5. P0 — Audio Mirror Engine

## Current quality assessment

This is one of the stronger parts of the implementation.

Existing tests verify:

```text
primary 128 kbps
    ↓
primary 64 kbps
    ↓
everyayah mirror
    ↓
honest failure
```

The fallback chain resets correctly when advancing to another ayah. The existing architecture also includes reciter selection, speed controls, looping/repetition and active-ayah synchronization paths.

### Decision

**Do not rewrite the audio engine.**

### Remaining device verification task

Agent-1 should prove the following with Playwright route interception and real Chromium:

1. first URL returns 404;
2. second URL returns CORS/network failure;
3. mirror loads;
4. `<audio>` emits `canplay` / `playing`;
5. active ayah advances;
6. repeat-one repeats the same ayah;
7. speed remains bounded to the configured range;
8. reciter switch resets/restarts correctly.

A passing unit test is necessary but not sufficient for CORS/device behavior.

---

# 6. P1 — Search Pagination, Tajweed Quiz Rework & E2E Coverage

## P1-SEARCH — Replace Load More with explicit pagination

### Current implementation

Search currently uses shareable URL-based shown-count parameters (`qn`, `tn`, `ln`) and a **Load More** control.

This is better than truncating results, but it does not satisfy the requested explicit pagination contract.

### Agent-1 implementation

Keep the existing search indexing architecture.

Replace the presentation state with:

```text
scopePage
pageSize
resultTotal
resultPageCount
```

Use URL state for back-button/share behavior.

Render:

```text
Page 2 of 17
Quran: 134 · Hadith: 48 · Azkar: 12

[Previous] [Next]
```

Keep keyboard and screen-reader semantics explicit.

### Do not

- rebuild search indexes;
- duplicate the existing corpus search logic;
- load every result into DOM simultaneously.

### Acceptance

- page count correct;
- no duplicated results;
- previous/next state correct at boundaries;
- deep link reproduces page;
- Arabic and English parity;
- offline operation preserved.

---

## P1-TAJWEED — Quiz rework

The current practice system already exists. Rework it rather than creating another quiz engine.

Required modes:

1. identify the rule;
2. identify the marked word;
3. classify the rule from the ayah;
4. review previously missed rules.

The quiz should remain an educational surface, not a score-chasing layer.

### Content requirement

Every question must retain:

- rule id;
- source ayah;
- correct answer;
- distractor provenance;
- explanation;
- scholar-review state.

### Acceptance

A question must never be generated from an unsourced rule definition.

---

## P1-E2E — Full route and state matrix

The exact route count must be re-counted in the current checkout. Do not inherit "33".

For every route, test:

- cold load;
- warm load;
- Arabic;
- English;
- RTL;
- mobile portrait;
- mobile landscape;
- offline after shell install;
- back navigation;
- state restoration;
- console errors;
- request failures.

### Required artifacts

```text
 evidence/overhaul-e2e/
 ├── route-census.json
 ├── route-matrix.json
 ├── console-errors.json
 ├── network-failures.json
 ├── screenshots/
 └── traces/
```

---

# 7. P2 — UI/UX Navigation Polish & Performance

## P2-ORG — Information architecture

The Wave 2 organization plan remains valid, but it must be evidence-driven.

Do not replace the navigation solely because a five-tab model looks cleaner.

Agent-1 must first produce:

- complete route-to-entry map;
- duplicate destinations;
- orphan routes;
- tap-count walkthrough;
- mobile thumb reach measurements;
- bilingual label census;
- icon family census.

Only then decide whether to adopt a five-tab spine.

## P2-PERF — Performance budget

The implementation already made substantial data-loading improvements, but the final target must be measured, not assumed.

Required measurements:

- first-contentful paint;
- LCP;
- total transferred bytes;
- total JS parse/evaluate cost;
- route-change cost;
- Mushaf page-turn render cost;
- memory after 20 page turns;
- 30-minute audio session;
- offline shell startup.

### Important architecture rule

Do not delete data or features merely to produce a benchmark number.

Instead:

```text
boot shell
   ↓
route chunk
   ↓
view data
   ↓
optional study corpus
```

The existing project has already started this architecture with lazy Mushaf imports and lazy data fetches. Continue it.

---

# 8. Six Audit Vectors — Final Action Matrix

| Vector | Current state | Next action |
|---|---|---|
| A — E2E/PWA | Extensive tests; final browser matrix unverified | Full Chromium route matrix, then Firefox/WebKit |
| B — Features | Many requested capabilities already exist | Audit before adding duplicates |
| C — UI/UX | Mature component structure but organization needs measurement | Route/chrome/control census |
| D — Responsive | CSS contains many mobile paths; visual proof incomplete | 390/844/landscape/tablet screenshot sweep |
| E — DOM/Memory | Long-session guardrails exist in code | Heap + listener + detached-node test |
| F — Accessibility/RTL | Significant ARIA/roving/focus work exists | axe + screen-reader + RTL interaction sweep |

---

# 9. Agent-1 Exact Execution Order

## P0 — already fixed in this audit

### OVER-01 — Awaitable Mushaf navigation
**Status:** IMPLEMENTED

Files:

- `js/app/lazyData.js`
- `js/app/handlers/quran.js`
- `js/app/events.js`

Gate:

- targeted Node tests;
- live Chromium swipe/arrow trace when environment permits.

### OVER-02 — True fullscreen hide/reveal
**Status:** IMPLEMENTED

Files:

- `assets/css/quran.css`
- `js/app/fullscreen.js`
- `js/app/events.js`
- `tests/overhaulP0Contract.test.js`

Gate:

- fullscreen visual trace;
- reduced-motion trace;
- keyboard focus trace.

### OVER-03 — Location-denial recovery
**Status:** IMPLEMENTED

Files:

- `js/app/forms.js`
- `js/app/handlers/location.js`
- `js/core/i18n/en.js`
- `js/core/i18n/ar.js`
- `tests/overhaulP0Contract.test.js`

Gate:

- deny permission;
- modal appears;
- manual city select works;
- exact coordinates still work;
- Arabic/English parity.

## P0 — next Agent-1 data/verification tasks

### LEX-01 — Field-aware lexicon schema
**Dependency:** none

Define `NOT_APPLICABLE`, `NOT_ATTESTED`, `CURATED`, `CORPUS`, `TAFSIR`, `CLASSICAL_LEXICON` provenance states.

### LEX-02 — Source-backed lemma layer
**Dependency:** LEX-01

Expand lemma semantics without fabricating synonym/antonym data.

### LEX-03 — Contextual-meaning layer
**Dependency:** LEX-02

Add explicit verse-context meaning where the generic lemma gloss is insufficient.

### LEX-04 — Classical etymology layer
**Dependency:** LEX-01

Replace generic root notes with source-identified classical lexical records.

### LEX-05 — Popup provenance renderer
**Dependency:** LEX-01 through LEX-04

Expose source labels and applicability states in the word modal.

### ORTH-01 — Device orthography sweep
**Dependency:** none

Fonts × viewport × scale × Tajweed state.

### AUDIO-01 — Real fallback trace
**Dependency:** none

Route-intercept first/second mirrors and prove the third path loads.

## P1

- SEARCH-01 — explicit page-number pagination;
- TAJ-QUIZ-01 — unified educational quiz modes;
- E2E-01 — route census + route matrix;
- E2E-02 — offline transition matrix;
- E2E-03 — cross-engine matrix.

## P2

- ORG-01 — complete route/chrome/control census;
- ORG-02 — information-architecture changes derived from census;
- PERF-01 — measured route/chunk budgets;
- MEM-01 — 20-switch / 50-page / 30-minute-session leak audit;
- A11Y-01 — axe + keyboard + screen-reader sweep;
- RTL-01 — Mushaf, search, settings and navigation direction matrix.

---

# 10. Required Agent-1 Change Discipline

Agent-1 must not:

- rewrite the Mushaf reader wholesale;
- replace the existing audio engine;
- build a second search engine;
- create a second Tajweed quiz engine;
- fabricate synonym/antonym/etymology records;
- change the Qur'an text to match a prompt typo;
- weaken tests to make gates green;
- claim device/cross-browser verification without evidence.

Agent-1 should:

- reuse the existing domain/service layers;
- add small deterministic adapters;
- preserve offline-first behavior;
- preserve Arabic/English parity;
- preserve source provenance;
- add tests beside each behavioral change;
- produce a trace/evidence artifact for every runtime claim.

---

# 11. Scholarly Handoff

The following require scholarly/content review before they become authoritative application content:

1. classical root-etymology prose;
2. context-specific lexical meanings where interpretation is involved;
3. synonym/antonym relationships;
4. Tajweed rule definitions and exercise answers;
5. Makharij diagrams and lesson sequencing;
6. any new religious symbol or manuscript ornamentation.

Engineering can define schema, provenance, rendering, validation and tests. Engineering should not silently turn an unsourced interpretation into canonical religious content.

---

# 12. Verification Status of This Audit

### Verified directly in this session

- targeted Node test suite: **58 passed / 0 failed**;
- Quran word-study coverage: **77,429 / 77,429 token rows**;
- lexical provenance tests: green;
- gesture contract tests: green;
- audio mirror tests: green;
- new P0 contract tests: **3 passed / 0 failed**;
- modified ES modules import successfully;
- current seed builder produces a semantically pruned runnable archive.

### Not honestly claimable from this environment

- full browser E2E matrix;
- real-device touch behavior;
- real VoiceOver/TalkBack output;
- Firefox/WebKit media behavior;
- real 3G measurements;
- real lock-screen/background audio;
- final memory/heap-detached-node measurements.

---

# 13. Deliverables

- `NUR-AL-DHIKR-P0-OVERHAUL.patch` — exact source changes made by this audit.
- `tests/overhaulP0Contract.test.js` — regression contract for the three direct P0 fixes.
- `APP-OVERHAUL-MASTER-ROADMAP-2026-09-24.md` — this roadmap.
- seed bundle generated from the existing seed builder.

---

## Final architecture decision

The correct path is **not** a wholesale rewrite. v5.17.8 already contains substantial mature work. The best-quality intervention is to preserve the existing boundaries and fix the few runtime races directly, then treat the remaining lexicon work as a provenance-backed data pipeline and the remaining UX work as an evidence-backed organization pass.

That is the implementation boundary Agent-1 should follow.
