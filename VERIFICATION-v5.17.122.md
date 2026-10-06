# Nūr al-Dhikr v5.17.122 — Verification

## Release scope

Settings setup hierarchy deslopification: make the first-run setup area accurately labeled, progressively disclosed, bilingual, and distinct from the twelve actual settings accordions.

## Implemented

- Renamed the Settings group from **Setup & about** to **Setup** in EN/AR; About remains a separate top-level application door.
- Collapsed the optional first-run setup doors behind one native `<details>` disclosure.
- Kept the six setup links and the re-show-introduction action available without changing their handlers or destinations.
- Extracted a shared deferred-setup body renderer so the existing exported `deferredSetupHTML` test/API contract remains stable while Settings uses the new progressive disclosure.
- Kept the setup disclosure outside the twelve `settings-acc` accordions so the Settings index does not gain another peer-level configuration item.
- Added regression coverage for the truthful group label, disclosure rendering, bilingual hierarchy, and action reachability.
- No bundled Qur’an, Hadith, Azkar, or other religious corpus bytes were modified.

## Verification performed

- Focused Settings/onboarding/install/Compare regression: **77/77 passed**.
- Full Node regression: **2,797/2,797 passed** across **271 test files**, executed as 16 deterministic batches.
- Agent Map suite: **13/13 passed** separately to avoid generated-file concurrency.
- JavaScript syntax: changed JS/test files passed `node --check`.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 271 tests**).
- Offline shell snapshot: **277 files**, valid, stamped v5.17.122.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.122.
- ZIP integrity: verified with `unzip -tq`.
- Release markers: package.json, package-lock.json, config.js, sw.js, manifest.json/version_name, data/manifest.json, RELEASES.md, and BACKLOG.md are aligned at v5.17.122.
- No test timeout values were increased.
- No assertions were weakened or skipped.

## Not verified here

- npm lint / Prettier, because the required binaries are unavailable in this supplied tree.
- Real Chromium/device visual certification and touch interaction.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device testing.

## Browser evidence still required

The authoritative local/device pass must continue to cover the established queue: Azkar count/Details separation, Home composition, Settings 360/393 narrow states, Player narrow layout, invalid Qur’an deep links, Hadith Details/Reference, Prayer methodology disclosure, RTL/light/dark, Offline boot/install, Mushaf Find and fullscreen Find, bookmark exact-ayah reopen, Statistics/Checklist/Category disclosures, and the v5.17.122 Setup disclosure in EN/AR.

Do not claim browser/device certification without actual rendered evidence.
