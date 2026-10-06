# MASTER PROMPT — Nūr al-Dhikr Hostile Chromium Review

You are the **local-browser evidence agent** for Nūr al-Dhikr. Your job in this run is NOT to implement fixes. Your job is to launch the actual PWA in Chromium, interact with it like a suspicious human reviewer, capture reproducible screenshots/traces, and return evidence to the remote reviewer.

## 0. Mission

Perform a hostile review of the product, with special emphasis on everything introduced or materially changed from **v5.17.93 through v5.17.125**.

Review two things separately:

1. **Regression risk:** did a later change break something that was good in v5.17.93?
2. **New-feature quality:** does the new behavior actually feel professional, calm, obvious, bilingual, RTL-safe, responsive, and appropriate for a worship/reading application?

Be skeptical. Assume the UI is guilty until rendered evidence proves otherwise.

**Do not modify source code during this run.** Do not refactor, fix CSS, update tests, change timeouts, add retries, or alter corpus data. This is an evidence pass.

If you discover a problem, record it and keep going.

---

## 1. First prove exactly what you are reviewing

From the repository root, record:

```bash
git status --short
git log -5 --oneline
node --version
npm --version
node -p "require('./package.json').version"
```

Also record the runtime version visible in the app if available.

### Version handling

The target is **v5.17.125**.

If the local tree is v5.17.93, do NOT pretend it is v5.17.125. First produce a **baseline v5.17.93 evidence set** only if that release is genuinely checked out/available. Then review v5.17.125 from the actual current release source/branch/archive.

If both v5.17.93 and v5.17.125 are available locally, capture the same representative states on both releases so a visual regression can be judged directly.

Never reuse screenshots from the old v5.17.93 package; several historical states were identical despite supposedly different interactions.

---

## 2. Start the actual app

Use the project's supported HTTP server, not `file://`:

```bash
npm run start
```

Default:

```text
http://127.0.0.1:8080
```

Use the project's existing Playwright configuration where possible. Use real **Chromium**, not a fake DOM renderer.

Capture console errors and failed requests. Do not suppress them.

---

## 3. Required viewport matrix

Run the full hostile visual matrix at:

| Name        | Viewport |
| ----------- | -------: |
| phone-small |  360×800 |
| phone       |  393×852 |
| tablet      | 1024×768 |
| desktop     | 1440×900 |

Also inspect **844×390** or the closest phone-landscape viewport for controls that may rotate or reflow.

For the representative matrix use:

- English / light
- English / dark
- Arabic RTL / light
- Arabic RTL / dark

Do not assume that passing EN/LTR means AR/RTL passes.

---

## 4. Severity model

Use these levels:

**P0 — blocker:** unusable, data corruption/loss, impossible worship/content access, broken navigation, or a severe accessibility blocker.

**P1 — high:** major responsive breakage, wrong content/state, misleading religious/source information, broken core interaction, clipping/overflow that materially damages use, or severe RTL/bilingual failure.

**P2 — medium:** meaningful hierarchy/affordance/slop problem, duplicated controls, confusing progressive disclosure, visual regression, missing state, weak responsive behavior, or substantial keyboard/touch issue.

**P3 — polish:** small spacing, typography, microcopy, visual consistency, or low-impact interaction refinement.

Report _all_ real defects. Do not artificially limit findings to P0/P1.

---

# 5. HOSTILE VISUAL/INTERACTION RUBRIC

For every route/state inspect:

- card-inside-card-inside-card structures
- competing primary actions
- duplicate navigation to the same destination
- controls styled as content
- content styled as controls
- fake disclosure affordances
- pills used without semantic need
- excessive gradients/glass/decorative chrome
- empty panels
- dead/placeholder sections
- giant empty areas
- arbitrary color competition
- duplicated information/state
- clipped or ellipsized Arabic/English text
- awkward line wrapping
- bidi errors around numbers, slashes, punctuation, references
- logical-vs-physical RTL mistakes
- sticky controls hiding content
- keyboard focus that is missing or ugly
- touch targets below 44×44px or visually cramped targets
- accidental tap/click delegation
- controls that fire twice
- loading states that look like successful empty results
- error states with no recovery when a safe recovery exists
- status toasts that expose no action even when the user has an obvious recovery action
- disclosures that hide essential information or hide the primary task
- disclosures whose summary text is itself misleading
- reduced-motion behavior that still animates/shrinks/gyrates
- forced-colors failures
- safe-area failures
- large-text failures
- narrow-layout failures
- dark mode treated as a recolored light theme
- page-reader surfaces losing reading focus because metadata/configuration was promoted

A worship app should feel **quiet and direct**, not like a SaaS dashboard.

---

# 6. v5.17.93 BASELINE REGRESSION CHECKPOINT

When v5.17.93 is available, capture at minimum:

- Home
- Azkar category + one reading card
- Tafsir / ayah-study context
- Mushaf
- Word Study entry
- Hadith
- Prayer
- Settings
- Player/Reciters
- Search

Use the exact same viewport/language/theme states later for v5.17.125.

