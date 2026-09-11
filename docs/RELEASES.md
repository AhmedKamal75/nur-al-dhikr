# Release notes — Nūr al-Dhikr

Moved out of README.md so the README stays the product face. Newest first.

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
