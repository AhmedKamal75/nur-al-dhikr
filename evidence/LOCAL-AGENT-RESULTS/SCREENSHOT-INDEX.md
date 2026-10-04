# SCREENSHOT INDEX

Gate C matrix: **192 matrix screenshots** = 12 routes x EN/AR x light/dark x 4 viewports, plus **2 BEFORE captures** for the segmented-control defect.

Naming: `<feature>__<lang-theme>__<lang>__<theme>__<width>x<height>.png` (docs/LOCAL-AGENT/TEST-EVIDENCE-PROTOCOL.md). BEFORE files prefix `BEFORE__`.

**Routes (12):** azkar-browser, focus-mode, home, mushaf, offline, prayer, quran-library, settings, stats, tajweed-course, tajweed-practice, you

**Viewports (4):** 1024x768, 1440x900, 360x800, 393x852

All captures used `reducedMotion: reduce` via the app's own shipped accessibility path, not a test-only stylesheet.

## Gate E geometry result

Page-level horizontal overflow across the 192-cell sweep: **4 cells before the segmented fix** (tajweed-course at 360x800, all four language/theme modes, 66-74px), **0 after** — confirmed by re-measuring all 40 previously-flagged cells.

Elements outside the viewport broke into three groups, none of them hand-waved:

| Group | Cells | Verdict |
|---|---:|---|
| `.segmented__btn` | 14 | **Real defect.** `scrollWidth` 413 vs `clientWidth` 334, `overflow-x: visible` → 66px page-wide horizontal scroll, 4/5 options visible, **English only** (Arabic measured 334/334). Fixed with `flex-wrap` at ≤480px, pinned. See `OPEN-FINDINGS.md` §1. |
| items inside `.chip-row--scroll` | 26 | **Benign.** A horizontal rail with `scrollWidth > clientWidth`; `documentElement.scrollWidth === 0`. Dismissed only after the probe was taught to ask whether an ancestor scrolls. |
| `.reciter-row__meta` | 12 | **Still open.** 960px wide inside a 596px row, clipped by `.view--settings { overflow-x: clip }` at **every** viewport including 1440x900. Pre-existing. **Not fixed** — the fix is a design decision. See `OPEN-FINDINGS.md` §2. |

## Before / after pairs — segmented control

| Before (pristine v5.17.77) | After (5.17.78) | Measured |
|---|---|---|
| `BEFORE__tajweed-course__en-light__en__light__360x800.png` | `tajweed-course__en-light__en__light__360x800.png` | overflowX 66 → 0, options visible 4/5 → 5/5 |
| `BEFORE__tajweed-course__en-dark__en__dark__360x800.png` | `tajweed-course__en-dark__en__dark__360x800.png` | overflowX 66 → 0, options visible 4/5 → 5/5 |

Same state, same viewport, same language/theme on both sides; the BEFORE side is served from the pristine handoff build.

## Full matrix

