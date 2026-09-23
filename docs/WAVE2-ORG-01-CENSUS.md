# WAVE 2A — ORG-01 Route + Chrome Census

Status: investigation only. No product code changed for this task.
Method: static analysis of `VIEWS` (`js/core/config/views.js`), `NAV_GROUPS`

- `MOBILE_ITEMS` (`js/ui/shell.js`), renderer `VIEW_TABLE`/`LAZY_VIEW_LOADERS`
  (`js/app/renderer.js`), palette destinations (`js/views/palette.js`), and a
  full `data-view` / `buildHash(VIEWS.*)` / `go(VIEWS.*)` link-graph pass over
  `js/`. Reachability below means _in-app_ reachability; every route is
  additionally URL-addressable (`#/route`), and the universal Back
  affordance plus browser history give every view a back path — no dead
  ends were found.

Recounted baseline (not inherited): **33 routes**, **18 rail entries** in
4 groups, mobile bar HOME/LIBRARY/MUSHAF/HADITH + More drawer (full
groups), 45 view modules, 545 `data-action` uses in views.

## Chrome map

Read: HOME, LIBRARY, MUSHAF (labelled nav.quran), HADITH, SEARCH*.
Worship: PRAYER, QIBLA, RAMADAN, CALENDAR, CHECKLIST. Tools: TASBIH,
GARDEN, ZAKAT, STATISTICS, OFFLINE. Mine: FAVORITES, SETTINGS, ABOUT.

`*` SEARCH rail item carries `action: 'open-palette'` — it opens the
command palette; its href stays a real `#/search` fallback. The SEARCH
route itself serves OS share intents and typed URLs.

## Per-view verdicts

| View         | Route          | In rail?                    | Entry points (beyond rail/URL)                                            | Verdict      |
| ------------ | -------------- | --------------------------- | ------------------------------------------------------------------------- | ------------ |
| HOME         | home           | Yes                         | — (default)                                                               | KEEP         |
| LIBRARY      | library        | Yes                         | category/mood/focus returns, home, checklist, quiz                        | KEEP         |
| CATEGORY     | category/:id   | No                          | library tiles, palette rows, ramadan, focus flows                         | KEEP         |
| MOOD         | mood/:id       | No                          | library                                                                   | KEEP         |
| FOCUS        | focus          | No                          | card/focus buttons, ramadan                                               | KEEP         |
| SEARCH       | search         | Yes (palette override)      | boot share intents, items, roots, href fallback                           | KEEP + note¹ |
| FAVORITES    | favorites      | Yes                         | home                                                                      | KEEP         |
| COLLECTIONS  | collections    | No                          | home, items, collection (back)                                            | KEEP         |
| COLLECTION   | collection/:id | No                          | collections, home, items, forms                                           | KEEP         |
| STATISTICS   | statistics     | Yes                         | garden                                                                    | KEEP         |
| TASBIH       | tasbih         | Yes                         | kids allowlist                                                            | KEEP         |
| PRAYER       | prayer         | Yes                         | home, ambient, onboarding, ramadan                                        | KEEP         |
| QIBLA        | qibla          | Yes                         | prayer tool tile, quick tiles                                             | KEEP         |
| RAMADAN      | ramadan        | Yes (rayah)                 | home                                                                      | KEEP         |
| CHECKLIST    | checklist      | Yes                         | home                                                                      | KEEP         |
| QUIZ         | quiz           | No                          | home, statistics, self                                                    | KEEP         |
| CALENDAR     | calendar       | Yes                         | home fasting map, ramadan sheet, palette                                  | KEEP         |
| ZAKAT        | zakat          | Yes                         | ramadan                                                                   | KEEP         |
| AUDIO        | audio          | **No**                      | settings, offline view, palette, player bar (actions, not nav)            | **SURFACE**² |
| QURAN        | quran          | **No (label opens MUSHAF)** | home, palette, roots, search, statistics, tajweed flows, quran self-links | **MERGE?**³  |
| ROOTS        | roots          | No                          | quran view, self                                                          | KEEP         |
| HADITH       | hadith         | Yes                         | ayah-study, content/forms, cards, palette, search                         | KEEP         |
| MUSHAF       | mushaf         | Yes                         | home, quran toggle, mutashabihat, ramadan, recitation flows, certificate  | KEEP         |
| SETTINGS     | settings       | Yes                         | home, offline, palette                                                    | KEEP         |
| ABOUT        | about          | Yes                         | settings                                                                  | KEEP         |
| EDITOR       | editor         | No                          | library sheet, palette                                                    | KEEP         |
| MUTASHABIHAT | mutashabihat   | No                          | mushaf sheet, palette                                                     | KEEP         |
| JOURNAL      | journal        | No                          | **palette only**                                                          | **SURFACE**⁴ |
| CERTIFICATE  | certificate    | No                          | statistics                                                                | KEEP         |
| GARDEN       | garden         | Yes                         | statistics                                                                | KEEP         |
| AMBIENT      | ambient        | No                          | prayer sheet, palette                                                     | KEEP         |
| KIDS         | kids           | No (mode scope)             | settings, nav guard; kidsMode scopes chrome to KIDS+TASBIH                | KEEP         |
| OFFLINE      | offline        | Yes                         | settings                                                                  | KEEP         |

Notes:

1. SEARCH: rail opens the palette while the route serves intents/URLs.
   Not broken, but the label↔destination contract is split-brained —
   ORG-02 must decide one honest meaning.
2. AUDIO is the only hub-scale view outside the chrome (player,
   downloads, verse voices, playlists) — the natural anchor of a
   "Listen" tab if ORG-02 goes there. No code changed here.
3. MUSHAF + QURAN are two Quran books behind one chrome label
   (nav.quran → MUSHAF). Users cannot discover the classic reader
   from the chrome. MERGE-vs-CLARIFY is ORG-02's call with usage
   evidence — not assumed here.
4. JOURNAL is palette-only; either surface it or justify hiding.
   COLLECTIONS vs FAVORITES overlap is flagged for ORG-02 with usage
   data, not verdict-merged here.

## Answers to the six questions

1. Primary chrome: the 18 above. 2. Reachable only through another
   screen: CATEGORY, MOOD, FOCUS, COLLECTION, CERTIFICATE, AMBIENT,
   EDITOR (plus deep-link params everywhere). 3. Reachable only by URL:
   **none** — the palette covers all 33. 4. Orphaned: **none found**. 5. Dead ends: **none found** (shell chrome + universal Back on every
   view; modals self-close). 6. Duplicate destinations: MUSHAF/QURAN
   under one label; SEARCH label vs route split (notes 1, 3).

## Mobile vs desktop visibility

Identical reachability: desktop rail and the mobile More drawer render
the same four groups; the bottom bar pins HOME/LIBRARY/MUSHAF/HADITH.
Layout parity (not reachability) belongs to ORG-07.

## Gate statement

ORG-01 is complete as evidence. ORG-02/03/04/05 may now _measure_
against this map; no navigation change, relabel, or merge is authorized
by this document. TAJ-01's scholar gate is unaffected and still blocks
Academy content.