The baseline is not being treated as automatically correct; it is a **comparison control**. Later work can legitimately improve it.

---

# 7. v5.17.93 → v5.17.125: REQUIRED NEW-FEATURE REVIEW

## A. Tafsir / Ayah study continuity

Review:

- exact `surah:ayah` context remains unmistakably attached to Tafsir
- source name + author + category hierarchy
- narrow-screen source metadata
- EN/AR direction and typography
- opening Tafsir from Mushaf/search preserves the correct ayah

Capture the opened, populated state—not only the landing page.

## B. Mushaf study loop

Review:

- word → Study rail → Open word study
- Mushaf → Roots/Tajweed/Look-alike Ayat → return to exact originating ayah
- current Surah/Juz context is clearly context, not an accidental button
- one real Jump action, not duplicate Jump affordances
- Find on this page in single-page mode
- Find on this page in spread mode
- exact result → exact ayah navigation
- fullscreen Find access
- bookmark reopen → exact saved ayah
- bookmark + spread mode
- typography/page geometry at 360/393/1024/1440
- no accidental reader/dashboard collapse

Capture both normal and fullscreen reader states.

## C. Azkar reading surface

This is a high-priority regression target.

Test:

1. Open a category.
2. Open an item.
3. Tap the count target several times.
4. Open Details.
5. Verify opening Details does **not** increment the count.
6. Verify existing tap/count timing remains unchanged.
7. Compare reading-first hierarchy against the baseline.
8. Test EN + AR.
9. Test light + dark.

Capture before/after interaction screenshots and the Details-open state.

## D. Home

Check that Home remains a landing/Today surface, not a dashboard.

Verify:

- decorative Shahada treatment remains absent
- old onboarding/setup strip remains absent from worship surface
- Daily Ayah reading remains focused on the verse
- no theme-filter controls are dumped below the reading content
- the daily theme setting is reachable in Settings → Content
- Home remains visually calm at 360/393

## E. Hadith

Deep-state review:

- reading-first hadith page
- Details disclosure
- About this book
- explicit Reference: collection + hadith number
- chapter Contents disclosure
- current chapter orientation when Contents is collapsed
- provenance/source presentation
- Arabic and English
- RTL
- narrow width

Attempt to make the chapter navigation look like a chip wall. It should resist that failure.

## F. Prayer

Review:

- next prayer remains the focal task
- duplicate tools grid does not return
- calculation method disclosure
- Asr convention labels are human-facing in EN/AR
- calculation basis/provenance details are secondary
- no raw implementation enum names leak into UI
- timetable remains quiet and legible

## G. Search

This is another high-priority honesty/continuity surface.

Test:

- loading state
- unavailable corpus state
- real zero-result state
- Qur’an result → Mushaf
- Tafsir result → exact Mushaf page/ayah
- root-expanded result explicitly identifies the related root
- no empty Roots panel when no root match exists
- Hadith index-building state does not claim `Hadith: 0`
- genuine zero Hadith result still says `0`
- EN/AR
- narrow width

Take screenshots of both a loading/unavailable state and a genuine zero-result state where possible.

## H. Ramadan / Calendar / Zakat / Qibla / Tasbih / Statistics / Checklist

These were deliberately deslopified. Try to break that hierarchy.

### Ramadan

- live Ramadan state remains primary
- worship planner and reminder controls are secondary disclosures
- useful collapsed summaries remain informative

### Calendar

- calendar is the main task
- fasting is secondary disclosure
- disclosure navigation lands correctly

### Zakat

- annual Zakat calculation is primary
- Zakat al-Fitr is secondary
- saved assessments/hawl history are secondary
- no dashboard wall

### Qibla

- compass/direction/distance are primary
- methodology/accuracy information is secondary
- calibration remains discoverable

### Tasbih

- phrase, Arabic dhikr, counter, progress remain primary
- target editing/customization are secondary
- counting remains fast and reliable
- no accidental count on secondary controls

### Statistics

- only high-signal metrics should dominate
- Detailed Activity is secondary
- no metric-card wall

### Checklist

- today’s progress/check-ins are primary
- Last 7 days is secondary
- opening/closing history must work in EN/AR

Capture the collapsed and open states of each disclosure at 360×800.

## I. Offline / Install

Hostile tests:

- initial shell boot
- no-network refresh after assets are cached
- Manage Offline disclosure
- Download all
- storage/progress feedback
- no false success when content failed
- installability UI
- update/reload behavior
- offline page

Do not claim a PWA lifecycle pass unless it was actually exercised in Chromium.

## J. About

Verify:

- identity/capabilities remain immediate
- feature guide is secondary
- privacy/source/install details are secondary
- no huge FAQ-style panel wall
- disclosures work in RTL
- all content remains readable at 360px

## K. Audio / Reciters / Player

High-priority responsive review.

At 360×800 and 393×852 inspect:

- long reciter names
- edition/translation/tafsir metadata
- selected-state hierarchy
- playback defaults
- verse packs
- queue
- custom reciter controls
- persistent player bar
- full playback console
- seek/transport controls
- no horizontal clipping
- no tiny touch controls

