# Changelog

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
