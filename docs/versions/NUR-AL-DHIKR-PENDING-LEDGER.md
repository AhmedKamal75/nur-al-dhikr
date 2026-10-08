# Nūr al-Dhikr — Persistent Request Ledger

**Updated:** 2026-10-08
**Current app:** v5.17.136
**Current phase:** browser/device certification → hostile-review follow-through → accessibility/robustness → evidence-backed utility/deslopification
**Distribution:** `origin/main` is the authority. Work from the repository; Git history, reviews, ledgers, and release records are the durable project state.

## CURRENT RELEASE — v5.17.136 (working toward v5.17.137)

### Implemented this wave

- **Prayer method provenance qualifier restored** (merged from `fix/prayer-provenance-hero`). `compactPrayerMethodLine` appends `prayer.methodSource` when the method carries a source body, in both languages, so the hero no longer states an uncertified calculation source as fact. `tests/prayer-method-line.test.js` and `tests/e2e/smoke.spec.js` are green again; the Chromium gate is fully green for the first time in this series.

- **v5.17.136 — adopted v5.17.135 and fixed its two regressions.** (1) Every `<details>` on `#/audio` collapsed on any in-panel interaction (5 open → 0, where v5.17.126 held at 5), which made the new sleep ladder one rung per panel opening — 5 re-opens per 6-tap walk across all twelve viewport × language × theme cells; `open` is now a user-owned toggle with `data-open-controlled` opt-in for state-driven disclosures. (2) The Home panel switch was dead: `resolveHomePanels()` needs the panel in the saved order and only the reorder buttons wrote it, so nine of twelve panels were unreachable. Evidence: `docs/versions/BROWSER-EVIDENCE-v5.17.136.md`.
- **v5.17.135 — Offline Essentials hierarchy:** moved the essential offline switch to the primary surface before meter/audio/cache detail after real Chromium evidence showed it could be outside the initial viewport. Added structural regression coverage. No religious corpus bytes intentionally modified.
- **v5.17.133 — evidence-driven deslopification:** restored the mobile seven-door active state to a quiet indicator after a later cascade reintroduced a filled pill; compacted the Home single-item continuation state; added regression coverage. No religious corpus bytes intentionally modified.

- **v5.17.132 — hostile-review import-boundary hardening:** local JSON backup/family-plan imports reject files above 8 MiB before FileReader parsing; imported family-plan Tasbih maps reject `__proto__`, `constructor`, and `prototype`; in-app Hadith provenance wording is neutral until exact rights are verified. No religious corpus bytes intentionally modified.
- **v5.17.131 — offline storage honesty:** Offline → Manage offline storage now exposes a user-controlled persistent-storage request where the browser supports the Storage API; the result is reported honestly in EN/AR. The UI and README explain that persistent storage is not unlimited and backups remain necessary. Issue row 22 is resolved.
- **v5.17.130 — accessibility robustness:** replaced the last-resort render-error screen's hardcoded inline typography/colours with semantic theme tokens; added explicit EN/AR language + direction, safe-area-aware spacing, and forced-colors-safe emergency controls.
- **v5.17.129 — action-affordance audit continuation:** recoverable full-surah/verse/playlist startup, lazy modal, custom Adhan import/clear, backup/plan import, LaunchQueue, offline-start, and audio download failures gained direct Retry actions.
- **v5.17.128 — action-affordance audit:** recoverable Qur’an metadata/surah lazy-load and Mushaf page-load failures gained direct Retry actions.
- **v5.17.127 — Settings/Offline polish:** palette swatches consume their palette color token; Arabic reading typefaces became specimen pickers; Offline essentials became the primary decision surface.
- No bundled Qur’an, Hadith, Azkar, or other religious corpus bytes were intentionally modified in these waves.

### Verification

- Deterministic full regression: **2,831/2,831 passed** across **281 test files**, 0 failed/skipped/cancelled.
- Focused Offline/deslopification/ledger gate: **41/41 passed**.
- JavaScript syntax: **244 JS files + sw.js**.
- Data manifest: **2,350 files, full and valid, v5.17.135**.
- Shell snapshot: **278 files, v5.17.135**.
- Agent Map: **244 JS + 27 data + 281 tests**.
- Browser/device visual certification: **NOT VERIFIED in this workspace**.
- npm lint / Prettier: **NOT VERIFIED** because the executables are unavailable in this source workspace.
- No timeout was raised, no assertion was weakened, and no failure was skipped to obtain the green regression.

## PREVIOUSLY NEEDED — FULFILLED

