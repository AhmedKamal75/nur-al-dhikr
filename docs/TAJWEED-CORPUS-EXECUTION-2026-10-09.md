# Tajweed full-corpus execution and anomaly report — 2026-10-09

## Latest 22-rule execution — follow-up branch (2026-10-09)

**Status:** complete isolated JavaScript execution across all 114 corpus files and 6,236 ayahs. This is current candidate classifier evidence, not native Node/CI, browser, or scholarly validation.

- Repository: AhmedKamal75/nur-al-dhikr
- Follow-up branch: fix/tajweed-remaining-gates-2026-10-09
- Classifier source blob: e2bf791f35575c3d774846930b02a6988bfe92cd (the classifier logic matches current main; this branch additionally changes the preference filter used by the UI).
- Inputs: data/quran/1.json through data/quran/114.json from main. Each JSON file parsed successfully.
- Method: remove top-level ES-module export modifiers, compile the actual classifier into an isolated JavaScript runtime, then call classifyAyahTajweed for every ayah. Token-index, span bounds, duplicate identity, rule reachability, same-range cross-rule collision, and unmarked-Qalqalah checks were scoped to each individual word because span offsets are word-relative.
- Measurement correction: a preliminary temporary accumulator incorrectly scoped span-identity maps to the whole ayah, causing offsets that repeat in different words to be counted as duplicates. Those preliminary duplicate/collision totals were discarded; all totals below use word-local maps.

| Surahs | Files | Ayahs | Spans produced |
| --- | ---: | ---: | ---: |
| 1–14 | 14 | 1,802 | 45,549 |
| 15–28 | 14 | 1,538 | 22,889 |
| 29–42 | 14 | 985 | 16,350 |
| 43–56 | 14 | 750 | 8,628 |
| 57–70 | 14 | 344 | 6,049 |
| 71–84 | 14 | 490 | 3,294 |
| 85–98 | 14 | 229 | 1,292 |
| 99–112 | 14 | 87 | 449 |
| 113–114 | 2 | 11 | 54 |
| **Total** | **114** | **6,236** | **104,554** |

### Structural invariants

- All **22/22** registered rule IDs were reached, including madd_4_6.
- Raw token-count mismatches: **0**.
- Invalid one-based word indices: **0**.
- Invalid span offsets/ranges: **0**.
- Unknown rule IDs: **0**.
- Duplicate exact start:end:rule spans within a word: **0**.
- File fetch / JSON parse failures: **0**.

### Exact same-range cross-rule collisions

Four collisions were observed, all already identified by the prior audit:

| Ayah | Written unit | Coexisting rules |
| --- | --- | --- |
| 3:153 | بِغَمّٖ | ghunnah + idgham_no_ghunnah |
| 6:39 | صُمّٞ | ghunnah + idgham_ghunnah |
| 27:10 | جَآنّٞ | ghunnah + idgham_ghunnah |
| 28:31 | جَآنّٞ | ghunnah + idgham_ghunnah |

The corrected run reports three ghunnah + idgham_ghunnah collisions and one ghunnah + idgham_no_ghunnah collision. These remain pedagogical/source-review items; the UI must expose the selected visible rule consistently when preferences change.

### Remaining classifier anomalies

- Two pause-final Qalqalah spans do not carry an explicit sukun mark in the selected orthography: 94:8 فَٱرۡغَب (final bāʾ) and 96:19 وَٱقۡتَرِب۩ (final bāʾ before the sajdah ornament). The corpus sweep identifies them but does not itself establish a scholarly judgment; ledger row 81 remains open.
- Madd al-Līn of ʿAyn is emitted once at 19:1 كٓهيعٓصٓ and once at 42:2 عٓسٓقٓ, both as rule madd_4_6. These are the two known corpus ayahs for the rule in this reading profile.
- The span painter/filter interaction is tested separately and changed in this branch; this corpus result only validates classifier output, not the DOM inspector or rendered colors.

**Limitations:** a direct isolated-JavaScript run is not the repository's native node --test / npm run check, not a completed GitHub Actions run, not real-browser or cross-engine evidence, and not independent scholarly annotation review.

## Historical 21-rule execution snapshot (pre-PR #24)

## Exact inputs and method

- Repository: `AhmedKamal75/nur-al-dhikr`
- Working branch: `fix/tajweed-semantic-lookahead-2026-10-08`
- Classifier source blob used for the final rerun: `ba7d1732190fc1a75de36b11e048fad0fb4a71f4` (includes the Qalqalah plural-key correction, explicit-sukun-aware Muqaṭṭaʿāt exemption, narrowly scoped ٱرۡكَب مَّعَنَا exception, lām-prefix fix, Allah-lām context, syntax/runtime corrections, and inspector-safe same-unit overlap filtering).
- Corpus inputs: the 114 JSON files under `data/quran/1.json` through `data/quran/114.json`, fetched from the same branch.
- Execution method: the ES-module source was fetched from GitHub, its top-level `export` modifiers were removed for evaluation, it was compiled/executed with `new Function` in the available JavaScript tool runtime, and the actual `classifyAyahTajweed(ayah.text)` function was invoked for each corpus ayah. Data files were parsed as JSON. The implementation was processed in six ranges to stay inside the tool-call limit.
- This is real classifier execution against the bundled text, not merely static scanning. It is **not** an official `node --test` / `npm run check` run and does not prove UI integration or scholarly correctness.

