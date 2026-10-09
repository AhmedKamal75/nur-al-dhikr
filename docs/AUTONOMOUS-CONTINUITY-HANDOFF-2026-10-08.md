# Nūr al-Dhikr — Autonomous Continuity Handoff
Updated: 2026-10-09

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

### Full-corpus execution gate — completed with explicit limits (2026-10-09)

The current branch classifier has now been executed across all 114 bundled Quran JSON files / 6,236 ayahs in the available JavaScript tool runtime. The durable result is `docs/TAJWEED-CORPUS-EXECUTION-2026-10-09.md`.

- Latest classifier content SHA: `4d26e02e47adc32e32646dfa6c6c5b576ebfd2a9`. The full corpus was re-run after the latest Qalqalah/Muqaṭṭaʿāt changes: 104,558 spans were produced; all 21 current `TAJWEED_RULES` identities were reachable.
- Zero raw-token-count mismatches, bad one-based word indices, unknown rule IDs, invalid span offsets, duplicate exact spans, file-fetch failures, or JSON parse failures were observed.
- Four same-written-unit collisions were identified and categorized; three implicit/no-explicit-mark Qalqalah spans were reviewed, of which two are ayah-final pause cases and one (`ٱرۡكَب مَّعَنَا`, 11:42) remains reading-profile-sensitive.
- The existing `tests/tajweed.test.js` was additionally run through a synchronous in-tool shim: 26/26 passed. This is useful execution evidence, but it is **not** `node --test`; CI, browser/device execution, and an authoritative scholarly comparison remain unverified. The full corpus run is direct execution of the fetched classifier source, not `npm run check`.

Remaining gate before Tajweed can be called sufficiently verified:
- run the repository's official Node/lint/format/data checks and obtain completed CI jobs;
- review the four classifier overlaps and define how the painter/inspector exposes more than one rule on a written unit;
- settle the reading-profile policy for `ٱرۡكَب مَّعَنَا` with a trusted source and explicit profile semantics;
- verify course ↔ classifier ↔ source-registry consistency, Arabic/English parity, and lesson-level pedagogy;
- inspect real Mushaf/practice browser behavior, then reassess completion honestly.

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

The prior broad heuristic treated any bare/implicitly-sakin `ق ط ب ج د` as Qalqalah. Source review found cases where a specific assimilation changes the independent consonant realization. The current branch therefore uses deliberately narrow evidence rather than broad letter-adjacency suppression:

- suppress same-letter assimilation only when the following same consonant carries explicit shadda;
- suppress the supported dāl→tāʾ boundary when the following tāʾ carries explicit shadda;
- suppress cross-word Qāf→Kāf only when the next kāf carries explicit shadda; bare adjacency is not enough;
- exempt Muqaṭṭaʿāt only when the token is one of the known opening-letter skeletons and its marks are absent or madda-only. An explicit sukun/sukun-alt must not be hidden by the skeleton match.
- suppress exact intra-word spellings `بَسَطْتَ`, `أَحَطْتُ`, `فَرَّطْتُ`, `فَرَّطْتُم`, and `نَخْلُقكُّم`.

Do **not** describe bāʾ→mīm as a generally suppressed family: the full-corpus run still emits Qalqalah on the bāʾ in `ٱرۡكَب مَّعَنَا` (11:42). This remains an open, reading-profile-sensitive case; without a declared reading profile and source-backed decision, do not broaden the suppression rule. The other two no-explicit-mark spans in the full-corpus sweep are end-of-ayah pause cases: `فَٱرۡغَب` (94:8) and `وَٱقۡتَرِب۩` (96:19).

The complete corpus report records diagnostics and limitations. Corpus execution has been performed, but this issue remains **OPEN** pending official Node/CI execution and scholarly/reading-profile resolution. Do not generalize beyond the supported reading/methodology without source evidence.

### Durable issue ledger
- Row 78: Tajweed course corrupted Arabic copy — resolved on main, next release.
- Row 79: Halqi Izhar — reopened during deep audit previously; must remain truthful until runtime + full-corpus evidence establish closure.
- Row 80: **Tajweed Qalqalah false positives at assimilation boundaries — OPEN, deep-audit follow-up.**
- Row 86: **Lam Shamsiyyah after vocalized lām-prefix — OPEN pending official tests/browser evidence.**
- Row 87: **Lām al-Jalālah heavy/light context — OPEN pending official tests/browser evidence and source comparison.**
- Row 88: **Same-unit multi-rule collisions hidden by painter/inspector — OPEN.**
- Row 89: **Muqaṭṭaʿāt exemption masking explicit sukun — corrected on PR #21; OPEN pending official test/CI evidence.**
  - Recorded on the Tajweed branch.
  - Do not close merely because regression tests exist.

## Important existing Tajweed architecture
- `data/tajweed-course.json`: 8 stages / 17 sessions / source-backed course spine.
- `js/domain/tajweedCourse.js`: course progression.
- `js/domain/tajweedSources.js`: 27 source entries, including contested items.
- `js/domain/tajweed.js`: 21 deterministic classifier rules in the current branch registry.
- `js/domain/tajweedLessons.js`: sourced lesson examples.
- `js/views/tajweedPracticeView.js`: rule/family explanations, sources, Qur'an examples and drills.
- Full-corpus sweep file: `tests/tajweed-corpus-sweep.test.js`.
  It currently checks execution/invariants and rule reachability; it is **not a scholarly oracle**.
- Corpus-sweep diagnostics include rule counts, duplicate-span detection, and multiple-rule same-unit diagnostics.

## Verification status
- The isolated JavaScript-runtime corpus run is complete and documented on classifier SHA `4d26e02e47adc32e32646dfa6c6c5b576ebfd2a9`; all 6,236 ayahs passed structural invariants.
- The current `tests/tajweed.test.js` passed 27/27 in an isolated compatibility shim; do not relabel this as Node's native test runner.
- The most recently checked GitHub Actions run was queued, not passing. Recheck after each new commit.
- No browser evidence has been obtained for the newest Tajweed changes.
- No full scholarly-reference corpus comparison has been performed.
- Therefore Tajweed remains actively under audit.

