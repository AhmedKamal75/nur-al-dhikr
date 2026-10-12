## Cross-rasm mismatch reproduction and candidate patch — 2026-10-10

Direct execution against the exact checked-in Qur'an/Mushaf strings reproduced three spelling-dependent classifications:

- **2:4 and 2:8 — Madd Badal:** corpus `أٓ` classified as `madd_badal`, while Mushaf `ـَٔا` fell through to `madd_2`.
- **4:1 — Madd Iwaḍ:** corpus `رَقِيبٗا` did not receive ayah-final `madd_iwad`, while Mushaf `رَقِيبًا` did. The alternate U+0657 form is recognized only in the final-before-bare-alif context.
- **2:18 — Iqlab:** the corpus spelling `صُمُّۢ` omitted Iqlab while Mushaf `صُمٌّۢ` included it. U+06E2 is now treated as an explicit signal, independent of whether a separate tanween code point is present.

The candidate is on branch `fix/quran-mushaf-rasm-consistency-mainline-2026-10-10` as of this report update. GitHub issue [#31](https://github.com/AhmedKamal75/nur-al-dhikr/issues/31) tracks the work. Source text is unchanged.

**Still open:** independently rerun the local agent's reported 1,221/6,236 ayah and 52.5% per-word totals against this new classifier, examine the exported full-corpus diagnostic artifact, prove glyph positions in Chromium, and obtain source-backed scholarly review. The new audit job is explicitly diagnostic (it records mismatch counts rather than hiding them); it does not itself establish that all rules are correct. Ledger row 99 remains OPEN until those criteria are met.

# Tajweed full-corpus execution and anomaly report — 2026-10-09

**Status:** the all-surah classifier execution/invariant gate was completed in an isolated JavaScript runtime. The repository's Node test runner, GitHub Actions jobs, browser matrix, and a scholarly reference comparison remain unverified.

## Exact inputs and method

- Repository: `AhmedKamal75/nur-al-dhikr`
- Working branch for the current authoritative rerun: `integration/tajweed-mainline-2026-10-09`.
- Exact classifier source blob for the current authoritative rerun: `92f4fba4747024582c3334400bc6d3437732d5ef`. It includes the narrow Qalqalah/Muqaṭṭaʿāt handling, ornament-aware semantic lookahead, context-aware lām rules, corrected Madd heuristics, and same-unit overlap preservation.
- Corpus inputs for the current authoritative rerun: `data/quran/1.json` through `data/quran/114.json`, fetched from the same integration branch.
- Historical note: earlier runs in this report used classifier blobs `abd7160a50d8d3f6ebbb77a7fad6b5cfd3ea04f1`, `ba7d1732190fc1a75de36b11e048fad0fb4a71f4`, and older test snapshots. Those runs are not the current source identity; the dedicated `Current integration snapshot rerun` section below is authoritative for the present branch.
- Execution method: the ES-module source was fetched from GitHub, its top-level `export` modifiers were removed for evaluation, it was compiled/executed with `new Function` in the available JavaScript tool runtime, and the actual `classifyAyahTajweed(ayah.text)` function was invoked for each corpus ayah. Data files were parsed as JSON. The implementation was processed in six ranges to stay inside the tool-call limit.
- This is real classifier execution against the bundled text, not merely static scanning. It is **not** an official `node --test` / `npm run check` run and does not prove UI integration or scholarly correctness.

## Execution totals

| Surahs    |   Files |     Ayahs | Spans produced | Same-unit multi-rule collisions | Unmarked Qalqalah spans |
| --------- | ------: | --------: | -------------: | ------------------------------: | ----------------------: |
| 1–19      |      19 |     2,348 |         53,914 |                               2 |                       0 |
| 20–38     |      19 |     1,710 |         25,489 |                               2 |                       0 |
| 39–57     |      19 |     1,046 |         14,866 |                               0 |                       0 |
| 58–76     |      19 |       518 |          6,962 |                               0 |                       0 |
| 77–95     |      19 |       484 |          2,554 |                               0 |                       1 |
| 96–114    |      19 |       130 |            769 |                               0 |                       1 |
| **Total** | **114** | **6,236** |    **104,554** |                           **4** |                   **2** |

All 21 entries in the current `TAJWEED_RULES` registry were reachable in the corpus. This is 21 rule identities, not the older shorthand count of 20 in earlier handoff text.

The following structural invariants had **zero observed failures across all 6,236 ayahs**:

- returned raw-token count matched the source's whitespace-token count;
- each result had the expected positive, one-based word index;
- every span used a registered rule ID;
- every span had integer, ordered, in-bounds offsets;
- no duplicate `start:end:rule` spans;
- no corpus file fetch or JSON parse failures.

The current `tests/tajweed.test.js` file was also executed in an isolated JavaScript harness after stripping its Node imports and supplying small synchronous `test` / `assert` shims: **27/27 test cases passed** on classifier SHA `4d26e02e47adc32e32646dfa6c6c5b576ebfd2a9` and test blob `b64d1acf92ab4e1f92ee7351b426954f8872cd57`. This is not Node's native test runner. The extra regression asserts same-unit overlaps survive preference filtering, and verifies each collision rule can be independently disabled.

## Anomalies requiring follow-up

### 1. Four same-written-unit rule collisions

The classifier produces these four overlaps; they are not four arbitrary offset errors:

| Location | Written unit | Rules sharing the exact same span | Initial assessment                                                                                 |
| -------- | ------------ | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| 3:153    | `بِغَمّٖ`    | `ghunnah` + `idgham_no_ghunnah`   | Shaddah-ghunnah on the mīm and tanween assimilation into the next lām coexist at one written unit. |
| 6:39     | `صُمّٞ`      | `ghunnah` + `idgham_ghunnah`      | Shaddah-ghunnah and tanween idgham into the next wāw coexist.                                      |
| 27:10    | `جَآنّٞ`    | `ghunnah` + `idgham_ghunnah`      | Shaddah-ghunnah and the word-final tanween's next-word idgham coexist.                             |
| 28:31    | `جَآنّٞ`    | `ghunnah` + `idgham_ghunnah`      | Same pair as 27:10.                                                                                |

The raw classifier reports both rules. The original `filterSpansByPrefs()` dropped later overlaps, which hid the secondary rule from the inspector. This has now been corrected: preference filtering keeps all enabled spans in stable source order, so the inspector lists both phenomena and respects per-rule on/off preferences. The painter still emits one CSS rule class per written glyph; when ranges are equal, stable classifier order chooses the first enabled span for color, and disabling that rule lets the next enabled rule paint. The policy is now explicit in `js/views/tafsirPanel.js` and covered by a direct regression. The row remains **OPEN** for official Node/CI execution and real browser/visual inspection, not because the filter still discards secondary rules.

The corpus sweep test was strengthened to pin the observed collision inventory: three `ghunnah+idgham_ghunnah` cases and one `ghunnah+idgham_no_ghunnah` case. Any new or missing pair now requires deliberate review. The earlier full-corpus rerun on classifier source blob `ba7d1732190fc1a75de36b11e048fad0fb4a71f4` reproduced these summary counts at that snapshot. The later `Current integration snapshot rerun` below is the authoritative record for current source blob `92f4fba4747024582c3334400bc6d3437732d5ef`. All four rule overlaps are exact same-range collisions; no differently ranged partial-overlap cases were observed.

### 2. Two remaining Qalqalah spans without an explicit sukun/diacritic inside the highlighted slice

- **94:8 — `فَٱرۡغَب`:** final-word bāʾ. A pause at the ayah end induces the expected Qalqalah; the source word has no explicit mark inside the one-character span.
- **96:19 — `وَٱقۡتَرِب۩`:** final-word bāʾ followed by the sajdah ornament. As an ayah-final stop, the unmarked highlighted letter is expected under the current pause model.

The earlier third case, **Hūd 11:42 — `ٱرۡكَب مَّعَنَا`**, is now handled through an exact lexical boundary exception. The suppression requires the exact base spelling of `ٱرۡكَب`, a final bāʾ, and a following mīm marked with shadda. It does not suppress arbitrary bāʾ→mīm boundaries. The regression confirms this exact phrase does not receive an independent Qalqalah span while an unrelated synthetic `اُكْتُبْ مَّعَنَا` still does.

**Important scholarly limitation:** sources do not present this boundary as an unqualified, universal rule. A textbook-style tajweed explanation explicitly says the bāʾ is not qalqalah when assimilated into the following mīm (example `أَرْكُبْ مَعَنَا`): https://www.cia.gov/library/abbottabad-compound/F1/F18483B3EEC4A3C5EB18ADAD655572CC_Dc1.pdf. By contrast, Ibn al-Jazarī’s `التمهيد في علم التجويد`, reproduced by Islamweb, says where a sakin bāʾ meets mīm (including `يا بني اركب معنا`) both izhār and idghām are permitted: https://www.islamweb.net/ar/library/content/230/55/?idfrom=&idto=&start=. A modern teacher describing a Hafs recitation lesson also labels the site an idghām of same articulation-different quality: https://www.youtube.com/watch?v=_4mtvyXp_xk. The implementation therefore records the app’s chosen lexical convention, not scholarly unanimity. Keep issue 80 **OPEN** until the app’s reading/profile policy and preferred teaching reference are made explicit.

A proposed generic cross-word Qāf→Kāf guard was separately removed after source review; the documented special qāf case remains lexical/reading-scoped (including `نخلقكم`), not a blanket rule for any qāf+sukūn followed by shaddah-marked kāf.

The corpus sweep now expects exactly two unmarked Qalqalah spans, corresponding to the two ayah-final pause cases above. In the final direct run, all 6,236 ayahs executed; structural invariants passed; there were no fetch/parse failures. The targeted Tajweed unit file passed 28/28 in the isolated shim. This is still not native Node/CI, browser evidence, or a scholarly validation of every rule.

## Verification boundary and next gate

Done in the isolated JavaScript runtime: all 114 JSON sources loaded; all 6,236 ayahs executed; all 21 rule IDs reached; structural invariants passed; the four same-unit overlap cases and two unmarked pause-final Qalqalah spans were isolated and documented.

Still not done: official `npm run check` / `node --test`, CI completion, Chromium/browser/device matrix, visual review of the word inspector and color painter on overlap cases, and a surah-by-surah comparison against a trusted Tajweed annotation/reference. GitHub Actions being queued is not a pass. Keep rows 79, 80, 86, 87, 88, and 89 open until their specific verification requirements are met. The classifier blob named in this historical paragraph is `abd7160a50d8d3f6ebbb77a7fad6b5cfd3ea04f1`; the current integration snapshot is `92f4fba4747024582c3334400bc6d3437732d5ef`. An earlier snapshot of `tests/tajweed.test.js` passed 28 synchronous tests under an isolated shim; that is historical evidence, not a result for the current test file and not native Node. The current corpus sweep test blob is `9abdcebfb89e1d0ae12036604366c7376be93c05` and its mark detector covers the expanded Uthmani range.

This report records classifier execution and anomalies; it is not a claim that all Tajweed rules have been scholarly-validated or that the feature is release-ready.

## Counter correction discovered during integration review

The counter's mark detector was broadened to include corpus-attested U+0656, U+0657, and U+065E, then the full corpus was re-executed against classifier blob `abd7160a50d8d3f6ebbb77a7fad6b5cfd3ea04f1`. The expanded detector still found exactly two unmarked pause-final Qalqalah spans: فَٱرۡغَب (94:8) and وَٱقْتَرِب۩ (96:19). The classifier's `isBaseLetter()` was also corrected to exclude non-letter ornaments/numerals while explicitly preserving dagger alif and the four corpus-attested small-letter signs; this matters because a first attempted filter accidentally dropped thousands of madd spans. This full-corpus rerun is direct isolated JavaScript execution, not native Node/CI.

## Integration snapshot validity correction — 2026-10-09

The earlier run in this report used classifier blob `abd7160a50d8d3f6ebbb77a7fad6b5cfd3ea04f1`. A second full-corpus run was subsequently performed against the exact current integration classifier blob `92f4fba4747024582c3334400bc6d3437732d5ef`; its independently accumulated total also equals 104,554 spans. The current-snapshot run and its per-range totals are recorded below. This remains isolated JavaScript-runtime evidence, not native Node/CI or browser proof.

The runtime citation registry's rule-key set was compared with the canonical JSON `rules` key set on the integration branch: 28 keys on each side, with no missing or extra IDs. A later full-structure comparison found that nine `also` entries had lost alternate citation locators in the runtime mirror; these were corrected, and the complete structure now matches in isolated execution. See `Runtime citation-mirror parity audit` below. Native registry tests remain required.

## Current integration snapshot rerun — 2026-10-09 04:58Z

**Authoritative execution snapshot for this section**

- Branch: `integration/tajweed-mainline-2026-10-09`
- Exact classifier blob: `92f4fba4747024582c3334400bc6d3437732d5ef`
- Input: `data/quran/1.json` through `data/quran/114.json`, fetched from this same branch; all files parsed successfully.
- Method: fetched the classifier module, removed top-level ES-module `export` modifiers, compiled the actual module body in an isolated JavaScript runtime, then called `classifyAyahTajweed(ayah.text)` for every ayah. Each nine-surah batch fetched the exact same classifier blob. This is direct classifier execution, but **not** the repository's native Node test runner, GitHub Actions completion, UI integration, or scholarly validation.

| Surah range |   Files |     Ayahs |       Spans |
| ----------- | ------: | --------: | ----------: |
| 1–9         |       9 |     1,364 |      36,042 |
| 10–18       |       9 |       886 |      16,739 |
| 19–27       |       9 |     1,002 |      13,831 |
| 28–36       |       9 |       536 |      10,569 |
| 37–45       |       9 |       722 |       9,941 |
| 46–54       |       9 |       391 |       5,199 |
| 55–63       |       9 |       298 |       4,586 |
| 64–72       |       9 |       276 |       3,200 |
| 73–81       |       9 |       354 |       2,158 |
| 82–90       |       9 |       214 |       1,210 |
| 91–99       |       9 |       103 |         619 |
| 100–108     |       9 |        61 |         310 |
| 109–114     |       6 |        29 |         150 |
| **Total**   | **114** | **6,236** | **104,554** |

**Current-snapshot structural invariants**

- All 21 registered classifier rule IDs were reached at least once across the corpus.
- Zero raw-token-count mismatches; zero invalid one-based word indices; zero unknown/unregistered rule IDs; zero invalid/out-of-bounds spans; zero duplicate exact `wordIndex:start:end:rule` spans.
- Four exact same-written-range multi-rule collisions: three `ghunnah + idgham_ghunnah` (6:39 `صُمّٞ`, 27:10 `جَآنّٞ`, 28:31 `جَآنّٞ`) and one `ghunnah + idgham_no_ghunnah` (3:153 `بِغَمّٖ`).
- Two remaining Qalqalah spans without an explicit sukun mark in the span: 94:8 `فَٱرۡغَب` and 96:19 `وَٱقۡتَرِب۩`. These remain expected pause-final/waqf cases requiring a reference-backed policy, not silent auto-fixes.
- All 114 file fetches and JSON parses succeeded. This sweep checks structural invariants and observed anomalies; it is not a scholarly gold-label comparison and cannot establish that every Tajweed classification is correct.

**Still open:** current-head native `npm run check` / `node --test`, completed GitHub Actions, actual Chromium rendering and inspector behavior (EN/AR × light/dark × phone/desktop), and a trusted-source comparison for rule-level correctness.

## Painter overlap audit — 2026-10-09 05:04Z

The current classifier blob `92f4fba4747024582c3334400bc6d3437732d5ef` was executed over the same 114-file corpus again to inspect pairwise span intersections within each word, not just exact same-range collisions.

- **Zero partial/nested intersections** were found: no pair of spans with overlapping character ranges but different `start:end` boundaries.
- Exactly **four equal-range pairs** were found, matching the collision list above. All four are the known ghunnah + idgham cases.
- This supports the current painter's deterministic “first enabled span colors the glyph” behavior for the corpus as it exists today: the only observed overlaps have identical ranges. It does **not** prove synthetic/future classifier output can never produce partial overlaps, nor does it replace browser checks of the inspector and toggles.
- A test-level follow-up remains worthwhile: explicitly define the painter contract for partial overlaps (either split glyph runs or reject/diagnose them), rather than silently skipping an overlapping span without a visible diagnostic. The corpus currently provides no partial-overlap example to force a policy.

## Runtime citation-mirror parity audit — 2026-10-09 05:10Z

- Canonical registry: `data/tajweed-sources.json` blob `dbc569060d76b7d0126a0916290353ac32289292`.
- Runtime registry after correction: `js/domain/tajweedSources.js` blob `6b34dd48f4b38e0acfc450a3ea6e619b17da25d4`.
- Finding: nine `also` entries had been flattened from full citation objects (`work`, `lines`, `review`) to bare work-ID strings. A prior partial parity test did not compare `also`, so it missed this source-locator loss.
- Correction: all nine runtime entries now preserve the full alternate-citation objects. `tests/tajweed-sources.test.js` now deep-compares the complete runtime `TAJWEED_SOURCES` and `TAJWEED_WORKS` structures to the canonical JSON, including nested metadata.
- Verification: the current JS module was evaluated in an isolated JavaScript runtime; canonicalized full-object comparison passed for all **28 rule entries and 4 works**. This is a direct parity execution, not the native Node test or CI result.
- Native verification remains pending. Do not close ledger row 92 until `npm run check`/native tests pass on the current source.

## Arabic bibliographic-title correction — 2026-10-09 05:12Z

- The runtime citation surfaced the Arabic title for _al-Tamhid_ as `التهويد في علم التجويد`. Catalog/text records identify the correct title as `التمهيد في علم التجويد` (Quranpedia: https://quranpedia.net/book/131; Islamweb: https://www.islamweb.org/ar/library/index.php?ID=1&bk_no=230&idfrom=1&page=bookcontents).
- Corrected the canonical JSON and runtime JS mirror, then added a regression assertion in `tests/tajweed-sources.test.js`.
- Isolated execution confirms the Arabic title is identical in the canonical registry, runtime registry, and alternate-citation output. Full runtime/canonical parity still passes in the isolated JS check. Native Node/CI and browser evidence remain pending.

## Alternate-source visibility — 2026-10-09 05:13Z

- The runtime registry's `also` citations were previously not surfaced by `tajweedCitation()` or the Mushaf legend. The helper now resolves each alternate citation to localized title and author plus locator/review metadata, and `tajweedSourceLine()` emits an additional escaped source line for each alternate.
- Regression coverage checks English and Arabic alternate-source metadata, and source/runtime full-object parity remains exact in isolated execution.
- The UI change is not browser-verified. Row 94 remains open for the EN/AR × light/dark × phone/desktop rendering and wrapping review; native Node/CI is also pending.

## Current source-test snapshots — 2026-10-09 05:15Z

The following checks were executed against the exact source/test blobs below using isolated synchronous JavaScript harnesses that supplied small `test` and `assert` shims. These are **not** native Node test-runner results.

| Check                                                         | Source / fixture blob                                                                                                                                | Result                                                                                               |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Tajweed classifier unit tests                                 | classifier `92f4fba4747024582c3334400bc6d3437732d5ef`; test `d1bb1b04e4c1a20c5a271afb2225dece222bfe4a`                                               | **29/29 passed**                                                                                     |
| Citation registry invariants and complete JSON/runtime parity | JSON `607c221d95138112ce507733e466e7ac1d9c3d11`; runtime `0589d00d802542f388280bebd3ef7f7f10969ff3`; test `587c54ceddfb8493bfe6fe431dbff4ae43747f0c` | **11/11 passed**                                                                                     |
| Full citation/work object comparison                          | Same JSON/runtime blobs                                                                                                                              | **28/28 rule objects and 4/4 work objects matched exactly**                                          |
| Full corpus classifier execution                              | classifier `92f4fba4747024582c3334400bc6d3437732d5ef`; 114 bundled surah files                                                                       | **6,236 ayahs; 104,554 spans; all 21 rule IDs reached; zero recorded structural invariant failures** |

Still unverified: native `npm run check` / `node --test`, completed current-head GitHub Actions, Chromium rendering and interactions, and scholar/reference sign-off. Do not promote shim execution into a CI pass.

## Post-normalization current-source rerun — 2026-10-09

After the attached-token normalization fix, the exact current classifier blob `b48dfcb6f82068195a26d7639f2a36297e8d67be` was fetched and executed directly over the bundled Quran corpus on `integration/tajweed-clean-mainline-2026-10-09`. Each range was executed in a fresh isolated JavaScript runtime against that exact source blob; the official Node runner was not available through this connector.

| Surahs    |     Ayahs |       Spans | Same-range collisions                                         | Unmarked Qalqalah spans |
| --------- | --------: | ----------: | ------------------------------------------------------------- | ----------------------: |
| 1–15      |     1,901 |      46,485 | 1 ghunnah + idgham-ighunnah; 1 ghunnah + idgham-no-ighunnah   |                       0 |
| 16–30     |     1,568 |      24,420 | 2 ghunnah + idgham-ighunnah                                   |                       0 |
| 31–45     |     1,041 |      16,217 | 0                                                             |                       0 |
| 46–60     |       653 |       8,959 | 0                                                             |                       0 |
| 61–75     |       428 |       4,792 | 0                                                             |                       0 |
| 76–90     |       452 |       2,602 | 0                                                             |                       0 |
| 91–105    |       150 |         851 | 0                                                             |                       2 |
| 106–114   |        43 |         228 | 0                                                             |                       0 |
| **Total** | **6,236** | **104,554** | **3 ghunnah + idgham_ghunnah; 1 ghunnah + idgham_no_ghunnah** |                   **2** |

**Observed results across all eight batches:** all 114 JSON files loaded and parsed; all 6,236 ayahs executed; all 21 registered rule IDs were reached. There were zero word/token-count mismatches, invalid word indices, invalid span offsets, unknown rule IDs, duplicate exact spans, or fetch/parse failures. The four equal-range pairs match the previously documented inventory; two unmarked Qalqalah spans remain, consistent with the known ayah-final pause examples.

This rerun **does validate current-source structural execution after the normalization change**, unlike the earlier predecessor-blob run. It is still not `node --test`, `npm run check`, GitHub Actions success, visual browser testing, or a scholarly gold-label comparison. The result must not be described as proof that every Tajweed classification is correct.

## Current classifier unit-test rerun — 2026-10-09

- Exact classifier blob used in the latest harness: `60b9b294d91420c45eb05382c6492172f9491302`.
- Exact test blob: `067f660834412228f8bdb3ea9d080b3124421fd7`.
- Result: **30/30 test cases passed** in an isolated synchronous JavaScript harness, including the attached rub el-hizb/numeral divine-name regressions and all existing cases in `tests/tajweed.test.js`.
- The classifier blob changed from the full-corpus run (`b48dfcb6f82068195a26d7639f2a36297e8d67be`) only in the exported `TAJWEED_FAMILY_VARS` mapping: custom family colors now set dedicated `--tw-user-*` overrides. `classifyAyahTajweed()` and its classification logic were not changed by that mapping edit; the full corpus was not re-run against the new exact file hash.
- Harness method: the Node imports were removed, test registration was shimmed synchronously, and the assertions used by this file (`equal`, `ok`, `deepEqual`, `match`) were supplied by a small local strict subset. This executes the test functions but is **not** the native `node:test` runner; it cannot claim Node's complete assertion semantics or official project-gate status.
- Required next gate: run the native `node --test` / `npm run check` and obtain a completed current-head CI result. No test is closed solely on the isolated harness.

## Dark-paper custom-color follow-up — 2026-10-09

Source review found a styling interaction beyond the classifier corpus: `applyTajweedColors()` previously set the same `--tw-*` names that night/amoled/royal-black `.mushaf-page-wrap` rules define locally. On those papers, the local palette could shadow the learner's root-level custom color even though the legend showed the custom swatch. The current candidate uses dedicated inherited `--tw-user-*` variables and resolves them before the paper/theme defaults.

- Current classifier source blob at this checkpoint: `ba3d9c28ce0952f83cf3bfbc0ee0d6898637e65a`. The corpus execution was performed on `b48dfcb6f82068195a26d7639f2a36297e8d67be`; the later `60b9b294d91420c45eb05382c6492172f9491302` changed the family-to-custom-property map only, and the current `ba3d...` update changes only comments clarifying the route assumption. No executable classifier logic has changed since the corpus run.
- Current CSS blob: `399d6bb24526137509f9354c60449c1c9a6345e4`.
- Current coherence-test blob at this checkpoint: `6baacd16580be3d6bd3c717c2c419ec21171be25` (preserves unique-owner/no-CSS-declaration assertions and adds a bilingual Mushaf-legend citation-locator regression).
- Static mapping check confirmed all 18 unique `--tw-user-*` variables are referenced by the CSS fallback layer; none is declared directly in CSS, preventing paper-scope shadowing. The coherence test pins this mapping and preserves the night/amoled/royal-black default palette. An independent static comparison across all 18 colored rule classes confirmed the fallback variable uses the same light-theme, dark-theme, and dark-paper values as before the refactor.
- The coherence test also had a stale expectation that preference filtering dropped the second of two spans on the same range. The actual intended behavior preserves all enabled classifier matches for the inspector; the painter chooses one visible span. Its test now verifies both equal-range rules can be disabled independently.
- The existing classifier test file executed 30/30 in the isolated synchronous harness against blob `60b9...`. Static CSS and preference-filter checks passed. **None of this is native Node/CI or real-browser evidence**; the new coherence assertions still need the native test runner, and dark-paper rendering must be confirmed in Chromium before closing issue 95 in `docs/OPEN-ISSUES.md`.

## Citation registry regression harness — 2026-10-09

- Current classifier blob: `60b9b294d91420c45eb05382c6492172f9491302`.
- Canonical registry JSON blob: `607c221d95138112ce507733e466e7ac1d9c3d11`; runtime mirror blob: `0589d00d802542f388280bebd3ef7f7f10969ff3`; test blob: `587c54ceddfb8493bfe6fe431dbff4ae43747f0c`.
- Result: **11/11 tests passed** in an isolated synchronous harness against the exact fetched classifier, runtime module, JSON registry and test source. The harness supplied the JSON/source files to the test and used a strict subset of Node assertions. It is not the native `node:test` runner.
- The canonical registry contains 28 rule citation entries and 4 work entries; the executable Tajweed classifier currently has 21 rule IDs. Every classifier rule ID resolves to a citation and `uncitedTajweedRules()` returns an empty list. Canonical/runtime parity passed in the 11-test suite.
- Remaining: native Node/CI execution and real Mushaf citation layout verification (Arabic/English × light/dark × phone/desktop).

## Coherence regression follow-up — 2026-10-09 05:59Z

- Current coherence test blob `289bf67ebc77fa5fc4f71a4514b482c9ff1f0711` pins that the 18 user override names are unique and do not appear as stylesheet declarations (they must be set from the root inline style only). This protects against reintroducing a local CSS declaration that shadows the user's choice.
- Source-level manual evaluation of the exact assertions against current `assets/css/quran.css` and `js/domain/tajweed.js` returned true for uniqueness, all 18 fallback references, no CSS declarations, all three dark-paper selectors/defaults, and independent same-range rule toggles. This was not execution of the full coherence file; its Node imports and file IO require the native test runner.
- The current classifier test file remains 30/30 in the isolated synchronous harness. Native CI for code/test head `be46a09065e348c9bdbdd19760c7e60066c59c8a` has 12 checks queued and zero completed. New documentation commits will move HEAD and trigger their own workflows, so always fetch the exact current branch head before quoting CI state.

## Tajweed course consistency harness — 2026-10-09

- Current course runtime blob: `fa945af25ed509cea367a56930269d0519ebad0f`; canonical course JSON blob: `25b392f873aeaebc0612b09fbda6c1c427b1bbae`; exact test blob: `1062e9a9f99f9cb1caa9c84bdf6852853b3a79c2`.
- Inputs also included classifier blob `60b9b294d91420c45eb05382c6492172f9491302` and source-registry runtime blob `0589d00d802542f388280bebd3ef7f7f10969ff3`.
- Result: **12/12 course tests passed** in an isolated synchronous harness using the exact fetched test source/runtime/canonical JSON. The assertions use a strict subset of Node's assertion API; this is not native `node:test` or CI evidence.
- The verified course has **8 stages and 17 sessions**, with no uncited sessions. Covered checks include canonical/runtime spine parity, ordering/unique session IDs, madd-first structure, source attribution, rule coverage, guided/open progression, unlocking/revisiting, progress arithmetic, search, bilingual strings and honest course attribution.
- Native Node/CI and rendered lesson/browser evidence remain outstanding.

## Tajweed practice + quiz-mode harnesses — 2026-10-09

The current practice and quiz-mode test sources were also executed in isolated synchronous harnesses, with the current classifier blob `60b9b294d91420c45eb05382c6492172f9491302`:

| Test file                          | Blob                                       |    Result | Method limitation                                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------ | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/tajweedPractice.test.js`    | `7a635c81fd623039e73b29de15d11e61ec6998a0` | **14/14** | The quiz-memory helper imports were stubbed; scoring, picking, answer-key, statistics and accuracy functions were exercised.                                                                                                   |
| `tests/tajweed-quiz-modes.test.js` | `87ffca966672c5a23b0470493a3bca19e409f32c` |   **6/6** | Quiz-memory helper imports and the `describe`/test registration were shimmed; mode registry, classifier/answer-key agreement, sourced answer choices, no-guess behavior, review pool integration and span keys were exercised. |

The `tajweedPractice.js` source blob for both was `8b541e20de62b2986c08f3bbae058ca4c5a9d27a`. Both harnesses used a strict subset of Node assertions and are **not** native `node:test` or CI runs; they do not validate the real `quiz.js` miss-record plumbing. Native test execution and browser review of actual practice views remain required.

## Qalqalah route-policy source audit — 2026-10-09

The lexical exception for `ٱرۡكَبْ مَّعَنَا` is now documented with route-specific limits, not described as universally true for Ḥafṣ. A transcript of Dr Ayman Suwayd's lesson on idghām al-mutajānisayn states at 11:21–12:39 that when the phrase is joined, the sākin bāʾ is assimilated into the following mīm; it distinguishes Ḥafṣ via al-Shāṭibiyyah (idghām only for this case) from Ḥafṣ via Ṭayyibat al-Nashr (both izhār and idghām). Source: https://baheth.ieasybooks.com/en/media/%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC-%D8%B4%D8%B1%D8%AD-%D9%85%D9%86%D8%B8%D9%88%D9%85%D8%A9-%D8%A7%D9%84%D9%85%D9%81%D9%8A%D8%AF-%D9%81%D9%8A-%D8%A7%D9%84%D8%AA%D8%AC%D9%88%D9%8A%D8%AF-%D8%A7%D9%84%D8%AD%D9%84%D9%82%D8%A9-34-%D8%A5%D8%AF%D8%BA%D8%A7%D9%85-%D8%A7%D9%84%D9%85%D8%AB%D9%84%D9%8A%D9%86-%D9%88%D8%A7%D9%84%D9%85%D8%AA%D8%AC%D8%A7%D9%86%D8%B3%D9%8A%D9%86-%D8%AF-%D8%A3%D9%8A%D9%85%D9%86-%D8%B3%D9%88%D9%8A%D8%AF.

The app does not expose an explicit qirāʾah/tarīq selector in the inspected configuration, Tajweed settings, or README. Therefore the implemented no-Qalqalah result is defensible only under an assumed connected-recitation profile matching Ḥafṣ via al-Shāṭibiyyah. Keep issue 81 OPEN until that default is explicitly approved/documented, route alternatives are not accidentally presented as universal, and native Node/CI plus actual Mushaf rendering pass. If multiple paths are ever supported, feed the declared reading profile into the classifier rather than broadening the lexical heuristic.

## Arabic citation-locator rendering correction — 2026-10-09

A direct execution of the actual `tajweedSourceLine()` rendering helper exposed an uncovered bilingual gap: the canonical locators `ch. 5`, `ch. 8`, and `qalqalah section` were correctly preserved in English but were also rendered verbatim in the Arabic legend. The display formatter now localizes only those prose labels, leaving canonical JSON/source locators untouched.

- Current runtime source blob: `f58ecd242a90d9e9e7f21647b6c8de7539ab06f7`; test blob: `28822b95814520baa8aae23ba7f215ad5ad20055`; canonical JSON remains blob `607c221d95138112ce507733e466e7ac1d9c3d11`.
- English keeps `ch. 5`, `ch. 8`, and `qalqalah section`; Arabic shows `الفصل 5`, `الفصل 8`, and `باب القلقلة` respectively.
- Current `tests/tajweed-sources.test.js` passed **12/12** in an isolated harness against the exact source test/runtime/classifier/JSON blobs. The actual `tajweedSourceLine()` helper was separately executed with the current source registry and produced Arabic citation HTML with localized locators; its English output retained the original locator strings.
- Both executions used isolated JavaScript shims and are **not** native Node or Chromium evidence. Verify citation wrapping and readability in EN/AR × light/dark × phone/desktop before closing issue 94.

## Citation-locator UI-path follow-up — 2026-10-09

- The source registry now localizes locators in Arabic: e.g., `ch. 5` → `الفصل 5`, and `qalqalah section` → `باب القلقلة`; English locators remain unchanged. Current runtime registry blob: `f58ecd242a90d9e9e7f21647b6c8de7539ab06f7`; test blob: `28822b95814520baa8aae23ba7f215ad5ad20055`.
- The registry suite passed **12/12** cases in the isolated synchronous harness, including the new Arabic locator labels, against the exact current canonical JSON and runtime mirror. This is not native `node:test`/CI evidence.
- The coherence suite includes `Mushaf legend localizes primary and alternate citation locators` (test blob `6baacd16580be3d6bd3c717c2c419ec21171be25`); its native test has not run yet. An isolated harness executed the exact `buildMushafSettingsPanel()` and `tajweedSourceLine()` function bodies extracted from `js/views/tafsirPanel.js` blob `b1ee333644a0a6343e1bf926a13396d112f37744`, with the real current classifier/citation helpers and minimal UI/config/translation shims. The generated English and Arabic legend fragments contained English `ch. 5`, Arabic `الفصل 5`, Arabic `باب القلقلة`, no English locator leakage in Arabic, and escaped HTML. This is source-level view-function execution, not native Node or end-to-end browser behavior; paper layout/wrapping remains unverified.

## Isolated Mushaf legend builder run — 2026-10-09 06:10Z

The exact current `buildMushafSettingsPanel()` function and its nested `tajweedSourceLine()` body were extracted from the saved view source and executed with the real current classifier and citation helpers plus minimal stubs for i18n, icons and Mushaf constants. For English and Arabic settings states, all of these checks passed: English `ch. 5`; English `qalqalah section`; Arabic `الفصل 5`; Arabic `باب القلقلة`; no English locator leakage in Arabic; primary and alternate citation rows emitted in both languages. The output sample uses the existing `tajweed-legend__source--also` class. This directly exercises view-template composition but **does not test browser CSS layout, mobile wrapping, accessibility tree, or full application boot**.

- Current coherence-test blob: `6baacd16580be3d6bd3c717c2c419ec21171be25`. The exact newly added test callback was separately extracted from this file and executed against the actual extracted view builder plus current classifier/citation helpers; **the callback passed**. The test remains pending under native `node:test`/CI; the isolated shim does not substitute for the repository runner.
- Do not close issue 94 on this result: real Chromium review in EN/AR × light/dark × phone/desktop is still required.

## Exact citation-view test callback execution — 2026-10-09 06:12Z

The committed callback body for `Mushaf legend localizes primary and alternate citation locators` was extracted from coherence-test blob `6baacd16580be3d6bd3c717c2c419ec21171be25` and run directly with the current extracted `buildMushafSettingsPanel()` / `tajweedSourceLine()` bodies, actual classifier and citation helpers, and shims only for i18n, icons, configuration constants, state factory and the two regex assertion methods. The callback passed. Exact source blobs: view `b1ee333644a0a6343e1bf926a13396d112f37744`, classifier `ba3d9c28ce0952f83cf3bfbc0ee0d6898637e65a`, runtime source registry `f58ecd242a90d9e9e7f21647b6c8de7539ab06f7`. This is stronger than a hand-written equivalent probe because it runs the committed assertion body, but it remains **non-native and non-browser** evidence.

## Per-surah validation for guided Tajweed lesson examples — 2026-10-09

A hostile-pool probe found that `tajweedLessonExamples()` only applied the global envelope (surah 1–114, ayah 1–286). This let impossible references such as 114:286 survive even though An-Nas has 6 ayahs. The lesson example helper now requires canonical per-surah counts and excludes any reference with no matching metadata or with `a > ayahCount`. The `practice-lesson` handler awaits shared `ensureQuranMeta()` before filtering and supplies `quran.meta.surahs`; it does not maintain a second verse-count table.

- Current lesson helper blob: `15d399c56d8584c6cc7569711048fc81868ec567`; current regression test blob: `8bab7d8e05ff13431d7b3786ed769a09c063b381`; current handler blob: `18d090f6d5e3fbef56c9db542b0b12d1d4a6b1d4`; canonical metadata blob: `44ce73c40da6123aa1497ea884b02394e3d22675`.
- The five pure lesson validator cases passed **5/5** in an isolated synchronous harness. Explicit results: 114:286 rejected; 114:6 accepted; unavailable/empty metadata returns no example refs. I then executed **all seven exact callbacks** from `tests/tajweedLessons.test.js` in an isolated harness using the actual lesson module, current classifier/citation helper, and extracted actual `renderRuleExampleText()` / `buildPracticeLesson()` functions; **7/7 passed**, including the rendered deep-link, definition and empty-state assertions. Only state, i18n, icon and router pieces were shimmed. Neither harness is native `node:test` or browser evidence.
- The current shipped practice pool (`data/tajweed-practice.json`, schema 2.0) was also scanned against all 114 counts in `quran-meta.json`: **44,933** entries across three levels, all 20 rule pools, and **zero invalid surah/ayah references**. This is a defensive guard for future/malformed pools, not a claim that current data contained bad references.
- Ledger row 96 remains **OPEN** until native Node/CI and actual lesson-modal behavior are verified. No Qur'an text, canonical ayah counts, or rule classifications changed.

## Cross-component curriculum audit — 2026-10-09

Static review of the canonical course JSON, runtime course mirror, and course regression tests found a teaching-taxonomy defect separate from classifier span accuracy. Session `madd-obligatory` was titled “Obligatory madd / المد اللازمة” while its focus set grouped `madd_6`, `madd_iwad`, `madd_badal`, and `madd_silah`. Madd Badal is explicitly a distinct category in the corrected source registry; the classifications of Madd ʿIwaḍ and Ṣilah vary by source. The old heading therefore overgeneralized the category. The visible title now explicitly names the four categories in English and Arabic: “Madd Lāzim, Badal, ʿIwaḍ, and Ṣilah” / “المد اللازم والبدل والعوض والصلة”. The existing session ID is preserved to avoid invalidating saved course progress, and a regression pins both the bilingual title and unchanged focus set.

The source caveat for `madd_6` was also clarified: the identifier denotes the six-count length, not six categories. It now says that the cited passage of Tuhfat al-Atfal describes four forms of Madd Lāzim, and warns against inferring that distinct rules grouped in one session are all Madd Lāzim. Issue ledger row 97 (renumbered after the integration merge) remains **OPEN** until native tests/CI, Arabic pedagogy review, and browser rendering are checked. These are source-level/content corrections; no independent browser or scholarly sign-off is claimed.

## Muqaṭṭaʿāt Madd anomaly — 2026-10-09 (merged into main; native rerun pending)

A further classifier/legend/source audit found two issues in the letter-name madd path:

- The `madd_6` legend description used isolated `آ` (alif madda) as its example, which is misleading because that orthography can be Madd Badal; the six-count Madd Lazim example should demonstrate an original sukoon/shaddah after the madd letter. The description now uses the bundled Qur'anic spelling `ٱلضَّآلِّينَ` and explains the special ʿayn duration separately.
- The old Muqaṭṭaʿāt path classified every marked letter in its hardcoded subset as fixed `madd_6`, omitted Kaf, and did not verify that the whole token was a known opening-letter skeleton. PR #24 adds an exact set of known Muqaṭṭaʿāt base skeletons, recognizes Kaf, and emits a distinct bilingual `madd_4_6` rule for ʿayn, whose reported duration is four or six counts. The canonical/runtime source registry and course focus now include that rule; tests cover `كهيعص`, `عسق`, and a negative isolated-Kaf case.

These corrections are merged into `main` as part of the Tajweed integration. The corpus totals above were measured **before** they landed, so the old span count and 21-rule reachability result must not be extrapolated to the merged 22-rule source. `tests/tajweed-corpus-sweep.test.js` now runs natively against it and asserts every registered rule id is reachable, including `madd_4_6`. The classifier blob at the start of this Muqaṭṭaʿāt Madd correction was `8edf33ae72fdb726bdb177828588665f7e7bec9e`; the current classifier blob is `9e638d4961a6c4cf2c758ad2fd7ad67e2c70ab7a` after a bilingual legend-description update that does not alter classifier logic. The native `node --test` sweep on the merged tree is recorded in the merge commit; browser evidence and scholarly/source review are still required. Ledger row 98 (renumbered after the integration merge) remains OPEN on those two gates.
