# Nūr al-Dhikr v5.17.115 — Verification

## Release scope

Category-action hierarchy cleanup plus the preceding autonomous utility/accessibility-hardening waves.

## Implemented

- Focus session remains the single category-header action.
- By-heart and Quiz moved into the existing section options menu.
- Removed orphaned `byheart.mode` translations after the header control was removed.
- No bundled Qur'an, Hadith, Azkar, or other religious corpus bytes were intentionally modified.

## Verification performed

- Focused category/Adhkar/library/deslopification suite: **42/42 passed**.
- Full Node regression: **2,790/2,790 passed** across **268 test files**, split into eight deterministic batches.
- Regression found and fixed one real `byHeartOn` undefined source bug and two stale release-contract failures before the final green result.
- JavaScript/MJS syntax: **0 failures** across the source tree.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 268 tests**).
- Offline shell snapshot: **277 files**, stamped v5.17.115.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.115.
- No test timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity will be verified after packaging.

## Not verified here

- Real Chromium/device visual certification and touch interaction.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only and real-device testing.
- npm lint / Prettier if the required binaries remain unavailable in the supplied environment.

## Browser evidence still required

The authoritative local/device pass must cover the existing queue: Azkar count/Details separation; Home composition; menu disclosure; Settings at 360/393 EN+AR; Player narrow state; invalid Qur'an deep links; Hadith Details+Reference; Prayer methodology; light/dark/RTL; Offline; Mushaf Find single/spread + exact ayah; fullscreen Find; bookmark reopen; and the new Statistics/Checklist/Category disclosures.

Do not claim browser/device certification without actual browser evidence.
