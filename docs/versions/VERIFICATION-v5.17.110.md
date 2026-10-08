# Nūr al-Dhikr v5.17.110 — Verification

## Release scope

Tasbih utility deslopification: preserve the counting surface as the dominant task while moving target editing, floating-counter setup, and custom-phrase authoring into progressive disclosure.

## Implemented

- Phrase selection, Arabic dhikr, counter, progress, and reset remain immediately visible.
- Target editing and target presets moved behind **Counter options / خيارات العداد**.
- Floating-counter setup moved behind the same disclosure when supported.
- Custom-phrase authoring moved behind the same disclosure.
- Existing persistence, target values, custom entries, deletion, and counting behavior were preserved.
- Added EN/AR regression coverage.
- No religious corpus data was modified.

## Verification performed

- Tasbih + feature-interior targeted regression: **38/38 passed**.
- JavaScript/MJS syntax: all source modules passed `node --check`; `sw.js` passed separately.
- Data manifest: **2,350 files**, full and valid, v5.17.110.
- Offline shell snapshot: **277 files**, stamped v5.17.110 and matching.
- ZIP integrity: verified with `unzip -t` after packaging.
- No test timeout values were increased.
- No assertions were weakened or skipped.

## Full-suite status

The complete Node matrix is **not claimed green** for this release. Earlier full-matrix attempts in this workspace exceeded the fixed 120-second execution ceiling; focused release gates are used until a complete run can finish without changing the timeout policy.

## Tooling not verified

- `npm run lint`: `eslint` binary is absent from the supplied tree.
- `npm run format:check`: `prettier` binary is absent from the supplied tree.

## Browser/device status

Real Chromium/device visual, touch, PWA install/update/offline lifecycle, Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device certification remain **NOT VERIFIED** in this workspace.

Do not claim browser/device certification without actual browser evidence.
