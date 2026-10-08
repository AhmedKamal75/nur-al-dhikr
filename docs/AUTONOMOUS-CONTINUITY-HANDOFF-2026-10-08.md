# Nūr al-Dhikr — Autonomous Continuity Handoff
Updated: 2026-10-08

## Source of truth
- Repository: `AhmedKamal75/nur-al-dhikr`
- GitHub `main` remains the authoritative shared source/history.
- ZIP artifacts are intentionally not part of the continuity workflow unless explicitly requested.
- Formal release baseline remains **v5.17.136**. Do not label later work v5.17.137 until the version marker, service worker cache version, release record, and required verification are deliberately advanced together.

## Autonomous operating contract
Continue independently across waves/chats. Persist meaningful progress in GitHub, especially:
1. implementation commits;
2. durable issue ledger updates;
3. continuity/handoff documentation;
4. test/evidence records;
5. release/version records only when a release is actually verified.

Do not claim local Node/Chromium/device execution unless the evidence exists. Queued GitHub Actions are not passes.

## Current deep-review focus: Tajweed
User explicitly approved keeping Tajweed active until a full-corpus execution/anomaly pass is performed.

Required gate before calling Tajweed sufficiently verified:
- execute all 6,236 ayahs / 114 surahs;
- verify all 20 deterministic classifier rules against real corpus occurrences;
- analyze suspicious/false-positive spans, not merely exceptions;
- verify cross-word and ornament boundaries;
- verify ayah-final Madd / Madd Iwad;
- inspect rule overlap and precedence;
- verify course ↔ classifier ↔ source-registry consistency;
- verify Arabic/English parity;
- add regressions for every discovered defect;
- then reassess completion honestly.

### Recent semantic-lookahead fix
Branch: `fix/tajweed-semantic-lookahead-2026-10-08`

The classifier now separates raw rendering tokens from pronunciation-bearing semantic tokens so standalone Qur'anic ornaments cannot:
- hide the next pronunciation-bearing word from cross-word noon/meem rules;
- steal `isLastWordOfAyah` from the final pronunciation-bearing word.

Regression examples include:
- `مِنْ ۚ هُدًى` → Izhar
- `مِنْ ۖ يَعْمَلْ` → Idgham with ghunnah
- `الرَّحِيمِ ۚ` → final Madd
- `عَلِيمًا ۚ` → Madd Iwad
- ornament tokens remain render-only.

### Qalqalah deep-audit finding
A corpus inspection exposed a genuine false-positive class. The old Qalqalah heuristic treated any bare/implicitly-sakin `ق ط ب ج د` as Qalqalah, but assimilation boundaries can suppress independent Qalqalah.

The fix on the Tajweed branch suppresses Qalqalah when the current sakin Qalqalah letter is immediately assimilated into the following consonant, covering:
- same-letter assimilation;
- ق → ك;
- ط → ت;
- د → ت;
- ب → م.

Regression coverage now includes both isolated boundary fixtures and real ayah-level spellings such as:
- `وَقَد دَّخَلُوا`
- `بَسَطتَ`

Important: this is **not yet closed**. Full-corpus execution is still required, and scholarly scope must remain conservative. The current source evidence confirms that Qalqalah is tied to the five letters when sakin, while assimilation can alter the independent consonant realization. Do not generalize beyond the supported reading/methodology without source evidence.

### Durable issue ledger
- Row 78: Tajweed course corrupted Arabic copy — resolved on main, next release.
- Row 79: Halqi Izhar — reopened during deep audit previously; must remain truthful until runtime + full-corpus evidence establish closure.
- Row 80: **Tajweed Qalqalah false positives at assimilation boundaries — OPEN, deep-audit follow-up.**
  - Recorded on the Tajweed branch.
  - Do not close merely because regression tests exist.

## Important existing Tajweed architecture
- `data/tajweed-course.json`: 8 stages / 17 sessions / source-backed course spine.
- `js/domain/tajweedCourse.js`: course progression.
- `js/domain/tajweedSources.js`: 27 source entries, including contested items.
- `js/domain/tajweed.js`: 20 deterministic classifier rules.
- `js/domain/tajweedLessons.js`: sourced lesson examples.
- `js/views/tajweedPracticeView.js`: rule/family explanations, sources, Qur'an examples and drills.
- Full-corpus sweep file: `tests/tajweed-corpus-sweep.test.js`.
  It currently checks execution/invariants and rule reachability; it is **not a scholarly oracle**.
