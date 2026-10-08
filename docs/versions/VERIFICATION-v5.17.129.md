# Nūr al-Dhikr v5.17.129 — Verification Record

Date: 2026-10-07

## Source baseline

This release was implemented directly against the verified persistent **v5.17.128** full source ZIP.

- `NUR-AL-DHIKR-v5.17.128-FULL.zip`
- Previous release package integrity: verified before this wave
- No reconstruction from older conversational artifacts

## v5.17.129 implementation

### Action-affordance audit continuation

Added direct, localized **Retry** actions only where the failed operation has a safe, deterministic, idempotent recovery path:

- full-surah playback startup;
- verse-session startup;
- playlist-session startup;
- lazy modal chunk loading;
- custom Adhan import (module-load and transient save failure);
- custom Adhan deletion/clear;
- backup import and family-plan import failures before confirmation/mutation;
- LaunchQueue open-with import failure;
- offline download attempted while offline;
- single-surah audio download failures;
- verse-pack download failures when nothing was saved.

Deliberately **no Retry** was added to validation errors, known-missing media, quota/storage conditions, generic delegated-handler failures, or ordinary status/success toasts where retry would not provide a deterministic recovery path.

### Ledger correction

- Action-affordance issue #7 is now **RESOLVED** after reviewing the remaining toast failure surfaces and adding actions only where justified.
- OPEN/RESOLVED counts in `docs/OPEN-ISSUES.md` were reconciled and contract-tested.
- No religious corpus bytes were intentionally modified.

## Tests and static verification

- Focused v5.17.129 action-affordance gate: **3/3 passed**.
- Contract/backlog/open-issues gate: **34/34 passed**.
- Full deterministic regression: **2,819/2,819 passed** across **277 test files**, with 0 failed, 0 skipped, 0 cancelled.
- JavaScript syntax: **244 JS files + `sw.js` passed**.
- Data manifest: **2,350 files, full and valid, v5.17.129**.
- Shell snapshot: **278 files, v5.17.129**.
- Agent Map: **244 JS + 27 data + 277 tests**.
- Test timeout policy: no timeout values were increased and no assertions were weakened or skipped.

## Browser verification status

**NOT VERIFIED in this workspace.**

The monolithic `npm test` command exceeded the execution ceiling and was not treated as a green gate. The project's deterministic batch strategy was used instead and completed all **2,819 tests**.

No Chromium screenshots, browser E2E certification, PWA-install certification, Firefox/WebKit verification, forced-colors verification, large-text verification, safe-area verification, or keyboard-only certification is claimed here.

The authoritative local browser pass must still cover the carried-forward hostile cases plus the v5.17.129 Retry interactions and narrow/RTL/theme states.

## Release integrity

The complete v5.17.129 source ZIP, checksum, this verification record, updated ledger, and current checkpoint must be persisted to Global and the exact saved ZIP must be re-read and hash-verified before v5.17.129 replaces v5.17.128 as the sole authoritative active release artifact.
