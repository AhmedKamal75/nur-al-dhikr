# Nūr al-Dhikr (نور الذكر)

An offline-first, installable web app for daily Islamic remembrance. No
account, no server, no analytics — nothing ever leaves the device.

**Scope in one paragraph:** 1,192 Adhkar/Duas across nine libraries, the
complete Qur'an (114 surahs, 5 translations, per-word grammar, 15 tafsir
sources, tajweed color-coding), a 604-page Mushaf reader with 11 print-style
paper editions and 4 Naskh typefaces (including Scheherazade New, the
closest free hand to Medina print), 34,239 Ahadeeth across eight books, prayer times from real
solar astronomy, Qibla with the WMM2025 declination model, a Hijri calendar
with notes and reminders, a tasbih counter, hifz memorization mode, a
Ramadan fasting companion, a Zakat calculator, statistics with streaks and
heatmap, a Khatma planner, mood-based browsing, a full content editor, JSON
backup/restore, and a 10-palette × 8-shape bilingual (EN/AR, RTL) design
system.

Built entirely in vanilla HTML, CSS, and JavaScript (ES modules). No build
step, no framework, no runtime dependencies.

---

## Running it

Any static file server works (the app is 100% client-side but must be
served over HTTP(S) — `file://` blocks ES module imports and the service
worker):

```bash
cd nur-al-dhikr
python3 -m http.server 8080
# open http://localhost:8080
```

Once loaded, it installs as a PWA and works fully offline. The service
worker precaches the app shell (entry file included — styles, fonts, every
manifest icon, adhan audio) and serves per-chunk data (`data/quran/*.json`,
`data/hadith/*.json`, …) stale-while-revalidate from a **migrated** data
cache — a new release copies your downloaded books forward instead of
wiping them — so repeat visits are instant and offline-forever.

## Verification (run before claiming anything works)

```bash
npm install        # dev-only: eslint + prettier
npx eslint .       # zero errors (js, tests, sw.js — all linted)
npm test           # node --test tests/*.test.js — 972 tests
npm run check      # lint + format:check + test, all green
```

The suite includes behavioral gates that make silent regressions loud:
the entry-module link gate (imports the real `js/app.js` in a child
process), the SW-precache coverage gate (walks the import graph and
asserts every module is precached **and every precache entry exists on
disk**), the **contract gates** (en↔ar dictionary parity + placeholder
parity + every `t()` key resolvable, every emitted `data-action` resolves
to a handler, version markers in lockstep across package/config/SW/
manifest, Qur'ān corpus verse-counts == quran-meta, the CSS release
protocols — category dark variants, z-scale, 12px type floor, tap-target
minimums, RTL logical-property discipline), the CSS token-resolution and
WCAG contrast gates (light + dark × all 10 palettes), the motion contract
(entrances scoped to navigation, ≤300ms transitions, reduced-motion kill),
restore-sanitizer adversarial batteries, the **prayer-engine golden tests**
(city matrix vs an independent NOAA-factsheet reference, high-latitude
midnight-wrap and polar-night honesty), and per-feature behavior pins.

---

## Docs

| File                      | What it holds                                                           |
| ------------------------- | ----------------------------------------------------------------------- |
| **README.md** (this file) | Product scope, running, verification, feature index, honest limitations |
| **ARCHITECTURE.md**       | Layer rules, directory map, data flow, invariants, release protocol     |
| **docs/RELEASES.md**      | Release history, newest first                                           |
| **docs/AUDITS.md**        | Past audit findings and their fixes (moved out of the old TODO.md)      |
| **docs/DEVICE-TEST.md**   | The 30-minute real-device checklist (no headless equivalent exists)     |
| **docs/APP-FLOW.md**      | The navigation DFA spec — routes, layers, invariants                    |
| **docs/ADD-LANGUAGE.md**  | How to add a UI language                                                |
| **CREDITS.md**            | Content, font, audio, and model provenance                              |
| **data/SOURCES.md**       | Per-dataset source documentation (religious-data integrity)             |

---

## Feature index

**Reading.** Morning/evening/post-prayer/sleep/wake-up/tasbihat Adhkar,
41-category Duas, Qur'anic and Prophets' duas, 99 Names with virtues and
quiz, Reflections, 100 Authentic Duas, Daily Sunnah, Special Days &
Seasons. Diacritic-insensitive Arabic search plus full-text Qur'an search.
Favorites, collections, Focus mode, mood browsing, share-as-image cards,
listen-aloud, and a full editor for your own content.

**Qur'an.** The Mushaf is the default reading experience: a paper-book
view (604 authentic pages, 4 typefaces, 11 paper editions including
Madinah-green, cream Indo-Pak and black-and-gold frames, illuminated
frame, juz/surah medallions, Eastern ayah markers, sajda marks) with
double-page spread, pinch/zoom, TRUE fullscreen, and a translation tray.
The classic reader (5 translations, immersive mode) stays one tap away.
Per-word grammar, root browser, tabbed tafsir, tajweed engine with drill
mode, hifz SRS, 314-reciter audio with follow-along and offline downloads.

**Worship.** Astronomical prayer times (7 methods, high-latitude
fallback) with adhan alerts and a tri-state log, daily checklist, Hijri
calendar with notes and reminders, voluntary fasting tracker, Ramadan
companion with live countdown, and a Zakat calculator with history.

**Personal.** Honest statistics (streaks, heatmap, charts), Khatma
planner, "Today in worship" card, anti-guilt nudge, onboarding, JSON
backup/restore with dry-run health check, and a full EN/AR RTL UI with
light/dark/auto themes, high-contrast and reduced-motion modes.

## Honest limitations

- Hijri dates come from the fixed tabular calendar and can differ by a day
  from local moon sightings; prayer times are astronomical estimates —
  corroborate locally.
- Page-audio (adhan, alerts) fires only while the tab is open and after
  one user interaction (browser autoplay policy). A closed tab gets the
  plain system notification with the browser's default sound.
- Periodic-sync catch-up is arithmetically narrow where only
  `periodicsync` exists (12h browser cadence vs 15-min lateness window) —
  by design; the Prayer view's reliability row is the source of truth.
- Rare Qur'anic annotation marks (small-high ya/noon) are not individually
  interpreted by the tajweed engine.
- The search index follows the selected translation edition (not all five
  at once); tafsir text is not full-text-searched — deliberate memory
  trade-offs, revisit on request.
- WMM2025 declination is valid through 2030.
- A handful of Mushaf reader transients (flip direction, bookmark folder
  filter, active tafsir tab) are documented single-use module state — a
  known purity compromise, not a bug.
- **Long-tenured users:** restoring a backup prunes daily-history entries
  older than two years (731 days) as part of the v4.2 restore hardening —
  all-time counters, streak values, and the current heatmap are unaffected;
  only the per-day drill-down beyond two years is trimmed.

## Content accuracy

Adhkar/Duas are drawn from Hisn al-Muslim and the authentic Sunnah, with
per-item references and honest authenticity gradings (an "Unknown"
grade beats a confident error). Order is content — canonical sequences
are preserved. This is not a substitute for scholarly guidance; verify
anything you rely on religiously with a qualified source. Never
fabricate, paraphrase, or truncate a sacred text: Qur'an excerpts are
extracted verbatim from `data/quran/`, never retyped.
