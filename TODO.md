# TODO — becoming a complete, professional Muslim companion app

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
- [ ] **More Qur'an translations.** Every competitor above ships 30–40+
      languages; this app has exactly one (Sahih International, English).
      At minimum: Urdu, French, Turkish, Indonesian — the four next most
      requested worldwide — sourced from the same open Tanzil-derived
      translation corpora already proven reliable in this app's pipeline,
      selectable per-person in both reading modes.
- [ ] **Continuous surah audio playback with auto-advancing ayah
      highlight**, in _both_ reading modes. Today, tapping play in the
      classic reader highlights one ayah and stops; the Mushaf reader has
      no reciting-ayah highlight at all. A "listen to the whole surah,
      follow along" mode (auto-scroll + highlight + auto-advance to the
      next ayah, continuing across page turns in the Mushaf) is standard
      and directly useful for the word-study feature just shipped.

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
- [ ] **Verse-of-the-day / daily reflection surface** on the Home screen,
      pulling from the ayah/reflection libraries already in `data/`,
      rotating deterministically by date (no server, no randomness that
      breaks offline-first).

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
- [ ] **A real "continue" button on Home.** One tap back to exactly where
      Qur'an reading (and ideally Adhkar) left off, front and center on
      the home screen, instead of navigating back through the Mushaf/
      Surah picker every single time. Sounds trivial; is the single most
      repeated action in the entire app, so the tiny friction it removes
      is repeated more than any other improvement on this list.
- [ ] **A gentle "it's been a while" nudge — never a streak-shame.** Most
      habit apps punish a broken streak with guilt-inducing copy; this
      app already has enough real data (last dhikr session, last Qur'an
      page, last prayer logged) to instead say something quietly kind
      after a gap, with zero judgment, and mean it. The differentiator
      isn't the nudge itself, it's _not_ doing the manipulative version
      every other habit app defaults to.
- [ ] **Subtle, optional sound design.** A soft page-turn sound to pair
      with the flip animation already built, a different soft chime when
      a khatma completes, a small haptic tick on each tasbih count on
      devices that support it — all opt-in, all off by default, all
      individually toggleable. The kind of polish nobody asks for by name
      but that everybody notices in a review as "feels premium."
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