## Execution totals

| Surahs    |   Files |     Ayahs | Spans produced | Same-unit multi-rule collisions | Unmarked Qalqalah spans |
| --------- | ------: | --------: | -------------: | ------------------------------: | ----------------------: |
| 1–19      |      19 |     2,348 |         53,909 |                               2 |                       0 |
| 20–38     |      19 |     1,710 |         25,492 |                               2 |                       0 |
| 39–57     |      19 |     1,046 |         14,868 |                               0 |                       0 |
| 58–76     |      19 |       518 |          6,964 |                               0 |                       0 |
| 77–95     |      19 |       484 |          2,555 |                               0 |                       1 |
| 96–114    |      19 |       130 |            769 |                               0 |                       1 |
| **Total** | **114** | **6,236** |    **104,557** |                           **4** |                   **2** |

In the classifier snapshot used for this recorded direct run, all 21 registered `TAJWEED_RULES` entries were reachable. This is historical baseline evidence: the later PR #24 correction adds a separate `madd_4_6` rule and raises the candidate registry to 22 rule identities, so this corpus result must not be represented as a run of the current candidate.

The following structural invariants had **zero observed failures across all 6,236 ayahs**:

- returned raw-token count matched the source's whitespace-token count;
- each result had the expected positive, one-based word index;
- every span used a registered rule ID;
- every span had integer, ordered, in-bounds offsets;
- no duplicate `start:end:rule` spans;
- no corpus file fetch or JSON parse failures.

An earlier snapshot of `tests/tajweed.test.js` was executed in an isolated JavaScript harness after stripping its Node imports and supplying small synchronous `test` / `assert` shims: **27/27 test cases passed** on classifier SHA `4d26e02e47adc32e32646dfa6c6c5b576ebfd2a9` and test blob `b64d1acf92ab4e1f92ee7351b426954f8872cd57`. This is historical isolated-runtime evidence, not Node's native test runner. The extra regression asserts same-unit overlaps survive preference filtering and verifies each collision rule can be independently disabled.

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

The corpus sweep test was strengthened to pin the observed collision inventory: three `ghunnah+idgham_ghunnah` cases and one `ghunnah+idgham_no_ghunnah` case. Any new or missing pair now requires deliberate review. The latest full-corpus rerun on classifier source blob `ba7d1732190fc1a75de36b11e048fad0fb4a71f4` reproduced all summary counts above after the exact ٱرۡكَب مَّعَنَا handling was activated. All four rule overlaps are exact same-range collisions; no differently ranged partial-overlap cases were observed.

### 2. Two remaining Qalqalah spans without an explicit sukun/diacritic inside the highlighted slice

- **94:8 — `فَٱرۡغَب`:** final-word bāʾ. A pause at the ayah end induces the expected Qalqalah; the source word has no explicit mark inside the one-character span.
- **96:19 — `وَٱقۡتَرِب۩`:** final-word bāʾ followed by the sajdah ornament. As an ayah-final stop, the unmarked highlighted letter is expected under the current pause model.

The earlier third case, **Hūd 11:42 — `ٱرۡكَب مَّعَنَا`**, is now handled through an exact lexical boundary exception. The suppression requires the exact base spelling of `ٱرۡكَب`, a final bāʾ, and a following mīm marked with shadda. It does not suppress arbitrary bāʾ→mīm boundaries. The regression confirms this exact phrase does not receive an independent Qalqalah span while an unrelated synthetic `اُكْتُبْ مَّعَنَا` still does.

**Important scholarly limitation:** sources do not present this boundary as an unqualified, universal rule. A textbook-style tajweed explanation explicitly says the bāʾ is not qalqalah when assimilated into the following mīm (example `أَرْكُبْ مَعَنَا`): https://www.cia.gov/library/abbottabad-compound/F1/F18483B3EEC4A3C5EB18ADAD655572CC_Dc1.pdf. By contrast, Ibn al-Jazarī’s `التمهيد في علم التجويد`, reproduced by Islamweb, says where a sakin bāʾ meets mīm (including `يا بني اركب معنا`) both izhār and idghām are permitted: https://www.islamweb.net/ar/library/content/230/55/?idfrom=&idto=&start=. A modern teacher describing a Hafs recitation lesson also labels the site an idghām of same articulation-different quality: https://www.youtube.com/watch?v=_4mtvyXp_xk. The implementation therefore records the app’s chosen lexical convention, not scholarly unanimity. Keep issue 81 **OPEN** until the app’s reading/profile policy and preferred teaching reference are made explicit.

A proposed generic cross-word Qāf→Kāf guard was separately removed after source review; the documented special qāf case remains lexical/reading-scoped (including `نخلقكم`), not a blanket rule for any qāf+sukūn followed by shaddah-marked kāf.

