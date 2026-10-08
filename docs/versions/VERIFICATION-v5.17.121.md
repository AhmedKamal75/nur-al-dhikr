# Nūr al-Dhikr v5.17.121 — Verification

## Release scope

Settings hierarchy cleanup for the translation Compare C subsection.

## Implemented

- Replaced the nested second `<summary>` previously used for Compare C inside the Compare `<details>` with a non-interactive subsection heading.
- Preserved Compare B/C controls, translation edition selection, and default Tafsir controls unchanged.
- Added bilingual-safe structure without inventing new religious content.

## Verification performed

- Focused Settings/Compare regression: **29/29 passed**.
- Full Node regression: **2,797/2,797 passed** across **271 test files**, split into 16 deterministic batches plus isolated Agent Map verification.
- JavaScript/module syntax: passed for all JS/MJS files.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 271 tests**).
- Offline shell snapshot: **277 files**, stamped v5.17.121.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.121.
- No timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity verified after packaging.

## Not verified here

- Real Chromium/device visual and touch certification.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device testing.
- npm lint / Prettier where required binaries are unavailable.

## Browser evidence still required

Continue the durable browser/device queue from the project ledger, particularly Settings at 360×800/393×852 in EN/AR and all previously listed interaction, RTL, Mushaf, Player, Offline, and accessibility states.

Do not claim browser/device certification without actual browser evidence.
