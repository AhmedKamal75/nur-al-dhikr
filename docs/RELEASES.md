# Release notes — Nūr al-Dhikr

Moved out of README.md so the README stays the product face. Newest first.

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
