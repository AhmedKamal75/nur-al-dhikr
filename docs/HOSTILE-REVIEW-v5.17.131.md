# Nūr al-Dhikr — Hostile Review v5.17.131

**Review date:** 2026-10-07  
**Evidence baseline:** v5.17.131 persisted source + existing local Chromium hostile-review evidence + source inspection + current standards/research  
**Purpose:** independent adversarial review before further feature expansion

## Review method

This review was run as separate independent passes rather than one blended opinion. The lenses were:

1. Visual art direction / taste / hierarchy
2. UX / learnability / task completion
3. Interaction grammar / feedback / disclosures
4. Information architecture / navigation
5. Responsive/mobile geometry
6. Arabic/RTL/bilingual parity
7. Accessibility / keyboard / focus / large text / forced colors
8. Performance / startup / rendering / memory pressure
9. Offline/PWA / storage / lifecycle honesty
10. Error handling / resilience / recovery affordances
11. Content completeness / feature depth
12. Religious-content provenance / scholarly integrity
13. Licensing / redistribution provenance
14. Privacy / security / untrusted-input handling
15. Maintainability / architecture / release-contract consistency
16. New-user perspective
17. Daily power-user perspective
18. Hostile edge-case / malformed-input perspective
19. Anti-slop / unnecessary-surface review
20. Competitive/product-quality review

The existing local Chromium evidence was treated as evidence, not as something this workspace independently re-certified. In particular, the earlier hostile run covered 416 screenshots across 13 route families × EN/AR × light/dark × four viewports, plus a focused interaction rerun; it found genuine Home/deep-link/picker defects and separately identified stale test contracts that should not be blindly “fixed”.

## Evidence rules

- A source-only claim is not browser certification.
- A visual preference is not automatically a defect.
- A stale test selector is not automatically a product failure.
- Religious/content additions are not machine-filled when source or scholarly authority is uncertain.
- Security/provenance findings are fixed only when the fix is deterministic; otherwise they become explicit review debt.

---

# Findings

## HR-01 — User-file JSON import can consume excessive memory before validation

**Severity:** P1 security/robustness  
**Status:** FIXED IN LOCAL 5.17.132 TREE  
**Affected:** backup import + family-plan import

### Observation

The import path previously called `FileReader.readAsText()` and then `JSON.parse()` before applying an application-level size limit. A hostile local file could therefore force a large memory allocation and expensive parsing before the app had a chance to reject it.

### Remediation

- Added a shared **8 MiB** maximum import size.
- Reject oversized backup and family-plan files before FileReader is invoked.
- Added bilingual user-facing rejection copy.
- Added regression coverage proving the guard precedes the read operation.

### External standard

OWASP ASVS 5.0 V5.2.1 requires accepted files to be limited to sizes the application can process without performance loss or denial of service.

Reference: https://cornucopia.owasp.org/taxonomy/asvs-5.0/05-file-handling/02-file-upload-and-content

---

## HR-02 — Family-plan importer accepted reserved object keys

**Severity:** P2 security/robustness  
**Status:** FIXED IN LOCAL 5.17.132 TREE  
**Affected:** `tasbihTargets` in imported family plans

### Observation

The plan sanitizer validated length and numeric value but did not initially share the application's established `__proto__` / `constructor` / `prototype` key exclusions.

### Remediation

The plan sanitizer now rejects those reserved keys and a regression test asserts only legitimate counter IDs survive.

---

## HR-03 — Hadith provenance/licensing statement is too strong for the evidence captured

**Severity:** P1 provenance/legal review  
**Status:** OPEN — requires rights/provenance clarification

### Observation

`CREDITS.md` and the in-app Hadith provenance string described the bundled collection as a “CC0 hadith-api dataset” and state that the English translations are sunnah.com translations mirrored by that dataset.

The repository used as the machine-readable source does publish a public-domain/Unlicense dedication. However, Sunnah.com itself states that it does **not permit scraping or mass reproduction of entire books/collections on other websites**, while allowing individual hadith or selections for teaching/didactic use. Those statements create a provenance/redistribution question that the current app copy does not surface clearly.

### Required disposition

Do not invent a legal conclusion. Before broad redistribution, establish exactly which rights attach to each bundled translation/edition and document the source-specific permission chain.

### Current safe action

The in-app copy should avoid the stronger “CC0” shorthand and point to the detailed provenance/rights note until that review is complete.

References:

- https://github.com/fawazahmed0/hadith-api/blob/1/LICENSE
- https://sunnah.com/about

---

## HR-04 — Qur'an word-by-word data provenance is under-documented

**Severity:** P1 provenance review  
**Status:** OPEN — rights/source confirmation required

### Observation

`CREDITS.md` currently says only that English word-by-word glosses and transliteration come from the quranwbw.com dataset. The project does not capture a sufficiently precise data-license statement for the exact dataset snapshot it redistributes.

A related current QuranWBW code/data ecosystem distinguishes its own application code from underlying source datasets and points users toward source-specific provenance. The hostile reviewer therefore rejects treating the presence of an MIT-licensed code repository as proof that every underlying data source is MIT-licensed.

### Required disposition

Record the exact dataset source/snapshot and the applicable license or permission for redistribution. Keep unresolved source rights explicitly marked rather than inferred from a code repository license.

---

