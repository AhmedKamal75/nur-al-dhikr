# Nūr al-Dhikr v5.17.120 — Verification

## Release scope

Global Search cleanup: remove the empty Roots section when no related root matches.

## Implemented

- Root-aware Search still expands matched root families and renders the existing root chips unchanged.
- When no root family matches, Search now omits the Roots section entirely instead of presenting an empty panel.
- Removed the now-unused `search.scopeRoots` EN/AR strings.
- Updated the existing root-aware view contract to pin the new behavior.
- No religious corpus bytes were modified.

## Verification performed

- Focused Search/root/content-i18n regression: **39/39 passed**.
- Full Node regression: **2,796/2,796 passed** across **271 test files**, split into 16 deterministic batches plus isolated Agent Map verification.
- JavaScript/module syntax: passed for all JS/MJS files.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 271 tests**).
- Offline shell snapshot: **277 files**, stamped v5.17.120.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.120.
- No timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity verified after packaging.

## Not verified here

- Real Chromium/device visual and touch certification.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device testing.
- npm lint / Prettier where required binaries are unavailable.

## Browser evidence still required

Continue the durable browser/device queue from the project ledger, including Search loading/error honesty and the existing Azkar, Home, Settings, Player, Hadith, Prayer, Offline, Mushaf, RTL, disclosure, touch, and accessibility checks.

Do not claim browser/device certification without actual browser evidence.
