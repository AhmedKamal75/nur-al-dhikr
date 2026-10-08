# Nūr al-Dhikr v5.17.119 — Verification

## Release scope

Global Search honesty for the Hadith tier.

## Implemented

- Global Search still starts the existing Hadith index build through `stateSub`.
- While the Hadith catalog exists but its index has no records yet, the global breakdown now renders `Hadith: —` instead of falsely claiming `Hadith: 0`.
- Once the index has records, genuine zero-result queries continue to render `Hadith: 0`.
- Added regression coverage to `tests/search-offline-honesty.test.js`.
- No religious corpus bytes were modified.

## Verification performed

- Focused Search honesty regression: **7/7 passed**.
- Full Node regression: **2,795/2,795 passed** across **270 test files**, split into 16 deterministic batches plus isolated Agent Map verification.
- JavaScript/module syntax: passed for all JS/MJS files.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 270 tests**).
- Offline shell snapshot: **277 files**, stamped v5.17.119.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.119.
- No timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity verified after packaging.

## Not verified here

- Real Chromium/device visual and touch certification.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device testing.
- npm lint / Prettier where required binaries are unavailable.

## Browser evidence still required

Continue the durable browser/device queue from the project ledger, including Search loading/error honesty and the previously listed Azkar, Home, Settings, Player, Hadith, Prayer, Offline, Mushaf, RTL, disclosure, touch, and accessibility checks.

Do not claim browser/device certification without actual browser evidence.
