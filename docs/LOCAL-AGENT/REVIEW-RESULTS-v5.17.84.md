# Nūr al-Dhikr v5.17.84 — implementation results

## Scope

This pass responds to the owner’s hostile review that the main menu grouped semantically unrelated destinations and that Home lacked a deliberate reading order.

## Implemented

- Seven top-level product doors remain the source of worship/product hierarchy.
- Azkar, Qur’an, Prayer, Practise and You (where depth exists) expand from the main menu via explicitly styled `<details>/<summary>`.
- Native disclosure triangles and dashed/stacked browser-default chrome are removed.
- Zakat, Offline, Settings, About are standalone application-tail siblings; Settings then About are the final two.
- Home order is enforced as identity/orientation → Today/prayer context → Start Here actions → Shahada bridge → next task → reflection → onboarding/context/supporting material.
- Home mobile heading scale is reduced.
- Settings setup links remain target-sized controls rather than hyperlink-like prose.
- Existing Focus auto-advance work is preserved; this pass does not redesign Focus or Tajweed.
- Durable agent brain/memory/worklog/remaining-work docs were updated.

## Verification in this workspace

- Targeted source/contracts/IA/Home/Settings bundle: **205 passed / 0 failed**, 46 suites.
- `data/manifest.json`: **valid, 2350 files, full**.
- Release markers: **v5.17.84** in package.json, package-lock root, config.js, sw.js, manifest version and version_name.
- `snapshot-shell`: **276 files stamped v5.17.84**.
- Changed JS files pass `node --check`.

## Not verified here

- Full `npm run check` is not claimed because this extracted workspace has no `node_modules`.
- No Chromium score is assigned. The authoritative local machine must run the full browser matrix.

## Mandatory local browser checks

1. Main drawer: EN/AR × light/dark × 360×800 / 393×852 / 1024×768 / 1440×900.
2. Expand/collapse Azkar, Qur’an, Prayer, Practise, You and confirm no native markers, dashed lines, clipped children, or horizontal overflow.
3. Confirm Zakat, Offline, Settings, About are standalone tail siblings; Settings then About are last.
4. Home: verify Today/prayer context and Start Here occur before reflection/supporting content and that typography is not oversized.
5. Focus: Morning Adhkar completion advances exactly once to the next visible item.
6. Settings: `.reciter-row__meta` wraps rather than clipping at 1440×900.
7. Qur’an/Mushaf missing-data heading E2E remains green.
8. Only then score using `docs/LOCAL-AGENT/HOSTILE-REVIEW-RUBRIC.md`.
