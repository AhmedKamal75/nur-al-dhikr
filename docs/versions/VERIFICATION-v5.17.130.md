# Nūr al-Dhikr v5.17.130 — Verification

Date: 2026-10-07

## Source baseline

Implemented directly from the verified v5.17.129 local release source.

## v5.17.130 implementation

- Last-resort render error screen is semantic instead of inline-styled.
- Error screen explicitly declares active language and direction for EN/AR recovery.
- Emergency surface uses semantic theme tokens and safe-area-aware spacing.
- Emergency buttons retain a visible focus contract and forced-colors-safe system colours.
- No religious corpus bytes intentionally modified.

## Automated verification

- v5.17.130 focused contract: **4/4 passed**.
- Deterministic full regression: **2,820/2,820 passed**, across **278 test files**; 0 failed, 0 skipped, 0 cancelled.
- JavaScript syntax: **244 JS files + sw.js** checked successfully.
- Data manifest: **2,350 files, full and valid, v5.17.130**.
- Shell snapshot: **278 files, v5.17.130**.
- Agent Map: **244 JS + 27 data + 278 tests**.
- Agent-map and backlog consistency suites: passed.
- Design-token/contrast and action-affordance regression suites: passed.

## Tooling limitations

- Browser/Chromium visual/E2E certification is **NOT VERIFIED** in this workspace.
- `npm run lint` / `npm run format:check` are **NOT VERIFIED** because the `eslint` and `prettier` executables are not installed in this source workspace.
- No test timeout was raised and no assertions were weakened or skipped to obtain the regression result.

## Release integrity

The release is locally complete. Global persistence is still pending and must be independently confirmed by listing/re-reading the exact saved ZIP and verifying its checksum before v5.17.130 is considered globally authoritative.
