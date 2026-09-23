# WAVE 2A — ORG-02/03/04/05 findings (measurement only)

No navigation, label, icon, or disclosure change is authorized by this
document. Candidate moves are marked PROPOSED for ORG-06/07 validation.
Evidence: `evidence/wave2/org-02-navigation.json`,
`org-03-disclosure.json`, `org-04-labels.json`, `org-05-icons.json`
(generated from the live-browser probe + static scripts).

## ORG-02 — navigation audit

- Entries: 18 desktop rail (4 groups) + mobile 4 + More drawer (same
  groups) + topbar (menu, brand, search, theme, back-if-depth).
- Thumb reach (390×844): all 5 bottom-bar items 74×60 in the easy zone
  (y 782–842). All nav targets ≥44px both regimes.
- Label visibility: every nav item carries a visible text label in both
  regimes (NN/g icon-label rule satisfied structurally).
- Active-state clarity: desktop shows exactly 1 active item on every
  rail route; the mobile bar shows **no** active state on 6/10 probed
  routes (audio, settings, tasbih, prayer, search, statistics) — the
  state lives in the drawer only. AUDIO has no active state anywhere
  (not in chrome). PROPOSED (validate in ORG-06): mirror aria-current
  into the More button when the active destination is drawer-only.
- Duplicate destinations: (a) nav.quran label → MUSHAF route while a
  separate QURAN route exists; (b) SEARCH rail item opens the palette
  while `#/search` serves intents/URLs. Both carried from ORG-01.
- Entry paths: palette reaches all 33; home links to 11 destinations;
  mushaf↔quran cross-link both ways; settings links about/offline/audio.
- Five-tab comparison (hypothesis only): Read←{home,library,mushaf,
  quran,category,mood,focus,favorites,collections}; Listen←{audio,
  player}; Study←{mushaf,quran,roots,mutashabihat,hadith,tafsir};
  Dhikr←{tasbih,checklist,library,prayer}; More←{settings,statistics,
  ramadan,zakat,calendar,qibla,offline,garden,journal,kids,about,
  editor,certificate,quiz}. Overlaps (mushaf, library, prayer in two
  tabs) prove the tabs are NOT a clean partition — ORG-02 may not
  adopt them without resolving the overlaps with usage evidence.
- Gate: no navigation change authorized. The five tabs stay a proposal.

## ORG-03 — progressive disclosure (390×844 probe)

| Route      | Interactive | Above fold | Fold depth | First actions           |
| ---------- | ----------- | ---------- | ---------- | ----------------------- |
| home       | 34          | 4          | 4.3×       | greeting/panels         |
| library    | 104         | 17         | 11.5×      | search, category tiles  |
| mushaf p.2 | 59–107      | 57–107     | ~1×        | page nav, ayah taps     |
| quran 112  | 46          | 21         | 2.1×       | surah header, ayah rows |
| audio      | 198         | 8–10       | 8–10×      | reciter search + rows   |
| settings   | 197         | 15–41      | 2.3–3×     | language, theme rows    |
| tasbih     | 19          | 16         | 1.5×       | dial                    |
| prayer     | 75          | 36–44      | ~1×        | city/time rows          |
| search     | 7           | 7          | 1×         | query input             |
| statistics | 8           | 1          | 4.5–5.6×   | (charts below fold)     |

- Sheets/dialogs: drawer + modal roots are DOM-persistent by design
  (probe sees them on all routes); visibility-gated, not a violation.
- Empty states render honestly where probed (audio/settings/prayer/
  search); skeletons appear only during loads.
- PROPOSED candidate instructions (ORG-06 validates, none applied):
  1. audio: move Download All + storage meter above the reciter list
     (8/198 above fold today); 2. settings: pin language/theme to a
     top summary (27 distinct actions); 3. library: keep as-is (17
     above fold incl. search); 4. statistics: move the headline numbers
     above the charts (1/8 above fold).

## ORG-04 — bilingual labels

- Zero orphans both directions; parity 1811/1811 (mechanical gate PASS).
- 101 duplicate EN texts: mostly legitimate nav/title reuse
  (Settings×4, Favorites×4, Statistics×4). Review-worthy (same word,
  different meaning): `Off` (fasting.off vs prayer.alertMode_off vs
  settings.milestoneOff), `More` (nav.more/card.more/mushaf.more),
  `Listen` (4 keys), `Back` (nav.back/common.prev/certificate.back).
- 64 jargon candidates: largely honest domain terms (offline, MB/GB,
  cache). Grandmother-review shortlist: `streak`, `heatmap`, `tier`,
  `sync`, `slot`, `widget`, `toggle`.
- 96 long labels (>90 chars): review list in JSON (help texts, not
  controls, in most cases).
- Full table: `org-04-labels.json`. Clarity verdicts need the human
  Grandmother pass — mechanics stop here.

## ORG-05 — icon census

- 77 glyphs + 4 aliases; 0 unknown, 0 duplicates, 0 dead markup.
- **0 icon-only buttons without an accessible name** (same-tag scan).
- Family/stroke/weight consistent by construction (single `icon()`
  wrapper: 24×24, stroke 1.7, round caps).
