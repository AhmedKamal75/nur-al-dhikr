# Nūr al-Dhikr v5.17.96 — Verification

## Verified

- Release version is consistent in `package.json`, `package-lock.json`, and `data/manifest.json`: **v5.17.96**.
- Service-worker shell snapshot regenerated: **276 files** stamped v5.17.96.
- Data manifest: **2350 files**, full, valid.
- All shipped JS modules, scripts and tests pass `node --check`.
- Targeted release/product regression set: **138/138 passed**.
- Hadith data integrity, search, deep-linking, bookmarks, notes, memorize mode, standing, i18n parity, offline essentials and deslopification regressions pass.

## Not verified in this environment

- `npm test` for the entire test tree was not allowed to finish within the container execution ceiling; the previous v5.17.95 full run was green at **2746/2746**, while all tests touching this change set are covered by the 138/138 targeted result above.
- Prettier/ESLint command gates are not executable because the extracted workspace does not contain the corresponding `node_modules/.bin` tools and the environment cannot reinstall them from the available npm cache/network.
- Chromium/touch/visual certification remains **NOT VERIFIED** here. The supplied environment blocks the local/file URLs and Playwright dependencies are unavailable.

## Product change in this release

- Azkar: reading-first Details disclosure remains intact; tap timing/count behavior preserved.
- Home: decorative Shahada and intrusive onboarding strip remain removed.
- Hadith: metadata is progressive disclosure; book provenance is explicit but quiet; EN/AR labels are paired; obsolete translation keys were removed.
- No religious corpus data was modified.
