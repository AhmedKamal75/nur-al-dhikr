# Nūr al-Dhikr v5.17.126 — Verification

## Release scope

Hostile-review remediation after the authoritative local Chromium v5.17.125 pass. This release fixes the confirmed source defects and Home composition regression without altering religious corpus bytes.

## Confirmed remediation

- Home order is explicitly identity/orientation → Today/prayer context → Start Here → Next/supporting content.
- Today’s Progress is rendered inside the Today section rather than below “Next for you”.
- The stale desktop Home two-column dashboard rule is removed; a late wide-screen guard keeps Home as a single editorial column inside the application rail.
- Invalid Qur’an IDs such as `#/quran?id=99999` short-circuit to an explicit not-found state with an accessible heading before corpus hydration.
- Reciter-picker, onboarding-picker, and Mushaf page-play names can wrap long localized labels and whole-surah badges.
- `QUIZ_LIBRARY_ID` is imported where used.
- `HTMLDetailsElement` is no longer referenced as a lint-global; the handler checks `tagName`.
- Duplicate `i18n` import in `mushafPageFind.js` is removed.
- `onboardingPanel.js` is included in the service-worker APP_SHELL because Settings can replay the introduction from a deferred path.
- A source-level hostile-remediation trap suite was added, and stale E2E contracts discovered by the v5.17.125 evidence pass were corrected without weakening assertions.

## Verification performed in this workspace

- JavaScript/MJS syntax: **563 files + sw.js passed**.
- Full Node regression: **2,810 / 2,810 subtests passed** across **274 test files**, run in 16 deterministic batches; **0 failed, 0 skipped**.
- Targeted hostile-remediation / Home / calendar / cache contracts: **54 / 54 passed** in the final combined gate.
- Offline shell snapshot: **278 files**, stamped v5.17.126 and clean.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.126.
- Agent Map: **244 JS + 27 data + 274 tests**, deterministic.
- Version markers: package.json, package-lock.json, config.js, sw.js, manifest.json, data/manifest.json, RELEASES.md and BACKLOG.md are in lockstep.
- ZIP integrity: verified after packaging.
- No test timeout values were increased.
- No assertions were weakened or skipped.

## Not verified here

- `npm run lint` / Prettier were not executable in this source workspace because the dev-tool binaries are not installed and no cached package copy was available.
- Real Chromium/device visual certification for v5.17.126 remains open. The v5.17.125 local-browser results are evidence for the defects that motivated this release, not proof that v5.17.126 is visually correct.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, real touch hardware, and PWA install/update lifecycle remain open.

## Required next browser evidence

Use `HOSTILE-CHROMIUM-RERUN-v5.17.126.md` on the authoritative local machine. The next run must specifically prove the repaired Home geometry/order at 360/393/1024/1440 in EN/AR × light/dark, the invalid Qur’an not-found state, picker wrapping, and then re-run the v5.17.93→v5.17.125 changed-feature states.
