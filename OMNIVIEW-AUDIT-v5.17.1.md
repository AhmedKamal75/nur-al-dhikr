# OMNIVIEW PRODUCT INQUISITION — Nūr al-Dhikr v5.17.1

**Audit mode:** hostile, evidence-first, 18-lens review based on the supplied Omniview protocol.
**Repository state:** exact handoff path `/home/ahmed_kamal/Projects/Azkar/nur-al-dhikr-claude/nur-al-dhikr` was not present in this runtime. The available project copy is `/mnt/data/nur_work`; it contains no `.git` directory, so `git status --short` and `git log --oneline -5` could not be honestly reproduced from this artifact.

## 1. Evidence summary

| Evidence                                  |                                      Result | Confidence |
| ----------------------------------------- | ------------------------------------------: | ---------- |
| Unit-test files                           |                                         171 | High       |
| Fresh sharded unit tests                  |                 **1,866 passed / 0 failed** | High       |
| Shell snapshot                            |              **255 files; matches v5.17.1** | High       |
| i18n parity                               |                     **1,797 EN / 1,797 AR** | High       |
| Quran token word-study coverage           |                         **77,429 / 77,429** | High       |
| Tajweed rules                             |                                 **20 / 20** | High       |
| Tajweed practice levels                   |                                   **3 / 3** | High       |
| Hadith corpus                             |                                  **34,239** | High       |
| Views                                     |                                      **33** | High       |
| Data files                                |                                   **2,348** | High       |
| JSON data                                 |                              **175.26 MiB** | High       |
| All `data/` including compressed payloads |                              **199.52 MiB** | High       |
| Full release uncompressed                 |                             **~207.03 MiB** | High       |
| Full release zip                          |                               **~55.7 MiB** | High       |
| E2E specs present                         |                                      **17** | High       |
| Playwright/CDP runtime                    | **Blocked by sandbox administrator policy** | High       |
| ESLint                                    |         **Unavailable: executable missing** | High       |

The protocol requires execution-backed evidence, two-lens cross-examination, four viewport regimes, trace capture, offline transitions, accessibility automation, chaos injection, and memory instrumentation. Those browser-owned items are explicitly marked unverified rather than inferred from source inspection.

## 2. Gate table

| Command / gate                                       | Result                                | Status           | Notes                                                         |
| ---------------------------------------------------- | ------------------------------------- | ---------------- | ------------------------------------------------------------- |
| `git status --short` at requested repo path          | path absent                           | COULD-NOT-VERIFY | Exact handoff path does not exist here.                       |
| `git log --oneline -5` at requested repo path        | path absent                           | COULD-NOT-VERIFY | No `.git` metadata in supplied project copy.                  |
| `npm test` as one process                            | timed out before aggregate completion | INCONCLUSIVE     | No failure was observed in the timeout tail.                  |
| 171-file isolated shard run                          | **1,866 passed / 0 failed**           | PASS             | All unit-test files covered.                                  |
| `npm run snapshot-shell -- --check`                  | **255 files match**                   | PASS             | v5.17.1 shell snapshot.                                       |
| `npm run measure`                                    | PASS                                  | PASS             | 1,797/1,797 i18n; 34,239 hadith; 1,069 library items.         |
| `npm run lint`                                       | `eslint: not found`                   | COULD-NOT-VERIFY | Dependency executable unavailable.                            |
| `npm ci`                                             | stalled/timed out in this environment | COULD-NOT-VERIFY | No trustworthy install completion.                            |
| targeted word-study/search/Tajweed/Mushaf/seed gates | **44 passed / 0 failed**              | PASS             | Includes 77,429-token coverage gate.                          |
| targeted Tajweed/Mushaf/audio gates                  | **37 passed / 0 failed**              | PASS             | Includes Sajdah annotation and audio mirror chain.            |
| Playwright/CDP browser probe                         | `ERR_BLOCKED_BY_ADMINISTRATOR`        | COULD-NOT-VERIFY | Chromium executable exists; sandbox policy blocks navigation. |
| Live external CDN HEAD/curl                          | DNS unavailable in container          | COULD-NOT-VERIFY | No live endpoint claim was accepted from this environment.    |

## 3. Cross-examined findings

Severity follows the supplied protocol formula: `IMPACT × URGENCY × (1 / CONFIDENCE)`. The score is an evidence triage aid, not a claim of user value by itself.

