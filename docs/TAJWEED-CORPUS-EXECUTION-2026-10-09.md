# Tajweed full-corpus execution and anomaly report — 2026-10-09

**Status:** the all-surah classifier execution/invariant gate was completed in an isolated JavaScript runtime. The repository's Node test runner, GitHub Actions jobs, browser matrix, and a scholarly reference comparison remain unverified.

## Exact inputs and method

- Repository: `AhmedKamal75/nur-al-dhikr`
- Working branch: `fix/tajweed-semantic-lookahead-2026-10-08`
- Classifier file content SHA used for this run: `0b67ade836183802278d84599169e3430ea18fc8` (the source version containing the Qalqalah plural-key, lām-prefix, Allah-lām context, and syntax/runtime corrections).
- Corpus inputs: the 114 JSON files under `data/quran/1.json` through `data/quran/114.json`, fetched from the same branch.
- Execution method: the ES-module source was fetched from GitHub, its top-level `export` modifiers were removed for evaluation, it was compiled/executed with `new Function` in the available JavaScript tool runtime, and the actual `classifyAyahTajweed(ayah.text)` function was invoked for each corpus ayah. Data files were parsed as JSON. The implementation was processed in six ranges to stay inside the tool-call limit.
- This is real classifier execution against the bundled text, not merely static scanning. It is **not** an official `node --test` / `npm run check` run and does not prove UI integration or scholarly correctness.

## Execution totals

| Surahs | Files | Ayahs | Spans produced | Same-unit multi-rule collisions | Unmarked Qalqalah spans |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1–19 | 19 | 2,348 | 53,910 | 2 | 1 |
| 20–38 | 19 | 1,710 | 25,492 | 2 | 0 |
| 39–57 | 19 | 1,046 | 14,868 | 0 | 0 |
| 58–76 | 19 | 518 | 6,964 | 0 | 0 |
| 77–95 | 19 | 484 | 2,555 | 0 | 1 |
| 96–114 | 19 | 130 | 769 | 0 | 1 |
| **Total** | **114** | **6,236** | **104,558** | **4** | **3** |

All 21 entries in the current `TAJWEED_RULES` registry were reachable in the corpus. This is 21 rule identities, not the older shorthand count of 20 in earlier handoff text.

The following structural invariants had **zero observed failures across all 6,236 ayahs**:

- returned raw-token count matched the source's whitespace-token count;
- each result had the expected positive, one-based word index;
- every span used a registered rule ID;
- every span had integer, ordered, in-bounds offsets;
- no duplicate `start:end:rule` spans;
- no corpus file fetch or JSON parse failures.

A separate targeted execution of 15 hand-selected regression cases also passed against this same classifier source, including ornament-aware lookahead/finality, the plural `فَرَّطتُمۡ` exception, lām-prefix Lam Shamsiyyah, and context-sensitive Lām al-Jalālah. That targeted probe is not a substitute for the repository's test suite.

## Anomalies requiring follow-up

### 1. Four same-written-unit rule collisions

The classifier produces these four overlaps; they are not four arbitrary offset errors:

| Location | Written unit | Rules sharing the exact same span | Initial assessment |
| --- | --- | --- | --- |
| 3:153 | `بِغَمّٖ` | `ghunnah` + `idgham_no_ghunnah` | Shaddah-ghunnah on the mīm and tanween assimilation into the next lām coexist at one written unit. |
| 6:39 | `صُمّٞ` | `ghunnah` + `idgham_ghunnah` | Shaddah-ghunnah and tanween idgham into the next wāw coexist. |
| 27:10 | `جَآنّٞ` | `ghunnah` + `idgham_ghunnah` | Shaddah-ghunnah and the word-final tanween's next-word idgham coexist. |
| 28:31 | `جَآنّٞ` | `ghunnah` + `idgham_ghunnah` | Same pair as 27:10. |

The raw classifier reports both rules. However, `filterSpansByPrefs()` currently returns non-overlapping spans by dropping any later span whose start is before the prior span's end. Since these spans share exact offsets, the painter/inspector receives only the first (currently `ghunnah`) span. This may be a necessary one-color-per-glyph display choice, but precedence is implicit and the secondary rule is not surfaced by this filter. The durable ledger keeps this presentation issue **OPEN**; do not change the classifier pair counts without reviewing the recitation semantics and display policy.

The corpus sweep test was strengthened to pin the observed collision inventory: three `ghunnah+idgham_ghunnah` cases and one `ghunnah+idgham_no_ghunnah` case. Any new or missing pair now requires deliberate review.

### 2. Three Qalqalah spans without an explicit sukun/diacritic inside the highlighted slice

- **11:42 — `ٱرۡكَب مَّعَنَا`:** the classifier marks the final bāʾ of `ٱرۡكَب`. This is a known reading-profile-sensitive boundary. The corpus does not, by itself, declare a profile in the classifier contract, so the case remains **OPEN** rather than applying broad adjacency suppression or claiming a route-independent answer.
- **94:8 — `فَٱرۡغَب`:** final-word bāʾ. A pause at the ayah end induces the expected Qalqalah; the source word has no explicit mark inside the one-character span.
- **96:19 — `وَٱقۡتَرِب۩`:** final-word bāʾ followed by the sajdah ornament. As an ayah-final stop, the unmarked highlighted letter is expected under the current pause model.

The lightweight boundary diagnostic found no other surviving emitted Qalqalah span immediately before a following shadda in the later five ranges. Earlier raw-text candidates for identical-letter and dāl→tāʾ assimilation had already been given explicit guards and regression fixtures. This does not make the Qalqalah issue fully closed: the route-specific case at 11:42 still needs an explicit reading/profile decision and scholarly sign-off.

## Verification boundary and next gate

Done in the isolated JavaScript runtime: all 114 JSON sources loaded; all 6,236 ayahs executed; all 21 rule IDs reached; structural invariants passed; the four overlap pairs and three unmarked Qalqalah cases were isolated and documented.

Still not done: official `npm run check` / `node --test`, CI completion, Chromium/browser/device matrix, visual review of the word inspector and color painter on overlap cases, and a surah-by-surah comparison against a trusted Tajweed annotation/reference. GitHub Actions being queued is not a pass. Keep rows 79, 80, 86, 87, and 88 open until their specific verification requirements are met.

This report records classifier execution and anomalies; it is not a claim that all Tajweed rules have been scholarly-validated or that the feature is release-ready.
