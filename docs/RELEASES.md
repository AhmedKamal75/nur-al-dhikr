# Release notes — Nūr al-Dhikr

Moved out of README.md so the README stays the product face. Newest first.

## v5.17.55 — Nightstand lamp mode

Merged-plan item 8. The nightstand gains a fourth display mode — a warm
low-light lamp shelf for recitation at the bedside. Near-black warm ground
with amber text (the existing fullscreen glass-bar tokens, no new custom
properties, luminance-capped, no pure white, no blue), big 56–84px
transport (previous ayah, play/pause, next ayah — pinned `direction: ltr`
so the order never mirrors), the listen-mode sleep-timer chip with its
live countdown label, and the compact prayer countdown ticking beneath.

- **A shelf, not a second player.** The transport reuses the verse
  engine's existing actions (`recite-ayah-prev`, `recite-pause-toggle`,
  `recite-ayah-next`) and the sleep chip reuses the shared ladder
  (`recite-sleep-cycle`, off → 5 → 15 → 30 → 45 → 60 → off) — no new
  data-action, no new settings key, no new static view import. With no
  session running the buttons disable and an honest note says to start
  one from the Qur'an or Audio view.
- **Adab: no endless loop.** Auto-advance defaults OFF and stays off —
  the lamp renders no listen/loop/repeat controls, and the session ends
  at its last ayah the way every surah-scoped session does. The wake lock
  stays auto-held by the existing ambient pair; no visible toggle, so the
  chrome stays a single exit plus the mode chips.
- Constraints held: bilingual EN+AR (5 keys twinned — `ambient.modeLamp`,
  `ambient.lampHint`, `ambient.lampNoSession`, `ambient.lampNow`,
  `ambient.lampTransport`; parity gate green; strict AR separation —
  AR carries no Latin), 19/19 renderer budget intact (ambient stays a
  lazy dynamic import), Elder/a11y intact (native buttons with
  bilingual labels, 44px+ targets, logical properties, reduced-motion
  honored, heading order unchanged), no data changes, offline-safe (no
  new precache bytes beyond edited files).
- Tests: `tests/ambientLamp.test.js` (12 cases — palette luminance caps
  - no-white/no-blue pins, existing-tokens-only CSS scan, transport +
    sleep-chip render idle/active, handler-backed actions, shared sleep
    ladder, auto-advance-OFF policy + no listen/loop/repeat emission,
    allowlist + hostile-mode fallback, EN+AR parity + AR purity, no
    gamification scan, 19/19 budget pin), the ambient e2e extended with
    the lamp stop (`tests/e2e/depth-upgrades.spec.js` — 4-mode switcher,
    lamp transport + sleep chip visible).

## v5.17.54 — The inline Qur'an study tray

Merged-plan item 7. Tapping a word used to leave the reading row for a
modal; now every ayah row carries its own Study control that renders the
SAME study panel inline UNDER the tapped row — in the classic reader's
ayah cards and under the mushaf translation-tray rows. Arabic first in
the large Uthmani face, the translation beneath it in small secondary
text with its edition named on every panel (`Translation · English —
Sahih International`), per-word chips with lemma/root/grammar summaries,
a selected-word detail with the shared sources block, and the tabbed
tafsir panel with authors, compare slots and download actions verbatim.

- **One panel, two homes, no drift.** The tray reuses
  `buildAyahStudyExtras` and `wordSourcesHTML` (now exported) instead of
  copying them, and the word-tap handler selects inside the open tray
  instead of opening a modal there — rule 6, so tray and modal can never
  disagree. The modal path (`tafsir-open`, `mushaf-ayah-tap`, word taps
  with no tray open) is byte-for-byte untouched: no route, handler or
  deep-link breakage.
- **Honest absence, same pattern.** Missing translation and empty tafsir
  ayahs speak through the ONE missing-data builder (item 6); AR stays
  silent on translation absence and carries no translation line, exactly
  the disclosure rule. Unloaded word tiers state loading; hostile
  surah/ayah/word payloads render nothing and dispatch no-ops.
- **Calm and plain.** Translation can never read as Uthmani (small
  secondary class vs the Arabic typeface, test-pinned in CSS and HTML).
  No scores, streaks, badges or celebrations anywhere in the tray.
- Constraints held: bilingual EN+AR (4 keys twinned — `study.trayTitle`,
  `study.trayClose`, `study.trayTranslation`, `study.trayWords`; parity
  gate green; strict AR separation unchanged), 19/19 renderer budget
  intact (no new view, no new static import — the tray is a shared
  module, extracted so `mushafReader.js` stays under its 800-line cap at
  ~760), Elder/a11y intact (native buttons throughout, tray heading
  takes focus on open, logical properties only, existing tokens only, no
  new custom properties), no data changes, offline-safe (one small
  already-precached module).
- Tests: `tests/study-tray.test.js` (21 cases — tray state incl.
  NAVIGATE-close, under-the-row render in both readers, word chips +
  detail + shared sources, edition/author/source labels, missing-data
  honesty incl. AR silence, translation≠Uthmani CSS/HTML pins, parity +
  no-gamification scans), the tray-open states added to the
  `tests/mushaf-reorg.test.js` surface inventory, plus the
  directly-affected e2e subset (smoke, routes-extended, study-mode).

## v5.17.53 — One honest-absence pattern for every gap

Merged-plan item 6. Absence used to speak in five dialects — an Unverified
chip here, a bare paragraph there, a row badge, a polar footnote, a meter
line — each hand-rolled at its call site. Now `js/ui/missingData.js` owns
all of it: one dashed warm-gray frame with plain words, calm and never
red, bilingual EN+AR through six `missingData.*` keys (rule 6 — callers
pass a kind, never their own strings, so the tree cannot drift into
parallel copy).

- **Six states, one source.** Unknown grade, missing translation, missing
  audio, missing tafsir, missing location, offline-not-downloaded. The
  tafsir empty-ayah and uncached-remote blocks render through the builder
  (their download actions preserved); the disclosure states a missing
  translation in EN instead of silently omitting the row; the Unknown chip,
  polar note, offline rows, storage meter, surah-missing cells and the
  load/notFound frames carry the shared frame hook while keeping their
  load-bearing exact words (prayer names, reciter reasons, Retry/Go-home
  context). Two retired keys (`tafsir.emptyAyah`, `tafsir.remoteHint`).
- **Calm is test-pinned, not asserted.** The suite scans the pattern's CSS
  for danger/red styling, checks AR carries no Latin, and fails if a call
  site reintroduces a parallel absence string.
- Constraints held: bilingual EN+AR (6 keys twinned + 2 retired in both,
  parity gate green; strict AR separation unchanged — AR never expects a
  translation), Elder/a11y intact (existing tokens only, no new custom
  properties, logical properties, plain text — no new data-action, the
  19/19 renderer budget holds), no data changes, no behavior changes
  beyond presentation, offline-safe (one small already-precached module).
- Tests: `tests/missing-data.test.js` (22 cases — six kinds × two
  languages, calm contract, grade/disclosure/tafsir/prayer/offline/audio/
  frame migration pins incl. rule-6 source scans), the disclosure honesty
  update in `tests/adhkar-session.test.js`, plus the directly-affected e2e
  subset (smoke, routes-extended, study-mode).

## v5.17.52 — The adhkar session player with progressive disclosure

Merged-plan item 5. The Focus stage showed everything at once —
translation, virtue, grade and transliteration always expanded under the
Arabic — and a category had no way to be read through: position said
where you were, but nothing said how much of the pass was done. Now the
Arabic leads alone with the supplements one tap behind a collapsed,
labelled `<details>` (one shared `disclosureHTML` builder in
`js/ui/card.js`, so the card and Focus cannot drift from each other),
and every category carries a session: a "Read through in Focus" entry
that starts — and resumes — at the first item not yet done today, with
an x-of-n done-today line under the stage and a plain completion line
when the pass is finished.

- **Progressive disclosure, honestly graded.** Transliteration,
  translation, virtue and a source-backed grade ride the collapsed block
  with labelled rows; the reference line and notes stay open as
  provenance. An explicit `Unknown` grade is never hidden — its
  Unverified chip stays in the open header in both surfaces — while
  missing/malformed grades render nowhere, as before. Empty items emit
  no hollow block, and banner-level field toggles still gate every row.
- **A queue, not a game.** Session progress reuses the category's own
  `listCompletion` math over the same visible items prev/next walks, so
  the stage, the counter and the queue always agree. Completion is
  stated in plain caption text — no animation, no success color, no
  badge, no confetti anywhere. Prev/next keep walking a finished queue;
  an all-done category restarts at the head instead of dead-ending.
- Constraints held: bilingual EN+AR (3 new keys twinned — `card.details`,
  `focus.sessionComplete`, `category.sessionStart`; row labels reuse the
  existing `content.field*` / `card.virtue` keys; strict AR separation
  unchanged), 19/19 renderer budget intact (no new view, no new static
  import — the session-start handler is a thin navigate), Elder/a11y
  intact (`<details>` is natively keyboard-operable and announced, the
  summary meets the touch-target floor, logical properties only, no new
  custom properties), no data changes, offline-safe.
- Tests: `tests/adhkar-session.test.js` (14 cases — collapsed-by-default
  disclosure in both languages incl. the Unknown-stays-visible and
  valid-grade-inside contracts, session progress incl. completion with a
  no-gamification scan, first-pending resume math, the category entry
  target in EN+AR), plus the directly-affected e2e subset
  (routes-extended: category + focus).

## v5.17.51 — The active method, stated where the times are

Merged-plan item 4. The calculation method lived only in the calc sheet
and onboarding: the prayer hero and the home prayer strip showed times
with no word about which convention computed them. Now one plain-text
line — method · Asr convention · offsets · source — rides the hero and
the ribbon wherever computed times appear, built by the single
`prayerMethodLine` helper in `js/domain/prayer.js` (rule 6 — both views
call it, so the tree cannot drift from itself). The honest-absence
variants (no location, no times) deliberately carry no line: a method
beside —:— placeholders would dangle, and the setup action leads
exactly where the method and offsets live.

- **Reused, not reinvented.** Localized method and region names come from
  the existing `prayer.method.*` / `prayer.methodRegion.*` keys, the
  source through the existing `prayer.methodSource` (unverified)
  qualifier — the institution body stays verbatim in both languages (the
  deliberate MEMORY.md §4 proper-noun exception, as in the calc sheet).
  The Asr token renders raw (`Standard` / `Hanafi`), exactly as the
  existing Asr select does. Offsets render per prayer with the localized
  minute unit (`Fajr +5m` / `الفجر +5 د`); all-zero reads as absence via
  the one new twinned key `prayer.offsetsNone`, never as "+0".
- **Hostile prefs degrade like the engine.** Unknown method → MWL,
  unknown Asr → Standard, out-of-range/non-numeric offsets ignored —
  the same own-property fallback the timetable uses, so a crafted backup
  can never print a method the app did not compute with.
- Constraints held: bilingual EN+AR (1 new key twinned, parity gate
  green), Elder/a11y intact (existing type scale and tokens, logical
  properties only, plain text — no new data-action, the strip stays
  navigate-only), no new static view import (the 19/19 renderer budget
  holds; home extends its existing domain import), no data or angle
  changes, offline-safe (no new module — the helper lives in the
  already-precached prayer domain).
- Tests: `tests/prayer-method-line.test.js` (16 cases — line content in
  both languages incl. offsets and the unverified qualifier, hostile
  degradation, hero + full ribbon render with the no-line-no-time guard
  on the honest-absence variants, rule-6/19-19/no-action contracts), plus
  the directly-affected e2e subset (smoke incl. a new pick-a-city-states-
  the-method test, home-fold).

## v5.17.50 — Time-aware Today: the six-prayer ribbon and a window label

Merged-plan item 3. The Home hero knew only the next prayer, and the
adhkar browser ranked itself by the sun without ever saying so. Now the
hero carries all six prayers of the day as one tap each into the Prayer
view — the prayer in effect marked current (aria-current plus the shared
"Now" badge), the upcoming one marked next — and the browser names the
window its order follows.

