# Nūr al-Dhikr v5.17.108 — Verification

## Release scope

Zakat utility deslopification: keep the annual Zakat calculator as the primary working surface and progressively disclose Zakat al-Fitr and saved assessments/hawl history.

## Implemented

- Nisab/pricing, wealth inputs, and live result remain immediately visible.
- Zakat al-Fitr is behind a native `<details>` disclosure with bilingual summary copy.
- Saved assessments/history is behind a native `<details>` disclosure only when history exists; saved rows and hawl/reminder/delete actions are unchanged.
- Added EN/AR regression coverage.
- No bundled Qur’an, Hadith, Azkar, or other religious corpus bytes were modified.

## Verification performed

- Focused Zakat logic + hierarchy regression: **18/18 passed**.
- Full Node regression: **2,774/2,774 passed** across **263 test files** (641 suites).
- JavaScript syntax: changed JS/tests passed `node --check`.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 263 tests**).
- Offline shell snapshot: **277 files**, stamped v5.17.108.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.108.
- Version markers: package.json, package-lock.json, config.js, sw.js, manifest.json, RELEASES.md, and BACKLOG.md are in lockstep.
- No test timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity: verified after packaging.

## Not verified here

- npm lint / Prettier, if the required binaries remain unavailable in this source tree.
- Real Chromium/device visual certification and touch interaction.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device testing.

## Browser evidence still required

The authoritative local/device pass must continue to cover the existing queue, including the Zakat disclosure in EN/AR and the earlier Mushaf, Hadith, Prayer, Home, Settings, Player, offline, RTL, and touch checks.

Do not claim browser/device certification without actual browser evidence.
