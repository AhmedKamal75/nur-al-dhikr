# Changelog

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
