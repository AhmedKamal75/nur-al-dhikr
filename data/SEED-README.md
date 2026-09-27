# Seed / slim bundle

`npm run build-seed` creates a runnable offline project containing a deliberately small, semantically complete seed corpus. It does not modify the full working tree.

```sh
npm run build-seed
# writes nur-al-dhikr-seed-v<version>.zip
```

## Contents

- Qur’an surahs `1`, `32`, and `112` in the Quran, word-study, and word-token tiers.
- 15 representative adhkar items.
- Six Nawawi hadith samples; the canonical catalog remains available and other books stay remote.
- Three-surah samples for every bundled tafsir/grammar edition.
- Tajweed practice rows whose ayahs exist in the three seed surahs.
- The application code, assets, documentation, scripts, and tests needed to run the seed.

The stage also contains a `data/manifest.json` with `mode: "seed"`, raw byte sizes, and SHA-256 hashes for every eligible staged JSON file. The full release has a separate `mode: "full"` manifest at `data/manifest.json`.

## Design decision

The seed is intentionally smaller than the full corpus. Full-corpus contract tests remain available in the project and use the seed marker to skip only checks that require absent tiers; seed-specific tests verify the staged Quran, hadith, tafsir, word-study, and manifest contents.

The archive is compressed and currently measures about 8 MB for v5.17.9, below the 50 MB hard ceiling. Compression is an implementation detail; the semantic contract is the list above, not a target byte floor.

## Honest degradation

Pruned or unavailable tiers use the standard loading/error/Retry surfaces. They do not silently invent content:

- Hadith views can show the catalog and an honest unavailable state for remote books.
- Tafsir can show its bundled catalog and an error/Retry state for an unshipped surah.
- Word study can fall back to the tajweed-only panel when its optional tier is unavailable.
- Tajweed coloring and practice use the bundled Quran text and seed pool.

## Verification

From the repository root:

```sh
npm run manifest:check
npm test
npm run build-seed
```

To verify an extracted seed explicitly:

```sh
node scripts/data-manifest.mjs --root /path/to/extracted-seed --mode seed --check
```

See `data/SOURCES.md` and `CREDITS.md` for corpus provenance. The seed does not rewrite religious content; it selects existing data and generates only packaging metadata.
