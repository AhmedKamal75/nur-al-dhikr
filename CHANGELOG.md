# Changelog

## v3.16.0 — Fork re-union: the four Sunan collections restored + external-review hardening

### The fork, honestly
- Two different builds were both labeled v3.15.0. This line carried the
  **Qur'an translation editions**; a parallel build carried the **four
  Sunan hadith collections** (+19,217 hadith), its own `scripts/hostile-battery.mjs`,
  and adhkar/duas extension-tier work. All four version markers said
  3.15.0 on both, so neither build could disambiguate the other. Following
  the v3.6.0 precedent, the lines are re-united rather than chosen between
  — shipping either alone would have been a real regression of the other's
  verified work.
- **Restored in this release**: Sunan Abu Dawud (5,272), Jami' at-Tirmidhi
  (3,926), Sunan an-Nasa'i (5,679) and Sunan Ibn Majah (4,340) — together
  **+19,217 hadith**, rebuilt independently from the same CC0
  sunnah.com/hadith-api source through this repo's own pipeline and
  integrity gates (1:1 Arabic↔English alignment by hadith number, unique
  numbers, full chapter coverage, markup refusal). The rebuild lands on
  **exactly** the parallel build's verified totals: 15,022 → **34,239**.
  A permanent test gate now locks the 34,239 library total in
  tests/hadith.test.js so this content can never silently regress again.
- **Still pending from that build**: its adhkar/duas extension-tier work
  and any fixes it carried beyond the Sunans — a true code-level merge
  needs that build's zip; recorded as open, not silently dropped.
- Version bumped to **3.16.0** in all four markers so "v3.15.0" stops
  being ambiguous in conversation.

### Fixed — external hostile review (fork-collision review of this build)
- **tests/icons.test.js no longer hard-crashes in the shipped zip.** The
  file had a top-level `import … from '../../scripts/icon-audit.mjs'`;
  the release zip excludes repo-root `scripts/` by design (AGENTS.md
  §4.4), so in the packaged artifact the import died with
  `ERR_MODULE_NOT_FOUND` before a single test in the file ran (440/441 in
  the reviewed build). Fix: the icon gate's single source of truth moved
  **inside the app boundary** to `tests/helpers/icon-audit.mjs` (it ships
  with the app; the gate runs from the extracted zip again), and
  `scripts/icon-audit.mjs` is now a thin shim re-exporting it, so the
  standing CLI command is unchanged.
- **Generalized, not patched one-off** (the review's explicit lesson —
  this was the second occurrence of the defect class): new AGENTS.md §3
  rule — tests must be runnable from the shipped zip; never statically
  import outside the app directory; optional out-of-boundary deps
  dynamic-import and skip loudly.
- **Hadith build gate false-positive fixed**: the markup gate's
  event-handler regex (`\son[a-z]+\s*=`) misread ordinary Zakat prose in
  Ibn Majah #1805 — "even one = then three sheep" — as an `on*=` handler
  and refused the book. Handlers are now anchored to a tag context
  (`<[a-z][^>]*\son[a-z]+=`); dangerous-tag detection is unchanged.
- **Prettier drift paid down to zero**: 45 files (debt had grown 37 → 45,
  against AGENTS.md §3) reformatted in one `npm run format` pass;
  `format:check` is now clean repo-wide.

### Added
- **`scripts/hostile-battery.mjs`** — one command that runs the entire
  standing battery: unit + shipped-data gates, both hostile scripts
  (quran-search, translations), the real-corpus search sanity, the
  tajweed corpus sweep, the icon gate and both CSS audits, with a
  pass/fail roll-up and non-zero exit on any failure.

### Library
- The Ahadeeth library now ships the **six canonical books** — the two
  Sahihs and the four Sunans — plus the two Forties: 34,239 hadith,
  all bilingual (Arabic + English), chapter-indexed, deep-linkable,
  lazy-loaded on first open through the existing SW data rule and cached
  offline forever after. Source notes in About and the library footer
  updated in both languages; provenance in data/SOURCES.md + CREDITS.md.

## v3.15.0 — More Qur'an translations (the last Critical TODO item) + edition-aware search

### Added — four complete translation editions, selectable per person
- Settings → Content Display gains a **Qur'an Translation** picker with
  five editions: English (Sahih International, unchanged default), **Urdu**
  (Fateh Muhammad Jalandhry), **French** (Muhammad Hamidullah), **Turkish**
  (Diyanet İşleri) and **Indonesian** (Kemenag). Each option keeps its own
  native script and names its translator, the same contract as the reciter
  list. All four are open Tanzil-derived corpora (provenance and licence
  notes in data/SOURCES.md + CREDITS.md).
- Architecture: the four editions ship as slim per-surah overlay files
  (`data/translations/{edition}/{surah}.json`, ~5MB total) that merge onto
  the app's own Uthmani corpus at load time — the Arabic text is always
  the app's, only the translation paragraph swaps. The merge happens in
  one place (`loadSurahDoc` in app.js) before state dispatch, so both
  readers, deep links, the mushaf ayah-detail and the tajweed practice
  pool all render the selected edition with zero per-view branching.
  Overlay files ride the existing stale-while-revalidate data rule, so an
  edition works offline after its first open; nothing new is precached,
  and the default English experience is byte-identical to v3.14.
- Urdu renders right-to-left: translation paragraphs are now `dir="auto"`
  (classic reader, mushaf ayah detail, search results) so any edition's
  script direction resolves itself.
- **Full-text search follows the selected edition**: the v3.6 index builds
  from the same surah docs the readers display, so switching editions
  resets the index latch and the next search re-warms in that language
  (already-cached surahs make the re-warm nearly free). Searching in the
  language you read is the honest contract; the Settings hint says so.

### Correctness — edition switches can never leave mixed-language state
- Edition switching is **single-flight**: rapid switching collapses into
  the latest target (no interleaved bulk re-merges fighting over state).
- Every surah doc carries a `translationEdition` stamp; a doc merged while
  an older edition was selected can never be dispatched under a newer one
  (the dispatcher re-merges once against the current setting if the stamp
  disagrees). A missing/failed overlay file degrades to the bundled Sahih
  text per surah — the reader is never blocked or blanked.
- Hard gates (scripts/build-translations.mjs, mirrored permanently in
  tests/translations.test.js): 114/114 files per edition, 6,236 verses,
  per-surah counts 1:1 with the app corpus, sequential verse numbers, no
  empty texts, no trailing truncation, no HTML, and a 2:1 muqatta'at
  sanity string per edition as a bismillah-bleed detector.

### Fixed
- The css-token audit under-reported two v3.14 skeleton tokens
  (`--sk-w/--sk-h` are set inline by JS); the checker's JS-registered
  allowlist now knows them, so the audit reads clean again.

### Notes
- v3.14 shipped with `APP_VERSION` still reading 3.12.0; repaired to
  3.14.0 in that release. All four version markers (package.json, sw.js,
  config.js APP_VERSION, this changelog) now read 3.15.0.

## v3.14.0 — UI/UX Phase C: loading & feedback (skeletons, optimistic taps, optional sound design, empty states)

### Added — skeleton shimmer placeholders for every lazily-loaded surface
- Every surface that fetches on demand used to show a bare text line
  ("Loading…"). Each now shows a shape-mirroring skeleton that previews
  the layout about to land: the 114-surah picker (tile rows), the classic
  reader (ayah cards), hadith books (card lines), tafsir panels (commentary
  lines), mushaf pages (centred RTL ink lines on paper), and the reciters
  catalog (reciter rows). Screen readers get an sr-only "loading"
  announcement, so the shimmer is never the only signal. The shimmer sweep
  and all skeleton motion collapse under both reduce-motion kill rules,
  and the whole system is token-based (`--color-surface-alt` bars +
  `--sk-sheen` highlight) so every theme/palette renders it correctly.

### Added — optional sound design (the Tier-2 item, shipped) + "Sound & Haptics" settings panel
- New `js/soundDesign.js`: everything synthesized in-memory with the Web
  Audio API — zero audio assets, the offline shell stays the same size.
  The Mushaf page-turn is a soft bandpassed noise sweep (paper, not
  alert); the khatma completion chime is a quiet E5→B5→E6 rise, longer and
  calmer than the prayer-alert tones by design. Both are OFF by default,
  individually toggleable, and fire from every flip path (swipe, prev/
  next, recitation follow) so the sound always pairs with the flip
  animation itself. The pre-existing tasbih tick keeps its existing
  `soundEnabled` gate. Gating is explicit and unit-tested; devices without
  a working AudioContext get silent no-ops, never errors — same honest
  autoplay-policy limits as every page sound in this app (sounds need one
  prior interaction, which any tap inherently is).
- Settings gained a dedicated **Sound & Haptics** panel (haptics, sound
  effects, page-turn, khatma chime + an honest note about device/browser
  limits); the two feedback toggles moved out of Accessibility where they
  never belonged.

### Added — optimistic tap feedback
- Press-state scaling on the habit checklist rows and the prayer-log
  cycle buttons (the Phase B press contract, extended to the two surfaces
  where a tap must feel answered before the eye moves), plus the missing
  haptic tick on prayer-log taps — haptic parity with the checklist,
  kept AFTER the dispatch so vibration never lands on a rejected action.

### Added — in-flight download feedback
- A surah-audio download used to leave its grid cell looking dead for the
  seconds a 2 MB fetch takes. Cells now show a spinner via a new ephemeral
  `audioDownloading` store slice (never persisted — a reload simply
  forgets mid-flight work), double-taps are ignored while in flight, and
  batch downloads light up each cell as the loop reaches it.

### Changed — empty states hand you your next move
- New shared `emptyStateHTML()` component: soft icon medallion + honest
  title + one-line hint + optional primary action. Wired into Favorites
  (with a one-tap "Browse the Library"), Collections (hint points at the
  suggestion chips right below), and both no-results states in Search plus
  the reciters catalog (try-different-spelling hints). Everything escapes
  through the standard sanitizer and ships bilingually.