| File | Route | Lang | Theme | Viewport |
|---|---|---|---|---|
| **1024x768** | | | | |
| `azkar-browser__ar-dark__ar__dark__1024x768.png` | azkar-browser | ar | dark | 1024x768 |
| `azkar-browser__ar-light__ar__light__1024x768.png` | azkar-browser | ar | light | 1024x768 |
| `azkar-browser__en-dark__en__dark__1024x768.png` | azkar-browser | en | dark | 1024x768 |
| `azkar-browser__en-light__en__light__1024x768.png` | azkar-browser | en | light | 1024x768 |
| `focus-mode__ar-dark__ar__dark__1024x768.png` | focus-mode | ar | dark | 1024x768 |
| `focus-mode__ar-light__ar__light__1024x768.png` | focus-mode | ar | light | 1024x768 |
| `focus-mode__en-dark__en__dark__1024x768.png` | focus-mode | en | dark | 1024x768 |
| `focus-mode__en-light__en__light__1024x768.png` | focus-mode | en | light | 1024x768 |
| `home__ar-dark__ar__dark__1024x768.png` | home | ar | dark | 1024x768 |
| `home__ar-light__ar__light__1024x768.png` | home | ar | light | 1024x768 |
| `home__en-dark__en__dark__1024x768.png` | home | en | dark | 1024x768 |
| `home__en-light__en__light__1024x768.png` | home | en | light | 1024x768 |
| `mushaf__ar-dark__ar__dark__1024x768.png` | mushaf | ar | dark | 1024x768 |
| `mushaf__ar-light__ar__light__1024x768.png` | mushaf | ar | light | 1024x768 |
| `mushaf__en-dark__en__dark__1024x768.png` | mushaf | en | dark | 1024x768 |
| `mushaf__en-light__en__light__1024x768.png` | mushaf | en | light | 1024x768 |
| `offline__ar-dark__ar__dark__1024x768.png` | offline | ar | dark | 1024x768 |
| `offline__ar-light__ar__light__1024x768.png` | offline | ar | light | 1024x768 |
| `offline__en-dark__en__dark__1024x768.png` | offline | en | dark | 1024x768 |
| `offline__en-light__en__light__1024x768.png` | offline | en | light | 1024x768 |
| `prayer__ar-dark__ar__dark__1024x768.png` | prayer | ar | dark | 1024x768 |
| `prayer__ar-light__ar__light__1024x768.png` | prayer | ar | light | 1024x768 |
| `prayer__en-dark__en__dark__1024x768.png` | prayer | en | dark | 1024x768 |
| `prayer__en-light__en__light__1024x768.png` | prayer | en | light | 1024x768 |
| `quran-library__ar-dark__ar__dark__1024x768.png` | quran-library | ar | dark | 1024x768 |
| `quran-library__ar-light__ar__light__1024x768.png` | quran-library | ar | light | 1024x768 |
| `quran-library__en-dark__en__dark__1024x768.png` | quran-library | en | dark | 1024x768 |
| `quran-library__en-light__en__light__1024x768.png` | quran-library | en | light | 1024x768 |
| `settings__ar-dark__ar__dark__1024x768.png` | settings | ar | dark | 1024x768 |
| `settings__ar-light__ar__light__1024x768.png` | settings | ar | light | 1024x768 |
| `settings__en-dark__en__dark__1024x768.png` | settings | en | dark | 1024x768 |
| `settings__en-light__en__light__1024x768.png` | settings | en | light | 1024x768 |
| `stats__ar-dark__ar__dark__1024x768.png` | stats | ar | dark | 1024x768 |
| `stats__ar-light__ar__light__1024x768.png` | stats | ar | light | 1024x768 |
| `stats__en-dark__en__dark__1024x768.png` | stats | en | dark | 1024x768 |
| `stats__en-light__en__light__1024x768.png` | stats | en | light | 1024x768 |
| `tajweed-course__ar-dark__ar__dark__1024x768.png` | tajweed-course | ar | dark | 1024x768 |
| `tajweed-course__ar-light__ar__light__1024x768.png` | tajweed-course | ar | light | 1024x768 |
| `tajweed-course__en-dark__en__dark__1024x768.png` | tajweed-course | en | dark | 1024x768 |
| `tajweed-course__en-light__en__light__1024x768.png` | tajweed-course | en | light | 1024x768 |
| `tajweed-practice__ar-dark__ar__dark__1024x768.png` | tajweed-practice | ar | dark | 1024x768 |
| `tajweed-practice__ar-light__ar__light__1024x768.png` | tajweed-practice | ar | light | 1024x768 |
| `tajweed-practice__en-dark__en__dark__1024x768.png` | tajweed-practice | en | dark | 1024x768 |
| `tajweed-practice__en-light__en__light__1024x768.png` | tajweed-practice | en | light | 1024x768 |
| `you__ar-dark__ar__dark__1024x768.png` | you | ar | dark | 1024x768 |
| `you__ar-light__ar__light__1024x768.png` | you | ar | light | 1024x768 |
| `you__en-dark__en__dark__1024x768.png` | you | en | dark | 1024x768 |
| `you__en-light__en__light__1024x768.png` | you | en | light | 1024x768 |
| **1440x900** | | | | |
| `azkar-browser__ar-dark__ar__dark__1440x900.png` | azkar-browser | ar | dark | 1440x900 |
| `azkar-browser__ar-light__ar__light__1440x900.png` | azkar-browser | ar | light | 1440x900 |
| `azkar-browser__en-dark__en__dark__1440x900.png` | azkar-browser | en | dark | 1440x900 |
| `azkar-browser__en-light__en__light__1440x900.png` | azkar-browser | en | light | 1440x900 |
| `focus-mode__ar-dark__ar__dark__1440x900.png` | focus-mode | ar | dark | 1440x900 |
| `focus-mode__ar-light__ar__light__1440x900.png` | focus-mode | ar | light | 1440x900 |
| `focus-mode__en-dark__en__dark__1440x900.png` | focus-mode | en | dark | 1440x900 |
| `focus-mode__en-light__en__light__1440x900.png` | focus-mode | en | light | 1440x900 |
| `home__ar-dark__ar__dark__1440x900.png` | home | ar | dark | 1440x900 |
| `home__ar-light__ar__light__1440x900.png` | home | ar | light | 1440x900 |
| `home__en-dark__en__dark__1440x900.png` | home | en | dark | 1440x900 |
| `home__en-light__en__light__1440x900.png` | home | en | light | 1440x900 |
| `mushaf__ar-dark__ar__dark__1440x900.png` | mushaf | ar | dark | 1440x900 |
| `mushaf__ar-light__ar__light__1440x900.png` | mushaf | ar | light | 1440x900 |
| `mushaf__en-dark__en__dark__1440x900.png` | mushaf | en | dark | 1440x900 |
| `mushaf__en-light__en__light__1440x900.png` | mushaf | en | light | 1440x900 |
| `offline__ar-dark__ar__dark__1440x900.png` | offline | ar | dark | 1440x900 |
| `offline__ar-light__ar__light__1440x900.png` | offline | ar | light | 1440x900 |
| `offline__en-dark__en__dark__1440x900.png` | offline | en | dark | 1440x900 |
| `offline__en-light__en__light__1440x900.png` | offline | en | light | 1440x900 |
| `prayer__ar-dark__ar__dark__1440x900.png` | prayer | ar | dark | 1440x900 |
| `prayer__ar-light__ar__light__1440x900.png` | prayer | ar | light | 1440x900 |
| `prayer__en-dark__en__dark__1440x900.png` | prayer | en | dark | 1440x900 |
| `prayer__en-light__en__light__1440x900.png` | prayer | en | light | 1440x900 |
| `quran-library__ar-dark__ar__dark__1440x900.png` | quran-library | ar | dark | 1440x900 |
| `quran-library__ar-light__ar__light__1440x900.png` | quran-library | ar | light | 1440x900 |
| `quran-library__en-dark__en__dark__1440x900.png` | quran-library | en | dark | 1440x900 |
| `quran-library__en-light__en__light__1440x900.png` | quran-library | en | light | 1440x900 |
| `settings__ar-dark__ar__dark__1440x900.png` | settings | ar | dark | 1440x900 |
| `settings__ar-light__ar__light__1440x900.png` | settings | ar | light | 1440x900 |
| `settings__en-dark__en__dark__1440x900.png` | settings | en | dark | 1440x900 |
| `settings__en-light__en__light__1440x900.png` | settings | en | light | 1440x900 |
| `stats__ar-dark__ar__dark__1440x900.png` | stats | ar | dark | 1440x900 |
| `stats__ar-light__ar__light__1440x900.png` | stats | ar | light | 1440x900 |
| `stats__en-dark__en__dark__1440x900.png` | stats | en | dark | 1440x900 |
| `stats__en-light__en__light__1440x900.png` | stats | en | light | 1440x900 |
| `tajweed-course__ar-dark__ar__dark__1440x900.png` | tajweed-course | ar | dark | 1440x900 |
| `tajweed-course__ar-light__ar__light__1440x900.png` | tajweed-course | ar | light | 1440x900 |
| `tajweed-course__en-dark__en__dark__1440x900.png` | tajweed-course | en | dark | 1440x900 |
| `tajweed-course__en-light__en__light__1440x900.png` | tajweed-course | en | light | 1440x900 |
| `tajweed-practice__ar-dark__ar__dark__1440x900.png` | tajweed-practice | ar | dark | 1440x900 |
| `tajweed-practice__ar-light__ar__light__1440x900.png` | tajweed-practice | ar | light | 1440x900 |
| `tajweed-practice__en-dark__en__dark__1440x900.png` | tajweed-practice | en | dark | 1440x900 |
| `tajweed-practice__en-light__en__light__1440x900.png` | tajweed-practice | en | light | 1440x900 |
| `you__ar-dark__ar__dark__1440x900.png` | you | ar | dark | 1440x900 |
| `you__ar-light__ar__light__1440x900.png` | you | ar | light | 1440x900 |
| `you__en-dark__en__dark__1440x900.png` | you | en | dark | 1440x900 |
| `you__en-light__en__light__1440x900.png` | you | en | light | 1440x900 |
| **360x800** | | | | |
| `azkar-browser__ar-dark__ar__dark__360x800.png` | azkar-browser | ar | dark | 360x800 |
| `azkar-browser__ar-light__ar__light__360x800.png` | azkar-browser | ar | light | 360x800 |
| `azkar-browser__en-dark__en__dark__360x800.png` | azkar-browser | en | dark | 360x800 |
| `azkar-browser__en-light__en__light__360x800.png` | azkar-browser | en | light | 360x800 |
| `focus-mode__ar-dark__ar__dark__360x800.png` | focus-mode | ar | dark | 360x800 |
| `focus-mode__ar-light__ar__light__360x800.png` | focus-mode | ar | light | 360x800 |
| `focus-mode__en-dark__en__dark__360x800.png` | focus-mode | en | dark | 360x800 |
| `focus-mode__en-light__en__light__360x800.png` | focus-mode | en | light | 360x800 |
| `home__ar-dark__ar__dark__360x800.png` | home | ar | dark | 360x800 |
| `home__ar-light__ar__light__360x800.png` | home | ar | light | 360x800 |
| `home__en-dark__en__dark__360x800.png` | home | en | dark | 360x800 |
| `home__en-light__en__light__360x800.png` | home | en | light | 360x800 |
| `mushaf__ar-dark__ar__dark__360x800.png` | mushaf | ar | dark | 360x800 |
| `mushaf__ar-light__ar__light__360x800.png` | mushaf | ar | light | 360x800 |
| `mushaf__en-dark__en__dark__360x800.png` | mushaf | en | dark | 360x800 |
| `mushaf__en-light__en__light__360x800.png` | mushaf | en | light | 360x800 |
| `offline__ar-dark__ar__dark__360x800.png` | offline | ar | dark | 360x800 |
| `offline__ar-light__ar__light__360x800.png` | offline | ar | light | 360x800 |
| `offline__en-dark__en__dark__360x800.png` | offline | en | dark | 360x800 |
| `offline__en-light__en__light__360x800.png` | offline | en | light | 360x800 |
| `prayer__ar-dark__ar__dark__360x800.png` | prayer | ar | dark | 360x800 |
| `prayer__ar-light__ar__light__360x800.png` | prayer | ar | light | 360x800 |
| `prayer__en-dark__en__dark__360x800.png` | prayer | en | dark | 360x800 |
| `prayer__en-light__en__light__360x800.png` | prayer | en | light | 360x800 |
| `quran-library__ar-dark__ar__dark__360x800.png` | quran-library | ar | dark | 360x800 |
| `quran-library__ar-light__ar__light__360x800.png` | quran-library | ar | light | 360x800 |
| `quran-library__en-dark__en__dark__360x800.png` | quran-library | en | dark | 360x800 |
| `quran-library__en-light__en__light__360x800.png` | quran-library | en | light | 360x800 |
| `settings__ar-dark__ar__dark__360x800.png` | settings | ar | dark | 360x800 |
| `settings__ar-light__ar__light__360x800.png` | settings | ar | light | 360x800 |
| `settings__en-dark__en__dark__360x800.png` | settings | en | dark | 360x800 |
| `settings__en-light__en__light__360x800.png` | settings | en | light | 360x800 |
| `stats__ar-dark__ar__dark__360x800.png` | stats | ar | dark | 360x800 |
| `stats__ar-light__ar__light__360x800.png` | stats | ar | light | 360x800 |
| `stats__en-dark__en__dark__360x800.png` | stats | en | dark | 360x800 |
| `stats__en-light__en__light__360x800.png` | stats | en | light | 360x800 |
| `tajweed-course__ar-dark__ar__dark__360x800.png` | tajweed-course | ar | dark | 360x800 |
| `tajweed-course__ar-light__ar__light__360x800.png` | tajweed-course | ar | light | 360x800 |
| `tajweed-course__en-dark__en__dark__360x800.png` | tajweed-course | en | dark | 360x800 |
| `tajweed-course__en-light__en__light__360x800.png` | tajweed-course | en | light | 360x800 |
| `tajweed-practice__ar-dark__ar__dark__360x800.png` | tajweed-practice | ar | dark | 360x800 |
| `tajweed-practice__ar-light__ar__light__360x800.png` | tajweed-practice | ar | light | 360x800 |
| `tajweed-practice__en-dark__en__dark__360x800.png` | tajweed-practice | en | dark | 360x800 |
| `tajweed-practice__en-light__en__light__360x800.png` | tajweed-practice | en | light | 360x800 |
| `you__ar-dark__ar__dark__360x800.png` | you | ar | dark | 360x800 |
| `you__ar-light__ar__light__360x800.png` | you | ar | light | 360x800 |
| `you__en-dark__en__dark__360x800.png` | you | en | dark | 360x800 |
| `you__en-light__en__light__360x800.png` | you | en | light | 360x800 |
| **393x852** | | | | |
| `azkar-browser__ar-dark__ar__dark__393x852.png` | azkar-browser | ar | dark | 393x852 |
| `azkar-browser__ar-light__ar__light__393x852.png` | azkar-browser | ar | light | 393x852 |
| `azkar-browser__en-dark__en__dark__393x852.png` | azkar-browser | en | dark | 393x852 |
| `azkar-browser__en-light__en__light__393x852.png` | azkar-browser | en | light | 393x852 |
| `focus-mode__ar-dark__ar__dark__393x852.png` | focus-mode | ar | dark | 393x852 |
| `focus-mode__ar-light__ar__light__393x852.png` | focus-mode | ar | light | 393x852 |
| `focus-mode__en-dark__en__dark__393x852.png` | focus-mode | en | dark | 393x852 |
| `focus-mode__en-light__en__light__393x852.png` | focus-mode | en | light | 393x852 |
| `home__ar-dark__ar__dark__393x852.png` | home | ar | dark | 393x852 |
| `home__ar-light__ar__light__393x852.png` | home | ar | light | 393x852 |
| `home__en-dark__en__dark__393x852.png` | home | en | dark | 393x852 |
| `home__en-light__en__light__393x852.png` | home | en | light | 393x852 |
| `mushaf__ar-dark__ar__dark__393x852.png` | mushaf | ar | dark | 393x852 |
| `mushaf__ar-light__ar__light__393x852.png` | mushaf | ar | light | 393x852 |
| `mushaf__en-dark__en__dark__393x852.png` | mushaf | en | dark | 393x852 |
| `mushaf__en-light__en__light__393x852.png` | mushaf | en | light | 393x852 |
| `offline__ar-dark__ar__dark__393x852.png` | offline | ar | dark | 393x852 |
| `offline__ar-light__ar__light__393x852.png` | offline | ar | light | 393x852 |
| `offline__en-dark__en__dark__393x852.png` | offline | en | dark | 393x852 |
| `offline__en-light__en__light__393x852.png` | offline | en | light | 393x852 |
| `prayer__ar-dark__ar__dark__393x852.png` | prayer | ar | dark | 393x852 |
| `prayer__ar-light__ar__light__393x852.png` | prayer | ar | light | 393x852 |
| `prayer__en-dark__en__dark__393x852.png` | prayer | en | dark | 393x852 |
| `prayer__en-light__en__light__393x852.png` | prayer | en | light | 393x852 |
| `quran-library__ar-dark__ar__dark__393x852.png` | quran-library | ar | dark | 393x852 |
| `quran-library__ar-light__ar__light__393x852.png` | quran-library | ar | light | 393x852 |
| `quran-library__en-dark__en__dark__393x852.png` | quran-library | en | dark | 393x852 |
| `quran-library__en-light__en__light__393x852.png` | quran-library | en | light | 393x852 |
| `settings__ar-dark__ar__dark__393x852.png` | settings | ar | dark | 393x852 |
| `settings__ar-light__ar__light__393x852.png` | settings | ar | light | 393x852 |
| `settings__en-dark__en__dark__393x852.png` | settings | en | dark | 393x852 |
| `settings__en-light__en__light__393x852.png` | settings | en | light | 393x852 |
| `stats__ar-dark__ar__dark__393x852.png` | stats | ar | dark | 393x852 |
| `stats__ar-light__ar__light__393x852.png` | stats | ar | light | 393x852 |
| `stats__en-dark__en__dark__393x852.png` | stats | en | dark | 393x852 |
| `stats__en-light__en__light__393x852.png` | stats | en | light | 393x852 |
| `tajweed-course__ar-dark__ar__dark__393x852.png` | tajweed-course | ar | dark | 393x852 |
| `tajweed-course__ar-light__ar__light__393x852.png` | tajweed-course | ar | light | 393x852 |
| `tajweed-course__en-dark__en__dark__393x852.png` | tajweed-course | en | dark | 393x852 |
| `tajweed-course__en-light__en__light__393x852.png` | tajweed-course | en | light | 393x852 |
| `tajweed-practice__ar-dark__ar__dark__393x852.png` | tajweed-practice | ar | dark | 393x852 |
| `tajweed-practice__ar-light__ar__light__393x852.png` | tajweed-practice | ar | light | 393x852 |
| `tajweed-practice__en-dark__en__dark__393x852.png` | tajweed-practice | en | dark | 393x852 |
| `tajweed-practice__en-light__en__light__393x852.png` | tajweed-practice | en | light | 393x852 |
| `you__ar-dark__ar__dark__393x852.png` | you | ar | dark | 393x852 |
| `you__ar-light__ar__light__393x852.png` | you | ar | light | 393x852 |
| `you__en-dark__en__dark__393x852.png` | you | en | dark | 393x852 |
| `you__en-light__en__light__393x852.png` | you | en | light | 393x852 |
