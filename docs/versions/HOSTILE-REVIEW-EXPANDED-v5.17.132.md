# Nūr al-Dhikr — Expanded Hostile Review Addendum v5.17.132

Date: 2026-10-07

## Status

This is a **review addendum**, not a release. v5.17.132 remains the completed local source line and is still awaiting canonical Global ZIP persistence. No source version was advanced during this review.

## Evidence basis

- v5.17.132 source tree and its existing hostile-review report.
- v5.17.126 owner-machine Chromium evidence package: 32 Home captures across 4 viewports × EN/AR × light/dark, plus measured DOM geometry and E2E/a11y logs. This evidence is **historical** and is not treated as fresh v5.17.132 browser certification.
- Current source-level provenance/licensing documentation (`data/SOURCES.md`, `CREDITS.md`, `docs/OPEN-ISSUES.md`).
- Current upstream source/repository documentation reviewed on 2026-10-07.
- Accessibility/PWA standards and established UX heuristics.

## Review lenses

1. Visual art direction
2. Usability/task completion
3. Interaction/state/feedback
4. Information architecture
5. Responsive/mobile geometry
6. Arabic/RTL/bilingual parity
7. Accessibility
8. Performance/smoothness
9. Error handling/resilience
10. Offline/PWA lifecycle
11. Religious/content integrity
12. Feature completeness/enrichment
13. Privacy/security
14. Maintainability/technical quality
15. Competitive/product quality
16. New-user perspective
17. Power-user perspective
18. Hostile edge cases
19. Anti-slop / visual restraint
20. Meta-review: defect vs preference vs evidence gap

## Findings

### HRX-132-01 — Tafsir `main` branch remains a release-reproducibility defect

**Severity:** P1
**Status:** OPEN

The app constructs remote Tafsir URLs from `raw.githubusercontent.com/spa5k/tafsir_api/main/...`. The upstream repository itself says production consumers should pin an exact release tag or commit and strongly recommends self-hosting because CDN/cache/outage behavior is outside the application's control. This is stronger evidence than a generic "GitHub might change" objection.

**Required disposition:** pin an exact reviewed source revision or self-host an exact reviewed snapshot, recording the snapshot checksum/provenance. Do not silently switch sources.

### HRX-132-02 — QuranWBW word-level dataset rights remain unverified at the exact snapshot level

**Severity:** P1
**Status:** OPEN

The bundled app documentation identifies quranwbw.com / qazasaz/quranwbw as the source but does not establish an explicit license for the exact redistributed dataset snapshot. The repository's visible file list contains the application files and README, but no explicit dataset license is established by the README; its credits identify quran.com, Tanzil, seventysixnine.com, EveryAyah and QuranCentral as upstream resources. Therefore a code-repository license, where present elsewhere, cannot be treated as proof that all underlying source data is redistributable.

**Required disposition:** record exact source snapshot, provenance chain, applicable license/permission, and attribution text. Until then, keep the issue OPEN.

### HRX-132-03 — Hadith translation/data rights require source-chain clarification before broad redistribution

**Severity:** P1
**Status:** OPEN

The `fawazahmed0/hadith-api` repository publishes an Unlicense dedication for the repository, but its own current issue tracker has an OPEN issue explicitly asking for the source and license of the Arabic texts. The repository also aggregates material from multiple references and editions. This means "repo is Unlicense" is not enough to establish the rights chain for every bundled translation/source record.

**Required disposition:** identify the exact edition/source for every redistributed language layer and record its permission/license or public-domain basis. Avoid a blanket CC0 claim until verified.

### HRX-132-04 — Mobile seven-door dock is visually too compressed in the supplied Chromium evidence

**Severity:** P2 candidate
**Status:** RECERTIFY

The v5.17.126 393×852 Home screenshot shows seven equal-width mobile navigation items. The labels at the center of the dock are visually crowded; the "Ahadeeth" / "Prayer" adjacency is especially tight. The CSS confirms seven `flex: 1 1 0` items with a narrow font budget and a `nowrap` label rule.

This is **not yet declared a current 132 defect**, because the only supplied visual evidence is from 126. It is a high-priority recertification target because the layout has little spare width and the product deliberately keeps seven top-level doors visible.

**Required disposition:** fresh 360×800 and 393×852 Chromium evidence in EN/AR, including touch-target geometry and actual label collision/legibility.

### HRX-132-05 — Desktop `Next for you` single-item card has excessive horizontal dead space

**Severity:** P2 candidate
**Status:** RECERTIFY

The supplied 1440×900 Home screenshot shows a very wide `Next for you` card containing essentially one continuation row, leaving most of the card width visually unused. This is not the old "dead desktop canvas" failure; the Home column itself is correctly sized. The issue is **component density**: a single action is being stretched to a large full-width container.

**Required disposition:** test alternative compact treatment (row/compact panel) against the established anti-dashboard rules. Do not fix by adding decorative content.

### HRX-132-06 — Home repeats product identity on desktop/mobile

**Severity:** P3
**Status:** PRODUCT/POLISH

The supplied Home evidence shows the product name in the persistent top bar and again as the Home hero heading. The repetition is not harmful, but it adds a small amount of redundant chrome and reduces the distinction between application identity and page identity.

**Required disposition:** leave alone unless a broader identity/header review finds a clearer hierarchy improvement. Not worth isolated version churn.

### HRX-132-07 — Audio remains an externally hosted capability, so "offline" semantics need tier clarity

**Severity:** P2
**Status:** OPEN PRODUCT CLARITY

