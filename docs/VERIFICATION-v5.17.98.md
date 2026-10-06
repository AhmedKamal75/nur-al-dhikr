# Nūr al-Dhikr v5.17.98 — Verification

## Release scope

Prayer and Hadith deslopification built on the v5.17.96 tree, with the previously requested Azkar/Home fixes carried forward.

## Implemented

- Prayer main surface no longer duplicates its view-menu tools as a visible tile grid.
- Prayer focal hero now uses a compact method/Asr summary; calculation details, fine-tuning, and iqama waits are progressively disclosed.
- Prayer calculation basis explicitly describes local/on-device computation and preserves honest source status.
- Added bilingual Asr labels and calculation-surface copy.
- Hadith cards remain reading-first: text and reading/count actions are primary; collection/chapter/narrator/grade/notes stay under Details.
- Hadith Details now includes an explicit Reference entry using the existing collection name and hadith number; no external provenance was invented.
- Hadith book metadata remains behind About this book.
- Restored bilingual `hadith.grading` contract key discovered during regression testing.
- Regenerated the deterministic Agent Map.
- No Qur'an, Hadith, Azkar, or other bundled religious corpus bytes were manually rewritten by this release work.

## Verification

- Full Node test tree: **2,753/2,753 passed** across **259 test files**, executed in four parallel batches to avoid the single-process execution ceiling of this workspace.
- Targeted contract / Hadith / Agent Map run: **67/67 passed**.
- JavaScript/module syntax: **all JS/MJS files passed `node --check`**.
- Service-worker shell snapshot: **valid, 276 files at v5.17.98**.
- Data manifest: **valid, 2,350 files, full, v5.17.98**.
- Agent Map generation: deterministic and complete.
- npm lint / Prettier: **NOT VERIFIED** because the supplied ZIP does not contain installed `eslint`/`prettier` binaries in `node_modules`.
- Chromium/device visual certification: **NOT VERIFIED** in this workspace; browser proof must be produced on the user's local environment.

## Browser evidence still required

The next local/device pass must verify actual interaction and rendering for:

- Azkar Details versus tap/count behavior
- Home composition and absence of decorative Shahada banner
- main-menu disclosure
- Settings at 360px
- narrow player metadata
- invalid Qur'an deep-link state
- Hadith Details/reference in English and Arabic
- Prayer methodology disclosure in English and Arabic
- light/dark and RTL behavior

## Integrity

- Release version markers are locked to v5.17.98.
- The offline shell snapshot matches the release version.
- Data manifest matches the bundled corpus.