| #    | Finding                                                                                                                                                                          | Cross-examined by                                                                                            |        Severity | Verdict                               | Concrete action                                                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------: | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Audio manifest previously claimed Quran Foundation v4 was the first runtime fallback, but `verseAudioCandidates()` never invoked it.                                             | AUDIO × PERFECTIONIST; DATA × INVESTIGATIVE; TRUST × SKEPTIC                                                 | 3.2 → **fixed** | FIXED                                 | Manifest now distinguishes browser runtime order from authenticated backend-only v4; affected audio tests pass.                             |
| F-02 | Root/etymology tier is structurally complete but not item-citable: all 1,651 entries use one generic `bundled-root-core-meaning` source string.                                  | DATA × INVESTIGATIVE; HISTORIAN × TRADITIONALIST; TRUST × SKEPTIC                                            |             3.0 | PROTOTYPE / SCHOLARLY HANDOFF         | Add exact lexical citation metadata per root or per grouped source edition before calling this scholarly-grade.                             |
| F-03 | The antonym requirement is structurally covered by an explicit “no attested direct antonym” state, but only 271/4,763 lemma entries (5.69%) carry an actual direct antonym list. | DATA × INVESTIGATIVE; HISTORIAN × TRADITIONALIST                                                             |             3.0 | PROTOTYPE / HONEST                    | Do not fabricate antonyms. Either obtain a cited scholarly antonym layer or label the current field as “attested antonyms where available.” |
| F-04 | The full distribution is large: `data/` is 199.52 MiB including compressed payloads; uncompressed release is ~207 MiB.                                                           | PERFORMANCE × STINGY; SUSTAINABILITY × MINIMALIST; MEMORY × WATCHFUL                                         |             2.0 | WATCH / PROTOTYPE                     | Keep data lazy-loaded; add storage-estimate UI/telemetry and an explicit “clear downloaded study data” budget.                              |
| F-05 | Data-cache migration copies every entry from old versioned caches into the new cache without a preflight storage ceiling.                                                        | PERFORMANCE × STINGY; MEMORY × WATCHFUL; CHAOS × RESILIENT                                                   |             3.0 | HALF-DONE                             | Design bounded migration/LRU policy before promising indefinite offline retention on low-storage devices.                                   |
| F-06 | Runtime/browser evidence cannot be produced in this environment: Chromium navigation is administrator-blocked.                                                                   | INSTRUMENTATION × FORENSIC; BIFOCAL × RESPONSIVE; CHAOS × RESILIENT; ACCESS × GRANDMOTHER; MEMORY × WATCHFUL |             1.8 | CONTESTED / COULD-NOT-VERIFY          | Run the supplied E2E/trace matrix in a normal desktop CI runner with Playwright Chromium.                                                   |
| F-07 | Lint and dependency-install gates are unavailable in this environment, so “lint clean” cannot be re-certified here.                                                              | SUSTAINABILITY × MINIMALIST; INSTRUMENTATION × FORENSIC                                                      |             1.8 | COULD-NOT-VERIFY                      | Run `npm ci && npm run lint && npm run format:check` in CI and archive output.                                                              |
| F-08 | Hadith grading is intentionally not invented: the corpus documents unknown grades and no bundled grading source.                                                                 | DATA × INVESTIGATIVE; TRUST × SKEPTIC; HISTORIAN × TRADITIONALIST                                            |             1.2 | APP-GRADE DEFENSE / SCHOLARLY HANDOFF | Keep Unknown honest; add per-hadith grades only with cited, auditable sources.                                                              |
| F-09 | Current product footprint is 33 views and heavy content is lazy-loaded under a 22-static-view-import cap.                                                                        | FEATURES × HOSTILE; SUSTAINABILITY × MINIMALIST; PERFORMANCE × STINGY                                        |             1.0 | APP-GRADE DEFENSE                     | Preserve the lazy boundary; treat new static imports as budget regressions.                                                                 |
| F-10 | Trust posture is deliberately local-first: no external analytics/tracking is present in the scanned code, and follow-gap telemetry is documented as opt-in/local-only.           | TRUST × SKEPTIC; PROTECTOR × GUARDIAN                                                                        |             0.8 | APP-GRADE DEFENSE                     | Preserve local-only semantics and keep any future telemetry opt-in, explicit, and documented.                                               |

## 4. 18-lens census