## HR-05 — On-demand Tafsir depends on mutable `main` branch content

**Severity:** P1 continuity/reproducibility  
**Status:** OPEN — infrastructure/content decision required

### Observation

`js/core/config/quran.js` constructs Tafsir URLs against `raw.githubusercontent.com/spa5k/tafsir_api/main/...`.

The upstream project explicitly documents versioning by exact release tag or commit hash and **strongly recommends self-hosting** for production because public CDNs introduce third-party cache, outage, and continuity risks.

For a religious reference corpus, a mutable `main` dependency means the app's on-demand Tafsir content can change without a Nūr al-Dhikr release, checksum, or source review.

### Preferred disposition

Pick one explicit model:

1. pin the reviewed Tafsir source to an immutable commit/tag and record that ref in the app provenance; or
2. self-host a reviewed snapshot with its own checksum/provenance record.

Do not silently switch to an arbitrary old commit merely to make the URL immutable.

Reference: https://github.com/spa5k/tafsir_api

---

## HR-06 — Core Adhkar/Duʿāʾ depth is below the historical core-content target

**Severity:** P1 product/content completeness  
**Status:** BLOCKED:scholar/research — OPEN for the product plan

### Measured state

The v5.17.131 source contains:

- `adhkar.json`: **168** items
- `duas.json`: **527** items
- core Adhkar + Duʿāʾ surfaces: **695** items

The broader `measure.mjs` library count is **1,069 items across seven counted libraries**, and additional libraries such as Asmāʾ al-Ḥusnā and special-day content push the total higher. Therefore the honest finding is **not** “the app has fewer than 1,000 items overall.” The finding is that the **core Adhkar/Duʿāʾ experience is still substantially below the historical 1,000+ core-content ambition**.

### Required disposition

Do not fill the gap with machine-generated religious material. Build a sourced expansion plan from verified collections, with per-item provenance, authenticity/grade handling, Arabic fidelity, and scholar review where required.

---

## HR-07 — Browser/device certification remains the largest unclosed evidence gap

**Severity:** P1 release-certification gap  
**Status:** BLOCKED:device

The source/test system cannot independently certify:

- Azkar Details/count separation and timing
- Home composition and sacred-banner absence
- Main-menu disclosure interaction
- narrow Settings in EN/AR and light/dark
- long picker labels
- Player at 360/393/1024/1440
- invalid Qur'an deep links
- Hadith Details + Reference
- Prayer methodology disclosure
- Offline boot/install and Manage Offline
- Mushaf Find in single/spread/fullscreen states
- exact bookmark reopen
- Statistics/Checklist/Category disclosures
- v5.17.127–129 Retry interactions

The existing local Chromium evidence is useful and already caught real defects, but it is historical evidence and must be rerun against the current source before visual certification is claimed.

---

## HR-08 — Utility interiors need evidence, not automatic redesign

**Severity:** P2 product-review queue  
**Status:** OPEN — hostile visual/device pass required

Garden, About, Install/Distribution, Kids and Offline all contain substantial intentional product behavior. Source inspection alone does not justify redesigning them. The next browser pass should specifically judge:

- whether About's guide becomes an unnecessary second navigation system;
- whether Garden's staged illustration/progress becomes decorative pressure rather than gentle feedback;
- whether Kids' hold-to-exit behavior is discoverable and recoverable for a parent;
- whether Install status and manual platform instructions remain visually secondary to the user's actual task;
- whether Offline's progressive disclosure still keeps the essential action visible at narrow widths.

No source-only redesign is justified yet.

---

## HR-09 — The historical OPEN-ISSUES ledger contains valid debt that must not be lost

**Severity:** P2 process/continuity
**Status:** OPEN — tracking requirement

The durable ledger still records, among other items:

- Hadeeth citations/narrators/Arabic chapter names/global bookmarks
- verse-mode within-ayah seek decision
- Tafsir remote-source continuity
- iOS prayer wake-up limitations
- deployment/hosting story
- richer Azkar depth/search/audio decisions

The hostile-review rule is to **merge new findings into the existing ledger**, not create a parallel shadow backlog that future releases forget.

---

# Deliberate no-action decisions from this hostile review

The reviewers did **not** find evidence strong enough to justify a redesign of:

- Home back into a dashboard
- Mushaf / Word Study / Focus / Tajweed interaction grammar
- the seven-door navigation hierarchy
- progressive disclosure merely for visual novelty
- per-dhikr audio without verified sources and the existing scholar gate
- community/social mechanics
- arbitrary “More” navigation buckets

Those remain preserve/no-go constraints unless fresh browser evidence contradicts them.

# Recommended order

1. Finish local v5.17.132 with HR-01/HR-02 plus provenance-copy hardening.
2. Run the complete deterministic regression and release-contract gate.
3. Persist/hash-verify v5.17.132.
4. Use local browser/device evidence to close HR-07 and the utility-surface questions.
5. Resolve HR-03–HR-05 through source/licensing/provenance research before broad corpus expansion or remote-content pinning.
6. Treat HR-06 as a sourced content-research phase, not a code-generated filler task.

# Final hostile verdict

**The app is not suffering from a shortage of cosmetic polish. Its remaining high-value risks are evidence, provenance, content depth, and a small number of deterministic robustness defects.** Continuing to rearrange already-strong surfaces without browser evidence would be churn, not quality work.
