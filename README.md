# Nūr al-Dhikr (نور الذكر)

An offline-first, installable web app for daily Islamic remembrance —
Adhkar, Duas, the 99 Names of Allah, prayer times, a Hijri calendar, a
tasbih counter, a Ramadan fasting companion, a Zakat calculator, and a
full content editor for adding your own material.

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
- **Bundled Amiri typography** — the Arabic Naskh rendering is identical
  on every device (Amiri Regular + Bold, Arabic-subset woff2, SIL OFL 1.1,
  local()-first so devices with Amiri installed download nothing).
- **Share as an image card** — any dua or adhkar renders as a designed
  PNG (palette-aware, Amiri Arabic, Khatim-star frame, grade chip) sized
  to its text so nothing is cropped; shared via the Web Share API with a
  download fallback.
- **A prayer log** — a tri-state button beside each of the five prayers
  (prayed / in congregation / clear) with a week strip, full-day streak,
  and month count, sharing storage with the daily checklist so the two
  views always agree.
- **Browse by need** — twelve curated moods (anxious, seeking forgiveness,
  grateful, healing, protection, provision, decisions, patience, family,
  travel, sleep, purify the heart), each assembling a cross-library list
  from whole categories plus tag matches everywhere.
- **A Khatma planner** — set a finish date and/or pages-per-day goal on the
  604-page Mushaf; get today's target pages, your pace, the required
  pages/day for the deadline, a projected finish date, an honest
  on-track verdict, and a small history of completed khatmas — plus a
  one-tap Ramadan preset that finishes by the 27th night.
- **A living Home screen** — the next prayer (name, clock time, and a
  ticking countdown) computed from the same solar engine as the Prayer
  view, today's Hijri date, and time-aware "Now" nudges on the morning/
  evening adhkar shortcuts that follow the actual sun (Fajr→Dhuhr,
  Asr→Isha) once a location is set.
- **A first-run "Getting started" panel** — four observable steps (set
  location, personalize, install, first reading) with deep links and an
  honest install fallback; auto-hidden when complete and never shown to
  returning users on upgrade.
- **Statistics that tell the truth** — total, streaks, a 30-day total,
  average-per-day over the full window (not just active days), all-time
  active days, a weekly bar chart with value labels and a best-day
  highlight, and a heatmap you can page back through a year of history.
- **JSON backup/restore** — export everything to a file, import it back on
  any device. No account, no server, nothing ever leaves your device.
- **PWA**: installable, offline-capable via a service worker (cache-first
  app shell, stale-while-revalidate content), app icons, shortcuts — and
  a proper update flow: when a new build ships, installed apps get a
  one-tap "Refresh" toast instead of silently running the old version
  forever.
- **Dual Hijri/Gregorian calendar** with month navigation, plus custom
  notes and reminders on any date — once, daily, every N days, or across
  a date range.
- **Ramadan Companion** — a live Suhoor–Iftar countdown computed from your
  actual Fajr/Maghrib times (ticking once a second without touching the
  store), a 29/30-day fasting tracker with a private per-Ramadan log, a
  Laylat al-Qadr odd-night indicator for the last ten nights, and —
  outside the month — countdowns to the next Ramadan and Eid al-Fitr.
- **Zakat Calculator** — gold (85 g) / silver (595 g) nisab with your own
  metal prices, seven asset categories minus liabilities, a live 2.5%
  result rounded up to the whole currency unit, a Zakat al-Fitr household
  sub-calculator, and a saved history. Everything stays on-device.
- **Per-ayah Mushaf bookmarks + khatma progress** — bookmark any ayah from
  its detail sheet (marked on the page with a highlight and star), jump
  back from the bookmark list, and track how many of the 604 pages you've
  opened with a resettable khatma progress bar. Bookmarks can be filed
  into folders and carry a short note.
