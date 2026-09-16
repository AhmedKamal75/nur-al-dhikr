# Seed / slim bundle — pruning manifest

This file documents what the `nur-al-dhikr-audit-slim-v*.zip` minimal
bundle keeps, what it drops, and why. Reproduce it any time with:

```sh
npm run build-seed   # writes nur-al-dhikr-audit-slim-v<version>.zip
```

## Design decision (deliberate deviation from the "3-surah seed" sketch)

An early sketch proposed keeping only 2–3 full surahs and stubbing the
rest. That was **rejected** because `tests/contracts.test.js` pins the
full corpus (all 114 `data/quran/*.json` files with exactly
`ayahCount` ayahs each, 6,236 total; `mushaf-meta` covering all 6,236
ayahs on 604 pages). A 3-surah seed would turn the contract gate red on
purpose. The slim bundle instead keeps **every file any gate checks**
and prunes only the large corpora no gate pins:

| Kept (gates depend on it) | Pruned (no gate pins it) |
|---|---|
| `data/quran/` — all 114 surahs + `.gz` | `data/tafsir/` — 7 editions × 114 surahs (~62 MB) |
| `data/mushaf/` — all 604 pages + `.gz` | `data/quran-words/` — per-word grammar (~44 MB) |
| `data/quran-meta.json`, `data/mushaf-meta.json` | `data/hadith/` — 9 books (~60 MB) |
| `data/translations/` (4 overlay langs) | — |
| `data/quran-dict.json` (54-lemma study notes), `data/quran-roots*.json`, `data/tajweed-practice.json`, adhkar/duas/asma catalogs | — |
| full `js/`, `assets/css/`, `tests/` (146 unit files) + `playwright.config.js`, all `docs/`, `scripts/` | `node_modules/`, `.git/`, `test-results/`, `playwright-report/`, `*.log`, `*.zip` |

Result at v5.2.85: **12.8 MB zip, 26.5 MB uncompressed, 2,868 entries**
— under the 50 MB ceiling with headroom.

## Honest-degradation contract on seeds

Pruned tiers surface the standard `skeleton → error + Retry` path, never
a silent spinner and never invented content:

- Hadith views (`#/hadith`): catalog fetch 404s → `loadErrorStateHTML`
  with Retry (same component as the offline tier errors).
- Tafsir tabs in the ayah-study panel: `tafsir-editions.json` IS bundled
  (small), but per-surah edition files 404 → inline error + Retry.
- Word-study popover: `quran-words/` missing → `getWord()` returns null
  → tajweed-only fallback panel + tafsir deep-link (existing v4.6.0
  behavior, covered by `wordStudyRender.test.js` "degrades gracefully").
- Tajweed coloring/practice: pure classifier over bundled `data/quran/`
  text + bundled `data/tajweed-practice.json` pool — **fully functional
  on seeds**, including every rule pool (≥25 entries/rule).

## What `npm test` needs

`npm test` (1,633 unit tests at v5.2.85) requires the **full tree**:
`wordStudyRender.test.js` reads `data/quran-words/` + `data/tafsir/`
straight from disk and fails with ENOENT on the slim — loudly, at file
read, not as a silent skip. E2E (`playwright test`, chromium) boots the
slim fine: Home renders with zero network; seed surahs 1/32/112 read
and color correctly.

## Sources

Pruned files come from the same citable sources as the full tree; see
`data/SOURCES.md` (per-word grammar: Quranic Arabic Corpus via
mustafa0x/quran-morphology; glosses: quranwbw; tafsir: spa5k/tafsir_api
mirror) and `CREDITS.md`. Nothing in the slim is re-generated or
re-worded — it is a strict subset of the full tree plus generated
`.gz` siblings (see `scripts/compress-data.mjs`).
