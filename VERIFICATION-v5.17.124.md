# Nūr al-Dhikr v5.17.124 — Verification

## Release scope

Durable issue-ledger reconciliation: update `docs/OPEN-ISSUES.md` to match the current verified implementation instead of carrying stale open defects into the next autonomous chat.

## Implemented

- Reclassified OPEN-ISSUES #19 (Tasbih lifetime-counter ceilings) as RESOLVED based on the shipped saturation implementation and `tests/tasbihCaps.test.js`.
- Reclassified OPEN-ISSUES #48 (search counts reporting zero while corpora load) as RESOLVED based on the v5.17.103/119/120 Search honesty/root-panel fixes and their regression tests.
- Corrected the document’s 48-row header and summary totals from 9 OPEN / 15 RESOLVED to **7 OPEN / 17 RESOLVED**.
- Updated the durable ledger and release markers to v5.17.124.
- No application or religious corpus data changed.

## Verification performed

- Focused issue-ledger/Tasbih/Search/backlog regression: **36/36 passed**.
- Full application regression remains green from the immediately preceding code release v5.17.123: **2,798/2,798 passed** across **271 test files**.
- JS/data/shell release contracts were regenerated after the version bump.
- No test timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity verified with `unzip -tq`.

## Not verified here

- npm lint / Prettier, because required binaries are unavailable.
- Real Chromium/device visual certification, PWA install/update/offline browser lifecycle, Firefox/WebKit, large text, forced colors, safe-area, keyboard-only, and real-device tests.
