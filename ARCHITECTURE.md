# Architecture

The standing engineering reference for Nūr al-Dhikr. Read fully before
writing code; if you change an architectural rule, update this file in
the same commit.

**App:** offline-first, installable (PWA), zero-account, zero-server
vanilla ES modules — no framework, no build step. The repo root is the
deployable site (GitHub Pages).

---

## 1. Non-negotiables (break these and the release must not ship)

> **(v5.0.0) The content-authority lens.** The bundled data files are
> IMMUTABLE — every user edit (card fields, deletes, additions,
> reorders, renames, field visibility, hadith management) lives in
> `settings.contentPrefs` and is applied by `domain/contentLens.js`
> at exactly two choke points: the reducer re-derives
> `library.documents` from `library.raw` whenever contentPrefs
> changes, and the derived itemIndex/search index follows via
> stateSub. "Restore to default" is always just deleting override
> keys — never data surgery. Anything that reads content reads the
> LENSED documents; anything that restores reads `library.raw`.

1. **Nothing leaves the device.** No accounts, no analytics, no server
   calls except the small documented CDN set (recitation audio,
   on-demand tafsir). Backend-requiring features are out of scope by
   design.
2. **Religious data comes from trusted, citable sources — or not at
   all.** Every text must trace to a named source (recorded in
   `data/SOURCES.md` + `CREDITS.md`). Never fabricate, paraphrase, or
   "fix" a sacred text from memory; Qur'an excerpts are extracted
   verbatim from `data/quran/`. No truncations ("..." is a defect).
   Order is content — canonical sequences (e.g. Hisn al-Muslim) are
   never reordered or flattened.
3. **Untrusted-input discipline.** Everything from fetch/localStorage/
   IndexedDB/DOM attributes is hostile until validated: shape-check,
   sanitize enums, clamp numbers, range-check ids (surah 1–114, ayah
   1–286), and `escapeHTML()` everything rendered. Content strings are
   data, never markup.
4. **Offline-first honesty.** Lazy network is allowed (load-on-first-open,
   then SW-cached forever) but must say so in the UI. Anything Home shows
   at boot works with zero network.
5. **Bilingual parity.** Every user-facing string ships EN + AR with
   correct `dir`. New features launch in both languages or they don't
   launch.

## 2. Layer map

