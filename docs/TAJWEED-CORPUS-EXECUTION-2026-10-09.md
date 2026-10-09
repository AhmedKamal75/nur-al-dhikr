# Tajweed full-corpus execution and anomaly report — 2026-10-09

**Status:** the all-surah classifier execution/invariant gate was completed in an isolated JavaScript runtime. The repository's Node test runner, GitHub Actions jobs, browser matrix, and a scholarly reference comparison remain unverified.

## Exact inputs and method

- Repository: `AhmedKamal75/nur-al-dhikr`
- Working branch: `fix/tajweed-semantic-lookahead-2026-10-08`
- Classifier source blob used for the final rerun: `ba7d1732190fc1a75de36b11e048fad0fb4a71f4` (includes the Qalqalah plural-key correction, explicit-sukun-aware Muqaṭṭaʿāt exemption, narrowly scoped ٱرۡكَب مَّعَنَا exception, lām-prefix fix, Allah-lām context, syntax/runtime corrections, and inspector-safe same-unit overlap filtering).
- Corpus inputs: the 114 JSON files under `data/quran/1.json` through `data/quran/114.json`, fetched from the same branch.
- Execution method: the ES-module source was fetched from GitHub, its top-level `export` modifiers were removed for evaluation, it was compiled/executed with `new Function` in the available JavaScript tool runtime, and the actual `classifyAyahTajweed(ayah.text)` function was invoked for each corpus ayah. Data files were parsed as JSON. The implementation was processed in six ranges to stay inside the tool-call limit.
- This is real classifier execution against the bundled text, not merely static scanning. It is **not** an official `node --test` / `npm run check` run and does not prove UI integration or scholarly correctness.

## Execution totals

| Surahs | Files | Ayahs | Spans produced | Same-unit multi-rule collisions | Unmarked Qalqalah spans |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1–19 | 19 | 2,348 | 53,909 | 2 | 0 |
| 20–38 | 19 | 1,710 | 25,492 | 2 | 0 |
| 39–57 | 19 | 1,046 | 14,868 | 0 | 0 |
| 58–76 | 19 | 518 | 6,964 | 0 | 0 |
| 77–95 | 19 | 484 | 2,555 | 0 | 1 |
| 96–114 | 19 | 130 | 769 | 0 | 1 |
| **Total** | **114** | **6,236** | **104,557** | **4** | **2** |

All 21 entries in the current `TAJWEED_RULES` registry were reachable in the corpus. This is 21 rule identities, not the older shorthand count of 20 in earlier handoff text.

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

| Location | Written unit | Rules sharing the exact same span | Initial assessment |
| --- | --- | --- | --- |
| 3:153 | `بِغَمّٖ` | `ghunnah` + `idgham_no_ghunnah` | Shaddah-ghunnah on the mīm and tanween assimilation into the next lām coexist at one written unit. |
| 6:39 | `صُمّٞ` | `ghunnah` + `idgham_ghunnah` | Shaddah-ghunnah and tanween idgham into the next wāw coexist. |
| 27:10 | `جَآنّٞ` | `ghunnah` + `idgham_ghunnah` | Shaddah-ghunnah and the word-final tanween's next-word idgham coexist. |
| 28:31 | `جَآنّٞ` | `ghunnah` + `idgham_ghunnah` | Same pair as 27:10. |

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

Done in the isolated JavaScript runtime: all 114 JSON sources loaded; all 6,236 ayahs executed; all 21 rule IDs reached; structural invariants passed; the four overlap pairs and three unmarked Qalqalah cases were isolated and documented.

Still not done: official `npm run check` / `node --test`, CI completion, Chromium/browser/device matrix, visual review of the word inspector and color painter on overlap cases, and a surah-by-surah comparison against a trusted Tajweed annotation/reference. GitHub Actions being queued is not a pass. Keep Tajweed rows 81–90 open according to their individual statuses; row 79 is the separate Halqi Izhar fix already present on main, and main's row 80 is the unrelated navigation-shell load-flakiness issue. The current classifier source blob is `ba7d1732190fc1a75de36b11e048fad0fb4a71f4`; the current `tests/tajweed.test.js` blob is `cdca893dc31cb963b122ffc54d25378269d35858` and passed 28 synchronous tests under an isolated shim, not native Node. The corpus sweep test blob `387e4eb1196253a5b1537109d3c33a3b289fb9bf` now asserts exactly two unmarked Qalqalah spans.

This report records classifier execution and anomalies; it is not a claim that all Tajweed rules have been scholarly-validated or that the feature is release-ready.