## Next autonomous priorities
1. Run `npm run check` / Node tests and wait for completed CI results; treat queued jobs as unknown.
2. Decide and test display/inspector handling of the four known same-unit overlap cases (ledger row 88).
3. Resolve or explicitly scope the reading-profile-dependent `ٱرۡكَب مَّعَنَا` Qalqalah case (row 80) without broad suppression.
4. Continue the hostile review of Madd final-word, ornament, noon/meem and Unicode-unit boundaries.
5. Audit course/classifier/source-registry consistency and the quality/depth of lesson sequencing.
6. Obtain browser evidence for the Mushaf and Tajweed practice at mobile and desktop sizes, Arabic/English, light/dark.
7. Keep each new finding in the durable issue ledger before considering it closed.
8. Only after Tajweed reaches an evidence-backed stopping point, resume the broader deslopification loop.

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

- PR #21 remains **OPEN / unmerged** and mergeable at the last live check; its current head is available from the canonical [PR #21 page](https://github.com/AhmedKamal75/nur-al-dhikr/pull/21). Avoid treating the earlier `34c86c4...` checkpoint SHA as current.
- Formal app release remains **v5.17.136**; no v5.17.137 claim is made.
- Ornament-aware semantic lookahead remains part of the branch: raw rendering tokens are preserved, while cross-word Tajweed lookahead and ayah-final status use pronunciation-bearing semantic tokens.
- Qalqalah broad adjacency suppression was intentionally rejected. Current suppression is evidence-backed and narrow:
  - identical-letter assimilation when the following consonant is explicitly shaddah-marked;
  - dal→ta assimilation when the following ta is explicitly shaddah-marked;
  - exact incomplete-ṭā→tā spellings `بسطت`, `أحطت`, `فرطت`, `فرطتم`;
  - `نخلقكم`, where accepted qaf→kaf realizations do not use Qalqalah on the written sakin qaf;
  - exact Qalqalah-bearing Muqaṭṭaʿāt opening tokens are exempted from the generic bare-letter fallback.
- `اركب معنا` stays conservative because its ب→م treatment is route-sensitive and the app has no declared reading profile.
- A Unicode-aware source scan covered all 114 surahs for the principal Qalqalah assimilation boundary families. Confirmed concrete cases include `وَقَد دَّخَلُوا` (5:61), the dal→ta family at 2:256 / 6:94 / 9:117 / 29:35 / 29:38 / 61:5, and `ارۡكَب مَّعَنَا` (11:42).
- Exact incomplete-ṭā→tā corpus spellings verified include 5:28 `بَسَطتَ`, 12:80 `فَرَّطتُمۡ`, 27:22 `أَحَطتُ`, and 39:56 `فَرَّطتُ`. `نَخۡلُقكُّم` is at 77:20.
- The Madd audit found that `madd_246` previously allowed a madd unit at the very end of the word. It now requires a following final consonant (`i === units.length - 2 && next`). The learner-facing rule description was corrected accordingly.
- Regression targets now include `وَٱلضُّحَىٰ` (93:1) as **not** Madd ʿĀriḍ and `الرَّحِيمِ` as the final-consonant Madd ʿĀriḍ shape.
- Corpus diagnostics in `tests/tajweed-corpus-sweep.test.js` now include rule counts, duplicate spans, same-unit overlaps, bare-Qalqalah counts, and word-final Qalqalah boundary-pair examples.
- **Verification remains incomplete:** no local full-corpus run has been independently observed, current GitHub Actions runs are queued, and there is no browser evidence for the newest Tajweed changes. These are gating items, not implied passes.

## Autonomous next gate

1. Obtain a real execution result for the 6,236-ayah sweep and inspect every emitted Qalqalah boundary diagnostic.
2. Reconcile any suspicious spans/overlaps against source text and the scoped Tajweed contract.
3. Continue the classifier audit through rule precedence and remaining Madd/noon/meem edge cases.
4. Once Tajweed is evidence-backed, resume Mushaf/browser hostile review before any release bump.

