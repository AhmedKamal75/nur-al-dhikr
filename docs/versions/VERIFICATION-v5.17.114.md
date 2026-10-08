# Nūr al-Dhikr v5.17.114 — Verification

## Release scope

Offline utility hierarchy cleanup: keep the one-tap offline-readiness task primary while making granular storage/download controls secondary.

## Implemented

- Kept Download all, storage usage, and progress as the immediate offline task.
- Moved individual corpus downloads, storage-mode controls, study-data clearing, compression/essentials preferences, and audio-download entry into one **Manage offline storage / إدارة التخزين دون اتصال** disclosure.
- Added bilingual summary copy and responsive disclosure styling.
- No bundled religious corpus bytes were modified.

## Verification performed

- Focused Offline regression: **10/10 passed**.
- Full Node regression: **2,787/2,787 passed** across **267 test files**, four deterministic batches.
- JS/MJS syntax: passed.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.114.
- Offline shell: **277 files**, stamped v5.17.114.
- Agent Map: **244 JS + 27 data + 267 tests**.
- No timeout changes, weakened assertions, or skipped failures.

## Not verified here

- Real Chromium/device visual/touch evidence.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large text, forced colors, reduced transparency, safe area, keyboard-only, real-device verification.
- npm lint / Prettier because required binaries are absent.
