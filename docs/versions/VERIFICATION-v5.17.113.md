# Nūr al-Dhikr v5.17.113 — Verification

## Release scope

Settings reciter/edition metadata overflow hardening.

## Implemented

- Released the inherited global `white-space: nowrap` constraint from Settings reciter/translation/tafsir selector names.
- Kept row width constraints and touch sizing so long bilingual metadata wraps rather than clipping or forcing page overflow.
- Added a regression trap for the CSS cascade defect.
- No religious corpus bytes changed.

## Verification performed

- Focused Settings regression: **26/26 passed**.
- Full Node regression: **2,784/2,784 passed** across **266 test files**, four deterministic batches.
- JS/MJS syntax: passed.
- Data manifest: **2,350 files**, valid, v5.17.113.
- Shell snapshot: **277 files**, valid, v5.17.113.
- Agent Map: **244 JS + 27 data + 266 tests**.
- No timeout changes, weakened assertions, or skipped failures.

## Not verified here

- Real Chromium/device visual/touch evidence, especially 360×800 / 393×852 Settings.
- PWA lifecycle, Firefox/WebKit, large text, forced colors, reduced transparency, safe-area, and keyboard-only verification.
- npm lint / Prettier, due missing binaries.