The corpus sweep now expects exactly two unmarked Qalqalah spans, corresponding to the two ayah-final pause cases above. In the final direct run, all 6,236 ayahs executed; structural invariants passed; there were no fetch/parse failures. The targeted Tajweed unit file passed 28/28 in the isolated shim. This is still not native Node/CI, browser evidence, or a scholarly validation of every rule.

## Verification boundary and next gate

Historical result for an earlier classifier snapshot only: all 114 JSON sources loaded; all 6,236 ayahs executed; all 21 rule IDs reached; structural invariants passed; four overlap pairs and three unmarked Qalqalah cases were isolated. A later pre-PR-24 run recorded two unmarked Qalqalah spans. Neither run validates the current PR-24 22-rule classifier; its full-corpus result remains pending.

Still not done: official `npm run check` / `node --test`, CI completion, Chromium/browser/device matrix, visual review of the word inspector and color painter on overlap cases, and a surah-by-surah comparison against a trusted Tajweed annotation/reference. GitHub Actions being queued is not a pass. Keep Tajweed rows 81–92 open according to their individual statuses; row 79 is the separate Halqi Izhar fix already present on main, and main's row 80 is the unrelated navigation-shell load-flakiness issue. The last directly executed classifier snapshot before the Muqaṭṭaʿāt Madd correction was `ba7d1732190fc1a75de36b11e048fad0fb4a71f4`; its 104,557-span / 21-rule result is historical and is not a run of the current candidate. The current candidate classifier blob is `8edf33ae72fdb726bdb177828588665f7e7bec9e`, and the current `tests/tajweed.test.js` blob is `052cb7e4f64a554f372d071a2777e3a9d3a86deb`; these newest changes have not been run under native Node or a fresh direct corpus execution. The earlier 28-test synchronous shim result applied to an older test snapshot, not this current file. The corpus sweep test blob `387e4eb1196253a5b1537109d3c33a3b289fb9bf` asserts all registered rule IDs are reachable and exactly two unmarked Qalqalah spans.

This report records classifier execution and anomalies; it is not a claim that all Tajweed rules have been scholarly-validated or that the feature is release-ready.

## Cross-component curriculum audit — 2026-10-09

Static review of the canonical course JSON, runtime course mirror, and course regression tests found a teaching-taxonomy defect separate from classifier span accuracy. Session `madd-obligatory` was titled “Obligatory madd / المد اللازمة” while its focus set grouped `madd_6`, `madd_iwad`, `madd_badal`, and `madd_silah`. Madd Badal is explicitly a distinct category in the corrected source registry; the classifications of Madd ʿIwaḍ and Ṣilah vary by source. The old heading therefore overgeneralized the category. The visible title now explicitly names the four categories in English and Arabic: “Madd Lāzim, Badal, ʿIwaḍ, and Ṣilah” / “المد اللازم والبدل والعوض والصلة”. The existing session ID is preserved to avoid invalidating saved course progress, and a regression pins both the bilingual title and unchanged focus set.

The source caveat for `madd_6` was also clarified: the identifier denotes the six-count length, not six categories. It now says that the cited passage of Tuhfat al-Atfal describes four forms of Madd Lāzim, and warns against inferring that distinct rules grouped in one session are all Madd Lāzim. Issue ledger row 91 remains **OPEN** until native tests/CI, Arabic pedagogy review, and browser rendering are checked. These are source-level/content corrections; no independent browser or scholarly sign-off is claimed.

## Muqaṭṭaʿāt Madd anomaly — 2026-10-09 (fresh execution pending)

A further classifier/legend/source audit found two issues in the letter-name madd path:

- The `madd_6` legend description used isolated `آ` (alif madda) as its example, which is misleading because that orthography can be Madd Badal; the six-count Madd Lazim example should demonstrate an original sukoon/shaddah after the madd letter. The description now uses the bundled Qur'anic spelling `ٱلضَّآلِّينَ` and explains the special ʿayn duration separately.
- The old Muqaṭṭaʿāt path classified every marked letter in its hardcoded subset as fixed `madd_6`, omitted Kaf, and did not verify that the whole token was a known opening-letter skeleton. PR #24 adds an exact set of known Muqaṭṭaʿāt base skeletons, recognizes Kaf, and emits a distinct bilingual `madd_4_6` rule for ʿayn, whose reported duration is four or six counts. The canonical/runtime source registry and course focus now include that rule; tests cover `كهيعص`, `عسق`, and a negative isolated-Kaf case.

The previous corpus totals above were measured **before** these changes. Do not extrapolate the old 104,557 span count or 21-rule reachability result to the new source. The classifier blob at the start of this Muqaṭṭaʿāt Madd correction was `8edf33ae72fdb726bdb177828588665f7e7bec9e`; the current classifier blob is `9e638d4961a6c4cf2c758ad2fd7ad67e2c70ab7a` after a bilingual legend-description update that does not alter classifier logic. Neither blob has a full-corpus result for the new 22-rule registry. GitHub Actions is queued; current-tree corpus execution, native Node checks, browser evidence, and scholarly/source review are still required. Ledger row 92 remains OPEN.
