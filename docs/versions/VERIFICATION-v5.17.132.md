# Nūr al-Dhikr v5.17.132 — Verification

Date: 2026-10-07

## Source baseline

Implemented directly from the verified persistent v5.17.131 source release.

## v5.17.132 hostile-review remediation

- Hardened user-import file handling with an explicit pre-read size ceiling, preventing avoidable whole-file memory pressure before validation.
- Hardened family-plan/custom-import key validation against reserved prototype-pollution keys before object materialization.
- Updated the durable hostile-review ledger with independently reviewed findings across security, resilience, product, content/provenance, performance, accessibility, information architecture, and PWA/offline concerns.
- No bundled Qur'an, Hadith, Azkar, or other religious corpus bytes were intentionally modified.

## Hostile review disposition

- Independent review lenses completed: visual/UI, UX/usability, interaction, IA/navigation, responsive/mobile, Arabic/RTL, accessibility, performance, resilience/error handling, offline/PWA, content/religious integrity, product completeness/enrichment, privacy/security, maintainability, competitive/product quality, new-user, power-user, edge-case, and anti-slop review.
- Real defects were separated from preferences and scholarly/device-blocked items.
- New durable findings were severity-ranked and entered into the current issue ledger; strong Mushaf/Focus/Tajweed surfaces were explicitly preserved unless evidence required change.

## Automated verification

- v5.17.132 deterministic full regression: **2,827/2,827 passed**, across **281 test files**; 0 failed, 0 skipped, 0 cancelled.
- Hostile/remediation focused tests: **7/7 passed**.
- Release/hostile/document consistency gate: **40/40 passed**.
- JavaScript syntax: **244 JS files + sw.js** checked successfully.
- Data manifest: **2,350 files, full and valid, v5.17.132**.
- Shell snapshot: **278 files, v5.17.132**.
- Agent Map: **244 JS + 27 data + 281 tests**.

## Tooling limitations

- Browser/Chromium visual/E2E certification remains **NOT VERIFIED** in this workspace.
- npm lint / Prettier remain **NOT VERIFIED** because the executables are unavailable in this source workspace.
- No test timeout was raised, no assertion was weakened, and no failure was skipped to obtain the green regression.

## Release integrity

- Full source archive: `NUR-AL-DHIKR-v5.17.132-FULL.zip`
- ZIP integrity: `unzip -t` PASS
- Exact archive size/entry count/hash are recorded in the adjacent `.sha256` release artifact; the saved ZIP must be independently re-read and compared against that checksum.
- `package.json`, `js/core/config.js`, and `manifest.json` all report **5.17.132**.

Global persistence is complete only after the exact saved ZIP is re-read and its SHA-256 independently matches the checksum above.