```
js/
├── app.js                 Entry point (pinned path: the SW-precache gate
│                          and entry-link gate both walk from here).
├── app/                   The application layer (composition + control)
│   ├── boot.js            boot(): mount → hydrate → theme + boot skeleton
│   │                      → load libraries → wire → render (one error
│   │                      boundary; app.js guards the promise too)
│   ├── net.js             Data-fetch layer: fetchJSON, loadLibraries,
│   │                      item index (extracted from boot in v4.1 —
│   │                      boot was the import-graph hub of 7 cycles)
│   ├── stateSub.js        The store's ONE subscriber (guard resets,
│   │                      lifecycles, theme, re-render)
│   ├── events.js          THE single delegated event listener; merges the
│   │                      13 handler maps into one dispatch table
│   ├── handlers/          Feature-scoped click-handler maps, each a pure
│   │                      (dataset, element, event) => void object
│   ├── forms.js           data-form submit handlers
│   ├── inputs.js          data-bind routing (debounced search, zakat live
│   │                      inputs with caret salvage)
│   ├── renderer.js        The patch engine: string views → DOM, diffed
│   ├── drawer.js          Mobile "More" bottom sheet
│   ├── quranData.js       Surah docs + translation overlays (single-flight)
│   ├── quranSearch.js     Full-text Qur'an index build
│   ├── hadithData.js      Hadith index/books/daily/deep links
│   ├── lazyData.js        Every lazy fetch tier's ensure* orchestration
│   ├── audioEngine.js     Player + catalog + offline downloads
│   ├── recitationFollow.js  Follow-along auto-scroll / page flips
│   ├── compassRuntime.js  Qibla sensor lifecycle + smoothing
│   ├── tickers.js         Live countdowns (prayer / Ramadan), probes
│   ├── triggers.js        24h adhan trigger arming with the SW
│   ├── practice.js        Tajweed drill session engine
│   ├── installPrompt.js   beforeinstallprompt lifecycle
│   ├── focusRuntime.js    Focus-mode keyboard + auto-advance timer
│   ├── fullscreen.js      (v4.4) TRUE fullscreen Mushaf side effects:
│   │                      native Fullscreen API (best-effort), screen
│   │                      wake lock (re-armed on visibility), browser-
│   │                      exit sync via fullscreenchange, and the fs
│   │                      control bar's idle auto-fade timer
│   ├── fileImports.js     Backup JSON + custom adhan imports
│   ├── shared.js          getItemEntry + clipboard text
│   ├── quizDeck.js        Quiz deck building (randomness at call site)
│   └── rt.js              The runtime context: every mutable module-scope
│                          variable in one explicit, greppable object
├── core/                  Infrastructure (no domain knowledge; the state/
│   │                      package is the documented exception — see the
│   │                      layer rule below)
│   ├── config.js          Facade: APP_VERSION + re-exports of core/config/
│   │                      (every importer keeps this one stable path)
│   ├── config/            Split from the 1,133-line god-file (v5.2)
│   │   ├── app.js         identity, storage keys, checklists, quiz, offsets
│   │   ├── quran.js       corpus/Mushaf/tafsir/hadith/reciter URLs + editions
│   │   ├── views.js       routes, Mushaf type/paper, grades, themes, defaults
│   │   └── sanitize.js    sanitizeSettings/sanitizeMushafPrefs (XSS boundary)
│   ├── i18n/              UI-chrome dictionary, split per language (v4.2)
│   │   ├── en.js          882 English keys (contract-gated against ar)
│   │   ├── ar.js          882 Arabic keys
│   │   └── (i18n.js       The loader + t()/isRTL() at core/i18n.js — both
│   │       stays at       languages load synchronously so t() never
│   │       core/ root)    awaits and a language switch never flashes)
│   ├── icons.js           Inline SVG icon set (integrity-gated)
│   ├── router.js          Hash router (dispatches NAVIGATE only)
│   ├── schema.js          Content-document validation/normalization
│   ├── migration.js       Legacy JSON shape upgrades
│   ├── storage.js         The ONLY module touching localStorage/IndexedDB
│   ├── theme.js           Applies settings to <html> attrs + theme-color
│   ├── utils.js           Pure helpers (no DOM/state coupling)
│   └── state/             The store package (domain-AWARE: its sanitizers
│       │                  import domain/ modules — the one sanctioned
│       │                  core→domain edge; domain never imports it back,
│       │                  so no cycle. See the layer rule below.)
│       ├── store.js       Store class: dispatch/batch/subscribe/persist
│       │                  (v4.2: persist runs only when a persisted slice's
│       │                  reference actually changed — ephemeral actions
│       │                  never serialize the state blob; v4.3:
│       │                  flushPersist() drains the 200ms trailing
│       │                  debounce synchronously on pagehide/hidden —
│       │                  sustained tasbih tapping used to lose the
│       │                  whole session if the app closed inside the
│       │                  debounce window)
│       ├── initial.js     initialState() + PERSISTED_KEYS + pickPersisted
 │       ├── reducer.js     reduce(): dispatcher over slices/* (same
 │       │                  export + semantics as the old single switch)
 │       ├── slices/        One pure reduce<Slice>(state, action) per area —
 │       │                  shell, library, quran, hadith, worship, audio.
 │       │                  Each returns undefined for foreign actions; the
 │       │                  dispatcher tries them in turn, else returns state.
│       ├── actions.js     Action creators
│       ├── restore.js     Backup/localStorage sanitizer + dry-run (v4.2:
│       │                  PERSISTED_KEYS ALLOWLIST + per-value coercion —
│       │                  the stored-XSS boundary)
│       ├── selectors.js   Derived reads
│       ├── streak.js      Shared streak math (DST-safe day comparison)
│       └── state.js       Package facade (stable import surface)
├── domain/                Pure business logic (no imports above this layer
│   │                      except core) — prayer astronomy, calendar, qibla
│   │                      + WMM2025, tajweed engine, search, khatma,
│   │                      fasting, zakat, worship, hifz, nudge, review…
├── services/              Stateful side-effect modules (audio IDB, player,
│   │                      notifications, speech, backup, editor, share
│   │                      cards, hadith/mushaf data services, tasbih)
├── ui/                    Components: card, shell, modal, toast, menus,
│   │                      emptyState, skeleton, calendarModals
└── views/                 37 pure string-template views (state → HTML)

assets/css/                9 files, strict load order:
                           variables → base → layout → components →
                           cards → quran → animations → desktop →
                           accessibility
data/                      Content corpora (~157MB; see data/SOURCES.md)
tests/                     58 test files + helpers / 845 tests (node --test)
sw.js                      Service worker (precache + SWR data + triggers)
```

