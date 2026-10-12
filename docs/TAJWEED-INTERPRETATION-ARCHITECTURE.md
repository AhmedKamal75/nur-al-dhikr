# Tajweed interpretation pipeline — implementation record

**Status:** first data-driven family prototype; not a certified Tajweed engine and not a release approval.

## Objective

Both the classic Qur'an reader and the 604-page Mushaf must consume the same semantic rule decisions. More importantly, those decisions must be correct for the app's explicitly supported recitation scope. Code reuse alone guarantees neither correctness nor completeness.

## Current baseline and evidence

- Pinned starting commit: `3a28849a0d78150244b59b88de2506155575a627` (package `5.17.139`).
- `js/views/tafsirPanel.js` already owns `renderAyahWords`, which calls the shared `classifyAyahTajweed` path used by both readers. The immediate disagreement is therefore not evidence of two independent UI classifiers; the raw Uthmani spellings, token boundaries, contextual rules, and span mapping can still drive different outputs.
- The existing `data/tajweed-sources.json` is already the source/citation registry, mirrored by `js/domain/tajweedSources.js` with parity tests.
- The existing cross-rasm diagnostic found real rule-set deltas and six ayahs whose whitespace token counts differ. Those verses must be reported and investigated; same-index comparison cannot establish semantic alignment where segmentation differs.

## Prototype decision: data table first, no custom DSL

The noon-sakinah/tanween next-letter family is the first deliberately limited vertical slice. Its mutual-exclusion priority and Arabic follower sets are now represented as `NOON_TANWEEN_RULE_GROUP` in `js/domain/tajweed.js`. The classifier still owns context detection and the explicit small-high-meem Iqlab path; the declarative lookup only selects the following-letter result. That keeps the interpreter trivial: there is no parser, dynamic evaluation, build step, or runtime dependency.

Only this group is marked `first-match`. The project intentionally preserves multiple annotations for other phenomena on a written unit, so the rule must not be generalized to the entire classifier.

The spec test checks unique IDs, one-glyph Arabic letter sets, disjoint membership, citation/legend registry membership, and live classifier behavior for every branch. It is a contract test for architecture, not a scholarly proof that every letter set is correct.

## Correctness and parity requirements

1. Treat the previous classifier output as a differential baseline only, not as a source of religious truth.
2. Keep canonical Qur'an and Mushaf strings byte-identical. Do not normalize or rewrite sacred text to force tests to pass.
3. Preserve original-source character offsets for visible highlights; compare semantic letters separately from source-string offsets.
4. Report every cross-rasm token-count mismatch and keep both original word arrays in the audit artifact. Do not silently skip an ayah without naming it.
5. Each advertised rule needs source-backed positive and negative examples. Cases dependent on riwayah, transmission, pause/continuation or contested scholarship must declare their scope or remain explicitly unresolved.
6. Keep semantic rule decisions separate from palette, user preferences and paint-overlap behavior.
7. Validate citation coverage, corpus reachability, course eligibility, practice pool coverage, and painter/inspector parity as distinct contracts.

## Next implementation stages

### A. Finish the current corpus evidence pass

Review the newest artifacts from [issue #31](https://github.com/AhmedKamal75/nur-al-dhikr/issues/31) and draft PRs [#39](https://github.com/AhmedKamal75/nur-al-dhikr/pull/39) and [#40](https://github.com/AhmedKamal75/nur-al-dhikr/pull/40). Keep the six word-boundary disagreements visible. Distinguish an orthographic alignment mismatch from a rule error and a rendered-glyph offset error.

### B. Expand the rule inventory before migrating another family

Map each classifier branch to its rule ID, source entry/review state, exception list, positive/negative fixtures, current-corpus reachability, and course/practice surfaces. Include all madd, tafkhim, meem, qalqalah and post-processing logic. Identify whether a repeated issue is caused by the ruling, its predicate, a source encoding, word context, alignment, span mapping, or presentation.

### C. Prototype by rule family, not by rewriting everything

For the next family, compare a small JS/JSON table plus named predicates against the existing implementation. Run both against pinned fixtures and the whole corpus; output a machine-readable difference report containing ayah, aligned word, original spelling, rule IDs, and span offsets. Every difference must be accepted as a source-backed correction, documented as a known unresolved case, or fixed as a regression.

### D. Production cutover gate

Do not replace the current classifier until the mismatch inventory is reviewed, all unapproved behavioral differences are explained, source-backed positive and negative tests pass, both readers use the shared semantic pipeline, the full-corpus audit has no silently unexamined rows, original-glyph spans are checked in both views, and CI/browser/offline contracts pass. Version and shell/hash/manifest markers must match. The owner must approve the full migration design before it expands beyond this prototype.

## Known limitations — intentionally not concealed

- This commit prototypes only the mutually exclusive noon/tanween next-letter table. It does not yet make every Tajweed rule declarative.
- The rule sets still require independent source-backed review; passing table tests only proves that code and table agree.
- The six source-word segmentation differences are not solved by this table.
- The current implementation can still misclassify a rule in the same way in both views. Cross-view parity must not be reported as full Tajweed correctness.
- No scholarly certification is claimed.
