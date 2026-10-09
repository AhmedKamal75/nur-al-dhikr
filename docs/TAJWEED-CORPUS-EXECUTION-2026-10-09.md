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

| Surahs | Files | Ayahs | Spans produced | Same-unit multi-rule collisions | Unmarked Qalqalah spans |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1–19 | 19 | 2,348 | 53,914 | 2 | 0 |
| 20–38 | 19 | 1,710 | 25,489 | 2 | 0 |
| 39–57 | 19 | 1,046 | 14,866 | 0 | 0 |
| 58–76 | 19 | 518 | 6,962 | 0 | 0 |
| 77–95 | 19 | 484 | 2,554 | 0 | 1 |
| 96–114 | 19 | 130 | 769 | 0 | 1 |
| **Total** | **114** | **6,236** | **104,554** | **4** | **2** |

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

| Location | Written unit | Rules sharing the exact same span | Initial assessment |
| --- | --- | --- | --- |
| 3:153 | `بِغَمّٖ` | `ghunnah` + `idgham_no_ghunnah` | Shaddah-ghunnah on the mīm and tanween assimilation into the next lām coexist at one written unit. |
| 6:39 | `صُمّٞ` | `ghunnah` + `idgham_ghunnah` | Shaddah-ghunnah and tanween idgham into the next wāw coexist. |
| 27:10 | `جَآنّٞ` | `ghunnah` + `idgham_ghunnah` | Shaddah-ghunnah and the word-final tanween's next-word idgham coexist. |
| 28:31 | `جَآنّٞ` | `ghunnah` + `idgham_ghunnah` | Same pair as 27:10. |

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

| Surah range | Files | Ayahs | Spans |
| --- | ---: | ---: | ---: |
| 1–9 | 9 | 1,364 | 36,042 |
| 10–18 | 9 | 886 | 16,739 |
| 19–27 | 9 | 1,002 | 13,831 |
| 28–36 | 9 | 536 | 10,569 |
| 37–45 | 9 | 722 | 9,941 |
| 46–54 | 9 | 391 | 5,199 |
| 55–63 | 9 | 298 | 4,586 |
| 64–72 | 9 | 276 | 3,200 |
| 73–81 | 9 | 354 | 2,158 |
| 82–90 | 9 | 214 | 1,210 |
| 91–99 | 9 | 103 | 619 |
| 100–108 | 9 | 61 | 310 |
| 109–114 | 6 | 29 | 150 |
| **Total** | **114** | **6,236** | **104,554** |

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

- The runtime citation surfaced the Arabic title for *al-Tamhid* as `التهويد في علم التجويد`. Catalog/text records identify the correct title as `التمهيد في علم التجويد` (Quranpedia: https://quranpedia.net/book/131; Islamweb: https://www.islamweb.org/ar/library/index.php?ID=1&bk_no=230&idfrom=1&page=bookcontents).
- Corrected the canonical JSON and runtime JS mirror, then added a regression assertion in `tests/tajweed-sources.test.js`.
- Isolated execution confirms the Arabic title is identical in the canonical registry, runtime registry, and alternate-citation output. Full runtime/canonical parity still passes in the isolated JS check. Native Node/CI and browser evidence remain pending.



## Alternate-source visibility — 2026-10-09 05:13Z

- The runtime registry's `also` citations were previously not surfaced by `tajweedCitation()` or the Mushaf legend. The helper now resolves each alternate citation to localized title and author plus locator/review metadata, and `tajweedSourceLine()` emits an additional escaped source line for each alternate.
- Regression coverage checks English and Arabic alternate-source metadata, and source/runtime full-object parity remains exact in isolated execution.
- The UI change is not browser-verified. Row 94 remains open for the EN/AR × light/dark × phone/desktop rendering and wrapping review; native Node/CI is also pending.



## Current source-test snapshots — 2026-10-09 05:15Z

The following checks were executed against the exact source/test blobs below using isolated synchronous JavaScript harnesses that supplied small `test` and `assert` shims. These are **not** native Node test-runner results.

| Check | Source / fixture blob | Result |
| --- | --- | --- |
| Tajweed classifier unit tests | classifier `92f4fba4747024582c3334400bc6d3437732d5ef`; test `d1bb1b04e4c1a20c5a271afb2225dece222bfe4a` | **29/29 passed** |
| Citation registry invariants and complete JSON/runtime parity | JSON `607c221d95138112ce507733e466e7ac1d9c3d11`; runtime `2889e476ce399f52bca70697966ec49ee7635671`; test `203bde8367582990c03440ef80b0642c2bde08f6` | **11/11 passed** |
| Full citation/work object comparison | Same JSON/runtime blobs | **28/28 rule objects and 4/4 work objects matched exactly** |
| Full corpus classifier execution | classifier `92f4fba4747024582c3334400bc6d3437732d5ef`; 114 bundled surah files | **6,236 ayahs; 104,554 spans; all 21 rule IDs reached; zero recorded structural invariant failures** |

Still unverified: native `npm run check` / `node --test`, completed current-head GitHub Actions, Chromium rendering and interactions, and scholar/reference sign-off. Do not promote shim execution into a CI pass.