### Fixed — release protocol
- v3.13.0 shipped with `APP_VERSION` still reading 3.12.0 (package.json
  and SW cache were bumped, config.js was missed). Now 3.14.0 everywhere.

### Gates
- eslint clean; prettier clean on the touched scope; 427/427 tests
  (12 new Phase C gates: skeleton bounds/escaping, empty-state escaping,
  sound gating, strict-asBool settings, ephemeral-state round-trip +
  persistence exclusion); css-token-check clean (new `--sk-w`/`--sk-h`
  inline tokens registered, `--sk-sheen` defined in variables.css);
  contrast audit 261 pairs / 0 failing; icon audit PASS (58 referenced /
  0 unknown); motion contract updated with the two new documented infinite
  loops (sk-sweep, dl-spin). Browser smoke test (fresh profile): boot,
  Qur'an list + surah reader, Sound & Haptics toggles persisting, mushaf
  flip with page-turn on, search/favorites empty states, checklist tap —
  zero page errors.

## v3.13.0 — patch engine deep-reconcile (the focus-mode flicker, finished) + icon system upgrade

### Fixed — focus-mode flicker: the patch engine's single-root gap
- **Root cause.** The v3.9 engine reconciled only the TOP-LEVEL children of
  each mount. The focus view renders a single root
  (`<section class="focus">`), and the standalone Tasbih screen a single
  root (`<section class="view--tasbih">`), so any state change inside them —
  above all every counter/dial tap — changed the root's outerHTML, failed
  exact matching, and destroyed + rebuilt the ENTIRE screen. innerHTML
  replacement by another name. On every tap this (1) re-created the
  progress ring's circle, which is born at its final `stroke-dashoffset`
  and therefore JUMPED instead of animating its transition, (2) reset the
  `.focus__scroll` scroll position, (3) cut the `:active` press state
  mid-tap, and (4) restarted the cycle-completion bloom on every tap
  inside its 700 ms window. v3.12 had removed the entrance-animation
  re-run on top of this replacement — the replacement itself stayed.
- **Fix.** The patch engine gained a second, structural matching pass and
  now reconciles RECURSIVELY: children bind first by exact identity
  (byte-identical outerHTML, unchanged behaviour), and failing that by
  STRUCTURAL identity (same namespace + tag + id — deliberately
  class-free, because transient classes like `is-just-completed` appear on
  an otherwise-identical node). A structural match keeps the live DOM node
  and updates it in place: attributes sync (never touching live form
  values — attributes are default state only), then the reconcile descends.
  Result: tapping the counter now touches only the genuinely changed nodes
  — the count text, the ring's `--pct`, the transient class — and the
  ring's `stroke-dashoffset` transition finally animates. The counter
  button, the ring, the scroller and the footer keep their nodes across
  taps. Views with genuinely different roots (loading → content) still
  replace exactly as before, and any reconcile failure still falls back to
  the plain innerHTML assignment, so the engine can only be as safe as the
  old path.
- **Verification.** The matchers and key functions are pure and
  unit-tested (12 new tests in `tests/renderPatch.test.js` — exact-first
  priority, order preservation, no double-binding, namespace separation,
  hostile input), and a browser smoke test asserted node identity across
  taps: same `<section>`, same `<circle>`, count updating, scroll kept.

### Added — icon system upgrade
- **Standing integrity gate** (`scripts/icon-audit.mjs` +
  `tests/icons.test.js`): every name the app can reference — static
  `icon('…')` calls, ternary first arguments, `icon:` map values, the
  exported `PRAYER_ICONS`/`STEP_ICONS` maps, and `"icon"` fields in the
  top-level data JSON — must resolve to a defined glyph or alias. A typo
  used to ship silently as the blank-square fallback; now it fails lint,
  the test suite and the standalone audit.
- **Aliases, not duplicates.** `food` and `rain` were byte-identical
  copies of `utensils` and `cloud-rain`; they are now explicit ALIASES
  entries (data files keep their names, the drawing exists once). The gate
  fails if duplicated path data ever reappears.
- **Dead code out.** `sunset` carried an invisible `opacity="0"` path
  (copy-paste leftover); removed — and the gate now rejects dead markup.
  The unused `hasIcon` export (zero call sites since introduction) is
  gone.
- **Conventions documented** in `icons.js` itself: 24×24 stroke geometry,
  explicit opt-out for solid shapes, aliasing over duplication, no dead
  markup. `PRAYER_ICONS` and `STEP_ICONS` are exported so the gate can see
  them. Current coverage: 58 referenced names, 61 defined glyphs, 2
  aliases, 0 unknown, 3 genuinely unused (a small reserve: bead, folder,
  volume-x).

## v3.12.0 — UI/UX modernization Phase B: motion & micro-interactions

Second landing of the UI/UX program (TODO "Phase B"): purposeful motion,
built ON the v3.9 patch engine rather than fighting it. Everything is
sub-300ms unless explicitly allow-listed, everything honours
`prefers-reduced-motion`, and nothing animates "just because" — the Mushaf
keeps its calm, the readers stay distraction-free, the chrome around them
moves well.

### CRITICAL FIX — the app has been blank since v3.10
- **`resolvePage` was imported but never written.** v3.10's follow-along
  recitation added an import of `resolvePage` from `js/mushaf.js`; the
  function itself never made it into the file. A missing import is a
  module-LINK failure: the entry module (app.js) never evaluated, and the
  app rendered an empty shell — on the deployed Pages build and in the
  shipped zips. It slipped through because every prior import gate
  exercised the view graph only, never app.js itself. Fixed here
  (restored as a defensive pure resolver over the build-time ayah→page
  map), covered by unit tests with the v3.10 build-gate spot checks
  (1:1→1, 2:255→42, 114:6→604), and — so this class of defect can never
  ship again — a new gate, `tests/appEntry.test.js`, imports the REAL
  entry module in a child process and fails the release on any link
  failure. Verified: with the export temporarily removed, the gate fails;
  with it present, the app boots and renders (browser smoke test).

### Added
- **One-shot view entrance that can never re-flicker.** The `.view`
  entrance animation used to ride on the class itself, so any re-render
  that replaced a view's root (every content-changing tap inside
  single-root views) re-ran it — a subtle cousin of the v3.9 "F5
  refresh" defect. renderer.js now stamps a transient
  `data-view-enter` attribute on `#main` ONLY on genuine navigation and
  removes it ~350ms later; CSS keys the entrance on that state. Verified
  live: navigation animates once, same-view re-renders never re-animate.
- **Reusable celebration micro-interaction (`js/celebrate.js` +
  `.celebrate`).** The tasbih cycle-completion bloom generalized into a
  transient timestamp registry (`markCelebration` / `wasCelebrated`) and
  a CSS bloom. New sites: the khatma completion verdict (derives its
  freshness from the persisted `completedAt` stamp the reducer already
  writes exactly once), the 99-Names quiz result screen, and the
  prayer-log streak badge the moment a day's fifth prayer lands. The
  class disappears after the window, so later re-renders are silent by
  construction; tasbih.js now delegates to the shared registry.
- **Press states on the shared chrome.** Nav items and interactive chips
  get a consistent 0.98 `:active` scale (the buttons, tiles and counters
  already had their own); scale is symmetric so RTL needs no mirroring.
- **Motion contract gates** (`tests/motion.test.js`, 21 tests): the
  viewIn rule must stay scoped under `[data-view-enter]`; every
  animation/transition duration is bounded (≤300ms) except the two
  named celebration blooms and the documented ambient loops; the
  reduce-motion kill rule must remain; flip/drawer spring curves are
  pinned.

### Changed
- **Mushaf page-flip is spring-tuned.** The flip now starts a touch
  deeper (10°/0.96/0.35) and settles on the app-wide spring curve, so
  the page lands like paper. `will-change` moved off the base page
  element onto the animating classes only — a permanent compositor
  layer on a full page of text was memory for nothing.
- **Bottom-sheet physics for the mobile drawer.** The sheet arrives on
  the spring curve (confident settle) and leaves on the standard curve
  (a bounce-out reads as the sheet refusing to leave).

## v3.11.0 — UI/UX modernization Phase A: design-system foundations

First landing of the UI/UX modernization program (TODO "Phase A"): the
token/contrast/focus/touch layer under every surface. Nothing flashy —
this is the release that makes everything above it consistent.

### Added
- **Foreground color variants (`--color-primary-text`, `-accent-text`,
  `-danger-text`, `-success-text`, `-warning-text`).** The rule now is:
  fills/backgrounds use the raw tokens, every FOREGROUND (color, fill,
  stroke, border-color of active states) uses the `-text` variant. In
  light mode they are identical values — zero visual change; in dark
  mode the variants are brightened so brand links, nav-active items,
  ayah numbers, progress rings, the qibla needle and semantic messages
  hold WCAG AA (4.5:1) on every dark surface, for EVERY palette.
  Previously all ten palettes failed AA in dark mode (emerald 3.5:1,
  midnight 1.1:1 — effectively invisible).
- **Two new standing audits + a permanent test gate:**
  `scripts/css-token-check.mjs` (every `var()` must resolve — the v3.9
  hadith styles shipped with undefined `var(--radius)` /
  `var(--transition-fast)` and rendered unstyled for a release),
  `scripts/css-contrast-audit.mjs` (261 semantic pairs across
  light/dark/AMOLED × all palettes, now 0 failing), and
  `tests/cssDesign.test.js` (10 gates) so none of this can regress.
- **Selection-ring tokens** (`--ring-primary`, `--ring-accent`,
  `--ring-inset-primary`): the hand-rolled `0 0 0 2px color-mix(…)`
  halos scattered across five files now share one treatment.

### Fixed
- **Focus-ring pill-snap:** the global `:focus-visible` rule forced
  `border-radius: 4px`, so pill buttons and round icons snapped to
  squares whenever keyboard-focused. Removed — the outline now follows
  each element's own radius — and the ring color uses the dark-tuned
  foreground token so it stays visible on dark themes.
- **Search bar keyboard focus was invisible** (the input suppressed its
  own outline inside the pill): the pill now glows via `:focus-within`.
