# Nūr al-Dhikr v5.17.131 — Verification

Date: 2026-10-07

## Source baseline

Implemented directly from the verified **v5.17.130** source release.

## v5.17.131 implementation

- Added a user-controlled persistent-storage request under Offline → Manage offline storage, using `navigator.storage.persisted()` / `navigator.storage.persist()` where supported.
- Added honest EN + AR outcomes for already-persistent, granted, declined, and unsupported cases.
- Added explicit UI copy that persistent storage does not mean unlimited storage and that a recent backup remains the safe recovery path.
- Updated README and the durable open-issues ledger to document browser-managed storage and mobile background-notification limitations.
- No Qur’an, Hadith, Azkar, or other religious corpus bytes were intentionally modified.

## Automated verification

- v5.17.131 focused feature gate: **3/3 passed**.
- Deterministic full regression: **2,823/2,823 passed** across **279 test files**; 0 failed, 0 skipped, 0 cancelled.
- Release-contract gate: **36/36 passed**.
- JavaScript syntax: **244 JS files + sw.js** checked successfully.
- Data manifest: **2,350 files, full and valid, v5.17.131**.
- Shell snapshot: **278 files, v5.17.131**.
- Agent Map: **244 JS + 27 data + 279 tests**.

## Browser / tooling status

- Browser/Chromium visual/E2E certification is **NOT VERIFIED** in this workspace.
- `npm run lint` / `npm run format:check` are **NOT VERIFIED** because the ESLint and Prettier executables are unavailable in this source workspace.
- No timeout values were increased and no assertions were weakened or skipped.

## Release integrity

- Source ZIP must be built from this exact tree.
- Its checksum must be recorded separately.
- The exact saved ZIP must be re-read/materialized from Global after upload and its SHA-256 reverified before v5.17.131 is considered globally authoritative.