- Corpus-sweep diagnostics include rule counts, duplicate-span detection, and multiple-rule same-unit diagnostics.

## Verification status
- Recent GitHub Actions runs have remained queued. Do not report them as passing.
- No browser evidence has been obtained for the newest Tajweed changes.
- No local full-corpus execution has been independently observed in this workflow.
- Therefore Tajweed remains actively under audit.

## Next autonomous priorities
1. Obtain/perform the full-corpus execution/anomaly pass through available evidence.
2. Inspect every suspicious Qalqalah assimilation family for false positives and false negatives.
3. Review bare/implicit-sukun assumptions for noon/meem/qalqalah against actual Uthmani Unicode unit structure.
4. Review Madd final-word heuristics against corpus reality.
5. Audit rule overlap/precedence diagnostics.
6. Audit the course/classifier/source registry contract.
7. Keep each discovered issue in the durable ledger before considering it closed.
8. Only after Tajweed reaches an evidence-backed stopping point, resume Mushaf/browser hostile review and the broader deslopification loop.

## Release discipline
Do not bump v5.17.136 while these changes remain unverified. Preserve the release lineage. When a later release is actually verified, update:
- `js/core/config.js`
- `sw.js`
- release/version evidence
- durable handoff
- tests/evidence state
together.

## Browser/device evidence
Required evidence remains first-class for product claims. Relevant matrix includes 360/393/768/1024/1440 widths, EN/AR, light/dark, and hostile interaction paths. Never substitute source inspection for browser proof where visual/runtime behavior is the claim.


## Tajweed checkpoint update — 2026-10-08 autonomous wave
- PR #21 remains **OPEN / unmerged** while the Qalqalah deep audit continues.
- The earlier broad Qalqalah suppression heuristic was narrowed because dissimilar-letter adjacency alone was not enough evidence to choose a reading route.
- The classifier now suppresses Qalqalah only for explicit same-letter assimilation (next consonant shaddah-marked), exact `بسطت` / `أحطت` incomplete-assimilation spellings, and exact base sequence `نخلقكم`, where accepted complete/incomplete ق→ك realizations do not use Qalqalah on the sakin ق.
- `قَدْ تَّبَيَّنَ` and `ارْكَبْ مَّعَنَا` remain route-sensitive and are intentionally not auto-suppressed without a declared reading profile.
- Regression coverage now pins both positive and negative sides of this contract.
- This remains **unverified by local execution and browser evidence**. Full 6,236-ayah execution/anomaly analysis remains the next gating step.


### 2026-10-08 corpus/anomaly findings
- A Unicode-aware raw-text boundary scan now covers the full 114-surah corpus. It found one confirmed same-letter boundary candidate: `وَقَد دَّخَلُوا` (5:61); six bare/implicit-sukun د→تّ candidates in 2:256, 6:94, 9:117, 29:35, 29:38, 61:5; and one route-sensitive ب→مّ candidate, `ارۡكَب مَّعَنَا` (11:42).
- Scholarly cross-check changed the disposition of the d→t family: published Tajweed references describe dāl→tāʾ assimilation as an explicit idgham family, including examples such as `لَقَدْ تَابَ`, `قَدْ تَبَيَّنَ`, `قَدْ تَعْلَمُونَ`, and `لَقَدْ تَقَطَّعَ`. citeturn301559search0turn301559search5turn301559search8
- The ط→ت no-Qalqalah exception set was widened to include `فَرَّطتُ`; the corpus contains it at 39:56. The same sources describe `بسطت` / `أحطت` / `فرطت` as incomplete assimilation where the sakin ط must be pronounced without Qalqalah. citeturn301559search8turn301559search9
- The route-sensitive `اركب معنا` case remains deliberately conservative: sources document different reading-route treatment for Hafs, so the classifier must not silently assert one route without a declared profile. citeturn799118search0
- Exact corpus spellings verified: `بَسَطتَ` at 5:28, `أَحَطتُ` at 27:22, `فَرَّطتُ` at 39:56, `نَخۡلُقكُّم` at 77:20.
