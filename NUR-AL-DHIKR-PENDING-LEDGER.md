# Nūr al-Dhikr — Persistent Request Ledger

**Updated:** 2026-10-06
**Current app:** v5.17.125
**Current phase:** autonomous deslopification → remaining utility/accessibility review → action-affordance audit → browser/device certification

## CURRENT RELEASE — v5.17.125

### Implemented this autonomous wave

- **v5.17.125 — Tajweed Practice retry affordance:** when a round cannot load any questions, the failure toast is assertive and offers a direct **Retry / إعادة المحاولة** action using the exact same rule and answer mode.
- Ordinary status toasts remain transient and actionless; the toast audit is deliberately targeting only failures/advice with an obvious recovery action.
- Added bilingual regression coverage for the retry action and locale labels.
- **v5.17.124 — Open-issues ledger reconciliation:** re-verified the durable issue ledger against source/test evidence, closed resolved #19 and #48, and fixed the document's own row-count arithmetic.
- **v5.17.123 — Reduced-motion press feedback:** removed active-press scaling under both the in-app Reduce Motion setting and OS `prefers-reduced-motion`.
- **v5.17.122 — Settings Setup hierarchy:** renamed the misleading Setup & About shelf and moved optional first-run setup behind one native disclosure.
- **v5.17.121 — Settings Compare C hierarchy:** replaced a fake nested disclosure summary with a non-interactive subsection heading.
- No bundled Qur'an, Hadith, Azkar, or other religious corpus bytes were intentionally modified.

### Verification

- Focused Tajweed retry regression: **16/16 passed** (including existing Tajweed practice contracts).
- Full Node regression: **2,800/2,800 passed** across **272 test files** for v5.17.125, split into 16 deterministic batches to stay within the execution ceiling; 0 failed, 0 skipped.
- Release markers regenerated at v5.17.125; shell snapshot **277 files**; data manifest **2,350 files**; Agent Map **244 JS + 27 data + 272 tests**.
- No test timeout values were increased; no assertions were weakened or skipped.
- Browser/device visual certification: **NOT VERIFIED** in this workspace.
- npm lint / Prettier: **NOT VERIFIED** where required binaries are unavailable.

## PREVIOUSLY NEEDED — FULFILLED / REMOVE FROM CURRENT QUEUE

- Adopt v5.17.93 safely as baseline — fulfilled.
- Remove decorative Shahada banner from Home — implemented.
- Reduce default Azkar reading surface to dhikr + count + Details — implemented.
- Prevent Details from incrementing Azkar count — implemented and tested.
- Preserve existing Azkar tap timing/behavior — preserved.
- Fix mobile Settings heading collapse — implemented.
- Fix narrow English header — implemented.
- Fix invalid Qur'an route loading forever — implemented.
- Fix audio metadata clipping at narrow width — implemented.
- Repair offline shell/precache contract — implemented and verified.
- Repair Agent Map generation/determinism — implemented and verified.
- Hadith reading-first surface with Details disclosure — implemented.
- Add Hadith Reference inside Details — implemented and tested.
- Prayer surface hierarchy/calculation transparency — implemented and tested.
- Move Daily Ayah theme selection from Home to Settings → Content — implemented EN + AR.
- Hadith chapter wall → progressive Contents disclosure — implemented.
- Tafsir search → exact Mushaf page + ayah continuation — implemented.
- Root-expanded Qur'an search hits disclose related root — implemented.
- Search Mushaf destination labels made explicit — implemented.
- Mushaf Find on this page — implemented and tested.
- Mushaf location/Jump redundancy — fixed.
- Bookmark reopen preserves exact ayah target, including spread mode — fixed.
- Global Search distinguishes unavailable/loading corpora from genuine zero results — fixed.
- Ramadan secondary disclosures — implemented.
- Calendar fasting progressive disclosure — implemented.
- Zakat progressive disclosure — implemented.
- Qibla hierarchy — implemented.
- Tasbih counting-surface cleanup — implemented.
- Statistics hierarchy — implemented.
- Checklist history disclosure — implemented.
- Settings reciter metadata wrapping — implemented.
- Offline management disclosure — implemented.
- Category study-action hierarchy — implemented.

## NOW NEEDED — CURRENT QUEUE

### A. Browser/device certification — REQUIRED

On the authoritative local machine, verify with real browser/device evidence:

- Azkar Details versus tap/count separation; preserve existing timing exactly.
- Home composition and complete absence of decorative Shahada treatment.
- Main-menu disclosure actually opening and closing.
- Settings at 360×800 and 393×852 in EN + AR, especially long reciter/edition metadata.
- Player narrow layout / no horizontal clipping at 360/393/1024/1440.
- Invalid Qur'an deep-link state (`id=99999` style cases).
- Hadith Details + Reference in EN + AR.
- Prayer methodology disclosure in EN + AR.
- Light/dark and RTL behavior for affected surfaces.
- Offline boot/install behavior, especially service-worker shell and Manage Offline disclosure.
- Mushaf Find on this page in single-page and spread modes, including exact ayah navigation.
- Fullscreen Mushaf Find access.
- Bookmark reopen → exact saved ayah target, including spread mode.
- Statistics/Checklist/Category progressive disclosures open/close correctly in EN + AR.

Do not reuse the old v5.17.93 screenshot package as certification; several supposed post-interaction states were identical screenshots.

### B. Product/deslopification next waves

1. **Action-affordance audit (#7):** continue through error/advice toasts only where the user has a direct, safe recovery action; leave ordinary status toasts (Saved/Copied/Done) actionless. v5.17.125 fixed Tajweed Practice load failure with Retry.
2. **Remaining utility surfaces:** review Garden, Install/Distribution, About, Kids and any remaining utility interiors only where source/UI evidence shows competing primary tasks or card/panel slop.
3. **Settings/player robustness:** verify real narrow playback and long metadata states; preserve the source hardening already shipped.
4. **Accessibility/robustness:** large text, reduced motion/transparency, forced colors, safe-area insets, keyboard-only reading, and non-Chromium verification.
5. **Mushaf/search preservation pass:** only reopen these surfaces when fresh evidence identifies a real defect. Do not redesign strong Mushaf/Focus/Tajweed grammar for version churn.

### C. Explicit NO-GO / preserve

- No per-dhikr audio clips; user explicitly rejected this direction.
- Do not turn Home back into a dashboard.
- Do not restore decorative sacred-text banners/separators.
- Do not add arbitrary navigation buckets or a generic “More” section.
- Do not blindly redesign Mushaf/Word Study; preserve strong typography and hierarchy where they work.
- Do not invent religious data, Arabic chapter names, narrator identities, grades, or prayer methodologies.
- Do not raise test timeouts just to make tests green.
- Do not weaken assertions or skip failures.
- Do not claim browser verification without actual browser evidence.

## OPERATING RULES

- Keep only the latest app build/artifacts in the active artifact area.
- Keep this ledger current; fulfilled items leave the NOW queue.
- Persistent project context is maintained in model memory; this file is the durable local ledger.
- Prefer implementation and evidence over plans.
- Preserve what already works.
- Every new release supersedes and removes the prior active release artifact.
- Continue autonomously until a genuine context/runtime checkpoint is needed; finish the current wave and leave a clean latest-release checkpoint before that point.