**Dependency rule:** `app → core/domain/services/ui/views`,
`views → core/domain/ui` **plus the pure helpers that currently live in
services/** (see below), `domain → core` only — and domain modules may
import each other (calendar/khatma/zakat/prayer form one cohesive
astronomical-arithmetic family; the edges are all pure-function imports
and the graph stays acyclic). `domain/` never imports `app/` or
`services/` and never touches the DOM. `ui/` imports `core` + `ui` only —
the v4.2-era `ui/calendarModals.js → domain/calendar.js` edge was removed
in v4.3 (the caller passes the computed Hijri in). Violations of this
rule are what the layer split exists to prevent.

**Documented v4.2 refinement — `core/state` is domain-aware:** the store
package's slices (`shell.js`/`library.js`/`quran.js`/`worship.js`) and
`initial.js`/`restore.js` import sanitizers and defaults from `domain/`
(tajweedPractice, hifz, fasting, worship, nudge, prayerLog, onboarding,
locations, qada, contentLens) — `core/state → domain` edges that the naive
reading of the rule forbids. This is deliberate and now documented rather
than refactored away: the store is the single trust boundary for hostile
payloads, so its sanitizers ARE domain knowledge, and inverting the
dependency (a sanitizer registry injected from `app/`) would move trust
decisions further from the reducer that enforces them. The invariant that
matters holds: `domain/` never imports `core/state`, so the graph stays
acyclic. If the store ever needs to be reused domain-free, extract the
sanitizers into `domain/` factories and inject them at boot.

**Documented v4.1 refinement — services that are pure:** a handful of
`services/` modules (`mushaf.js`, `hadith.js` data helpers, `checklist.js`,
`calendarNotes.js`, the search half of `audioCatalog.js`, the constants in
`prayerSound.js`) are pure logic that predates the layer split and is
imported by views. The enforced rules that actually keep the graph clean:
views never import `app/*`, services never import `views/*`, and nothing
imports `app/*` except `app.js` and `app/` itself. Migrating those pure
modules to `domain/` is welcome cleanup — do it when you're already
editing both sides, not as a drive-by.

**Documented storage exceptions** to "`storage.js` is the ONLY module
touching localStorage/IndexedDB": `services/audioStore.js` owns a
dedicated IndexedDB for offline audio (kept separate precisely so a broken
audio cache can never corrupt app state), `services/notifications.js`
reads its persisted reminder state, and the last-resort error screen
(`app/drawer.js`) clears the state key directly because the normal app
layers are exactly what may be broken.

## 3. Data flow (one-directional)

1. Views are pure functions `state → HTML string`. No view attaches a
   listener, touches localStorage, or fetches.
2. `renderer.js` swaps views into `#main` through `patchHTML()` — four
   tiers: byte-identical string → assign nothing; changed → child
   reconcile (structural identity match keeps live DOM nodes so CSS
   animations, focus, and scroll survive); focus salvage with caret
   preservation for replaced inputs. Same-view re-renders never animate.
3. Every user interaction flows through ONE delegated listener per event
   type in `app/events.js`: `[data-action]` → merged click-handler map,
   `[data-bind]` → input routing, `[data-form]` → form handlers. Views
   declare behavior as data attributes, nothing else.
4. Handlers dispatch actions into `core/state`. The reducer treats every
   payload as hostile (validate, clamp, or drop). Multi-action gestures
   go through `store.batch()` — exactly one notify + one persist.
5. The store's single subscriber (`stateSub.js`) reacts: applies the
   theme, resets lazy-fetch guards whose data was wiped
   ("whenever the data is gone, the guard is wrong"), triggers lazy
   data loads for the active view, updates lifecycles (tickers,
   compass), and re-renders. Subscriber errors land in the boot error
   boundary — the app never white-screens silently.

## 4. State discipline

- **Ephemeral vs persisted.** Anything large or reconstructable (Qur'an
  text, mushaf pages, tafsir, hadith docs, player, quiz session) is
  ephemeral in `initialState()` and excluded from `PERSISTED_KEYS`;
  persisting multi-MB documents is a defect.
- **The runtime context (`app/rt.js`).** Mutable, module-scope runtime
  state (fetch guards, one-shot latches, pending timers, scroll
  bookkeeping) lives in one explicit imported object instead of hidden
  closures. It is not part of the app state; it describes this session.
- **Restore is hostile territory.** `restore.js` sanitizes every slice
  of a backup/localStorage payload; `dryRunRestore()` exercises the same
  sanitizer for the Settings health check so they can never drift.
  Session-only slices (player, modals, arm status) are stripped.
- **Known compromise:** four Mushaf view transients (flip direction,
  fullscreen anim direction, bookmark folder filter, active tafsir tab)
  are documented single-use module state inside
  `views/mushafReader.js`. Do not add more; if you
  touch that file, consider promoting them.
- **(v4.4) Mushaf-first reading.** The Mushaf (paper-book view) is the
  app's default Qur'an experience; the classic list reader is a peer,
  reachable in one tap from either side. Generic "read the Qur'an"
  entry points (nav items, home quick action, nudge, continue-reading,
  Ramadan/certificate/mutashabihat links) route to `VIEWS.MUSHAF`;
  ayah-level deep links (search hits, tafsir jumps) still target the
  classic reader, which is the better study surface for a single verse.
  TRUE fullscreen is a separate contract from focus mode:
  `state.mushafFullscreen` (ephemeral, not persisted; cleared by NAVIGATE
  away from the book) drives `body.is-mushaf-fullscreen` — the layout.css
  chrome-hiding block — and `app/fullscreen.js` owns the platform side
  effects. The one-shot animation direction is the same single-use
  transient pattern as the page-flip direction.
- **(v4.5) Two-page spread is ONE decision, not a CSS state.** The gate
  lives in `services/mushaf.js` (`mushafSpreadActive(prefs)`): the
  persisted `mushafPrefs.spread` AND a module-level wide-layout flag that
  `app/events.js` sets once at boot from `matchMedia('(min-width:
900px)')` and re-sets on every breakpoint crossing (nudging a re-render
  of an open Mushaf). Views, page-turn handlers, the arrow-key path, the
  swipe path, `ensureMushafData` (which page docs to fetch + which khatma
  pages to mark) and the ayah-tap handler (which facing page carries the
  tapped verse) all ask the SAME function, so a phone can never render
  half a page no matter which path flips first. Page math is pure:
  `spreadRightPage` (odd pages are right pages), `spreadLeftPage`,
  `nextSpreadPage`/`prevSpreadPage` (two-page turns, null at the covers).
- **(v4.5) `readerImmersive` mirrors `mushafFullscreen`'s contract** —
  ephemeral boolean, cleared by NAVIGATE away from `VIEWS.QURAN`, drives
  `body.is-reader-immersive` in the renderer, never persisted. The
  playerbar deliberately stays visible in immersive reading (recitation
  follow-along is reading, not chrome).
- **(v4.5) Text zoom = the font-scale pref.** Pinch (two-finger
  touchmove, preventDefault while owned) and ctrl+wheel (desktop) both
  dispatch `updateMushafPrefs({ fontScale })` clamped to the slider's
  0.6–2.2 range — the type re-wraps (a larger print run), the value
  persists, and the settings slider stays the single source of truth.
  The swipe page-turn handler refuses to fire while a pinch is active.
- **Load-failure flags (v4.1).** `state.loadErrors` maps lazy-data tiers
  (`quran-surah`, `mushaf-page`, `tafsir-text`, …) to a failed flag set by
  the `ensure*` fetches; views render `loadErrorStateHTML` (error + Retry)
  instead of an infinite skeleton. `actions.retryDataLoad(key)` clears the
  flag AND bumps `loadRetryCount` — the guaranteed notify re-runs the
  `ensure*` pass, and the fetch guards were reset on failure, so the retry
  genuinely refetches. (v4.3: the boot-time **library** tier joined the
  machinery — its Retry runs the load pipeline directly through
  `net.js#retryLibraryLoad` — and the SW's offline stub is now HTTP 503 so
  `fetchJSON` actually throws into these paths instead of handing callers
  a 200-OK `{error:'offline'` error document.)
- **Known perf trade-off (deliberate):** views load via STATIC imports —
  all 180 modules arrive before first render. Lazy-loading `VIEW_TABLE`
  would cut first-visit JS by roughly half, but 13 app-layer modules import
  view builders/setters directly (modal builders, `setFlipDirection`,
  `setActiveTafsirTab`, `bookmarkFolderFilter`), so the flip requires first
  extracting the Mushaf/tafsir transient state into a neutral module. The
  service worker precaches everything on first install, so the cost is
  first-visit-only. Migration path documented here so the next refactor
  starts from the right first step. (v4.3 exception: `services/shareCard.js`
  — 553 lines of canvas rendering used only on explicit share taps — is a
  genuine dynamic import; `gen_sw.py` walks dynamic imports too, so it
  stays precached for offline.)
- **Reader windowing (v4.2):** the classic Qur'ān reader renders a
  30-ayah window (module-latch in `views/quran.js`) instead of the whole
  surah — Al-Baqarah is ~1.1MB of HTML per rebuild, and the string-render
  engine paid it on every dispatch (once per ayah during continuous
  recitation). The window recenters on deep links (`?ay=`), slides ahead
  of the reciting ayah, and extends via two "show N more" sentinels.
  This deliberately replaces the `<symbol>/<use>` SVG-sprite refactor:
  windowing cuts the DOM ~10× (which shrinks parse AND reconcile AND
  serialize), keeps inline SVG's patch-engine safety (byte-identical
  children skip reconcile), and needs no new lifecycle. Short surahs
  (median 17 ayahs) render whole and never see a sentinel.
- **Hot-path memos (v4.2):** tajweed classification is memoized by ayah
  text (`domain/tajweed.js` — immutable corpus, WeakMap-free Map bounded
  by 6,236 entries); hadith search haystacks are pre-normalized once per
  loaded book (WeakMap on the doc — restore swaps the doc object, so the
  cache can't go stale); Qur'ān search memoizes the last (query, limit).
- **Prayer times are DAY-RELATIVE hours (v4.3).** `calculateTimes` returns
  each time as hours since midnight of the COMPUTATION DATE, unwrapped
  into [−24, 48): at high latitudes Maghrib/Isha can legitimately be ≥ 24
  (after midnight) and Fajr < 0. Consumers compare directly against
  nowHours-since-midnight, or normalize for display through
  `hoursToClock`/`formatClock`; `decimalHoursToDate` rolls across day
  boundaries. `times.unreachable` flags polar fallback entries — views must
  surface them, not hide them. Golden-tested in `tests/prayer.test.js`
  against an independent NOAA-factsheet reference; do NOT reintroduce a
  per-time `fixHour` — that is exactly the midnight-wrap bug.

## 5. Design system

- **Tokens only.** New colors go through `assets/css/variables.css`
  (raw + `-text` pairs); foregrounds use the `-text` variants, fills use
  the raw tokens. Raw hex in components is reserved for the documented
  exceptions (tajweed mirror values, print).
- **Contrast is gated.** Text tiers hold 4.5:1 on every surface in BOTH
  themes; every palette's primary holds white text and its 50%-white
  mix holds AA on dark surfaces; grade chips hold white at 4.5:1.
  `tests/cssDesign.test.js` recomputes all of this from the CSS.
- **Category/tajweed color systems** are tokenized with dark-mode
  brightened variants (`--cat-*`, `--tw-*`) — never hardcode them.
- **Motion contract** (`tests/motion.test.js`): entrances ≤300ms and
  scoped to `#main[data-view-enter]`; transitions ≤300ms; the only
  > 300ms animations are the two 700ms celebration blooms and the named
  > ambient loops; reduced-motion kills everything globally.
- **Touch targets** ≥44px (`--touch-target`); dense inline targets
  expand hit area via `::after` (see `.chip`).
- **Stacking** uses the `--z-*` scale only.

## 6. Quality gates

```
npx eslint .             # zero errors (js, tests, sw.js — all linted)
npm test                 # 845 tests, all green
npx prettier --check .   # whole tree (npm run check runs all three)
```

Test rules: tests never statically import anything outside the app
directory (the shipped zip has no `scripts/` — a stray import hard-crashes
the whole file); optional out-of-boundary deps are dynamic-imported and
skipped loudly. New modules need unit tests; new data needs integrity
tests. Numbers you quote must come from actual runs.

**Contract gates (v4.3, `tests/contracts.test.js`):** release protocols
that previously lived only in reviewer memory are now executable —
en↔ar dictionary parity (key sets AND placeholder sets) plus every `t()`
call-site key resolvable; every emitted `data-action` resolves to a
registered handler (with an explicit, commented allowlist for the
change-pipeline checkboxes and modal overlay); version markers in
lockstep across package.json/config/sw/manifest; APP_SHELL contains the
core shell AND the entry module AND every manifest icon, with zero
phantom entries; Qur'ān corpus verse counts == `quran-meta` for all 114
surahs; the CSS release protocols (category dark variants, `--z-*` scale
only, 12px type floor, forced-colors block, tap-target minimums); and the
shared empty-state builder. If one of these fails, the fix is almost
never "add it to the allowlist" — it's a real regression.

## 7. Release protocol

1. Bump all five version markers in lockstep: `package.json`,
   `APP_VERSION` in `core/config.js`, `VERSION` in `sw.js`, `version` +
   `version_name` in `manifest.json`, and the README release note.
2. Run the full quality gates; verify the entry-link and SW-precache
   gates specifically (they catch the "app ships blank" and "offline
   install silently fails" classes). Regenerate `sw.js`'s APP_SHELL with
   `scripts/gen_sw.py` when modules are added/removed — it walks the real
   import graph and refuses to emit a precache entry that isn't on disk.
3. Update `data/SOURCES.md` / `CREDITS.md` for any new content.
4. Package the zip: site files at the root, `node_modules/` excluded,
   dotfiles preserved.
5. Never claim a test/audit ran unless you ran it in this session.

## 8. UX bar

- **No flicker.** Tapping anything must not visibly repaint unrelated
  regions — fix the patch engine or batching, not expectations.
- **Focus is sacred.** Typing never loses the caret; drags never cut off.
- **Respect the person.** No streak-shaming, no guilt copy, no
  manipulation. Defaults a scholar would accept (tajweed off by
  default, weak narrations graded honestly).
- **Honest states everywhere.** Every async surface has a skeleton, an
  empty state, and a user-facing failure path (v4.1: error + Retry for
  every lazy tier; toast + retry-on-navigation for the rest). A silent
  failure is a defect.
- **(v4.5) The navigation contract is specified, not vibes.**
  `docs/APP-FLOW.md` is the DFA spec for the whole app flow — routes,
  layers, chrome-removing modes, the transition table, and the eight
  navigation invariants (I1–I8), including the Esc layer order (modal →
  drawer → mushaf-fullscreen → reader-immersive, exactly one layer per
  press) and the azkar tap-anywhere counting contract. New routes/modes
  are added to that file BEFORE the view is written; a view without a
  back path does not ship. `tests/v4.5-flow.test.js` pins the
  machine-checkable invariants.

## 9. History note

v1–v3.27 grew this app feature-by-feature with recurring hostile reviews
(every 4 features) whose findings were fixed at the source and pinned by
adversarial tests. v4.0 is the structural payoff: the god-files were
split into layers, the design system was rebuilt on a token pipeline,
and the docs were consolidated (the 1,974-line CHANGELOG and 534-line
TODO are retired; their residual decisions live in the README's honest
limitations and this file's rules). v4.1 is the second hostile pass —
four independent audits over the v4.0 tree (~95 findings, all fixed),
including two P0s the green test suite could never see: a wholesale-broken
offline precache and two dead dynamic imports. v4.2 hardened runtime
lifecycle, security, and hot paths (~50 findings). v4.3 is the fourth
wave — domain-math correctness (prayer engine verified against an
independent NOAA reference; day-relative hours; the DST class of bug
eliminated from the last two raw-millisecond date walks), a feature-parity
diff against v3.27 (the lock holds — zero losses across all waves), two
service-worker P0s (failed-precache shell deletion; the 200-OK offline
stub that bypassed every Retry path), and the contract gates that make
the release protocols themselves testable. v5.2 is the structural cleanup:
the two remaining god-files were split without moving any public path —
`core/config.js` into `core/config/` (app/quran/views/sanitize) and the
`core/state/reducer.js` action switch into `core/state/slices/` (shell,
library, quran, hadith, worship, audio) behind a dispatcher facade —
plus dependency-hygiene (vendored transitive deps removed from
package.json), SW precache completion, and doc-number corrections.
