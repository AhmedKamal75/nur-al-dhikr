# Changelog

## v2.5.0

### Added
- **Qur'an reading-plan (Khatm) tracker** — new `js/khatm.js` pure module
  and a panel at the top of the Qur'an hub view. Pick a pace (30 days, 60
  days, or one page a day) and get a progress bar, percent complete, and
  an honest on-track/behind/overdue/completed status computed from the
  existing Mushaf page bookmark — no new "which pages did I read" tracking,
  just an approximate linear-progress read against your target date.
- **Missed-prayer (Qada') tracker** — five +/- counters (Fajr–Isha) added
  directly to the Prayer view, reusing the existing `.target-stepper`
  component from the Tasbih view.
- **Last-Third-of-the-Night time** — new `nightThirds()` helper in
  `prayer.js`, surfaced in the Prayer view as the classically blessed
  window for dua and tahajjud (computed from tonight's Maghrib to
  tomorrow's Fajr with the same offline solar-position math already in use).
- **Extended Sunnah fasting tracking** — the Ramadan & Fasting Companion
  now also flags White Days (Ayyam al-Beedh, using the existing
  `isWhiteDay` calendar helper) as a recommended-fast day, and shows a
  Six-Days-of-Shawwal progress panel (X/6) automatically once Shawwal
  begins — both built on top of last release's fasting log with no new
  state needed (`voluntaryFastReasons()`, `shawwalProgress()` in
  `ramadan.js`).
- **Sadaqah (charity) log** — new `views/sadaqah.js`: log ongoing
  charitable giving (amount, cause, date, optional note), see this-month
  and all-time running totals, browse and delete history. Deliberately
  separate from the once-a-year Zakat calculator. Reuses the Zakat
  currency label so the two stay consistent.
- New Home quick-action tile and desktop-nav entry for Sadaqah; a new
  `coins` icon.

### Engineering
- 30 new unit tests: `tests/khatm.test.js` (7), `tests/prayer.test.js` (2,
  first tests for `prayer.js`'s core astronomy), and 12 more added to
  `tests/ramadan.test.js` for the White Days/Shawwal helpers. All 108
  tests (pre-existing + new) pass; 0 ESLint errors project-wide.
- Extended the ad-hoc jsdom smoke test to render the Qur'an hub across all
  five Khatm states (no plan / on-track / behind / overdue / completed),
  the Prayer view with and without logged Qada', and the Sadaqah log with
  real entries — and hand-verified the computed numbers (e.g. a 15-day-in
  30-day plan at page 20 correctly reports "39 pages/day needed"; two
  Sadaqah entries in the same month correctly total both "this month" and
  "all time").
- Bumped the service worker cache version and kept 100% precache parity
  with `js/**/*.js` (verified by diffing the file tree against the
  precache list).

## v2.4.0

### Added
- **Ramadan & Fasting Companion** — a live Suhoor-to-Iftar countdown, built
  on the same offline solar-position calculation the Prayer view already
  uses (Suhoor ends at Fajr, Iftar begins at Maghrib — no new astronomy, no
  network calls). Shows day-of-Ramadan progress, a private fasting log with
  a streak badge (mirroring the existing daily-checklist streak pattern),
  and the bundled Suhoor/Iftar duas front and center. Also works outside
  Ramadan for voluntary Monday/Thursday fasts. New `js/ramadan.js` pure
  logic module + `views/ramadan.js`.
- **Offline Zakat calculator** — computes Zakat al-Mal (2.5% of zakatable
  wealth once it meets the nisab threshold) from cash, gold, silver,
  investments, business inventory, receivables, and liabilities. Shows
  both the gold-standard (85g) and silver-standard (595g) nisab thresholds;
  gold/silver spot prices are entered manually since this app makes no
  network calls. New `js/zakat.js` pure logic module + `views/zakat.js`.
- **Per-ayah bookmarking in the Mushaf reader** — a bookmark toggle in the
  ayah detail modal (opened by tapping any ayah), a small star marker on
  bookmarked ayahs directly on the page, and a "Bookmarked Ayahs" section
  in the existing jump drawer to revisit or remove them. Distinct from the
  existing last-page-visited bookmark — this is an explicit, multi-entry
  per-verse list.
- Two new Home quick-action tiles (Ramadan, Zakat) and two new desktop-nav
  entries, following the same "quick action on mobile, side-rail on
  desktop" pattern already used for Prayer/Qibla/Checklist/Calendar.

### Engineering
- New unit-tested pure modules: `ramadan.js` (Ramadan status via the
  existing Hijri conversion, Suhoor/Iftar phase detection, fasting streaks)
  and `zakat.js` (nisab + zakat-due calculation). 23 new tests; all
  existing tests continue to pass unchanged.
- Three new persisted state slices (`ramadanFasting`, `zakat`,
  `mushafAyahBookmarks`), included in JSON backup/restore automatically
  since `backup.js` serializes whatever `PERSISTED_KEYS` lists.
- The Zakat form binds its number fields on `change` (blur), matching the
  existing `dailyGoal`/prayer-settings pattern — the renderer does a full
  `innerHTML` swap on every dispatch, so binding on every keystroke would
  steal focus mid-type on a form with this many fields.
- Bumped the service worker cache version and added the two new view files
  to the precache list. While doing that, also found and fixed three
  pre-existing files (`calendarNotes.js`, `components/calendarModals.js`,
  `prayerSound.js`) that were never being precached — they worked online
  via the cache-first fallback fetch, but wouldn't have been available on
  a first-ever offline load. All `js/**/*.js` files are now precached.

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