| Lens                           | Evidence result                                                                            | Verdict                       | What is defendable now                                                             | Prescription                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 FEATURES × HOSTILE           | 33 views; orphan-action gate passes; 1,866 fresh unit tests pass                           | APP-GRADE / browser-contested | Feature wiring is test-backed.                                                     | Re-run all 33 views in browser CI.                                                            |
| 2 UI/UX × CURIOUS              | Live tap-count/style measurement unavailable                                               | CONTESTED                     | Code has explicit route/control contracts.                                         | Capture 33×4 viewport measurements and tap counts.                                            |
| 3 AESTHETICS × DEVOUT          | Screenshots/visual diff unavailable                                                        | CONTESTED                     | 11 paper editions and 4 Naskh families are represented in the code/data inventory. | Produce visual evidence for illumination, paper, text hierarchy, and reduced-motion surfaces. |
| 4 ACCESS × GRANDMOTHER         | Browser AX/touch audit unavailable                                                         | CONTESTED                     | Settings use semantic/native interaction patterns in static code paths.            | Verify 44px targets, RTL-only navigation, screen reader names, focus order on real browser.   |
| 5 PERFORMANCE × STINGY         | JS ~2.43 MiB; assets ~3.35 MiB; data lazy-loaded rather than precached                     | APP-GRADE DEFENSE + WATCH     | Service worker explicitly avoids precaching the entire data tree.                  | Measure first paint and route cost at 3G; add storage budget telemetry.                       |
| 6 DATA × INVESTIGATIVE         | 77,429 study tokens, 1,651 roots, 34,239 hadith; provenance gaps identified                | PROTOTYPE / HANDOFF           | Unknown grades remain Unknown.                                                     | Add exact citations to authored lexical/root study layers.                                    |
| 7 AUDIO × PERFECTIONIST        | Ayah resolver tests pass; full-surah fallback hook exists                                  | FIXED / CONTESTED             | Ayah chain exhausts before full-surah fallback.                                    | Browser-test start failure, mid-session failure, mute/sleep/repeat interactions.              |
| 8 TRUST × SKEPTIC              | Local-only telemetry scan; explicit permission wrappers                                    | APP-GRADE DEFENSE             | No external analytics endpoint found in source scan.                               | Verify permission prompts and privacy copy at runtime.                                        |
| 9 GROWTH × PLAYFUL             | No runtime onboarding probe                                                                | CONTESTED                     | Existing product is not dependent on accounts or remote streak telemetry.          | Add only quiet, scholar-safe delight; see §8.                                                 |
| 10 SUSTAINABILITY × MINIMALIST | 171 tests; 22-view static import cap; duplicate docs section removed                       | APP-GRADE DEFENSE             | Budget gates exist and are executable.                                             | Keep changes within budgets; do not add a second UI framework/component system.               |
| 11 INSTIGATIVE × TROUBLEMAKER  | Full data footprint and runtime/config contradiction were challenged                       | FINDINGS ACTIVE               | The audit found a claim/runtime mismatch rather than assuming the manifest.        | Repeat this pattern for every provider/permission/route claim.                                |
| 12 VISIONARY × LONG-TERM       | Competitor landscape supports connected study workflows                                    | PROTOTYPE                     | Local/offline architecture is a distinct strategic constraint.                     | Make local-first positioning explicit; treat sync as optional future architecture.            |
| 13 PROTECTOR × GUARDIAN        | No account/tracking path found; notification and sensor permissions are explicit API calls | APP-GRADE DEFENSE / CONTESTED | Permission hunger is limited in static code.                                       | Real-device permission walkthrough; document retention/export behavior.                       |
| 14 HISTORIAN × TRADITIONALIST  | Mushaf/Sajdah infrastructure and classical editions are present                            | APP-GRADE DEFENSE / HANDOFF   | Sajdah 32:15 is tested exactly, including display-form variant.                    | Scholar-review any authored semantic/etymological claims before public “authority” labeling.  |
| 15 INSTRUMENTATION × FORENSIC  | Trace/CDP environment unavailable                                                          | COULD-NOT-VERIFY              | Static gates are measurable; browser evidence is not.                              | Run trace-producing suite in CI and archive traces per finding.                               |
| 16 BIFOCAL × RESPONSIVE        | 4-viewport execution unavailable                                                           | COULD-NOT-VERIFY              | Responsive CSS exists and is testable statically.                                  | Run 1440×900, 390×844, 844×390, 1024×768 matrix.                                              |
| 17 CHAOS × RESILIENT           | Fault injection blocked by browser layer                                                   | COULD-NOT-VERIFY              | Unit tests cover hostile data paths extensively.                                   | Execute 500/404/latency/fetch-reject/storage-wipe/CPU-throttle matrix.                        |
| 18 MEMORY × WATCHFUL           | Heap snapshot/30-min run unavailable                                                       | COULD-NOT-VERIFY              | Cache code contains quota-aware LRU-ish eviction.                                  | Execute heap diff and long-session audio tests; measure storage growth.                       |

