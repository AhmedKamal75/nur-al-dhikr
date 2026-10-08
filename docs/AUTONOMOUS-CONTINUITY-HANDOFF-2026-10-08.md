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

- PR #21 remains **OPEN / unmerged** at current branch head `7b3390aef3a26d577d1991973d2000815c15e067`.
- The first Qalqalah suppression patch was intentionally rejected as too broad. Letter-pair adjacency alone was not enough evidence, especially for the very common ب→م and ق→ك boundaries.
- Current Qalqalah contract:
  - suppress identical-letter assimilation when the following consonant is explicitly shaddah-marked;
  - suppress the dal→ta assimilation family when the following ta is explicitly shaddah-marked;
  - suppress the exact no-Qalqalah intra-word spellings `بسطت`, `أحطت`, `فرطت`;
  - suppress `نخلقكم` because both accepted complete/incomplete ق→ك realizations are performed without Qalqalah on the sakin qaf;
  - leave `اركب معنا` conservative until the app declares a reading profile, because its treatment varies by reading route.
- Unicode-aware raw-text boundary scanning now covers all 114 surahs. The concrete sakin-boundary candidates are:
  - `وَقَد دَّخَلُوا` (5:61): identical-letter assimilation;
  - `قَد/لَقَد/وَقَد + تَّ...` in 2:256, 6:94, 9:117, 29:35, 29:38, 61:5: dal→ta assimilation;
  - `ارۡكَب مَّعَنَا` (11:42): route-sensitive ba→mim.
- Exact corpus spellings were verified at 5:28 (`بَسَطتَ`), 27:22 (`أَحَطتُ`), 39:56 (`فَرَّطتُ`), and 77:20 (`نَخۡلُقكُّم`).
- Scholarly references used for the implementation review: Islamweb's *Hidayat al-Qari* on permitted/route-specific idgham; Hoda al-Quran's discussion of obligatory dal→ta idgham; and Quranpedia's *Al-Mizan fi Ahkam Tajwid al-Qur'an* on dal→ta and incomplete ta/ṭa cases. These sources are external research inputs; they do not substitute for app-specific validation.
- `tests/tajweed-corpus-sweep.test.js` now emits rule counts, duplicate-span failures, same-unit overlap counts, bare-Qalqalah counts, and word-final Qalqalah boundary-pair diagnostics for the full execution pass.
- **Still unverified:** no local full-corpus test run has been independently observed, no browser evidence covers the newest Tajweed changes, and queued GitHub Actions are not being counted as passes.

## Autonomous next gate
1. Obtain a real execution result for the 6,236-ayah sweep and inspect every emitted Qalqalah boundary diagnostic.
2. Reconcile any suspicious overlaps/spans against source text and the scoped Tajweed contract.
3. Continue the Tajweed classifier audit into the remaining high-risk assumptions (bare/implicit sukun, Madd final-word heuristics, rule precedence) before returning to Mushaf/browser hostile review.


### Muqaṭṭaʿāt anomaly — 2026-10-08
- Static corpus inspection found `طه` in 20:1 entering the generic Qalqalah branch because the raw spelling carries no vowel marks on the opening letters. The same structural risk exists for the qlq-bearing opening tokens `طس`, `طسم`, `ق`, and `عسق`.
- Web verification confirms Qalqalah is tied to the five letters when they are sakin, while `طه` is a Muqaṭṭaʿāt opening read as the letter names `طا` and `ها`; therefore raw absence of diacritics must not be treated as sukun in these opening tokens. (Islamweb Tajweed Lesson 8; Ibn Ashur, *al-Tahrir wa'l-Tanwir*, surah Ta-Ha).
- The branch now excludes only those exact Qalqalah-bearing Muqaṭṭaʿāt token strings from the generic Qalqalah fallback. Unit tests cover all five forms.
- `فرطتم` was also added to the exact incomplete-ṭā→tā assimilation set; the corpus contains it at 12:80, and Tajweed references explicitly state that the ṭā in `فرطتم` loses Qalqalah during incomplete assimilation. (Tajweed instructional references cited in the working audit).
- This is still unverified by local execution/browser evidence.

### Madd ʿĀriḍ heuristic audit — 2026-10-08
- Static review found `madd_246` used `isLastWordOfAyah && i >= units.length - 2`, which allowed a madd letter at the **last unit** of a word to be classified as Madd ʿĀriḍ.
- This was corrected to require `i === units.length - 2` and an actual following unit. Madd ʿĀriḍ is defined as a stop-induced sukoon occurring after a madd/leen letter; when the word ends on the madd letter itself, there is no final consonant receiving that sukoon. citeturn638691search2turn638691search7
- Corpus regression target: `وَٱلضُّحَىٰ` (93:1) must not receive `madd_246`; `الرَّحِيمِ` with a final consonant remains a valid `madd_246` test shape.
- This change is still unverified by local execution.
