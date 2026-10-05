# Nūr al-Dhikr v5.17.85 — implementation results

## Scope

This cycle responds to the owner’s product-level complaint that Home was still too crowded, Focus did not feel like a sequential reading session, and feature chrome remained too dashboard-like. It also incorporates the current azkar.me reference: direct category entry, a clear search doorway, visible progress, and restrained secondary controls.

## Implemented

- Home default panel set reduced to Continue + Progress. Optional panels require explicit saved order; they are not automatically promoted.
- Home default quick actions reduced to Morning + Evening.
- Shahada identity strip moved to the end of Home rather than interrupting the daily flow.
- Azkar browser search doorway added to the section header. Morning and Evening categories receive subtle featured treatment.
- Focus auto-advance default handoff shortened to 220ms, bounded 120–600ms, while retaining the duplicate-tap guard.
- Full-surah Player secondary controls moved behind native `<details>` disclosure; transport remains visible.

## Verification

- Targeted product cycle: **72/72 passing**.
- Broader navigation/feature/accessibility/player cycle: **220/220 passing across 54 suites**.
- JavaScript syntax checks passed for changed runtime files.
- Data manifest: **2,350 files, full, valid, v5.17.85**.
- Shell snapshot: **276 files stamped v5.17.85**.
- Agent map regenerated.

## Not yet verified

- No new Chromium screenshot matrix is claimed in this environment.
- Therefore no new numeric product score is assigned here.
- The authoritative local machine must run the full EN/AR × light/dark × 360/393/1024/1440 matrix and the Focus one-tap completion flow before a score is updated.

## Required browser evidence

Focus especially on Home, Main Menu, Azkar, Focus, Player, Settings, and 360px RTL.
