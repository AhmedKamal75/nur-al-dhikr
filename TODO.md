# TODO — becoming a complete, professional Muslim companion app

> **v3.16.0 merge note:** an external hostile review found that two
> different builds both labeled v3.15.0 existed — this line (the Qur'an
> translation editions) and a parallel line (the four Sunan hadith
> collections, +19,217 hadith, its own hostile battery, adhkar/duas
> extension-tier work). Same class of problem as the v3.6.0 merge note
> below; same treatment. The Sunan collections are restored in v3.16.0,
> rebuilt from the same CC0 source through this repo's own gates and
> landing on exactly the parallel build's verified totals (15,022 →
> 34,239 — now locked by a test). Still pending from that build: its
> adhkar/duas extension-tier work and any of its fixes beyond the Sunans
> — those need that build's zip for a true code-level merge. The review's
> other findings (zip-crashing test import, prettier debt growth,
> version-marker ambiguity) are fixed in v3.16.0; see its CHANGELOG.

> **v3.6.0 merge note:** this file was written on the v3.5.0 branch, which
> had silently forked from the parallel security/QA line (review v3.3 B/A
> fixes + walkthrough v3.4 W fixes). The branches are re-united as of
> v3.6.0 — all hardening restored, 265 tests green — so work below
> continues from an honest baseline. Two new items were added to Tier 2
> (data health check, qibla declination hint) as outputs of that review.

