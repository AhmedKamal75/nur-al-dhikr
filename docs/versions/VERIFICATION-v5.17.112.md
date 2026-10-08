# Nūr al-Dhikr v5.17.112 — Verification

## Release scope

Checklist hierarchy cleanup: keep today’s worship check-in immediately actionable while treating the seven-day history as secondary reference.

## Implemented

- Today’s progress, streak, completion state, and the Prayer / Adhkar & Qur’an checklist remain directly visible.
- Moved the seven-day history strip behind **Last 7 days / آخر ٧ أيام**.
- Added bilingual disclosure copy and responsive styling.
- No bundled Qur’an, Hadith, Azkar, or other religious corpus bytes were modified.

## Verification performed

- Focused Checklist + existing Checklist regression: **12/12 passed**.
- Full Node regression: **2,782/2,782 passed** across **265 test files**, four deterministic batches.
- JavaScript/MJS syntax: passed for source/test modules checked.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.112.
- Offline shell snapshot: **277 files**, stamped v5.17.112.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 265 tests**).
- No test timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity: verified after packaging.

## Not verified here

- npm lint / Prettier because the required binaries are absent.
- Real Chromium/device visual/touch certification and actual PWA install/update/offline lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device verification.
