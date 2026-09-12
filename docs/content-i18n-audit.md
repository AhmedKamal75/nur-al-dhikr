# Content & i18n Audit Report — Matn Verification & Strict Language Separation

Date: 2026-09-12 · App version after this audit: **v5.2.31** (bump + re-stamp per the
markers-in-lockstep rule) · Status: changes staged in the working tree, **not committed**.

Run the audit yourself: `node scripts/audit-content.mjs` (add `--strict` for a CI gate,
`--json` for machine-readable output). Regression gates live in
`tests/content-i18n-audit.test.js` (27 tests).

## 1. Datasets checked (1,192 items across 9 libraries)

| dataset                  | items | verdict after audit                                                                                                                                                                                                                                                                         |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/adhkar.json`       | 168   | ✅ complete incl. both transliterations (2:285-286 added round 2); 26 missing `reference.grading` remain (tracked)                                                                                                                                                                          |
| `data/duas.json`         | 527   | ⚠️ transliteration complete (194 mechanical romanizations, round 3); topical corpus fully localized + 18 `man-yaduni` duplicates backfilled from verified twins (round 2); 195 unique `man-yaduni` items still need scholarly translation + virtues + takhrij (tracked, per scope decision) |
| `data/quranic.json`      | 103   | ✅ **15 corrupted matn restored** (see §2); virtues complete both sides                                                                                                                                                                                                                     |
| `data/prophet-duas.json` | 59    | ✅ complete                                                                                                                                                                                                                                                                                 |
| `data/asma.json`         | 99    | ⚠️ 99 Arabic virtue-essays still missing (tracked)                                                                                                                                                                                                                                          |
| `data/reflections.json`  | 68    | ✅ virtues complete; 20 missing `reference.grading` (tracked)                                                                                                                                                                                                                               |
| `data/pdf-duas.json`     | 75    | ✅ virtues complete; 5 munajat re-graded `Unknown` → `Custom` with EN/AR explanation (devotional, not hadith — round 2); 61 missing `reference.grading` (tracked)                                                                                                                           |
| `data/daily-sunnah.json` | 69    | ✅ virtues complete; 6 missing `reference.grading` (tracked)                                                                                                                                                                                                                                |
| `data/special-days.json` | 24    | ✅ complete                                                                                                                                                                                                                                                                                 |

## 2. Matn corrections applied (fact-checked against the app's own Quran corpus)

**Critical fix — `quranic.json` `glm-quran-001…015`: the `arabic` field contained Latin
transliteration instead of Arabic matn** (e.g. `"arabic": "Ihdinas-siratal mustaqeem…"`).
Each matn was restored verbatim from `data/quran/<surah>.json`, sliced to the dua portion
following the file's own convention (cf. uncorrupted items `glm-quran-018+`), and the
displaced transliteration was moved back into `transliteration`:

- `001` (1:**6–7**, ref narrowed from `1:1-7` to match the actual content), `002` (7:23),
  `003` (54:10), `004` (mixed 3:38 + 14:40 — ref corrected from the wrong `14:39-40`),
  `005` (20:25–28), `006` (21:83), `007` (21:87), `008` (3:8), `009` (2:201),
  `010` (3:147), `011` (3:38), `012` (18:10), `014` (73:9), `015` (14:41).
- `013` (cited ref 23:97-98) was **not Quranic text at all** (a fabricated envy-themed
  rendering). It was rebuilt to the cited ref — corpus Arabic of 23:97-98 plus matching
  transliteration/translation — and its **title/theme ("evil eye") still needs scholar
  review**: 23:97-98 is isti'adha from devils, and the proper envy texts are in Surah
  al-Falaq (113). Flagged, not silently resolved.

Tashkeel coverage of matn is 94–97% everywhere (83% in `asma.json`, single-word Names —
expected). No HTML tags/entities and no Latin script remain in any `arabic` field
(hard-gated by test).

## 3. Source & grading (التخريج والصحة)

- Every item carries a `grade` (Quran / Sahih / Hasan / Daif / Athar / Custom / Unknown)
  and a `reference` object; **no item has an empty `reference.collection`**.
- Fixed alongside: 9 `pdf-duas` items (`cu-011…137`) missing virtues in both languages
  received concise EN+AR virtues in dataset style; 25 `daily-sunnah` items likewise;
  18 `man-yaduni` duplicates backfilled with transliteration + translation + virtues +
  real titles from their verified same-matn twins (linguistic fields only —
  id/category/reference/grade untouched).
- The 5 `pdf-munajat-*` `Unknown` grades were re-graded `Custom` with an EN/AR
  `custom_grade` explanation (devotional munajat, not Prophetic hadith, so hadith
  grading does not apply). Audit rule updated accordingly: `Custom` items are exempt
  from the `missingGrading` check in both the script and the test.
- Remaining scholarly work (NOT fabricated — tracked as audit baselines, see §6):
  - `man-yaduni-*` (195 unique items after the round-2 backfill): no transliteration /
    translation.en / virtues, 98× `Unknown` grade. Several carry honest inline flags
    already (e.g. `my-02-019` notes a CITATION-DISPUTED number). Needs takhrij against
    the six books + translation.
- Missing `reference.grading` on non-Quran, non-Custom items: adhkar 26, duas 162,
  reflections 20, pdf-duas 61, daily-sunnah 6.
  - `pdf-munajat-*` resolved (see above); `adhkar` `adh-pos-010`, `adh-slp-010` transliterations added (round 2).
  - `asma.json` 99 Arabic virtue-essays (long-form; deferred).

## 4. Strict language separation — implemented

New single choke point: **`js/domain/localeContent.js`** (pure, unit-tested).

| rule                        | AR (`ar`)                                                                                                        | EN (`en`)                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Arabic matn                 | always on top                                                                                                    | always on top                             |
| Transliteration             | **never rendered** (toggles ignored)                                                                             | per `showTransliteration` / field toggles |
| Translation                 | **never rendered**                                                                                               | `translation.en` only, per toggles        |
| Virtue                      | `virtues.ar` only, no EN fallback                                                                                | `virtues.en` only, no AR fallback         |
| Source                      | localized (`صحيح مسلم 591`…), multi-source strings mapped segment-wise; unmapped Latin **omitted, never leaked** | unchanged English strings                 |
| Narrator                    | mapped (`أبو هريرة`…) or omitted                                                                                 | unchanged                                 |
| `reference.notes` / `notes` | shown only if containing Arabic script                                                                           | unchanged                                 |

Renderer changes: `js/ui/card.js`, `js/views/focus.js`, `js/services/shareCard.js`
(canvas + `referenceLine`), `js/app/shared.js` (`itemClipboardText` — AR copies matn
only), `js/views/hadithCard.js` (EN hadith translation hidden in AR), plus
`pickStrict()` in `js/core/utils.js`. Titles keep a graceful fallback (empty header is
worse), but the AR title fallback skips the Latin transliteration line.

Verified: a fully-bilingual fixture card renders zero Latin-script content fields in AR
and zero Arabic virtue/translation in EN (tests), while EN toggles still work.

## 5. Schema audit — consistency findings & proposal

- `title` / `translation` / `virtues` / `custom_grade` already ship as `{en, ar}` pairs
  (schema v2 normalizes this; `validateDocument` unchanged). `translation.ar` is
  intentionally **not** required: the AR UI hides translation by design, the EN UI reads
  `translation.en` only — the audit script documents this instead of flagging it.
- **Gap: `reference` is still a monolingual English object** (`collection`, `book`,
  `chapter`, `narrator`, `grading`, `notes`) — there are no `source_ar` / `source_en`
  pairs. This audit bridges it with the `localeContent.js` mapping tables (44 collection
  prefixes incl. multi-source splitting, 30 narrator normalizations) as the single choke
  point. **Proposed migration:** add `reference_ar: {collection, narrator, grading,
notes}` (fallback: current mapper output) so future data carries real Arabic sources
  instead of mapped strings; unmapped free-text collections (e.g. `Compiled from…`,
  `Scholarly practice`) are the migration's first candidates.
- `GRADE_LABELS` already localize the grade chip both ways — no change needed.

## 6. Verification

- `node scripts/audit-content.mjs` → exit 0 (no hard matn errors; was 1 before the fix).
- `npm test` → **1119/1119 pass** (27 new), `npx eslint .` clean, `prettier` applied.
- Repo contracts honored: `js/domain/localeContent.js` added to SW `APP_SHELL`, version
  markers bumped 5.2.30 → 5.2.31 (package.json, manifest.json ×2, sw.js, APP_VERSION),
  `npm run compress-data` refreshed the (gitignored) `.gz`, `npm run snapshot-shell`
  re-stamped `tests/app-shell-hashes.json`.
- Coverage baselines that must never regress are pinned in
  `tests/content-i18n-audit.test.js` (`BASELINES`); lower a number there whenever a
  tracked gap is closed.
