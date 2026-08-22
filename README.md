# Nūr al-Dhikr (نور الذكر)

An offline-first, installable web app for daily Islamic remembrance —
Adhkar, Duas, the 99 Names of Allah, prayer times, a Hijri calendar, a
tasbih counter, and a full content editor for adding your own material.

Built entirely in vanilla HTML, CSS, and JavaScript (ES modules). No build
step, no framework, no external runtime dependencies, no analytics or
tracking of any kind.

## Running it

Any static file server works, since the app is 100% client-side:

```bash
cd nur-al-dhikr
python3 -m http.server 8080
# open http://localhost:8080
```

Or open `index.html` directly through any local server (it must be served
over HTTP(S) — `file://` won't allow the ES module imports or service
worker to run). Once loaded once, it installs as a PWA and works fully
offline from then on.

## What's included

- **1,300+ content items** across nine libraries: Adhkar (Morning, Evening,
  Post-Prayer, Sleep, Wake-up, General Tasbihat, Daily Supplications),
  everyday Duas (38 categories — food, travel, clothing, illness, distress,
  home, forgiveness, patience, faith, gratitude, guidance, wudu, family,
  provision, protection & ruqyah, yaqeen-inspired duas, Friday, Ramadan, and
  more), an expanded set of Qur'anic supplications, individual Duas of the
  Prophets (Adam, Nuh, Ibrahim, Musa, Yunus, Ayyub, Zakariya, Sulayman,
  Dawud, Isa, and Muhammad ﷺ, plus the believers), all 99 Names of Allah
  (each with hadith-referenced virtue text), thematic Reflections & Duas
  (including "Prayers of the Pious"), a "100 Authentic Duas" collection
  drawn from published Islamic literature, daily Sunnah practices & etiquette,
  and a Special Days & Seasons library (the Ten Days of Dhul Hijjah, Eid).
  Every item carries Arabic text, transliteration, an English translation, a
  reference (collection, hadith/verse number, and — where available —
  narrator and grading detail), an authenticity grade, repetition count,
  and virtue text.
- **A complete Qur'an reader** — all 114 surahs, 6,236 ayahs, Arabic text
  with the Sahih International translation, searchable by surah name or
  number, fetched lazily (never bloats first load) and cached offline
  per-surah after first visit. Includes a "Continue Reading" shortcut back
  to the last surah opened.
- **Offline prayer times** computed from real solar-position astronomy
  (no API calls) — 7 calculation methods, both Asr conventions, and a
  high-latitude fallback (one-seventh-of-night rule) for locations where
  standard twilight angles are never reached in summer.
- **Offline Hijri calendar** via the civil tabular calendar algorithm, with
  upcoming Islamic occasions (Ramadan, both Eids, Ashura, Arafah, etc.)
  resolved to Gregorian dates.
- **Full content editor** — create your own libraries, categories, and
  items with the same structured fields as the built-in content (including
  narrator, grading, and attribution notes); edit, duplicate, delete.
- **Search** across Arabic text, transliteration, translation, tags, and
  references, with Arabic diacritic-insensitive matching — stays well
  under 500ms even across the full 1,300+ item index.
- **Favorites, collections, statistics** (streaks, weekly chart, monthly
  heatmap, most-read categories), a digital **tasbih counter** with presets
  and lifetime totals, and a distraction-free **Focus Mode** for reading/
  counting one item at a time.
- **10 color palettes × 8 shape styles**, light/dark/auto themes, adjustable
  font sizes, reduced-motion and high-contrast modes.
- **Full English/Arabic UI** with correct RTL mirroring.
- **JSON backup/restore** — export everything to a file, import it back on
  any device. No account, no server, nothing ever leaves your device.
- **PWA**: installable, offline-capable via a service worker (cache-first
  app shell, stale-while-revalidate content), app icons, shortcuts.
- **Dual Hijri/Gregorian calendar** with month navigation, plus custom
  notes and reminders on any date — once, daily, every N days, or across
  a date range.
- **Smart Prayer Alerts** computed against your actual daily prayer times
  (not a fixed clock time that drifts), with a choice of alert tones.
- **A visible Play (listen-aloud) button** on every card and in Focus Mode.

