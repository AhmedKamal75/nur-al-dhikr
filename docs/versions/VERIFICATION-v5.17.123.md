# Nūr al-Dhikr v5.17.123 — Verification

## Release scope

Accessibility/robustness: ensure reduced-motion preferences suppress active-press transforms instead of merely shortening transitions.

## Implemented

- Under the in-app `data-reduce-motion='true'` preference, shared nav/buttons no longer scale to 90% on `:active`.
- Under OS `prefers-reduced-motion: reduce`, the same shared interactive chrome no longer applies the 90% press transform.
- Ordinary press feedback remains unchanged when reduced motion is not requested.
- Added a motion regression contract covering navigation, chips, counters, tiles, quick actions, icon buttons, and buttons.
- No religious corpus data changed.

## Verification performed

- Focused motion/accessibility regression: **47/47 passed**.
- Full Node regression: **2,798/2,798 passed** across **271 test files**, executed in 16 deterministic batches.
- JavaScript syntax: changed JS/test files passed `node --check`.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 271 tests**).
- Offline shell snapshot: **277 files**, valid, stamped v5.17.123.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.123.
- ZIP integrity: verified with `unzip -tq`.
- Release markers: package.json, package-lock.json, config.js, sw.js, manifest.json/version_name, data/manifest.json, RELEASES.md, and BACKLOG.md align at v5.17.123.
- No test timeout values were increased.
- No assertions were weakened or skipped.

## Not verified here

- npm lint / Prettier, because required binaries are unavailable in this supplied tree.
- Real Chromium/device visual certification and touch interaction.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, safe-area, keyboard-only, and real-device testing.

## Browser evidence still required

The authoritative local/device pass must continue to cover the established feature queue plus reduced-motion behavior on the affected nav/buttons. Do not claim browser/device certification without rendered evidence.
