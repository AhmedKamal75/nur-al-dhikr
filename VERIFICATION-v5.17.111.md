# Nūr al-Dhikr v5.17.111 — Verification

## Release scope

Statistics hierarchy cleanup: reduce the visible overview to a small set of high-signal metrics and place deeper analytics behind one explicit progressive disclosure.

## Implemented

- Kept total recitations, reading today, current streak, and active days immediately visible.
- Moved longest streak, 30-day total, average/day, daily goal, streak coaching, top surahs, memorization digest, weekly chart, heatmap, and most-read breakdown behind **Detailed activity / تفاصيل النشاط**.
- Kept Garden and Certificate as compact navigation links rather than competing dashboard panels.
- Added responsive bilingual disclosure styling and dedicated regression coverage.
- No bundled Qur’an, Hadith, Azkar, or other religious corpus bytes were modified.

## Verification performed

- Focused Statistics + existing Statistics/Design regression: **36/36 passed**.
- Full Node regression: **2,779/2,779 passed** across **264 test files**; four deterministic batches were used only to stay below the environment’s process ceiling.
- JavaScript/MJS syntax: **passed** for all source/test modules checked.
- Data manifest: **2,350 files**, full and valid, stamped v5.17.111.
- Offline shell snapshot: **277 files**, stamped v5.17.111.
- Agent Map: regenerated deterministically (**244 JS + 27 data + 264 tests**).
- No test timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity: verified after packaging.

## Not verified here

- npm lint / Prettier because the required binaries are absent in this supplied tree.
- Real Chromium/device visual certification and touch interaction.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only, and real-device testing.

## Browser evidence still required

The authoritative local/device pass remains responsible for the existing certification queue, now including Statistics in EN/AR and the prior Azkar, Home, Settings, Player, invalid Qur’an route, Hadith, Prayer, Mushaf Find, fullscreen Find, bookmark reopen, offline boot, RTL, and touch checks.
