# AGENT-MAP — the project in one page

GENERATED — do not hand-edit. Regenerate with `node scripts/agent-map.mjs` (plain node, no args).

Read this file first. It is deliberately short: the spine, the lookup tables and the counted inventories. For one specific module’s exports, one `data-action`’s handler, or one keyword’s owners, read the exhaustive dump next.

- js modules: 244 — data files: 27 — tests: 282
- exhaustive dump: `docs/agent-map-full.md` (553 entries)

## 1. The spine: chrome section → routes → view module

Seven sections own the chrome. Each row is derived from `js/core/config/nav.js` (DOORS), whose route ids come from `js/core/config/views.js` (VIEWS) and whose view modules come from `js/app/renderer.js` (VIEW_TABLE eager / LAZY_VIEW_LOADERS lazy). Nothing below is pinned here — change the source and regenerate.

| #   | section (label key) | entry route                 | routes under it                                                                 | tap | via                       |
| --- | ------------------- | --------------------------- | ------------------------------------------------------------------------------- | --- | ------------------------- |
| 1   | `nav.home`          | `HOME` → `#/home`           | HOME → `js/views/home.js`                                                       | 1   | — (is the tap)            |
| 2   | `nav.azkar`         | `LIBRARY` → `#/library`     | LIBRARY → `js/views/library.js`                                                 | 1   | — (is the tap)            |
| 2   | `nav.azkar`         | `LIBRARY` → `#/library`     | CATEGORY _(tile-depth)_ → `js/views/category.js`                                | 1   | `main-menu`               |
| 2   | `nav.azkar`         | `LIBRARY` → `#/library`     | MOOD (`title.mood`) → `js/views/mood.js`                                        | 1   | `main-menu`               |
| 2   | `nav.azkar`         | `LIBRARY` → `#/library`     | FOCUS (`title.focus`) → `js/views/focus.js`                                     | 2   | `main-menu`               |
| 2   | `nav.azkar`         | `LIBRARY` → `#/library`     | COLLECTIONS (`title.collections`) → `js/views/collections.js`                   | 2   | `main-menu`               |
| 2   | `nav.azkar`         | `LIBRARY` → `#/library`     | COLLECTION _(tile-depth)_ → `js/views/collection.js`                            | 3   | `azkar-collections-panel` |
| 3   | `nav.quran`         | `MUSHAF` → `#/mushaf`       | MUSHAF → `js/views/mushafReader.js` _(lazy)_                                    | 1   | — (is the tap)            |
| 3   | `nav.quran`         | `MUSHAF` → `#/mushaf`       | QURAN (`quran.modeList`) → `js/views/quran.js` _(lazy)_                         | 2   | `main-menu`               |
| 3   | `nav.quran`         | `MUSHAF` → `#/mushaf`       | ROOTS (`quran.modeWord`) → `js/views/roots.js` _(lazy)_                         | 2   | `main-menu`               |
| 3   | `nav.quran`         | `MUSHAF` → `#/mushaf`       | AUDIO (`nav.audio`) → `js/views/audioManager.js` _(lazy)_                       | 2   | `main-menu`               |
| 3   | `nav.quran`         | `MUSHAF` → `#/mushaf`       | TAJWEED_COURSE (`nav.tajweedCourse`) → `js/views/tajweedCourseView.js` _(lazy)_ | 2   | `main-menu`               |
| 3   | `nav.quran`         | `MUSHAF` → `#/mushaf`       | MUTASHABIHAT (`mutashabihat.title`) → `js/views/mutashabihat.js` _(lazy)_       | 2   | `main-menu`               |
| 4   | `nav.hadith`        | `HADITH` → `#/hadith`       | HADITH → `js/views/hadith.js` _(lazy)_                                          | 1   | — (is the tap)            |
| 5   | `nav.prayer`        | `PRAYER` → `#/prayer`       | PRAYER → `js/views/prayer.js`                                                   | 1   | — (is the tap)            |
| 5   | `nav.prayer`        | `PRAYER` → `#/prayer`       | QIBLA (`nav.qibla`) → `js/views/qibla.js`                                       | 2   | `main-menu`               |
| 5   | `nav.prayer`        | `PRAYER` → `#/prayer`       | CALENDAR (`nav.calendar`) → `js/views/calendar.js`                              | 2   | `main-menu`               |
| 5   | `nav.prayer`        | `PRAYER` → `#/prayer`       | RAMADAN (`nav.ramadan`) → `js/views/ramadan.js`                                 | 2   | `main-menu`               |
| 6   | `nav.practise`      | `TASBIH` → `#/tasbih`       | TASBIH → `js/views/tasbih.js`                                                   | 1   | — (is the tap)            |
| 6   | `nav.practise`      | `TASBIH` → `#/tasbih`       | QUIZ (`quiz.title`) → `js/views/quiz.js` _(lazy)_                               | 2   | `main-menu`               |
| 7   | `nav.you`           | `CHECKLIST` → `#/checklist` | CHECKLIST → `js/views/checklist.js`                                             | 1   | — (is the tap)            |
| 7   | `nav.you`           | `CHECKLIST` → `#/checklist` | GARDEN (`you.growth`) → `js/views/garden.js` _(lazy)_                           | 2   | `main-menu`               |
| 7   | `nav.you`           | `CHECKLIST` → `#/checklist` | FAVORITES (`nav.favorites`) → `js/views/favorites.js`                           | 2   | `main-menu`               |
| 7   | `nav.you`           | `CHECKLIST` → `#/checklist` | JOURNAL (`journal.title`) → `js/views/journal.js` _(lazy)_                      | 2   | `main-menu`               |
| 7   | `nav.you`           | `CHECKLIST` → `#/checklist` | STATISTICS (`nav.statistics`) → `js/views/statistics.js` _(lazy)_               | 2   | `main-menu`               |
| 7   | `nav.you`           | `CHECKLIST` → `#/checklist` | CERTIFICATE (`certificate.title`) → `js/views/certificate.js` _(lazy)_          | 2   | `main-menu`               |