- **Hadith surfaces had no radius and no hover transition** (the
  undefined-token bug above).
- **Hadith/Arabic text ignored the user's font-scale settings:** raw
  rem sizes in the v3.9 styles now derive from `--fs-*` tokens and
  Arabic sizes from `--arabic-font-scale` (hadith cards, word-study
  rows, mushaf font sample, bismillah sample, recite counter…).
- **Palette AA fixes:** ivory primary stone-500 → stone-600 (4.17:1 on
  surface-alt chips) and amber primary amber-700 → amber-800 (4.36:1);
  both picked by the audit, both one step on their own Tailwind scale.
- **Elevation finally has a third layer:** modals and the nav drawer
  render on `--color-surface-raised` with `--shadow-lg` — both tokens
  existed since v1 but were never used, so dark-mode sheets sat flat on
  same-colored pages.

### Changed
- **Touch targets to the 44px token** (`--touch-target`): icon buttons
  40→44, player play button 40→44, compact icon buttons keep a 32px
  visual with a transparent hit-area pseudo-element, chips and tafsir
  tabs keep their visual size with vertical-only hit expansion (adjacent
  chips never overlap), switch, swatches, small buttons, segmented
  buttons, reciter rows, download cells, jump inputs, adhan chips,
  mushaf topbar title / paper swatches / jump rows, back-links, nav
  links, counter pills. In-text targets (mushaf words, ayah spans,
  practice letters) rely on the WCAG 2.5.8 inline exception — their
  2.35 line-height already yields ~50px effective height.
- Spacing scale gained `--space-1_5` (6px); radius scale gained fixed
  `--radius-xs` (4px) for inline micro-details that must not change with
  the shape setting.

## v3.10.0 — Continuous follow-along recitation (the last Critical item)

### Added
- **"Listen to the whole surah, follow along" in both reading modes.**
  A new recitation session engine (`js/surahPlayback.js`) plays a surah
  verse-by-verse through the app's single per-ayah audio element with
  automatic advance:
  - **Classic reader:** "Recite surah" in the surah header; the reciting
    ayah is highlighted (`ayah-card--reciting`) and — with the new
    persisted **Follow** toggle on — auto-scrolls into view verse by verse.
  - **Mushaf reader:** the same control sits in the topbar; the reader
    FLIPS to the page holding the reciting ayah (across page turns) and
    tints the ayah in place. This needed something the codebase openly
    lacked — a global ayah→page map — so `mushaf-meta.json` now ships an
    `ayahPages` index built and gate-checked by
    `scripts/build-mushaf-ayah-pages.mjs` (all 6,236 ayahs, spot-checked
    against known pages: 1:1→1, 2:255→42, 114:6→604).
  - **Player bar:** doubles as the recitation console — pulsing indicator,
    live ayah counter (N/total), follow toggle, stop.
  - **Behaviour:** surah-scoped sessions (the last ayah ends it — the
    standard), one-voice both ways (full-surah player / single-ayah /
    session each stop the others), follow persists in settings and is
    hostile-input-sanitized, verse-load failures stop gracefully with an
    honest toast (nothing hangs, nothing pretends).
  - **Engineering:** the engine is a pure state machine over a swappable
    audio driver — `tests/surahPlayback.test.js` simulates complete
    surahs, stale `ended` events, restarts, failures and hostile inputs
    without any audio device. Recitation playback now exposes an
    `onPlaybackEnded` seam instead of the UI polling.

## v3.9.0 — Ahadeeth library, adhkar overhaul, and the universal anti-flicker render engine

Three owner-reported issues closed, plus the standing AI system command.

### Added
- **The Ahadeeth library.** A full new section of the app: Sahih al-Bukhari
  (7,580 hadith) and Sahih Muslim (7,360) complete in Arabic + English,
  plus the Forty Hadith of an-Nawawi (42) and Forty Hadith Qudsi (40) —
  **15,042 authentic hadith**, chapter-indexed from the classical book
  divisions. Book grid → chapter chips → paginated reader (20 per page),
  in-book search that folds diacritics on both sides, jump-to-number,
  deep links (`#/hadith/bukhari?n=7544`) with the target card
  highlighted and scrolled to, one-tap copy of Arabic + translation +
  citation. A "Hadith of the day" card on Home rotates deterministically
  through the two small precached books (never the multi-MB Sahihs).
  Texts are public-domain (sunnah.com) obtained via the CC0
  fawazahmed0/hadith-api dataset; the build pipeline enforces 1:1
  Arabic/English alignment, drops the 212 non-hadith intro placeholders,
  and gates against markup payloads, duplicates and unreachable rows.
  Nawawi + Qudsi + the book index are service-worker precached; the two
  big Sahihs fetch on first open and stay offline forever after — the
  same honest on-demand contract as the remote tafsir volumes. (The
  Forty of Dehlawi was deliberately not shipped: its Arabic dump uses
  Urdu orthography, visually inconsistent with the rest of the app.)
- **The standing system command for AI assistants.** `AGENTS.md` at the
  repo root: the non-negotiables (nothing leaves the device; religious
  content only from named trusted sources, complete, untruncated, in
  canonical order; validation gates; untrusted-input discipline), the
  architecture rules (string rendering, patch engine, batching, lazy
  data tiers, bilingual parity), quality gates, the release protocol,
  and the recurring audit checklist. Surfaced in-app from About → "For
  AI assistants" so any LLM that opens the deployed site can read it.
- **Daily data gates for the adhkar library** (`tests/adhkar-gates.test.js`
  + the build pipeline): zero truncation markers, zero duplicate texts
  within a category, sequential ordering, canonical anchor positions,
  and Qur'an excerpts byte-equal to the app's own Qur'an corpus.

### Fixed
- **The "F5 refresh" flicker on every tap (universal fix).** Root cause:
  every state change reassigned `innerHTML` on topbar, nav, main and the
  player bar even when the new HTML was byte-identical — restarting CSS
  animations, re-decoding images, dropping input focus, and re-creating
  the tapped control. renderer.js now uses a three-tier patch engine:
  (1) identical output → assign nothing at all; (2) changed output →
  top-level child reconciliation, so untouched subtrees keep their live
  DOM nodes (their animations, scroll, and focus survive); (3) focus
  salvage for form fields inside replaced subtrees (search-as-you-type
  keeps its caret). The matcher is a pure, unit-tested function; the
  engine degrades to plain innerHTML on any reconcile failure.