### Muqaṭṭaʿāt anomaly — 2026-10-08
- Static corpus inspection found `طه` in 20:1 entering the generic Qalqalah branch because the raw spelling carries no vowel marks on the opening letters. The same structural risk exists for the qlq-bearing opening tokens `طس`, `طسم`, `ق`, and `عسق`.
- Web verification confirms Qalqalah is tied to the five letters when they are sakin, while `طه` is a Muqaṭṭaʿāt opening read as the letter names `طا` and `ها`; therefore raw absence of diacritics must not be treated as sukun in these opening tokens. (Islamweb Tajweed Lesson 8; Ibn Ashur, *al-Tahrir wa'l-Tanwir*, surah Ta-Ha).
- The branch now excludes only those exact Qalqalah-bearing Muqaṭṭaʿāt token strings from the generic Qalqalah fallback. Unit tests cover all five forms.
- `فرطتم` was also added to the exact incomplete-ṭā→tā assimilation set; the corpus contains it at 12:80, and Tajweed references explicitly state that the ṭā in `فرطتم` loses Qalqalah during incomplete assimilation. (Tajweed instructional references cited in the working audit).
- This is still unverified by local execution/browser evidence.

### Madd ʿĀriḍ heuristic audit — 2026-10-08
- Static review found `madd_246` used `isLastWordOfAyah && i >= units.length - 2`, which allowed a madd letter at the **last unit** of a word to be classified as Madd ʿĀriḍ.
- This was corrected to require `i === units.length - 2` and an actual following unit. Madd ʿĀriḍ is defined as a stop-induced sukoon occurring after a madd/leen letter; when the word ends on the madd letter itself, there is no final consonant receiving that sukoon. (research basis: Islamweb's definition of Madd ʿĀriḍ as a stop-induced sukoon after a madd/leen letter).
- Corpus regression target: `وَٱلضُّحَىٰ` (93:1) must not receive `madd_246`; `الرَّحِيمِ` with a final consonant remains a valid `madd_246` test shape.
- This change is still unverified by local execution.

### Madd Badal source-taxonomy correction — 2026-10-08
- The old canonical/runtime source registry incorrectly classified Madd Badal as one of the four Madd Lazim types and conflated the special ʿayn length discussion with it.
- The reviewed correction from the still-open PR #18 was carried onto PR #21, updating both `data/tajweed-sources.json` and `js/domain/tajweedSources.js`.
- The corrected copy explicitly says Madd Badal is a distinct category, records the app's current classifier as 2-count, and scopes any future multi-riwayah length claim to an explicit reading profile.
- Durable ledger row 83 records the source/data correction. This does not close the broader Tajweed evidence gate.

### Madd Badal executable heuristic audit — 2026-10-08
- Deep source review found `signaled = u.base === ALIF_MADDA || u.diacritics.has(MADDA_ABOVE)` was too broad. U+0653 is a general Qur'anic madd sign; it does not by itself establish Madd Badal.
- The classifier now limits the Badal signal to actual hamza+madd orthography: `آ` / `ALIF_MADDA`, or a hamza base carrying the explicit madda mark.
- Regression coverage pins `آدَمَ` and an explicit hamza+madda spelling as Badal, while `مَآ` must remain natural `madd_2` and must not become `madd_badal`.
- This is still unverified by local/full-corpus execution. Uthmani notation references confirm U+0653 is a madd marker and is not itself a Badal classifier. 

### Low-iqlab normalization checkpoint
- The classifier defines both `IQLAB_MARK` (U+06E2) and `IQLAB_MARK_LOW` (U+06ED), and `canonMark()` deliberately folds the low form to the canonical high form before rule classification.
- A regression now pins the low-mark path to `iqlab`; no runtime change was necessary.

### Madd Silah small-letter audit — 2026-10-08
- Full-corpus source inspection found numerous small Waw/Yeh marks outside hāʾ-al-kināyah, including `دَاوُۥدُ`, `تَلۡوُۥنَ`, `فَأۡوُۥٓاْ`, `يُحۡيِۦ`, `وَلِيِّۦ`, `لِتَسۡتَوُۥاْ`, and `ٱلۡمَوۡءُۥدَةُ`.
- The previous blanket branch `small waw/yeh → madd_silah` would mislabel those ordinary small-letter spellings.
- The classifier now uses `isHaKinayahSilahUnit()`: small Waw must follow a hāʾ with damma, and small Yeh must follow a hāʾ with kasra, to receive `madd_silah`. Other bare small Waw/Yeh forms become `madd_2`; madda-marked forms continue through the main Madd branch.
- The tests now pin `لَهُۥ` as Silah and `دَاوُۥدُ` / `يُحۡيِۦ` as ordinary madd.
- This is still unverified by local/full-corpus execution and browser evidence.

### Lam Shamsiyyah lām-prefix audit — 2026-10-08
- Static source inspection found at least 75 concrete article-after-lām-prefix forms in Surahs 1–20, including لِلطَّآئِفِينَ, لِلظَّـٰلِمِينَ, لِلسُّحۡتِ, and لِلَّذِينَ.
- The previous classifier handled bare alif-lam and the one-letter prefix particles w/f/b/k, but could miss the article lam after a lām-prefix.
- The classifier now accepts a second lam whose previous unit is a vocalized lam-prefix, while retaining the existing article guards.
- Regression coverage pins لِلطَّآئِفِينَ and لِلظَّالِمِينَ.
- Verification remains pending local/full-corpus execution and browser evidence.


### Autonomous checkpoint — 2026-10-09: plural Qalqalah exception mismatch

- Static inspection compared the exact no-Qalqalah set in `js/domain/tajweed.js` with the already-present `فَرَّطتُمۡ` regression fixture in `tests/tajweed.test.js`.
- The code key was accidentally `فرطم` (missing `ت`) while `tokenizeUnits()` builds the exact letter sequence `فرطتم`. Because suppression uses exact `Set.has(baseSequence)`, the intended exception would not match the plural Qur'anic form.
- Corrected the set key to `\u0641\u0631\u0637\u062A\u0645`, and corrected the nearby rule comment to include the plural form. The regression already exists; this source review predicts it should catch the previous defect, but no test execution is claimed.
- `docs/OPEN-ISSUES.md` row 80 now records this finding and the correction while remaining **OPEN** pending actual execution and full-corpus anomaly review.
- The fix is on `fix/tajweed-semantic-lookahead-2026-10-08`, under PR #21. Formal release remains v5.17.136; the PR is not being merged based on static inspection alone.


### Autonomous checkpoint — 2026-10-09: unreachable lām-prefix branch

- A second static control-flow defect was found in the lām-prefix Lam Shamsiyyah addition. The classifier's outer guard admitted only an alif/alif-wasla before the article lām, making the inner `prev.base === LAM` exception impossible to reach for `لِلظَّالِمِينَ` and `لِلطَّآئِفِينَ`.
- Fixed the outer guard to allow the article lām at index 1 when the preceding lām-prefix is vocalized; removed the now-redundant dead inner clause.
- Strengthened `tests/tajweed.test.js` so the lām-prefix regression additionally requires a `lam_shamsiyyah` span starting at UTF-16 offset 2 and slicing to the **second lām**. This prevents a future unrelated match from satisfying the test.
- `docs/OPEN-ISSUES.md` row 86 now records the actual dead-branch cause and the source-level correction; it remains **OPEN** pending test execution, full-corpus review, and browser evidence.
- Relevant source/test commits: `a16e159624947cfb369cd174939fcde8387cf210` (classifier) and `bf47c32fd06b24575c14066e4391548a1adc4ba5` (regression test). The plural `فَرَّطتُمۡ` exact-key correction is in `633c57dd829a705c470304ebfadc789995c976e9`; the handoff/ledger checkpoints are also on this PR branch.
- Do not infer test failure/pass from this static review: GitHub Actions remains queued at the last check, and no local runtime execution is available as evidence yet.


### Autonomous checkpoint — 2026-10-09: Allah-lām context sensitivity

- A semantic Tajweed defect was found in the original classifier: the second lām of Lafẓ al-Jalālah was unconditionally tagged tafkhim whenever the word skeleton ended in lām+lām+hāʾ. That falsely marked **بِسْمِ ٱللَّهِ** as heavy despite the preceding kasrah.
- Source check: Islamweb's lesson on Lām al-Jalālah says fatḥah/ḍammah before it yields tafkhim while kasrah yields tarqiq: https://www.islamweb.net/eschool/tajweed/ShowLesson.php?REF_ID=RES-C0C72595-7975-6963-A2A7-BCAEABB67BD2&lang=E. A second reference gives examples such as بِسْمِ اللَّهِ and فِي اللَّهِ under the light form: https://surahquran.com/Tajweed/ahkam-allam-en.html.
- PR #21 changes this from unconditional matching to conservative context-aware tagging: standalone Lafẓ al-Jalālah receives the app's heavy tag only at the first semantic word or when the preceding semantic word's final pronunciation context explicitly signals fatḥah/ḍammah; attached prefix forms inspect the prefix vowel, so بِـ / لِـ are not marked heavy. This app has no separate tarqiq span/color, so light or uncertain cases remain uncolored.
- Semantic lookbehind uses the same ornament-aware word indices as lookahead, so a standalone waqf/sajdah symbol must not turn the previous context into an unknown word.
- Regression cases have been added/updated for بِسْمِ ٱللَّهِ, initial ٱللَّهُ, قَالَ ٱللَّهُ, وَٱللَّهِ, فِي ٱللَّهِ, بِٱللَّهِ, and لِلَّهِ.
- Durable docs/OPEN-ISSUES.md row 87 records the issue and leaves it **OPEN**. The current classifier has since been executed across the full 6,236-ayah corpus in the isolated JavaScript runtime, and the targeted heavy/light cases pass there. Official Node/CI execution, browser evidence, and a scholarly-oracle comparison remain pending.
- Latest relevant change commits include c5fde1086e84e790248a9df6628d2b3f8c3dab6c (escape correction), 82d66a2c9f5373e47ceb4e74e30f47aead3d80e0 (regressions), and f15bf9f5a553843a74a33d6d6dc8bde20077c0dc (comment correction). The full branch has also fixed the plural Qalqalah exception key and the unreachable lām-prefix guard. GitHub Actions has been queued for recent heads; do not interpret queue state as pass.


### Autonomous checkpoint — 2026-10-09: test-harness failures and second corpus pass

- Executing the existing Tajweed unit file in an isolated JS harness surfaced four issues. They were investigated individually rather than dismissed as harness noise.
- Fixed the Muqaṭṭaʿāt bypass so a qāf-with-explicit-sukun token cannot be mistaken for the bare opening-letter name qāf. Known opening-letter tokens are exempt only when marks are absent or lengthening-only.
- Reviewed and rejected the proposed generic cross-word Qāf→Kāf suppression. Source references scope the documented assimilation to known lexical/reading cases such as نخلقكم, not any word-final qāf before a shaddah-marked kāf. The regression now requires generic qāf+sukūn to retain Qalqalah even when the next-word kāf is shadda-marked; exact lexical exceptions remain explicit.
- Fixed the lām-prefix regression's manually added test string, which had double-escaped Unicode sequences; the original positive tests used the correct actual text.
- Corrected the isolated low-Uthmani-iqlab test to assert the presence of iqlab rather than assuming it is the first span when an earlier same-word mīm can legitimately emit its own rule.
- Updated the Lām al-Jalālah test: an initial standalone word is explicitly marked as initial context; a wāw prefix with fatḥah remains heavy; bi-/li-prefix forms with kasrah are not labelled heavy. The classifier has no separate tarqīq span/color, so these remain uncolored.
- Fixed the hatatta test fixture's initial letter to hamza-on-alif (U+0623), matching the intended no-Qalqalah lexical key.
- Latest source/test pair: classifier 4d26e02e47adc32e32646dfa6c6c5b576ebfd2a9; test file blob b64d1acf92ab4e1f92ee7351b426954f8872cd57. Isolated unit harness reports **26/26 pass**.
- Full corpus was re-run on classifier SHA 4d26e02e47adc32e32646dfa6c6c5b576ebfd2a9 after the overlap-filter change. Totals remain 114 files / 6,236 ayahs / 104,558 spans, all 21 rule IDs reachable, zero structural invariant failures. Four same-unit collision cases and the three no-explicit-mark Qalqalah cases remain unchanged.
- Durable report: docs/TAJWEED-CORPUS-EXECUTION-2026-10-09.md; issue ledger rows 80, 86–89 remain open to the exact degree described there.
- Current PR remains an implementation candidate only. Check Actions again on the newest PR head; do not merge or bump v5.17.136 based on the in-tool shim or isolated runtime.


### Autonomous checkpoint — 2026-10-09: overlap visibility fix and final corpus rerun

- Corrected `filterSpansByPrefs()` in `js/domain/tajweed.js`: it now filters only disabled rules and returns all active spans in stable start/end order. It no longer drops a second Tajweed rule merely because it occupies the same source range as another active rule.
- Clarified `colorizeWord()` in shared `js/views/tafsirPanel.js`: one glyph still receives one visible CSS rule class; for equal ranges the first enabled span in stable classifier order paints it. The inspector retains every enabled rule, and disabling the first rule lets the other one paint the glyph.
- Added the unit test `preference filtering preserves same-unit rule overlaps for the inspector`, checking default behavior and disabling either rule independently. Test blob: `b64d1acf92ab4e1f92ee7351b426954f8872cd57`. Isolated harness now reports **27/27 passing** against classifier source blob `4d26e02e47adc32e32646dfa6c6c5b576ebfd2a9`; this is not native Node or official CI.
- View documentation blob: `8e586328c8850483b25fc747bf1ce638a1bf8fab`. Corpus report updated at `docs/TAJWEED-CORPUS-EXECUTION-2026-10-09.md`; issue 88 changed to **corrected in code, pending integration verification**.
- Re-ran all 114 Qur'an JSON files in six batches against current classifier SHA `4d26e02e47adc32e32646dfa6c6c5b576ebfd2a9`: 6,236 ayahs, 104,558 spans, every 21 rule IDs reached. Zero raw-token-count mismatches, bad word indices, unknown rules, invalid offsets, exact duplicate spans, or data fetch/parse failures. Same-unit collisions remain exactly three `ghunnah+idgham_ghunnah` and one `ghunnah+idgham_no_ghunnah`; all overlap events are exact same-range collisions, not offset-drift overlaps. The three unmarked Qalqalah spans remain 11:42 route-sensitive `ٱرۡكَب`, 94:8 pause-final `فَٱرۡغَب`, and 96:19 pause-final `وَٱقۡتَرِب۩`.
- The corpus run is source-execution evidence, and 27/27 is an isolated shim, not official project-gate evidence. Actions was still queued at last inspection. Next: confirm CI result on the newest PR head, get native Node tests and browser checks, and inspect the actual overlapping word inspector in EN/AR + light/dark + small/desktop sizes. Do not merge PR #21 or advance formal release v5.17.136 without those gates.


### Autonomous checkpoint — 2026-10-09 04:35Z: refreshed PR/CI state and mergeability hold

- Re-fetched PR #21 from GitHub. Branch: `fix/tajweed-semantic-lookahead-2026-10-08`; current head SHA: `12fe3699f6b108ffc2716fa2b4cf72a75ff3123d`; base branch: `main`; base SHA: `2be9c5caada24b7b6afb2db61b4875f7496d5c20`; 109 commits / 9 changed files; PR remains open and unmerged.
- GitHub currently reports `mergeable: false`. Treat this as a hard merge hold, not as permission to force-merge or to advance the release marker. The connector response does not expose a definitive conflict list, so the next step is compare current base/head and inspect changed-file patches before attempting any resolution.
- Latest associated Actions run: `check` run 37878235372 — status `queued`, conclusion `null` (undefined). The returned run is queued; this is not test evidence.
- Current branch corpus report `docs/TAJWEED-CORPUS-EXECUTION-2026-10-09.md` records direct isolated execution of all 6,236 ayahs from 114 JSON files against classifier blob `ba7d1732190fc1a75de36b11e048fad0fb4a71f4`: 104,557 spans, all 21 rule identities reached, zero recorded structural invariant failures, four same-range multi-rule collisions, and two expected pause-final unmarked Qalqalah spans. The report explicitly distinguishes this from native Node/CI, browser verification, and scholarly-oracle validation.
- The targeted unit suite also has isolated-shim evidence only (the report contains historical 27/27 and 28/28 runs on different source/test snapshots); do not collapse those historical results into a claim that current native `npm run check` passed.
- Immediate next actions: inspect why the PR is non-mergeable, compare the current branch against current main, review the exact 9-file diff for stale/contradictory documentation, and keep working on code/test quality while CI is queued. No release bump, merge, or browser-pass claim until evidence exists.


### Autonomous checkpoint — 2026-10-09 04:40Z: main/PR release-lineage reconciliation

- Fresh live reads show that `main` has advanced to **v5.17.137**: `package.json` version `5.17.137` (blob `fd47947e0f87f6fb99d9813bcef1c496d5510ff0`), `js/core/config.js` APP_VERSION `5.17.137` (blob `b1df36c0429815f8bca4c67af9a7560ed2845cee`), `sw.js` cache prefix `nur-al-dhikr-v5.17.137` (blob `935840f42cacc08d14beb8018b08d7868c1a216f`), and `docs/RELEASES.md` contains a v5.17.137 entry (blob `f5abe9e170297d19eef04f0de44f2966c4eb9883`). Thus **v5.17.137 is the current main-branch version marker**, even though this does not by itself prove every verification gate passed. Earlier handoff text saying the current formal release is v5.17.136 describes the stale Tajweed branch, not current main; do not repeat it as current-main fact.
- PR #21 head is still `22520c6a26a8795a9591b9a3ba44a1691b600b58`; PR is open/unmerged and GitHub reports `mergeable: false`. Compare `main...fix/tajweed-semantic-lookahead-2026-10-08` returns `diverged`, main-side commit `61e26848a48dfba8540d7ce48dab22c45bd437f9`, merge base `2be9c5caada24b7b6afb2db61b4875f7496d5c20`, 110 ahead / 36 behind, and nine net changed files. No definitive conflict-file list was exposed. Treat the PR as a hard hold: **do not force merge, and do not overwrite current-main files with the stale branch wholesale**.
- Live file inspection confirms main already contains the Halqi Izhar identifier `IZHAR_HALQI_LETTERS`; the Tajweed branch also contains that correctly spelled identifier. Main has newer release-lineage changes in navigation and other product surfaces. Any integration must preserve those current-main changes while selectively porting Tajweed code/tests/docs and reconciling the issue ledger. A clean integration branch based on current main is a candidate approach only after the exact code delta and conflicts are understood.
- Actions query for the current head SHA returned no associated PR workflow runs in the connector response. The earlier run 37878235372 was queued for an older head; it must not be represented as a current-head result or as a pass. Native Node/CI and browser verification remain unproven.
- Documentation integrity finding: the corpus report includes historical test totals on older classifier/test blobs (27/27 and 28/28 isolated shim runs). The report's latest explicit current snapshot is classifier `ba7d1732190fc1a75de36b11e048fad0fb4a71f4`, test blob `cdca893dc31cb963b122ffc54d25378269d35858`, sweep-test blob `387e4eb1196253a5b1537109d3c33a3b289fb9bf`, and its final paragraph reports 28 synchronous shim tests—not native Node. Keep historical counts labelled by their exact snapshot; never summarize them as one run.
- Next safe actions: inspect the full PR patch and identify conflicts/semantic overlaps against current main; decide whether to port changes onto a fresh current-main branch rather than updating the stale PR; repair any stale handoff wording; keep rows 80, 86–89 open; seek real Node/CI/browser evidence; do not merge or claim Tajweed complete without evidence. No code, release marker, or merge state was changed in this checkpoint.



### Autonomous checkpoint — 2026-10-09 04:39Z: mergeability blocker narrowed; ledger reconciled

- Current PR #21 branch: `fix/tajweed-semantic-lookahead-2026-10-08`. The latest durable ledger correction is commit `72ac2cfb1892e23924fbd7f30601c9e253d8836e`; the branch tip will include this commit after GitHub updates its PR metadata. Formal release remains v5.17.136.
- Compared current `main` with PR #21's merge base `2be9c5caada24b7b6afb2db61b4875f7496d5c20`: main has advanced 36 commits / changed 36 files; the branch has 110 commits from the merge base. The PR is still reported `mergeable: false`.
- **Two substantive overlapping files explain the merge hold:** `js/domain/tajweed.js` and `docs/OPEN-ISSUES.md`. Main changed the Tajweed module after the branch point; notably, main's current `filterSpansByPrefs()` skips any span whose start is before the previous span's end, which hides overlaps. PR #21 intentionally changes that behavior to preserve same-unit rules for the inspector. This must be reconciled deliberately, not resolved by blindly choosing either side. The issue ledger has a semantic row-80 collision: main uses row 80 for a flaky navigation-shell test, while the branch uses row 80 for Tajweed Qalqalah. A naive merge could silently erase a real main issue. Do not force-merge or bulk-overwrite main.
- Updated the branch ledger in commit `72ac2cfb1892e23924fbd7f30601c9e253d8836e`: rows 80, 81, 82, and 89 now agree with the current corpus report and distinguish source-level correction from official verification. Added a warning that summary counts predate rows 79–89. The main ledger remains untouched.
- Latest corpus authority remains `docs/TAJWEED-CORPUS-EXECUTION-2026-10-09.md`, classifier blob `ba7d1732190fc1a75de36b11e048fad0fb4a71f4`: 114 files / 6,236 ayahs / 104,557 spans, 21/21 rule identities reached, zero observed structural invariant failures, four exact same-unit collisions, and **two** remaining unmarked pause-final Qalqalah spans. Older handoff paragraphs report 104,558 spans / three Qalqalah cases from earlier classifier snapshots; treat those as historical, not current.
- At the latest refresh, the workflow-run lookup and combined-status lookup for the current PR head returned no surfaced runs/statuses. An earlier `check` run was queued on an earlier head; it is not a pass and should not be reported as current-head evidence.
- Next safe work: (1) fetch PR metadata again and confirm the exact current head; (2) inspect the complete current-main vs PR diff for `js/domain/tajweed.js`, then transplant the required classifier changes onto a fresh branch from current main without losing main's intervening edits; (3) move the Tajweed issue rows to unused IDs on that fresh branch and preserve main row 80; (4) run native `npm run check` / CI and real browser tests if the environment supports them; (5) only then update/replace the PR. Do not rewrite main or change the release marker until these gates pass.


### Autonomous checkpoint — 2026-10-09 04:45Z: clean current-main Tajweed integration branch

- Because PR #21 is stale/diverged and GitHub reports it non-mergeable, a separate integration branch was created from the **current `main` ref**, named `fix/tajweed-audit-v5-17-137-2026-10-09`. This avoids force-merging or rebasing the stale branch in place.
- Selective port completed for `data/tajweed-sources.json`, `js/domain/tajweed.js`, `js/domain/tajweedSources.js`, `js/views/tafsirPanel.js`, and `tests/tajweed.test.js`. A source-level three-way comparison showed the only unique main-vs-merge-base line in `js/domain/tajweed.js` was the already-correct Halqi Izhar identifier; the Tajweed branch also contains that correction. Current main's release/version files were intentionally left untouched at v5.17.137.
- The corpus sweep test and its execution report were added to the integration branch. The report wording was corrected so the 27/27 isolated-shim result is explicitly historical, rather than incorrectly calling that older snapshot “current.” The latest report snapshot still states the current classifier/test blobs and 28/28 isolated-shim result; none of this is native Node or CI proof.
- The issue ledger was merged from current main, preserving main's existing row 80 (`navigation-shell` load-flakiness), then porting the Tajweed rows as unique IDs 81–90. Its header now counts 86 numbered rows. The old summary totals were explicitly relabelled historical because they predate these additions; a full status recount remains due. This avoids the stale PR's duplicate row-80 collision.
- Integration branch writes so far are source/test/docs-only. No release marker, service-worker cache version, or religious corpus text was changed. The branch is **not yet a release and has not been verified**.
- Next: audit the newly integrated tree against current main, run native project checks through GitHub Actions if triggered, inspect CI result for the final head, then seek real Chromium evidence. Only after reviewing the final tree should a new PR be opened; PR #21 remains open and stale for now and must not be merged as-is.


### Autonomous checkpoint — 2026-10-09 04:44Z: current-main integration PR opened

- Opened draft PR **#24**, https://github.com/AhmedKamal75/nur-al-dhikr/pull/24, from `fix/tajweed-audit-v5-17-137-2026-10-09` into `main`. This is the clean integration candidate; PR #21 is still stale and should not be merged as-is.
- Live re-fetch confirms PR #24 head `976f2dc51bb6144cd17479a569a0777b4705fb47`, base `61e26848a48dfba8540d7ce48dab22c45bd437f9`, mergeable **true**, comparison **ahead 10 / behind 0**. It is intentionally draft/unmerged pending checks and evidence.
- GitHub Actions run **37885188489** is associated with that head and is **queued**. Jobs listed: accessibility static gates; lint/format/unit tests on Node 24; 4-viewport evidence matrix + traces; lint/format/unit tests on Node 20; browser smoke + races; cross-engine release matrix (smoke/audio/a11y). Every job was queued at the last check; there is no pass/fail result yet.
- Keep release markers at v5.17.137. Do not claim the draft is verified just because GitHub currently says mergeable true or because the Actions jobs exist. Re-fetch PR/head after any new commit and use completed job conclusions/logs as evidence.


### Autonomous checkpoint — 2026-10-09 04:46Z: course taxonomy finding and correction

- A deeper cross-component audit compared canonical `data/tajweed-course.json`, the runtime mirror `js/domain/tajweedCourse.js`, the rule source registry, and course tests. It found that the fourth Madd session was titled “Obligatory madd / المد اللازمة” while focusing on `madd_6`, `madd_iwad`, `madd_badal`, and `madd_silah`. Madd Badal is a distinct category; ʿIwaḍ and Ṣilah have source-dependent taxonomy caveats. The old title overgeneralized the set.
- PR #24 now titles that session “Madd Lāzim, Badal, ʿIwaḍ, and Ṣilah” / “المد اللازم والبدل والعوض والصلة” in both canonical JSON and runtime mirror. The session ID remains unchanged to preserve saved course progress. A test pins the bilingual title and unchanged focus set.
- The `madd_6` source caveat in both canonical JSON and runtime mirror was rewritten to state clearly that the identifier names a six-count length, not six rule categories, and that the four forms of Madd Lāzim described in Tuhfat al-Atfal should not be conflated with distinct rules grouped in one session.
- New ledger row 91 remains OPEN pending native test/CI, Arabic pedagogy review, and browser rendering. The source edits have not been natively tested yet; do not close row 91 based on source changes alone.
- These commits advanced PR #24 after its first queued CI run. Re-fetch the current PR head and associated Actions before citing any CI result; old-head runs do not verify the latest commit.


### Autonomous checkpoint — 2026-10-09 04:48Z: Muqaṭṭaʿāt Madd classifier refinement

- A further hostile pass found the old `madd_6` description used isolated `آ` as an example, misleadingly conflating a common Madd Badal spelling with the six-count Madd Lazim condition. The legend now describes an original sukoon/shaddah and uses the corpus spelling `ٱلضَّآلِّينَ`.
- The Muqaṭṭaʿāt Madd branch previously assigned fixed `madd_6` to letter ʿayn despite its reported 4-or-6-count treatment, omitted Kaf, and inferred a letter-name rule from a marked consonant without validating the whole token skeleton. PR #24 now checks an explicit set of Muqaṭṭaʿāt base skeletons, recognizes Kaf, and emits the separate bilingual `madd_4_6` rule for ʿayn. Source registry JSON/runtime mirror and the Madd course focus include the new rule. Tests cover `كهيعص`, `عسق`, isolated marked Kaf, and the corrected Madd Lazim definition.
- This adds a rule identity (candidate: 22 registered rule IDs). The earlier direct corpus result of 104,557 spans / 21 rules was run against classifier blob `ba7d1732190fc1a75de36b11e048fad0fb4a71f4` **before** this correction; it is historical, not proof of the current candidate. Current classifier blob: `8edf33ae72fdb726bdb177828588665f7e7bec9e`; current classifier test blob at this checkpoint: `052cb7e4f64a554f372d071a2777e3a9d3a86deb`.
- New ledger row 92 records the issue and remains OPEN pending fresh full-corpus execution, native Node/CI, and Mushaf/browser evidence. Do not update the corpus totals or call the new rule verified until the current candidate is actually exercised.



### Canonical Tajweed integration selection — 2026-10-09 04:57Z

- **Active draft PR: #24** (`fix/tajweed-audit-v5-17-137-2026-10-09`), based on current main `61e26848a48dfba8540d7ce48dab22c45bd437f9`. It contains the semantic-lookahead / overlap / Qalqalah work plus the newly discovered Muqaṭṭaʿāt Madd correction: exact opening-token skeletons, Kaf recognition, a distinct `madd_4_6` rule for ʿayn, canonical/runtime citation entry, course-focus parity, and course regression. The new Madd rule expands the registry; the prior 104,557-span / 21-rule corpus report is historical and must not be applied to this candidate classifier.
- A second draft PR #23 was found with nearly duplicate classifier changes but without the Muqaṭṭaʿāt Madd/category/course additions. PR #24 is the more complete candidate. Before closing #23 as superseded, ensure #24 retains all useful corrections from it; the Madd Badal source locator fix from #23 was ported to both canonical JSON and runtime mirror (`lines: 46`).
- Fixed a genuine ledger regression in PR #24: the header had a duplicate stale count line and the “honest summary” heading/table had been replaced by a historical summary, which would break `tests/open-issues-ledger.test.js`. The current ledger now has 88 rows with parsed counts: 33 OPEN, 5 PROPOSED, 7 BLOCKED:scholar, 5 BLOCKED:device, 4 DECIDED-NO, 2 DEFERRED, 30 RESOLVED, 2 STANDING CONSTRAINT. Summary table now matches. Native test/CI confirmation still required.
- Corrected the Madd Badal source locator in both `data/tajweed-sources.json` and `js/domain/tajweedSources.js` to line 46; source mirror parity test explicitly checks these fields. Current source JSON/mirror contain the new `madd_4_6` rule.
- Latest known PR #24 head after these fixes: `48e4047a6270e942389b380576e13bd33e62ad99`; Actions run `37886350323` is **queued**, not a pass. No native `npm run check`, current-head CI pass, Chromium matrix, or scholarly validation has been observed.
- Next: wait/re-query current-head Actions; inspect test failures rather than papering over them; ensure corpus sweep's hardcoded two bare-Qalqalah and four collision invariants still hold under the new classifier; run `npm run check`; then test actual Mushaf painter/inspector and course EN/AR in Chromium. Keep v5.17.137 as current main baseline; do not merge or bump a release marker until evidence gates pass.



### Cleanup checkpoint — 2026-10-09 05:00Z

- Closed stale PR #21 (diverged/non-mergeable) and duplicate draft PR #23 as superseded by active draft PR #24. Their branches/discussions remain available; no merge occurred. PR #24 is the sole active Tajweed integration candidate.
- PR #24 current branch: `fix/tajweed-audit-v5-17-137-2026-10-09`, based on main SHA `61e26848a48dfba8540d7ce48dab22c45bd437f9`; mergeable at last refresh.
- Current ledger is 88 rows; computed buckets: 33 OPEN, 5 PROPOSED, 7 BLOCKED:scholar, 5 BLOCKED:device, 4 DECIDED-NO, 2 DEFERRED, 30 RESOLVED, 2 STANDING CONSTRAINT. Removed the duplicated stale header count and restored `## The honest summary` with matching bucket totals so `tests/open-issues-ledger.test.js` can validate it.
- Corrected Madd Badal citation locator in both canonical JSON and runtime mirror to line 46. Current canonical registry has 29 rule IDs, including the newly added `madd_4_6`; runtime mirror includes the same new rule. Exact mirror-parity checks are in the existing test suites.
- Confirmed corpus spellings in bundled source: 19:1 `كٓهيعٓصٓ`, 42:1 `حمٓ`, and 42:2 `عٓسٓقٓ`, so the new Muqaṭṭaʿāt Madd classifier has genuine corpus cases to exercise (not only synthetic fixtures).
- Latest PR #24 head at this checkpoint: `26ad8d629a9fb3f5901ec57a00c3682167418cf4`; current-head Actions lookup showed run `37886403905` queued, not passed. The next head may differ if more fixes are committed.
- Still required: native `npm run check`, inspect full-corpus sweep diagnostics under the new 29-rule registry, current-head CI pass, Chromium Mushaf inspector/painter and course EN/AR light/dark/phone/desktop evidence, and scholarly review. Do not close rows 81–92 or bump release marker merely because source edits exist.



### Source and pedagogy checkpoint — 2026-10-09 05:05Z

- Further review found that `madd_6`'s legend explained the ordinary word-level Madd Lazim example and the special ʿayn case, but omitted why the other marked Muqaṭṭaʿāt letter names are six-count. Updated bilingual EN/AR copy to explain both word-level original sukoon and six-count opening-letter names (e.g. lām, mīm, ṣād, qāf), while keeping ʿayn separate. Added a regression that pins both language explanations.
- Narrowed `madd_4_6`'s primary citation from the broad range 47–58 to Tuhfat al-Atfal verse 54, which says ʿayn has two faces and the longer is preferred. Added a secondary source record for A. D. al-Sayyid Isma'il Ali Sulayman's Egyptian Ministry of Awqaf article `al-Madd wa-l-Qasr`, whose opening-letter section explicitly explains the 4/6-count exception. Canonical JSON, runtime mirror, and regression test now pin both citations. URL is percent-encoded to avoid false positives in the project's Arabic-string scan.
- This does not close issue row 92: it still needs current-classifier full-corpus execution, official Node/CI, browser evidence, and a qualified reading-profile/source comparison. The primary Tuhfat verse's “longer preferred” and differing contemporary teaching descriptions should not be flattened into a universal claim.
- Source used for the primary verse text: Wikisource `تحفة الأطفال`, verse 54 (`https://ar.wikisource.org/wiki/تحفة_الأطفال`). Secondary source: Egyptian Ministry of Awqaf, `المد والقصر` by A. D. al-Sayyid Isma'il Ali Sulayman (`https://awkafonline.gov.eg/content-sections/116/5024/%D8%A7%D9%84%D9%85%D8%AF-%D9%88%D8%A7%D9%84%D9%82%D8%B5%D8%B1`).
- These code/source/test updates are now committed to PR #24. Do not merge while current-head CI is queued; let the latest head's full check matrix decide the next correction wave.



### Citation surfacing checkpoint — 2026-10-09 05:07Z

- The new Egyptian Ministry of Awqaf reference was initially present in the registry but not surfaced by the Mushaf Tajweed legend: `tajweedCitation()` returned only the primary work, and `tajweedSourceLine()` ignored secondary sources. Corrected the full path: only secondary sources with an openable URL are exposed by the helper, and the legend now displays a bilingual “Additional source / مرجع إضافي” line with the title, author, and external link.
- Added quiet secondary-text-color, semi-bold dotted-underlined link styling, keyboard `:focus-visible` outline, `noopener noreferrer`, and regressions for citation metadata plus CSS contrast/focus visibility. The external source URL is percent-encoded so the Arabic-string lint does not misread the URL as Latin words inside Arabic text.
- Latest code is on PR #24. No browser proof yet; the current-head CI matrix must confirm formatting, tests, accessibility, and actual Mushaf rendering before this can be called verified.



### Final static consistency sweep — 2026-10-09 05:09Z

- A manual reproduction of the source-registry Arabic-string lint found one pre-existing-in-this-branch defect introduced by the Madd Lāzim caveat: the Arabic sentence embedded the Latin identifier `madd_6`. Replaced it with Arabic-only wording in canonical JSON and runtime mirror.
- Re-ran the same recursive Arabic-string scan over the full canonical `data/tajweed-sources.json`: **zero Arabic-containing strings with Latin words** were found after the fix.
- Final intended candidate head before CI refresh: latest PR #24 branch commit. No additional source or version edits should be made unless the latest CI/test matrix exposes a concrete failure. Current corpus report still predates the `madd_4_6` rule; do not claim current-corpus pass until the current-head sweep runs.



### Documentation precision checkpoint — 2026-10-09 05:10Z

- Removed a stale “20 Tajweed rules” claim from the source-registry test header; the candidate now has 22 classifier rule identities and 29 citation-registry entries (some study entries are not classifier rules).
- The corpus report's closing summary had an older snapshot saying three bare Qalqalah cases. It is now explicitly marked historical and distinguishes the earlier three-case result, the later pre-PR-24 two-case run, and the **pending** current 22-rule PR-24 sweep.
- No new changes are planned unless the current-head CI identifies a concrete defect. Latest CI evidence must be fetched for the latest PR head, not inferred from queued older runs.



### Corpus-report SHA reconciliation — 2026-10-09 05:11Z

- Corrected the report's “current candidate classifier blob” wording. The first Muqaṭṭaʿāt Madd patch used blob `8edf33ae72fdb726bdb177828588665f7e7bec9e`; the current classifier blob is `9e638d4961a6c4cf2c758ad2fd7ad67e2c70ab7a` after bilingual legend-copy changes only (classification logic unchanged between those two snapshots).
- No corpus result is claimed for the current 22-rule classifier. The old 104,557-span / 21-rule and earlier three-Qalqalah results are historical. Current-head CI is the only available path to a native run while the local environment cannot reach GitHub.



### Final source-mirror parity audit — 2026-10-09 05:12Z

- A manual key-set comparison caught one real release-blocking drift: canonical `data/tajweed-sources.json` had 29 rule citations, but `js/domain/tajweedSources.js` had only 28 and omitted `izhar`, despite the classifier and course teaching Halqi Izhar on current main. Added the missing runtime entry (`tuhfat-al-atfal`, verses 6–13, `nun-sakinah` topic).
- Rechecked the canonical/runtime source key sets after the fix: **29 vs 29; no missing or extra rule IDs**. Full field parity and the official test remain pending CI. This would have failed `tests/tajweed-sources.test.js`'s existing “runtime module mirrors the canonical JSON exactly” gate, so it was worth catching before waiting on the queued runner.
- Current active branch remains PR #24; no release marker change, no merge, and current-classifier full-corpus execution is still pending.