- Adopt v5.17.93 safely as baseline.
- Remove decorative Shahada treatment from Home.
- Reduce default Azkar reading surface to dhikr + count + Details; Details must not increment count; preserve existing tap timing.
- Repair mobile Settings heading and narrow English header.
- Repair offline shell/precache contract and deterministic Agent Map generation.
- Hadith reading-first Details with explicit Reference.
- Prayer hierarchy/calculation-method transparency.
- Daily Ayah theme moved from Home to Settings → Content.
- Hadith chapter wall, Tafsir/Search destination disclosures, and root-expanded search context.
- Mushaf Find on page, exact bookmark reopen, fullscreen Find access, and page/navigation fixes.
- Progressive disclosure hierarchy for Ramadan, Calendar fasting, Zakat, Qibla, Tasbih, Statistics, Checklist history, Offline management, and category study actions.
- Settings reciter/edition metadata wrapping, palette, and Arabic typeface fixes.
- **Toast/action-affordance audit (#7) — RESOLVED in v5.17.129:** recoverable failures now expose Retry only where a safe direct recovery exists; non-recoverable and ordinary status toasts remain actionless.

## HOSTILE REVIEW — v5.17.132 + v5.17.133 follow-through

See `HOSTILE-REVIEW-v5.17.132.md` for the independent multi-lens findings and dispositions. Two concrete import-boundary defects were fixed in this release; remaining findings are explicitly separated into product/content/platform debt or scholarly/device-blocked work.

## NOW NEEDED — CURRENT QUEUE

### A. Browser/device certification — REQUIRED

Re-run the authoritative local Chromium matrix against v5.17.136, including carried-forward v5.17.126–131 cases and the hostile-review utility surfaces. Do not claim visual certification from source-only evidence.

### B. Hostile-review follow-through

- Resolve the Hadith translation/source-rights chain before broad redistribution; do not replace it with an inferred blanket licence.
- Resolve the exact quranwbw word-by-word dataset licence/snapshot provenance.
- Replace mutable Tafsir `main` dependency with an explicitly reviewed immutable snapshot or self-hosted source.
- Expand core Adhkar/Duʿāʾ only from verified source material and scholar review; current core total is 695 (168 Adhkar + 527 Duʿāʾ).
- Review Garden, About, Kids, Install/Distribution, and Offline density with real browser evidence; do not redesign them from source inspection alone.

### C. Accessibility/robustness

Large text / 200%, reduced motion/transparency, forced colors, safe-area insets, keyboard-only, and real-device screen-reader evidence remain open.

### D. Evidence-driven deslopification and shell certification (v5.17.136+)

- **Mobile shell:** recapture all seven doors at 360×800 and 393×852 EN/AR, light/dark. Confirm the active item is a quiet indicator, labels remain readable, no clipping occurs, and no generic “More” bucket is introduced.
- **Home:** recapture 393×852 and 1440×900 EN/AR, light/dark. Confirm the single-item “Next for you” card is compact and that the Home hierarchy remains landing-page-like rather than dashboard-like.
- **Carry-forward:** rerun all previously observed Chromium problem cases before closing them, including Azkar Details/count separation, Offline Essentials visibility, player narrow layout, invalid Qur'an deep link, Hadith Reference, Prayer methodology, Mushaf Find/bookmark, and progressive disclosures.

### E. Owner product-enrichment wave

GitHub Issue #1 and the v5.17.136 owner review now drive the next product wave:

- **Practice IA:** implement the focused task-launcher model in `docs/PRACTICE-IA-NEXT-PLAN.md`. Current implementation candidate is on a feature branch; do not merge before full repository checks and Chromium E2E.
- **Tajweed course depth:** use `docs/TAJWEED-COURSE-NEXT-PLAN.md` as the content/interaction contract. Do not mass-generate religious prose; source and review it.
- **Mutashabihat:** obtain current Chromium evidence before geometry changes; separate layout defects from sourced content enrichment.
- **Calendar:** obtain current Chromium evidence before grid changes.
- **Offline:** keep Essentials above the fold; audit the remainder for density/hierarchy/polish.
- **Settings:** obtain current browser evidence for Arabic typeface specimens and palette swatches before further CSS changes.
- **Main navigation:** certify the desktop rail collapse/expand control and every parent-section destination/disclosure action from `fix/navigation-desktop-collapse-and-menu-actions`; the current mobile active underline alignment is a preserve constraint, not a redesign target.

## EXPLICIT NO-GO / PRESERVE

- No per-dhikr audio clips.
- Do not turn Home back into a dashboard.
- Do not restore decorative sacred-text banners/separators.
- Do not add arbitrary navigation buckets or a generic “More” section.
- Do not blindly redesign Mushaf/Word Study/Focus/Tajweed.
- Do not invent religious data, Arabic chapter names, narrator identities, grades, or prayer methodologies.
- Do not raise test timeouts merely to obtain green results.
- Do not weaken assertions, skip failures, or claim browser verification without browser evidence.

## OPERATING RULES

- Keep the latest app release artifact authoritative; older releases may remain as historical/recovery records but must not be mistaken for the current release.
- Keep this ledger current; fulfilled items leave the NOW queue.
- Prefer implementation and evidence over plans.
- Preserve what already works.
- Every release requires the complete source/history to be present in GitHub, a verification record, an updated ledger/checkpoint, and exact commit/release traceability before the version is considered complete.
