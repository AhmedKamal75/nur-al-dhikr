# Nūr al-Dhikr v5.17.126 — start here

## Current authoritative release

- Current app: **v5.17.126**
- Current source is the post-hostile-review remediation tree.
- Browser/device certification is still **open** and belongs on the owner’s local Chromium machine.
- Persistent request ledger: `NUR-AL-DHIKR-PENDING-LEDGER.md`

## What the v5.17.125 hostile browser review actually found

The local full-corpus Chromium run found 159 passed / 3 skipped / 17 failed. The most important genuine defects were Home order/desktop geometry, invalid Qur’an deep-link handling, long reciter/picker metadata wrapping, and three lint errors. Several other failures were stale test contracts after intentional product changes. See `docs/HOSTILE-REVIEW-v5.17.125-ASSESSMENT.md`.

## Current Home contract

Home is **not** a dashboard and has no decorative Shahada chrome. Its authored order is:

**identity/orientation → Today/prayer context → Start Here → Next for you → reflection/supporting content**

Today’s progress belongs to the Today section. Wide screens remain a single editorial column inside the application content rail; they must not become a two-column dashboard with a dead canvas.

## Current v5.17.126 remediation

- Restored Home order and wide-screen geometry.
- Invalid numeric Qur’an IDs now immediately render a not-found state with an accessible heading.
- Reciter picker, onboarding picker, and Mushaf page-play picker labels can wrap.
- Fixed `QUIZ_LIBRARY_ID` import.
- Removed duplicate `i18n` import from `mushafPageFind.js`.
- Removed the browser-global `HTMLDetailsElement` lint dependency.
- Added `onboardingPanel.js` to the offline shell after the Settings replay feature introduced that lazy view dependency.
- Added hostile-review source-level traps and updated stale browser contracts without weakening them.

## Next mandatory evidence

Use `HOSTILE-CHROMIUM-RERUN-v5.17.126.md`. Do not claim visual certification until the local Chromium run proves Home at 360/393/1024/1440 in EN/AR × light/dark and re-runs the specific v5.17.93→125 feature states.

## Preserve

No per-dhikr audio clips; no Home dashboard; no decorative sacred banners; no arbitrary More navigation; preserve Mushaf/Word Study/Focus/Tajweed strengths; do not invent religious data; never raise timeouts or weaken/skip tests to obtain green.