## 5. Fixed in this audit

### FIX-01 — Make audio fallback configuration truthful

Changed `data/audio-providers.json` so:

- browser `fallbackOrder` is exactly the order executed by current client code;
- Quran Foundation v4 remains explicitly present as an authenticated backend-only provider;
- runtime notes state that the PWA does not embed v4 credentials or invoke that provider directly.

Updated `tests/audio-mirrors-590.test.js` to pin this contract.

Affected regression: **10 tests, 0 failures**.

### FIX-02 — Remove duplicate data-source documentation

Removed the duplicated Qur'an lemma-study source section from `data/SOURCES.md`. This was pure documentation redundancy with no behavior change.

## 6. Data-specific audit

### Word study

The corpus-level token contract is complete: **77,429/77,429** tokens have materializable study rows. The compact design is appropriate for storage because lemma/root data is de-duplicated and expanded at runtime rather than copied into every token row.

The limitation is semantic provenance, not structural coverage:

- `data/quran-dict.json`: 4,763 lemma records.
- Actual direct Arabic antonym lists: 271/4,763 (5.69%).
- The runtime explicitly emits a no-attested-antonym state where appropriate instead of inventing one.
- `data/quran-roots-meaning.json`: 1,651 roots.
- All root entries currently carry the same generic source label, `bundled-root-core-meaning`.

This means the correct public description is **“coverage-complete with explicit unknown/no-attested states”**, not **“every token has a scholarly independently sourced antonym and etymology.”**

### Tajweed / Mushaf

The dedicated gates verify:

- 20 Tajweed rule pools;
- 3 practice levels;
- full Quran-derived rule coverage;
- exact Sajdah metadata for `سَجَدُوا` at 32:15;
- compatibility with the bundled Uthmani display form `سُجَّدًا`;
- double-underlining preference plumbing.

Relevant evidence includes `tests/p0-mushaf-core.test.js` and `tests/quranWordStudyCoverage.test.js`.

### Hadith provenance

The current choice is deliberately conservative: unknown grades remain unknown. The source documentation says no per-hadith grading source is bundled, so the app does not manufacture grade labels. This is a scholarly handoff, not a data-quality failure.

## 7. Product landscape context

This comparison is descriptive, not a ranking.

| Surface              | Nūr al-Dhikr                          | Current documented competitor capability                                                                                 |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Word-by-word study   | Strong offline local corpus           | Quran.com Study Mode exposes word-by-word details and tafsir/related study context.                                      |
| Tafsir               | Multiple bundled + on-demand editions | Quran.com exposes tafsir and study workflows; Muslim Pro exposes translations/Tajweed/read flows.                        |
| Learning/quiz        | Tajweed rule practice with 3 levels   | Muslim Pro documents a Learn tab with quizzes and progress.                                                              |
| Adhkar               | Large local libraries                 | Hisn Al Muslim is dedicated to Quran/Sunnah adhkar.                                                                      |
| Offline architecture | Core product constraint               | Connected competitors also support offline downloads in selected experiences, but use larger account/service ecosystems. |
| Accounts/sync        | Local-first / no required account     | Quran.com documents account-backed goals/progress and notes/reflections.                                                 |

## 8. Three scholar-safe delights (buildable ≤50 lines each)

1. **Quiet resume:** when reopening a partially studied surah, show one unobtrusive “Continue from 32:15” action; no streak, no loss language, no score pressure.
2. **Meaning whisper:** after selecting a word, reveal its concise contextual meaning first, with deeper morphology/tafsir one tap away; reduce cognitive competition with the ayah.
3. **Completion without gamification:** after finishing an ayah-study session, show a small “Next ayah” / “Close study” choice instead of celebratory badges or points.

## 9. Proposed buildable work