## Architecture

```
index.html          App shell (topbar / main / bottom nav mount points)
manifest.json        PWA manifest
sw.js                 Service worker (offline caching)
offline.html          Fallback page for uncached navigations

data/
  catalog.json         Registry of content libraries
  adhkar.json, duas.json, quranic.json, prophet-duas.json, asma.json,
  reflections.json, pdf-duas.json, daily-sunnah.json, special-days.json
                        Content, all in the same unified schema
  quran-meta.json       Surah/juz index for the Qur'an reader (small, precached)
  quran/1.json … 114.json
                        Full Qur'an text (Arabic + Sahih International),
                        one file per surah — fetched lazily, never at boot

assets/css/           variables → base → layout → components → cards →
                       quran → animations → accessibility (loaded in that order)
assets/icons/          Generated app icons (incl. maskable + Apple touch)

js/
  config.js             Static constants (views, palettes, defaults)
  utils.js               Pure helpers (no DOM/state coupling)
  i18n.js                 UI string dictionary (EN/AR)
  schema.js               Content validation + normalization
  migration.js            Upgrades legacy/unknown JSON shapes
  storage.js               localStorage + IndexedDB wrapper (only module
                           that touches either directly)
  state.js                  Single store: reducer, actions, selectors
  search.js                  In-memory search index
  statistics.js               Derived stats (heatmap/streak helpers)
  tasbih.js                    Counting logic shared by cards + dial
  prayer.js                     Solar-position prayer time calculation
  calendar.js                    Gregorian ⇄ Hijri conversion
  notifications.js                Local reminder scheduling
  speech.js                        Web Speech "listen" wrapper
  backup.js                         Export/import
  editor.js                          Custom content CRUD
  theme.js                            Applies settings to <html> attrs
  router.js                            Hash router
  renderer.js                           Top-level render loop
  icons.js                               Inline SVG icon set
  app.js                                  Boot + global event delegation

  components/   card.js, shell.js, modal.js, toast.js, menus.js
  views/        home, library, category, focus, search, favorites,
                collections, collection, statistics, tasbih, prayer,
                calendar, settings, about, editor
```

**Data flow is one-directional**: views are pure functions of state that
return HTML strings; `renderer.js` swaps them into `#main`; every user
interaction goes through a *single* delegated event listener in `app.js`
(click/input/change/submit/keydown on `document`) that dispatches actions
into `state.js`; the store notifies its one subscriber, which re-applies
the theme and re-renders. No view ever touches `localStorage`, fetches
data, or attaches its own listeners.

## Content sources & accuracy

Adhkar/Duas text is drawn from *Hisn al-Muslim* and the authentic Sunnah
(Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Ahmad), a
published "100 Duas from the Qur'an and Sunnah" collection (Al-Munajjid),
and other named Islamic literature sources cited per-item where available.
Authenticity grades reflect the commonly cited status of each narration.
This is not a substitute for scholarly guidance — please verify anything
you plan to rely on religiously with a qualified source. Hijri dates are
computed from a fixed arithmetic calendar and can differ by a day from
local moon-sighting announcements; prayer times are astronomical estimates
and should be corroborated locally.

**A note on the 99 Names content specifically**: an earlier draft of this
library included long-form devotional essays for each name, adapted from
an external source. On review, several of those essays contained orphaned
`[1][2][3]`-style footnote markers with no accompanying bibliography — a
strong signal the prose had been lifted from a specific website rather
than written for this project — so that essay text was deliberately
excluded. The factual fields (Arabic, transliteration, translation) for
each of the 99 Names remain, since those are standard across virtually
every Islamic reference and not meaningfully "authored" content.

## Notes on scope

- Arabic/UI fonts use a system font-stack fallback (Amiri → Traditional
  Arabic → Noto Naskh Arabic → serif) rather than a bundled webfont, since
  this build environment couldn't reach a font CDN. Drop `Amiri-Regular.woff2`
  etc. into a `assets/fonts/` folder and add an `@font-face` rule in
  `variables.css` for fully consistent typography across devices.
- Audio recitation (`item.audio`) is left `null` throughout — the schema
  supports it, but no audio files are bundled.
