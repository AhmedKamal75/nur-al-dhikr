# Nūr al-Dhikr — hostile Chromium re-run after v5.17.125 findings

## Purpose

This is a **verification-only** pass against the v5.17.126 source. Do not fix source, do not edit tests, do not raise timeouts, do not add retries, and do not change assertions.

The v5.17.125 browser evidence found a real Home composition regression plus a few source defects that source-only gates missed. v5.17.126 is the remediation checkpoint.

## 1. Mandatory exact checks

### Home — highest priority

Capture all of:

- EN/light 360×800
- EN/light 393×852
- EN/light 1024×768
- EN/light 1440×900
- AR/dark 360×800
- AR/dark 393×852
- AR/dark 1024×768
- AR/dark 1440×900

For each, assert visually and programmatically:

1. identity/brand line is FIRST meaningful content after shell;
2. Today/prayer context follows identity;
3. Start Here follows Today;
4. Next for you follows Start Here;
5. Today’s Progress is inside the Today section, not under Next;
6. no decorative Shahada banner/separator exists;
7. no onboarding wizard appears on fresh Home;
8. desktop Home uses the main content rail rather than a half-width dashboard track;
9. 1024 and 1440 intentionally use available width while retaining a readable measure;
10. no giant dead right-hand canvas caused by Home grid rules;
11. Arabic and English order are equally intentional;
12. compare screenshot geometry to the v5.17.125 evidence.

### Qur’an invalid route

- `#/quran?id=99999`
- assert an accessible `<h1>`/heading exists
- assert an explicit not-found state exists
- assert no loading skeleton remains after a short wait

### Audio / reciter / mushaf picker

At 360×800, 393×852, English and Arabic:

- open reciter picker
- capture a row with the whole-surah badge
- prove the badge/name wraps instead of clipping
- open the Mushaf page-play picker and capture the longest displayed surah label
- assert no horizontal overflow and no clipped primary action

### v5.17.93→125 reading/study changes

Capture real changed states, not attempted clicks:

- Tafsir opened from an ayah with visible ayah context
- Word Study opened from Mushaf
- Roots/Look-alike/Tajweed continuity from the study context
- Hadith Details + Reference
- Azkar Details open with count unchanged before/after
- Prayer methodology disclosure
- Search root-expanded result + exact Mushaf continuity
- Mushaf Find on this page in single-page mode and spread mode
- Bookmark reopen to exact ayah

### Other changed utilities

- Statistics disclosure
- Checklist history disclosure
- Zakat Fitr/history disclosure
- Qibla technical details disclosure
- Tasbih counter options
- Ramadan secondary disclosure
- Calendar fasting disclosure
- Offline management disclosure
- About feature guide/privacy/source/install disclosures
- Audio/Reciters secondary controls
- Settings Setup disclosure + Compare C
- reduced-motion press behavior if the browser exposes the preference

## 2. Evidence discipline

Every interaction state must satisfy:

- URL/hash changed OR a visible DOM-state assertion changed; and
- screenshot hash differs from the immediately preceding state in the same cell.

If a selector fails, report **UNVERIFIED — selector failed**. Do not substitute a guessed selector and quietly continue.

## 3. Full matrix

Run the project Chromium suite exactly as supported by the repository.
Run:

- full `npm test`
- full `npm run lint`
- full Chromium E2E
- manifest/snapshot checks

Do not claim green if any command fails.

## 4. Deliverable

Return one ZIP:

`NUR-HOSTILE-REVIEW-v5.17.126-RESULTS.zip`

with:

```
FINDINGS.md
SUMMARY.json
RUN-METADATA.txt
screenshots/
console/
network/
traces/
raw-results/
```

In `FINDINGS.md`, classify every failure as one of:

- REAL PRODUCT DEFECT
- STALE/INCORRECT TEST CONTRACT
- UNVERIFIED / SELECTOR FAILURE
- ENVIRONMENT FAILURE

Do not fix anything during this run.