| Proposal                                                                                                  |              Estimated effort | Owner lens                | Acceptance gate                                                                  |
| --------------------------------------------------------------------------------------------------------- | ----------------------------: | ------------------------- | -------------------------------------------------------------------------------- |
| Scholarly lexical provenance schema (`sourceId`, work, author, edition, location) for root/antonym layers | 80–160 lines + data migration | DATA / HISTORIAN          | Every public semantic claim traceable to a named source.                         |
| Storage estimate/cleanup panel using existing local-data controls                                         |                   20–50 lines | PERFORMANCE / TRUST       | User can see approximate local footprint and clear nonessential downloaded data. |
| Bounded data-cache migration with explicit quota policy                                                   |                  80–160 lines | MEMORY / CHAOS            | No duplicate-cache spike beyond configured ceiling during version upgrade.       |
| Browser evidence CI job: 33 views × 4 viewports + traces                                                  |                 150–300 lines | INSTRUMENTATION / BIFOCAL | All required traces/screenshots produced.                                        |
| Accessibility CI with axe-core + keyboard traversal                                                       |                 100–180 lines | ACCESS                    | Critical/serious axe violations = 0; Arabic path keyboard-complete.              |
| Chaos harness for network/storage/CPU faults                                                              |                 120–240 lines | CHAOS                     | No white-screen/data-loss invariant violations.                                  |

## 10. Kill list

No product feature received enough evidence for deletion from this environment.

The following was **reclassified rather than killed**:

- `quran-foundation-v4` browser fallback claim → backend-only provider metadata.

Do not delete the provider definition: it documents a legitimate authenticated integration path. Delete only the false implication that the current browser client already executes it.

## 11. Could-not-verify register

1. **Git provenance:** exact requested repo path absent; no `.git` metadata in supplied copy.
2. **Real Chromium runtime:** administrator policy blocks localhost navigation even when Chromium exists and no proxy is used.
3. **CDP traces:** consequently unavailable.
4. **4-viewport visual regression:** unavailable.
5. **axe-core / real AX tree:** unavailable.
6. **Screen reader automation:** unavailable.
7. **Real-device touch/orientation:** unavailable.
8. **3G/2G network transition runs:** unavailable.
9. **30-minute audio/heap run:** unavailable.
10. **ESLint:** executable missing because dependencies were not installed successfully in this environment.
11. **Live external CDN verification:** container DNS cannot resolve external hosts; no endpoint was marked live-verified on that basis.

## 12. Scholarly handoff

Engineers should hand the following to qualified reviewers before presenting them as authoritative:

- root/etymology “classical physical usage” claims;
- authored Arabic glosses, synonyms and antonyms in `quran-dict.json`;
- translation fidelity;
- Tajweed classification edge cases and recitation-rule semantics;
- qira'at-specific Mushaf/orthography claims;
- hadith grading overlays when they are eventually added.

The current code is appropriately conservative where evidence is absent: it preserves explicit Unknown/no-attested states rather than manufacturing religious authority.

## 13. Hardware / environment gap

A complete protocol pass still needs:

- Chromium desktop with working Playwright/DevTools access;
- iPhone/iOS Safari PWA install for sensor/background-audio behavior;
- Android Chrome installed-PWA probe;
- a low-end Android device for CPU/storage/touch testing;
- a real screen reader environment (NVDA on Windows or VoiceOver on macOS);
- controlled 2G/3G network conditions;
- an environment where Lighthouse CI and axe-core can execute.

## 14. Bottom line

The strongest machine-verifiable layer is the **data integrity/unit-test layer**: 1,866 fresh sharded unit tests passed, the 77,429-token coverage gate passed, Tajweed/Mushaf/audio gates passed, and the shell snapshot is coherent.

The most material outstanding risks are **scholarly provenance of authored lexical/etymological metadata**, **unbounded/offline-data storage behavior**, and the **absence of genuine browser/real-device evidence in this execution environment**.

No claim in this report treats an unrun browser test as green.

---

## Machine audit metadata

- Project version: `5.17.1`
- Audit date: `2026-09-21`
- Unit test files: `171`
- Unit tests passed in isolated shards: `1866`
- Audio manifest fix: `data/audio-providers.json`
- Audio test contract: `tests/audio-mirrors-590.test.js`
- Documentation cleanup: `data/SOURCES.md`
- Git commit SHA: unavailable in supplied artifact