The source contains remote Quran audio URLs (Islamic Network / EveryAyah) and an explicit optional audio download path. That is reasonable, but the offline contract should continue to distinguish **offline text/application shell** from **optional offline audio availability** rather than letting a user infer that every recitation asset is permanently bundled.

**Required disposition:** verify all audio surfaces use one consistent "available offline / needs download" state.

### HRX-132-08 — Tafsir continuity and provenance are two separate problems and should not be merged

**Severity:** P1/P2
**Status:** OPEN

The review finds both (a) runtime immutability/reproducibility risk and (b) legal/source provenance risk. Pinning a commit solves reproducibility; it does **not automatically establish redistribution permission** for every tafsir edition. Conversely, documenting rights does not solve runtime mutability.

**Required disposition:** track these as two separate acceptance criteria: `snapshot identity` and `redistribution permission`.

### HRX-132-09 — Accessibility certification has an evidence gap, not a known systemic failure

**Severity:** P1 evidence gate
**Status:** OPEN

The owner-machine v5.17.126 a11y isolation run passed 67 tests, while the broader Chromium suite retained unresolved interaction failures. v5.17.132 has not received a fresh live-browser pass in this workspace. Therefore the correct conclusion is neither "accessible" nor "inaccessible"; it is **not freshly certified**.

W3C APG emphasizes visible/predictable focus and complete keyboard operation for custom widgets, and disclosure widgets should expose `aria-expanded` and support Enter/Space activation.

**Required disposition:** run the real browser/device matrix before changing accessibility architecture.

### HRX-132-10 — Unused `studyContextHTML` import in Tajweed course is maintainability debt, not proof of a broken feature

**Severity:** P3
**Status:** OPEN

The current source still imports `studyContextHTML` in `tajweedCourseView.js` without using it, while the helper is used elsewhere. The old hostile report correctly warned against assuming the unused symbol meant the feature was absent; source inspection now confirms that it is a code-hygiene issue, not a demonstrated product failure.

**Required disposition:** remove the unused import or wire the intended feature only if the current product contract actually requires it. Do not infer missing functionality from the warning alone.

### HRX-132-11 — The v5.17.126 browser failures remain valuable regression targets even where source fixes exist

**Severity:** P1 evidence gate
**Status:** OPEN

The historical browser packet recorded real failures around Azkar Details/count separation, Offline Essentials viewport access, onboarding state, sadaqah editor behavior, city/method disclosure, and several depth/utility interaction flows. Some later waves may have changed or intentionally retired those contracts. Because those were observed on a real Chromium run, they should be re-exercised on current source rather than marked resolved solely from source tests.

**Required disposition:** rerun the owner-machine Chromium matrix for the carried-forward cases and compare against explicit current contracts.

### HRX-132-12 — Core Adhkar/Duʿāʾ depth is a real product gap but not a safe autonomous content-generation task

**Severity:** P1/P2
**Status:** BLOCKED: SCHOLAR / SOURCED CONTENT

Current core totals remain materially below the project's long-term ambition. This gap is real. The hostile review rejects solving it with synthetic filler because the app's value proposition depends on source fidelity and explicit provenance.

**Required disposition:** build a sourced expansion plan with per-item references, grade discipline, exact Arabic preservation, and human scholarly review before bulk addition.

### HRX-132-13 — Competitive baseline has moved beyond simple "more features"

**Severity:** P2 strategic
**Status:** OPEN

Current public Azkar.me material advertises 250+ sourced adhkar, 25+ categories, complete Uthmani Qur'an, Tafsir al-Muyassar, 28 reciters, 3,500+ hadith across 450+ topics, source attribution, explanations and an evolving Garden/quiz/reminder ecosystem. Quran.com is also expanding Study Mode with word-level detail, Tafsir, related verses, bookmarks, collections, and Hadith integration.

The product implication is not "copy competitors." Nūr al-Dhikr should differentiate through its offline-first/no-account/no-ad philosophy, restrained design and deep study surfaces while closing **trust/provenance and core-content depth**, which are currently more strategically important than adding another superficial feature.

## Deliberately NOT elevated to defects

- No generic "More" navigation bucket.
- No Home dashboard expansion.
- No decorative sacred-text banners.
- No per-dhikr audio corpus without licensed sources.
- No machine-generated Hadith grades/narrators or Tafsir content.
- No Mushaf/Focus/Tajweed redesign merely to create version churn.
- No current 132 browser failure is declared solely from 126 screenshots.

## Recommended next queue

### Gate 0 — Persistence

Persist and hash-verify the exact v5.17.132 source ZIP before changing source version.

### Gate 1 — Browser certification

Owner-machine Chromium matrix for the full carried-forward set + v5.17.132 import/security/storage changes + Home/mobile dock.

### Gate 2 — Provenance

Resolve or formally quarantine exact rights/snapshot questions for Hadith, QuranWBW, and Tafsir.

### Gate 3 — Product depth

Source-first Adhkar/Duʿāʾ expansion and Hadith depth; only after provenance is secure.

### Gate 4 — Accessibility/device

Real 360/393 browser, keyboard, forced-colors, large-text, reduced-transparency, safe-area, and iOS/Android evidence.

## Review conclusion

The app is no longer suffering mainly from "make the cards prettier" problems. The remaining high-value risks are **trustworthiness of source material, reproducibility of remote scholarly content, real-device/browser evidence, core content depth, and a small number of measurable density/interaction questions**. Those are the areas that should drive the next major waves.
