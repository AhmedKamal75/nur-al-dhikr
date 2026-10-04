# Browser Evidence Record — v5.17.78

## Environment

This record summarizes the local Chromium run returned to the project on 2026-10-03. It is evidence, not a design opinion.

## Matrix

- 10 core routes × EN/AR × light/dark × 1024×768 / 1440×900 / 360×800 / 393×852
- 12 secondary feature surfaces
- onboarding + Focus Mode
- 213 screenshots total

## Gates

- Node/static: 2464/2519 in the seed bundle; 55 failures were ENOENT for intentionally omitted bulk corpora.
- Chromium: 132 passed / 39 failed in three sequential chunks with `PW_WORKERS=2`; 38 failures were corpus absence and one was a documented onboarding reciter persistence flake.
- Geometry: 2 pre-fix Tajweed horizontal-scroll captures at 360px; no real clipped-label defect remained after the fix.

## Real defects found and fixed

1. Light-theme AA contrast: muted text at 4.22:1 plus gold/Tajweed variants below AA.
2. Four separate 44px touch-target contract failure classes.
3. Tajweed course: 25px horizontal overflow at 360px from the mode segment.
4. v5.17.77 manifest version marker mismatch.
5. 24-file formatter drift and stale agent-map/runtime issues in the handoff archive.

## Remaining evidence questions

- Data-absent Qur'an/Mushaf error states lost their normal heading landmark because the heading normally comes from loaded reading data. v5.17.80 adds sr-only headings to those error paths.
- Onboarding reciter persistence needs a timing-proof diagnosis; the browser test passed 4/4 in isolation.
- The full feature interiors should be re-rated on the current full-corpus tree after v5.17.80, especially Player, Tajweed, Settings, Azkar browser, and the utility surfaces.

## Score

The evidence-based weighted hostile review of this run was **9.35/10**. Do not carry this score forward automatically; the current tree must be re-scored after the next browser matrix.
