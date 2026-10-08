# Nūr al-Dhikr v5.17.125 — Verification

## Release scope

Tajweed Practice retry affordance: when a round cannot load any questions, the existing failure state now offers a direct Retry / إعادة المحاولة action that retries the same rule and answer mode. Ordinary status toasts remain actionless.

## Verification performed

- Focused Tajweed retry regression: **16/16 passed**.
- Full Node regression: **2,800/2,800 passed** across **272 test files** in 16 deterministic batches.
- Full regression result: **0 failed, 0 skipped, 0 cancelled**.
- Offline shell snapshot: **277 files**, valid, stamped v5.17.125.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.125.
- Agent Map: **244 JS + 27 data + 272 tests**, regenerated deterministically.
- Release markers: package.json, package-lock.json, config.js, sw.js, manifest.json, data/manifest.json, RELEASES.md, and BACKLOG.md aligned to v5.17.125.
- No test timeout values were increased.
- No assertions were weakened or skipped.
- No bundled Qur’an, Hadith, Azkar, or other religious corpus bytes were intentionally modified.

## Not verified here

- Real Chromium/device visual certification and touch interaction.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device testing.
- npm lint / Prettier where the required binaries remain unavailable in this supplied environment.

## Release artifact status

This report belongs to **v5.17.125**, the current release. Older app ZIPs/checksums are removed from the active artifact area before packaging the final v5.17.125 archive.
