# Deep Quality Audit — 2026-10-08

This audit is deliberately broader than the current PR queue. It records what can
be established from the repository itself and separates that from device/browser
claims that require the local Chromium gate.

## What is now verified from source

### Tajweed
- The deterministic classifier currently defines **20 classifier rules**.
- The written course references all 20 classifier rules, plus four contested
  makharij/sifat positions.
- Existing tests already verify source attribution, bilingual source metadata,
  JSON/runtime parity, course progression, and selected classifier behavior.
- A new tests/tajweed-rule-coverage.test.js contract now requires a positive
  fixture for every one of the 20 classifier rules and requires every classifier
  rule to remain reachable from the written course.
- This is **not yet equivalent to validating every occurrence in the full Qur'an**.
  A corpus-wide execution sweep is still required: classify all 6,236 ayahs,
  collect every emitted rule, and compare representative/edge-case occurrences
  against trusted references. The local execution environment is required for
  that sweep.

### Mushaf
The current architecture is materially more complete than an earlier simplistic
description would imply. The Mushaf already has:
- 604-page Madani page data;
- single-page and double-page spread rendering;
- page/surah/juz/hizb navigation;
- deep-link resolution from surah+ayah to page;
- bookmarks, folders and notes;
- page-local find;
- translation/tafsir/study tray;
- Tajweed coloring and settings;
- recitation/player surfaces and fullscreen controls;
- hifz entry;
- fullscreen mode, wake-lock support and keyboard page turns.

However, **source completeness is not product proof**. The Mushaf still requires a
fresh hostile browser pass for typography, page balance, touch targets, fullscreen
controls, RTL behavior, spread direction, zoom/font scaling, search, bookmarks,
deep links, offline behavior, and audio continuity.

## High-value findings requiring further work

1. **Tajweed corpus-wide correctness is not yet proven.** Rule fixtures prove
   representative classifier behavior, not complete Qur'an-scale correctness.
2. **Tajweed instructional depth remains incomplete.** The classifier and rule
   teaching are substantial, but the planned Learn → See → Try → Check → Review
   curriculum body is not yet fully implemented.
3. **Mushaf quality is feature-rich but not yet hostile-verified as “top notch.”**
4. **The 78-row issue ledger needs a systematic stale-row audit.** Rows marked
   OPEN/PROPOSED/BLOCKED should be reclassified only after checking current code
   and, where necessary, browser/device evidence.
5. **Old comments and assumptions still exist in the codebase.** This pass found
   stale palette wording around Madd 'Iwad and removed it; similar source-level
   archaeology should continue.
6. **Architecture is already partially refactored**, notably the Mushaf facade
   extraction and study/player/jump/bookmark seams. The remaining refactor should
   target actual coupling/size/ownership problems, not perform cosmetic rewrites.

## Explicit non-claims

This document does **not** claim:
- that all Tajweed occurrences are correct;
- that all 604 Mushaf pages have been visually validated;
- that Firefox/WebKit/accessibility-device matrices pass;
- that the current PRs pass CI;
- that v5.17.137 exists.

## Next audit order

1. Corpus-wide Tajweed execution + edge-case classification report.
2. Mushaf hostile interaction matrix.
3. Systematic OPEN-ISSUES re-audit, starting with old P1/P0 rows.
4. Static architecture/refactor sweep for oversized modules, duplicated state,
   stale compatibility shims and dead code.
5. Data/provenance audit: Qur'an, Hadith, Adhkar/Du'a, Tajweed and lexical data.
6. Only then decide what deserves v5.17.137 and what remains blocked on browser,
   scholar, licensing, or product decisions.