_(tile-depth)_ members need a parameter, so a bare link answers an honest 404 and the drawer offers no direct row for them — the section landing's own tiles carry them. _(lazy)_ routes are `import()`-ed on first visit, not statically imported.

Routes in VIEWS claimed by no section: `SEARCH`, `ZAKAT`, `SETTINGS`, `ABOUT`, `EDITOR`, `AMBIENT`, `KIDS`, `OFFLINE`. Deep-linkable but not in the chrome — each needs its justification in `tests/nav-reachability.test.js` or it is an orphan bug.

## 2. Where to make a change

| If you are adding…    | It lives in                                       | And you must also…                                                                                                          |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| a route               | `js/core/config/views.js` (VIEWS)                 | add it to `VIEW_TABLE` or `LAZY_VIEW_LOADERS` in `js/app/renderer.js`, then to a `DOORS` section in `js/core/config/nav.js` |
| a chrome section      | `js/core/config/nav.js` (DOORS)                   | nothing pins it elsewhere — `js/ui/shell.js` derives from it                                                                |
| a `data-action`       | the emitting view/ui                              | add the handler to the matching map in `js/app/handlers/*.js`, and an allowlist entry in `tests/mushaf-reorg.test.js`       |
| an i18n key           | `js/core/i18n/en.js` **and** `js/core/i18n/ar.js` | one language is a failing gate                                                                                              |
| a settings key        | the view that renders it                          | add it to `js/core/config/sanitize.js` or it dies on reload                                                                 |
| a CSS custom property | `assets/css/variables.css`                        | it must resolve, or `tests/cssDesign.test.js` fails                                                                         |
| a file under `js/`    | anywhere                                          | add it to `APP_SHELL` in `sw.js`, then re-stamp the shell snapshot                                                          |

## 3. Conventions

`js/views/*.js` pure state→HTML templates; `js/domain/*.js` pure logic;
`js/app/**/*.js` wiring + handlers; `js/core/**` state/router/config/i18n/storage;
`js/ui/*.js` dumb chrome primitives; `js/services/*.js` side-effect owners.

## 4. Inventory by subsystem

| subsystem         | what lives there                                                             | modules | where in the dump                      |
| ----------------- | ---------------------------------------------------------------------------- | ------- | -------------------------------------- |
| `js/app`          | wiring + event handlers: boot, render dispatch, delegation, feature runners. | 31      | [open](agent-map-full.md#app)          |
| `js/app/handlers` | feature-scoped click-handler maps merged by app/events.js.                   | 18      | [open](agent-map-full.md#app/handlers) |
| `js/core`         | state container, hash router, config, i18n, storage, schema, utils.          | 11      | [open](agent-map-full.md#core)         |
| `js/core/config`  | routes (views.js), chrome doors (nav.js), defaults, sanitizer.               | 5       | [open](agent-map-full.md#core/config)  |
| `js/core/i18n`    | bilingual dictionaries (en/ar).                                              | 2       | [open](agent-map-full.md#core/i18n)    |
| `js/core/idb`     | IndexedDB open helpers.                                                      | 1       | [open](agent-map-full.md#core/idb)     |
| `js/core/state`   | store + reducer + slices + selectors + persistence restore.                  | 13      | [open](agent-map-full.md#core/state)   |
| `data/`           | offline-first corpora consumed by domain/app layers.                         | 27      | [open](agent-map-full.md#data)         |
| `js/domain`       | pure logic: no DOM, no store; core-only imports (compass sensor excepted).   | 72      | [open](agent-map-full.md#domain)       |
| `js/services`     | side-effect owners: audio, notifications, persistence helpers.               | 27      | [open](agent-map-full.md#services)     |
| `js/ui`           | dumb chrome primitives: toasts, modals, cards, shells.                       | 12      | [open](agent-map-full.md#ui)           |
| `js/views`        | pure state→HTML templates + their pure helpers.                              | 52      | [open](agent-map-full.md#views)        |

## 5. Lookup tables (counts; open the dump for the rows)

- `data-action` values emitted anywhere: **357** — every one resolves to a handler (see the Allowlist section of the dump).
- files that handle at least one click/change/form action: **19** of 244.
- exported symbols: **1560**.
- i18n keys touched by js/: **1514** of the two dictionaries.

## 6. When you need the exhaustive dump

Read `docs/agent-map-full.md` when the task names a specific module, a specific
`data-action`, or a specific exported symbol. It has, per file: header job, every
export with its first doc line, actions emitted, actions handled, i18n keys, routes
touched — plus three reverse indexes and a per-test list of what each test pins.

Do **not** load the whole dump to answer "where does X live" — the tables above and a
targeted grep answer that in one hop. Loading 530 KB to find one file is how an agent
starts guessing instead of looking.
