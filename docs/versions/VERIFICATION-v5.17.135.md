# Nūr al-Dhikr v5.17.135 — Verification

Date: 2026-10-07

## Source baseline

Implemented directly from the completed local v5.17.134 source release.

## v5.17.135 deslopification

- Resolved OPEN-ISSUES row 20: Audio defaults no longer use a separate sleep-timer selector.
- Audio defaults and the live full-surah player now use the same direct sleep-cycle interaction and the same `nextSleepRung` ladder.
- The duplicate `data-audio-pref="sleep"` grammar was removed.
- No religious corpus bytes intentionally modified.

## Automated verification

- Focused Audio/sleep/deslopification contracts: **49/49 passed**.
- Backlog/ledger/agent-map release contract: **35/35 passed**.
- Deterministic full regression: **2,831/2,831 passed**, across **281 test files**; 0 failed, 0 skipped, 0 cancelled.
- JavaScript syntax: **244 JS files + sw.js** checked successfully.
- Data manifest: **2,350 files, full and valid, v5.17.135**.
- Shell snapshot: **278 files, v5.17.135**.
- Agent Map: **244 JS + 27 data + 281 tests**.

## Browser/device status

- Browser/Chromium visual certification is **NOT VERIFIED** in this workspace.
- The owner-machine evidence handoff remains the required next evidence step.

## Tooling limitations

- npm lint / Prettier are not independently certified because those executables are unavailable in the source workspace.
- No test timeout was raised and no assertion was weakened or skipped.

## Release integrity

The exact source archive, checksum, recovery bundle, verification record, ledger, and checkpoint must be persisted and the saved ZIP re-read/hash-verified before v5.17.135 becomes globally authoritative.
