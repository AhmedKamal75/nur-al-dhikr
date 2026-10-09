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



### Mainline integration checkpoint — 2026-10-09 04:42Z

This integration branch was created from current `main` to resolve the stale-base conflict safely. It is not a release and has not yet been tested by native Node/CI or Chromium.

- Base: current `main` at branch creation. Branch: `integration/tajweed-mainline-2026-10-09`.
- Transplanted from the Tajweed deep-audit branch: `data/tajweed-sources.json`, `js/domain/tajweed.js`, `js/domain/tajweedSources.js`, `js/views/tafsirPanel.js`, `tests/tajweed.test.js`, `tests/tajweed-corpus-sweep.test.js`, and `docs/TAJWEED-CORPUS-EXECUTION-2026-10-09.md`.
- The issue ledger was merged by preserving main's existing row 80 (navigation-shell load flakiness) and appending Tajweed rows as 81–90. Header count updated from 76 to 86 rows, and OPEN count from 21 to 31. Summary buckets remain provisional until a complete status recount.
- Key source intent retained: semantic lookahead skips ornament-only tokens while rendering all raw tokens; overlap filtering preserves multiple same-unit Tajweed rules; Madd ʿĀriḍ requires a final consonant after the madd letter; Silah only applies to a properly vocalized hāʾ pronoun; Allah-lām tafkhim is context-aware; Qalqalah exceptions remain narrow and explicit.
- Corpus execution record is carried forward as historical execution evidence for classifier blob `ba7d1732190fc1a75de36b11e048fad0fb4a71f4`, not proof that the integration branch's resulting full tree has passed tests.
- The old PR #21 remains open/unmerged and stale-base. Do not merge it blindly. After the integration branch is reviewed and verified, open a fresh PR from this branch and close the old PR only after the replacement clearly supersedes it.
- Required next gates: compare current integration source against main for lost unrelated changes; verify canonical/runtime data mirror parity; native `npm run check` and `node --test`; wait for current-head CI; Chromium review of overlap inspector/painter in EN/AR and light/dark, phone/desktop; scholarly validation for route-sensitive Qalqalah and full-corpus rule accuracy. Keep v5.17.136 as formal release baseline until those gates are met.


### Follow-up audit — source locator and Qalqalah counter hardening (2026-10-09 04:45Z)

- Found a second source-integrity defect during the integration review: the Madd Badal registry entry now cites Tuhfat al-Atfal bayt 46, where the poem explicitly names the badal examples, instead of lines 47–58, which begin the Madd Lazim discussion. Both canonical JSON and runtime mirror were updated in commits `d8b6153ce4163b8be3c3ce9245f3db17d4b803cb` and `fd804f3958b0725137b9efaa75f59a8d882cca44`. This is grounded by the poem text surfaced in the research result, but the full registry remains subject to scholarly review.
- Found the original bare-Qalqalah counter's mark regex omitted U+0656/U+0657/U+065E, which can cause alternate Uthmani tanween to be miscounted as unmarked. Expanded the corpus test's mark detector to U+064B–U+065E. The exact count of two unmarked Qalqalah spans is now explicitly **provisional** until the current-head native test/CI result. Report and ledger updated to avoid overclaiming.
- Current branch has current-main ancestry and the draft replacement PR is #23: https://github.com/AhmedKamal75/nur-al-dhikr/pull/23. GitHub previously showed the PR mergeable after branch creation; each new commit requires a fresh head/status check. The newest observed Actions run remains queued until checked again; no pass is claimed.
- Keep working through current-head CI failures if any, verify JSON/runtime source registry parity, and compare the new corpus sweep's actual bare-Qalqalah output before closing any issue. Preserve release baseline v5.17.136.


### Further classifier audit — ornament-token base-letter defect (2026-10-09 04:46Z)

- Found and fixed a semantic-tokenization defect that the prior ornament lookahead regression did not cover: `isBaseLetter()` accepted every non-diacritic, non-space code point. Thus rub el hizb (`۞`) and numerals could be mistaken for pronunciation-bearing units even though the semantic index intends to skip ornament-only tokens. The classifier now accepts Arabic letters plus the two explicitly handled consonantal small marks; non-letter symbols/digits no longer become Tajweed units. Regression cases were added for rub el hizb and numeral tokens between noon-sakinah and a following yāʾ.
- Relevant commits: classifier fix `09f3c2b4055ec6dc1108e416a93af1e68070908c`, regex-escape correction `c102fd61a554031cdb6c526cfbfaf874e4cdbb61`, regression `32a267d19586b709e966c7218028da58c24fb696`, ledger update `0971c457c657a3ca4d88223d160b9d9d8789223d`. Issue row 91 tracks this until native Node/CI and browser verification pass.
- The original all-corpus execution's external test harness identified semantic tokens by Unicode-letter regex, which did not exactly mirror the classifier's earlier `tokenizeUnits()` behavior. The classifier and corpus-test assumptions are now better aligned, but the exact pause-final bare-Qalqalah count remains provisional until the current native sweep executes. Do not cite the prior two-case count as final yet.
- Current replacement draft is PR #23, branch `integration/tajweed-mainline-2026-10-09`. No CI pass has been observed on the newest head; queued runs remain queued. Keep PR draft and release baseline v5.17.136 unchanged pending evidence.


