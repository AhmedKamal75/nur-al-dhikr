# Nūr al-Dhikr (نور الذكر)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow.svg)](ARCHITECTURE.md)
[![PWA offline-first](https://img.shields.io/badge/PWA-offline--first-blue.svg)](USAGE.md)
[![Tests](https://img.shields.io/badge/tests-1009_passing-brightgreen.svg)](#tech)

An offline-first, installable web app for daily Islamic remembrance —
Adhkar, the complete Qur'an, 34,239 Ahadeeth, prayer times, and worship
tools. **No account, no server, no analytics: nothing ever leaves your
device.**

> New here? Start with **[USAGE.md](USAGE.md)** (install + guided tour).
> Opening the folder directly? Read **README-FIRST.txt**, or just run
> `python3 -m http.server 8080` and open `http://localhost:8080`.

---

## Features

**Remembrance.** 1,192 Adhkar and Duas across nine libraries (morning,
evening, post-prayer, sleep, tasbihat, 41-category Duas, Qur'anic and
Prophets' duas, 99 Names, reflections, Daily Sunnah), with references,
honest authenticity gradings, diacritic-insensitive Arabic search,
favorites, collections, Focus mode, mood browsing, share-as-image cards,
listen-aloud, and a full editor for your own content.

**Qur'an.** A 604-page Mushaf reader (11 paper editions, 4 Naskh
typefaces, double-page spread, pinch zoom, true fullscreen, translation
tray) plus a classic reader with 5 translations, per-word grammar, root
browser, tabbed tafsir, tajweed color-coding with drill mode, hifz SRS,
314-reciter audio with follow-along and offline downloads.

**Worship.** Astronomical prayer times (7 methods, high-latitude
fallback) with adhan alerts, Qibla compass, Hijri calendar with notes
and reminders, voluntary fasting tracker, Ramadan companion, Zakat
calculator, daily checklist, statistics with streaks and heatmap, and a
Khatma planner.

**Personal.** Tasbih counter, onboarding, JSON backup/restore with
health check, full EN/AR RTL interface with light/dark/auto themes,
high-contrast and reduced-motion modes, kids mode, and family profiles.

## Quick start

```bash
# 1. Serve it (browsers block app code over file://)
python3 -m http.server 8080
# 2. Open http://localhost:8080
# 3. Install it from your browser menu — then it works fully offline.
```

Easier: double-click the `Start-Here-*` launcher for your system, or
drop the folder on any static host (Netlify Drop, GitHub Pages).

## Privacy

There is no backend to trust: everything runs on your device, and your
data (bookmarks, logs, settings) lives in your browser. The only
network requests the app ever makes are a small documented set —
recitation audio and on-demand tafsir, loaded lazily. See
[SECURITY.md](SECURITY.md).

## Tech

Vanilla HTML, CSS, and JavaScript (ES modules). **No build step, no
framework, no runtime dependencies.** The repo root is the deployable
site; a service worker precaches the shell and serves data
stale-while-revalidate so repeat visits are instant and offline-forever.

```bash
npm install        # dev-only: eslint + prettier (+ playwright for e2e)
npm run check      # lint + format:check + unit tests — all green
npm run e2e        # browser smoke + race specs
```

## Documentation

| File                     | What it holds                                     |
| ------------------------ | ------------------------------------------------- |
| **[USAGE.md](USAGE.md)** | Install guide, feature tour, FAQ                  |
| **ARCHITECTURE.md**      | Layer rules, directory map, data flow, invariants |
| **CONTRIBUTING.md**      | Setup, rules, PR process                          |
| **SECURITY.md**          | Scope, reporting, privacy                         |
| **docs/RELEASES.md**     | Release history, newest first                     |
| **docs/AUDITS.md**       | Past audit findings and their fixes               |
| **docs/DEVICE-TEST.md**  | The 30-minute real-device checklist               |
| **docs/APP-FLOW.md**     | Navigation spec — routes, layers, invariants      |
| **docs/ADD-LANGUAGE.md** | How to add a UI language                          |
| **CREDITS.md**           | Content, font, audio, and model provenance        |
| **data/SOURCES.md**      | Per-dataset source documentation                  |
| **LICENSE.md**           | MIT license (code) + content-license pointers     |

## Honest limitations

- Hijri dates use the tabular calendar (±1 day vs moon sightings);
  prayer times are astronomical estimates — corroborate locally.
- Audio alerts need an open tab and one prior tap (browser autoplay
  policy). Background alerts depend on platform support.
- WMM2025 compass declination is valid through 2030.
- Restoring a backup prunes per-day history older than two years
  (totals, streaks, and heatmap are unaffected).

## Content accuracy

Adhkar and Duas come from Hisn al-Muslim and the authentic Sunnah with
per-item references — an "Unknown" grade beats a confident error. This
is not a substitute for scholarly guidance. Sacred texts are extracted
verbatim from the bundled data, never retyped; report mistakes with a
citable source and they will be fixed from one.

## License

Code: [MIT](LICENSE.md). Content (texts, translations, fonts, audio)
carries its own open licenses — see [CREDITS.md](CREDITS.md).