- **Word-by-word grammar study & multi-source tafsir** — tap any word (in
  either reading mode) for its root, i'rab (case/mood), sarf (verb form &
  pattern), an English gloss, and real Qur'anic ayahs sharing the same
  root; open a tabbed panel per ayah with 7 bundled tafsir/grammar sources
  (al-Muyassar, al-Mukhtasar, al-Jalalayn, al-Jadwal fī I'rāb al-Qur'ān,
  al-I'rāb al-Muyassar, Tahlīl Kalimāt al-Qur'ān, Gharīb al-Qur'ān — all
  fully offline) plus 8 more classical works available with a one-tap
  download, cached forever after. Mushaf display settings add 3 typefaces,
  8 paper color themes, text-size/line-spacing sliders, and a page-flip
  animation.
- **Suhoor/Iftar alerts** — Hijri-gated Ramadan alerts N minutes before
  Fajr (selectable offset) and at Maghrib, on the same solar engine as
  Smart Prayer Alerts.
- **Zakat hawl reminders** — each saved assessment tracks its lunar-year
  anniversary (~354 days) with a reminder on the day.
- **Audited, enriched content** — a scripted dedupe pass removed true
  double-entries (composites vs. split cards) across every library, and
  three new duas sections (Decisions & Istikharah, Work & Trade,
  Greetings & Etiquette) plus 26 authenticated items were added with
  honest gradings.
- **Collapsible grouped navigation** — a scrollable, hamburger-collapsible
  side rail (Read / Worship / Tools / Mine) on desktop and a grouped
  More-drawer on mobile.
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
  adhkarTiming.js           Sun-based (or clock-fallback) adhkar windows
  khatma.js                   Khatma planner math (pace, projection, Ramadan preset)
  moods.js                     "Browse by need" curated cross-library moods
  prayerLog.js                 Tri-state five-prayer log helpers
  shareCard.js                 Canvas renderer for shareable image cards
  onboarding.js             First-run step logic (pure)
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
  views/        home, library, category, mood, focus, search, favorites,
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

**A note on the Qur'an word-study & tafsir data**: per-word root/i'rab/sarf
data is derived from the Quranic Arabic Corpus morphology dataset
(corpus.quran.com, Kais Dukes et al.); English word-by-word glosses and
transliteration from the quranwbw.com dataset; tafsir and grammar texts
(al-Muyassar, al-Mukhtasar, al-Jalalayn, Ibn Kathir, al-Qurtubi, at-Tabari,
al-Baghawi, al-Waseet, Tanwir al-Miqbas, as-Sa'di, al-Jadwal fi I'rab
al-Qur'an, al-I'rab al-Muyassar, Tahlil Kalimat al-Qur'an, Gharib
al-Qur'an, and ad-Darwish's I'rab al-Qur'an) via spa5k/tafsir_api, each
authored by the classical or contemporary scholar named in its own entry.
As with the rest of this app, none of this is a substitute for scholarly
guidance.

## Notes on scope

- Arabic typography is bundled: Amiri Regular + Bold + Amiri Quran
  (Arabic-subset woff2) ship in `assets/fonts/` under the SIL Open Font
  License 1.1 (`OFL.txt`), referenced `local()`-first from `variables.css`
  so installed copies are preferred and nothing downloads needlessly.
- The bundled word-study + tafsir data adds roughly 90MB on-device
  (`data/quran-words/`, `data/quran-roots.json`, `data/tafsir/`) —
  fetched lazily per surah/edition the same way `data/quran/*.json`
  always has been, never on first load, and cached offline by the
  service worker after each surah/edition is opened once. The handful of
  very large classical tafsirs (Tabari, Qurtubi, etc.) are deliberately
  *not* bundled — see `data/tafsir-editions.json` and the README note
  above.
- Audio recitation (`item.audio`) is left `null` throughout — the schema
  supports it, but no audio files are bundled (the reciter system streams
  from public CDNs instead, with optional offline downloads).