Grounded in two things: (1) an audit of what's already built in this repo
(see below — it's a lot), and (2) research into what every major Islamic
app (Muslim Pro, Athan, iQuran, Quran.com, Tarteel, Hafizi/Tajweed apps,
RecitID) treats as table stakes in 2026. Ordered by how much a working
Muslim would notice its absence, not by implementation difficulty.

**How this file works**: items get implemented top-down, one at a time.
Each is checked off `[x]` with the version it shipped in when done, so
this file stays an honest record rather than an aspirational wishlist.
Items marked **Out of scope** are deliberate calls, with the reasoning
written out — not silently dropped.

## Already built (context — not re-listing as "missing")

Prayer times + Qibla + Hijri calendar; Adhkar/Duas/99 Names/Ramadan/Zakat
libraries; digital Tasbih; full Quran text + Sahih International
translation; 604-page Mushaf reader with page-flip, 8 paper themes, 3
fonts; per-word grammar study (i'rab/sarf, root occurrences) covering all
77,429 words; 15 tafsir/grammar sources (7 bundled, 8 on-demand); Khatma
planner; per-ayah audio playback + reciter picker + offline audio
download; prayer log; mood-based browsing; statistics; JSON backup/
restore; installable offline-first PWA; synthesized (non-Adhan) prayer
alert tones.

---

## Critical — the app is missing something nearly every serious Muslim app has

- [x] **Real Adhan audio at prayer time** (v3.8.0). The Prayer screen's
      alert panel now offers Adhan / Tone / Off. The bundled recording is a
      full-length (2m34s) public-domain (CC0) call to prayer
      (`assets/audio/adhan/` + provenance in `CREDITS.md`), SW-precached so
      it works offline. Users can also import their own recordings per
      variant — including the Fajr-specific adhan ("الصلاة خير من
      النوم") — stored offline in the audio IndexedDB (8 MB cap,
      magic-byte validated): no Commons/Fajr recording with a clean enough
      license exists to bundle, and user-imports keep the
      nothing-leaves-your-device promise while letting everyone choose a
      muezzin they love. Preview button plays exactly what a real alert
      would play. **Honest limits, unchanged**: page-audio fires only while
      the tab is open and after one user interaction this session (browser
      autoplay policy); a closed tab still gets the plain system
      notification (see the prayer-alert reliability item below).
- [x] **Tajweed color-coded Mushaf text.** (v3.4.0) Shipped as a
      deterministic rule engine (`js/tajweed.js`) rather than aligning a
      third-party dataset — that dataset drifted ~17% out of alignment
      with this app's own text at full-Quran scale, unacceptable for a
      feature whose entire point is showing the right letter to
      pronounce correctly. Covers hamzat al-wasl, lam shamsiyyah,
      qalqalah, ghunnah, the full noon-sakinah family (iqlab/idgham with
      and without ghunnah/ikhfa), and five madd sub-types (natural,
      badal, silah, muttasil, munfasil, and the muqatta'at's obligatory
      madd) — 81,656 rule instances across all 77,429 words, verified
      zero crashes/zero out-of-range spans. Toggle + bilingual legend in
      Mushaf Display settings, works in both reading modes, dark-paper
      contrast handled. **v3.7 update**: the meem-sakinah family
      (izhar/idgham/ikhfa shafawi) is now classified too — see v3.7 in
      CHANGELOG. Remaining gap, still deliberate: a handful of rare
      Quranic annotation marks (small-high-ya/noon) aren't specifically
      interpreted.
- [x] **Full-text search across the Qur'an itself.** (v3.6.0) The global
      search view now indexes all 6,236 ayahs — Uthmani Arabic +
      Sahih International translation — built once from the SW-cached
      ~2.7MB local corpus on first use, so it works offline forever after
      the first query. Matching is diacritic-insensitive AND alef-elided
      symmetrically on both sides (Uthmani spelling and what a person
      actually types disagree about _where_ alefs sit — dagger-alif words
      like إِلَٰهَ are typed as اله or إلاه — so every alef is dropped from
      both the haystack and the query before comparing; the previous
      sanity run caught exactly this class of miss). Every term must hit
      somewhere (AND semantics); exact-phrase hits rank first; tapping a
      result jumps into the per-surah reader via a deep link that
      auto-scrolls to and softly tints the ayah
      (`#/quran/N?ay=A`). Verified: 278 unit tests + a real-corpus sanity
      sweep (self-match over sampled raw ayahs) + a dedicated hostile
      battery (XSS vectors, prototype-pollution keys, 50k-char queries,
      poisoned surah docs — nothing throws, nothing leaks). **Residual**,
      deliberately deferred: searching the _tafsir_ library's text (the
      bundles are large enough that indexing all of them eagerly would
      trade memory for a rarely-typed need; revisit if asked for).
- [x] **More Qur'an translations.** (v3.15) The last Critical item, closed.
      Settings → Content Display gains a Qur'an Translation picker: English
      (Sahih International, unchanged default) plus **Urdu** (Jalandhry),
      **French** (Hamidullah), **Turkish** (Diyanet İşleri) and
      **Indonesian** (Kemenag) — the four next most requested worldwide,
      sourced from the same open Tanzil-derived corpora family the app's
      hadith pipeline already relies on. Each edition ships as slim
      per-surah overlay files merged onto the app's own Uthmani corpus at
      load time (the Arabic text is always the app's), lazy-loaded through
      the existing SW data rule so an edition works offline after its first
      open. Both readers, deep links, mushaf ayah-detail and the full-text
      search all follow the selection; Urdu renders RTL via `dir="auto"`.
      Alignment is hard-gated at build time (6,236 verses per edition,
      1:1 per-surah counts with the corpus, no truncation/HTML/bismillah
      bleed) and re-gated permanently in tests/translations.test.js.
      **Residual, deliberate:** the search index follows the SELECTED
      edition rather than indexing all five at once (~5MB of folded
      haystacks for a rarely-typed cross-language need — the same memory
      call as the tafsir-index deferral; revisit if asked).
- [x] **Continuous surah audio playback with auto-advancing ayah
      highlight**, in _both_ reading modes. (v3.10) A follow-along
      session engine (`js/surahPlayback.js`) recites a surah verse-by-
      verse through the app's single per-ayah audio element — "Recite
      surah" in the classic reader's toolbar and in the Mushaf topbar.
      The reciting ayah gets a calm highlight; with "Follow" on (eye
      chip, persisted in settings), the classic reader auto-scrolls to
      each ayah and the Mushaf flips to the right PAGE for each ayah via
      a new build-time ayah→page index in mushaf-meta.json (all 6,236
      ayahs mapped and gate-checked by scripts/build-mushaf-ayah-pages.mjs).
      The persistent player bar becomes the recitation console (live
      ayah counter, follow toggle, stop). Sessions are surah-scoped
      (last ayah ends the session — the standard behaviour), one-voice
      is enforced both ways (starting the full-surah player or a single
      ayah stops the session and vice versa), and verse-load failures
      stop gracefully with an honest toast. Engine is a pure state
      machine driven through a swappable audio driver — 12 unit tests
      (tests/surahPlayback.test.js) simulate full surahs, stale ended
      events, restarts and failures with no audio device.

## High priority — expected by anyone using this daily

- [ ] **Hifz (memorization) mode**: hide-word / hide-line / hide-ayah
      self-testing per surah, a "repeat this ayah N times" loop control on
      the audio player, and a lightweight spaced-repetition review queue
      (surahs/pages marked "memorized" resurface for review on a growing
      interval) — reusing the Khatma planner's page-tracking data rather
      than building a second progress system from scratch.
- [ ] **Voluntary fasting tracker + reminders** beyond Ramadan: Mondays/
      Thursdays, the White Days (13th–15th of each Hijri month), Ashura,
      Arafah — each with an opt-in day-before reminder, sharing storage
      with the existing Ramadan fasting log rather than a parallel one.
- [ ] **A general good-deeds / worship habit tracker** beyond the prayer
      log — Qur'an reading streaks, dhikr streaks, sadaqah given, fasting
      — one combined "today" view instead of five separate counters
      users have to check individually.
- [ ] **Prayer-alert reliability**: today's alerts only fire while a tab
      is open and the 30s check interval is running. Investigate
      `Notification Triggers` / periodic background sync where the
      browser supports it, and at minimum pre-schedule the next 24h of
      alerts as timestamped triggers on each app open so a briefly closed
      tab doesn't silently skip a prayer.
- [x] **Verse-of-the-day / daily reflection surface** on the Home screen,
      pulling from the ayah/reflection libraries already in `data/`,
      rotating deterministically by date (no server, no randomness that
      breaks offline-first). (Present since early versions — verified in
      v3.9 during the TODO↔reality audit; a “Hadith of the day” card now
      sits beside it.)

## Medium priority — real value, smaller audience or more niche

- [ ] **Multiple qira'at (recitation styles) for the Mushaf text itself**
      — currently Hafs 'an 'Asim only, the global standard, so this is
      lower urgency than it looks; Warsh 'an Nafi' is the next most
      requested (used across Northwest Africa).
- [ ] **A Tajweed rules mini-course** — short explanations + audio
      examples per rule, linked from the color legend, so the coloring
      above teaches rather than just decorates.
- [ ] **Islamic finance calculators beyond Zakat**: simple halal/haram
      screening notes for common investment questions (interest, gharar),
      kept factual/educational, not individualized financial advice.
- [ ] **Kids' mode**: simplified Adhkar/Duas subset in larger type, an
      Arabic-alphabet tracing/learning mini-module, short Prophet-story
      summaries — a genuinely different audience from the rest of the app.
- [ ] **More reciters** in the bundled catalog, and a warsh/qalun-aware
      reciter filter once multiple qira'at land above.
- [ ] **Cross-device sync** (still zero-account, zero-server): an
      optional "export a sync file to your own cloud drive folder" flow
      building on the existing backup/restore JSON, rather than a hosted
      account system that would break the "nothing ever leaves your
      device" promise this app has made since v1.

## Tier 2 — delighters (the little things that make people choose _this_ app)

Everything above is "does the app do the thing." This section is
different: none of these are things a Muslim would file a complaint about
missing, but they're the kind of small, well-crafted touch that turns
"an app that has Adhkar" into "the app I actually reach for." Genuinely
harder to spec than Tier 1, because the whole point is that they're not
obvious gaps — credit to the person using this app for spotting the first
one and pushing back on "there's nothing left to add."

- [x] **Tajweed practice/drill mode** (v3.5.0). "Find every [rule] in
      this ayah" — tap the letters, check the answer, see exactly which
      were right/missed/wrong, and go again. Reuses the same classifier
      that colors the reading view, so the quiz can never disagree with
      it. A "Practice This Ayah" shortcut on whatever's currently open
      covers the contextual "check what I just read" loop; a dedicated
      picker with per-rule accuracy and a streak covers deliberate
      repetition. Persisted stats, zero server, zero accounts.
- [ ] **A root-family browser.** The per-word popover already shows "this
      root occurs elsewhere" as a capped list of 8; a dedicated view that
      shows _every_ occurrence of a root across the whole Qur'an, grouped
      by the word-forms it takes, turns the same data into a genuine
      vocabulary-building tool rather than a one-off curiosity.
- [ ] **A worship "year in review."** Not a Ramadan-only feature — at any
      natural checkpoint (end of Ramadan, end of the Hijri year, or just
      "90 days since you started"), a short, honestly-framed summary of
      what actually happened: pages read, khatma progress, longest dhikr
      streak, ayahs bookmarked. Computed entirely from data already being
      tracked; the only new work is a nice presentation of it. Careful
      framing matters here — a summary of one's own worship, not a
      leaderboard or a guilt trip about the days missed.
- [ ] **A shareable ayah card.** Generate a clean, static image (Arabic +
      translation + a subtle attribution) from any ayah for sharing
      outside the app — pure Canvas/SVG, no server round-trip. Small to
      build, and it's the one feature that puts the app's name in front
      of someone who doesn't have it yet.
- [x] **A real "continue" button on Home.** One tap back to exactly where
      Qur'an reading (and ideally Adhkar) left off, front and center on
      the home screen, instead of navigating back through the Mushaf/
      Surah picker every single time. Sounds trivial; is the single most
      repeated action in the entire app, so the tiny friction it removes
      is repeated more than any other improvement on this list. (Present
      since early versions — the quran-bookmark panel plus the "Continue
      Reading" recent-items row; verified during the v3.9 audit.)
- [ ] **A gentle "it's been a while" nudge — never a streak-shame.** Most
      habit apps punish a broken streak with guilt-inducing copy; this
      app already has enough real data (last dhikr session, last Qur'an
      page, last prayer logged) to instead say something quietly kind
      after a gap, with zero judgment, and mean it. The differentiator
      isn't the nudge itself, it's _not_ doing the manipulative version
      every other habit app defaults to.
- [x] **Subtle, optional sound design.** (v3.14) A soft synthesized
      page-turn sweep pairs with every Mushaf flip (swipe, buttons, and
      recitation follow alike), a quiet three-note chime marks a completed
      khatma, and the tasbih tick that shipped earlier keeps its own
      toggle — all built in-memory with the Web Audio API (no assets,
      offline-first untouched), all opt-in and individually toggleable in
      the new Sound & Haptics settings panel, with haptics grouped in the
      same place. The kind of polish nobody asks for by name but that
      everybody notices as "feels premium" — and it never makes a sound
      unless the person asked for it.
- [x] **Tap-a-word Tajweed inspector** (v3.7). Tapping any word's popover
      now also answers "what do I DO here?" — every rule this word carries,
      letter-by-letter, bilingual, straight from the coloring classifier,
      with a settings toggle. The case-by-case guidance the practice mode's
      examples make concrete.
- [x] **Practice pools for every rule, real ayahs only** (v3.7). 18 rules
      x 25 ayahs picked by a deterministic surah-spread; includes the new
      shafawi family; verified through the live answer-key path.
- [ ] **A data health check (added v3.6, from the merge review).** A small
      Settings panel that reports storage size, days since last backup,
      and a one-tap "verify my backup restores cleanly" dry run against a
      sandboxed store instance. Backups people never test are hopes, not
      backups; this closes the loop without any server.
- [ ] **Qibla magnetic declination hint (added v3.6).** The compass view's
      bearing is true-north based; devices report magnetic north. Show the
      local declination ( NOAA model is a tiny static table at app latitudes)
      and a one-line note so bearings agree with other apps to within a
      degree or two. Small, honest precision win.

## v3.9 additions — owner-reported defects & gaps

- [x] **Universal fix for the "F5 refresh" flicker on tap.** Every action
      re-assigned innerHTML to topbar/nav/main/playerbar even when the
      output was byte-identical, restarting CSS animations, re-decoding
      images and dropping focus — the flicker the owner reported as "VERY
      ANNOYING". renderer.js now has a three-tier patch engine:
      identical → assign nothing; changed → reconcile top-level children
      (unchanged subtrees keep their live DOM nodes); focus salvage for
      inputs inside replaced subtrees. The matcher is pure + unit-tested
      (tests/renderPatch.test.js). **v3.13 update**: the engine now
      reconciles RECURSIVELY with a structural second pass — the gap this
      left was that single-root views (Focus mode, the Tasbih dial) still
      had their whole root replaced on every content-changing tap, which
      made the progress ring jump instead of animate, reset the inner
      scroll and cut the press state. Roots now bind structurally and
      patch in place; see the v3.13 CHANGELOG.
- [x] **An Ahadeeth library — "WHERE ARE THE AHADEETH?"** Now the six
      canonical books in full, both languages — Sahih al-Bukhari (7,580),
      Sahih Muslim (7,360), Sunan Abu Dawud (5,272), Jami' at-Tirmidhi
      (3,926), Sunan an-Nasa'i (5,679), Sunan Ibn Majah (4,340) — plus the
      Forty of an-Nawawi and Forty Hadith Qudsi: **34,239 hadith**
      (the four Sunans restored in v3.16.0 after the fork; total gated by
      a permanent test), chapter-indexed, deep-linkable
      (#/hadith/bukhari?n=7544), with in-book search, chapter filters,
      jump-to-number, paging and copy. Public-domain texts (sunnah.com via
      the CC0 hadith-api dataset); build pipeline + integrity gates in
      scripts/build-hadith.mjs; provenance in data/SOURCES.md. Nawawi/Qudsi + the book index are
      SW-precached (the daily hadith works with zero network); the six big
      books load on first open and stay offline after that, exactly like
      the on-demand tafsir volumes.
- [x] **Adhkar data overhaul — "the azkar are jumbled up… go over every
      and each one".** The audit found: 116 paraphrased LLM-generated
      duplicate records layered over the good Hisn-al-Muslim core, Ayat
      al-Kursi truncated mid-ayah (sleep), "Surah al-Mulk (full)" holding
      exactly one verse, ~60 translations/transliterations/virtues ending
      in "...", and morning/evening sequences that ignored the canonical
      order. Rebuilt through scripts/build-adhkar.mjs + 7 spec files:
      Qur'an excerpts extracted verbatim from the app corpus, complete
      texts everywhere, duplicates merged out, and all five core
      categories re-sequenced canonically (Kursi → three surahs →
      asbahna…). Hard gates (zero truncation, zero duplicate texts,
      sequential orders, corpus-verbatim checks, schema validity) now run
      in the build AND in tests/adhkar-gates.test.js so this can never
      silently regress. 168 verified records (was 284 jumbled ones).
- [x] **A standing system command for AI assistants** (AGENTS.md at the
      repo root, plus an in-app About section): the non-negotiables
      (offline-first, trusted sources only, no fabrication, no
      truncation, canonical order, untrusted-input discipline), the
      architecture rules, quality gates, release protocol, and the
      recurring audit checklist the owner can invoke "once in a while".

## UI/UX modernization — "the best, most modern there is" (added v3.10)

The owner's framing, read the right way round: modern means _smooth,
intentional, contemporary_ — not flashy everywhere. Every surface gets
the amount of modernity that SUITS it: the Mushaf stays a book (paper,
naskh, calm), the readers stay distraction-free, and the chrome around
them (navigation, transitions, feedback, loading, settings) becomes
state-of-the-art. Phased so each landing is complete, tested, and
bilingual — no half-migrated half-designs. Design principles that hold
across all phases: motion respects `prefers-reduced-motion` everywhere;
the two-language RTL/LTR mirror is designed, not retrofitted; nothing
ships that regresses the v3.9 anti-flicker engine or the a11y baseline.

- [x] **Phase A — system foundations.** (v3.11) Done as a measured,
      auditable pass, not a repaint: every brand/semantic FOREGROUND now
      flows through theme-tuned `-text` tokens, so dark/AMOLED holds WCAG
      AA for all ten palettes (before: all ten failed, midnight ~1.1:1);
      261 contrast pairs audited by scripts/css-contrast-audit.mjs (0
      failing) and gated in tests/cssDesign.test.js. Focus-visible rings
      fixed (the old global rule snapped pill buttons to squares) and
      tuned per theme; search bars get a focus-within glow. Standalone
      controls hit the 44px `--touch-target` token; in-text targets use
      hit-area expansion or the documented WCAG inline exception. Elevation
      gained its missing third layer (raised surface + lg shadow on
      modals/drawer). Two token audits now run in CI: undefined `var()`
      references (the v3.9 hadith styles shipped with two and rendered
      unstyled) and the contrast matrix. Phases B–E (motion, loading &
      feedback, navigation/IA, content surfaces) build on this base.
- [x] **Phase B — motion & micro-interactions.** (v3.12) Purposeful
      transitions built ON the v3.9 patch engine: the view entrance now
      rides a renderer-stamped transient `data-view-enter` state, so it
      plays exactly once per navigation and same-view re-renders can never
      restart it (live-verified); the tasbih completion bloom generalized
      into a reusable celebration (`js/celebrate.js` + `.celebrate`) wired
      into the khatma completion verdict, the quiz result screen and the
      prayer-log day-complete moment — transient by construction, so later
      re-renders stay silent; press-state scaling on nav items and
      interactive chips; spring-tuned Mushaf page-flip (and `will-change`
      scoped to the animating classes only); bottom-sheet spring physics
      on the mobile drawer (spring on arrival, standard on exit). All
      motion is sub-300ms except the two named blooms and documented
      ambient loops, all governed by the existing reduce-motion kill rule,
      and the whole contract is gated in tests/motion.test.js (21 tests).
      **This release also fixes a critical v3.10 regression found during
      the Phase B smoke test: a missing `resolvePage` export left the
      entry module unlinked — the app rendered blank since v3.10. Restored,
      unit-tested, and now impossible to re-ship (tests/appEntry.test.js
      imports the real entry module on every release run).**
- [x] **Phase C — loading & feedback.** (v3.14) Skeleton shimmer
      placeholders that mirror the shape of the incoming content on every
      lazily-loaded surface (surah picker, classic reader, hadith books,
      tafsir panels, mushaf pages, reciters catalog — each with an sr-only
      loading line and both reduce-motion kill rules); instant tap feedback
      on the checklist and prayer log (press states + the missing haptic
      tick on prayer-log cycles); an in-flight spinner state for surah-audio
      downloads (ephemeral `audioDownloading` slice, double-tap guarded);
      the Tier-2 sound-design item shipped alongside it (page-turn sweep +
      khatma chime, synthesized in-memory, off by default, individually
      toggleable in a new “Sound & Haptics” settings panel); and a shared
      empty-state component (medallion + honest title + one-tap next
      action) wired into Favorites, Collections, Search and the reciters
      catalog. **Residual, deliberate:** the remaining `.empty-hint` one-
      liners (small inline spots like the editor reminders list) stay as
      they are — a medallion block would outweigh the empty content there.
- [ ] **Phase D — navigation & information architecture.** Modern
      mobile nav polish (gesture-friendly bottom sheet with grouped
      sections, active-tab spring indicator), a command-palette-style
      global search (one input that reaches adhkar, hadith, surahs and
      settings with scoped filters), pull-to-refresh-free philosophy
      (data is local — surface "last updated" honestly instead), and a
      Home screen that composes its panels by time-of-day (prayer strip
      already does; extend to adhkar windows and the daily cards).
- [ ] **Phase E — content surfaces.** Reader typography refinement
      pass (optical sizes, translation/Arabic pairing, verse-badge
      redesign), hadith cards get the same share-card treatment as ayahs
      (v3.x shareCard reuse), quiz/practice views get a modern result
      screen with per-rule accuracy rings, and the settings screen gets
      grouped sections with search.

## Out of scope (deliberate, with reasons)

- **Mosque/halal-restaurant finder.** Every "Muslim Pro"-style app has
  this, but it requires a live third-party places/maps API and (for
  useful results) a server-side directory — both are flatly incompatible
  with this app's no-accounts/no-server/nothing-leaves-your-device
  architecture. Could revisit _only_ as a "paste a link to your local
  mosque's own site" manual shortcut, never a live directory.
- **Social/community feed ("Ummah" tab), AI chat Q&A about Islam.** Out of
  keeping with a private, offline, single-user app, and an AI answering
  religious questions without scholarly oversight is a real harm risk
  this project isn't going to take on.
- **Ads / premium paywall.** Every competitor above funds itself this way;
  this app doesn't have a business model and isn't getting one.
- **Native home-screen widgets.** Not achievable from a PWA on iOS at
  all, and only partially on Android (App Shortcuts already ship via
  `manifest.json`); a real widget needs a native shell this project
  doesn't have.
