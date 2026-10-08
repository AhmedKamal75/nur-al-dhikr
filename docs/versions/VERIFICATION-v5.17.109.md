# Nūr al-Dhikr v5.17.109 — Verification

## Release scope

Qibla utility deslopification: keep the compass, direction, and distance as the dominant task while moving technical accuracy and magnetic-north methodology into progressive disclosure.

## Implemented

- Qibla compass remains the focal instrument.
- Direction and distance remain immediately visible.
- Location accuracy and magnetic-declination methodology moved behind **Accuracy and magnetic north / الدقة والشمال المغناطيسي**.
- Live heading-error row remains available when sensor frames arrive.
- Compass calibration walkthrough remains available.
- EN/AR regression coverage added.
- No bundled Qur’an, Hadith, Azkar, or other religious corpus bytes were modified.

## Verification performed

- Qibla/declination/utility/design targeted regression: **82/82 passed**.
- Broader Qibla + feature-interior regression: **89/89 passed**.
- JavaScript/MJS syntax: **all source modules passed `node --check`**; `sw.js` passed separately.
- Data manifest: **2,350 files**, full and valid, v5.17.109.
- Offline shell snapshot: **277 files**, stamped v5.17.109 and matching.
- ZIP integrity: verified with `unzip -t`.
- SHA-256: `d6f989372162140ce12aa8216f69f9cbbde6cf924ed1c623416fbf4736ddef7e`.
- No test timeout values were increased.
- No assertions were weakened or skipped.

## Full-suite status

The complete 263-file Node regression was attempted. The single-process run exceeded this workspace's 120-second execution ceiling, and a four-way parallel attempt also exceeded that ceiling before producing complete summaries. Therefore the full suite is **INCOMPLETE, not claimed green**.

## Tooling not verified

- `npm run lint`: not available because `eslint` is not installed in this supplied tree.
- `npm run format:check`: not available because `prettier` is not installed in this supplied tree.

## Browser/device status

Real Chromium/device visual, touch, PWA install/update/offline lifecycle, Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device certification remain **NOT VERIFIED** in this workspace.

Do not claim browser/device certification without actual browser evidence.
