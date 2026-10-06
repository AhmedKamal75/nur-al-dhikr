# Nūr al-Dhikr v5.17.116 — Verification

## Release scope

About-page deslopification: preserve the human-facing identity/capabilities surface while progressively disclosing secondary guide, privacy, provenance, and installation information.

## Implemented

- About identity and capabilities remain immediately visible.
- Feature guide, privacy, sources/provenance, and offline/install guidance are now native progressive disclosures.
- Existing guide routes, source copy, install behavior, and EN/AR content are preserved.
- Category action cleanup from v5.17.115 remains part of the current verified tree.
- No bundled Qur'an, Hadith, Azkar, or other religious corpus bytes were intentionally modified.

## Verification performed

- Focused About/Category/Offline set: **8/8 passed**.
- Full Node regression: **2,792/2,792 passed** across **269 test files**. Eight deterministic batches covered the suite; the 13-test Agent Map suite was run separately because the generator mutates its generated files and concurrent test files can race on those bytes.
- Source syntax: **0 failures** across **579 JS/MJS files**.
- Agent Map: **244 JS + 27 data + 269 tests**, deterministic and green.
- Offline shell snapshot: **277 files**, valid, stamped v5.17.116.
- Data manifest: **2,350 files**, full, valid, stamped v5.17.116.
- No timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity will be verified after packaging.

## Not verified here

- Real Chromium/device visual certification and touch interaction.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only and real-device testing.
- npm lint / Prettier if required binaries remain unavailable in this supplied environment.

## Browser evidence still required

The authoritative local/device pass must continue to cover the existing queue: Azkar count/Details separation, Home composition, main-menu disclosure, Settings at 360/393 EN+AR and long metadata, Player narrow state, invalid Qur'an deep links, Hadith Details+Reference, Prayer methodology, light/dark/RTL, Offline, Mushaf Find single/spread + exact ayah navigation, fullscreen Find, bookmark reopen, and the new About/Category progressive disclosures.

Do not claim browser/device certification without actual browser evidence.