- **The adhkar library data overhaul** ("the azkar are jumbled up… go
  over every and each one"). The audit found 116 paraphrased
  duplicates layered over the Hisn-al-Muslim core, Ayat al-Kursi cut
  mid-ayah, "Surah al-Mulk (full)" holding exactly one verse,
  transliteration text sitting in the Arabic field, ~60 fields ending
  in "...", and canonical sequences ignored. Rebuilt end-to-end:
  Qur'an extracts are now byte-identical to the app's own corpus
  (al-Mulk ships complete), every translation and transliteration is
  completed, duplicates are merged, and morning/evening/post-prayer/
  sleep/wake-up follow the canonical Hisn al-Muslim order. 168
  verified records, each with reference, repetitions, and virtue notes.
  Item ids of surviving records are unchanged, so existing counters and
  favorites for those items keep working; references to the 116 dropped
  duplicates are pruned by the app's existing dangling-ref cleanup.
- `APP_VERSION` in config.js had drifted (still 3.6.0 while the package
  was 3.8.0) — all four version markers now move together.

## v3.8.0 — Real Adhan at prayer time

The TODO list's top Critical item, closed.

### Added
- **A real, vocal call to prayer at prayer time.** The Prayer screen's
  alert panel now offers **Adhan / Tone / Off**. The bundled recording is a
  full-length (2m34s) **public-domain (CC0)** adhan from Wikimedia Commons
  (`assets/audio/adhan/`, provenance + license in `CREDITS.md`,
  loudness-normalized, MP3 so iOS Safari plays it too), precached by the
  service worker — it works offline like everything else in this app.
- **Bring-your-own muezzin.** Each variant slot (Standard, Fajr) accepts a
  user-imported recording: MP3/M4A/OGG/WAV, ≤8 MB, magic-byte validated,
  stored offline in the existing audio IndexedDB. No Fajr-wording adhan
  with a clean license exists to bundle, so the Fajr slot falls back to
  the standard recording until the user imports one — stated plainly in
  the UI rather than hidden.
- The settings **Test button now previews exactly what a real alert would
  play** (Fajr-flavored, so you hear your Fajr variant when one exists).
- The resolution logic is a pure, fully unit-tested function
  (`resolveAlertSource`): mode → tone id / custom-Fajr → custom-standard
  → bundled, with hostile settings degrading safely instead of throwing.

### Honest limitations (unchanged platform reality)
Page-audio fires only while the tab is open and after the user has
interacted with the app at least once this session (browser autoplay
policy). When the tab is closed, the system notification still uses the
platform's own default sound — tracked separately under prayer-alert
reliability in TODO.md.

### Also
- Zip-container note (no content change): v3.7.0's archive ships files at
  the archive root rather than inside a `nur-al-dhikr/` wrapper and at
  maximum deflate, so its *compressed* size is smaller than v3.5.0's even
  though its *uncompressed* payload is larger (+87 KB of features/tests).

## v3.7.0 — the tap-a-word Tajweed inspector + meem-sakinah completed + counter polish

### Fixed
- **Tasbih counter**, three long-standing irritations reported directly:
  - One tap no longer re-renders the whole app three times. A tap dispatches
    counter + statistics + history; these now run as ONE batched store update
    (`store.batch()`), so the view redraws exactly once. The batching
    primitive is general — any future multi-action gesture gets the same
    behavior for free.
  - Target-1 zikrs finally *show* their completion: the ring blooms and the
    hint line lights up for ~0.7s (`wasJustCompleted()`), because the count
    reset to 0 is correct but was indistinguishable from "nothing happened".
  - Auto-advance can no longer skip to the item AFTER next. Each completion
    armed an anonymous, never-cancelled timer; two quick completions armed
    two timers, and the second fired after the first had already navigated.
    One pending timer exists now, and it re-checks the exact item/view before
    acting, so a stale timer can never yank you away.

### Added
- **Tap-a-word Tajweed inspector** (both reading modes). Tapping a word in
  the word-study popover now shows, for THAT word, every recitation rule
  that applies — each with its legend color, bilingual name, the letter(s)
  involved, and a plain "what to do with your mouth" instruction — computed
  live by the same classifier that colors the reading view, so the two can
  never disagree. Honored as a Mushaf Display toggle (default on).
- **The meem-sakinah family** completes the classifier's rule set
  (`js/tajweed.js`): Izhar Shafawi, Idgham Shafawi (mutamathilayn), and
  Ikhfa Shafawi, using the same bare-letter-implies-sukun convention the
  noon family already established. Full-corpus verification: +8,251 rule
  instances (6,948 / 822 / 481), zero crashes, zero out-of-range spans,
  total now 89,907 across all 77,429 words. Closes the known gap TODO.md
  documented since v3.4.
- **Bismillah presentation settings** — the reported contrast bug: on light
  papers the Basmala could vanish. The Mushaf's Bismillah now follows the
  paper's own ink by default (auto), with new Mushaf Display choices:
  Gilded (deep-gold gradient, brightened on dark papers), Accent color, or
  Hidden. Works in both reading modes.
- Practice pools regenerated for all **18** rules with the deterministic
  surah-spread picker — every rule now has 25 real Qur'anic ayahs
  (madd_6 was short at 12), and Mixed Practice draws from all families
  including the new shafawi ones. All entries verified end-to-end through
  the live answer-key path.

### Data & sourcing note
The "verified standard dataset" question keeps resolving the same way:
third-party Tajweed annotation tables (e.g. character-offset sets over
Tanzil text) measurably misalign against THIS app's own Uthmani source
(~17% at full-Quran scale when checked in v3.4) — wrong for a feature whose
whole point is showing the exact letter to pronounce. The rules are
therefore derived mechanically from this app's own text, with each rule's
conditions taken from the classical descriptions (noon/meem sakinah
categories, qalqalah letters, madd types). Every new classification is
sanity-probed against textbook examples before it ships.

## v3.6.0 — Qur'an full-text search + the branch reunion

This release reunites two lines that had silently forked — this v3.5.x
line and the parallel security/QA line (review v3.3 B/A fixes +
walkthrough v3.4 W fixes) — into one honest baseline, then closes the
single biggest study gap the TODO list had flagged.

### Reunited
- All hardening from the parallel security/QA branch is restored here:
  input validation, storage schema guards, notification edge cases,
  escape audits across dynamic render paths. **278 tests green** on this
  baseline (up from 265), including a dedicated hostile-input battery for
  everything new in this release.

### Added
- **Full-text search across the entire Qur'an**, in the global Search
  view — Uthmani Arabic (diacritic-insensitive) plus the bundled Sahih
  International translation.
  - The index is built once from whatever surah documents are already
    loaded plus one batched fetch of the rest (~2.7MB of local JSON that
    the service worker caches as it passes through), so every later
    search works offline forever; while it builds, the view shows an
    honest loading state instead of pretending nothing happened.
  - Ranking keeps the library search's honesty rules: AND semantics over
    all terms, exact-phrase hits strongly outrank scattered-term hits,
    Arabic and translation weigh equally.
  - Result rows jump straight into the per-surah reader via
    `#/quran/N?ay=A` deep links that auto-scroll to the ayah and tint it
    once arrived (repeated gently across renders until the surah doc is
    in flight-then-loaded, with a silent give-up so nothing wedges).
- **Alef-elision matching** (`js/quranSearch.js`). The bug the first
  sanity sweep caught: Uthmani orthography and what a person actually
  types disagree about *where alefs sit* — dagger-alif words like
  إِلَٰهَ are typed اله or إلاه, hamzat al-wasl comes and goes — and one
  inter-letter alef of delta breaks substring matching, with regex
  "optional alef" patterns failing in one direction or the other. The
  fix deletes every alef from both the Arabic haystack and each query
  term identically: symmetric by construction, O(1) per term, no
  backtracking, and the English translation haystack is untouched by
  any of it. Pure-alef tokens (a lone "ا") are ignored rather than
  allowed to veto real matches — but a query made entirely of them
  returns nothing, like any other no-op query.
- A hostile-input battery (`scripts/hostile-quran-search.mjs`, not
  shipped): XSS vectors through query echo, prototype-pollution-shaped
  surah keys, 50k-char queries, combining-mark floods, astronomic ayah
  numbers, poisoned documents — nothing throws, nothing leaks, worst
  realistic multi-term search stays sub-millisecond.

### Known gaps (tracked in TODO.md)
Tafsir-library text isn't searched yet (deliberately deferred); result
rows show raw ayah text without inline match highlighting.

## v3.5.0 — Tajweed practice mode + a Tier 2 delighters roadmap

### Added
- **Tajweed practice/drill mode.** "Find every [rule] in this ayah" — tap
  the letters, check the answer, see exactly which were correct, missed,
  or wrong, then go again. Built on the same deterministic classifier
  (`js/tajweed.js`) that colors the reading view, so the quiz can never
  disagree with what the app itself would color.
  - **Practice This Ayah** — a one-tap shortcut on whatever ayah is
    currently open, quizzing on every rule present in it. The "check
    what I just read" loop.
  - **Dedicated practice picker** (from Mushaf Display settings) — choose
    a specific rule or Mixed Practice, drawing from a curated pool of 25
    ayahs per rule (`data/tajweed-practice.json`, mined offline from the
    classifier itself — see `js/tajweedPractice.js` for the pure
    scoring/pool logic). Shows per-rule accuracy and a streak.
  - Persisted stats (`tajweedPracticeStats`), zero server, zero accounts.
- **`TODO.md`** gained a new **Tier 2 — delighters** section: small,
  non-obvious touches (a root-family browser, a shareable ayah card, a
  worship "year in review," a real Home-screen "continue" button, and
  more) distinct from the Tier 1 critical-gap list — the kind of thing
  that makes an app someone's favorite rather than merely complete.

## v3.4.0 — Tajweed color-coding

Color-coded Tajweed rules on the Qur'an text itself, in both reading
modes, via a from-scratch deterministic rule engine rather than a
third-party annotation dataset (see below for why).

### Added
- **`js/tajweed.js`** — classifies every word's Tajweed rules directly
  from this app's own Uthmani text: hamzat al-wasl, lam shamsiyyah,
  qalqalah, ghunnah, the noon-sakinah/tanween family (iqlab, idgham with
  and without ghunnah, ikhfa), and madd (natural, badal, silah/ha'
  al-kinayah, muttasil, munfasil, and the muqatta'at's obligatory 6-count
  madd). Verified across the entire Qur'an: 81,656 rule instances over
  all 77,429 words, zero crashes, zero out-of-range spans.
- A **Tajweed color-coding** toggle in Mushaf Display settings, with a
  bilingual color legend, working in both the classic reader and the
  Mushaf. Off by default so first-time readers see plain text.
- Dark-paper contrast handling (Night/True Black Mushaf themes brighten
  the palette automatically).

### Why not the obvious open dataset
The natural starting point (cpfair/quran-tajweed, character-offset
annotations over Tanzil's Uthmani text) drifted out of alignment with
this app's own text by roughly 17% once checked across the full Qur'an —
Basmala-prefixed offsets on every surah's first ayah, differing tatweel/
sukun glyph choices, etc. For a feature whose entire purpose is telling
someone which letter to pronounce how, "usually right" isn't good enough,
so the rules were reimplemented as a rule engine running directly against
this app's own text instead — it can't misalign by construction. That
investigation surfaced a genuinely interesting fact along the way: this
Uthmani text source writes several very common particles (مِنْ etc.) with
the sukun left implicit, and separately uses a combining "madda" mark to
explicitly flag every madd point in the text — including on the bare
consonants of the muqatta'at (disjointed) letters, e.g. الٓمٓ. The
classifier leans on that signal directly rather than re-deriving it.

### Known gaps (tracked in TODO.md)
Meem-sakinah rules (ikhfa/idgham shafawi) aren't classified yet, and a
few rare Qur'anic annotation marks aren't individually interpreted.

## v3.3.0 — Word-by-word grammar study + multi-source tafsir + Mushaf display settings

A full study layer for the Qur'an reader, in both the classic list view and
the 604-page Mushaf: tap any word for its root, case ending (i'rab),
verb-form/pattern (sarf), and an English gloss; read up to 15 tafsir and
grammar sources per ayah; and customize the Mushaf's typeface, paper color,
text size, and page-turn animation. Everything below is bundled on-device —
nothing here requires a network connection except the explicit "download
this tafsir" action described below.

### Added
- **Per-word grammar popover** — tap any word in either reading mode.
  Shows the word's root, part of speech, i'rab (case/mood — مرفوع / منصوب
  / مجرور / مجزوم), sarf (verb form & pattern, participle type), an
  English gloss + transliteration, and up to 8 other ayahs where the same
  root occurs (real Qur'anic usage rather than an invented example
  sentence). Covers all 77,429 words of the Qur'an. Bilingual (Arabic +
  English) throughout. Toggle in Mushaf Display settings.
- **Multi-source tafsir panel**, tabbed, opened from any ayah:
  - Bundled, fully offline: **al-Muyassar, al-Mukhtasar, al-Jalalayn**
    (tafsir); **al-Jadwal fī I'rāb al-Qur'ān** (i'rab + sarf + balagha +
    fawa'id, sectioned per ayah), **al-I'rāb al-Muyassar**, **Tahlīl
    Kalimāt al-Qur'ān** (per-word sarf breakdown), and **al-Muyassar fī
    Gharīb al-Qur'ān** (unusual-word glosses).
  - On-demand, one tap to download and then permanently offline: **Ibn
    Kathīr, al-Qurtubi, at-Tabari, al-Baghawi, al-Waseet, Tanwīr
    al-Miqbās, as-Sa'di,** and **ad-Darwīsh's I'rāb al-Qur'ān**. These are
    classical multi-volume works (Tabari and Qurtubi alone run 100MB+
    across the whole Qur'an) too large to ship by default; downloading is
    a single explicit tap per edition and is cached forever afterward,
    exactly like the existing reciter-audio flow.
- **Mushaf display settings** — a dedicated panel: 3 typefaces (Amiri
  Quran, Amiri, system Arabic), 8 paper color themes (Ivory, Sepia,
  Parchment, Pure White, Mint, Rose, Night, True Black) independent of the
  app's own light/dark theme, text-size and line-spacing sliders, and a
  page-flip animation on next/prev/swipe navigation (respects `prefers-
  reduced-motion` and its own on/off toggle).
- The classic surah-by-surah reader gained the same word-tap popover and a
  per-ayah Tafsir button, so both reading modes share one study experience.

### Data & attribution
New on-device data: `data/quran-words/` (per-surah word morphology,
derived from the Quranic Arabic Corpus), `data/quran-roots.json` (root
occurrence index), `data/tafsir/` (bundled editions above) and
`data/tafsir-editions.json` (full catalog incl. on-demand editions). See
each file's source tafsir for original authorship; full attribution is
owed to the Quranic Arabic Corpus, the quranwbw.com word-by-word dataset,
and spa5k/tafsir_api for the tafsir texts.

## v3.2.0 — Second adversarial review: import safety, honest reminders

A second two-hat adversarial review covering every subsystem (calendar,
zakat, backup/restore, editor, search, tasbih, focus, readers,
notifications, storage, mobile layouts) — see REVIEW-v3.1.0.md, shipped
alongside. All must-fix and should-fix findings are in this release.

### Fixed
- **Importing a backup bricked the Qur'an and Mushaf readers for the
  rest of the session** *(A1/B3, critical)*. `RESTORE_STATE` resets the
  ephemeral quran/mushaf slices, but the lazy-fetch "started" guards
  lived in module scope and stayed true — so after an import (or
  "Reset app data") both readers showed "Loading…" forever, with no
  error and no hint that a reload would fix it. The guards now reset
  whenever the corresponding state is absent, so the readers always
  recover on the very next navigation. Reproduced deterministically
  before the fix; verified gone after.
- **Import replaced all data with zero confirmation** *(A2/B1,
  critical)*. Picking the wrong file wiped favorites, streaks,
  statistics, and settings instantly with a cheerful "Done". Import now
  shows an explicit warning ("Importing replaces everything currently on
  this device… This cannot be undone.") and requires confirmation.
- **The audio download registry lied after import** *(A3/B2)*. The
  registry rides inside backups, but the IndexedDB blobs do not — after
  importing on a new device, the grid showed surahs as downloaded, the
  player badged "offline", and "Download All" skipped them while
  playback silently fell back to streaming. The registry is now always
  cleared on restore: what didn't travel can't be claimed.
- **Storage-quota failures were silent** *(A4)*. A failing
  `saveState()` was swallowed by the debounced persister — the app
  appeared to save while every write was lost. A one-time toast now
  says persistence is broken for this session.
- **Reminders had no missed-minute catch-up** *(A5)*. The scheduler
  matched the exact wall-clock minute on a 30s tick, so a throttled or
  briefly suspended tab simply never fired the reminder. All reminder
  classes (habits, calendar notes, prayer alerts, Ramadan suhoor/iftar)
  now fire within a 2-minute catch-up window — late instead of never,
  still deduped per day, and never before their time.
- **The checklist reducer accepted forged item ids** *(A7/B4)*: a
  crafted `data-item` stored arbitrary garbage rows (including a literal
  `__proto__` key). Now guarded to known checklist ids, like the prayer
  log already was.
- **Four mangled log strings** *(A6)* — `console.error('ushaf] …')`
  missing its `[m` — made mushaf failures unsearchable in the console
  and hid a real defect during this very audit. Fixed.

### Verified clean in this review (regression notes)
Editor CRUD (library → category → item) with instant search indexing;
Arabic diacritic-insensitive search (سبحان الله ≡ سُبْحَانَ اللَّهِ);
zakat math (gold nisab 85 g × price, round-up, liability clamping);
calendar-note recurrence incl. interval + range; reset-all-data
confirmation; XSS hardening (search, custom-reciter names); no
horizontal overflow at 390 px; focus-mode keyboard navigation.

### Engineering
- `onStateChange` resets `quranMetaFetchStarted`/`mushafMetaFetchStarted`
  when the matching state slice is absent; `handleImportFile` stages the
  parsed payload and defers the restore to a confirmed action;
  `sanitizeRestoredPayload` always clears `audioDownloads`; `Store`
  gained an `onPersistError` hook (fired once per broken session);
  notifications gained a tested pure `shouldFire(hhmm, now)` helper with
  a 2-minute catch-up window; `CHECKLIST_TOGGLE` is id-guarded.
- 5 new unit tests (catch-up boundaries). 182/182 pass; eslint clean;
  prettier delta zero (76 pre-existing warnings, unchanged since v2.6.0).

## v3.1.0 — Adversarial-review fixes: honest audio, one voice, keyboard access

Produced from a two-hat adversarial review (a hard-to-please product
reviewer + a hostile beta tester; see REVIEW-v3.0.0.md). Every "must fix"
and "should fix" finding shipped in this release; the full review file
ships alongside for the record.

### Fixed
- **The surah Play button was dead on first use** *(the reported bug,
  review A1)*. The reciters catalog is lazily fetched when the Audio
  manager view renders — but the play button lives in the Qur'an view,
  so a fresh session tapping ▶ got a silent no-op. `startAudioPlay()`
  now guarantees the catalog is loaded (idempotent, cached) before
  resolving any moshaf, with the Al-Husary first-launch default resolved
  in the same place. Verified: fresh profile → Qur'an → ▶ → bar + audio.
- **Audio failures were silent and the UI lied** *(A2/B4)*. `playing:
  true` was dispatched optimistically and never reverted: a dead URL or
  dropped connection left a player bar miming playback forever at 0:00.
  Now `player.play()` reports failure, the state reverts, and the person
  is told ("Playback failed — check your connection"). Mid-stream drops
  (tunnel Wi-Fi) revert the bar through the element's own error event,
  and the previously un-handled promise chain is caught end-to-end.
- **Two audio engines could play simultaneously** *(A3/B3)*. The
  full-surah player and verse-by-verse recitation are separate `<audio>`
  elements with no coordination — starting one now pauses the other, so
  the app can never recite over itself.
- **Keyboard users were locked out of ayah details** *(A4/B5)*. Mushaf
  ayahs render as `role="button" tabindex="0"` but Enter/Space did
  nothing. The delegated keydown handler now activates ARIA buttons
  through the same path a click takes (real buttons/links excluded —
  they fire native events).
- **Player state desynced on OS-level pauses** *(A10)*. If the element
  paused itself (headphones unplugged, tab suspension), the bar still
  claimed "playing". The element is now the source of truth: real
  play/pause/ended transitions sync the store (suppressed while
  switching tracks, so no startup flicker).
- **No download feedback** *(A5/B6)*: single-surah downloads now say
  "Downloaded — available offline." (or the failure) when they finish.
- **No buffering state** *(A6)*: the player bar shows an honest
  "Buffering…" chip (reduced-motion aware) while the element wants to
  play but has no data — never as a substitute for a dead stream.
- **Verse-playback failures were silent** *(A7/B8)*: a toast now
  explains why the button reverted.
- **Seek felt dead while dragging** *(A8)*: the time label previews
  live as the thumb moves; the seek itself still commits on release so
  streaming isn't thrashed.
- **Reciter selection unreachable from the reader** *(A9, partial)*: the
  Qur'an view header now links to the Reciters view — listening starts
  where you're reading. (Full unification of the two reciter pickers
  remains a design project, documented.)

### Engineering
- player.js: `onPlayerError` / `onPlayingStateChange` callbacks, a
  `switching` guard that suppresses state sync during track swaps,
  `play()` now resolves `{ offline, error }` and never throws, and the
  patch payload carries an honest `buffering` flag (readyState < 3
  while intending to play). recitation.js: `onPlaybackError`.
- app.js: `startAudioPlay()` is async and self-sufficient (catalog +
  moshaf resolution + error handling); `play-ayah` pauses the surah
  player; the input delegation previews seek time; the keydown
  delegation activates `[role="button"][data-action]` elements.
- All prior guarantees re-verified after the fixes: 177/177 unit tests,
  eslint clean, prettier delta zero, corrupted-storage and hostile
  deep-link suites still fail safe.

## v3.0.0 — Share the words, log the prayers, plan for Ramadan

### Added
- **Share as a beautiful image card.** The card menu's Share action now
  renders the dua/adhkar as a designed 1080px PNG — cream paper ground,
  your chosen palette's accents, a double-rule frame with the app's
  Khatim (8-point star) dividers, Amiri for the Arabic (bundled since
  v2.8), transliteration and translation per your display settings, the
  reference, and an authenticity-grade chip. Height is measured from the
  text so nothing is ever cropped — the Word is never cut to fit (a
  663-character dua renders as a 3166px card). Sharing uses the Web
  Share API with the image file where supported and falls back to a
  plain download; the old text-share path remains the last resort so
  sharing never regresses. Layout math lives in the pure, tested
  `js/shareCard.js` (wrapText takes an injected measure function).
- **Prayer log.** The Prayer view gained a tri-state log beside each of
  the five fard prayers: tap once for **prayed**, twice for **prayed in
  congregation**, again to clear. It deliberately rides the SAME
  `dailyChecklist` storage the habit checklist uses — one source of
  truth, zero migration, and prayers logged here light up in the
  Checklist automatically (legacy boolean values normalize to
  "prayed"). A "This week" strip shows five dots per day (green =
  prayed, palette = congregation), with a full-day streak badge, a
  month count, and a one-time "All five prayers logged — barakallahu
  feek" toast when the fifth prayer lands. Private and local-only,
  like every tracker in this app.
- **Ramadan preset for the Khatma planner.** One tap in the plan form
  fills a khatma that finishes by the **27th of Ramadan** (via the
  app's tabular Hijri calendar), leaving the last nights free for
  seeking Laylat al-Qadr: start at 1 Ramadan (or today, if Ramadan has
  already begun), ~23 pages/day, always reviewable before saving.
  During the last nights (28–30) or after Ramadan it aims at next
  year's. Fully unit-tested against pinned Hijri anchors.

### Fixed
- **Future-start plans got honest math.** Testing the Ramadan preset
  exposed two dishonest outputs for plans that hadn't started yet: the
  verdict said "Behind schedule" before day one, and "needed pages/day"
  was measured from *today* rather than the start date (a 27-day
  Ramadan plan flattering itself as "4/day"). Deadline math now measures
  from the start date until the plan begins, and there is no verdict at
  all until there's something to measure — you cannot be behind before
  you start. Regression-tested.

### Engineering
- New modules: `js/shareCard.js` (canvas renderer + pure wrap/tint
  helpers), `js/prayerLog.js` (tri-state cycle, streak, week window,
  month count). New reducer `PRAYER_LOG_CYCLE` (guarded to the five
  fard keys) writing into `dailyChecklist` — no new persisted keys, so
  backups and restore keep working unchanged. `share-item` upgraded
  with a three-tier fallback (image share → PNG download → text).
  eslint config gained the `File` global.
- 25 new unit tests (10 prayerLog, 5 shareCard, 10 khatma incl. the
  Ramadan preset anchors and the future-start regressions). 177/177
  pass; eslint clean; prettier delta zero (76 pre-existing warnings,
  unchanged since v2.6.0).
- E2E-verified: the v2.9.0 → v3.0.0 update toast (fifth consecutive
  cycle); share-card rendering for a real dua (VLM-reviewed: proper
  Naskh diacritics, balanced layout, no clipping) and for the longest
  Arabic text in the library; the full prayer-log cycle incl. jamaah
  state, streak, month count, the all-logged toast, persistence, and
  Checklist integration; the Ramadan preset end-to-end (fill → save →
  honest 23/day, no verdict); 21-view tour with zero console errors;
  Arabic RTL for the new panels.

## v2.9.0 — The Khatma planner and "Browse by need"

### Added
- **Khatma planner.** The Mushaf reader already tracked how many of the 604
  pages you've opened; now it can tell you whether you're on schedule. The
  jump drawer's khatma section gained a planner: set a **finish date**, a
  **pages-per-day goal**, or both (start date defaults to today). It then
  shows today's target pages, your actual pace, the pages/day still needed
  for the deadline, a projected finish date at your current pace, and one
  honest verdict — *on track / ahead / N pages behind today's target* —
  with nothing shown when nothing is knowable. Removing the plan never
  touches reading progress (and says so). Completing the final page
  records the khatma in a small history ("2 completed · last one in 31
  days") and shows a one-time toast. All math lives in the pure, tested
  `js/khatma.js` (inclusive-day counting, pace, projection, required/day,
  clamped schedules — a boundary bug where a finished schedule's "today"
  window spilled past page 604 was caught by the tests and fixed).
- **"Browse by need" (moods).** The Library view now opens with twelve
  curated needs — anxious, seeking forgiveness, grateful, illness &
  healing, protection, provision & work, facing a decision, needing
  patience, family & home, traveling, before sleep, purify the heart.
  Each links to a cross-library list assembled from whole categories AND
  tag matches across every library (so a prophet's dua tagged *tawakkul*
  appears under "anxious", not just the anxiety category). Matching is
  case-insensitive, deduped by design (the index is id-keyed), and
  bilingual. The test suite runs every mood against the real bundled
  data — asserting each matches ≥5 items and every referenced category
  id actually exists — so no mood can ever render empty.
- Both features fully localized (EN/AR with RTL-safe layout), persisted
  (khatma plan + history ride backup/restore, sanitized against
  malformed imports), and service-worker precached.

### Engineering
- New modules: `js/khatma.js`, `js/moods.js`, `js/views/mood.js`.
  New state: persisted `khatmaPlan` / `khatmaHistory` (ISO-date-validated
  on restore; history capped at 20). New reducers: `KHATMA_PLAN_SET`,
  `KHATMA_PLAN_CLEAR`, plus completion detection inside
  `MUSHAF_PAGE_VISITED` (recorded exactly once — only the dispatch that
  adds the final page; re-visits no-op, and an explicit progress reset
  restarts the count). New view id `VIEWS.MOOD` wired through
  router/renderer; `VIEWS.MOOD`'s first render is gated on the content
  index existing.
- 22 new unit tests (12 khatma, 10 moods). 152/152 pass; eslint clean;
  prettier delta zero (76 pre-existing warnings, unchanged since v2.6.0).

## v2.8.0 — Itqān edition: typography, a guided start, sun-following windows

Built to the standard of إتقان — "Allah loves that when one of you does a
deed, he does it with excellence." Three upgrades shipped in v2.7.0's
"next steps" list, each done completely.

### Added
- **Bundled Amiri typography.** The Arabic font stack was a
  system-font fallback list, so the Naskh rendering varied by device (and
  on many desktops fell to a generic serif). The app now bundles Amiri
  Regular + Bold (Arabic-subset woff2, ~79KB each, SIL OFL 1.1 — license
  shipped alongside in `assets/fonts/OFL.txt`). `@font-face` keeps
  `local()` first so devices with Amiri installed download nothing;
  everyone else gets the identical rendering. The regular weight is
  preloaded, both weights are service-worker precached, and
  `font-display: swap` means text is never invisible while the font
  loads. Glyph coverage verified programmatically: letters, all short/
  long vowels, shadda, sukun, tatweel, superscript alef, Quranic
  annotation marks, and Arabic-Indic digits are all present.
- **First-run onboarding ("Getting started").** Home now carries a
  dismissible panel with four steps whose completion is always
  observable, never guessed: set your location (real coordinates),
  personalize the app (open Settings at least once — tracked in the
  NAVIGATE reducer, not in a view), install the app (standalone display
  mode / the `appinstalled` event), and read your first adhkar (a
  recorded recitation). Each unfinished step deep-links to where it
  happens; done steps collapse to quiet strikethrough rows; the panel
  vanishes on its own when everything is done. The install step degrades
  honestly: an in-row Install button when the browser offers
  `beforeinstallprompt`, and a "use your browser menu" hint where it
  doesn't (iOS Safari). Returning users never see the panel — the
  hydrate/restore sanitizer auto-dismisses it for anyone with existing
  progress, so v2.7.0 users won't meet a first-run wizard on upgrade.
- **Sun-following adhkar windows.** The Home "Now" badge previously
  used fixed clock windows (morning 4–12, evening 15–21). With a saved
  location it now follows the actual sun through the app's own solar
  engine: morning adhkar from **Fajr to Dhuhr**, evening adhkar from
  **Asr to Isha** — the standard scholarly allowance for the morning
  range and the honest middle position for the evening (strictest ends
  at Maghrib; several scholars permit into the night). The fixed windows
  remain as the pre-location fallback, and the badge re-evaluates at
  exactly the right moments, since the next-prayer countdown's rollover
  nudge re-renders Home as each prayer boundary passes. Malformed or
  partial times fall back to the clock windows rather than misbehaving.

### Engineering
- New pure modules: `js/onboarding.js` (step building, returning-user
  detection) and `js/views/onboardingPanel.js` (rendering only). New
  state: persisted `onboarding {dismissed, settingsVisited}` (sanitized
  on hydrate/restore, carried by backup/restore) and ephemeral
  `install {promptReady, installed}`. New reducers/actions:
  `ONBOARDING_DISMISS`, `INSTALL_PROMPT_READY/CLEAR/DONE`, and a
  settings-visit side-effect on `NAVIGATE`. `recommendedAdhkarWindow()`
  gained an optional prayer-times parameter (backwards compatible).
- The service worker no longer calls `skipWaiting()` in its install
  handler — updates now genuinely wait for the person's "Refresh" tap
  (the v2.7.0 consent flow is now the only activation path on update),
  so a running session is never swapped mid-use. First installs are
  unaffected (they activate immediately with no previous worker).
- 12 new unit tests (7 onboarding, 5 prayer-window): step completion
  signals, junk-coordinate rejection, dismissed/complete hiding,
  returning-user detection, Fajr/Dhuhr/Asr/Isha boundaries, the
  prayer-mode-overrides-fallback case, and malformed-times fallback.
  130/130 pass; eslint clean; prettier delta still zero (76
  pre-existing warnings, unchanged since v2.6.0).
- The update flow shipped in v2.7.0 was itself verified end-to-end for
  this release: a browser running v2.7.0 was served the v2.8.0 build,
  showed the "new version ready" toast, and reloaded into v2.8.0 on tap.

## v2.7.0 — Update flow, a living Home, and honest statistics

### Added
- **PWA update flow.** A cache-first service worker with no client-side
  update handling means installed apps can run a stale build indefinitely —
  the exact failure mode previous releases fixed by hand with cache-version
  bumps. Now: a waiting worker triggers a "A new version is ready —
  Refresh" toast with a one-tap action that posts `SKIP_WAITING` (new
  message handler in sw.js) and reloads into the new build. Updates are
  also checked when the app regains focus/network and every 6 hours, since
  installed PWAs can sit in the background for weeks. First installs stay
  silent (nothing to update).
- **Home: next-prayer card with a live countdown.** The app has had a full
  solar-position prayer engine since v1, but Home never surfaced it. A new
  strip under the hero shows the next prayer's name and clock time with a
  countdown that ticks once per second through a direct DOM patch (the same
  discipline as the Ramadan and Qibla tickers — the store and localStorage
  are never touched by the clock). Without a location set, the strip
  becomes a one-tap setup card instead of hiding the feature.
- **Home: Hijri date chip.** The hero greeting now carries today's Hijri
  date (e.g. "10 Rabi' al-Awwal 1448 AH"), computed by the same tabular
  calendar the Calendar view uses — localized in both UI languages.
- **Home: time-aware adhkar nudges.** During the morning window (Fajr to
  Dhuhr) and evening window (Asr to late evening), the matching quick
  action gets a pulsing "Now" badge and a tinted border, so the right
  adhkar finds you at the right time. Windows are deliberately
  clock-based (not location-gated) so Home feels helpful even before
  location is configured; see the new `js/adhkarTiming.js` (pure, tested).
- **Statistics: six honest stat cards.** Added **Avg / Day (30d)** —
  averaged over the full 30-day window, not just active days, so one busy
  day can't masquerade as a towering daily habit — and **Active Days**
  (all-time). Grid reflows to three columns on wider screens.
- **Statistics: a readable weekly chart.** The 64px bars grew to 104px,
  every bar now carries its value above it, the week's best day is ringed
  in accent, and the panel header shows the week total.
- **Statistics: heatmap month navigation.** Browse back through up to a
  year of history (◀ ▶, clamped so you never page into the empty future),
  with the focused month's total under the grid. The focus month is
  ephemeral state — reopening the app always lands on "now".
- **Visual polish.** The Home hero carries a whisper-quiet 8-point-star
  lattice (the app's signature motif) with light/dark stroke variants and
  full suppression under high-contrast mode; quick-action cards get a
  hover lift on pointer devices (skipped on touch, where hover lies).

### Engineering
- `toast.js` learned optional action buttons (used by the update flow);
  action toasts don't auto-dismiss. New reducers/actions:
  `STATS_HEATMAP_MONTH_SHIFT` (ephemeral, clamped to current-11..current
  months, never persisted, not carried in backups). `sw.js` precaches the
  new `js/adhkarTiming.js` module. APP_VERSION, package version, and the
  SW cache name all bumped to 2.7.0 in lockstep.
- 12 new unit tests (`tests/adhkarTiming.test.js`,
  `tests/statistics.test.js`): window boundaries, no-overlap invariant,
  avg-over-full-window semantics, active-day counting, month-total
  scoping, and rolling-window edges. 118/118 pass; eslint clean;
  prettier delta zero (76 pre-existing warnings, unchanged from v2.6.0).
- Verified in-browser: LTR + RTL (Arabic) Home with live countdown and
  Hijri chip; statistics with 10 weeks of seeded history including month
  navigation and the streak-break gap; both themes; zero console errors.

## v2.6.0 *(changelog entry backfilled — this release shipped without one)*

### Added
- **Offline audio system** — a reciter catalog (`data/reciters.json`,
  everyayah-style servers), an IndexedDB download store
  (`audioStore.js`), a full-surah player with rate/repeat
  (`player.js`, `views/playerBar.js`), verse-by-verse recitation
  (`recitation.js`) via the Al Quran Cloud CDN, custom-reciter support,
  and a download manager view (`views/audioManager.js`).
- **Mushaf reader** — the 604-page book-style Qur'an (`mushaf.js`,
  `views/mushafReader.js`, `data/mushaf/*.json`) with page navigation,
  jump-to-surah/juz, and the per-ayah bookmark system.
- **99 Names quiz** (`views/quiz.js`) with persisted best-score stats.
- **Daily habit checklist** (`checklist.js`, `views/checklist.js`).
- **Qibla compass view** with live device-orientation support
  (`views/qibla.js`, `compass.js`, `qibla.js`).

## v2.5.1 — QA & craftsmanship pass

A deliberate re-review of everything shipped in v2.4–v2.5, after real
defects were reported in the collapsed navigation. Each finding was
reproduced with measurements before being fixed, then re-verified.

### Fixed
- **Collapsed side rail rebuilt properly.** The v2.5 implementation hid
  labels with `opacity: 0` — they kept occupying layout, so icons sat
  ~26px off-center (measured; ~30px in RTL) with uneven rhythm, and the
  hidden spans stayed in the accessibility tree. Labels and group headers
  are now removed with `display: none` (links carry `aria-label`), icons
  measure within 0.5px of true center in both directions, groups keep
  their rhythm through hairline dividers, every collapsed item is a
  uniform 44px target, and items gained a hover state.
- **Service-worker version discipline.** The v2.5 asset edits shipped
  without bumping the SW cache version — a cache-first worker that never
  changes its cache name would have served clients the old build
  indefinitely. All asset changes now ride a `v2.5.1` cache bump
  (APP_VERSION and package version moved in lockstep).
- **Zakat: one panel, not two.** "Saved calculations" and "Hawl
  anniversaries" listed the same snapshots twice — the very redundancy
  this app exists to eliminate in its own data. Merged into a single
  panel per snapshot: hawl date, amount, nisab status, countdown chip
  (amber within two weeks, muted once passed), reminder bell, delete.
  Rows sort by soonest hawl.
- **Bookmarks list on small screens.** Surah names were ellipsized into
  uselessness next to the reference number; ref + name now stack
  vertically under 520px so a bookmark is always identifiable.
- **Themed input placeholders.** Placeholders relied on the browser
  default gray, illegible on dark surfaces; now use the theme's muted
  token. (The first attempt mixed `:-ms-input-placeholder` into one
  selector list, which invalidates the whole rule in modern engines —
  split into separate rules.)
- **Ramadan dua buttons no longer hardcode content ids.** The iftar/
  suhoor buttons resolved to literal item ids that would silently die
  whenever the library is edited (exactly what the v2.5 dedupe did);
  they now resolve against the live index with preferred ids, then
  title matching, then the category's first item — and render nothing
  rather than a dead link.
- **Dead references pruned.** Favorites and collections pointing at
  items removed by the data cleanup used to linger forever (inflating
  collection counts shown in the picker, polluting backups). A prune
  pass now runs whenever the content index rebuilds.
- **Mobile nav drawer focus management.** Opening the drawer now moves
  focus into it, Tab cycles within it, and Escape/backdrop close returns
  focus to the opener — the sheet no longer strands keyboard users on
  the covered page.

### Verified
- Measured icon centering at 0.5px across all 16 collapsed items, LTR
  and RTL; collapsed rail reviewed at light/dark; drawer focus cycle
  checked open→Tab→Escape; merged zakat panel verified with due-today
  and far-future snapshots; bookmarks rows verified un-clipped at 390px;
  16-view error tour clean; 98/98 unit tests; eslint clean.

## v2.5.0

### Added
- **Suhoor/Iftar notification alerts** (Phase 1) — the Ramadan Companion
  gains an alerts panel: a Suhoor alert that fires N minutes before your
  actual Fajr (offset selectable: 10–60 min) and an Iftar alert at your
  actual Maghrib. Built on the same solar-position engine and scheduler as
  Smart Prayer Alerts, with the same sound. They are Hijri-gated: they
  only ever fire on days that are truly in Ramadan, so the toggles can
  stay on all year. A permission banner with one-tap enable sits in the
  panel when notifications haven't been granted yet.
- **Zakat hawl reminders** (Phase 2a) — every saved zakat snapshot now
  records its hawl date (one lunar year, ~354 days, later). The Zakat view
  shows a "Hawl anniversaries" panel: each assessment's due date, days
  remaining/passed, an amber highlight within two weeks, and a per-row
  reminder bell. On the anniversary day itself, a notification fires (if
  permission granted): one lunar year has passed — re-assess and pay.
- **Ayah bookmark folders + notes** (Phase 2b) — Mushaf bookmarks can now
  be filed into user-made folders (All / Unfiled / your folders as filter
  chips, create inline, delete with one tap — orphaned bookmarks are kept
  and returned to Unfiled) and each bookmark carries a free-text note
  (up to 140 chars) editable right in the list.
- **Content: 3 new duas sections + 26 new authenticated items** (Phase 3) —
  *Decisions & Istikharah* (the full Bukhari-1166 istikharah with the
  two-rak'ah method note, plus Rabbana atina), *Work & Trade* (the famous
  marketplace dua — honestly graded Da'if with the grading shown — and the
  debt-sufficiency dua, Tirmidhi 3563), and *Greetings & Etiquette*
  (returning salam 4:86, the full sneezing exchange, yawning, the
  rooster/donkey dhikrs, jazakallahu khayran, and greeting your home).
  Enriched: Hajj & Umrah (+5: Arafah's best dua, tawaf between the
  corners, Dhul-Hijjah takbir, Jamrat takbir, salawat in Madinah),
  Death & Afterlife (+3: condolence, the calamity dua, after-burial
  prayer), Rain & Nature (+3: harmful rain, after rain, drought istisqa),
  Patience (+2), Anxiety (+2 debt-specific), Knowledge (+1 "Rabbi zidni
  'ilma"). Every new item was cross-checked this session against
  sunnah.com / islamqa / published Hisn al-Muslim, with honest gradings.

### Fixed
- **Data redundancy reorganized** (Phase 3) — a scripted, audited pass
  over every library removed 20 true double-entries: batch duplicates
  (the same dhikr entering twice from two source batches, e.g. the three
  Qul surahs appearing as both single-surah cards AND a second batch's
  "recite Ikhlas, Falaq and Nas" cards) and composites whose text was
  just two or more standalone items concatenated (post-prayer
  Mu'awwidhatayn). The dropped entry's hadith citation is folded into the
  kept entry's notes, so no sourcing was lost. Cross-category repeats
  were deliberately kept: the same dua legitimately serves several
  situations. All 9 libraries re-validate through the app's own schema
  pipeline; item orders renumbered; zero sections removed.
- **Navigation overflow + collapsible sidebar** (Phase 4) — the side rail
  previously couldn't scroll, hiding everything below Settings on short
  viewports. Rebuilt as a grouped (Read / Worship / Tools / Mine),
  independently scrollable rail with a hamburger that collapses it to an
  icon-only rail (state persisted). On mobile, the bottom bar is now four
  destinations + "More", opening the same grouped navigation as a bottom
  drawer sheet with overlay, Escape-to-close, and auto-close on
  navigation.

### Engineering
- `ramadanAlertTimes()` (unit-tested minute-floored pre-Fajr alert time),
  `hawlDueFor()` / `daysUntilHawl()` (day-granularity lunar-year math),
  scheduler extended with a zakat-history accessor; new reducers
  (bookmark folder create/rename/delete, bookmark note/folder update,
  zakat snapshot update) all sanitized on hydrate/restore and carried by
  backup/restore automatically; 98/98 tests pass; eslint clean.
- Data scripts kept in the repo story: `reorganize_data.py` (auditable,
  idempotent-leaning dedupe with a printed decision log) and
  `enrich_duas.py` (the 26 new items with their sources).

## v2.4.0

### Added
- **Ramadan Companion** (`#/ramadan`) — a fasting-season hub built on the
  app's existing solar-position prayer engine:
  - Live **Suhoor–Iftar countdown**: while fasting, ticks down to Iftar at
    your actual Maghrib; after Maghrib, switches to a "time left to eat"
    countdown ending at Fajr. The seconds tick once per second through a
    direct DOM patch (the same pattern the Qibla compass uses), so the
    store and localStorage are untouched by the clock.
  - **Fasting tracker**: a 29/30-dot grid for the month; tap today's dot to
    log the fast as kept. Each Ramadan keeps its own permanent log (keyed
    by Hijri year).
  - **Laylat al-Qadr indicator**: during the last ten nights, odd nights
    (21, 23, 25, 27, 29) are highlighted with a "seek Laylat al-Qadr" banner.
  - Outside Ramadan the view becomes a **countdown to the next Ramadan and
    Eid al-Fitr**, plus a recap of last Ramadan's kept fasts.
  - One-tap access to the iftar/suhoor duas already in the Duas library,
    the Qur'an, prayer times, and the Zakat calculator. A "Ramadan
    Mubarak" banner appears on Home during the month itself.
- **Zakat Calculator** (`#/zakat`) — a fully offline annual-zakat and
  Zakat al-Fitr calculator:
  - Nisab by **gold (85 g)** or **silver (595 g)** with your own
    price-per-gram inputs and free-text currency symbol; the threshold is
    computed live.
  - Seven asset lines (cash & bank, gold and silver by weight,
    investments, business inventory, good receivables, other) minus
    current liabilities, with a full breakdown panel and a
    percent-of-nisab progress bar.
  - Due amount is **2.5% of net zakatable wealth, rounded UP to the
    smallest whole currency unit** (the poor's share is never rounded
    down); below nisab, no zakat is shown as due.
  - **Zakat al-Fitr** sub-calculator: per-person staple-food value ×
    household size, rounded up.
  - Saved-calculations history (last 30), all device-local. Inputs and
    metal prices persist across reloads — figures are often gathered over
    days.
- **Per-ayah bookmarks in the Mushaf** — tap any ayah, then Bookmark, and
  it gets a highlighted background plus a star marker right on the page.
  A bookmark button in the Mushaf topbar (with an active-state badge) opens
  the saved-ayah list; tap any entry to jump to its page, or delete it.
- **Khatma progress** — every Mushaf page you open is logged, and the jump
  drawer now shows a 604-page progress bar ("X / 604 · Y%") with a Reset
  to start a fresh khatma.

### Engineering
- New pure, unit-tested modules: `js/ramadan.js` (Hijri Ramadan window
  detection, next-Ramadan/Eid lookup, fasting-phase state machine with
  correct post-midnight handling, countdown formatting, log helpers — 12
  tests) and `js/zakat.js` (nisab, aggregation, round-up rule with an
  fp-noise epsilon, Fitr math, currency formatting — 11 tests).
- New state slices (`ayahBookmarks`, `mushafPagesRead`, `ramadanLog`,
  `zakat`, `zakatHistory`) all persisted, all sanitized on hydrate/restore
  the same defense-in-depth way as the existing fields; backup/restore
  carries them automatically.
- Zakat inputs dispatch through the store with caret-preserving refocus
  (the search-box trick), keeping the one-way data flow intact.
- Service-worker shell cache bumped to `v2.4.0` and pre-cache list
  extended with the five new modules.

## v2.3.0

### Added
- **Mushaf Reader** — a new page-by-page "book" mode for the Qur'an,
  matching the real, printed 604-page Madani Mushaf exactly: authentic page
  boundaries (verified against known references — e.g. At-Tawbah correctly
  begins on page 187, Al-Baqara spans pages 2-49), a surah-name/Juz header,
  a Bismillah banner wherever a surah opens on the page, and Eastern
  Arabic-Indic page numbering. Swipe or use the arrows to turn pages (fixed
  to the book's own right-to-left direction regardless of UI language); tap
  any ayah for its translation and a Listen button. Jump instantly to any
  surah, Juz, or page number from the jump drawer. Reachable from the
  classic Qur'an reader's new "Mushaf View" button, or directly from the
  Qur'an tab.
- **Qur'an audio recitation** — a "Listen" button on every ayah, in both the
  classic reader and the new Mushaf reader, streaming from the free,
  no-API-key Al Quran Cloud CDN. Nothing plays without an explicit tap;
  nothing is downloaded in advance or proxied through this app. Pick from
  five reciters (Alafasy, Al-Husary, Abdul Basit, As-Sudais, Al Muaiqly) in
  Settings.

### Engineering
- New unit-tested pure modules: `mushaf.js` (page navigation, and the
  surah:ayah → global-ayah-number conversion the audio CDN needs — verified
  against a known reference, Ayat al-Kursi = global ayah 262) and a
  `toEasternArabicNumerals()` helper in `utils.js`.
- Found and fixed a real bug during testing: the Mushaf reader's audio button
  depends on `quran-meta.json` (per-surah ayah counts), which was previously
  only ever fetched by the classic reader — opening Mushaf mode first left
  Listen unable to resolve a URL. Now both readers ensure it's loaded.
- 604-page dataset built from a page-accurate open dataset (see data
  provenance below), verified against known Mushaf facts (48 pages for
  Al-Baqara, 30 Juz, page 187 for At-Tawbah) before being bundled.

### Data provenance
- Mushaf page layout: derived from the `hamzakat/madani-muhsaf-json`
  dataset (public page-boundary data for the standard Madani/King Fahd
  Complex Mushaf).
- Qur'an audio: streamed at runtime from `cdn.islamic.network` (Al Quran
  Cloud), a free, documented, no-key CDN intended for direct client-side use.

## v2.2.0

New features, plus a round of engineering hardening (tests, linting, CI-ready
tooling) alongside them.

### Added
- **Qibla Finder** — direction and distance to the Kaaba from your location,
  with a live compass needle where the device supports one (device-orientation
  sensor), and an always-accurate numeric bearing as the authoritative
  fallback. Reuses the same location as Prayer Times, so no second permission
  prompt.
- **Daily Checklist** — a private, on-device tracker for the five prayers plus
  morning/evening adhkar and a Qur'an check-in, with a 7-day history strip and
  a streak badge for fully-completed days. Kept intentionally separate from
  the existing recitation-based streak in Statistics.
- **99 Names Quiz** — a 10-question multiple-choice memorization mode for
  al-Asma al-Husna, drawn entirely from the existing library content, with a
  best-score tracker. Reachable from the Asma al-Husna category screen.
- Home screen: a Qibla quick-action tile and a Daily Checklist summary panel.

### Engineering
- Real automated test suite (`node --test`) covering utils, schema
  validation, prayer/calendar math, the new Qibla bearing math, and the new
  checklist streak logic — 50+ assertions, zero dependencies beyond Node's
  built-in test runner.
- ESLint + Prettier configured (`npm run lint`, `npm run format`); fixed the
  handful of real issues it surfaced (unused imports, a couple of `let`s that
  should've been `const`).
- Fixed an edge case in `escapeHTML()` where an explicit `null` (as opposed to
  omitting the argument) rendered as the literal text "null".

## v2.1.0

Content and feature merge from a parallel content-authoring pass, folded
into this app's existing architecture and schema.

### Added
- **Complete Qur'an reader** — all 114 surahs, 6,236 ayahs, Arabic text
  with the Sahih International translation. Lazy-loaded per-surah (never
  part of the initial boot fetch), searchable surah list, previous/next
  navigation, copy-ayah, and a "Continue Reading" bookmark surfaced on Home.
- **Special Days & Seasons** library: the Ten Days of Dhul Hijjah, and Eid
  duas/etiquette.
- New Duas categories: Guidance & Righteousness, Patience & Trials,
  Strengthening Faith, Gratitude & Praise, Wudu (Ablution), Yaqeen-Inspired
  Duas.
- New Adhkar category: Daily Supplications (a broad Sunnah-sourced set for
  use throughout the day).
- New Daily-Sunnah category: Sunnah Acts & Etiquette.
- Completed the Duas-of-the-Prophets set with Dawud, Isa, and Muhammad ﷺ
  (previously only Adam through the believers' duas).
- New Reflections category: Prayers of the Pious.
- Nav bar / Home screen entry point for the Qur'an reader.

### Changed
- ~680 additional items merged into existing categories (Morning/Evening/
  Sleep/Wake-up/Post-Prayer Adhkar, General Tasbih, Forgiveness, Protection
  & Ruqyah, Knowledge & Provision, Sickness & Shifa, Marriage & Family,
  Food & Drink, Anxiety & Distress, Travel, Friday, Ramadan, Qur'anic Duas,
  all 8 existing Reflections categories, General Sunnah) — deduplicated
  against existing content by normalized Arabic text / title, so nothing
  appears twice.
- All 99 Names of Allah enriched with hadith-referenced virtue text (the
  `virtues` field was previously empty on every entry).
- Total library size: 622 → 1,302 items across 9 content libraries.

### Technical
- New `state.quran` slice (meta + per-surah cache, not persisted) and a
  persisted `quranBookmark` field, following the existing reducer/selector
  pattern.
- New `js/views/quran.js`, wired into `renderer.js`'s view table and
  `router.js`'s existing generic hash routing (no router changes needed).
- Service worker precaches `quran-meta.json` (small, ~27KB) but not the
  114 per-surah files — those pick up the existing `stale-while-revalidate`
  runtime caching already applied to every `/data/*.json` request, so they
  go offline-capable automatically after first read.
- Every merged item validated against `schema.js`'s `normalizeDocument`;
  every generated ID checked for global uniqueness before merge.
