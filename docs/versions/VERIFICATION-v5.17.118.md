# Nūr al-Dhikr v5.17.118 — Verification

## Release scope

RTL robustness for the new progressive-disclosure affordances in About and Audio/Reciters.

## Implemented

- Corrected collapsed/open disclosure chevron orientation in Arabic RTL.
- Kept the existing progressive-disclosure hierarchy and interaction behavior unchanged.
- Added source-level regression assertions for both About and Audio/Reciters disclosure CSS.
- No religious corpus data was modified.

## Verification performed

- Focused RTL/About/Audio regression: **31/31 passed**.
- Full Node regression: **2,794/2,794 passed** across **270 test files**, using 16 deterministic batches plus isolated Agent Map generation tests to avoid file-generation concurrency.
- JavaScript/module syntax: **passed** for all JS/MJS files.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 270 tests**).
- Offline shell snapshot: **277 files**, stamped v5.17.118.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.118.
- No timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity will be checked after packaging.

## Not verified here

- Real Chromium/device visual and touch certification.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device testing.
- npm lint / Prettier where the required binaries are unavailable.

## Browser evidence still required

The authoritative local/device pass must continue to cover the existing queue:

- Azkar Details vs tap/count separation.
- Home composition and absence of decorative Shahada treatment.
- Main-menu disclosure.
- Settings at 360×800 and 393×852 in EN/AR, especially long reciter/edition metadata.
- Player narrow layout / no clipping.
- Invalid Qur'an deep links.
- Hadith Details + Reference.
- Prayer methodology disclosure.
- Light/dark and RTL behavior.
- Offline boot/install/update behavior.
- Mushaf Find on this page in single/spread modes and fullscreen.
- Bookmark reopen → exact ayah target.
- Statistics/Checklist/Category/About/Audio disclosures in EN/AR.

Do not claim browser/device certification without actual browser evidence.