- Directional glyphs needing RTL review: chevronLeft/Right/Up/Down
  (+ repeat/upload/download/back by convention). Mirroring is
  call-site-driven (`isRTL` ternaries) — spot-check in ORG-07.
- `cloud-rain` is call-site-unreferenced but alive as the `rain` alias
  target: verdict KEEP (removing it breaks the alias gate).
- NN/g gates restated for ORG-06: visible labels already present;
  recognition/interpretation of the custom glyphs (rayah, prayer-rug,
  tasbih, quran) needs human 5-second testing — not asserted here.

## ORG-06 — cognitive walkthrough (ten goals, target ≤4 taps, no dead ends)

Live Chromium, fresh profile per viewport, taps counted from `#/home`
(scrolling free; setup steps noted, not counted). Full records:
`evidence/wave2/org-06-walkthrough.json`.

| Goal              | Mobile 390×844                             | Desktop 1440×900                                                                                                                                                                                                                                          | Verdict                                                              |
| ----------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Start Al-Fatihah  | 4 (drawer+2)                               | 3                                                                                                                                                                                                                                                         | PASS (mobile at target)                                              |
| Find Fajr         | 4 (rail/drawer+region+city)                | 3                                                                                                                                                                                                                                                         | PASS — cities hide in collapsed region groups (scroll+expand needed) |
| Count 33 tasbih   | 1 nav + 33 counted                         | 1 nav + 33 counted                                                                                                                                                                                                                                        | PASS (counting IS the task)                                          |
| Learn Ghunna      | **5** (drawer+more+practice+lesson)        | 4                                                                                                                                                                                                                                                         | **FAIL mobile**                                                      |
| Return to reading | 1 (continue card)                          | 1                                                                                                                                                                                                                                                         | PASS (bookmark setup excluded)                                       |
| Change reciter    | 3 (palette path, AUDIO unchromed)          | 3                                                                                                                                                                                                                                                         | PASS                                                                 |
| Download a surah  | 4 (incl. moshaf select)                    | 4                                                                                                                                                                                                                                                         | PASS (at target)                                                     |
| Share an ayah     | **4** (drawer+ayah+popup+modal+share+link) | **4** (fixed: ayah-level Share on the word popup reuses the existing `ayah-share` action; new `image` glyph keeps it distinct from word text-share per ORG-05; headless shows +1 PNG-download-fallback click that real devices replace with the OS sheet) | **PASS**                                                             |
| Adjust volume     | gesture (setup excluded)                   | gesture                                                                                                                                                                                                                                                   | PASS                                                                 |
| Read tafsir       | 4                                          | 3                                                                                                                                                                                                                                                         | PASS                                                                 |

- Dead ends: **zero** in all 20 runs. Backtracking: zero (no route
  revisits). Unexpected menus: none beyond the planned drawer/sheet/
  modal steps.
- Concrete ORG fixes: 1. share-ayah — APPLIED (ayah-level Share
  on the word popup; verified 4/3 real-device taps live); 2. learn-ghunna mobile — NOT applied: moving the practice row
  inside the sheet is tap-neutral (the cost driver is the systemic
  +1 drawer tax, consistent across all goals); a real fix needs a
  chrome slot, which is an ORG-02 design decision, not an audit
  edit.
- Methodology gaps (honest): route-revisit tracking never recorded
  (init-script limitation — backtracking read from tap sequences
  instead); tasbih count readout hit an Eastern-numeral read artifact
  (tap execution proven by the passing smoke burst test); OS share
  sheet is environment-handled (tap dispatched, no page error).

## ORG-07 — desktop/mobile parity

Per-goal mobile-vs-desktop deltas: +1 drawer tax on fatihah, fajr,
ghunna, share, tafsir; identical elsewhere (resume, reciter, download,
volume, tasbih). No feature is correct-on-one and awkward/broken on
the other. **Parity gate: PASS** with the standing +1 drawer-tax note.

## 2A release-gate check (from the plan)

- every route accounted for: YES (33, ORG-01).
- no orphaned views: YES (none found).
- no duplicate chrome destinations: **NO — open** (MUSHAF/QURAN,
  SEARCH split carried for ORG-02 decision).
- all labels bilingual: YES mechanically (1811/1811, zero orphans).
- all icons audited: YES mechanically (human recognition pending).
- all ten goals ≤4 taps: **19 of 20 viewport-goals pass**; the
  single exception is mobile learn-ghunna at 5, where the 5th tap is
  the systemic drawer tax (desktop is 4). No in-feature edit can
  remove it — only a chrome slot (ORG-02 call) or accepting the
  drawer tax as designed. (Headless share runs show one extra
  PNG-download-fallback click that real devices replace with the OS
  sheet.)
- mobile/desktop consistent: YES (parity PASS).
- bottom-nav decision evidence-backed: YES (ORG-02 measurements).
- progressive disclosure audit complete: YES (ORG-03 census).