- **One ribbon, six honest cells.** The order derives from the canonical
  `PRAYER_ORDER` in `js/domain/prayer.js` (rule 6 — no pinned copy in the
  view), times render through the same localized 12-hour clock the Prayer
  view uses, and the live countdown keeps its `data-home-countdown` hook
  so the per-second ticker still patches the DOM directly without
  touching the store. The new `currentPrayer` helper (most recent time
  at/before now; before Fajr it is yesterday's Isha, flagged as such)
  drives the highlight beside the existing `nextPrayer`.
- **No location, no fakes.** Without saved coordinates — or when the
  engine yields nothing — all six cells read —:— beside an inline setup
  action into the Prayer view, where the city presets and manual offsets
  already live. A placeholder stated beats a clock invented.
- **The ranking speaks.** `adhkarWindowLabel` maps the existing
  `nowWindow` ('morning' / 'evening' / none) to one visible line under
  the browser subtitle, so the reader sees why morning adhkar leads in
  the morning.
- Constraints held: bilingual EN+AR (5 new keys twinned, parity gate
  green; times keep the localized ص/م markers), Elder/a11y intact
  (64px cells, labelled section, logical properties only, the cells row
  flows left-to-right in both languages like the Prayer timeline),
  navigate-only (no new data-action, no new static view import; the
  19/19 renderer budget holds), no gamification, offline-safe (no new
  module — the helper lives in the already-precached prayer domain).
- Tests: `tests/home-today-ribbon.test.js` (16 cases — current/next
  resolution incl. the overnight edge, 6-cell render with highlight and
  deep links, both honest-absence variants with a no-clock-time guard,
  window-label mapping in both languages, rule-6/19-19/no-shame
  contracts, renderHome spot-check), plus the directly-affected e2e
  subset (home-fold, smoke).

## v5.17.49 — One honest "where was I": the unified last-position service

Merged-plan item 2. The app remembered fragments — a Qur'an surah, a
Mushaf page, a history head — scattered across slices, with no memory at
all of the adhkar set, the tasbih phrase, the hadith book, or the tajweed
lesson and rule. Now `js/domain/lastPosition.js` reads all seven slots
as one pure record, honest-empty when nothing was ever touched.

- **Five new persisted slots, zero new slices.** `state.lastPosition`
  carries adhkar (category+item, stamped by HISTORY_PUSH), tasbih phrase
  (stamped by TASBIH_SET_ACTIVE), hadith (book+number, stamped on hadith
  navigation), and tajweed lesson + rule (stamped by course touches and
  practice results). Qur'an/Mushaf keep their long-standing bookmarks;
  the service reads all seven together. The key rides PERSISTED_KEYS and
  the restore sanitizer, so backups round-trip it and hostile blobs
  degrade to absence, never to markup.
- **Home resumes in words+numbers, never pressure.** The `continue`
  panel keeps its id (saved orders and hides untouched) and the Qur'an
  one-shot card keeps its exact shape and session latch; every other
  lived place renders as a quiet row — label words from i18n, positions
  as numbers — through existing routes and existing actions only (no new
  data-action, no new static view import; the 19/19 renderer budget
  holds). No streaks, no absence counts, no shame vocabulary in either
  language. Nothing touched yet reads "No previous place — begin with
  al-Fatihah" (AR: «لا مكان محفوظ بعد — ابدأ بالفاتحة»), linking to the
  opening chapter instead of inventing a position.
- Constraints held: bilingual EN+AR (10 new keys twinned, parity gate
  green), Elder/a11y intact (existing panel/row classes, labelled
  sections, logical properties only), no gamification, offline-safe (the
  new domain module rides APP_SHELL).
- Tests: `tests/lastPosition.test.js` (18 cases — 7 slots set/unset,
  hostile-shape degradation, backup file round-trip, resume-card render
  in both languages, action allowlist), plus the directly-affected e2e
  subset (home-fold, smoke).

## v5.17.48 — Onboarding, non-blocking: three decisions, the rest waits

Merged-plan item 1. The 8-step first-run wizard asked for setup,
permissions, installation and a first reading before the reader had even
seen the dhikr. Now the wizard asks three decisions — language,
location-or-offset, reciter — then it is done, with a one-tap skip that
leaves a complete home behind (prayer times work from defaults, audio
plays from the default voice).

- **Deferred, never auto-reshown.** Comfort, prayer alerts, calculation
  method, daily goal, install and first reading moved to a passive
  "Finish setup when ready" block at the top of Settings — six doors
  with their existing hints, each deep-linking where it already lives.
  Nothing pops up on its own; the introduction itself re-opens from the
  same block ("Show the introduction again").
- **Every old step still resolves.** The legacy 8-step order is kept as
  a resolver (`resolveOnboardingStep` in `js/domain/onboarding.js`):
  live ids render their new step, moved ids redirect to their route, a
  stored legacy position falls back to the first incomplete step.
  Upgraders who finished the old setup keep the default voice without
  being asked (restore-time grandfathering, pinned by test).
- **Reciter list derived, not pinned.** The new step renders every
  voice in `QURAN_RECITERS` through the shared `set-setting` pipeline,
  with Done keeping the current voice and a "More voices" door into
  Settings. Counts, labels and routes all derive from their sources
  (rule 6); the two orphaned comfort-button keys were removed, the five
  other freed hint keys now caption the deferred doors.
- Constraints held: bilingual EN+AR (parity gate green, all eight new
  keys twinned), Elder/a11y intact (the comfort door still lands on the
  Accessibility section; buttons keep their floors and labels), no new
  data-action except `onboarding-reshow` (handler + wiring pinned), no
  gamification (no progress bars or badges on the deferred doors), home
  complete with defaults.
- Tests: `tests/onboarding.test.js` + `tests/onboardingWizard.test.js`
  rewritten for the 3-step model (resolver, migration, reshow, deferred
  block), `tests/install-path.test.js` §5 re-pinned on the deferral,
  `tests/home-design-c4.test.js` counts moved 8→3, new e2e subset
  `tests/e2e/onboarding.spec.js` (walk-through, skip, AR switch,
  deferred + reshow).

## v5.17.47 — Home, designed: ranked dhikr, one-line chrome

C4 home design pass (HANDOFF B2.4, §5d). The review correction stands —
home is 9 sections / 80 category tiles, not 560 items — so this pass
ranks them instead of re-chunking them, and collapses the chrome that
was still shouting above and below the dhikr.

- **Ranked, not alphabetical.** Sections order by the reader's reality:
  the section left off, then most-opened, then the sun-based adhkar
  window (morning/evening leads at its hour), then live corpus size —
  fresh readers meet Duas (527 items) first through the window boost,
  not catalog order. Tiles rank the same way inside each section, so
  the most-used categories surface. An explicit user order still wins
  (it is the user's data). Rule 6: counts come from the corpus and the
  reader's own history — `rankBrowserDocuments` / `rankBrowserCategories`
  in `js/views/home.js`, pinned by `tests/home-design-c4.test.js`.
- **"How am I doing" as one slim strip near the top.** Prayers n/5 ·
  pages · dhikr count, same sources and same three doors as the worship
  panel (navigate-only), instead of a full panel at the very bottom.
- **Hero demoted to one quiet line** below the grid: name, tagline,
  greeting and Hijri chip in caption scale on paper with a gilt leading
  edge. The shahada banner stays first.
- **The 8-step wizard collapses to one line** — "N of 8 · current step
  · dismiss" — with the full step body, Back/Next and every deep link
  intact inside a native `<details>`. No new data-action, no new
  handler, zero new i18n keys (every string reused in both languages).
- Measured: grid at **y=381** (1440×900, gate <450 holds), y=439 on a
  390px phone with no sideways scroll. Before/after pair under
  `assets/screenshots/home-c4-before|after.png`.
- Constraints held: no data/route loss (deep-link hashes unchanged),
  Elder/a11y intact (44px floors, both themes, 200% wrap), bilingual
  EN+AR, no new static view import, no gamification, language switch
  untouched. Tokens only — 247 in `variables.css`, none added, no
  hardcoded colors.

## v5.17.46 — Six doors, flat: the filing cabinet comes down

Phase 8 (HANDOFF PART A1, REORGANISATION-PLAN.md §2a). The reachability work
held — every route was already within 2 taps — but the top-level chrome was
still twelve entries in the same four taxonomic groups the plan called the
problem. Now **6 flat doors**: Home · Qur'an · Ahadeeth · Prayer · Practise
· You.

- **Retired as doors, untouched as routes.** Library (the grid is home — a
  second door to the same tiles was the redundancy the reorganisation was
  meant to remove; `#/library` stays behind the grid's all-view), Word
  roots (absorbed into the Qur'an door), Ramadan (into Prayer, as the 4th
  switch segment), Zakat and the Offline library (into You beside settings,
  switch 8→10), and Search (doorless-by-design: the topbar palette honestly
  names itself as the launcher, so no chrome entry lies about its tap).
  Every existing deep link keeps working.
- **Promoted properly.** The fifth door is the TASBIH entry wearing the new
  bilingual `nav.practise` label (EN Practise / AR الممارسة); the entry
  segment keeps `nav.tasbih`, so each label promises exactly its tap.
- **Derived, not pinned (rule 6).** `js/core/config/nav.js` is the single
  source of truth — order, entry view, icon, labelKey, members with
  route/taps/via, importing VIEWS only. NAV_GROUPS, the mobile bar, the
  active-door lookup and all four section-switch member lists derive from
  it; the reachability test imports the real map and keeps its old parser
  as a drift-check. It asserts EXACTLY 6 entries in order and fails if
  `nav.library` returns.
- Retired dictionary keys: only the `nav.group.*` taxonomy (both
  languages). Every retired door key stays as a segment or view label —
  zero drift, i18n parity intact.

## v5.17.45 — The dhikr was below a whole screen of chrome, and search lied when offline

Phase C. Three things, one release, because each is small and each is honest
about what it is.

- **THE FIRST DHIKR SAT AT y=1073 IN A 900px VIEWPORT.** Above it: a shahada
  banner, a 216px hero of mostly empty green with a dot pattern, a location
  prompt, an 8-step onboarding wizard and a quick-tile row. A reader scrolled
  past more than a full screen of chrome before the reason the app exists had
  said anything. On the design standard in `HANDOFF.md` §5d — _"the text is the
  interface"_, _"chrome should bow to the Qur'an"_ — that is the design
  backwards, and it is why the page read as careless even though every tile on
  it was correct.
  - The order is now: shahada, where you are today, **the dhikr**. The hero
    keeps its greeting, Hijri chip and tagline and moves below the grid, slimmed
    from 216px to 131px. Nothing is removed — reordering, not deletion.
  - Measured after: **y=299**. On the first screen.
  - The grid also spans the full width on desktop. It was in a 562px column of
    a two-column dashboard, so half the canvas was empty; fixing the earlier
    2533px blowout had _revealed_ that rather than caused it. Now 1144px of a
    1144px column.
  - **And the Read-now buttons sat on three different baselines.** "Morning
    Adhkar" wrapped to two lines, "After-Prayer Adhkar" to three, and the
    action was a sibling following its tile rather than a child of the row. One
    missing `margin-block-start: auto`. Now `distinct === 1` across a row.
  - `tests/e2e/home-fold.spec.js` pins all of it: fold position, grid width
    against the column, one baseline per row, no clipped tile, no sideways
    scroll, the hero demoted but present, and every category still carrying a
    live count and an openable action.

- **SEARCH SAID "NO RESULTS" WHEN THE TRUTH WAS "NEVER LOADED".** `renderSearch`
  checked the Qur'an tier and the tafsir tier and rendered an error + Retry for
  both. It did not check the library tier. So a cold cache with no network
  answered a real query with an empty list — a claim about the corpus when the
  corpus was never fetched. The same query on the Library view was honest,
  because `library.js:282` checks the same flag.
  - Now the library tier gates the result list, the search is not run at all
    against a corpus that failed to load, and the breakdown count passes `null`
    rather than claiming 0.
  - `tests/search-offline-honesty.test.js` holds the generalised rule: a section
    that could not load must never render as a section that loaded and found
    nothing — and it enumerates the tiers, so a new searchable corpus without a
    failure branch fails the test. 4 of its 5 assertions fail without the fix.

- **I WAS WRONG ABOUT THE HOME PAGE, AND THE RECORD IS CORRECTED.** I had
  written, in two documents, that home put _"the entire corpus on it: 560
  tiles"_. **False** — it was my own bad selector, `[class*="tile"]`, which also
  matches the icon, chip and label nested inside each tile. Counted properly it
  is **9 named sections, 80 category tiles, 9,875px**. That is already the right
  shape: category-shaped, with a live count and a "Read now" action on each.
  The first design call I had written for this section — _"show categories, not
  items"_ — was written against a problem that does not exist, and is struck.
  The two claims of mine that did survive measurement are the ones fixed above.

## v5.17.44 — The language switch, on the four surfaces that were hiding it

A relational audit of the shell found the always-present language switch
missing or inert in exactly the modes where a reader is most likely to be
lost. For the 70-year-old Arabic-only reader who is the release gate, that is
the difference between a feature and a wall.

- **The switch was hidden in all four chrome-hiding modes.** Immersive focus,
  mushaf fullscreen, the classic reader's immersive mode and the ambient
  nightstand each set `display: none !important` on `#topbar`, and the switch
  went with it. An Arabic-only reader who reached one had no way back to
  English.
  - The earlier repair for the bare `#/focus` picker was a special case: it
    simply stopped engaging immersive mode. One surface fixed, two left — and
    then a fourth, which the first pass of this fix also missed.
  - Now: `languageToggleHTML()` is a component, rendered once in the topbar
    and once into `#immersive-chrome` — a deliberate **sibling of `#app`**,
    because every container inside `#app` is hidden by some mode. One derived
    CSS rule reveals it. A fifth chrome-hiding mode now needs one class in one
    selector list and nothing else.
- **`tests/language-switch-coverage.test.js` is the completeness trap.** It
  derives every body class in the app that hides `#topbar` and asserts each one
  also reveals the switch — and the reverse, so the rule invents no modes that
  do not exist. This is what caught the fourth mode. It also pins that
  `#immersive-chrome` lives outside `#app`, and that the kids guard does not
  govern configuration.
- **Kids Mode: a visible control that did nothing.** The switch rendered, was
  announced by assistive tech, and returned early from a kids scope guard —
  a guard whose job is stopping a child navigating outside an allowlist of
  VIEWS. A language preference is not navigation. The rule is now stated once:
  **the guard governs WHERE YOU MAY GO, never WHAT YOU MAY CONFIGURE.** The
  test asserts the reader is still in Kids Mode afterwards, because that
  distinction is what the guard is actually for.
- **Every mode in the e2e test is entered the way the app enters it.** The
  first version poked `document.body.classList.add('is-ambient')` and failed
  for an instructive reason: `renderer.js` OWNS body classes and re-derives
  them from state on every render, wiping an externally added class within
  300ms. Driving the real route is both honest and stronger — it would catch a
  mode the switch rule had missed, which is exactly what happened.

## v5.17.43 — One voice at a time, for all five voices instead of the two we looked at

`docs/PROJECT-PICTURE.md` §3 lists **"One voice at a time"** as a standing
product decision, and the code carried the comment at every start path. A
relational audit of every surface pairing showed the decision was true for the
pairings anyone happened to be looking at and false for the rest.

- **What was actually broken.** Five voices can hold the speaker — a moshaf
  file, a recitation session (which also owns a single-ayah tap), TTS
  narration, a per-dhikr clip, and a prayer alert. Each start path stopped only
  the engines its author was already thinking about, so:
  - TTS narration spoke over a recitation, a verse session, and an adhan;
  - a dhikr clip played under a live recitation;
  - starting a verse session or tapping an ayah never stopped TTS or a clip;
  - a scheduled adhan silenced four voices and not the fifth;
  - the prayer-time **preview** only knew about the full-surah player.
- **The fix is one function, not seven edits.** `claimSpeaker(voice)` in
  `js/app/audioEngine.js` arbitrates all five, and every start path calls it.
  Adding `speech.stop()` to four call sites would have fixed today's symptom
  and left the same trap for the sixth voice — which is exactly how this bug
  arrived five times.
- **It found a start path I had already missed.** `tests/audioQueue.test.js`
  went red on `prayer-test-sound`: the prayer preview in `worship.js` was a
  sixth site still hand-rolling its own yield. Fixed, and that is the clearest
  argument for the arbiter.
- **`tests/one-voice.test.js` holds the matrix.** Every voice has a documented
  set of voices it must displace, and the matrix is checked for symmetry
  _except_ where the adhan outranks everything: prayer time is the one moment
  the app must not talk over, so the adhan displaces everything and nothing
  displaces the adhan. My first cut asserted full symmetry and was wrong;
  naming the exception stops the next reader "fixing" it.
- **Resumable vs single-shot is preserved.** A full-surah track is paused and
  left docked — one tap resumes, position kept. A single-shot clip or a
  narration simply ends, with no auto-resume, because restarting someone's
  recitation unasked is worse than silence.
- **Three tests were pinning the shape, not the behaviour** — they grepped for
  the literal `yieldFullSurahPlayer()` / `stopDhikrAudio()` calls that the
  arbiter replaced. `tests/adhanYield.test.js` in particular passed _while_
  narration talked over the adhan, because a grep cannot tell you whether a
  voice was actually silenced. All three now assert arbitration instead, and
  the adhan one says so in a comment.
- Also: `AGENTS.md` was committed unformatted by the previous session, so
  `npm run check` failed on formatting alone.

## v5.17.42 — The desktop home was clipping a third of every tile row

Found by screenshotting the app at 1440x900 and 390x844 and actually looking,
after the owner reported the desktop home broken and the mobile "somewhat
okayish". One of those was a real bug. The rest is design debt, now written down
rather than patched over.

- **`.home-browser` was 2533px wide inside a 1144px column.** The right-hand
  third of every tile row was cut off mid-word - "After the Pro", "Evening
  Adh", "Du'a of Dh". `assets/css/desktop.css` had
  `grid-template-columns: 1fr 1fr`, and a bare `1fr` is really
  `minmax(auto, 1fr)`: that `auto` minimum resolves to the item's MIN-CONTENT
  width, and the adhkar browser contains a deliberately non-wrapping scroller
  (`.chip-row--scroll`), so the track grew past its container. `.view`'s
  `overflow-x: clip` swallowed the 1389px of overflow silently.
  - Now `minmax(0, 1fr) minmax(0, 1fr)`. The identical idiom was already used
    nine lines above in the same file; this one rule was simply missed.
    `.tasbih-controls` had the same latent bug (`auto 1fr auto`) and is fixed.
  - **Why every gate missed it:** the grid lives inside a `min-width` media
    query, so the rule is unreachable below it - which is exactly why it read as
    "mobile is fine, desktop is broken". Document overflow was 0, so no reflow
    check fired, and the axe sweep only runs mobile-sized viewports.
  - `tests/desktop-blowout.test.js` parses the stylesheet and fails on any bare
    `fr` track. Verified in Chromium: 0 cut-off tiles at 1440px.
- **The mushaf was checked and is GOOD.** The desktop spread has its ornamental
  frame, corner diamonds, juz medallion, ayah-end roundels and surah cartouche,
  and reads as paper. The cartouche counts are correct (`الفاتحة · ٧`,
  `البقرة · ٢٨٦`) - I misread them from a screenshot, verified before reporting,
  and there is no bug. Recorded so the next agent does not "fix" it.
- **The immersive exit pill was covering the Arabic it floats above.** Found
  while chasing a red spec, and the more serious of the two problems.
  `tests/e2e/esc-order.spec.js` presses and holds an ayah to open the quick
  sheet; the sheet never opened. The handler was fine — `pointerdown` on
  `.ayah-card`, 550ms threshold. At 390x844, `elementFromPoint` at the ayah's
  centre returned `BUTTON.reader-immersive-exit__label`: the fixed bottom pill
  sits on top of the reading column, nothing reserved space for it, and the app
  correctly ignores presses on buttons. So the long-press could never reach the
  text, and the pill was also covering Arabic a reader was trying to read.
  - `body.is-reader-immersive #main` now reserves the block-end space the pill
    occupies, honouring the safe-area inset. Logical property, per the RTL rule.
  - The spec now centres its target before pressing, which is what a reader
    does; `scrollIntoViewIfNeeded` parked the Arabic at the viewport edge,
    underneath the pill, so the press could never land.
  - Worth recording how this looked: a red test that read as "the press-hold
    feature is dead" was actually "a floating control is sitting on the text".
    Probing the element at the press point is what separated the two.

- **The rest is sloppiness, and it is now named rather than quietly tolerated.**
  The home screen is the whole corpus: 560 tiles, 8486px, nine screenfuls, with
  categories and single items sharing one visual treatment. Above the fold a
  reader meets a shahada banner, a 216px hero, a location prompt and an 8-step
  onboarding wizard - and no dhikr. Today's Progress sits nine screens down.
  The two-column desktop dashboard, designed for the old panel home, leaves half
  the canvas empty; fixing the blowout revealed that rather than causing it.
  - `docs/HANDOFF.md` PART B2 carries the visual review and the six specific
    design calls to make: show categories not items, rank the grid, demote the
    hero, collapse onboarding to one line, reshape the desktop home, and sweep
    the other routes at 1440px the same way.
  - A CSS fix is not a design review. This release fixes the bug and refuses to
    pretend the design is finished.

## v5.17.41 — Ten safe hostile findings in one commit: honest labels, dead code out, lint clean

- **Prayer source line stops endorsing.** The calc-sheet provenance label now
  carries its own qualifier — `prayer.methodSource` is `Source (unverified):
{body}` / `المصدر (غير مؤكد): {body}` in both languages — so an unverified
  body can never render as an endorsement. The triple pin moves with it
  (`tests/prayer-methods.test.js`, the UP-06 block in
  `tests/p2-roadmap-fixes.test.js`). The Latin institution name in the Arabic
  sheet stays verbatim by design, now documented as the MEMORY.md §4
  proper-noun exception (surah/reciter names): transliterating an official
  body name would invent a translation, which is worse — the no-leak gate
  scopes to the method options.
- **Graduation is greened, not red.** The provenance tests assert the source
  shape plus an honest boolean instead of pinning `verified:false`, so a
  method that earns a cited official publication plus scholar sign-off flips
  to `verified:true` without a red gate (`SOURCES.md` records the path).
  No angles change; institution names canonicalize to their full forms
  (Egyptian General Authority of Survey; Institute of Geophysics, University
  of Tehran) in `js/domain/prayer.js`, already canonical in
  `data/prayer-methods.json`.
- **Copy honesty, both languages.** `nav.you` in Arabic drops the
  account-implying `حسابي` for the literal `أنت`; the three Garden-as-place
  strings become Growth-treatment copy (`garden.invite/subtitle/seeStatistics`,
  EN+AR); `sifat_18` is now reported speech (`al-Amid reports…` /
  `العميد عن…`); the `sifat_17` caveat no longer names the unshipped 14/15
  counts (the shipped spread is 17/18/20/44).
- **Dead code out.** The deprecated `resolvePage` re-export leaves
  `js/services/surahPlayback.js` (one implementation in `services/mushaf.js`;
  `tests/mushaf-search.test.js` now pins the absence) and the unemitted
  `search-more` handler leaves `js/app/handlers/items.js` (absence was
  already pinned by `tests/search-pagination-pages.test.js`). Orphan and
  registry traps re-checked first — both green.
- **Lint clean.** The 8 unused-var warnings go: dead `mushafReader`
  `ayahCountLabelOf` and the `hizbStartPage`/`MUSHAF_PAGE_COUNT`/`PATH_MODES`
  imports removed, the four unused params underscored (`mushafJump` key,
  `tajweedCourseView` lang/hintKey, `tajweedCourse` mode).
- **Docs.** `AGENTS.md` cap text corrected 22/22→19/19 to match the enforced
  gate (`tests/startup-budget.test.js:48`); ledger row 24 notes it.

Full ritual: five markers to 5.17.41, snapshot-shell, manifest:generate,
compress-data, RELEASES entry. `npm run check` FULLY green with 0 lint
warnings. evidence/overhaul-* left unstaged.

## v5.17.40 — Prayer-method provenance: every method names its source, nothing new ships

- **Provenance infra, zero new angles.** Research found no further method
  verifiable to official-publication standard, so the seven shipped methods
  stay the seven shipped methods — shipping secondary angles as
  authoritative would violate the never-invent rule. What ships instead is
  the structure for honesty: each method in `data/prayer-methods.json`
  carries optional `source:{body,document,url?,verified}`, mirrored in the
  domain `METHODS`, with the body surfaced in the calculation sheet beside
  the existing region/note explainer through the bilingual
  `prayer.methodSource` label (one new key per language, institution proper
  nouns render verbatim in both).
- **Honestly unverified.** `SOURCES.md`'s prayer section cites only
  secondary corroboration, and the data mirrors it: `verified:false` on all
  seven, so no method claims official status it has not earned. The shape
  (non-empty body/document, explicit boolean, optional non-empty url, no
  unpinned keys) and the JSON↔domain↔i18n equality are pinned by
  `tests/prayer-methods.test.js` and the extended UP-06 block in
  `tests/p2-roadmap-fixes.test.js`.
- **The research is recorded, not lost.** The 20 candidate bodies reviewed
  and found unverifiable are listed in `docs/BACKLOG.md` §4 as an
  explicitly UNVERIFIED, not-shipping table — no angles recorded, so there
  is nothing to un-invent later and nobody needs to re-research from zero.
  A candidate graduates only with a cited official publication plus scholar
  sign-off.
- **Arrangement of trust, not of routes.** No control, route, nav entry or
  angle changes; the orphan trap stays green with 0 unjustified orphans.

## v5.17.39 — The orphans, one by one: four doors, two documented internals (reorganisation Phase 7)

- **Four doors** (`docs/REORGANISATION-PLAN.md` Phase 7, §4): `FOCUS` is
  Adhkar depth — the immersive one-item recitation stage behind every
  card's Open-focus, resolving to the HOME door in 2 taps (door →
  category tile → card Open-focus, no interstitial); `COLLECTIONS` rides
  the home collections panel in 1 tap and `COLLECTION` follows it in 2
  (door → collections panel → collection tile); `AUDIO` is Qur'an
  listening — the reciter/voice picker + offline downloads, resolving to
  the MUSHAF door in 2 taps (door → in-chrome List/Word/Audio switch).
  All four stay real routes with working deep links — active state
  resolves from the route, so a deep link into any of them still lights
  its door. Chrome entries hold at 12: no new nav entry anywhere.
- **The listening switch inside** (plan §2.3): the Qur'an mode switch
  grows from two segments to three — List reading, Word study,
  Listening — reusing the bilingual `nav.audio` label that already names
  its destination. Rendered in the mushaf, reader, roots AND audio views
  with existing `navigate` actions only — no new view, no new handler,
  no new static view import (renderer budget stays 19/19), no
  interstitial in any flow. Every segment keeps its 44px target.
- **Two documented internals** (plan §4 Phase 7: "a route with no door
  and no justification is a finding"): `EDITOR` is a tool, not a
  destination — invoked from content surfaces that already have doors
  (the Library banner sheet, the Category manage row, the card menu), so
  a nav door would promise a place for what is an action on a place;
  `AMBIENT` is a kiosk, not a section — the nightstand display hides the
  entire chrome by design (`body.is-ambient`, same contract as mushaf
  fullscreen), so a nav door would promise chrome the route deliberately
  removes (entry: the Prayer sheet; exit: the in-view close link back to
  `#/prayer`). Both keep working deep links and claim no chrome slot;
  both justifications are recorded in `js/ui/shell.js`
  (`INTERNAL_ONLY_ROUTES`) and in the reachability map. The orphan trap
  goes GREEN asserting 0 unjustified orphans.
- **Arrangement only.** No content, corpus, data or route change; deep
  links all keep working; no interstitial in any recitation; language
  switch, Elder/a11y (44px segments, zero under 24px, both themes, 200%
  text) and no-gamification targets are untouched — every rail is a
  door, never a scoreboard. Bilingual EN+AR throughout with no new i18n
  key (all segments reuse labels that already name their destinations).
- **Measured, not asserted:** the reachability trap maps the four to
  their doors (HOME ×3, MUSHAF ×1) and records the two internals;
  doorless routes drop 6 → 2, unjustified orphans 6 → 0, and both former
  traps (the orphan list + the map-coverage finding check) go green.
  Pinned by the Phase 7 blocks in `tests/nav-chrome.test.js` and
  `tests/nav-reachability.test.js`.

## v5.17.38 — Garden, tracker, counts, keepsakes and settings in one You section (reorganisation Phase 6)

- **The You section** (`docs/REORGANISATION-PLAN.md` Phase 6, §2.5):
  Garden + Checklist + Statistics + Favorites + Journal + Certificate +
  Settings + About collapse behind a single `nav.you` door — the daily
  tracker, which carries today, streaks and the section entry. The other
  seven stay real routes with working deep links — active state resolves
  from the route, so a deep link into any of them still lights the You
  door. Chrome entries 17 → 12.
- **The section switch inside** (plan §2.5): a minimal wrapping segmented
  switch in all eight views links My adhkar, Growth, Favorites, Journal,
  Statistics, Certificate, Settings and About-and-sources with existing
  `navigate` actions only — no new view, no new handler, no new static
  view import (renderer budget stays 19/19), no interstitial in any flow.
  The segments reuse bilingual labels that already name their
  destinations; only the renamed entries ship as new bilingual keys
  (`nav.you`, `you.myAdhkar`, `you.growth`, `you.about`), so each label
  promises exactly its tap. Eight modes wrap onto two rows; every button
  keeps its 44px target.
- **The naming pass** (plan §2.6): `Garden` and `Checklist` retire as nav
  nouns — the plant visual survives only as a treatment inside the Growth
  view, never as chrome. The §1.6 Search/palette mismatch closes by
  repointing: nav Search navigates to the real search view (the palette
  stays one tap away on the top-bar button, which honestly names itself).
  Document titles track the renames.
- **Arrangement only.** No content, corpus, data or route change; language
  switch, Elder/a11y and no-gamification targets are untouched — the rail
  is a door, never a scoreboard.
- **Measured, not asserted:** the reachability trap maps the seven members
  to the You door in 2 taps each (door → switch); orphans close two more
  (8 → 6: `FOCUS`, `COLLECTIONS`, `COLLECTION`, `AUDIO`, `EDITOR`,
  `AMBIENT`) for Phase 7, and the SEARCH mismatch test goes green. Pinned
  by the Phase 6 blocks in `tests/nav-chrome.test.js` and
  `tests/nav-reachability.test.js`.

## v5.17.37 — Tasbih, course, quiz and look-alikes in one Practise section (reorganisation Phase 5)

- **The Practise section** (`docs/REORGANISATION-PLAN.md` Phase 5, §2.4):
  Tasbih, the Tajweed course, the 99 Names quiz and mutashabihat live in
  one section behind a single `nav.tasbih` entry. The course's Phase 1
  read-group door was temporary and is re-homed here. All four of
  `#/tasbih`, `#/tajweed-course`, `#/quiz` and `#/mutashabihat` stay real
  routes with working deep links — active state resolves from the route,
  so a deep link into any of the three still lights the Tasbih door.
- **The stage rail inside** (plan §2.4): a minimal segmented switch in the
  Practise chrome (tasbih, course, quiz and mutashabihat views) links the
  four inner modes with existing `navigate` actions only — no new view, no
  new handler, no new static view import (renderer budget stays 19/19), no
  interstitial in any flow. The segments reuse bilingual labels that
  already name their destinations (the two nav entries plus the two views'
  own titles); only the group name ships as one new bilingual key
  (`practise.label`), so each label promises exactly its tap.
- **Arrangement only.** The course's stage ladder and progress model are
  untouched; no content, corpus, data or route change; language switch,
  Elder/a11y (44px segments) and no-gamification targets are untouched —
  the rail is a door, never a scoreboard: progress display, never ranking
  or shame.
- **Measured, not asserted:** the reachability trap maps `#/tajweed-course`,
  `#/quiz` and `#/mutashabihat` to the Tasbih door in 2 taps each (door →
  switch); orphans close two more (10 → 8) for Phases 6–7, and the SEARCH
  label mismatch stays pinned for Phase 6. Pinned by the Phase 5 blocks in
  `tests/nav-chrome.test.js` and `tests/nav-reachability.test.js`.

## v5.17.36 — Prayer, qibla and calendar behind one door (reorganisation Phase 4)

- **The Prayer doors merge** (`docs/REORGANISATION-PLAN.md` Phase 4, §2.1):
  times + qibla + the Hijri calendar live in one section behind a single
  `nav.prayer` entry. The calendar is a tab, not a peer door. Both
  `#/qibla` and `#/calendar` stay real routes with working deep links —
  active state resolves from the route, so a deep link into either still
  lights the Prayer door.
- **Times / Qibla / Calendar switch inside** (plan §2.1): a minimal
  segmented switch in the Prayer chrome (times, qibla, calendar views)
  links the three inner modes with existing `navigate` actions only — no
  new view, no new handler, no new i18n key (the segments reuse the three
  entries' own bilingual nav labels), no interstitial in any flow.
- **Arrangement only.** Wake-ups, storage eviction and every handler are
  untouched; no content, corpus, data or route change; the renderer static
  budget stays 19/19 and language switch, Elder/a11y and no-gamification
  targets are untouched. Ramadan keeps its own door.
- **Measured, not asserted:** the reachability trap maps `#/qibla` and
  `#/calendar` to the Prayer door in 2 taps each (door → switch); orphans
  hold at 10 for Phases 5–7, and the SEARCH label mismatch stays pinned
  for Phase 6. Pinned by the Phase 4 blocks in `tests/nav-chrome.test.js`
  and `tests/nav-reachability.test.js`.

## v5.17.35 — Home becomes the adhkar browser (reorganisation Phase 3)

- **The front page is the browse** (`docs/REORGANISATION-PLAN.md` Phase 3,
  §2.2): Home carries a grid of named category tiles — every daily section
  with its live item count, the kept section-level completion counter, and
  an explicit "Read now" action per tile. Taps to reach the adhkar grid: 0.
- **The 12 moods move to a filter row above the grid** — the same
  browse-by-need feature that lived at Home → Library → mood, now the front
  door. One tap from Home into any need.
- **The 99 Names, Zakat and Certificates leave the daily grid** for a
  labelled Reference row: reference, not a daily worship sequence. Their
  routes are unchanged — the Names keep their category route, Zakat and
  Certificates their views, all deep links working.
- **No data, corpus or route change.** The browser reads the same lensed
  documents as the Library view (hides, order and deletes respected) and
  emits only the existing `navigate` action — no new handler, no new view
  import (renderer static budget stays 19/19), no interstitial in any
  reading flow, language switch and Elder/a11y targets untouched, no
  gamification copy in either language.
- **Measured, not asserted:** the reachability trap maps `CATEGORY` and
  `MOOD` to the Home door in 1 tap each (via the adhkar browser); orphans
  drop 12 → 10 for Phases 4–7, and the SEARCH label mismatch stays pinned
  for Phase 6. Pinned by `tests/adhkar-browser.test.js` (13 subtests).

## v5.17.34 — One book, one door (reorganisation Phase 2)

- **The Qur'an doors merge** (`docs/REORGANISATION-PLAN.md` Phase 2): a
  single `nav.quran` entry opens the mushaf; the classic reader stops
  competing for a chrome slot. Both `#/mushaf` and `#/quran` stay real
  routes with working deep links — active state resolves from the route,
  so a deep link into `#/quran` still lights the Qur'an door.
- **List reading vs Word study switch inside** (plan §2.3): a minimal
  segmented switch in the Qur'an chrome (mushaf, reader, roots) links the
  two inner modes with existing `navigate` actions only — no new view, no
  new handler, no interstitial in any recitation flow.
- **ROOTS keeps its Phase 1 door** as the Qur'an depth; the bilingual
  switch labels (`quran.modeList` / `quran.modeWord`) ship EN+AR together.
  No content, corpus or data change; the renderer static budget stays
  19/19 and Elder/a11y targets are untouched.
- **Measured, not asserted:** the reachability trap maps `#/quran` to the
  Qur'an door in 2 taps (door → switch); orphans hold at 12 until Phases
  3–7, and the SEARCH label mismatch stays pinned for Phase 6.

## v5.17.33 — The flagships get a front door (reorganisation Phase 1)

- **Two nav doors, no structural change** (`docs/REORGANISATION-PLAN.md`
  Phase 1): the Tajweed course lands in the read group as its own entry
  (temporary home until Phase 5's Practise section), and Roots/word study
  sits beside the two Qur'an doors as the _depth_ of the Qur'an, not a
  separate top level (until Phase 2 merges them behind one door).
- **Bilingual from the first commit** (plan naming rule §2.6): new
  `nav.tajweedCourse` / `nav.roots` keys ship in EN+AR together, reusing
  the exact strings of the views they open so each label promises its tap.
- **No route changes, no deep-link changes.** All 34 routes stay reachable;
  active state resolves by equality so both new doors light correctly.
  Nav entries are config, not imports — the renderer static budget stays
  19/19, Elder/a11y targets and gamification rules untouched.
- **Measured, not asserted:** the Phase 0 reachability trap
  (`tests/nav-reachability.test.js`, committed here) drops from 14 orphans
  to 12 — the two closed are exactly the flagships §1.5 called out. The
  trap stays strict for the remaining twelve until Phases 2–7.

## v5.17.32 — Makharij and sifat stages: the spread, not a verdict

- **Two new course stages before mixed recitation** (`makharij`, `sifat`;
  8 stages, 17 sessions): the 17/16/14 makharij counts each with its
  authors and mechanism (Khalil → Jazari 17; Sibawayh + Shatibi 16 with
  al-jawf deleted and redistributed; Farra + Qutrub + Jarmi + Ibn Kayyan
  14 with lam/nun/ra merged), and the sifat 17/18/20/44 spread with Ibn
  al-Jazari's own parity reason for seventeen. Quoted from Ibn
  al-Jazari's _al-Tamhid_ ch. 8 and _al-Muqaddima_ vv. 9/19–26 via
  `docs/TAJWEED-RESEARCH-DOSSIER.md` §§3–4 — never resolved by the app,
  because there is no TAJ-09 ruling in the tree.
- **Spread rows are for study, not drills**: a dedicated renderer branch
  shows each count's label, citation, contested badge and disagreement
  note, and no drill button is emitted for spread rows, rule chips, or
  the continue block. The drill handler refuses non-drivable sessions as
  a second guard.
- **A third makharij session** separates what the brief conflated:
  ghunnah has one articulation point (al-khaysum, Jazariyya v. 19) while
  ikhfa has fifteen letters (Tuhfat v. 15–16).
- **Session titles now reach the screen**: the runtime spine omitted
  them, so every course row rendered an empty heading. The mirror carries
  all seventeen titles and the parity test enforces them.
- Pinned by `tests/tajweed-makharij.test.js` (contested review+caveat,
  all-three-counts render with attributions in both languages, no
  lone-17-default, no drill button, search/progress inclusion) and
  strengthened parity in `tests/tajweed-course.test.js` /
  `tests/tajweed-sources.test.js`.

## v5.17.31 — The install path a reader actually walks

- **Prompt deferral with a memory.** "Not now" (`install-later`) and a
  dismissed browser dialog stamp `{ at, count }` into persisted
  `settings.installDeferral` (sanitized, capped, future-proof) and hide
  the offer without consuming the one-shot `beforeinstallprompt` event —
  the re-offer path (`install-reoffer`) resurfaces it after a 7-day
  cooldown. Accepted vs dismissed are recorded distinctly from
  `userChoice`; a fresh install clears the memory. Pure logic in
  `js/domain/install.js`, flags in `state.install`
  (`promptReady/installed/outcome/shellReady`, still ephemeral).
- **Per-platform instructions, both languages.** iOS Safari gets its
  Share → Add to Home Screen steps, Android its menu steps, desktop its
  address-bar steps (new `onboarding.install*` keys, parity-gated) —
  replacing the one generic line (removed; the i18n audit gates orphans).
- **One persistent install row** (`js/views/installRow.js`) on About and
  in Settings → Data, reusing the wizard copy, so the offer survives
  past first-run.
- **An offline-ready signal.** The worker posts `precache-complete`
  beside `precache-failed`; the page latches `install.shellReady`
  (silent — no toast on every fresh install) and the rows badge it.
- **Stale comment fixed:** `initial.js` now names `rt.js` as the event
  owner, not `app.js`.
- Pinned by `tests/install-path.test.js` (deferral maths, platform
  matrix, reducer idempotence, panel/row variants, fake-prompt runs,
  live-handler consumption, parity) and
  `tests/e2e/install-path.spec.js` (manifest/SW/offline asserts). The
  real dialog, the iOS sheet, and the airplane relaunch need a physical
  phone — `BLOCKED:device` in `docs/DEVICE-TEST.md`, not claimed here.

## v5.17.30 — Per-dhikr audio infra, with zero clips on purpose

- **The player is ready; the clips are honestly absent** (OPEN-ISSUES #15
  infra only, still OPEN — #37's scholar ruling and a licensed source are
  still the gate). Items may now carry optional
  `audio:{url,reciter?,source?,license?}|null`, validated https-only
  (`normalizeDhikrAudio` in `js/core/schema.js`, mirrored at the restore
  boundary in `sanitizeDhikrAudio`), and a "Play recitation" button renders
  in cards and Focus ONLY where a verified clip exists — no button
  otherwise, never a dead one, and never TTS wearing recitation's name
  (Listen keeps its synthesis label, with a distinct icon and wording).
  Playback is single-shot and streaming-only (`js/services/dhikrAudio.js`:
  one shared element, `preload="none"`, never IndexedDB, no session
  semantics borrowed from the full-surah engine), failures toast with a
  Retry that replays the same item, and one voice wins at a time
  (recitation yields synthesis, synthesis yields recitation, the adhan
  stops both). Pinned by `tests/dhikr-audio.test.js` (shape fixtures,
  card/Focus render with and without, driver play-once/failure,
  handler Retry wiring — all fixture urls, no real audio).

## v5.17.29 — Roundel on every paper, and the page reads as a sheet

- **The ayah-end roundel now wears all eleven papers.** The tight-roundel
  technique from the Madinah edition (tint on the content-box only, an
  inward-offset outline ring, pill radius — the marker's padded 30px+
  hitbox untouched) already dressed Madinah green and cream print-red;
  ivory, sepia, parchment, pure white, mint and rose take it in antique
  gold, night, true black and black-and-gold in pale gilding, each tint
  resolving per paper through the wrap-scoped `--mushaf-gold`. Every
  marker ink holds WCAG AA on its own ground (worst: sepia 4.67:1),
  Arabic is explicitly never letter-spaced so no spacing mode can unjoin
  it, and forced-colors falls back to a system-color ring. Pinned by
  `tests/cssDesign.test.js` (per-paper roundel, hitbox, AA on all 11,
  forced-colors) — note `scripts/css-contrast-audit.mjs` does not exist;
  the audit math lives in that test instead.
- **The windowed page is a page-height sheet.** `.mushaf-page` outside
  fullscreen owns `min-block-size: clamp(420px, 75dvh, 960px)` — a short
  page fills the viewport like paper, a tall page still grows and scrolls
  with the document, and both facing pages of a spread stretch to one
  height. TRUE fullscreen is untouched (`layout.css` still floors at 0,
  the auto-fit engine still runs on fullscreen sessions only), and the
  floor is pure viewport units so the deliberate 200%-exclusion
  (OPEN-ISSUES #49) cannot fight it. Pinned by
  `tests/e2e/mushaf-sheet.spec.js` (390px floor, desktop spread parity,
  fullscreen geometry).
- **The backlog told two stories about the sheet; now it tells one.**
  G-3 claimed the page-height sheet shipped in v5.17.21–23 while §4 said
  not started. It ships here, and both rows say so.

## v5.17.28 — Search chips that know which page they open

- **One `resolvePage`, and Search prefetches the map it resolves through**
  (OPEN-ISSUES #46, still open — this narrows it, it does not close it).
  The ayah→page reader existed twice — `services/mushaf.js` (the route,
  the follow-along flip) and a stricter twin in `services/surahPlayback.js`
  (the Search chip) — and Search only rendered its mushaf chip when the
  map happened to be loaded already. Now `mushaf.js` is the single
  canonical implementation (the playback copy is a deprecated re-export of
  the same function), corrupt map entries refuse with null instead of
  clamping onto a wrong page, and opening Search with a query prefetches
  the mushaf meta so a cold search renders chips, not reader-only rows.
  No new strings — the chip already shipped EN+AR. Pinned by
  `tests/mushaf-search.test.js` (unification identity, resolve/route
  units, chip href with page AND ayah, no-chip-when-null, AR label).

## v5.17.27 — The picker says what the player already knew

- **Whole-surah voices are labelled in the picker itself** (OPEN-ISSUES #13).
  Voices without per-ayah timings were marked after selection (the
  `audio.fileModeNote` line under the player) but the two pickers showed
  bare names — nothing told anyone _before_ tapping that highlighting,
  page turns, repeat and compare need ayah mode. Every moshaf row in both
  pickers (the in-player `buildReciterPick` and the Audio view's
  `renderAudio`) now carries a short chip — `audio.wholeSurahBadge` in
  both languages, with the existing `fileModeNote` sentence as its title.
  The 16 ayah-by-ayah voices carry no chip. Pinned by
  `tests/audio-picker-timing-badge.test.js` (moshaf rows carry it, ayah
  rows do not, EN+AR), written failing first.

## v5.17.26 — What a broader review found, including in my own writing

Review 4 came back at **8.7 against 8.8** — a regression, and the first honest
one in the score history. It ran a wider probe than the last round and found
more than the last round did. Two of its findings were in religious data, and
one of those was the worst defect this project has shipped.

- **The Basmala printed twice on Al-Fatiha, mushaf page 1.** The gilt header
  guard excluded only At-Tawbah. In Al-Fatiha the Basmala _is_ ayah 1, so the
  page rendered an unnumbered header **and** the numbered verse — the same
  words twice, on the most-read page in the mushaf. `data/mushaf/1.json` was
  correct throughout; the renderer was corrupting it. Now excludes chapter 1 as
  well. `tests/mushafBismillah.test.js` pins the rule against the _data_ (4/4,
  and 2 fail with the fix reverted) and an e2e assert proves exactly one
  header for the surah, failing with `headers: [1, 2]` before the fix.
  - Two of my own first attempts at that e2e were wrong and would have shipped
    a green test over a broken claim: one counted every Basmala on a
    two-page spread, and one counted one entry per _tappable word_ instead of
    per printed header. Both passed. The negative run is what caught them.
- **59 records denied the grading of the collection they cite** (row 40). Not
  the 13 first sampled: a corpus-wide sweep found `grade: "Unknown"` beside
  `reference.collection: "Sahih al-Bukhari 6306"`, so the UI showed an
  _Unverified_ chip next to a precise citation into a collection that asserts
  exactly that grading. The information was already in the data; two fields
  disagreed.
  - `scripts/repair-grade-vs-collection.mjs` resolves it _from the citation_,
    scoped to the two collections that self-certify in their own titles. It is
    a report-then-`--write` script, and it round-trips the files byte-identical
    so the diff is 59 grade lines and nothing else.
  - `my-06-011` (Musnad Ahmad, which contains da'if and mawdu') and
    `my-13-004` (al-Adab al-Mufrad, where al-Albani's grading is a note) were
    deliberately left `Unknown`.
  - `tests/grade-consistency.test.js` pins **both directions**, because a
    grader that only ever promotes records is its own kind of defect. It also
    asserts the corpus is non-empty, so it cannot pass vacuously.
- **A 16x16px tap target survived Elder Mode** (WCAG 2.2 SC 2.5.8). The
  chevron into the hadith of the day carried no class at all, so it collapsed
  to the icon's own size. It now carries the same target class as the shuffle
  button beside it; a browser probe measures **0 targets under 24px** in both
  default and Elder Mode.
- **Unknown routes said the wrong thing.** `#/bogus` redirected home with a
  toast reading "Something went wrong." Nothing went wrong — the link points
  nowhere, and that is a different sentence. New `common.unknownRoute` string
  in both languages. The router docstring also promised a "not found" view
  that does not exist; it now describes what the code does.
- **"42 hadith · 1 chapters"** — added `hadith.bookCountOne` in both languages.
  Arabic's `باباً` is a counter and stays singular for one, so it is the same
  string in both keys.
- **Six claims in `docs/BACKLOG.md` were wrong and are corrected in place.**
  "Elder Mode raises them all" (it did not), a hand-written corpus total that
  had already rotted, two descriptions of proofs I had not read, "install
  story: not started" when the manifest and prompt wiring were done, and an
  omission — the doubled Basmala was not on the list at all.
- **Two findings were not acted on, on purpose.** The "search counts read 0
  while loading" report did not reproduce for me: the loading panel prints an
  explicit loading line and a skeleton and no zero, so it is logged as
  OPEN (unreproduced) rather than "fixed". And "completing a dhikr removes its
  card" is the deliberate v5.2.24 session dismissal, animated rather than
  snapped — a product disagreement, not a defect, and not mine to make.
- **The score-history test now accepts a regression that is NAMED.** It
  previously demanded non-decreasing scores, so 8.7 failed it and the tempting
  fix was to round up. The score is the score. The gate is now "never regress
  quietly".

## v5.17.25 — The adhan leaves the precache

- **`assets/audio/adhan/adhan.mp3` (~2.4MB) is no longer precached**
  (OPEN-ISSUES #8). It was roughly 40% of the install for a file only
  needed when a prayer alert fires. The service worker now caches it
  cache-first on first play (`isAdhanRequest` in `sw.js` routes it to the
  same `cacheFirst` — with the same store-only-200 guard, so a 206 range
  slice can never poison the entry): install stays lean, the first alert
  fetches it, and every later alert plays from cache, offline included.
  - `tests/adhan-cache.test.js` pins all three halves: not in `APP_SHELL`,
    not in the committed shell snapshot, an explicit runtime path to
    `cacheFirst`, and playback still resolving to the bundled file that
    still ships on disk.
  - The ledger row closes as **RESOLVED (verified)**; the backlog's open
    table loses it.

## v5.17.24 — The backlog becomes a real artefact, and stops lying

- **`docs/BACKLOG.md` exists.** The owner's goals, where each one stands, the
  score history, every review finding and what happened to it, and the known
  non-fixes with their reasons. It was previously living in one agent's
  memory, which is exactly the thing a second agent cannot read.
  - `tests/backlog-consistency.test.js` fails if the backlog and the ledger
    disagree, if the stated version is not the tree's version, if an OPEN
    ledger row is missing from the open section, if a row marked "fixed" does
    not name a test that exists, or if the 9.1 gate is ever recorded as met
    without a review number that says so.
- **The consistency test immediately found four things I had got wrong.** Two
  "fixed" rows — the recitation Retry and the widened `roomySpacing` — had
  **no test at all**. They were real changes and they were claims, not
  closures. `tests/audio-recovery-and-spacing.test.js` now covers both, and
  the same test caught a `.ayah-card__reference` selector I had invented and
  that matched no markup, removed on the commit that introduced it.
- **Ledger row 7's stated blocker was false.** It said no action-bearing
  toast API exists. It has existed all along, with several call sites using
  it — the audio path simply used none. A false blocker in a ledger is worse
  than no blocker, because it stops the next person from looking.
- **Heading order on list views.** Card titles are `<h3>` by design, meant to
  sit under an `<h2>`, and three views put an `<h1>` and then the cards with
  nothing between — so the sequence was h1 → h3. The list now has the `<h2>`
  it was always missing, and the existing heading sweep checks order as well
  as clipping.

## v5.17.23 — The second review's ten findings, closed

A second independent review scored 8.8 and raised ten points. This closes
them. The two most severe were ours again.

- **The tajweed course rendered six EMPTY stage headings.** The bilingual
  titles and rationales existed in `data/tajweed-course.json` and did not
  exist in the runtime mirror the view reads — so a reader saw "Stage 1 …
  Stage 6" with no names, in either language, on a six-stage course. The
  mirror-parity test compared `id`, `order`, `focus` and `citation` and **not
  the text**, so it stayed green throughout. Parity now covers every field,
  and a second test asserts the rendered symptom.
- **The mushaf deep link's mark was invisible.** My own stylesheet refactor
  had swept every "tajweed" rule out of `quran.css` into a course stylesheet
  that is injected on the tajweed course route **alone** — so on the mushaf,
  the only surface that uses `.mushaf-ayah--target`, the rule simply did not
  exist. The element was in the DOM with a transparent background: the reader
  was told to open 2:255 and shown a page with nothing marked. The rule is back
  in the sheet the mushaf loads, with the reason recorded at the top, and a
  browser test asserts the mark is _painted_, not merely present. The reveal
  also waited for the real page instead of consuming its token on the skeleton,
  and focuses a real tab stop.
  - One finding here is **not** a defect and is left as is: turning the page
    drops the mark, because the verse is no longer on screen. Carrying the
    params through a page turn would fight a reader who moved on. A test pins
    the intended behaviour.
- **The Ahadeeth header overclaimed.** It read "{n} authentic sayings of the
  Prophet ﷺ from the most trusted collections" over a corpus where 19,217 of
  34,239 narrations come from the four Sunans — books the app itself grades
  Hasan and Daif. That is the most religious sentence in the app making a
  claim its own data contradicts. Both languages now say the accurate thing,
  and a test reads the corpus to prove the old wording was false.
- **A recitation failure offered no way back.** The action-bearing toast API
  has existed all along (3 of 243 call sites used it), so `OPEN-ISSUES` row 7's
  stated reason — that no such API exists — was **false**. The audio path used
  none of it. Both the pre-playback failure and the mid-stream drop now carry
  a Retry that replays the surah that was playing.
- **The course was three taps deep** — mushaf, action sheet, Settings, Study
  aids. It is in the palette now, which is the app's all-access launcher.
- **A page heading read "The …".** The Qur'an view's H1 rendered 229px of text
  in a 98px box at 390px, so both sighted and screen-reader users got a
  truncated page name and a screenshot looked fine. It wraps now, and
  `heading-clipping.spec.js` sweeps ten routes for the whole class.
- **The nightstand view had no heading at all** without a location — a
  paragraph and a link, 66 characters. It has a name now.
- **`search.quranCount` had no plural.** "1 ayahs" was reachable by searching
  any single word. The Arabic rule the mushaf kept privately is now a shared
  helper: the plural covers 3–10 and 11+ takes the singular accusative, which
  is Arabic grammar rather than a template.
- **The ledger disagreed with itself**, and a review found it: the summary
  claimed 20 open where the header said 11, named three resolved items as
  "release-gating", and attached an honest-absence claim to three libraries
  that contain **zero** Unknown grades — the real 18 are in `adhkar.json`.
  `tests/open-issues-ledger.test.js` now fails if the header, the summary and
  the table ever disagree, or if a gate that already exists is named as
  highest-risk again.
- **Not changed, deliberately:** the 200%-type scale still does not reach the
  mushaf's Arabic. The mushaf owns its typography, has its own slider and
  pinch, and Elder Mode now does reach it. Letting the app-wide scale fight
  the mushaf's own control would make neither predictable.

## v5.17.22 — A hostile review found four things, and three of them were mine

An independent review at v5.17.21 scored 8.2/10 and was right about every
number it gave. Four findings needed work, and three were regressions this
project shipped earlier.

- **The mushaf deep link silently showed the wrong surah.** `?s=2&ay=255`
  opened Al-Fatihah. The `s`/`ay` params were read and used to add a CSS
  class, but **nothing resolved the page from them** — the reader still read
  `activeParams.page` alone. A silent wrong answer about scripture position,
  which is the one failure class this product exists to avoid. The same
  one-line rule was stale in three more places (the data loader, the
  recitation picker, the sheet), so the fix had to reach the app layer, not
  only the view. The resolver now lives in `js/services/mushaf.js` beside the
  `clampPage`/`resolvePage` it composes, and nine sites call it.
  - **The test for it could not fail.** The v5.17.21 commit asserted only
    `{ page: 1 }`, so the feature was untested in the one way that mattered —
    in a commit whose own message said "a test that cannot fail while the app
    is wrong is worse than no test." Twelve cases now, each reading the real
    `ayahPages` map, and each verified to fail when the fix is reverted.
- **The tajweed course shipped for a release rendering as bare text.** Its CSS
  had been written into `quran.css`, which the renderer injects only for the
  mushaf, the reader and the roots route — so a headline feature looked like a
  broken prototype. Its rules now live in their own `tajweed-course.css`,
  loaded on that route alone: a course visitor downloads a ladder, not a book.
- **The journal was invisible in dark mode at 1.19:1.** Its textareas carried
  `class="journal-textarea"`, which matched **no rule in any stylesheet**, so
  they fell back to the browser's white background while the app sets light
  text. The reader's own words, unreadable, on the one screen where they
  write them. They now sit on the shared `.input` base like every other field.
- **Thirty-one hadith strings printed `<br>` inside the Arabic.** An upstream
  line-break convention met the app's (correct) escaping of scripture-derived
  text, so four characters were visible in the middle of the Arabic on the
  home screen. The mark is not deleted — it is a real line break in the
  printed source — so it becomes a newline and the stylesheet renders it.
- **Elder Mode and 200% type were ignored by the mushaf.** A mushaf owning its
  typography is correct, but owning it _silently_ meant the app's
  accessibility promise lapsed on its most important screen: chrome measured
  9.4px and did not move at all. Elder Mode now raises the mushaf's own scale
  by the same step the rest of the app uses, and the smallest mushaf text has
  a real floor.
- **`roomySpacing` was a control that did nothing where it mattered.** It
  reached translations, virtues and the journal — the supplementary text —
  and left the main reading surfaces byte-identical, which is the signature of
  a dead switch. It now reaches the reader, the tray, tasbih phrases and
  field labels. The mushaf is deliberately excluded: it has its own
  line-spacing control, and two settings fighting over one line box leaves the
  reader unable to predict which wins. Arabic gets word-spacing only —
  letter-spacing would break the joins.
- **The paramless `#/focus` picker was hiding the topbar**, taking the
  language switch with it (measured at 0x0). Focus _mode_ now needs a focus
  _target_; the picker keeps its chrome. Ambient stays chrome-free: it is a
  nightstand clock.
- `docs/CAPABILITY-PARITY.md` had G1 and G2 as open gaps. Both shipped long
  ago. They are now marked shipped **with the evidence that re-verified
  them**, because a comparison document that is confidently wrong is worse
  than no comparison document at all.

## v5.17.21 — The mushaf: a link that can name a verse, a jump drawer that knows where you are

- **"Open the mushaf at 2:255" now exists.** All 13 mushaf links in the app
  passed a page and nothing else, so search's "open in mushaf" and any shared
  link dropped the reader at the **top** of a page, with the ayah they asked
  for below the fold and nothing to say it was there. The route now carries
  `s` and `ay`, the target ayah is marked and scrolled into view with focus
  moved to it, and a 280ms settle draws the eye without breaking the project's
  300ms motion contract. `data/mushaf-meta.json` already held all 6,236
  ayah→page entries; the route simply could not express the target.
- **Fullscreen can jump.** Enter fullscreen — the mode you read seriously in
  — and you could turn pages by one and nothing else. Reaching surah 36 from
  surah 2 meant leaving fullscreen, opening the drawer, and re-entering,
  losing the auto-fit, re-running its bisection and re-arming the wake lock.
  The same existing action, so no new handler and no allowlist entry.
- **The drawer says where you are.** 204 destinations across three scrollers
  and not one carried `aria-current`. Now the surah and juz you are reading
  are marked, which is orientation for a screen-reader user and a fact
  everyone else can see too. Derived from the same first-page maps the jump
  buttons already use, so it cannot disagree with where a jump lands.
- **An approximation no longer wears the authority of printed data.** The
  page header printed "Juz 1 · 1/8" — the eighth being derived by dividing
  the juz's page span, not read from a margin — with no marker, while the
  hizb drawer one screen away said plainly that positions are approximate.
  One convention now, applied twice: the running head is marked as an
  estimate, and the drawer's note was corrected, because "exact marks are
  shown on the page" described something the app never did.
- **Deleted `data/mushaf-annotations.json`.** Nothing in the app ever loaded
  it, and a test asserted on it — so it would have stayed green if the sajdah
  accent had been deleted from the reader, or if the double-underline list had
  drifted. The test now reads the live sources the renderer actually uses.
  A test that cannot fail while the app is wrong is worse than no test.
- **Extracted `js/views/mushafJump.js`.** `mushafReader.js` crossed its
  documented 800-line cap at 810, and AGENTS.md is explicit that a file near
  its cap gets a module rather than a growth. The drawer was the clean seam:
  pure navigation, no state of its own. Re-exported from the facade, so every
  existing importer is untouched.

## v5.17.20 — Nothing is a dead end, nothing is half-checked, and one finished feature is finally reachable

- **Every route is now proven accessible, not four of them.** A new gate scans
  all 30 views in both themes. Widening it immediately found four serious
  violations the narrow gate could not see, and all four are fixed: an
  `aria-label` on a role-generic `<span>` in Zakat (ARIA forbids labelling
  one; the `title` already carried the same text), an About version line that
  failed contrast only because of `opacity: 0.7` — the token alone passes at
  4.98:1, the opacity took it to about 3.4 — and the amber chip at 4.39:1,
  now `#9a4708` at a measured 5.60:1. Colour tokens were measured, not guessed.
- **A bare `#/mood` and `#/focus` were dead ends.** `#/focus` is launched with
  no parameters from the app's own palette, so tapping it in the launcher
  produced "Item not found". Both now answer the question instead of refusing
  it: a picker of the twelve needs, and a picker of categories that have
  visible items. A _mistyped_ id still says not-found — a picker there would
  dress a broken link up as a working page, which is the one thing this app
  must not do.
- **The language switch exists on every view.** It used to live only at first
  run and in Settings, so a reader who mis-picked at onboarding had no
  in-context way back: an audit counted zero language controls across the
  reader, library, mushaf, prayer and tasbih. One icon, always present, labelled
  with the language it switches _to_.
- **The classify round is reachable.** `buildClassifyQuestion` has been
  written, tested and provenance-tagged since the quiz engine landed, and no
  user could ever get to it: the answer-mode allowlist excluded 'classify' and
  the picker's mode switch offered two buttons. A complete, curated
  multiple-choice generator was sitting in the codebase doing nothing. It is
  now a third round type — deliberately not a third answer mode, because
  "which rule is this?" has a different answer shape from "tap the letters",
  and it shares the pool, the stats dispatch and the summary so neither simple
  mode grows a branch it never takes. A wrong answer names the rule, cites it,
  and offers to read the ayah.
- **The Elder Mode finding was half wrong, and the copy now says so.** The
  audit reported the wizard never offers Elder Mode. It does: the comfort
  step's button already sets `elderMode`. The real gap was that the wizard
  called it "large text" while promising only text, when it also raises
  contrast. The wording now matches the behaviour in both languages.
- **Two look-and-feel findings were false positives, verified and left alone.**
  The home hero is full-width above a 2-up grid (984 = 482×2 + a 20px gap),
  which is a deliberate magazine layout, and the reader's ~92px side margins
  are a centred reading measure — widening it would give the Arabic too long a
  line. Both were measured in a browser before deciding not to touch them.

## v5.17.19 — A tajweed course, in six stages, with a plan or free access

- **There is a course now.** Six stages, fourteen sessions, ordered the way
  Arabic101's published 30-day programme orders them — madd first, because
  madd is the most audible thing in a beginner's recitation and the
  foundation the rest builds on. The same gradient is independently the one
  the classical texts use, and the one Imam Muhammad ibn Saud Islamic
  University's free intermediate curriculum follows.
  - **No religious prose was written to build it.** The course is order and
    progress over material that was already sourced: every session points at
    rule ids whose bilingual name, description and citation live in
    `data/tajweed-sources.json`, and every drill is generated at run time by
    the app's own classifier over the app's own Uthmani text. No exercise or
    answer key is hand-written anywhere in it.
  - **Arabic101 is credited for the pedagogy, not the syllabus.** Their exact
    stage names were never verifiable from a public source, so the grouping
    here is the matn gradient arranged in the shape they publish, and the
    data file says exactly that rather than implying a reproduction.
- **Two ways to follow it, and the reader picks.** _Guided_ unlocks sessions
  in order, so the rules accumulate; _open access_ opens everything at once,
  for someone who came for ikhfa and should not have to walk a ladder to
  reach it. It is a preference, not a capability gate: switching between them
  never touches progress, and a finished course never locks itself out of
  revision.
- **Search over sessions by rule.** Knowing you want a rule is the common
  case; not remembering which stage it lives in should not stop you. The
  query lives in the route, so a search is a link you can send someone.
- **A rule chip is the precise action.** The practice engine drills one rule
  per round, so a session with several rules shows a chip per rule instead of
  quietly picking one and calling it the session. A session-level button
  appears only where a session honestly maps to a single round.
- Locked sessions say what unlocks them rather than just dimming, because a
  greyed row with no reason reads as broken.
- Two bugs found and fixed on the way, both the same class as the dead
  storage switch: the mode radios were click-handled, so the handler read
  `ds.value` — an HTML attribute, not a dataset key — and the switch silently
  did nothing. And one browser assertion was passing against the boot
  skeleton rather than the lazy view, which had turned a real check into a
  false pass; it now waits for a course-specific element.

## v5.17.18 — Every rule now says where it came from

- **A false attribution, removed.** The tajweed palette was described in five
  places as "the standard chart", and two of those were user-facing strings
  in the legend and Settings. A research pass
  (`docs/TAJWEED-RESEARCH-DOSSIER.md`, 141 URLs, every claim marked
  verified / contested / unverified) found that **no authority publishes a
  rule→colour table under that name** — the widely circulated "KFGQPC colour
  legend" is a third-party font's scheme, and the Complex publishes no such
  table. The colours stay: they are familiar and defensible. The claim does
  not, because a reader told these are standard colours will trust them for
  something they are not. The app now says the palette is its own.
- **All 20 rules carry a citation.** `data/tajweed-sources.json` cites each
  rule to Tuḥfat al-Aṭfāl or Ibn al-Jazārī's al-Muqaddima al-Jazariyya with a
  verse-level locator, so a reader can check the line — and so the app can
  honestly say where its rule descriptions come from. This satisfies the
  sourcing rule without rewriting wording that was already correct.
- **Disagreement is shown, not resolved.** Six of the twenty entries are
  marked `contested` and render the disagreement in the legend: qalqalah's
  five-or-six letters with all three named expansions, the four madd lāẓim
  types against a `madd_6` id that no matn supports, and where texts differ
  on whether ʿiwāḍ and ṣilah belong to the lāẓim class. The app has no
  standing to pick, so it shows the spread.
- Two claims the research corrected in our own favour: ghunnah has **one**
  articulation point (al-khaysum) — the figure 15 counts ikhfāʾ letters — and
  the palette convention that _is_ citable is Indonesia's LPMQ _Pedoman
  Tajwid Sistem Warna_ (2011), a government standard with exact CMYK values.
- `tests/tajweed-sources.test.js` fails if a rule ships without a citation, if
  a citation points at an undefined work, if the runtime mirror drifts from
  the canonical JSON, or if a "standard chart" claim reappears anywhere.

## v5.17.17 — "Works offline" becomes true, and a switch that was never a switch

- **The About screen stopped overclaiming.** It says "Everything lives on
  your device and works offline." That was false for the corpus people
  actually recite from: the only route to the data was a Download button on
  a screen nobody had been told about, so a worshipper opening the app in a
  field with no prior signal got a dead Qur'an. The Qur'an text and all 604
  mushaf pages — 2.7 MB gzipped, measured — now download once by default.
  - **It is not a precache.** Adding 1,436 corpus files to the service
    worker's install-time `addAll` would be all-or-nothing, so one flaky
    fetch would fail the entire app install. This reuses the existing
    tolerant, cancellable, per-group-counted batch engine, so a group's
    "downloaded" row is measured the same way whether it was tapped or
    automatic.
  - **The reader can see it and turn it off.** Offline → Storage mode, with
    the measured size in both languages. Big study corpora (hadith, tafsir,
    word study) stay opt-in — that choice was always honest; it was only
    the headline corpus that was missing.
  - **Bandwidth is never spent unasked.** Skipped when offline, when a
    batch is already running, when `save-data` is on, and on a 2G link. A
    partly-finished batch resumes; a finished one is left alone.
- **Fixed: a settings switch that did nothing.** "Store downloads compressed"
  had never worked. The delegated click listener calls `preventDefault()`
  before dispatching — correct for links and buttons, but on a checkbox it
  _cancels the native state toggle_. The handler then read its own
  pre-toggle value, wrote the same value back, and the switch sat inert.
  Nothing threw, no test was red, and it looked correct in every screenshot.
  - Both storage switches now live in the change pipeline, which reads
    `el.checked` after the browser has toggled it — the pattern the other
    eleven switches in this app already use.
  - The click pipeline no longer cancels a toggle's own state change, so the
    failure cannot silently repeat.
  - `tests/checkbox-pipeline.test.js` audits **every** checkbox and radio in
    the app for ownership by the change pipeline, so a thirteenth dead
    switch fails the gate instead of shipping.

## v5.17.16 — Arabic typeface choice, and an independent score of 8.0

- **The reader can finally choose the Arabic typeface.** The Mushaf has always
  had one; the adhkar, the duas, the reader and the tasbih stage did not — Arabic
  reading text outside the Mushaf was locked to a single Amiri-first stack, so
  a reader who prefers a Medina-print Naskh or a modern face had no way to say
  so. Four choices now sit beside the Arabic size slider: **Amiri** (the
  default), **Amiri Quran**, **Scheherazade New**, and **the device's own
  font** for the clean modern look.
  - **Zero new bytes.** Every family is already bundled (all OFL, already in
    APP_SHELL) or is the device's own — a new typeface would cost install size
    on a 3G phone for a preference.
  - **The Mushaf is untouched.** It always sets its own family and `quran.css`
    prefers it, so a page of the Qur'an can never inherit this choice.
  - **The default changes nothing.** It reproduces the previously hard-coded
    stack exactly, so an upgrade is visually a no-op.
  - It is an **enum in the sanitizer**, not a raw family string: a crafted
    settings blob trying to inject a font stack (`Cairo; } body {…`) is
    rejected and falls back to the default.
  - Thirteen surfaces follow automatically by overriding one custom property
    from a root `data-arabic-font` attribute, so there is no per-view plumbing
    to keep in sync.
- **An independent scoring agent put the app at 8.0/10** (±0.6), measured by
  execution against azkar.me as the benchmark: look and feel 7.5, feature depth
  8.5, data honesty 9.0, offline truth 7.0, accessibility 7.0, bilingual 8.5.
  Its five findings are recorded in `docs/OPEN-ISSUES.md` — including the
  correction that the "missing manual minute offset" is in fact shipped and
  pinned, while the real gap is methodology _depth_ (7 methods against 23, two
  Asr rules against four madhab conventions).

## v5.17.15 — The counter becomes the hero, and a floating window for it

- **The counter was redesigned against a measurement, not a taste.** Ours was a
  10px ring around a 41.6px numeral: the ring dominated and the number did not
  read as the thing being counted. Measured against azkar.me's counter (a
  hairline ring, a 72px/700 numeral, almost no other chrome), the dial is now
  240px with a **72px/800 tabular numeral sized as a third of the dial** — so
  the 200% type scale can never push the numeral out of its own ring — and the
  ring is a **6px hairline whose tip carries a faint halo**, so the eye follows
  the leading edge of the progress.
- **A tap now feels like a bead moving.** The numeral punches on press
  (`scale(1.08)`) and a soft bloom lifts behind it, both pure CSS so they can
  never drift out of sync with the count the way a scripted animation would.
  The dial also gained an inner highlight and its own shadow, so it reads as a
  physical medallion rather than a flat outline. Under `prefers-reduced-motion`
  — and under the app's own `data-reduce-motion` switch — the punch and the
  bloom are removed while the ring fill and the number change remain, so less
  motion costs no feedback.
- **The ring's geometry now has one source of truth.** The SVG draws at a fixed
  200-unit viewBox and is scaled by CSS, so changing `--tasbih-dial-size` moves
  the ring, the bloom and the numeral together instead of leaving a stale
  200px ring inside a 240px dial.
- **The counter can now be a floating window** — the one competitor feature we
  cannot ship natively (no build step, no app store) but can match on the web.
  Document Picture-in-Picture puts the count and target in an always-on-top
  window with **no permission prompt and no native code**. The affordance is
  feature-gated: on a browser without the API there is no button at all rather
  than a dead one, and a refused request is reported instead of swallowed. The
  window follows the count, the target and the phrase from the state
  subscription — it is never a second, stale source of truth — and one control
  both opens and closes it.
- **The counter's feel is now a test, not a screenshot review.** A feel nobody
  re-checks is a feel that quietly regresses: `tests/counter-feel.test.js` pins
  the numeral's scale and weight, the ring's weight and halo, the punch, the
  bloom, the reduced-motion behaviour and the single-source geometry. The 200%
  type spec now walks the tasbih route too, since the dial grew.

## v5.17.14 — The audio-resume spec now waits on the app's own signals, and the azkar.me goal is written down

- **`tests/e2e/audio-resume.spec.js` was reporting a product failure that was
  not one.** It polled a raw `.dl-cell--done` count against a 120s budget and
  failed at 86/114 under parallel e2e workers. Two intermediate fixes were also
  wrong, and the reasons are now in the spec so nobody repeats them: the view
  renders **two** `.panel--dl` grids by design (114 surah files + 114 verse
  packs, so `.dl-cell` is 228 and is not the surah total), and the resume banner
  clears when the batch **starts** — it is suppressed by `batchRunning` — so it
  is not a completion signal. The spec now waits on the two signals the app
  actually owns: the Stop button appearing while a batch runs and disappearing
  when it ends, then the panel's own `114 / 114` counter. It is a stronger test
  than before (it now also proves a running batch can be stopped) and takes 30s
  instead of timing out at 90s.
- **The azkar.me capability-parity goal is now a written plan.**
  `docs/CAPABILITY-PARITY.md` holds a measured like-for-like comparison against
  the live site, the five things we are genuinely behind on (prayer madhab and
  manual minute offset, per-city prayer pages, native distribution, a floating
  counter, install friction), and the two we decline to copy — their
  leaderboard and their logged-in paid AI assistant — with the principle each
  refusal protects. Linked from `docs/ROADMAP.md`, `docs/OPEN-ISSUES.md` and
  `docs/PROJECT-PICTURE.md`.

## v5.17.13 — Two more stale claims closed, and the last of the "hidden" Bismillah

- **The riwaya mismatch note was already shipped and now has a test.** When the
  chosen moshaf's catalog entry states a `rewaya` that is not Hafs, the player
  says so, in both languages, naming the actual riwaya — because the on-screen
  mushaf text is Hafs. It stays silent for a Hafs voice _and_ for the 110
  catalog entries that state no riwaya at all: unknown is not a mismatch, and
  guessing one would be inventing religious data. `tests/recitation-honesty.test.js`
  now pins all three cases plus the data premise.
- **The last of the "hidden" Bismillah style is gone.** The preference enum had
  already dropped it, so the option was unreachable — but two views still
  branched on a state the sanitizer cannot produce, a comment still advertised
  it, and an orphaned `mushaf.bismillah_hidden` string pair sat in both
  languages. All four are removed. Whether a Bismillah appears at all is now
  solely the caller's decision, and At-Tawbah still correctly carries none. A
  legacy stored `hidden` falls back to `auto`, so nobody can be left looking at
  a textless page.

## v5.17.12 — 200% text, and the layout fixes that made it real

- **The in-app type scale can now reach 200%.** The slider stopped at 140%, so
  WCAG 1.4.4 was only reachable through browser zoom — a real failure for a
  low-vision reader, not a preference. The sanitizer clamp and the slider both
  move to 2.0. The mushaf's own scale was already wider and is untouched.
- **Raising the ceiling exposed three layout defects, which is why it was
  raised honestly rather than quietly.** At 200% the home quick-action grid
  pushed the document 98px sideways (grid tracks could not shrink below their
  min-content width), long section names spilled out of their library tiles
  instead of wrapping, a row of worship action chips refused to wrap, and a
  few pixels leaked from the library route's own scrollers. Each is fixed at
  the layer that caused it, and a new browser spec walks seven core surfaces
  at 200% on a 390px phone asserting zero document overflow — with the
  detection deliberately ignoring elements inside horizontal scrollers, since
  a chip row that scrolls is supposed to be wider than the screen.
- Two claims that audits kept reporting as open were verified by execution and
  were **already shipped**: the `http://` custom-audio gate
  (`js/services/audioCatalog.js` blocks cleartext servers outside localhost and
  LAN) and Elder Mode's first-run prompt (the onboarding "bigger text?" step
  sets Elder Mode, a 1.25× type floor, a 1.5× Arabic scale and high contrast).
  Both are now in `docs/OPEN-ISSUES.md`'s stale list with their evidence, so
  nobody spends time on them again.

## v5.17.11 — Memory, honest backup errors, and the project's own documentation

- **Backup failures now carry a code, not an English sentence.** Restoring a
  corrupt or future-version backup used to be translated by matching the English
  wording of the error — so rewording a message silently sent raw English to an
  Arabic-only reader again. `parseBackup()` now returns a stable code alongside
  the human sentence, and the UI maps that code to a translation. The sentence
  remains as a fallback for any caller that renders it directly, and an unknown
  failure degrades to the generic error rather than leaking anything.
- **The first-launch language behaviour is now pinned by execution, not by
  claim.** The OS language has been honored on a fresh install since v5.13.0;
  it had no test, and an earlier audit wrongly reported it as missing. Five
  cases now prove it: a fresh install on an Arabic OS starts in Arabic, a
  non-Arabic OS stays English, and a returning reader's explicit choice wins in
  both directions. The test runs the store in a child process, because the
  storage layer memoizes its localStorage probe at import time and an in-process
  fake would silently prove nothing.
- **The project gained a memory, and the documentation set it was missing.**
  `MEMORY.md` records what this project is, the decisions that are settled, and
  the traps — so a compacted or lost session can recover from disk instead of
  from conversation history. `AGENTS.md` states the machine-readable contract
  for any agent or new maintainer. `docs/PROJECT-PICTURE.md` holds the macro and
  micro picture of who the product is for and what was asked for and rejected.
- **New documentation, in the shapes the ecosystem actually uses:** an ADR
  directory recording the seven decisions that are expensive to reverse (zero
  account, no build step, the content lens, one voice two engines, honest
  absence, opt-in pagination, AI-assistance disclosure), plus `docs/OPEN-ISSUES.md`
  (what is open and what it is blocked on), `docs/RUNBOOK.md` (releasing,
  rollback, data-corruption repair, reset paths), `docs/TESTING.md`,
  `docs/STYLEGUIDE.md`, `docs/ACCESSIBILITY.md`, `docs/PERFORMANCE.md`,
  `docs/DATA-SCHEMA.md`, `docs/GLOSSARY.md`, `docs/ROADMAP.md`, `CHANGELOG.md`,
  `CODE_OF_CONDUCT.md`, `SUPPORT.md`, and `CLAUDE.md` as a pointer to the
  vendor-neutral rules.

## v5.17.10 — Fix wave: scripture repair, Tajweed coherence, content authority, honest states

- **Scripture integrity (P0):** repairs all 180 U+FFFD characters that had crept into 14 Mushaf pages (recovered from the bundled Qur'an corpus with per-verse alignment checks) and 75 Hadeeth rows (recovered from `fawazahmed0/hadith-api`, cross-checked against sunnah.com, with English-number alignment verified first). Adds `scripts/repair-scripted-text.mjs` plus a permanent gate that no shipped scripture carries a replacement or control character and that every `.gz` twin matches its plain JSON byte for byte.
- **Tajweed coherence:** one shared rule-family/colour registry across the Mushaf, the classic reader, the ayah detail modal, the legend, settings and practice/lesson swatches; the previously unreachable plain-text rules are now toggleable; rule classification reads the raw token (diacritics included) and overlap is resolved deterministically instead of double-wrapping; the corpus Basmalah and its variants share one constant; the dead `tajweedInspector` setting is removed rather than silently ignored.
- **Content authority:** banner and section reordering now spans the bundled/custom boundary (a custom library can move, and the last bundled banner can move below it); the card editor merges onto the stored item, so an English-only edit no longer blanks the Arabic translation, virtues or custom grade nor drops audio/notes/tags; the library view no longer re-sorts a user's chosen order away; per-library field toggles cascade to Home, Moods, Favorites, Collections and Focus.
- **Honest states:** a missing gold price no longer reports "no zakat due"; prayer and ambient countdowns run on one lifecycle with real data; the offline Words inventory includes word-study, dictionary and root-meaning files; audio cache eviction is awaited and reported instead of silently dropping downloads; the "verse of the day" pool is an allowlist of devotional libraries, so study and calendar material can never leak onto the card.
- **Interactions:** Focus ignores keys and swipes aimed at interactive controls, overlays and modals; one tap is one haptic and one tick; the ripple lands on the effective count target; cards opt out of double-tap zoom and text selection; reduced motion restores the reader and Mushaf idle controls; the certificate never claims "0 surahs" and counts a page only after it loads.
- **Search:** `highlightMatch` matches the original text in one pass, so multi-term queries can no longer match the `<mark>` markup they generated a moment earlier (and regex metacharacters are literal).
- **Labels:** per-item review wording and the corpus-level AI-assistance disclosure are honest about what the data can and cannot prove, in `data/SOURCES.md`, `CREDITS.md` and About.

## v5.17.9 — Word-study UX and data-integrity hardening

- Rebuilds the word-study card around a visible header, verse context, ordered sections, consolidated source disclosure, and a responsive sticky continuation action.
- Routes materialized word-study fields through shared provenance resolvers, rejects incomplete citations as authoritative, preserves tafsir metadata, and exposes bilingual source/review labels.
- Makes cold word-study opens visible and stale-open-safe, shares word text separately from ayah images, keeps bookmark state live, and distinguishes empty tafsir from loading.
- Fills trusted city coordinates and curated city timezones on selection, cancels stale Mushaf turns, shares in-flight page/data promises, and wipes all app IDB stores during reset.
- Keeps a fullscreen exit reachable while idle, makes search pagination Back/Forward-safe, removes the redundant Settings TOC, adds a saved-word browser, and exposes find-word/review Tajweed practice.
- Adds a versioned full/seed data manifest with sorted SHA-256 and byte-size integrity checks, plus localized pending-scholarly-review warnings that never expose internal review notes.

## v5.17.8 — Inquisition fix-plan implementation (identity, overflow, grades, lazy views)

Implements the 2026-09-22 Inquisition fix plan (`PLAN-Nur-al-Dhikr-Inquisition-Fix-Plan-2026-09-22.md`):

- Identity (SYM-01): the PWA icon family (all PNG sizes, maskables,
  apple-touch, favicon) is regenerated as the plain rayah banner on the
  product teal — zero crescent/star identity instances remain. The live
  topbar brand routes through the canonical `rayah` glyph instead of the
  inline crescent SVG. Pinned by `tests/symbols.test.js`. Scholarly
  sign-off on the replacement family is still recorded as a handoff.
- Startup (PERF-01A): statistics, audio manager and roots join the lazy
  view registry (renderer-only, no handler edges); the Mushaf-only
  AmiriQuran font no longer preloads on cold Home. Pinned by
  `tests/startup-budget.test.js`. Full data-library deferral (PERF-01B)
  and the bilingual-dictionary tradeoff stay tracked follow-ups.
- Tablet (BIF-01): `#main` stops combining `width:100%` with the desktop
  rail margin in RTL — it is now the flexing content region
  (`flex:1, width:auto, min-width:0`), killing the 93px overflow at
  1024×768. Pinned by the RTL geometry spec in
  `tests/e2e/routes-extended.spec.js`.
- Touch targets (A11Y-01): the `::after` hit-area aprons become an
  explicit contract (static gate) plus a pointer-level
  `elementFromPoint` e2e (`tests/e2e/touch-targets.spec.js`).
- Volume (VOL-01): the owner-reported slider path is locked by
  `tests/e2e/volume-regression.spec.js` (55 → native 0.55 → persisted
  → reload restores 55).
- Grades (DATA-01/02): `js/domain/grades.js` renders chips only for
  source-backed values (`Unknown` stays visibly "Unverified",
  missing/malformed render nothing); `audit-content.mjs` gains a
  machine-readable per-field provenance report with N/A separated.
- Data payload (PERF-01B): `compressedDownloads` defaults ON for fresh
  installs (stored opt-outs untouched, plain-JSON fallback intact).
  Measured cold Home in real Chromium: 225 resources / 3.28MB total vs
  the 5.24MB evidence baseline; the 9 catalog libraries land as
  458KB gzipped instead of 2.32MB raw. The 500KB budget stays a
  documented exception — reaching it needs per-route library deferral,
  which conflicts with Home's full-corpus verse-of-day and instant
  search index by current product design.
- Route CSS (PERF-02-ARCH): `quran.css` (~100KB, zero matching rules
  outside mushaf/reader/roots, probed live) loads on first route entry
  via the renderer instead of every cold boot; `desktop.css` is
  media-gated to ≥960px (all its rules already are). Measured cold
  Home: 3.28 → 3.18MB. Deeper JS code-splitting needs a bundler and
  stays an architectural exception.
- Resumable audio batches (NF03-RESUME): Download All persists its
  pending queue to a new IDB store before work starts and rewrites it
  per finished file; reloads rehydrate an honest Resume/Dismiss prompt
  on the Audio view. Quota stops stay resumable; moshaf wipe clears
  the queue.
- Study Mode surface (NF01-STUDY): the ayah study modal is explicitly
  named and gains a Hadith section of honest text matches (scope line
  always visible, results link to the browser). No semantic
  ayah↔hadith relation is claimed — no such source dataset exists.
- Offline/cross-engine (OFFLINE-01/CROSS-01): transition-matrix e2e plus
  a `CROSS_ENGINE=1` Chromium/Firefox/WebKit CI job over the
  prioritized suite.
- Icons (KILL-01): `moon` removed after the audit learned to follow
  `iconName:` descriptors, row-builder positionals and FIELD_ICONS —
  which proved `feather`/`gauge` live (journal row, translit toggle,
  mushaf speed row), so they stay.
- Delights (GROWTH-01): calm checklist completion, one-shot
  return-to-recitation, per-ayah study-tab memory — each independently
  removable, ≤50 lines, no gamified or symbolic chrome.

## v5.17.7 — every crescent out (rayah / star / bed take over)

The last crescent-moon glyphs leave the UI: night prayers (Isha,
tahajjud, witr, qiyam, odd nights) and the night-phase hero use
`star`; the sleep timer everywhere uses `bed`; the suhoor row uses
`utensils`; the dark-mode toggle uses `star`; the ambient feature
uses `rayah`; the icon picker no longer offers the crescent; the two
remaining `moon`-iconed collections (`munajat`, `the-other-side`)
move to `star`/`sunset`. The glyph stays defined but unreferenced
(the kids `moon` level id is data-only and renders a trophy).

## v5.17.6 — Shahada banner atop Home

A black Rayah-style strip carrying the fixed Arabic wording (never
translated — it is quoted, not UI chrome) now opens the Home view,
above the hero. Ivory Amiri between two thin gold rules;
theme-independent and ~15:1 by construction, so no high-contrast
override needed. The wording, RTL/Lang/role contract is pinned by
`tests/shahada-banner.test.js`.

## v5.17.5 — verse-volume slider actually works + rayah banner (no crescent-as-symbol)

From a real-device report: the recitation console's loudness slider
rendered but did nothing. Root cause was a dropped merge —
`quranAudio.js` exported its `changeHandlers` (the `[data-bind=
"recite-volume"]` commit arm) but `events.js` never spread it into the
change registry, so release events matched nothing. The arm is merged
now, and the slider also live-applies through a new input arm
(`surahPlayback.setBaseVolume`, zero dispatches per tick — the thumb
can't die to a mid-drag re-render), while persistence still waits for
release. The registry gate pins the new counts (36 change + 18 input)
and a new completeness test compares every feature module's exports
against the merged registries by selector, so a dropped merge fails
loudly instead of shipping another dead control.

Also: the crescent moon no longer poses as a religious symbol. A new
`rayah` glyph (the plain banner of the Prophet's ﷺ time) replaces it
on identity surfaces — Ramadan nav/tile/banner, Jumu'ah preset,
Sunnah tiles, khatma preset, streak badges (now `flame`), zakat
silver (now `coins`) — while literal-night usages (Isha, tahajjud/
witr, suhoor, sleep timer, dark mode) keep the moon.

## v5.17.4 — real-phone touch pass (paper drag, touch identity, input zoom)

From real-phone reports. The Mushaf swipe now feels like paper: the book
follows the finger mid-pull (translate + lift, direct style writes, no
store churn) and either commits into the turn or eases back onto the
spine — gated by the flip-animation pref and reduced-motion, and skipped
for pinches, guarded controls and vertical scrolls. Touch identity is
tracked end to end (a `touchcancel` disarms everything): a second
finger's touchend can no longer measure against the first finger's start,
killing a whole class of phantom page turns and minimizes. The compass
gate resolves true where no prompt exists (Android proceeds to start
instead of showing a false "denied"). Form fields return to 16px so iOS
stops auto-zooming on focus. Gates: `mushaf-drag.spec.js` (follow +
snap-back), touch-identity and drag-math unit tests, compass gate tests.

## v5.17.3 — axe-clean accessibility (zero critical/serious)

Runs axe-core over home / reader / mushaf / settings in light AND dark
themes and fixes everything it found — no rule disabled, no exclusion
list. The three programmatic file inputs gain a named region and the
same labels as the buttons that drive them (re-localized every render);
the nav keeps a single "Main navigation" landmark (the inner wrappers
are plain divs now — nested same-name navs failed `landmark-unique`);
light `--color-primary-text` darkens 78% toward ink so it holds ≥5.8:1
on surface and on its own active tint for every bundled palette
(raw sat at ~4.50:1, an axe fail). New gates: `tests/e2e/a11y-axe.spec.js`
(axe + keyboard traversal, both themes) in the CI `accessibility` job,
and a token test pinning tinted-surface contrast per palette.

## v5.17.2 — Omniview audit follow-ups (provenance, storage, evidence CI)

Builds the six audit proposals into the tree: a lexical provenance schema
(`data/lexical-provenance-schema.json`) pinning cited-vs-honestly-unknown
semantics for lemma/root tiers without fabricating scholarship; an explicit
"clear downloaded study data" budget action beside the storage meter (text
corpora only — audio and settings survive); a bounded service-worker cache
migration (3,000-entry cap, old caches dropped only after a complete copy);
a 4-viewport browser-evidence CI matrix with retained traces; accessibility
static budget gates (44px targets, visible focus, reduced-motion, RTL,
named player controls); and a 7-scenario chaos harness with no-white-screen
and no-data-loss invariants. Includes the audit's own FIX-01 (truthful
audio fallback manifest) and FIX-02 (SOURCES dedup).

First matrix run (112 browser tests: 28 specs × 4 viewports) paid for
itself immediately: in the 960–~1250px band the docked player bar slid
under the 264px side rail — `components.css`'s `inset-inline` shorthand
was clobbering `layout.css`'s rail offset — so the rail's links swallowed
the bar's own mode chips on tablet (desktop survived only by accident of
max-width centering). The bar now keeps explicit rail-clearing longhands
plus the collapsed-rail variant. Spec-side: the long-press probe centers
its card before holding (a card resting under the phone bottom nav takes
the press on the nav, correctly ignored — no sheet), three fixed-sleep
flows (`follow`, `lazy-sheets`, `player-chrome`) take `test.slow()` under
matrix load, and the matrix web server is threaded (`ThreadingHTTPServer`:
single-threaded `http.server` serialized 4 parallel browsers into phone
timeouts). Matrix: **112/112 green**; unit **1883/0**; lint clean.

## v5.17.1 — Quran corpus, study coverage, Tajweed and offline search

Completes the Quran word-study layer across all 77,429 token rows using compact
per-ayah study files plus shared lemma/root tiers, including contextual meaning,
i'rab, antonym state, English glosses, and root etymology/ Qur'anic bridges.
Adds full-corpus Tajweed quiz pools with three levels, restores the exact
32:15 sajdah annotation and configurable Madd double underlines, adds ayah-first
audio provider/fallback metadata, and upgrades search with uncapped counts,
pagination/load-more state, and Quran/Hadith/Azkar breakdowns. The seed build
is now a deliberately small 3-surah/15-adhkar/sample-hadith offline fixture.

## v5.17.0 — Inquisition round 5 (city directory)

The one-tap directory grows 29→72 cities with EN+AR names, grouped by
6 regions in native disclosures (zero JS, zero state — works for the
grandmother on first paint), pinned by a coordinate-validity gate plus a
real-browser smoke pin (6 groups, 72 city buttons, disclosure opens).
Hijri ±1d disclaimer verified prominent; prayer estimate disclaimers
hold. No commits by the inquisitor — owner commits.

## v5.16.0 — Inquisition round 4 (e2e proof, wider cities)

First real-browser e2e evidence: 26/27 Chromium (the 1 timeout is a
CDN-dependent flake — the pristine baseline fails identically, proven
via stash). City presets 12→29 across the Muslim world. Prayer alert
reliability row verified wired per-mode (triggers/tab/permission +
calendar fallback); the native bridge itself stays impossible in a
static PWA and is documented as such. No commits by the inquisitor —
owner commits.

## v5.15.0 — Inquisition round 3 (kills, volume, wizard, honesty)

Killed 13 dead exports + the unwired IDB backend + an orphaned traveler
arm (~200 lines net-negative). Verse sessions gain a loudness slider in
the shared console (all hosts; yields under sleep, persists
`audio.verseVolume`). Wizard grows language-first + elder-comfort steps
(8 steps; OS-detect from v5.13 still covers non-wizard entry). Kids stars
gain a danger-confirmed parent wipe; milestone-eve lantern delight;
streak badges swap flame→moon. Data honesty: asma-003 0:00 typo gone,
SOURCES no longer cites a nonexistent build script, `npm run measure`
prints canonical numbers. Report-evidence disputes documented below —
several verdicts don't reproduce on the full tree (slim-zip artifacts).
No commits by the inquisitor — owner commits.

## v5.14.0 — Inquisition round 2 (budget, city, discovery, parent gate)

Audio budget slider (50–500 MiB) in the Offline library with live cap +
eviction; 12 one-tap city presets with honest approximate-times label;
palette now lists all 9 orphan leaf views (mood, focus, quiz, roots,
mutashabihat, journal, certificate, ambient, editor); kids exit gains an
arithmetic parent gate after the 2s hold; hosting honesty (local server
is dev-only) in README + launchers. .ics export verified pre-existing.
No commits by the inquisitor — owner commits.

## v5.13.0 — Omniview inquisition fixes (trust, adab, honesty)

Small, safe, tested. Language: fresh installs honor the OS language once
(Arabic-detected → Arabic chrome). Backup errors speak the reader's
language (no more English leak on corrupt restores). Kids sandbox refuses
imports. Reset-all now wipes IDB + auto-backup keys (no more partial
wipe). Custom audio servers require https (localhost/LAN exempt).
Audio cache cap 2 GiB → 200 MiB. Echo + infinite-repeat dead cell closed
at the engine layer. Bismillah `hidden` retired (no textless mushaf).
Streak copy de-gamified, patience prompt de-shamed, wudu adab line added,
Sunni scope disclosed, tab title follows language switches, loop chip
gains its own glyph, speed chip names its next rung, blank-page empty
state invites instead of hinting, first-seed delight, orphan-action
registry test, corpus manifest. No commits by the inquisitor — owner
commits.

## v5.12.1 — UI/UX design audit fixes (touch, glass, empty states, numerals)

Token/CSS-only sweep from the design audit, no layout-contract breaks. Touch:
palette rows 39→44px, juz cells gain a 44px hit box (32px visual kept),
player chips reach 44px effective, `button.toggle-row` regains its 52px
floor, mushaf nav buttons stop squeezing to 41px, console stack gaps rise
to the 8px inter-target floor, manage actions 36→44px. Glass: library-jump
gains the missing `-webkit-` prefix; the reduced-transparency kill now
covers bottomnav, focus bar, reader bars and library-jump (opaque tokens).
Scroll: library-jump and the ≤390px mushaf bars gain the 28px scroll-fade
hint. Type: `--radius-badge` replaces the 11–16px icon-radius ladder;
`--glow-primary` merges the twin play glows; dead `.icon-btn--recite-follow`
rule removed; action-sheet icon padding 9→8px. Numerals: qibla distance,
calendar and review dates pin `numberingSystem: 'latn'` (engine-independent
digits matching the Western chrome). Empty states: focus dead-id migrates
to the shared recovery block; collections, bookmarks, review, stats and
mutashabihat empties gain CTAs from existing handlers/views/keys. Motion:
idle auto-fade holds steady under reduced-motion; components/layout carry
an explicit motion-contract note. Forced-colors: switch, slider, dial and
progress fills gain system-color edges. Hadith retry confirmed already
present (no change). Gates: unit + lint green, shell re-stamped.

## v5.12.0 — one player every side: minimize, idle fade, shortcuts, from-here

Minimize: the player bar (both engines) collapses to a slim pill via the
chevron next to quit — audio and position untouched, restore beside it.
The fullscreen consoles carry the same chevron (swipe-down works on the
whole glass cluster), and the pill overlays the book while the rows yield,
so exactly one chrome shows. Swipe-down on the bar minimizes instead of
killing playback (an accidental scroll used to stop the audio; quitting
stays on the explicit X). Idle fade: while any audio plays, 5s without
pointer/key/touch activity fades the bar to a ghost (opacity only — still
operable, screen-reader visible); any activity wakes it. The minimized
pill never fades.

Unify: the consoles were already one builder over one engine — the hole
was the whole-surah player going control-less in mushaf fullscreen (bar
hidden, verse console absent), which read as "the player is gone" and
ended in restarts-from-1. Fullscreen now renders a file transport row in
the same glass host (play/pause, prev/next, quit) with the engine
untouched. Reader-immersive already kept its bar; verified, unchanged.

From-here: the mushaf ayah sheet gains "Recite from here" (continuous
session from the tapped ayah); the multi-surah picker and the fullscreen
play button start from the page's first ayah when it opens mid-surah
(same-surah stop toggle preserved — an active row still stops). The
classic reader already had it via long-press; the windowed surah banner
keeps whole-surah-from-1, matching its label.

Shortcuts (audio context only — quiet reading keeps Space/arrows for
scroll): Space play/pause, M mute (element.muted, so the sleep fade never
fights it; chip in both bars with aria-keyshortcuts), ArrowLeft/Right
next/prev ayah in verse mode (matching the console's chevron icons) and
∓10s seek in file mode. Typing, buttons, sliders, and modifier chords
are never hijacked. Honest remainder: mode toggles still restart (file
bytes carry no ayah offsets — physics, not UI).

Hostile-review hardening (same version, uncommitted tree): verse sleep
expiry now pauses keeping position like the file engine (one
mornings-after contract, pinned by a fake-driver session test); verse
stop() clears an armed timer so no fade leaks onto the next session;
echo refuses ∞-repeat with the reason said out loud (chip note +
handler guard + auto-off when repeat reaches ∞); blocked play()
reverts the optimistic icon at all four toggle sites; the 5s ghost
yields to fullscreen/immersive sessions (single wake path) and rests at
0.55 instead of 0.08; fs idle chrome rests at 0.12 instead of invisible;
the immersive bar gains minimize (yielding to the pill like the mushaf
console); minimize buttons advertise swipe-down; ayah/word/drill arrows
yield the player drills while focused (no more double action); mushaf
ayahs and drill units rove to one tab stop per page/round; focused
buttons survive re-renders via unique-match focus salvage; the skip link
localizes on boot; book-order chevrons announce their rule in LTR
accessible names; tasbih restore rejects non-slug ids (second XSS layer
behind the render escapes); 46 collection-inferred "Sahih" grades
(28 duas + 18 adhkar, no per-hadith citation) withdrawn to Unknown with
provenance kept in reference.source.

## v5.11.0 — tap-parallel warm, word-follow spike verdict, gap telemetry

A. Session-start latency: the lookahead horizon now warms at tap time,
concurrent with the first ayah's own storage probe, instead of waiting
behind it — same URLs, same caps, pool-deduped, so quota is unchanged
(1 audible file + at most 5 warms still fits the ~6-connection window).
The audible first ayah itself is never pre-warmed: when a stored Blob
exists that fetch would be pure waste. Physics floor stands: nothing
can buffer before the tap.

B. Word-level follow spike (run: `node scripts/spike-word-follow.mjs`):
FEASIBLE with conditions — probed live with no credentials anywhere.
api.quran.com serves words + per-word segments keyless and CORS-open;
audio.qurancdn.com serves the matching ayah files keyless, CORS-open,
and Range-capable (audio.quran.com itself is dead — the cdn host is the
live one). All 12 sampled recitations carry segments with 4/4 coverage
on spot-checked verses, overlapping verse voices (Sudais, Shatri,
Rifai, Husary, Alafasy, Minshawi, Shuraym). Conditions, all load-bearing:
play quran.com files ONLY with their own segments (timings are measured
per encoding and must never drive another CDN's bytes), restrict voices
to segment-backed recitations, and bundle segments as a data pack
(offline-first) instead of hot-querying thousands of endpoints. The old
"auth wall" premise is retired — verified, not assumed.

C. Follow-gap telemetry (Statistics, opt-in, local-only): per-advance
dispatch → follow-effect delay, effect cost, and longtask counts, with
p50/p95 readouts and one-tap clear. Default off, samples never leave
the device. The gap stops at effect execution, not paint — stated in
the panel, not oversold.

## v5.10.9 — console layout repair, 16 ayah voices, unified 312 picker

Three screenshot-driven repairs: (1) the consoles were horizontal flex
rows, squeezing transport + settings side by side into a giant blob —
all three hosts are vertical bottom sheets now, with the settings list
scrolling inside; (2) word labels are gone everywhere (shape carries
meaning, aria keeps announcing; voice names and ×N counts stay as
identity); (3) the verse bar's ayah counter no longer duplicates the
header counter. Voices grow 10 → 16 from the CDN's own census
(Minshawi, Shatri, Shuraym, Hani Rifai, Sowaid, Basfar — every rung +
mirror HEAD-verified), with per-voice bitrate ladders that skip missing
rungs instead of burning doomed fetches. The voice picker unifies both
worlds: 16 ayah voices plus a live-searched 312-moshaf section —
picking either flips the playback mode to match, announced by toast,
so no pick ever looks broken.

## v5.10.8 — follow-along proof + file-mode honesty

Page-turn follow verified live in-browser (reciting across 2:5 → 2:6
flips mushaf page 2 → 3, zero errors) and pinned by a dedicated e2e
spec so it can never silently regress. Clarified for the surah default:
the whole-surah file carries no ayah position by construction, so
follow/highlight/repeat/compare need ayah mode — the file bar says so
in one line with the toggle right beside it. Study actions (recite
buttons, ranges, drills) always use the ayah engine regardless of the
pref, so follow keeps working wherever study happens.

## v5.10.7 — surah-file default, honest file notes, Sadaf player port,

prime-to-parked, k∈[2,8]

Default playback is now the whole-surah file (one request, zero
handoffs, every voice) with ayah mode one toggle tap away. Timing
investigation, stated plainly: NO keyless source publishes per-ayah
offsets inside surah files (mp3quran/quranicaudio/islamic.network all
checked; quran.com word-segments exist only for ayah-files of its own
recitations) — so file mode ships without fake highlighting, with an
honest one-line note pointing to ayah mode, and nothing ayah-dependent
breaks (study actions route to the ayah engine by design). Buffering:
lookahead seed 5 / bounds [2,8] (a bigger stampede would throttle the
audible file on ~6-connection pools), plus prime-to-parked playback —
buffered spares play muted and park at ~0, so promotion resumes a hot
pipeline (iOS falls back to buffered swap silently). Player visuals
ported from the winning external design onto the real DOM/tokens
(monochrome transport, file-bar wrap fix, seek restyle, focus rings),
and fullscreen consoles go icon-only (shape carries meaning).

## v5.10.6 — starve-proof buffering (k=5, fast-up, prune), audio-first dispatch, pro console

The remaining pause lived where measurement said: a sagging network
outruns any fixed lookahead, and each handoff paid for two full renders
plus a render-blocked play call. Now: the buffer pool holds up to 5
with a k=5 startup seed (a continuing session consumes every warmed
file — zero waste on the common path); a swap-miss fast-forwards the
estimator immediately (one stall max, never a series) while quiet
networks glide back down via k-smoothing; skips prune stale prefetches
instead of burning quota. Every advance path dispatches audio before
the store mirror, and the mirror carries the card key in the same
batch — one render per ayah, deterministic. Proven under a forced
12s-per-file delay on short ayahs: gaps [3,3,2]ms with exactly 4
requests for 4 ayahs (before: a 12.3s stall). The player console is
restructured professionally everywhere at once (shared builder):
transport row (prev, hero play/pause, stop, next, speed, reciter) plus
a "more" overflow for repeat/loop/follow/listen/echo/sleep/compare/
file-mode — same actions, same handlers, zero dead buttons.

## v5.10.5 — playback-mode toggle (ayah engine vs surah file) + smoothed lookahead

Two ways to listen, one visible toggle in both players: ayah-by-ayah
(highlight follow, repeat, compare, echo) or one continuous file per
surah (zero gaps by construction, 312 voices). Plain play taps follow
the persisted pref; study actions always use the ayah engine, which is
also what ayah-level features require. Research verdict: this mirrors
the industry (Quran.com documents chapter-vs-verse audio for exactly
these two use cases; the Flutter quran_audio package runs both behind
one facade). Lookahead k now smooths directly — k = α·k_prev +
(1−α)·target — so band-edge noise glides instead of flapping; cap
stays 3 (measured sufficient to a 12s/file regime; each unit is real
quota).

## v5.10.4 — gapless recitation: pooled spares, adaptive lookahead, single-ayah mirrors

Continuous recitation paused between ayahs because every handoff
re-fetched, re-decoded and re-spun the pipeline on one shared element.
The driver now alternates pooled elements: while one ayah plays, upcoming
ayahs buffer on spares, and each advance swaps onto already-loaded media
(volume/rate carried over). The next file is requested before the store
dispatch + re-render, so heavy views can never hold the handoff hostage.
Lookahead depth adapts to measured throughput — no synthetic speed test,
no quota waste: every preload reports its preload-start → canplaythrough
time (zero extra requests), folded into an EWMA against played ayah
durations; fast networks settle at k=1, slow ones hold up to 3 files
ahead (pool cap 3, dropped on stop). Proven under a forced 12s-per-file
delay on short ayahs: gaps stay ~60–110ms with exactly 4 requests for 4
ayahs (before: a 12.3s stall). Same surgery fixes the per-ayah استماع
button: it played ONE primary-CDN URL with no fallback, so one hiccup
meant «تعذّر التشغيل» — it now walks the full mirror chain silently,
toasting only when every mirror is spent.

## v5.10.2 — reciter playback repairs: verse-pack CORS rescue, catalog triage, one-button cells

Streaming always worked (<audio> needs no CORS) but every verse-pack
download failed: the primary verse CDN sends no Access-Control-Allow-Origin,
so fetch() died with net::ERR_FAILED on all 6,236 files. Downloads now
lead with the CORS-open EveryAyah mirror (same files, verified ACAO: *),
proven live in-browser (5×200, zero failures, pack cell flips to done).
Full-catalog triage: all 314 moshaf servers HEAD-checked — 309 alive, 3
repaired (Jibreen subpath, Saad/Ghamdi remapped to live mp3quran servers),
2 dead rows removed (312 total). Audio-grid cells are one-button now: a
downloaded surah plays on tap (unified toggle, offline-blob aware) with
delete kept as the trailing button.

## v5.10.1 — depth upgrades: kids, nightstand, prayer, statistics, hadith, tajweed

Six thin areas grow real depth. Kids mode gains levels (Seed → Crown),
a surah-name memory quiz that earns stars, per-surah stars, and a parent
dashboard (week chart + per-surah breakdown). The nightstand adds three
display modes (countdown, verse of the day, rotating dhikr) switched
in place. Prayer rows show iqama waits (display-only, per fard prayer)
and the log panel adds 30-day insights (completion rate, jamaah share,
most-missed prayer, best streak). Statistics gains a daily-goal panel,
streak coaching toward 7/30/100/365-day milestones, and a most-read
surahs breakdown derived from the mushaf page log. Hadith cards show
narrator lines (75% corpus coverage, high-confidence patterns only —
ambiguous rows show none rather than a wrong name), enriched grade chips
when graded files ship, and every book carries a grade-vocabulary guide.
Tajweed drill rows gain Learn buttons opening guided lessons: the rule's
definition plus pool-drawn example ayahs that deep-link into the reader.

## v5.10.0 — ayah-audio mirrors, tajweed-underline toggle, search pagination

P0 Mushaf/audio: the verse engine walks an ordered mirror chain per ayah
(128kbps primary → 64kbps same-CDN mirror → EveryAyah for mapped voices)
before admitting failure, with per-hop logging; full-surah fallback stays
a caller decision after every ayah mirror is spent. New persisted
`mushafPrefs.tajweedUnderlines` toggle (Settings → Study aids) drops the
per-family tajweed underlines for a plain page while keeping colors; the
dotted word-tap underline now yields via CSS `:has()` wherever a tajweed
underline already marks the word. The surah banner gains SVG diamond
flank ornaments, a double-ruled frame and a compacted band; fullscreen
CSS now matches the layout/auto-fit no-vertical-scroll contract (manual
zoom is the sole scrolling mode); idle fullscreen bars re-reveal on
keyboard focus; narrow-phone (390px) rules keep bars, banner and tray
unclipped.

P1 search: no hard truncation — Qur'an/Tafsir/Library groups paginate via
Load More triggers with "Showing x of n" counters, counts ride the URL
(qn/tn/ln, shareable, never persisted), and a per-corpus match breakdown
(Qur'an · Tafsir · Library) heads the results. Deep-link jump +
keyword highlight behavior unchanged.

P2: Settings gains stateless section-shortcut chips (shared pin state,
smooth-scroll to top); "Practice this ayah" falls back to the nearest
same-surah ayah with marked rules instead of dead-ending; the mushaf
page store is LRU-capped at 48 docs with explicit recency order.

## v5.9.0 — manual zoom returns, merged with auto-fill + slider control

The old pinch-to-zoom is back, merged with the fill engine instead of
replacing it. Fullscreen now has two honest modes under the persisted
`mushafPrefs.autoFit` switch (default on): AUTO fills the page
(unchanged v5.6.0 engine); MANUAL hands the scale to the person and
the text column scrolls internally (the v5.2.87 contract). The first
pinch, ctrl+wheel, or slider move in fullscreen flips to manual by
itself (guarded transition, no gesture spam); the Mushaf settings
toggle flips back, and the engine re-measures on the same dispatch.
The existing text-size slider IS the zoom slider — in fullscreen it
now visibly zooms via the same takeover. Pinch/ctrl+wheel ranges and
sanitization unchanged; zoom still persists into windowed reading.

Markers 5.8.0 → 5.9.0 plus re-stamp (248 files).

## v5.8.0 — syn/ant depth, reciprocal pairs, ARCHITECTURE catch-up

Synonyms on 44 → reciprocal completion + validated pairs (antonyms
167 → 257): every symmetric relation now completes both sides, plus
hand-checked pairs (هدى↔ضلال، نار↔جنة، حي↔ميت…). Fold-duplicate
chips (باطل/باطِل) deduped across all arrays.

Docs: ARCHITECTURE.md documents the word-study data tiers (dict /
roots-meaning / grammar records), the absolute-fill engine (with its
three measured traps), and the review digest + juz milestones.
SEED-README counts corrected (dict size, roots-meaning tier, 151
test files, 1,702 tests).

Markers 5.7.0 → 5.8.0 plus re-stamp (248 files).

## v5.7.0 — full word-study coverage: every lemma, every root

Dictionary 625 → 4,763 entries (100% of corpus lemmas, 0 bad keys):
all 51 function words with grammatical explanations, ~1,100
hand-curated content senses, root-anchored transfer for inflected
forms (same root + same POS + shared English stem guard), and
root-derived senses for the long tail — composed only from covered
data, never invented. Synonyms on 44, antonyms on 167+, every
cross-reference byte-validated as a real corpus lemma. Coverage
11.6% → 100% of tapped words.

Roots 1,074 → 1,651 (100% of the index): every remaining root
grounded in its actual occurrences first, polysemy kept honest
(oath+blessings, Hud+Jews, war+prayer-niche, black+mastery).

No word taps into missing data anymore: definition always resolves
(dict → corpus gloss → root sense, structurally), i'rab from record
fields, root meaning nearly always present. Remaining honest
empties are syn/ant for words that genuinely have none recorded.

Markers 5.6.0 → 5.7.0 plus re-stamp (248 files).

## v5.6.0 — fullscreen truly fills, root meanings, review digest, juz milestones

Fullscreen fit (measured per page at 390×844, zero console errors):
the engine capped rendering at the slider default (short pages could
never grow past 1.0) and the #main→view→wrap chain never actually
filled the viewport (658px of 844px; dense pages grew the wrap to
1571px and the fitter converged on its own runaway box). Three real
fixes: (1) #main gets a definite `flex: 1 0 100dvh` + min-block 0 —
a 0% flex-basis against the content-sized #app re-inflated everything;
(2) the engine commits absolute fill, clamped [0.6, 2.2] — fullscreen
is a "fit the page" mode, the slider keeps governing windowed reading;
(3) the box is the text's own constrained clientHeight (wrap-minus-
chrome over-counted ~50px of padding), with a viewport clamp and a
one-step post-search undershoot instead of a tolerance band (which
biased every trial to the floor — scrollHeight never reads below
clientHeight). Verified: pages 1/416/604 fill 0.83 with 0px overflow.

Word study: root blocks now carry the root's core conceptual meaning
(AR+EN, e.g. branching/intertwining for ش-ج-ر) from a new curated
140-root dataset (`data/quran-roots-meaning.json`, own lazy tier +
honest empty state for uncovered roots). Dictionary 81 → 118 lemmas
(coverage 27.3% → 32.5%, syn/ant on 38/52 entries, every
cross-reference byte-validated as a real corpus lemma); floor test
stays at 80.

Roadmap gaps closed: B-1 review-due digest Home panel (hifz lapses +
quiz misses + tajweed weak rules → one count with a deep link each,
silent until anything is due, density-cap test updated); B-4 juz
milestones (reducer stamps newly-completed juz with the day, Track
panel blooms fresh ones once and counts the rest — "Juz X of 30");
B-3 chunk-persistent corpus builds (each 24-wide chunk lands in the
reader cache, so interrupted builds resume instead of re-scanning;
tafsir already did this); B-5 offline heatmap PNG export (canvas
redraw, theme-sampled colors, static fallback); R-3 sajdah-accent
regression spec across all four typefaces with archived screenshots.

Markers 5.5.0 → 5.6.0 plus re-stamp (248 files).

## v5.5.0 — rectangle banner, live Bismillah, word-study truthfulness

Surah banner (measured, not guessed): was 313×78px = 1.38 text lines
at 390px with the frame inheriting the page font (ballooning further
at high scales). Now a decoupled slim rectangle — 313×40px = 0.71
lines, aspect 7.7:1 at default, capped with the band so it budgets
~1 line at any scale. Slim 2px cartouche, compact rhythm, full-width
hairline band kept. Pinned by CSS tests.

Bismillah is live quranic text: both readers render the four words
through `renderAyahWords` (tappable, tajweed-colored, one tab stop),
sized and spaced exactly like the surrounding text (Mushaf: page
size/rhythm; classic: ayah-card size/rhythm — Madinah 1.12em exception
removed). Taps carry `data-ayah="0"` and redirect onto the real 1:1
grammar records — identical words, genuine i'rab/sarf/root, nothing
invented. No new study plumbing; the popup ref honestly reads 1:1.

Word study: (1) the i'rab line ignored the record `subtype`, printing
coarse "Noun" for proper nouns, participles, verbal nouns and missing
adjectives — now subtype-first with the `adj` flag, same precedence
as the grammar summary (which also let the popup drop its duplicated
summary line). Particles/pronouns/particles-of-certainty etc. all read
correctly now. (2) The syn/ant block mislabeled "Meanings" (المعاني)
next to "Definition" (المعنى) — now "Synonyms & Antonyms /
المرادفات والأضداد" with مرادفات/أضداد sub-labels; antonyms render
whenever the entry has them (34 of 81 entries do). (3) The corpus
gloss fallback was suppressed in Arabic, leaving Definition
permanently empty for uncovered words — renders in both languages
now. (4) Dictionary 54 → 81 curated lemmas (top corpus-frequency
content words: اللَّه، قال، رب، جعل…), every syn/ant validated as a
real corpus lemma, every key byte-matched to the Uthmani lemma order;
hit rate 11.6% → 27.3%, floor pinned at 80. Remaining emptiness is
honest: function words and rare lemmas have no entry, and the popup
says so per block.

Markers 5.4.0 → 5.5.0 plus re-stamp (248 files).

## v5.4.0 — unification: v5.3.0-audit P0 × v5.2.89 local work, best of each

Two lines of work unified with no bias — every contested feature
measured against the other implementation and the winner taken:

Word study (audit wins): the popup renders four labeled blocks —
definition (dict AR+EN, corpus-gloss fallback), synonyms/antonyms,
root (count + occurrences + #/roots deep link), i'rab (one line
composed ONLY from structured grammar fields via `wordIrabLine`) —
each with an honest dashed empty state. The UP-01 legacy
`word-study__meanings` anchor rides the definition block only with
real dict content. `wordStudy.noMeanings` retires into the four
`*Data` keys (EN+AR parity-gated).

Orthography (audit wins, two fixes): ornament tokens classify into
three visual families (`ornamentTokenKind`: sajdah ۩ gold / hizb ۞
primary-tint / waqf small soft-gold, forced-colors fallbacks) with a
marks legend in Mushaf settings — kept ALONGSIDE the v5.2.89 waqf
stop-meaning legend (different information, both print reference).
The sajdah accent is the printed over-word line (`::before`), matched
harakat-folded (`matchesAccentWord`) — with the fold widened for the
full-corpus rasm (small-high madda U+06E4 et al.), which the audit's
seed-only run never met, and default 32:15 scoping restored inside
`renderAyahWords` so the classic reader keeps the accent the audit
port dropped. Per-typeface line floors + ligature fixes land as
audited; `flex-wrap` on the root head stays (audit dropped it —
regression). The v5.2.86 `isSajdaWord`/`qword--sajda` retires;
`CLASSIFY_MEMO_CAP` stays (audit dropped the bound — defense in
depth, test-pinned).

Auto-fit (audit wins): `js/app/autoFit.js` replaces the v5.2.87
dispatch engine (`readerFit.js` deleted): effective scale =
min(userScale, fitScale) committed as `--mushaf-fit-scale`, so the
engine can never rewrite the person's own slider again; fullscreen
is truly no-scroll (flex column, `touch-action: pan-x`). The 0.6–2.2
clamp, SEARCH-exit bulk abort (now owner-aware: SEARCH and
MUTASHABIHAT share the corpus build), tier-log hygiene, retry
cooldowns, window-scroller restoration, library jump chips and the
category FAB all stay — local wins, untouched.

Tajweed drills (audit wins, pool corrected): 5-question rounds with
HUD + streak, end-of-round summary, persisted weak-rule memory
(`tajweedMissRecords`, same {m,l}/200-cap/sanitizer as the 99-names
quiz) with most-missed-first Review, derived level badges
(Learning/Steady/Strong). Two audit bugs fixed in port:
`practice-this-ayah` gains `mode:'single'` (+results/roundStreak
shape, so check/advance never branch on undefined) and the reducer
skips the weak map for non-rule ids ('mixed'/'review' would have
polluted it). DATA CORRECTION: the v5.2.86 pool's tafkhim (21/25)
and madd_iwad (25/25) rows do not re-derive from the classifier —
replaced with the audit's verified rows (50/50 re-derive).

Also ported: mutashabihat partial-corpus render (no more infinite
spinner) + `quran-corpus` retry branch, daily-hadith fallback to any
bundled book, seed-mode test guards (inert on the full tree),
`--mushaf-fit-scale` design token, `scripts` unchanged (the audit's
tooling scripts never shipped in the seed archive). Pool file keeps
its minified single-line shape; only the two corrected rule arrays
changed. Markers 5.2.89 → 5.4.0 plus re-stamp (248 files).

## v5.2.89 — real scroll restoration + waqf legend + retry parity

Scroll restoration actually works now: the window is the scroller
(#app grows with content, #main never scrolls), so every scroll-memory
read/write against `mainEl.scrollTop` was a silent no-op — forward
views opened at stale offsets and Back never restored. New
`readScrollTop`/`writeScrollTop` helpers centralize the real scroller
for memory, top-jumps, settings landings and the router's same-hash
tap. Measured: category opens at 0 after a deep scroll, Back restores
2500 → 0 → 2500, zero errors.

P0-2 closes: the Mushaf settings carry a waqf & portion-marks legend —
all seven true Uthmani codepoints (مـ U+06D8, صلى U+06D6, قلى U+06D7,
ج U+06DA, ∴ U+06DB, ۞ U+06DE, ۩ U+06E9) with EN+AR names, hizb/sajdah
as deliberately distinct rows, text-glyph styling that survives
forced-colors. Screenshot-verified at 390px, no tofu, no overlap.
Per-typeface madd tuning stays device-gated: one shared 2.15×
line-height serves all four fonts and blind per-font overrides risk
more than they fix — the floor is pinned by test.

P2: floating back-to-top FAB on long (>6) card lists — 48px circle,
window-scroll listener attached once at boot, Back-restored offsets
untouched. Retry parity: 30s cooldowns + timeout demotion for the
tafsir catalog and tajweed pool (boot-critical metas stay loud).
Markers 5.2.88 → 5.2.89 plus re-stamp.

## v5.2.88 — bulk-build abort on SEARCH exit + library jump chips

SEARCH-exit now aborts in-flight bulk chunks immediately: the v5.2.82
latch only stopped inter-chunk scheduling, so a 24-wide chunk kept
saturating connections + the main thread after a same-document hash
"navigation" (observed: roots index timing out 15s+ behind the search
build; typing e2e red). `loadSurahDoc`/`fetchTranslationOverlay` take an
optional signal, both corpus builders run under per-build
AbortControllers, the subscriber aborts on SEARCH→else, and aborted
chunks reject silently (`isBulkAbortError` — even a warn would spam 24
lines per cancel). Measured: roots lands in 325ms after leaving a live
bulk build (was 15,250ms), zero console output. Same slice fixes the
retry side: 30s cooldowns on both roots-index fetches (per-notify
re-fire spammed ~10 timeout errors per typing run) with timeout demotion
to warn; typing e2e green (42.8s), roots allowance 45s → 60s.

P2: library section jump chips — one sticky row under the topbar (one
chip per rendered section, buttons not anchors so the router is never
hijacked), landing with the topbar offset (`scroll-margin-top`) and
focus moved to the section. Measured: 10 chips, landing at 76px with
focus, zero errors. Vector E closed with proof: 0 DOM mutations in 12s
of idle fullscreen (tickers patch text nodes directly by design; the
fit observer is silent once settled). Markers 5.2.87 → 5.2.88 plus
re-stamp.

## v5.2.87 — fullscreen no-scroll auto-fit + quiet missing tiers

P0-3. The Mushaf fullscreen auto-fit engine: while a fullscreen session
is on, a debounced ResizeObserver measures every `.mushaf-page` box and
settles the worst sheet through `updateMushafPrefs({ fontScale })` — the
single source of truth, so pinch/ctrl+wheel and the slider stay
consistent (manual edits re-anchor). The pure core
(`js/domain/readerFit.js`) shrinks proportionally off the live
measurement, restores toward the anchor only when the estimate proves it
fits, and goes silent inside a 0.025 hysteresis band — at most 3
dispatches to a fixed point, then nothing. The render clamp widened
0.8–1.6 → 0.6–2.2 to match the store sanitizer (the old clamp silently
pinned fit results); the slider already spanned the full range. Worst
case a page still can't fit: the engine pins at 0.6 and stops — no worse
than today, never a loop. Markers 5.2.86 → 5.2.87 plus re-stamp.

P1-1. Missing optional tiers (seed bundle, pruned install) warn instead
of erroring: `isMissingResourceError()` in `js/app/net.js` classifies
the fetchJSON 404 shape, and all 9 prunable lazy-tier catches (hadith
index/book, word data/dict, roots/full, tafsir editions/text, tajweed
pool) demote to `console.warn` — the e2e zero-console-error hygiene
catches real defects again on seeds. Core boot tiers (quran/mushaf
meta+docs) still error: a 404 there means a corrupt install. The typing
e2e roots allowance rises 45s → 60s (cold-SW + bulk-build contention on
loaded machines; app-side AbortController follow-up filed).

## v5.2.86 — Agent-3 P0 slice: honest word meanings, sajdah-line accent, bounded tajweed memo

P0-1. The word-study popup no longer goes silent when the word is known
(grammar + root render) but the 54-lemma study dictionary has no entry:
a one-line honest hint (`wordStudy.noMeanings`, EN+AR) via the
sanctioned empty-hint idiom — `.word-study__meanings` keeps its
"renders only with real content" contract. Root-head row wraps at 390px.

P0-2. The prostration word سُجَّدًا in As-Sajdah:15 alone carries the
printed sajdah-line accent (solid 2px gold underline, `qword--sajda`,
text-decoration so forced-colors keeps it), scoped strictly to 32:15 —
the same skeleton elsewhere stays unaccented. Distinct from the ۩
sajdah-place mark the Mushaf reader already renders. Madd-collision
guard pinned: Mushaf body line-height floor stays 2.15×.

P0-4. Bismillah rhythm is proportional (1.2× body; Madinah print keeps
its 1.12em convention via higher specificity).

P0-5. The tajweed classifier memo is hard-capped at the 6,236-ayah
corpus size with oldest-first eviction — bounded memory, identical
answers. The drill pool now covers all 20 rules (tafkhim + madd_iwad
were missing → `practice.noneAvailable` dead end): 25 classifier-derived
entries each, plus 6 stale entries repaired (4 madd_badal, 1 madd_246,
1 madd_6) where the classifier had drifted past the curation — every one
of the 500 entries re-verified to genuinely contain its rule, so the
quiz can never disagree with the coloring. Markers 5.2.85 → 5.2.86 plus
re-stamp.

Also: `data/SEED-README.md` pruning manifest + `npm run build-seed`
reproducer for the audit slim bundle (strict subset: drops only
data/tafsir, data/quran-words, data/hadith — everything the contract
gates check stays).

## v5.2.85 — quiz remembers weak items across sessions

UP-08 (SRS-lite). New persisted `quizMissRecords` (`{ [itemId]: { m, l } }`,
capped 200, slug-shape + prototype-pollution sanitized like hifz maps):
wrong answers upsert, later correct answers clear (re-learned). The quiz
start screen shows Practice weak items (n) backed by a most-missed-first
selector, building a review deck through the existing includeIds path
(stale ids drop out, empty toasts). Shame-free copy throughout. Markers
5.2.84 → 5.2.85 plus re-stamp.

## v5.2.84 — tolerant bulk loops log warnings, not errors

Follow-up to BUG-09: per-surah skips inside the two corpus builders are
recovered inline (skip + continue + retry-next-query), so error-level
logging per skip was both dishonest and self-defeating — it tripped the
e2e console-error hygiene that exists to catch real defects. Both loops
now warn; total build failure still errors. Markers 5.2.83 → 5.2.84 plus
re-stamp.

## v5.2.83 — background index builds cancel on navigation

BUG-09 (found via the typing e2e): the Search-view corpus builders
fetched up to 114 surahs + 114 tafsir files in 24-wide chunks with no
cancellation — navigating away left ~200 requests saturating
connections and the main thread, starving the view actually opened
(roots index timing out behind the bulk job). Both loops now stop
scheduling chunks off-search with the latch reset, so returning resumes
where it left off; the tafsir latch is declared in rt.js (was an
undeclared dynamic prop). Markers 5.2.82 → 5.2.83 plus re-stamp.

## v5.2.82 — lock-screen artwork + honest reciter names

UP-08 (audio). Media Session metadata gains precached local artwork
(the app's own SW-cached 192/512 icons — offline-safe, no backend, no
new assets) on both verse and full-surah sessions, and
fullSurahMetadata resolves reciter ids through the display-name map
with a lang passthrough (callers now pass the UI language), so lock
screens never show raw voice ids. Markers 5.2.81 → 5.2.82 plus re-stamp.

## v5.2.81 — quiz review-mistakes round

UP-08. Missed answers stop evaporating: QUIZ_ANSWER records the deck
item id into ephemeral `wrongIds` (deduped, deterministic — forged
payloads can't inject), and the finish screen offers Review mistakes (n)
whenever the list is non-empty. The round rebuilds through
buildQuizDeck's new `includeIds` filter (quizReady-filtered, order kept,
fresh distractors; stale ids drop out), dispatched as a normal
QUIZ_START so the miss list resets for the new round. EN/AR key
`quiz.reviewMistakes` with matching placeholder. Markers 5.2.80 → 5.2.81
plus re-stamp.

## v5.2.80 — statistics closes the loop: khatma % line

UP-05. The statistics memorization panel grows a khatma progress line
(read/total/pct reduced through the khatma machinery's own planStatus —
no new math) linking back into the Mushaf at the bookmarked page, above
the existing juz strip. Shame-free copy (counts of what was done, never
of what was missed), EN/AR keys `stats.khatmaProgress/Line` with
matching placeholders. Also: prettier-clean `scripts/build-hadith.mjs`
(the last `prettier --check .` warn). Markers 5.2.79 → 5.2.80 plus
re-stamp.

## v5.2.79 — honest roots errors + flake-tolerant typing e2e

BUG-02 completion: the newly-flagged roots tiers get their UI — the
roots index shows error + Retry (`quran-roots` tier) instead of a
forever skeleton, and the detail view's partial hint carries a Retry for
`quran-roots-full`. The typing e2e allows 45s for the roots case (1MB
index behind a cold 246-file SW precache can starve the first fetch
past the 15s timeout; the app self-heals via retry). Markers 5.2.78 →
5.2.79 plus re-stamp.

## v5.2.78 — compare-N: third translation + third tafsir

UP-06. Translation compare grows a second slot (C): up to two compare
lines (B then C) in the classic reader, mushaf tray and ayah-study
modal, each with its own direction/label and independent skip rules
(unset/primary/B/inline). Own `translationC` slice + in-flight set so B
and C never collide; card memo deps extended. Tafsir compare grows a
matching third-source slot with mutual exclusion (C picker excludes the
active tab + B). Settings gains a second compare picker; EN/AR keys
`tafsir.compareC`, `settings.compareTranslationC/HintC`. Markers 5.2.77
→ 5.2.78 plus re-stamp.

## v5.2.77 — the 360° audit wave: no lost speech, honest loaders, bounded scroll

Hostile-audit fixes. BUG-01: per-second tickers no longer abuse
`setSpeakingItem(null)` as a render pulse — new ephemeral `TICKER_NUDGE`
bumps `tickerSeq` only, so prayer/day/phase rollovers re-render without
killing live TTS. BUG-03: home/Ramadan countdowns show an honest
set-location hint instead of a frozen placeholder. BUG-02: word/roots/
roots-full/tajweed-pool/word-dict tiers join the `loadErrors` + Retry
machinery. BUG-05: reset/restore clears in-flight lazy-fetch Sets.
BUG-04/06/07: same-view Back restores scroll, `scrollMemory` LRU-50,
same-hash nav scrolls to top. UP-03: GPS accuracy badge on Qibla
(`locationAccuracy`, sanitized, EN/AR). UX-02/07: dense-button 44px
`::after` expansion + tajweed non-color underlines. Markers 5.2.76 →
5.2.77 plus re-stamp.

## v5.2.76 — the M/L wave: offsets, cross-links, quizzes, word depth, hadith pipeline

Final overhaul wave from the v5.2.72 agent roadmap. UP-06: manual
±60-minute prayer offsets (sanitized, applied at the single
`calculateTimes` choke point so timetable/alerts/triggers/fasting
inherit them), localized method names, per-method explainer
(`data/prayer-methods.json`, triple-pinned to domain + i18n), offset
steppers in the calc sheet. UP-09: roots ↔ mutashabihat cross-linking
(confusables tab per root, deep-linkable; look-alike chip in the word
popup) plus lapse-weighted drill pool from real hifz lapses. UP-10:
quiz generalization — any loaded library, Arabic/meaning directions,
configurable size, persisted picker prefs. UP-01: word-study 2.0 —
54-lemma app-authored dict (`data/quran-dict.json`, every key pinned
against the corpus) with Meanings + synonym/antonym sections, plus
per-word listen/copy/share/bookmark (persisted, sanitized; share reuses
the ayah canvas; TTS honors the sound toggle). UP-07: hadith pipeline
unlock — validator passes enriched grade/narrator rows (strict
vocabulary, unknown dropped), `scripts/build-hadith.mjs` merges grades

- Arabic chapters and FAILS loudly on junk (nothing invented, ever);
  grade-chip UI and per-book toggles wait on real graded data, stated
  plainly. Markers 5.2.75 → 5.2.76 plus re-stamp.

## v5.2.75 — the P2 wave: races, consent, honesty, polish, pace

Second overhaul wave from the v5.2.72 agent roadmap. BUG-08: single-ayah
`play()`/`resume()` carry a sequence guard (mirroring the continuous
engine's `playSeq`) so a superseded tap stays silent; `stop()` retires
pending rejections. BUG-09: cross-book hadith search ranks loaded books
until an explicit "index all" tap records consent in the ephemeral
hadith slice (RESET/restore re-arm the question). BUG-10: polar-fallback
times never arm lock-screen triggers. PERF-02: the IDB audio cache gains
a 2 GiB oldest-first budget (recordings exempt), a once-per-session
`storage.persist()` probe, and a usage line in the Offline meter.
BUG-11: the error-screen reset wipes state, auto-backup, notif dedup
and the content IDB — matching its label. UX-04: 12px type floor.
UX-02/03/05/06/07/08/09: deep-link focus landings, tafsir-tab focus
retention, animated modal exit, True Black palette, dyslexia×RTL
composition, tokenized glass bars with transparency/forced-colors
fallbacks, change-guarded qibla live region. PERF-01: reference-keyed
per-ayah card memo (an advance rebuilds only touched cards). UP-05:
review-due digest + 30-cell juz strip in Statistics (reader-only users
count). UP-03: qibla figure-8 card + live degrees-off readout. UP-04:
opt-in quiet-hours alert cancel. UP-11: queue rename/reorder + compare
voice swap. UP-12: garden counts pages, statistics links the
certificate, journal footers its month. UP-13: per-line zakat explainers
(`data/zakat-notes.json`, i18n-mirrored and contract-pinned) + qada
offer when a logged prayer is un-logged. P3: kids Back reroute
replacement, stale surah-flag clear, reset memo hygiene, BUG-14 verified
already-fixed, doc re-stamp. New `tests/p2-roadmap-fixes.test.js`.
Markers 5.2.74 → 5.2.75 plus re-stamp.

## v5.2.74 — the P1 backlog: version gates, Arabic voices, one tab stop, honest skeletons, swipes that turn, buried features surfaced

Second wave from the v5.2.72 agent overhaul roadmap. BUG-07: the
`navigator` stub in `audioQueue.test.js` uses defineProperty so the gate
stays green on Node ≥21. BUG-05: `lang="ar"` on every Arabic run (reader
Arabic, surah names, bismillah, word spans, occurrence chips, kids
tiles). BUG-06: roving tabindex on `.qword` (~500 stops collapse to one
per ayah) with a named word-study action label (new `wordStudy.open`
EN+AR) and Left/Right word walking in `events.js`. BUG-03: persisted
snapshots are version-stamped and `parseBackup`/`hydrate` refuse
future-schema payloads instead of mangling them (legacy version-less
blobs still load). BUG-04: the surah list and Kids home render error +
Retry when `quran-meta` fails. UX-01: the mushaf swipe guard exempts the
`.mushaf-ayah`/`.qword` text column (true controls and overlays still
win). UP-08: tafsir full-text hits gain a Search-view group (auto-built
index, readiness-gated); compare-second-tafsir gets its own explicit
download; translation-compare threads into the study modal and mushaf
tray via one shared resolver with overlay prefetch; the dead-code
`ramadanKhatmPlan` ships as a Ramadan khatm-pace panel fed by
`mushafPagesRead`. New `tests/p1-roadmap-fixes.test.js` (24 tests).
Markers 5.2.73 → 5.2.74 plus re-stamp.

## v5.2.73 — the P0 overhaul backlog: no lost favorites, no bricked resets, settings links that land

First three P0s from the v5.2.72 agent overhaul roadmap. BUG-01:
`loadLibraries` tracks per-library fetch failures and
`refreshLibraryIndex` refreshes the index but skips the dangling-ref
prune while any failure stands (or the library tier errored) — favorites
and collection refs can no longer be permanently deleted by a 503, and
the next successful retry re-arms the prune with a complete valid set.
BUG-02: `resetStaleFetchGuards` (extracted from `stateSub` for tests)
also resets the hadith index, small roots index and Qur'an-search corpus
guards — plus the cached hadith book promises and the domain search
index — so RESET_ALL / RESTORE_STATE no longer bricks `#/hadith`,
`#/roots` or Qur'an search until reload. UP-02: `#/settings/<slug>`
arrivals scroll the target section under the sticky topbar and focus its
summary (Back-restored offsets win; same-view slug changes re-scroll
only on a new slug). New `tests/p0-roadmap-fixes.test.js` (6 tests).
Markers 5.2.72 → 5.2.73 plus re-stamp.

## v5.2.72 — the adhan owns the speaker

Real prayer alerts used to layer over Quran audio: a single-slot
`onAdhanStart` hook in `services/prayerSound.js` (fired by `playAlert`
after the silent-hours/mode-off early returns, never allowed to break
the alert itself) now pauses the full-surah track (docked, resumable),
freezes verse sessions in place, and stops single-verse taps via an
`audioEngine` subscription — no auto-resume, one tap resumes. Previews
ride the same hook. New `tests/adhanYield.test.js` (4 tests, incl. a
live store+engine chain). Markers 5.2.71 → 5.2.72 plus re-stamp.

## v5.2.71 — editor cites fully: book, chapter, notes, Arabic source

Completes audit rank 7 (the sanitizer already passed everything —
only the form was thin): the item editor gains book, chapter,
reference-notes and Arabic-source-name inputs, prefilled like the
rest, collected through the same save path (over-long dropped,
hostile shapes sanitized, blank references still clean up) with the
dead `url` write gone. The Arabic source rides into `reference_ar`,
so user-added content gets the same choke-point preference in AR as
shipped data. New `tests/editorReference.test.js` (5 tests). Markers
5.2.70 → 5.2.71 plus re-stamp.

## v5.2.70 — reference_ar first light: folded matching, ten backfills, dead url dropped

Audit §5.4, engineering track complete (schema/sanitizer/choke
precedence already landed earlier). Collection matching now folds
diacritics + curly quotes before the prefix table (Ṣaḥīḥ Muslim,
Musnad Aḥmad, Jami’ at-Tirmidhi, Qur’an all share their plain keys;
remainders slice from raw so mixed tails survive byte-identical),
which retires ~17 unmappable sources with zero data invention. Ten
`duas.json` classical titles gain real `reference_ar.collection`
(proper-noun Arabic, each corroborated by the item's own notes;
full list + deliberately-skipped ambiguous/generic/descriptive
classes in data/SOURCES.md). Dead `reference.url` leaves the schema
(empty in all shipped items, read by zero renderers). Process note:
mid-work the coverage gate caught a grading+narrator loss on
`my-11-010` (plus two narrators) from an over-broad data edit —
restored from git, then machine-verified the final data diff is
purely additive (10 reference_ar keys, zero field changes). Citation
convergence (19/45/39 quranic shapes) deferred with rationale: no
display-neutral convergence exists without renderer changes (EN would
lose surah context). New `tests/referenceAr.test.js` (7 tests).
Markers 5.2.69 → 5.2.70 plus re-stamp.

## v5.2.69 — hadith deep links fail honestly to the number

Completes audit rank 8 (unknown-book half shipped in v5.2.32): a
followed `?n=` whose number exists in no hadith of the book now names
the number in a `role="status"` notice (new `hadith.unknownNumber`
EN+AR) instead of landing silently with nothing highlighted. Checked
against the raw book, not the filtered list, so a merely-hidden hadith
never false-alarms; unconsumed `?n=` stays silent. New
`tests/hadithDeepLink.test.js` (3 tests, incl. the unknown-book
regression pin). Markers 5.2.68 → 5.2.69 plus re-stamp.

## v5.2.68 — study in your language + audit fixes F1–F4

Language choice stops being hardcoded. Settings → Compare gains a
default-tafsir picker over the bundled editions (Arabic sources plus
the English Mukhtasar, native names, offline-first — remote editions
stay out) wired through a new `mushaf-set-tafsir` action into the
existing tab fallback, so the commentary you chose is the tab that
opens. Word study renders in the UI language: Arabic POS/case/mood
(data-complete at 77,429/77,429) in Arabic UI, English gloss and
romanization English-only (no Arabic gloss data ships — omitted, never
invented). Same rule applied down the line: reader translit,
surah/reader/kids tile names and palette secondaries carry no Latin in
Arabic UI, and ayah detail honors the translation toggle. Translation
lines keep following the chosen edition (Urdu/French/Turkish/Indonesian
overlays ride the existing pipeline) — choice legitimizes display.
Proper-noun bilingualism (reciter/surah names in both scripts, same
principle as the edition pickers' native names) is kept deliberately
and recorded in the audit trail. Also closes audit F1 (recovered e2e
spec expands accordions if-closed instead of blind-clicking) with the
F2–F4 fixes above. New `tests/studyLanguage.test.js` (15 tests).
Markers 5.2.67 → 5.2.68 plus re-stamp.

## v5.2.67 — one voice, one queue: audio engines stop fighting

The player/surahPlayback split-brain closes in four moves. One voice:
a `yieldFullSurahPlayer()` helper (pause + dock, position kept) now
runs where verse queues, TTS narration and adhan previews used to
layer over a playing surah; deleting the voice that is playing stops
the element (no more ghost audio from the store-only clear); and
`player.stop()` clears the sleep timer so no stale fade ducks the next
track. One queue: full-surah advance moves into the shared pure
`domain/audioQueue.js` (repeat one holds, repeat all wraps 114→1, off
ends at 114), the repeat chip cycles off → one → all with the active
mode named (tooltip, screen reader, visible badge), and the player
warms the next track's offline lookup into one bounded slot while the
current track plays (gapless-lite — streaming tracks warm nothing, a
failed warm falls back silently). Honest lock screens: the transport
state derives from the store in one `stateSub` derivation (verse wins,
echo waits count as paused) instead of going stale on toggles, and
failed tracks clear their slot. Three new EN+AR strings. New
`tests/audioQueue.test.js` (10 tests). Markers 5.2.66 → 5.2.67 plus
re-stamp.

## v5.2.66 — manifest handlers: share in, files open, links route

The manifest leaves 2021 behind: a `share_target` (GET title/text/url)
routes shared content at the app's own Search view with a
`share.received` EN+AR toast, `file_handlers` opens `.json` backups
straight into the existing import-confirm flow via `launchQueue`, and
`protocol_handlers` (`web+nurdhikr:open?view=<id>`, bare
`web+nurdhikr:<id>`) deep-links routes — all parsed by the pure
`domain/launchIntents.js` (capped, trimmed, fail-closed to the normal
boot route) and consumed once per load in `boot.js` (the one-shot query
is stripped so reloads boot clean). `launch_handler: focus-existing`
stops shortcut/share launches from duplicating windows. Everything
degrades silently where unsupported (no launchQueue, no registration);
no SW changes (GET intents need none). New
`tests/launchIntents.test.js` (9 tests). Markers 5.2.65 → 5.2.66 plus
re-stamp.

## v5.2.65 — kids mode gets a real scope: Kids + Tasbih only

Kids mode used to hide the bottom nav while leaving every destination
one tap away (drawer, topbar brand, palette, deep links, shortcuts).
Now the mode is a scope: a pure allowlist (`KIDS_ALLOWED_VIEWS` in
`core/config/views.js`) owns the answer, the NAVIGATE reducer reroutes
every out-of-scope route to the Kids home (covers deep links, history
traversals and search-debounce navigations silently), tap paths
(navigate, drawer, quick tiles, palette launcher) explain themselves
with one new `kids.blocked` EN+AR toast, and the nav chrome (rail,
drawer, mobile bar) offers only the Kids home and Tasbih. Entering and
exiting are untouched (Settings toggle → Kids, hold-exit → Home, mode
off). Also completes the v5.2.64 promise on the shared key twins:
by-heart and hadith-memorize reducers, handlers and buttons grade all
four grades (their two-grade clamps were item-21 fallout), with the
three red baselines repaired. New `tests/kidsScope.test.js` (9 tests).
Markers 5.2.64 → 5.2.65 plus re-stamp.

## v5.2.64 — ayah-level hifz SRS with four grades

Memorization drops to the ayah: per-ayah records (`s:a` keys in their
own persisted map, so surah counts never see them) with mark + review,
and all reviews — surah, ayah, and the shared key twins — grade
Again/Hard/Good/Easy on one step math (restart+lapse, hold, climb one,
climb two capped; Good inherits the old easy semantics). Ayah detail
pages mark and grade single ayahs; the reader toolbar grades four-wide
and grows a mistake heatmap strip bucketing per-ayah lapses (absent
when clean). Five new EN+AR strings. Updated `hifz.test.js`, new
`tests/hifzAyah.test.js` (17 tests). Markers 5.2.63 → 5.2.64 plus
re-stamp.

## v5.2.63 — English tafsir bundled: Al-Mukhtasar

The tafsir library reads English now: the Tafsir Center's English
Al-Mukhtasar (same already-attributed open source as every bundled
edition) ships all 114 surahs, 6,236 ayahs, with catalog credits and
SOURCES attribution. English bodies render LTR with plain paragraphs
(the Arabic section pass would misfire on English punctuation) while
Arabic editions render byte-identically; the loader already normalized
both shapes, so no fetch changes. Zero new UI strings. New
`tests/tafsirEnglish.test.js` (10 tests). Markers 5.2.62 → 5.2.63 plus
re-stamp.

## v5.2.62 — hadith standing: the Two Sahihs, honestly labeled

Per-hadith grades, isnads and takhrij need a graded-data pipeline
rebuild with sources that do not ship with the app — that gap is
tracked, not filled (nothing here invents a grade). What ships is the
uncontroversial part: collection-level standing for Sahih al-Bukhari
and Sahih Muslim, badged in the library grid and the reader header and
labeled as the collection's standing, never a hadith's; every other
book honestly carries none. One new EN+AR string. New
`tests/hadithStanding.test.js` (7 tests). Markers 5.2.61 → 5.2.62 plus
re-stamp.

## v5.2.61 — verse audio offline: packs, IDB-first playback, 10 voices

Per-ayah audio leaves streaming-only behind: ayah files store in the
existing IndexedDB beside full-surah blobs (no migration), the verse
engine and single-verse taps play stored Blobs first with CDN fallback
(sequence-guarded, object URLs revoked, prefetch skips local files),
and the Audio view gains per-surah verse packs for the active voice
with counts, delete, and an IDB-truth status rescan. No bulk download
— 6,236 files is not one tap. Voices grow 5 → 10, every id verified
live (edition list plus byte-serving HEADs; three 403s probed and
excluded, which is why the allowlist exists). Three new EN+AR strings.
New `tests/verseAudio.test.js` (13 tests). Markers 5.2.60 → 5.2.61
plus re-stamp.

## v5.2.60 — prayer alerts, honest path (no push infra)

TimestampTrigger stays Chromium-only, and Web Push would need a
backend, accounts, and secrets — against the offline-first rules. So
instead of infrastructure: the tracked-but-never-rendered reliability
state finally renders in the Prayer view (pre-scheduled count, tab-only
reality, one-tap permission ask; silence when nothing is armed), the
tab-mode row carries a calendar fallback (month ICS export now works
bare, and every event ships an at-time VALARM so imported calendars
actually alert), and the plan is recorded: push stays out unless
self-hosted infra is ever chosen. One new EN+AR string. New
`tests/prayerAlerts.test.js` (11 tests). Markers 5.2.59 → 5.2.60 plus
re-stamp.

## v5.2.59 — theming/a11y: contrast, transparency, reading comfort

Accessibility closes four gaps: OS `prefers-contrast` now hardens the
same borders and focus widths as the high-contrast setting (mirrored
rules, test-pinned together — no JS needed, answers live), OS
`prefers-reduced-transparency` resolves every frosted surface to
opaque tokens with blurs killed, and two new Settings toggles cover
dyslexia-friendly reading (legible stack, wider spacing — Arabic keeps
rendering via per-glyph fallback) and roomier long-form rhythm (WCAG
1.4.12 minima on reading surfaces). Two new EN+AR strings. New
`tests/a11yPrefs.test.js` (9 tests). Markers 5.2.58 → 5.2.59 plus
re-stamp.

## v5.2.58 — Mushaf parity: Hizb index + ayah-to-page links

The jump drawer gains a 60-entry Hizb index grouped by juz: exact
breaks are ayah typesetting with no shipped data (never invented), so
entries resolve by the established page-position rule and say so next
to the index. Search ayah hits grow a Mushaf page chip beside the
reader link (sibling anchors, resolved through the 6,236-entry map,
absent when unresolvable). Four new EN+AR strings from attested
vocabulary. New `tests/mushafHizb.test.js` (9 tests). Markers 5.2.57 →
5.2.58 plus re-stamp.

## v5.2.57 — cross-book hadith search

The grid searches all eight books at once now: a ranked index over
every loaded document (quranSearch honesty rules — AND terms, phrase
bonus, both languages — with the hadith fold pipeline both sides, no
alef elision), missing books loading in pairs behind an honest
"N of M books" scope line while the query stands. Results page at 10
with book labels and reader deep links; per-book substring search is
untouched. Grades stay absent by data reality (the scholarship
pipeline is separate work). Two new EN+AR strings from attested
vocabulary. New `tests/hadithSearch.test.js` (11 tests). Markers
5.2.56 → 5.2.57 plus re-stamp.

## v5.2.56 — roots browser: previews, glosses, pagination

Root families open up: occurrences whose surahs are already loaded
show ayah preview cards (text with the occurrence word marked,
per-word English gloss from the word data, translation behind the
reader's pref, jump on tap — zero surprise fetches, the rest stay ref
chips one tap away), ref chips cap at 12 per form behind a show-all
expander so 300-occurrence roots stay light, and the index paginates
past the old hard 60 with filter-preserving pages. Glosses are loaded
data only, never synthesized; mismatched tokenizations render unmarked
rather than mis-marked. Two new EN+AR strings from attested
vocabulary. New `tests/rootsBrowse.test.js` (12 tests). Markers
5.2.55 → 5.2.56 plus re-stamp.

## v5.2.55 — calendar recurrence: weekly to White Days

Notes repeat five more ways: weekly (start weekday), monthly
(month-day, short months skip — a 31st never fires a phantom 28th),
yearly (Feb 29 keeps leap years), Hijri-monthly (anchor Hijri day via
the tabular converter), and White Days (13/14/15 through isWhiteDay) —
all floored at startDate, all optionally end-capped through one shared
end-date input, all flowing through the existing reminder scheduler
untouched. The ui fallback mirror covers the Gregorian arms (it cannot
import domain by layer law — documented at the site). Four new EN+AR
strings from attested vocabulary; White Days reuses its label. New
`tests/calendarRecurrence.test.js` (12 tests). Markers 5.2.54 → 5.2.55 plus re-stamp.

## v5.2.54 — quick tiles editable + favorite-driven

The 8 hardcoded home tiles are a registry now: with no saved order
they sort by tap counts (stable ties keep the familiar layout), and
any move/hide in Settings writes an explicit order that wins — same
up/down/hide manager pattern as the home panels, reusing its strings.
Tile taps record visits; NOW-window suggestions survive; unknown ids
degrade to visible defaults. Zero new i18n keys. New
`tests/quickTiles.test.js` (18 tests). Markers 5.2.53 → 5.2.54 +
re-stamp.

## v5.2.53 — backups: auto-snapshot, file save-back, stale nudge

Manual JSON download/upload grows three companions: a rolling
on-device auto-snapshot (boot heartbeat banks a valid backup file to
localStorage for returning users past a 7-day interval, restorable
through the same import confirm; best-effort and total — quota or
failure never breaks startup), File System Access save-back (link a
file once, Export writes back to it instead of piling up downloads;
dead handles self-heal to the download path; non-Chromium keeps the
classic download), and a stale-export nudge in the Data panel
(returning users past 30 days or never get the export call-to-action
inline — the on-device snapshot explicitly never counts). Seven new
EN+AR strings from attested vocabulary. New `tests/backupAuto.test.js`
(19 tests). Markers 5.2.52 → 5.2.53 + re-stamp.

## v5.2.52 — onboarding wizard: six steps, permissions primed upfront

The 4-row getting-started checklist is a stepped wizard now (one step
at a time, Back/Next, position + done-count, dismiss intact):
geolocation priming (why + one-tap enable reusing the prayer handler,
manual entry beside it), notification priming (benefit copy, real
prompt from the button, honest blocked/granted states), prayer setup
(calculation method + Asr selects over the shared data-bind pipeline
with an explicit confirm), daily-goal setup (same), then the existing
install and first-reading steps. Setup confirms persist as seen-flags;
the wizard position is ephemeral (reloads resume at the first
incomplete step). Six new EN+AR strings from attested vocabulary; the
palette's settings rows were already deep-link consumers. Updated
`onboarding.test.js`, new `onboardingWizard.test.js` (13 tests).
Markers 5.2.51 → 5.2.52 + re-stamp.

## v5.2.51 — favorites bulk: sort, move, clear-all

The flat favorites list manages itself now: a sort control (recent /
A–Z / most-read — pure `sortFavorites`, locale titles for alpha,
all-time read counts with stable ties, `?sort=` via replaceGo so
paging never spams history and the search box preserves it), per-row
move-to-collection (single-destination picker, then a guarded
unfavorite completes the move; creating a collection mid-move moves
too), and a confirmed unfavorite-all (new `FAVORITE_CLEAR`). Six new
EN+AR strings from attested vocabulary. New `tests/favorites.test.js`
(15 tests). Markers 5.2.50 → 5.2.51 + re-stamp.

## v5.2.50 — collections manage: rename, reorder, share, bulk favorites

Collections grow past create/delete: rename (wires the long-dead
`COLLECTION_RENAME` path through the shared text prompt, prefilled),
per-item up/down reorder (new `COLLECTION_MOVE_ITEM`, edges no-op,
controls hide while filtering so invisible neighbors never move),
share-as-text (name + numbered titles via the locale choke point, Web
Share with clipboard fallback, honest toast when empty), and one-tap
bulk import of missing favorites (new deduped `COLLECTION_ADD_ITEMS`,
button shows only with news and counts them). Drive-by fix: restore
used to blank `{en,ar}` collection names to `''` (it only kept legacy
strings) — both shapes now survive, capped. Four new EN+AR strings
from attested vocabulary. New `tests/collections.test.js` (14 tests).
Markers 5.2.49 → 5.2.50 + re-stamp.

## v5.2.49 — journal edit-in-place + pagination

Duas and reflections both edit in place now: an edit control per row
opens a prefilled editor (`?edit=<id>` — no new state, Back exits it,
reloads never resurrect half-typed drafts), saving through new
`DUA_JOURNAL_EDIT` / `REFLECTION_EDIT` actions that rewrite text only
(creation order and timestamps untouched, entries never jump; empty
edits no-op with the existing empty-input toasts). The hard
`.slice(0, 50)` is gone — both tabs paginate at 10/page with a
prev/status/next pager that preserves tab + filter via `replaceGo`
(search-typing discipline: no history spam, URL stays deep-linkable,
hostile pages clamp). One new EN+AR string (`journal.pageStatus`,
mirroring the hadith pager); edit/save/cancel reuse existing keys.
New `tests/journalEdit.test.js` (15 tests). Markers 5.2.48 → 5.2.49 +
re-stamp.

## v5.2.48 — settings accordion persistence + section deep links

The open settings section survives reloads: it moved from session-only
module memory to a persisted `settings.settingsSection` slug (sanitized,
backed up, restored like any setting), so toggling a switch still
re-renders onto exactly the open section. `#/settings/<slug>` deep
links (all 12 slugs: language…data) open their section for the visit,
persist on navigation, and degrade to the pin/default on unknown slugs
— Back/forward and shared links land right. The palette's settings rows
now emit those deep links, which also repairs a latent key mismatch
(they read `titleKey` off entries that carry `title`, so non-empty
queries never matched and empty ones rendered "undefined"). Slug lists
in config + views are pinned equal by test. `counter-flow` accordion
tests updated to the stored mechanism; new
`tests/settingsSection.test.js` (11 tests). Markers 5.2.47 → 5.2.48 +
re-stamp.

## v5.2.47 — statistics CSV download + share

The Statistics screen's data leaves the app: the ⋯ menu gains Export
CSV (full-history daily grain — date, recitations, sessions, pages,
reading seconds — as a date-stamped download) and Share CSV (file
share where the platform allows, text share then clipboard otherwise —
the ayah-card fallback ladder). Empty history gets an honest toast
instead of a header-only file. The existing week-text share is
untouched. Deliberately no PNG: the bars and heatmap are DOM divs, and
re-drawing them on canvas would duplicate the charts to ship pixels —
the CSV carries the underlying data instead. Four new EN+AR strings
from attested UI vocabulary. New `tests/statsExport.test.js` (7
tests). Markers 5.2.46 → 5.2.47 + re-stamp.

## v5.2.46 — custom dhikr on the tasbih dial

The tasbih screen is no longer limited to its 6 presets: a "Custom
phrase" panel adds user-authored dhikr (free text + named goal, capped
at 500 chars / 50 phrases) as chips beside the presets, each driving
the same dial through the unchanged shared `increment()` on the generic
`'tasbih:'+id` counter key. Customs persist, restore, and back up like
the dua journal (new `tasbihCustom` slice + sanitize); deleting the
active custom falls back to the first preset instead of stranding the
dial. User text is stored verbatim and escaped at render (`dir="auto"`,
no language assumption — the app never translates or annotates it).
Five new EN+AR strings from existing UI vocabulary. New
`tests/tasbihCustom.test.js` (15 tests). Markers 5.2.45 → 5.2.46 +
re-stamp.

## v5.2.45 — honest streaks: no idle-today inflation, goal-gated, one freeze

`computeStreak` stops counting an idle today as active (the
`|| key === todayKey` inflation): empty history reads 0 (was 1), a run
ending yesterday reads its own length mid-day (was +1), and — like
`prayerStreak`/`readingStreak` — an idle today anchors the walk on
yesterday instead of breaking it. A streak day now meets the daily
dhikr goal (or carries Qur'an pages/reading seconds); mere entry
presence never counts, matching the review's presence≠activity
doctrine. One isolated miss per run is frozen (adds no length); a
second gap or two misses in a row ends it, both walks alike. The
reducer passes `settings.dailyGoal` in and computes from the post-write
history, so the persisted streak reflects the just-recorded tap instead
of lagging one dispatch behind. The v5.2.44 badge reuses the same
`isStreakDay` rule, so icon and engine agree on sub-goal days. Two
pinned expectations updated for the intended semantics (v4.3 current
4→3, v4.2 single-gap longest 1→2 frozen), new `tests/streak.test.js`
(20 tests). Markers 5.2.44 → 5.2.45 + re-stamp.

## v5.2.44 — app-icon badge: prayers left, streak at risk

The installed app's icon now carries a live badge via the Badging API
(`navigator.setAppBadge` / `clearAppBadge`, previously zero usage
repo-wide): remaining fard prayers count down 5 → 1 as the day's log
fills, a lone 1 flags a dhikr/Qur'an streak that dies at midnight once
the prayers are done, and the badge clears when everything is done or
no live streak needs protecting. Stale badges clear the moment the app
opens; the fresh count syncs after hydrate, on every state change
(change-deduped, so tasbih taps cost one integer compare), and on
return-to-visible. Silent no-op where the API is missing (Firefox,
desktop Safari, Node under test). New `js/services/appBadge.js` (pure
count + guarded sync, mediaSession-style) precached in APP_SHELL, 18
tests. Markers 5.2.43 → 5.2.44 + re-stamp.

## v5.2.43 — sleep timer for full-surah listening

The verse engine's fade-to-silence timer now covers the full-surah
player: same off → 15 → 30 → 45 → 60 ladder, 90-second linear fade,
pause (not stop) at zero so position is kept. Timer survives track
changes; player close clears it. Countdown chip on the player bar with
minute-granularity store sync; volume owned by the timer while armed
(no full-loud blips on track swaps). Markers 5.2.42 → 5.2.43 +
re-stamp.

## v5.2.42 — palette round 2: journal + settings providers

The overlay now searches device-local journal duas/reflections (rows
land on the filtered journal view) and settings sections (bilingual
title + hint match, rows open Settings). No new data paths — both read
what the views already render. Markers 5.2.41 → 5.2.42 + re-stamp.

## v5.2.41 — search the rest: settings, favorites, collections

Every remaining list view filters: settings sections (bilingual title +
hint match, non-matches hidden, matches auto-open), favorites and
collection cards (shared `filterEntries()`, match highlights via the
existing card path, honest empty states). Three debounced inputs join
the registry (tab/collection-id preserving). Markers 5.2.40 → 5.2.41 +
re-stamp.

## v5.2.40 — tafsir full-text search in the palette

The last unsearchable library opens up: the default bundled tafsir
edition (first bundled in catalog order) builds a 6,236-record index
lazily in 24-file chunks, ranked like Quran search, deep-linking to the
reader ayah. Remote editions are never bulk-fetched (their on-demand
rule stands). Palette gains the Tafsir group with edition refs; reader
cache doubles as index source. Markers 5.2.39 → 5.2.40 + re-stamp.

## v5.2.39 — nav search opens the palette

The main-menu Search item (rail + drawer, Home…Settings group) now
opens the command palette instead of jumping straight to the Search
view: one launcher for everything, consistent with the topbar magnifier
and Ctrl/⌘K. The full Search view is untouched and stays one pick away
(palette destination row + history rows). Per-item action overrides in
the nav renderer; opener shuts the drawer first. Markers 5.2.38 →
5.2.39 + re-stamp.

## v5.2.38 — match highlights everywhere + journal search + palette history

One shared `highlightMatch()` (literal-only `<mark>`, escape-first) now
runs in every result template: library cards, Quran rows, hadith cards,
reciter names, surah/root tiles, journal entries, and the palette. The
journal gains a debounced text filter (tab-preserving, both tabs,
generic empty state). Palette picks record their query into search
history, so history reflects searches that led somewhere. Markers
5.2.37 → 5.2.38 + re-stamp.

## v5.2.37 — command palette + unified search backends

Ctrl/⌘K (or the topbar magnifier) opens a Spotlight-style overlay over
everything: destinations, surahs by name/number in any script, Quran
verses, adhkar, reciters, hadith books, actions — grouped, ↑↓/Enter/Esc,
<mark> highlights, empty-query history. Underneath, all six searches now
share one normalizer (audio's weaker regex retired), the global index
gains virtues.ar + narrator/book/chapter/grading/notes, and the surah
list uses the same scored `searchSurahs()` as the palette. Markers
5.2.36 → 5.2.37 + re-stamp.

## v5.2.36 — one screen for every voice + translation-track badges

The Audio view now lists the 5 verse-by-verse voices alongside the 314
moshafs (streaming-only section, tap selects voice A through the global
setting path), closing the Settings-5 vs Audio-314 picker split from
both sides (Settings already linked here). The 10 recitation-plus-
translation mashups carry explicit `translation`/`translationAr` fields
(Saheeh/Pickthall/Muhsin Khan/Urdu) with badge + localized grid header
and search in both languages. Markers 5.2.35 → 5.2.36 + re-stamp.

## v5.2.35 — learned per-surah availability for moshaf servers

Translation/Taraweeh variants often lack surahs the catalog assumes
present. Availability is now learned, not probed: a 404 surfaces as
`missing` from `downloadSurah`, recorded per moshaf in
`services/moshafAvailability.js` (memory + localStorage). Download-all
skips known-missing and reports them (`audio.batchDoneSkipped`);
single downloads say `audio.surahUnavailable` without spending the
fetch; the grid disables missing cells (`.dl-cell--missing`); streaming
a known-missing surah goes straight to the CDN-voice fallback (offline
copies still win). Markers 5.2.34 → 5.2.35 + re-stamp.

## v5.2.34 — reciter unification: cross-engine audio fallbacks

The 314 moshaf servers only host per-surah files, so verse-by-verse can
never run on them — instead each engine now degrades onto the other.
Full-surah streaming retries once through the verse CDN's per-surah
files (`quranAudioSurahUrl`, default voice) with an honest
`audio.fallbackVoice` toast and lock-screen name; downloads never fall
back (a foreign voice under the moshaf's IDB key would poison offline).
A verse session dying on its first ayah (voice/CDN outage) auto-starts
the same surah full-surah with `audio.verseFallbackSurah`; mid-session
failures keep the plain toast. Error callbacks fire before teardown so
the fallback sees live state (pinned by test). Markers 5.2.33 → 5.2.34

- re-stamp.

## v5.2.33 — reciter reliability: voice allowlists, Arabic catalog, lock-screen names

Verse voices coerced to the 5-id CDN namespace in settings sanitizer and
engine (`start`/`setReciter`/`setReciterB`) — stale ids fall back to
`ar.alafasy` instead of 404ing per ayah. All 314 catalog rows now carry
Arabic names (38 `qa-*` backfilled) with a URL hygiene gate; riwaya
labels mapped to Arabic via `rewayaAr()` (19/19 catalog values, unmapped
omitted in AR). Lock-screen artist shows the voice display name, never
the raw id. New gates in `tests/audio.test.js`. Markers 5.2.32 → 5.2.33

- re-stamp.

## v5.2.32 — takeover-audit fixes: separation leaks, data flags, layer gates

Closes all 11 findings of the v5.2.31 takeover audit. Separation
contract finished at the uncovered renderers: quiz feedback
transliteration gated to EN, quiz choices strict-pick (no fallback),
locale-safe title fallback centralized in `contentTitleFor()` (card,
mini-card, category, editor), and the `The Qur'an` article prefix mapped
(A1–A4, A6). Hadith reader distinguishes unknown book ids from network
failures (B2, new `hadith.unknownBook` keys). Machine-readable `review`
flags in data + `reference_ar` support in schema/sanitizer/localeContent
(A5, B5; four al-Kubra citations corrected). Missing v5.2.31 notes added;
lockstep test now covers `docs/RELEASES.md` (B4). Gzip test no longer
statically imports `scripts/` (B6). Layer boundaries executable via
eslint + `backDepth`/notes-in caller params (L1). New
`tests/separation-renderers.test.js` (14). Markers 5.2.31 → 5.2.32 +
re-stamp.

## v5.2.31 — content & i18n audit: matn restoration + strict language separation

Fifteen corrupted Quranic matn restored verbatim from the bundled corpus
(`glm-quran-001…015` in `data/quranic.json` held Latin transliteration in
the `arabic` field; rebuilt from `data/quran/<surah>.json`, dua-portion
slices per the file's own convention — `004` ref corrected `14:39-40` →
`3:38, 14:40`, `001` ref narrowed `1:1-7` → `1:6-7`). `glm-quran-013`
rebuilt to its cited ref 23:97-98; its envy/evil-eye title still needs
scholar review (flagged in the audit doc). New single choke point
`js/domain/localeContent.js` (pure, unit-tested): transliteration and
translation never render in AR, virtues/sources read the active language
only, unmapped Latin sources omitted. Wired into five renderers
(`ui/card.js`, `views/focus.js`, `services/shareCard.js`,
`app/shared.js` clipboard, `views/hadithCard.js`) plus `pickStrict()` in
`core/utils.js`. Nine hard matn-integrity gates + six regression
baselines pinned in `tests/content-i18n-audit.test.js` (27 tests).
`node scripts/audit-content.mjs` exits 0. Markers 5.2.30 → 5.2.31 +
re-stamp. Full report: `docs/content-i18n-audit.md`.

## v5.2.30 — verse-of-the-day themes (B-4 buried-feature recovery)

The last buried item on the ledger. `domain/dailyAyah.js` (theme-keyword
pool narrowing, deleted as an F-005 orphan) is restored verbatim, and
the Home verse card grows a six-chip theme picker (Any, Mercy,
Patience, Gratitude, Guidance, Paradise) riding the generic
`set-setting` path — no new handler. Narrowing happens before the
deterministic seed pick, so a sparse theme falls back to the full pool
instead of blanking the card, and the v5.2.25 done-today fall-through
walks the narrowed pool so the card stays on-theme while skipping
finished items. New `dailyAyahTheme` setting (default `'any'`),
allowlisted in the sanitizer against an inline mirror of the domain
list — config never imports domain (layer rule), and the two lists are
pinned equal by test. Seven new EN+AR keys. Pinned by new
`tests/dailyAyah.test.js` (4: list parity, matching, determinism +
fallback, end-to-end render). Markers 5.2.29 → 5.2.30 + re-stamp.

## v5.2.29 — sadaqah editor (B-3) + plan sharing (B-5)

Two more buried features recovered. **Sadaqah:** the v3.19 "full
amount/note editor" follow-up is built — entries carry an optional
amount (positive cents, null otherwise; never summed across entries,
since gifts may mix currencies) alongside the note field the shape
always had but no UI ever wrote. The Home worship card gains a details
button opening an editor modal (amount + note form over the last 20
gifts with per-entry delete, rebuilt in place); new `SADAQAH_UPDATE`
reducer case and `sadaqah-entry` form, hostile-clamped at every edge.
**Plan sharing:** `domain/planExport.js` restored verbatim from the
F-005 deletion (pure `buildPlan`/`isPlanFile`/`sanitizePlan` — plan
keys only, never logs or history) with Settings → Data export/import
buttons, a confirm-then-`PLAN_IMPORT` file flow (non-destructive, so a
calm confirm instead of the backup's danger styling), dynamic imports
so the boot graph stays untouched, and its `sw.js` precache entry
restored. Pinned by 3 new `tests/worship.test.js` blocks and new
`tests/planExport.test.js` (5). Markers 5.2.28 → 5.2.29 + re-stamp.

## v5.2.28 — first-class reminder settings (B-2) + doc-drift corrections (D-1/D-8)

`jumuahReminder`, `dailyVerseNotification`, and `zakatFitrReminder`
were persisted and sanitized since v4.4 but never read and never shown —
the one-tap presets covered the same ground through generic reminders
and notes. All three now fire through `services/notifications.js` on
the existing 30s tick: Friday-gated Jumu'ah (Surah Al-Kahf copy),
any-morning daily verse (taps through to Home), and a once-per-year
Zakat al-Fitr ping on the morning of 28 Ramadan — silent
notifications with day-persisted dedup, no adhan audio (the generic
reminder path they parallel never plays sound either). Settings →
Notifications gains three toggles plus clock-time inputs for the two
daily ones (`toggle-jumuah-reminder` / `toggle-dailyverse-reminder` /
`toggle-zakatfitr-reminder` handlers, two new change-registry arms);
`tick`/`tickForTests` take an `appSettings` accessor plus an injectable
`now` seam, wired in `app/boot.js`. Ten new EN+AR keys. Pinned by new
`tests/reminder-settings.test.js` (4: Friday fire + dedup, Saturday /
disabled / garbage silence, verse fire + dedup, Fitr 28th-morning-only)
and the change-registry count 27 → 29. Docs: `APP-FLOW.md` route count
corrected to 33 routes / 34 rows, six stale `- [ ]` duplicates in
`AUDITS.md` annotated as superseded. Markers 5.2.27 → 5.2.28 + re-stamp.

## v5.2.27 — Ramadan planner UI (B-1 buried-feature recovery)

The store has persisted `taraweehLog` / `itikafLog` / `lastTenLog`
since v4.4 (actions, reducer, sanitizer, About-page copy) but no view
ever rendered them — the About screen advertised "taraweeh and
last-ten-nights logs" with no button anywhere. The Ramadan view now
renders a planner section in-season (same dot-grid idiom as the fasting
tracker, no new CSS): Taraweeh nights 1–30, I'tikaf days 1–30, and
last-ten-nights worship 21–30, each with a kept/total badge; elapsed
days backfill, future days stay disabled. New `ramadan-planner-toggle`
handler (dataset-clamped at the edge like the fasting toggle) drives
the pre-existing `RAMADAN_PLANNER_TOGGLE` action, whose reducer now
validates slice/key/day instead of writing blindly (hostile inputs
no-op, toggle-off deletes the key rather than storing false). Nine new
EN+AR keys (`ramadan.planner*`, `taraweeh*`, `itikaf*`, `lastTen*`).
Pinned by 4 new `tests/ramadan.test.js` blocks (sanitizer, counts,
reducer validation, 70-dot render). Markers 5.2.26 → 5.2.27 + re-stamp.

## v5.2.26 — hadith of the day: real spread + shuffle button

The card felt frozen for two compounding reasons: the pool is only
two small books, and the pick walked `seed % length` with a seed that
grows by exactly 1 per day — consecutive days marched lockstep. The
daily draw now goes through mulberry32 (new pure PRNG in
services/hadith.js): scattered across the pool, still identical all
day, still offline, still unit-tested — yes, we had heard of PRNGs,
the old walk was deliberate determinism, this keeps the determinism
with better spread. Plus a refresh button on the card
(`hadith-daily-shuffle`) that jumps to a different loaded hadith
(bundled now, downloaded Sahihs once opened — never a fetch);
session-only, so reloads return to the daily pick. Pinned by new
hadith.test.js blocks (PRNG determinism/range, 14-day scatter,
shuffle exclusion). Re-stamp 233.

## v5.2.25 — counter standards: session vs lifetime, daily completion, feed dedup

The reported "6 / 1" and instant-vanish behavior reproduced live: the
old pill rendered lifetime cycles as the first number (a completed
target-1 card showed cycles/target, and completions flashed
"1 / 3"), so the fix separates the two numbers everywhere. The pill
(and focus counter) now show ONLY live session progress; lifetime
rides its own `✓ N×` badge with the translated tooltip. Reloads
restore item counts to 0/target while cycles + completion day survive
— free tasbih-dial keys (`tasbih:*`) keep their live count for the
dial's reload gate. Completions stamp `lastCompletedDay`, which
drives "done today" (never lifetime cycles): the Home verse falls
through to the next fresh pick when done, verse/recent/favorites
never repeat an item down one screen, and category headers gain a
"done today" progress line (achieved styling at 100%). Dismissal
still fires exactly at count == target with the exit animation.
Pinned by `tests/counter-rules.test.js` (7); the old conflated-pill
tests were updated to the new contract deliberately. Re-stamp 233.

## v5.2.24 — accordion memory, card-header wrap, counter exit, focus polish

Five follow-ups, all verified on pixels in headless Chromium (390px,
zero console errors). (1) Settings accordion: toggling a switch
re-rendered the view and collapsed the section (native details state
is DOM state) — the open section id now lives view-local in
views/settings.js, so re-renders re-open exactly it; a capture-phase
toggle listener in app/events.js pins opens and enforces
single-expansion (verified live: switch toggle keeps Content open,
opening Appearance collapses it). (2) Home Reflections header: the
long category chip overflowed under the action buttons (shot with the
heart painted over "…the Righteous") — `.card__top` now wraps so
actions take their own row, chips truncate as last defense (re-shot
clean). (3) Responsive contract: footer/jump rows wrap, text
containers move to relative units (icon/touch-target/art px kept
deliberately), documented as the going rule in CSS. (4) Counter flow:
completing a target plays a fade/slide exit (`.card--exiting`) then
vanishes the card session-locally via new domain/completedCards.js —
counters and statistics untouched, reload restores resting ✓ state;
Focus keeps its auto-advance instead. (5) Focus rework: the grade chip
collided with the Arabic's diacritics (shot) — content is now a
gapped centered column; position becomes a "1 / 29" pill; counter
grows to 72px with larger numerals; item changes slide directionally
(RTL-mirrored, reduced-motion safe), stamped only on item change so
count taps never replay. Pinned by new `tests/counter-flow.test.js`
(7). Re-stamp 232.

## v5.2.23 — fullscreen session unity, compact player, TOC removal, offline grid

Follow-up wave, verified against the live app in headless Chromium
(zero console errors throughout). (a) The reported fullscreen
"crash" does not reproduce — entering/exiting fullscreen and turning
pages mid-recitation throw nothing and the engine session survives —
but the probe confirmed the real defect underneath: turning the page
away from the recited surah left audio playing with NO controls (the
player bar is CSS-hidden in fullscreen and the glass console vanished
with the surah). The console + position counter now ride the whole
session (`fsRecitationState` in views/mushafReader.js, unit-tested);
only the main play button still reads the visible page. (b) The
recitation bar measured 172px tall on a 390px phone — now a compact
status head (pause + dismiss always visible) over one
horizontally-scrollable chip strip, 114px, same 13 actions, no new
contracts. (c) Settings TOC jump chips removed (markup, handler, CSS,
both `settings.toc` keys) — redundant over the accordion. (d) The
Offline rows were still crushing titles to ~5 characters between the
status badge and the button (caught on a real screenshot, not by
reading CSS): rows are a two-line grid now — full title line, status

- action line — verified clean on pixels, as are the Azkar card
  headers in English and RTL Arabic. Pinned by extended
  `tests/gestures.test.js` (12). Re-stamp 231.

## v5.2.22 — bug-report wave: RTL gestures, accordion settings, overlap guards, player dismiss

Seven user-reported issues, one release. Swipe direction was audited
and pinned (the Mushaf swipe already followed RTL book order —
right-to-left is next, left-to-right is previous, in every UI
language — and `tests/gestures.test.js` now locks it); the real
gesture bug was conflict: swipes starting on the player bar, consoles,
or any button used to turn the page underneath and steal taps. New
pure `js/domain/gestures.js` (`mushafSwipeTurn`, `isSwipeGuardTarget`,
`isPlayerDismissSwipe`) wired into `app/events.js`. Settings is a
native `<details>` accordion (first panel open, TOC opens its target
before jumping — zero JS, keyboard-operable). Azkar/offline/global
overlap pass: card actions wrap with breathing room, offline titles
truncate against their status badges (rows wrap on narrow screens),
mini-card titles truncate, recite console wraps, plus a documented
overlap-guard rule in CSS. The recitation mini-player gains an
explicit dismiss X on the existing recite-stop path (stop + clear
metadata + unmount) and swipe-down-to-dismiss via
`data-player-dismiss`. Pinned by `tests/gestures.test.js` (10).
Re-stamp 231.

## v5.2.21 — permanent browser specs (audit debt)

The audits demanded kept-in-tree e2e and got temporary probes
instead — four of them across v5.2.15–5.2.20. All four are permanent
specs now (lazy-views, lazy-sheets, longpress, typing), plus the
missing Esc-layer-order spec the unit suite cannot cover: modal over
immersive reading takes two presses, one layer each (APP-FLOW I2),
and the mobile drawer closes without leaving its route. Suite grows
3 → 9 specs, all green first run. No app-code change in this release
— version bump + re-stamp only, per the markers-in-lockstep rule.

## v5.2.20 — F-015 first cut (safe slices)

Three duplications converged without touching tested contracts: the
modal trap and the drawer containment share `cycleTabFocus` (lists stay
with the callers, cycling lives once, DOM-free and unit-tested); the
two SW offline stubs are one `offlineStub()` builder (wire-identical,
v4.3 gate now asserts shape-once + uses-twice); the three
search-as-you-type navigations are one factory over their rt timer
fields (delays, views, focus restore identical — stateSub invalidation
untouched). Deliberately left: hadith/zakat/trigger debounces
(documented different shapes), Esc ownership (tested order), the
SW↔app stub split (separate scopes). Pinned by
`tests/focus-cycle.test.js` (6) + a temporary typing probe (all three
boxes navigate and keep focus; removed after the run).

## v5.2.19 — honest lazy sheets (v5.2.18 follow-up)

Self-review of the lazy wave found its own gap: fire-and-forget
`import().then(openModal)` chains (forms, the long-press quick sheet)
had no rejection path — a failed chunk was an unhandled rejection and
the tap silently died. New shared `ui/modal.js#openLazyModal`: chunk
failures toast instead of stranding the tap, and an optional viewGuard
drops timer-deferred sheets that outlived their view (the 550ms
long-press vs the v4.2 search-debounce lesson). Converted all four
sites (the pre-existing viewSheets chain included). Pinned by
`tests/lazy-modal.test.js` (4: stale guard, rejected chunk, sync
throw, empty content — all resolve false, never throw, DOM-optional).

## v5.2.18 — heavy views on demand (F-013 core)

The Mushaf, the classic reader, and the hadith browser load on first
visit instead of before first paint (12/12 lazy views out of the boot
graph: 184 → 179 static modules). Their last static app-layer edges
went dynamic with them: Mushaf modal builders (forms, lazyData,
handlers/quran, handlers/system, handlers/zakat) and the long-press
quick sheet (events.js) — async handlers surface chunk failures
through the existing rejection boundary. Two Home cards were
mis-homed: `hifzReviewCardHTML` moved verbatim into views/home.js and
the hadith cards into the new light leaf views/hadithCard.js (core/ui
only, shared by Home at boot and the browser on demand). Pinned by the
extended `tests/startup-budget.test.js` (static cap 22, whole-tree
zero-static rule for all lazy views). Precache unchanged in spirit
(+hadithCard.js); offline identical.

## v5.2.17 — reader window promoted to the store (B12)

The classic reader's window memory was the last module-scoped view
state (render mutated it while rendering). It is an ephemeral
`state.readerWindow` slice now: pure transition math in
`js/domain/readerWindow.js`, validated `READER_WINDOW_SET` /
`READER_WINDOW_EXPAND` reducer cases, derive-then-render in
`app/stateSub.js` (dispatch only on change — quiet ticks cost a few
integer comparisons), and a pure read in `views/quran.js`.
`_resetReaderWindowForTests` is deleted; tests drive the store.
Fixed en route: the sanitizer preserves a null ay param (`Number(null)`
is 0 — a 0-vs-null latch mismatch would have derive-dispatched
forever). Pinned by `tests/reader-window.test.js` (4: no latch, fixed
point, hostile reducer inputs, bounded reads) plus ported v4.2/v4.3
windowing cases.

## v5.2.16 — neutral reading tokens (F-013 prerequisite)

The two one-shot Mushaf animation tokens (flip direction, fullscreen
transition) move from `views/mushafReader.js` module state to the
neutral `js/ui/readingTokens.js` both layers may import. Five app-layer
setters (events ×2, fullscreen, recitationFollow, handlers/quran) no
longer import the whole book — the exact edge blocking lazy-loading
the heaviest view. The view re-exports the setters for compat and
consumes through consume-once readers; behavior is byte-identical.
Pinned by `tests/view-boundary.test.js` (3: single ownership, no
app→view token imports, consume-once semantics). Still module-scoped
by design: the classic reader's `readerWindow` (needs its own store
wave) — see ARCHITECTURE's known-compromise note.

## v5.2.15 — lazy leaf views (F-013 first cut)

Nine renderer-only leaf views (quiz, offline, about, ambient, garden,
mutashabihat, journal, kids, certificate — ~1.3k lines) load via dynamic
`import()` on first visit instead of before first paint. Skeleton while
loading, error + Retry through the existing `view-<name>` loadErrors tier
(no new data-actions). APP_SHELL entries unchanged, so offline is
identical; the F-005 reachability gate follows dynamic specifiers.
Pinned by `tests/startup-budget.test.js` (4: static-import cap,
dynamic loaders, precache guarantee, no app-layer re-coupling). Editor
stays static (handlers import its builders); heavy views (mushaf, quran,
hadith) stay static until their transients move to a neutral module.

## v5.2.14 — hostile-audit wave (report 2026-09-09)

External audit, independently verified finding-by-finding; every fix
lands with a regression test that fails on the old code.

1. **Pause race (P1, F-001).** `pause()` during a resolving track or a
   pending `play()` was overridden or misreported as failure. Play
   intent is declared before the first await and honored at every
   checkpoint — the pause wins, silently. `tests/player-pause.test.js`.
2. **Fetch discipline (P2, F-004).** New `core/fetch.js` kernel
   primitive (layer-honest: services never import app/*); the custom
   adhan probe, surah downloads (120s large-file budget), and reciter
   catalog ride it. Static gate: raw `fetch(` exists only there.
3. **Dead code (P2, F-005).** Removed the unread `dailyAyahTheme`
   setting, orphan `dailyAyah.js`/`planExport.js`, and their precache
   entries. Precache-hygiene gate: every shipped JS module is
   reachable from `js/app.js`.
4. **RTL (P2, F-002/F-006).** 21 unmirrored directional icons fixed
   (home CTAs, back links, month shifters, focus pager); book-order,
   media-transport, and CSS-mirrored sites pinned as explicit
   exemptions. `tests/rtl-mirror.test.js` (proven to bite on revert).
5. **P3s.** Cross-tab adhan dedup (storage-event invalidation +
   merge-on-write); favicon precached; tafsir h2→h3; audio title and
   This-Week casing unified; Scheherazade TTF→woff2 (786→208KB).
   Accepted with rationale: 32px player chips (40px effective via
   hit-expansion; enlarging risks neighbor overlap), fullscreen edge
   zones (labeled controls + arrow keys exist), existing-user Home
   density (stored settings win by design).
6. **Docs honesty (F-003).** Count-free badge; no all-green claims;
   `tests/docs-honesty.test.js` pins both.

## v5.2.13 — compressed downloads option

New storage mode in the Offline library: fetch data JSON as sibling
`.json.gz` (built at packaging by `npm run compress-data`) and cache
the small bytes — ~150 MB becomes ~27 MB on disk and wire, at gunzip
CPU per file open. Transparent with plain fallback (404-only, so hosts
without `.gz` and genuine failures behave exactly as before), shared by
`fetchJSON` and hadith bulk fetches, SW route extended, toggle wipes
the old encoding + resets measured rows. Pinned by
`tests/offline-gzip.test.js` (10, incl. a live dumb-server proof).

## v5.2.12 — offline library: one-tap full-text downloads

New dedicated **Offline library** view (nav drawer → Tools, Settings →
data section): one big button warms the service worker cache for every
on-demand text corpus (~150 MB, ~2,000 files across Quran text,
translations, Mushaf pages, 8 hadith books, bundled tafsir, word-study
data), with per-group status rows, a live progress bar, stop/resume,
storage meter, quota and offline preflights, and a pointer to
per-reciter audio downloads (unchanged, in Audio). Bodies are fetched
and discarded — state is never loaded — with a 3-wide pool, throttled
progress, and per-group completion persisted to settings. Pinned by
`tests/offline-library.test.js` + the e2e smoke walk.

## v5.2.11 — tajweed correctness: word taps, rules, palette

1. **Word-tap pop-ups (P0).** Mushaf pages, classic docs, and grammar
   records tokenized differently in 2,722 ayahs, so a tap answered the
   adjacent word. `data-i` is now canonical (ornaments never consume an
   index) across render, popup, and grammar, with a content-anchored
   fallback for the 6 true spelling-split ayahs. Verified on 100:5–9.
2. **Engine coverage.** Variant tanween (0656/0657/065E), small-high
   marks (yeh/noon/madda/iqlab), inert waqf/saktah signs; madd
   as-silah sughra on bare small waw/yeh; lam shamsiyyah after prefix
   particles; madd lazim via following shaddah/jazm ( الضَّآلِّينَ was
   miscolored badal). Silent-alif spellings excluded from lazim.
3. **Standard madd reds.** Cumin → orange-red → blood → dark red per
   the Dar Al-Maarifah chart (AA-verified both themes; dark uses a
   documented heat ramp), replacing the pink scale. Legend follows
   automatically.

## v5.2.10 — change/input registries (Blueprint D) + word-study refinements

1. **Declarative change/input (Blueprint D).** The ~40-arm
   `if/else` chains in `app/events.js` are now feature-owned
   `{ sel, run }` registries (27 change + 10 input arms across
   audio/content/system/worship/location/items/quran/navigation/zakat),
   dispatched first-match-wins through the same rejection boundary as
   click handlers — an async throw inside an arm can no longer escape
   as an unhandled rejection. File-import inputs stay app-wide in
   `events.js`, now boundary-guarded too. Pinned by
   `tests/event-registries.test.js` (7: completeness, shape,
   uniqueness, first-match order, round-trips, rejection boundary).
2. **Word-study refinements.** The tapped surface anchors popup
   resolution for spelling-split ayahs (`openWordStudy` carries a
   capped surface string); tafsir-tab call sites finish migrating to
   the `mushafSession` dispatch; tajweed gains canonical-token
   helpers for glued/split spellings.

## v5.2.9 — session transients in the store (§6.2 shadow layer)

The last multi-owner module state moves into `state.mushafSession`
(bookmark folder filter, study tafsir tab): sanitized reducer patch,
ephemeral (never persisted/restored), surviving in-app navigation like
the module vars did. All setters deleted; seven call sites dispatch.
The one-shot flip/fullscreen animation tokens stay module-scoped by
design (single writer→single render; store promotion would cost double
renders for zero probe value — see the ARCHITECTURE compromise note).
Pinned by `tests/mushaf-session.test.js` (defaults, ephemerality,
sanitize + no-op identity, view filtering, B12 no-write-back).

## v5.2.8 — capped Home for fresh installs (UX-1)

Fresh installs open on hero + prayer strip + quick actions + at most
five content panels (Ramadan banner when in season, continue-reading,
daily progress, verse and hadith of the day) instead of all eleven —
the getting-started steps and nudge already cover first-run guidance.
Everything else is one tap away in Settings (existing per-panel
toggles, now the opt-in path). Stored settings always win, so existing
users keep exactly the Home they already arranged. Pinned by new
`homePanels.test.js` cases (default set, fresh initial state, stored
hides verbatim).

## v5.2.7 — one audio session, touch honesty (UX-7, UX-8)

1. **One session (UX-7).** New `selectors.audioSession`: verse wins
   when active, so a surah tile can never claim "paused" while the
   other engine sounds. Tiles render the session glyph with
   engine-named labels ("Pause/Resume recitation" vs "Play/Pause"),
   and a tile tap owns its surah (verse pause/resume in place,
   player toggle, or fresh start) — no more guessing which engine
   wakes.
2. **Touch affordances (UX-8).** Polar-fallback times link to the
   footnote via `aria-describedby`; the console's icon-only buttons
   (ayah prev/next, follow, pause) carry short labels shown at
   ≥900px, phones unchanged.

## v5.2.6 — mushafReader decomposition (Blueprint E step 2)

`views/mushafReader.js` 1058 → 715 lines: bookmarks + folders move to
`views/mushafBookmarks.js`, the Khatma tracker + plan form to
`views/khatma.js`, the ayah-study modal to `views/ayahStudy.js — each
move render-verified byte-identical against the original before
deletion. `mushafReader.js`re-exports them (facade), so every importer
and test keeps working untouched. Also in this release: the stale
folder filter corrects read-only at render (B12 — no more mid-render
mutation), and`mushaf-toggle-bookmark`/`practice-this-ayah`clamp
dataset values at the handler edge (B11). Pinned by`tests/mushaf-structure.test.js` (anti-regrowth: size cap, import
allowlist, no back-edges, facade resolution).

## v5.2.5 — one recitation console (Blueprint E step 1, UX-5)

The fullscreen Mushaf bar, the immersive reader bar, and the player bar
rendered the same 13 recitation controls from three copy-pasted builders
that had already drifted (the player bar's ayah prev/next pointed the
LTR way). New `js/ui/recitationConsole.js` (snapshot + chips + echo
banner, precached) serves all three hosts with per-host classes and no
visual change; `reciterShortLabel` moves there too, ending the
view→view imports from `playerBar.js`. Ayah prev/next now follow mushaf
order on every host. Pinned by `tests/recitation-console.test.js`.

## v5.2.4 — declarative change/input wiring (Blueprint D)

The ~250-line `if/else` change/input chains in `app/events.js` are now
two feature-owned registries (`changeRegistry` 27 entries,
`inputRegistry` 10) with the same rejection boundary as click
handlers — an async throw inside an arm can no longer escape as an
unhandled rejection, and each arm is unit-testable as a `{ sel, run }`
pair (`tests/event-registries.test.js`). `events.js` shrinks 966 → 778
lines and keeps no feature knowledge; the two app-wide file inputs stay
at the dispatcher. Zero behavior change by construction (first match
wins, same order as the chains).

## v5.2.3 — service-worker, scheduler, and chrome-honesty fixes

1. **SWR recency (P2, B6).** The data cache's recency bump ran
   concurrently with network revalidation and could overwrite fresh
   bytes with the stale copy. Recency is now bookkept after
   revalidation settles.
2. **Ayah-study latch (P3, B9).** The study modal fetched quran-meta
   past the shared single-flight latch (duplicate fetch, silent empty
   modal on failure). One shared promise in `app/lazyData.js`; late
   joiners wait, failures toast.
3. **Trigger ports (P3, B10).** Every trigger arm leaked a
   MessageChannel with a live multi-fire handler. First reply wins,
   then the port closes; orphans reaped by timeout.
4. **UX honesty.** The "Recently read" panel is named what Settings
   calls it (the duplicate "Continue Reading" is gone); Home
   quick-actions use the corrected prayer-rug/compass pairing; all
   chrome chevrons mirror by UI language; the calendar sheet's dead
   self-link scrolls to the fasting panel; the Home H1 is the app
   name, not the tagline.

## v5.2.2 — the hostile-audit hotfix release

An independent hostile audit (1 P1 + 7 P2 + 5 P3, all verified
line-by-line against the v5.1.0 tree) found the defect class the green
suite is structurally blind to: concurrency races and cross-module
lifecycle clobbering. Every finding below ships with a regression test
that fails on the old code. Also closes the version-drift the audit
exposed: the v5.2.0/v5.2.1 work sat in the tree at markers 5.1.0, so
installed service-worker clients never received it — markers are now
5.2.2 everywhere and the worker bytes change, forcing the update.

1. **Player race (P1).** Rapid double-taps interleaved two `play()`
   calls at the IndexedDB await: ghost "playback failed" toasts while
   the other track played, a blob-URL leak per tap, and late `src`
   swaps to the older track. A monotonic sequence token now guards
   every async boundary; losers unwind silently.
2. **Catalog + fetch (P2).** `loadCatalog()` returned null mid-flight
   (cold first tap always "failed"); `fetchJSON` had no timeout, so a
   hung socket pinned skeletons forever with no Retry. The catalog
   caches its promise; every fetch carries a 15s timeout into the
   existing loadErrors machinery.
3. **Ramadan re-adhan (P2).** Suhoor/iftar used in-memory-only dedup
   while the prayer block used the persisted day-dedup — a reload in
   the window fired a second full-volume adhan. Now mirrors prayer.
4. **IndexedDB boundary (P2).** `openDB()` could hang forever on a
   blocked upgrade and memoized one transient failure permanently.
   New `core/idb/openDB.js` boundary (blocked/failure settle to null
   - retry, versionchange close + evict, abort-aware transactions);
     `core/storage.js` delegates to it.
5. **Verse-failure toasts (P2).** One callback slot shared by the
   toast wiring and the verse engine meant the first verse session
   killed single-ayah failure toasts for the rest of the session.
   Listener sets + unregister-on-stop; one toast per failure, never
   two, never zero.
6. **SW hygiene (P3).** Dead `cached || Response.error()` fallback
   removed; `core/idb/openDB.js` added to the precache manifest.

## v5.2.1 — player audit + fixes (shipped in-tree, unmarked)

Per `docs/AUDITS.md`: two real player defects found and fixed,
re-verified live. Suite 845/845 green at the time. Never versioned —
absorbed into the 5.2.2 marker bump above.

## v5.2.0 — feature audit + implementations (shipped in-tree, unmarked)

Per `docs/AUDITS.md`: echo mode, ambient display, language plumbing.
Never versioned — absorbed into the 5.2.2 marker bump above.

## v5.1.0 — the "it finally reads right" release

The answer to the v5.0.0 field review: two hard bugs that made the app
feel untested (both found by live browser measurement, both
root-caused to CSS rule conflicts), the topbar rebuilt to the exact
spec asked for across five prompts, and the focus counter shrunk from
a third of the screen to one slim bar. 813 tests green, eslint 0/0,
prettier clean; verified live on desktop 1440px and mobile 390px with
real scrolling.

1. **Focus mode scrolls again (THE bug).** The v5.0.0 ripple rule set
   `overflow: hidden` on the reading stage, silently overriding its
   `overflow-y: auto` — scrollHeight still reported the full text, so
   it LOOKED scrollable while the person saw one clipped line. The
   stage is now a scroll container again, with `overscroll-behavior:
contain`; the ripple anchors but never clips a scrollable surface.
2. **Focus counter: 180px dial → one 76px bar.** Reset, prev/next, a
   64px progress counter ("1 ✓ / 1"), and the card menu in a single
   footer row. The reading stage reclaims ~170px on phones
   (493px → 661px of text on a 390×844 viewport).
3. **Topbar order, exactly as specified.** Hamburger at the far
   start, the brand immediately beside it (never centered — the
   desktop inner row no longer caps to the centered content
   measure), search + theme at the far end, Back at the very end.
   Mirrors correctly in RTL.
4. **Collapsed rail icons: full size, finally.** The
   `@media (orientation: landscape)` safe-area rule matched every
   DESKTOP viewport (they're all landscape), silently padding the
   76px rail 12px per side; with the scrollbar the content box fell
   under 24px and `svg { max-width: 100% }` squeezed the icons to
   16-19px. The rule is now scoped to <960px, the rail is 84px, and
   nav icons carry an explicit 24×24 floor — same size collapsed or
   expanded, verified by measurement.
5. **Manage is a menu action, not screen furniture.** The persistent
   Manage button + hint bar is gone from reading mode; Manage lives
   in the "⋯" menu (where it already was), and the full toolbar —
   with a primary Done — appears only while you're actually editing.
   Applies to Library banners and Azkar sections.
6. **Ramadan's dead-looking toggles fixed.** The suhoor/iftar rows
   in the "⋯" sheet dispatched correctly but never re-rendered the
   sheet, so the switch never moved — the control looked broken.
   Sheet toggles (and the Schedules manager's) now rebuild in place.
   Outside Ramadan the countdown math is verified live (next Ramadan
   8 Feb 2027, Eid al-Fitr 10 Mar 2027) and every sheet link and
   dua link resolves.
7. **Prayer page reorganized.** One story in labeled blocks: the
   next-prayer hero, a "Today's prayer times" panel framing the six
   rows with the date, the log panel, and a "Prayer tools" tile grid
   (Sunnah, Qada', Adhan, Calculation, Places, Qibla) below the
   content. Desktop drops the half-empty two-column grid for one
   centered column.
8. **The modern-app polish pass (vanilla, not Next.js).** Two-layer
   elevation shadows, deeper frosted-glass topbar, molded primary
   buttons (darkening gradient only — white text keeps its audited
   4.5:1), title tracking, designed thin scrollbars, icon-button
   press states. The paper Mushaf is untouched and re-verified.

## v5.0.0 — the content-authority release

The answer to "why can't I edit ANY of it, and why did features
disappear in redesigns?" One principle applied at every level: **the
bundled book never changes; YOUR changes layer on top — and every level
carries a Restore.** 813 tests green, eslint 0/0, prettier clean.

1. **Four-level content authority.** Cards: full field editing (Arabic,
   transliteration, translation, reference, grade, repetitions, virtues,
   tags, notes) on ANY card — builtin included — plus reorder, hide,
   TRUE delete (not just hide), duplicate, and per-card Restore.
   Sections: rename/describe/icon/color, reorder, add and delete cards,
   Restore the whole section. Banners: rename, reorder sections, add
   sections to ANY library, hide/true-delete the banner, Restore.
   Tab: "Restore ALL content to defaults" from the Library menu and
   Settings. Everything lives in the contentPrefs lens
   (`domain/contentLens.js`), applied at the data-flow choke point so
   every surface (search, home, mood, focus) sees the same corpus.
2. **Scheduling at every level.** Any section, banner, or hadith book can
   carry a daily reminder; tapping the notification deep-links back to
   it. "Also add to the Hijri calendar" writes a recurring calendar note
   with the same reminder. A Schedules manager (Library menu, Settings)
   lists, toggles, and removes them all.
3. **Field visibility.** The Card-fields sheet (per banner) and the
   Settings defaults choose which JSON fields every card renders —
   "Arabic only, no clutter" is two taps. Banner toggles cascade down;
   absent toggles inherit the global defaults.
4. **The counter reads like a human counts.** "done / target ✓" — after
   finishing a target-1 dhikr the pill shows "1 / 1 ✓" (the completed
   count FIRST — never the old "0 / 1 ✓ 1"). Same contract in Focus mode.
5. **Counting feedback trio.** Every count tap: vibration (where
   supported), the soft tick sound, and a radial ripple bloom at the tap
   point — each toggleable, dead under prefers-reduced-motion.
6. **Ahadeeth get the azkar treatment.** Book-level reorder / hide /
   true-delete / restore, per-hadith hide with recovery, the Arabic-text
   display toggle, and per-book daily-reading schedules.
7. **Ayah-range recitation.** The reader's Range picker plays any
   "from ayah X to ayah Y" span; the session (and the follow-along)
   ends at the range's last ayah. Single-ayah play and full-surah
   recitation stay as they were.
8. **Settings, redesigned** — iconed sections with intent: Counting
   feedback, Card fields, Schedules, and the content restore live
   beside the familiar appearance/content/data panels.
9. **About, rewritten for humans** — what this is, what you can do,
   privacy, sources, offline-forever — no machine-facing sections.
10. **Nav icons that mean what they say** — Prayer carries the
    prayer-rug, Qibla the compass (the old pairing read backwards).

---

## v4.6.0 — the every-tab-owns-a-menu release

The hostile-UX-review answer to "this app is a slop factory." One idea
applied everywhere — every tab now owns a small "⋯" options sheet (the
same pattern the Mushaf's More sheet already used), pages got focused,
and the mushaf word-tap bug the review caught is fixed at the root.
812 tests green, eslint 0/0, prettier clean.

1. **Tapping a word in the Mushaf now answers tajweed — always.** The
   word-study panel's tajweed section silently never rendered in the
   mushaf (it reads the classic reader's surah docs, which the mushaf
   never loads): the review's "why don't I get the tajweed words?"
   Words are tappable with or without grammar data; the panel falls
   back to the colorized word + its rules; the surah text is fetched
   on demand.
2. **Tajweed rules & colors are user-settable** — every rule of the
   standard chart toggles on/off (all on by default), each family's
   color picks from a curated swatch row, applied as `--tw-*` custom
   properties at boot + on change, with a live sample line and a
   reset-to-standard button. Strictly sanitized on restore (rule ids,
   family ids, 6-digit hex only).
3. **Every tab owns a "⋯" menu** — Library, Azkar sections, Ahadeeth
   (grid + book), Prayer, Qibla, Ramadan, Calendar, Checklist, Tasbih,
   Zakat, Statistics, Garden: one `viewSheet` builder, one handler
   module (`viewMenus`), grouped rows that dispatch existing handlers.
   The Editor tab is GONE from navigation (folded into the Library
   menu; the route survives for deep links).
4. **Prayer is one calm page** — next-prayer hero with place, the
   times list, and the compact log. Sunnah tracker, qada' backlog,
   traveler mode, adhan & alerts, calculation settings and saved
   places moved into the menu as modals (same handlers, same data).
5. **Azkar Manage, redesigned** — the raw number input and floating
   icon buttons became joined pill segments: reorder (up/down), a
   real −/+ count stepper (still directly editable), circular
   hide/edit/duplicate/delete actions, honest copy ("Adjust this
   section in place — no separate editor screen needed." is gone).
6. **The Garden is alive** — layered organic SVG plants (gradient
   foliage, stems, berries, grass, drifting pollen motes), a gentle
   sway on every stem (desynchronized per layer, allow-listed in the
   motion contract, dead under prefers-reduced-motion), and a soft
   radial-glow hero.
7. **Ahadeeth get the azkar treatment** — every hadith card now
   carries copy / share / listen; book pages and the grid have their
   own menus (translations, reload, sources, copy book link).
8. **Chrome polish** — drawer rows at 56px with 24px icons and an
   iOS-style grab handle; topbar buttons on one 44px centerline; the
   home "Install the app" line no longer breaks one-word-per-line; the
   location-setup card is one row instead of a stacked chevron. New
   `checklist-reset-day`, `content-target-step` actions and the
   `CHECKLIST_DAY_RESET` reducer case.

---

## v4.5.2 — the review-driven repair release

The honest answer to a hard user review ("why are features always being
forgotten?"). Every complaint traced to a root cause, every fix gated by
tests, 812 green (41 new v4.5.2 tests), eslint 0/0, prettier clean.

1. **The azkar section names are back** — `data/adhkar.json`'s seven
   categories shipped nameless from the start (the normalizer silently
   filled empty strings), so the Library tiles and the category header
   rendered blank: "you deleted the names of sections". Names,
   descriptions, icons and colors restored (أذكار الصباح / Morning
   Adhkar…), a data gate now fails the build for any nameless category
   in any library, and `categoryDisplayName()` degrades to a prettified
   id so a section tile can never render nameless again.
2. **The desktop sidebar collapse actually collapses** — the renderer
   wrote `data-nav-collapsed="1"` while every layout.css selector
   matches `"true"`: the hamburger flipped an attribute and nothing
   moved (the "you destroyed it" report). Values now match the CSS
   contract; 240px rail ↔ 76px icon rail, labels fade, margins retract.
3. **The focus counter is truly concentric** — the ring SVG carried
   120×120 attributes inside a 180px button and sat anchored to the
   top-start corner, orbiting the count. It now stretches to the
   button's full box; centers coincide exactly (verified by geometry
   in the browser: offset dx=0, dy=0), same fix applied to the tasbih
   dial.
4. **Tajweed: the standard chart palette + the two missing rules.** The
   colors now follow the reference chart exactly (silent gray, ghunnah
   family green, qalqalah cyan, tafkhim blue, madd ladder pink → orange
   → deep pink → red; dark theme lifts each hue). New rules: **Tafkhim**
   (the heavy lam of لفظ الجلالة with or without prefixes + ra'
   mufakhkhamah) and **Madd 'Iwad** (the fathah tanween read as an alif
   at a pause). Idgham bila ghunnah and izhar shafawi are now honestly
   UNCOLORED — matching the printed books — and the legend groups rules
   by family with a plain-swatch note for the uncolored pair.
5. **"Arabic for Arabic, English for English"** in the mushaf chrome:
   "Juz 1 · 1/8" in English, "الجزء ١ · ١/٨" in Arabic, everywhere the
   interface speaks (topbar, medallions, fullscreen counter). The page
   ornaments that ARE the mushaf (ayah markers, page numbers, the
   cartouche count) stay Eastern always. Arabic grammar fixed too:
   "٧ آيات" for 3–10, "١١٠ آية" above (the old '{n} آيات' was wrong on
   100+ surahs).
6. **The Garden grows** — the omitted feature from the reference app,
   now real: every counted dhikr is a seed, the plant grows through
   seed → sprout → sapling → young tree → tree → grove (100/500/2k/8k/
   25k), with a growth timeline, a harvest row, and a Statistics
   invitation. Positive framing only, per the app's anti-guilt policy.
7. **A Back button, as a DFA demands** (APP-FLOW I9): the topbar shows
   Back whenever a forward navigation left somewhere to return to, and
   it rides the real browser history (I3). Two root-cause bugs fixed on
   the way: Chromium fires popstate for programmatic hash pushes (every
   forward nav was misread as a traversal), and the topbar rendered
   before the back-stack bookkeeping ran.
8. **The Editor tab is gone; management moved into the sections.** A
   Manage toggle on the Library and every category view reveals
   per-item rows — reorder, hide, re-target, reset progress — plus
   edit/duplicate/delete for your own libraries, in place. Builtin
   sections stay immutable at the data layer; the user's preferences
   (hide/reorder/target) layer over them, strictly sanitized on restore.

---

## v4.5.0 & v4.5.1 — the print-parity completion + the flow contract

The v4.4 paper-mushaf redesign finished the book's face; v4.5 finishes
how a printed mushaf is actually READ and studied. One brief across the
wave: _facing pages like a desk copy, the margin information a reader
actually looks for, zoom under your fingers, and every study tool from
the classic reader one tap from the book._ 770 tests green (35 new v4.5
suites), eslint 0/0, prettier clean, precache 183 entries all on disk.

**The printed-book reading rhythm:**

1. **Double-page spread.** On wide viewports (≥900px — desktops,
   tablets, landscape) the book opens like a mushaf on a desk: page N
   on the right, N+1 facing it, joined by a soft spine-shadow gutter.
   Page turns step TWO pages at pair granularity (buttons, arrow keys,
   swipes, and jumps all align to the odd right-hand page — page 200
   is the left sheet of the 199|200 spread). A still-loading facing
   page holds its place as a quiet pending sheet — never a layout
   jump. In TRUE fullscreen the spread reads as one wide leaf. The
   preference (`mushafPrefs.spread`, default on) never affects phones:
   single-paging below 900px is guaranteed by a shared matchMedia
   gate, not by CSS hope.
2. **The margin information a reader looks for.** Every juz label —
   topbar, page-head medallion, fullscreen counter — now carries the
   hizb-quarter position: "Juz 18 · 3/8" (honest page-position
   approximation from the mushaf's own juz page index). Every surah
   banner carries its ayah count ("7 ayahs" / "٧ آيات"), and the jump
   drawer's surah rows show the same count at the row's end.
3. **Zoom under your fingers.** Two-finger pinch on the mushaf and
   ctrl+wheel on desktop scale the persisted text size live (the same
   value the settings slider owns, widened to 0.6–2.2×) — the type
   re-wraps like a larger print run instead of scaling pixels, and
   the zoom survives the session.
4. **Fullscreen edge tap zones.** In TRUE fullscreen, a tap near the
   right edge turns back and near the left edge turns forward (the
   physical book's right-to-left rhythm), narrow by design so they
   never cover ayah text; desktop shows a whisper of a chevron on
   hover. The counter reads the spread: "١٩٩–٢٠٠ / ٦٠٤".

**Feature parity, both directions:**

5. **The ayah detail gains the classic reader's whole study row:**
   share-as-image, open-in-study (deep-links the reader centered on
   that ayah — `#/quran/N?ay=A`), and the hifz spaced-repetition
   chips (mark memorized / recalled / struggled).
6. **The classic reader gains immersive mode.** One expand button in
   the reader header: topbar and nav slide away, the reading column
   widens (58rem), a translucent floating pill (or Esc) brings the
   shell back. The playerbar stays — recitation follow-along is part
   of reading, not chrome.
7. **A latent v4.4 icon bug fixed:** the action sheet's "Reader View"
   row referenced an undefined `list` icon (passed through a
   variable, so the gate never saw the literal) and rendered a
   silent blank square; the glyph is defined now and the gate
   catches the pattern.

**The flow of everything, in one file (the DFA spec):**

8. **`docs/APP-FLOW.md`** now specifies the whole app as a
   deterministic finite automaton: 29 routes × overlay layers × the
   three chrome-removing modes, the full transition table, and eight
   navigation invariants (I1–I8: always an exit, Esc unwinds exactly
   one layer, OS-back is a real back, modes die with their route,
   deep-linkable reading positions, the card is the count button,
   the stage is the count button, counting works in normal mode).
   A view without a back path does not ship.
9. **The immersive trap is dead.** Esc used to close a modal AND
   strip the reading mode under it with one press; now the layer
   order is enforced (modal → drawer → mushaf-fullscreen →
   reader-immersive — exactly one layer per press, tested). The
   reader's floating exit pill grew into a full glass control bar
   (exit · prev/next surah · back-to-list · recitation with live
   counter) with the SAME auto-fade contract as the mushaf's bar,
   and the header button reflects its state. From any scroll depth,
   in any mode, the whole navigation is one tap away.
10. **Counting never requires aiming.** The azkar card BODY is the
    count target (tap anywhere on the card, in normal mode — the
    small pill stays only as the keyboard/announced control), the
    focus-mode STAGE counts on any tap, and the tasbih stage is one
    big button — the azkar.md lesson, made a specified invariant and
    wired through the single delegated listener so inner controls
    (listen, favorite, menu, open-focus) keep winning taps by DOM
    proximity.

**Desktop as a first-class citizen** (the explicit v4.5 brief): the
mushaf route claims a 92rem reading column (the standard 720px content
column capped the spread), the spread + spine gutter + hover chevrons
are desktop-native, and the wide-layout gate re-renders live when the
window crosses the breakpoint. A dedicated desktop layer
(`assets/css/desktop.css`, loaded last) then lifts EVERY view, not just
the book: the hub canvas widens to 60rem at ≥960px while reading views
re-narrow to a human measure, library/hadith/surah/stat grids fill the
width with equal-height cards, prayer rows sit beside their sunnah/qada
panels, settings controls group instead of stretching, the tasbih
becomes a centered meditation sheet with a 240px dial, and
pointer-fine hover lifts answer the mouse — with a
`prefers-reduced-motion` escape for every transition. The top-margin
cartouche now also prints the surah's ayah count ("الكهف · ١١٠"),
matching the printed mushaf's habit of carrying it at every surah head.

**v4.5.1** is this same release plus the live-reported fixes: the Esc
layering bug (modal + reading mode both closing on one press), the
immersive glass control bar, the azkar tap-anywhere counting, the
desktop layer for every view, and the top-cartouche ayah count. Anyone
running the earlier 4.5.0 build gets the update automatically through
the service-worker version bump.

---

## v4.4.0 — the paper-mushaf redesign

A full UI/UX redesign of the Qur'an reading experience, driven by one
brief: _the Mushaf must read like a real printed mushaf, it is the
default, and fullscreen means the book and nothing else._ The visual
language follows the calm green/gold family of the popular Azkar
apps. 734 tests green (every gate extended to the new UI), eslint 0/0,
precache 182 entries all on disk.

**The paper mushaf:**

1. **The page is composed like print.** A double-rule gold illumination
   frame with heavier L-bracket corners carrying gold diamonds; margin
   medallions above the text (the juz in a rosette pill, the running
   surah in a hairline cartouche); in-flow surah banners — an
   ornament-framed cartouche flanked by gold diamonds on fading
   hairlines — with the Bismillah beneath; Eastern Arabic-Indic ayah
   markers tinted toward the illumination gold; the printed sajda mark
   ۩ in gold at the fifteen places of prostration; the page number in a
   concentric-ring medallion at the foot; and a paper vignette so the
   surface reads as paper, not a panel. The gold itself shifts with the
   paper (antique on light papers, pale gilding on the night papers).
2. **TRUE fullscreen.** One tap and the book claims the entire viewport —
   measured width AND height, not a centered column. Every piece of app
   chrome hides (top bar, rail, drawer, player bar — the same contract as
   focus mode, plus the desktop rail margins). The transition is
   animated: a bloom-in when entering, a settle-out when leaving, with
   the page morph riding CSS transitions on the same node. A translucent
   glass control bar carries page turns, the page counter, recitation
   start/stop and the live ayah counter, and **auto-fades after three
   idle seconds** — pointer/key activity brings it back (a stationary
   touch tap fires no pointermove, so pointerdown wakes it too). The
   native Fullscreen API hides browser chrome best-effort; a screen wake
   lock keeps the display on through a reading session and re-arms after
   tab switches; the browser's own exit paths (its Esc, notification
   swipes) take the app state down with them so the shell is never left
   half-hidden. PageUp/PageDown and the arrow keys turn pages.
3. **Mushaf-first, everywhere.** The home quick action, both nav items
   (desktop rail and mobile bar — the item stays lit when you switch
   into the classic reader from the book), the returning-user nudge
   (deep-linking to your saved page), continue-reading, and the
   Ramadan/certificate/mutashabihat "read the Qur'an" links all open the
   Mushaf. The classic reader remains one tap away **from the book**
   ("Reader View" in the action sheet) and from the reader back
   ("Mushaf View") — both views stay full citizens.
4. **Feature parity from the book.** The old seven-button topbar became
   a calm app bar + an action sheet: jump drawer (with the khatma
   block), bookmarks with folders/notes, mushaf display settings, the
   translation tray, tajweed, word study, recitation follow — plus real
   links to memorize-this-surah, search, reciters and the reader.
   The translation tray (new) lists this page's ayahs under the paper —
   never on it — with per-ayah tafsir buttons, degrading to skeletons
   while the surah doc arrives.
5. **The reciting ayah now glows gold** on the page (was an ink wash),
   matching the illumination rather than fighting it.

**Also in this release** (from the same session's feature wave, all
domain-pure and wired): continuous listen mode in the player bar with a
sleep timer (90-second fade-out, not a cliff-edge stop), a qada'
(make-up prayer) tracker, a dua journal, a Daily Sunnah checklist, a
mutashabihat (similar-passage) drill view, khatma certificates, plan
export/import, and the mushaf prefs sanitizer grew the translationPanel
key. ~25 unused-import/param warnings left by the mid-work state were
cleared back to the 0/0 gate, and the nudge-CTA contract test was
updated to the mushaf-first target.

---

## v4.3.0 — the third hostile-audit release

A fourth hostile-review round over the v4.2 tree, this time on angles no
prior wave had touched: **domain-math correctness** (an independent
NOAA-factsheet solar reference re-derived every prayer time), **feature
parity against the original v3.27** (a full route/handler/settings/persistence
diff — verdict: the feature lock holds; zero losses across three waves),
**test-suite quality** (which regressions would the suite actually catch?
and **runtime/SW edge cases**. Every confirmed finding is fixed. 734 tests
green (672 + 62 new gates), eslint 0/0, precache 169 entries all on disk.

**Prayer-time correctness (the daily-critical computation):**

1. **Maghrib/Isha past midnight broke everything downstream.** The engine
   wrapped each time to 0–24h independently, so at high latitudes
   (all of Iceland in summer: Maghrib 00:04, Isha 00:28 while Asr was
   18:22) the next-prayer strip said "Fajr" mid-fast, the fasting phase
   flipped to "night" mid-fast, the evening-adhkar window was an empty
   numeric range (never showed all summer), and the SW alert triggers
   fired a full day early. Times are now **day-relative hours** (may be
   ≥24 or <0); `nextPrayer`, `fastPhase`, the adhkar windows, and
   `decimalHoursToDate` all compare/roll correctly across midnight.
2. **Umm al-Qura Isha was ~30 minutes early 11 months a year** — a flat
   90 minutes after Maghrib instead of the official 90-in-Ramadan /
   120-otherwise split. Tehran's Maghrib now uses its own 4.5° convention,
   and the Moonsighting Committee method is labeled as the 18°/18°
   approximation it actually is.
3. **Polar latitudes showed fabricated times as gospel.** Tromsø's polar
   night rendered "Sunrise 11:38 · Dhuhr 11:43 · Maghrib 11:42" with no
   indication anything was special. The engine now exposes per-prayer
   `unreachable` flags and the Prayer view marks fallback rows (*) with an
   honest note naming them and pointing at local authority.
4. **The engine had ZERO tests** — now pinned by a city/date/method matrix
   against an independent NOAA-factsheet implementation (different algorithm
   family), plus Hanafi-Asr magnitude, the midnight wrap, and polar-night
   honesty gates.

**Statistics & calendar honesty:**

5. **`longestDayStreak` double-counted across DST fall-back** (a proven
   3-day run reporting 4 in America/New_York) — the last raw-millisecond
   date walk in the app, now calendar-day arithmetic like the rest.
   **Khatma completion had the same class of bug across spring-forward**
   (the noon-anchor ms division is 23h on a 25h world); both use pure
   calendar-day counting now, and the khatma finish projection no longer
   rounds a day the current pace cannot pay for.
6. **An idle today inflated the longest run by one** until midnight;
   **Laylat al-Qadr was mis-attributed after Maghrib** (the night of the
   27th begins at Maghrib of the 26th — the banner keyed on the raw
   calendar day, so it announced Qadr through day-27 daylight after the
   odd night had ended); **the next Ashura/Arafah was unreachable** by the
   60-day fasting horizon ("none upcoming" while a subscribed fast was
   months away — horizon now spans a full Hijri year); the **hawl
   anniversary follows the tabular Hijri calendar** (a flat 354 days
   drifted ~11 days per 30-year cycle); and the Hijri month-range label on
   the calendar wore today's year on both months across the new year.

**Offline & data integrity (two P0s):**

7. **A failed precache could delete the working app.** The service worker
   "successfully" installed with an empty shell, then its activate handler
   deleted the old (working!) shell cache — leaving the offline-first app
   offline-dead until a fully online session. A failed precache now fails
   the install (the previous worker keeps serving), activate refuses to
   delete old caches while the new shell is incomplete, and the page
   surfaces a real **Retry** toast wired to the worker.
8. **The SW's offline stub bypassed every error+Retry path.** It answered
   `200 OK {"error":"offline"}`, which slipped through `fetchJSON`'s
   `!res.ok` guard — so a cold-cache offline start "booted successfully"
   with empty content, poisoned session caches, and the v4.1 Retry
   machinery never engaged. The stub is now **503** (fetch throws, every
   tier's error state + Retry lights up), the library tier finally joins
   the loadErrors machinery with its own Retry, and `fetchJSON` also
   rejects any legacy 200-stub body defensively.
9. **The entry module was never precached** (v4.0→v4.2): a
   first-visit-then-offline launch served the cached shell HTML but failed
   to load `js/app.js` — a blank app until an online reload happened to
   cache it. The generator now includes the graph root, and a contract
   test pins it. Every manifest icon + the font license are precached too.
10. **Eviction could delete the surah you were reading**: quota-pressure
    eviction dropped the oldest-_inserted_ third with no recency tracking
    (revisiting a cached surah never refreshed its position). Cache hits
    now re-insert the entry, making eviction least-recently-**served** —
    the active surah is never the victim. Background cache writes are
    `waitUntil`-tracked and 206 partial responses can no longer poison
    `cache.put`.

**Runtime & data safety:**

11. **A sustained tasbih session could lose everything.** The persist
    debounce is trailing-edge (200ms), so during continuous tapping no
    write ever landed — closing the app inside the final window silently
    lost the whole burst's counters, statistics, and history. The pending
    save now flushes synchronously on `pagehide`/`visibilitychange`.
12. **Deleting downloaded moshaf audio froze the UI with 114 synchronous
    re-renders** (one dispatch per surah) — now a single batched mutation.
    **Download All runs a 3-wide pool** instead of a strictly sequential
    queue (one slow CDN response no longer stalls a ~1–2GB batch); the
    Stop button still cancels before each new file.
13. **A transient toast could become immortal** when an action toast (the
    PWA update offer) arrived mid-countdown — the pending dismiss timer
    was cancelled and never re-armed. Each slot now owns its timer.
14. The share-card canvas renderer (553 lines used only on explicit share
    taps) loads lazily; the last **ui→domain layer-rule violation** is
    gone (calendar modals receive their Hijri conversion from the caller);
    the static skip-link and bottom-nav landmark labels finally follow the
    app language (they were English-only since v3.x); an unknown route no
    longer titles the tab `title.xyz — Nūr al-Dhikr`; tomorrow's prayer
    times use tomorrow's own UTC offset on DST-change nights; the Qibla
    compass no longer lets a relative reading overwrite an absolute one;
    and a missing `tafsir.title` dictionary key (found by the new contract
    gate — it rendered the raw key as an aria-label) is fixed.

**Test-suite hardening (the meta-fix):**

15. The suite grew +62 tests including **prayer-engine golden values**,
    real khatma-DST and reader-windowing semantics (replacing two vacuous
    v4.2 tests that asserted nothing), and the **contract gates**: en↔ar
    key parity, every `t()` call-site key resolvable, every emitted
    `data-action` resolves to a handler (the dead-UI class that shipped
    twice), version-marker lockstep, core-shell precache completeness,
    Qur'ān corpus ↔ meta verse-count equality, and the CSS release
    protocols. Weak assertions were repaired (a tautological
    `|| true`, a `/4/`-matches-anything regex, a memo test that couldn't
    distinguish cached from recomputed).

---

## v4.2.0 — the second hostile-audit release

A third hostile review wave (four independent audits on NEW angles the
first two waves never covered: runtime lifecycle/leaks, security & data
integrity, interaction-depth a11y, and runtime performance) over the v4.1
tree; every confirmed finding is fixed. 672 tests green (652 + 20 new
regression gates), eslint 0/0, precache 159 entries all on disk.

**Security & data integrity (the stored-XSS class):**

1. **A crafted backup could plant HTML in the live app.** The restore
   sanitizer only shape-checked the slices whose VALUES render as HTML —
   counter pills, the tasbih dial, heatmap counts, bookmark attributes,
   calendar-note form fields. A 3-line hostile backup executing on every
   render. Fixed at the source (restore.js now runs a PERSISTED_KEYS
   **allowlist** — ephemeral slices can no longer ride in through extra
   keys at all — plus per-value int/id/date coercion) and at the sink
   (every render site escapes; `t()` escapes interpolated vars, which also
   closed a **reflected** XSS via the roots search query and the silent
   `$&`/`$1` replacement-pattern bug).
2. **Restored custom reciters could point audio at an attacker's host**
   (the form path validated URLs; the restore path didn't) — servers are
   now http(s)-validated at restore.
3. **DST corrupted earned statistics:** the longest-streak comparison
   (`=== 86400000`) severed runs across every spring/fall boundary; the
   khatma day-index drifted a day on transition days; the heatmap's
   "today" marker used a UTC key (wrong cell every evening in UTC−X).
   All now use calendar-day/noon-anchor math.
4. **Leftover debug instrumentation** was growing `localStorage['dbg']`
   unboundedly in the same ~5MB quota the state persistence needs —
   eventually breaking saveState outright. Removed (and cleaned from
   existing installs).

**Runtime hygiene:**

5. **The modal focus-trap leaked on every modal-on-modal re-open** (tajweed
   drills re-open per word tap): each re-open orphaned a capture-phase
   keydown listener plus the entire detached modal subtree on `document`
   forever, and the focus-restore target was captured from an element
   about to be destroyed — keyboard users landed on `<body>`. Both fixed.
6. **Starting full-surah audio orphaned an active verse-recitation
   session** — a frozen verse console docked over the real playback with
   no pause/seek until the user found "stop recite". One voice now stops
   BOTH consoles; the three back-to-back full re-renders per track start
   are batched into one.
7. **Prayer/Ramadan rollover labels went stale for hours** (the nudge
   fired in the final pre-boundary second, then the next tick jumped
   hours ahead) and **an overnight-open PWA kept yesterday's Hijri date,
   greeting, and "today" rows until the first tap**. Both now dispatch on
   actual target/day change.
8. **A pending search debounce could yank you back to the search view**
   after you'd navigated away within the 180ms window — all debounce
   timers are invalidated on navigation. The hadith worker's blob URL is
   revoked; the custom-adhan blob is released after natural playback
   (previously pinned ~24h); the three lazily-created AudioContexts are
   now one shared singleton (browser cap is ~4–6).

**Performance:**

9. **The hadith reader froze ~1s per keystroke on Bukhari** (7,580 rows ×
   4–6 regex passes per render, on every unrelated dispatch too): haystacks
   are pre-normalized once per book (WeakMap on the doc) — filtering is
   now a plain `.includes()` scan.
10. **The classic Qur'ān reader rebuilt ~1.1MB of HTML per dispatch**
    (Al-Baqarah: 286 cards, ~1,144 inline SVGs; continuous recitation paid
    it once per ayah). The reader now renders a **30-ayah window** with
    honest "show N more" sentinels, recenters on deep links, and slides
    ahead of the reciting ayah automatically. Tajweed classification is
    memoized per ayah (text is immutable); the bookmark-note input is
    debounced; Qur'ān search memoizes the standing query.
11. **Storage write amplification is gone:** every dispatch used to
    serialize the FULL persisted blob (customContent + dailyHistory + …)
    and write localStorage — including ephemeral actions like playback
    ticks and the cheap re-render nudges. Persistence now runs only when
    a persisted slice's reference actually changed.
12. **First visit ran the two biggest network jobs sequentially** (2.2MB
    library download blocking SW registration). The worker now registers
    in parallel, and the pagehide safety net is wired before the await.
13. **The 1,932-line i18n monolith split** into `core/i18n/en.js` +
    `core/i18n/ar.js` + a 45-line loader (both languages load
    synchronously — `t()` never awaits, and a language switch never
    flashes the wrong language).

**UX & accessibility depth:**

14. **The skip-to-content link was a trap** — it routed through the hash
    pipeline, threw the user to Home mid-surah, and showed a spurious
    "error" toast. It now focuses `#main` directly (plus a router guard).
15. **Quiz correctness was color-only** (WCAG 1.4.1): the verdict is now
    announced in words ("Correct" / "Not quite" — EN+AR) with ✓/✗ markers
    on both the right and the wrong choice.
16. **"Download All" (114 files, ~1–2GB) had no stop button** — the cancel
    flag was dead code since v3.x. The button flips to **Stop** while a
    batch runs; everything already saved stays saved.
17. **Big lists got arrow-key navigation** (surah grid: 228 tab stops;
    Mushaf jump drawer: ~150 buttons INSIDE a focus-trapped modal):
    ArrowUp/Down/Home/End rove through `[data-roving]` groups (honest
    group semantics — tiles contain their own buttons, which listbox
    forbids).
18. **Forced-colors (Windows High Contrast) support:** state that lived
    in `color-mix` backgrounds alone (active chips, downloaded cells,
    quiz verdicts, heatmap buckets, legend swatches) falls back to
    borders/underlines/glyphs; information-bearing swatches keep their
    hue via `forced-color-adjust: none`.
19. **Destructive deletes now confirm** (zakat snapshots, reminders,
    bookmark folders), the folder **×** chip meets the 36px touch minimum,
    failure toasts announce assertively (`role="alert"`), the PWA-update
    toast can no longer be wiped by the next "Copied", calendar day cells
    announce localized dates + note markers (was raw ISO keys), the
    tasbih target gets 33/100/500/1000 preset chips + spoken changes,
    form no-ops say why (hadith-jump range, mushaf page NaN), palette
    swatches expose `aria-pressed`, player speed exposes its value,
    tajweed-practice verdicts are announced with a score, remaining
    hardcoded EN strings are localized, and the hifz due-date renders in
    the app locale. Focus-mode Escape no longer double-fires through an
    open modal.

---

## v4.1.0 — the hostile-audit release

A second full hostile review (four independent audits: architecture,
UX/a11y/i18n, CSS design system, PWA/perf/docs) over the v4.0 tree found
~95 genuine defects; every one of them is fixed here. 652 tests green
throughout (651 + a new precache disk-existence gate).

**Ship-stoppers fixed:**

1. **Offline install was silently broken:** two phantom paths in the SW's
   precache list (`js/app/audioStore.js`,
   `js/app/handlers/audioStore.js` — stale flat-layout paths) made
   `cache.addAll()` reject wholesale, leaving a "successfully installed"
   app with an **empty** offline shell. The install now retries once,
   reports failure to the page, and a new test gate asserts every
   precache entry exists on disk.
2. **Custom-adhan import and clear were dead:** two dynamic imports
   resolved to files that don't exist — the feature silently no-opped as
   unhandled rejections. Fixed, and the delegated-event dispatcher now
   catches every handler rejection (toast + named console error) instead
   of letting ~30 async handlers fail invisibly.
3. **The toast system was structurally broken:** the `.toast` wrapper was
   never created, so the PWA-update "Refresh" and fetch-failure action
   buttons were unclickable (`pointer-events: none` on the root), and
   every modal was double-announced to screen readers.
4. **The statistics heatmap layout was destroyed** (the view emitted flat
   children where the CSS expects two 7-column grids — ~38 giant squares),
   and its two hottest buckets failed WCAG AA in light mode (2.8–4.06:1);
   the "NOW" badge failed on 9 of 10 palettes (1.67–2.7:1). All remeasured
   and retuned (heatmap bucket 4 → 92% primary; fixed dark-ink token for
   accent fills).

**Resilience:** every async surface that could show an infinite skeleton
on fetch failure (Mushaf meta/pages, tafsir editions/text, Qur'an surahs,
the search corpus, the reciters catalog) now renders an error state with a
working Retry; the restore sanitizer validates the `history` array (one
`null` entry used to brick every boot); audio download guards are
try/finally; the data cache is **migrated between releases** instead of
wiped (your downloaded Sahihs survive an update); navigations serve the
cached shell first instead of blocking on the network.

**Accessibility:** every settings switch is now a properly-named control
(the whole row is one `<label>` — ~16 nameless checkboxes before), all
search inputs/selects/sliders are labeled, confirm dialogs announce their
title, the Mushaf has one Tab stop per ayah (was two), tafsir tabs support
arrow keys + tabpanel semantics, chips expose `aria-pressed`, charts carry
text alternatives, `document.title` follows the route, modals lock
background scroll, and rapid-tap surfaces (tasbih dial, counter, chips)
can no longer double-tap-zoom.

**i18n/RTL:** AM/PM markers, countdown units, Qibla cardinal letters and
its bearing sentence, the tasbih chips, the last-resort error screen and
the offline page are now fully bilingual; Arabic gets 8-point compass
names; `toLocaleString` respects the app language.

**Performance:** first paint no longer waits for the 2.2MB content
download (theme + static skeleton paint immediately); 13MB hadith books
parse in a Worker (main thread stays responsive); progress bars and the
bar chart animate via transform; zakat inputs debounce per-field; back
navigation restores your scroll position.

**Also:** ~90 lines of dead CSS removed (including keyframes the page-flip
animation referenced but never had — page turns now actually animate, and
the "flip animation" preference is finally honored); 17 dead exports
deleted; `formatBytes`/`clamp`/mm:ss formatters deduplicated into one home;
the Bismillah style setting and calendar White-Day highlight were
name-mismatched against their CSS and never rendered — fixed; the manifest
gains screenshots, a stable id, `minimal-ui` fallback and landscape
support; meta/OG tags and a font preload were added.

## v4.0.0 — the production-hardening release

A full hostile review + architectural refactor. Zero features removed;
651 tests kept green throughout. See ARCHITECTURE.md for the new layout.

**Fixed (found by hostile review):**

1. Corrupted CSS selectors (`aref]` for `a[href]`) made Enter/Space
   activation and the nav-drawer Tab containment **throw** on every use.
2. The delegated `navigate` handler dropped query params — Qur'an search
   results never scrolled to their ayah; the daily-hadith card lost its
   `?n=` jump.
3. The hadith "Jump to №" form was wired to the wrong dispatch path and
   silently did nothing.
4. A stray `>` rendered in the Ramadan explore links.
5. `renderTasbih` read the store directly (impure render); the topbar
   theme icon read the DOM instead of state (desync risk).
6. The search view ran the same query twice per keystroke.
7. Hardcoded English leaked into ~8 bilingual surfaces (not-found
   fallbacks, calendar aria-labels + disclaimer, modal close,
   statistics day-of-week row).
8. Reader fetch failures were console-only — now surfaced with honest
   toasts (auto-retry on next navigation was already in place).
9. **Dark-mode contrast failures:** 19 category colors + 5 quick-action
   tints + tajweed hues were hardcoded with no dark variants (measured
   1.75–3.6:1, WCAG AA failures) — all promoted to tokens with
   brightened dark variants; sub-12px type eliminated; a z-index scale
   replaced 9 magic values.
10. A11y: unnamed progressbars, unlabeled tasbih steppers, tafsir tabs
    without tab semantics, color-only quiz feedback, raw-ISO calendar
    day labels — all fixed with proper roles/labels (EN + AR).
11. `package.json` pointed `validate:data` at a nonexistent test; the
    settings view bypassed the `VIEWS` constant; the docs' hadith count
    was off by 20.

**Restructured:** the 4,222-line `app.js` god-file became 36 focused
modules (composition root, event system, 13 feature-scoped handler maps,
runtime subsystems); the 1,878-line `state.js` became the
`core/state/` package; all 95 modules were reorganized into the
`core / domain / services / ui / views / app` layers; the CSS design
system was rewritten on a token pipeline with mathematical scales; the
docs were consolidated from 3,225 lines of history into this file +
ARCHITECTURE.md + CREDITS.md.