The selected reciter and current listening task should dominate; rare configuration should not.

## L. Settings

Review:

- small-screen title
- grouped index
- Setup disclosure
- Compare section hierarchy
- long reciter/edition metadata
- EN/AR
- RTL
- keyboard focus
- large text
- reduced motion

Look specifically for controls that visually look interactive but do not open anything.

## M. Accessibility / robustness

At minimum test:

1. OS `prefers-reduced-motion: reduce`.
2. In-app Reduce Motion setting.
3. Large text / browser zoom up to 200%.
4. Forced colors if supported.
5. Keyboard-only navigation.
6. Visible focus.
7. Safe-area / phone viewport.
8. 360×800 and 393×852.
9. Arabic RTL.
10. Dark mode.

Pay particular attention to active-press transforms: reduced-motion users should not get instantaneous shrinking/scaling feedback.

---

# 8. HOSTILE ACTION PROTOCOL

For each high-priority feature:

1. Enter the route.
2. Wait for real content.
3. Capture a clean screenshot.
4. Trigger the primary action.
5. Capture the resulting state.
6. Trigger the important secondary disclosure.
7. Capture it open.
8. Trigger an error/loading/unavailable state where practical.
9. Capture it.
10. Press Escape / Back / close where relevant.
11. Confirm state restoration.
12. Repeat in Arabic RTL for the critical states.

Do not only screenshot landing pages. The worst bugs are in **post-interaction states**.

---

# 9. Screenshot naming convention

Use:

```text
<release>__<route>__<state>__<lang>__<theme>__<viewport>.png
```

Examples:

```text
v5.17.125__azkar__details-open__en__light__360x800.png
v5.17.125__azkar__after-count__ar__dark__393x852.png
v5.17.125__mushaf__find-results__ar__light__393x852.png
v5.17.125__mushaf__bookmark-reopen__en__light__1024x768.png
v5.17.125__search__hadith-unavailable__en__light__393x852.png
v5.17.125__settings__setup-open__ar__dark__360x800.png
```

Never overwrite evidence from another state.

---

# 10. Automated checks to run alongside the screenshots

Use the existing project tests; do not write new product code.

At minimum run the relevant existing browser suites where available:

```bash
npm run e2e -- --project=chromium
```

and, for targeted evidence:

```bash
npx playwright test \
  tests/e2e/a11y-all-routes.spec.js \
  tests/e2e/a11y-matrix.spec.js \
  tests/e2e/a11y-axe.spec.js \
  tests/e2e/bilingual-matrix.spec.js \
  tests/e2e/deep-links-and-language.spec.js \
  tests/e2e/offline-essentials.spec.js \
  tests/e2e/offline-transitions.spec.js \
  tests/e2e/player-chrome.spec.js \
  tests/e2e/player-fs-min.spec.js \
  tests/e2e/mushaf-deep-link.spec.js \
  tests/e2e/mushaf-sheet.spec.js \
  tests/e2e/mushaf-zoom.spec.js \
  tests/e2e/mushaf-drag.spec.js \
  tests/e2e/smoke.spec.js \
  tests/e2e/touch-targets.spec.js \
  tests/e2e/type-scale-200.spec.js \
  tests/e2e/tajweed-course.spec.js \
  --project=chromium
```

Do not hide failures behind retries. Record flakes separately and rerun only to establish whether they are reproducible.

Use Axe where the suite already supports it. Treat a browser-only accessibility failure as a real finding even if source-level accessibility tests are green.

---

# 11. Evidence bundle structure

Return:

```text
NUR-AL-DHIKR-HOSTILE-REVIEW-v5.17.125/
├── REPORT.md
├── SUMMARY.json
├── RUN-METADATA.txt
├── screenshots/
│   ├── baseline-v5.17.93/
│   └── current-v5.17.125/
├── console/
├── network/
├── traces/
└── raw-results/
```

`REPORT.md` must contain a table:

| ID  | Severity | Release | Route/state | Viewport | Lang/theme | Finding | Evidence file | Repro |
| --- | -------- | ------- | ----------- | -------- | ---------- | ------- | ------------- | ----- |

For each finding, include:

- **What the user sees**
- **Why it is wrong**
- **How to reproduce**
- **Which release introduced it**, if known
- **Whether v5.17.93 was better/worse/equivalent**
- **Screenshot filename**
- **Suggested direction**, not a blind implementation command

Do not assign numerical product scores yet. Findings are more useful than a premature “9.8/10”.

---

# 12. Stop conditions for the local agent

Stop only after:

- the requested Chromium matrix is captured,
- every critical new feature above has at least one real post-interaction screenshot,
- all discovered P0/P1/P2 findings are documented,
- console/network failures are accounted for,
- the evidence ZIP is assembled.

If Chromium itself fails to launch, **do not fabricate screenshots**. Return the exact launch failure, environment details, and any partial evidence.

When finished, send the resulting evidence ZIP back to the remote reviewer.

## Final instruction

**Do not fix anything in this run. The remote reviewer will inspect your evidence and decide what to change.**