### Full-corpus rerun after tokenizer hardening — 2026-10-09 04:48Z

- Re-executed all 114 Qur'an JSON files / 6,236 ayahs against current classifier blob `abd7160a50d8d3f6ebbb77a7fad6b5cfd3ea04f1` in six batches. Total spans: **104,554**. All 21 rule IDs were reached. Zero token-count mismatches, incorrect one-based word indices, unknown rule IDs, invalid span offsets, or duplicate exact spans were observed. Four same-unit overlap cases remain: three `ghunnah+idgham_ghunnah`, one `ghunnah+idgham_no_ghunnah`. With the expanded U+064B–U+065E mark detector, exactly two unmarked pause-final Qalqalah spans remain: `فَٱرۡغَب` (94:8) and `وَٱقْتَرِب۩` (96:19).
- Range totals are now 53,914 (surahs 1–19), 25,489 (20–38), 14,866 (39–57), 6,962 (58–76), 2,554 (77–95), and 769 (96–114), totaling 104,554. These supersede the earlier 104,557 total from the older classifier snapshot.
- The first attempt to restrict `isBaseLetter()` to Arabic Unicode letters accidentally removed dagger alif as a dedicated madd unit, reducing madd counts by thousands. That attempt was caught by corpus counts and a direct comparison (`وَٱلضُّحَىٰ` lost `madd_2`). The allowlist now explicitly preserves dagger alif and small-letter marks U+06E5–U+06E8 while excluding non-letter ornaments/numerals. The full rerun was performed only after this correction.
- This is direct classifier execution in the available JavaScript runtime, not native `node --test`, `npm run check`, CI completion, Chromium/device evidence, or scholarly oracle validation. The newest branch head has changed since the run due to report/ledger/handoff commits, but the classifier blob is unchanged. Current-head CI remains the next external gate; do not mark rows 80–91 resolved or advance v5.17.136.


### Source registry parity regression found and repaired (2026-10-09 04:51Z)

- A direct parity audit found another real defect that static visual review would miss: canonical `data/tajweed-sources.json` had 28 rule entries while `js/domain/tajweedSources.js` had 27 and omitted `izhar`, even though the JSON entry existed and was sourced to Tuhfat al-Atfal 6–13. Added the missing runtime mirror entry on this integration branch and reopened issue row 79 until the native registry test/current-head CI pass. This also corrects the earlier claim that the Izhar work was fully resolved.
- Re-ran a direct JS parity check after the fix: canonical JSON and runtime mirror now both have 28 rule keys, key sets match, no per-entry work/lines/review/caveat/label drift was found, the four work keys match, and `uncitedTajweedRules()` returned no uncited keys. This is direct execution in the available JS runtime, not native Node or CI evidence.
- Latest changes include the classifier base-letter allowlist (including dagger alif and U+06E5–U+06E8), robust corpus mark detection, corrected Madd Badal locator at bayt 46, and the missing Izhar mirror. Continue to use PR #23 as the draft integration branch; current-head CI and browser evidence are still required.



### Autonomous checkpoint — 2026-10-09 04:57Z: replacement PR ready for evidence gates

- Use **draft PR #23** as the current review vehicle: https://github.com/AhmedKamal75/nur-al-dhikr/pull/23. It is based on current main SHA `61e26848a48dfba8540d7ce48dab22c45bd437f9`, current head `f0cfb00e44762ca39135a126af36fd9a71a79927`, and GitHub currently reports `mergeable: true`. It changes nine files. Old PR #21 remains stale-base/unmergeable; do not merge it.
- Current-head GitHub Actions run: `37886200867`, workflow `check`, event `pull_request`, status **queued**, conclusion null. Link: https://github.com/AhmedKamal75/nur-al-dhikr/actions/runs/37886200867. Queued is not a pass; query the run again before reporting results.
- The current classifier blob is `92f4fba4747024582c3334400bc6d3437732d5ef`. The corpus report's historical run used `abd7160a50d8d3f6ebbb77a7fad6b5cfd3ea04f1` (104,554 spans); the earlier report snapshot at `ba7d1732190fc1a75de36b11e048fad0fb4a71f4` had a separate 104,557-span result. Neither count is valid for the current integration classifier until rerun. The report now explicitly states this limitation.
- Current registry audit: canonical JSON `rules` has 28 keys; runtime mirror has 28; direct key-set parity is exact. The handoff records a further direct check of per-entry work/lines/review/caveat/label fields and `uncitedTajweedRules()`, with no drift / no uncited IDs. Still require native `tests/tajweed-sources.test.js`, `npm run check`, and current-head CI.
- Ledger rows 79, 81–83, and 89–90 were reconciled to avoid implying historical corpus results validate the current classifier blob. Main row 80 remains the navigation-shell flakiness issue; Tajweed rows occupy 81–91. The ledger header's counts (87 issue rows, 33 OPEN, 29 RESOLVED, 7 scholar-blocked, 5 proposed, 5 device-blocked, 4 decided-no, 2 standing constraints, 2 deferred) match the current row-level status buckets when dual-tagged OPEN/device rows are counted as OPEN.
- Recent source-level addition row 91 narrows tokenizer base letters to Arabic letters plus explicit dagger alif/special small-letter signs, excluding ornaments and numerals from semantic lookahead. Regressions cover rub el hizb and numeral tokens between noon-sakinah and a following letter.
- Next work: monitor the queued CI run; inspect failures rather than patching speculatively; if green, still require a fresh current-classifier full-corpus execution plus Chromium review (EN/AR, light/dark, phone/desktop) of overlaps, ornament lookahead, Silah, lām shamsiyyah and Allah-lām. Route-sensitive Qalqalah remains a scholar/source decision. No merge and no release bump; formal release remains v5.17.136.



### Current-classifier corpus execution checkpoint — 2026-10-09 05:01Z

- Completed a new full-corpus run against the current integration classifier blob `92f4fba4747024582c3334400bc6d3437732d5ef`, fetching and parsing all 114 `data/quran/*.json` files from the same integration branch. The actual `classifyAyahTajweed(ayah.text)` function ran for all 6,236 ayahs in 13 bounded batches.
- Current exact total: **104,554 spans**; all 21 registered rule IDs reached; zero raw-token-count mismatches, invalid one-based word indices, unregistered rule IDs, invalid/out-of-bounds offsets, or duplicate exact `wordIndex:start:end:rule` spans. All file fetches and JSON parses succeeded.
- Four same-written-range collisions were re-observed: three `ghunnah+idgham_ghunnah` (6:39 `صُمّٞ`, 27:10 and 28:31 `جَآنّٞ`) and one `ghunnah+idgham_no_ghunnah` (3:153 `بِغَمّٖ`). Two unmarked pause-final Qalqalah spans remain: 94:8 `فَٱرۡغَب`, 96:19 `وَٱقْتَرِب۩`. These are recorded in the updated corpus report and ledger.
- Important: this remains isolated JS-runtime execution after removing top-level ES-module `export` modifiers. It is stronger than static scanning, but it is not native `node --test`, `npm run check`, completed GitHub Actions, real browser UI verification, or scholarly gold-label validation.
- Current integration PR #23 is draft and GitHub reports it mergeable. Latest branch commit when this checkpoint was written: `0ba636730064a0669e0162464bc7fe5dff1fa4cb`; Actions run `37886564679` on that commit is **queued**, not passed: https://github.com/AhmedKamal75/nur-al-dhikr/actions/runs/37886564679. Another run is queued on the report update commit `854a85571c448b1796b33688eedc39a6ccbabbfb`; monitor the exact branch head and run before interpreting.
- Current issue ledger is snapshot-accurate for these corpus results. Row 79's mirror fix is recorded as source-level parity checked but native verification pending. Rows 81–83 and 89–90 now distinguish the current corpus execution from still-open scholarly/native/browser gates. Row 91 remains open for native verification of ornament/numeral tokenizer exclusions.
- Next: inspect current CI failures or passes, don't infer from queue status. Then inspect current-head test results and perform the real Chromium integration review. Formal release remains v5.17.136; no merge until all gates are met.



### Owner closure event — 2026-10-09 05:02Z

- The repository owner closed PR #23 at 2026-10-09 04:59:47Z. This was confirmed from the GitHub issue-event timeline; it was not inferred from a stale PR snapshot.
- Respect that action: **do not reopen PR #23 or create a replacement PR unless the owner asks.** The working branch remains saved and current at `integration/tajweed-mainline-2026-10-09`, head `97a0d07ab687df1531469b73c6dab6942c44064a`. The PR's stored head SHA is older than the branch head because the branch received additional commits after closure; don't treat the closed PR's head SHA as the latest code.
- Current classifier corpus rerun, ledger reconciliation, source/runtime parity correction, and the historical-vs-current execution boundary are saved in the branch. GitHub Actions runs created for earlier branch heads remain queued at last check; they are not passes and may not reflect the latest branch commit. The latest full-corpus run is the isolated JS execution described above.
- Continue source-level review and persist findings on the branch without reopening the PR. Keep v5.17.136 as the formal release baseline.
