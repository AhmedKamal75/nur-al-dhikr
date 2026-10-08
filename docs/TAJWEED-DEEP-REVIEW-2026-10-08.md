# Tajweed Deep Review — 2026-10-08

This record consolidates the findings, corrections, assumptions, and remaining evidence gates from the deep Tajweed review. It exists so future work continues from verified facts rather than from chat memory.

## Review objective

The request was intentionally broader than “add a few Tajweed tests.” The section was treated as a hostile product/domain audit:

- inspect old assumptions and existing code;
- test every executable classifier rule;
- look for runtime defects that ordinary happy-path tests miss;
- inspect sacred-text boundary behavior;
- verify source/course consistency;
- improve the written curriculum direction;
- document what is proven versus merely plausible.

## Findings already identified

### A. Halqi Izhar was a real correctness defect

The course lesson for **Clear noon / الإظهار الحلقي** was previously wired to the Meem Sakinah `izhar_shafawi` rule.

The classifier also lacked an explicit Halqi Izhar branch.

The correction established a dedicated `izhar` identity with the throat letters:

`ء ه ع ح غ خ`

and added deterministic regression coverage.

### B. A second Halqi-Izhar defect survived the first correction

The later deep pass found that the executable branch referenced a misspelled/nonexistent identifier rather than the declared Halqi-Izhar letter set.

This matters because a registry entry and a unit test that only inspects metadata can both look healthy while the real branch still fails at runtime.

**Lesson:** every religious/domain rule needs a positive execution fixture that reaches the actual classifier branch.

### C. Whitespace was an unsafe semantic boundary

The Qur'anic corpus contains standalone ornaments/marks that are not pronunciation-bearing words.

Using the next whitespace token for lookahead can therefore break:

- Noon Sakinah/Tanween cross-word rules;
- Meem Sakinah cross-word rules;
- separated Madd;
- ayah-final stopping/madd logic.

The correct architecture is to retain exact source/render positions while maintaining a semantic sequence of pronunciation-bearing tokens for lookahead.

### D. Madd-final context needs explicit regression protection

A final pronunciation-bearing word may be followed by a standalone ornament. “Last whitespace token” is therefore not equivalent to “last pronunciation word.”

The test contract must include final-word cases with and without trailing standalone ornaments.

### E. Rule colors must never be domain truth

Tajweed colors are presentation metadata. The classifier must emit stable rule IDs; the UI may map those IDs to colors.

This prevents theme/palette changes from altering domain semantics and allows rules that intentionally have no color.

### F. The 20-rule matrix is necessary but not sufficient

A hand-built fixture for every executable rule proves reachability of those branches.

It does **not** prove corpus correctness.

The stronger next gate is execution against all 6,236 ayahs / 114 surahs, followed by frequency/anomaly analysis and trusted-reference comparison.

### G. Curriculum depth is a separate product problem

The repository already has meaningful Tajweed teaching infrastructure. It is incorrect to describe Tajweed as “only quizzes.”

The real gap is curriculum-level depth:

- objectives;
- sequencing;
- worked progression;
- misconceptions/common mistakes;
- mastery checks;
- review;
- beginner → advanced structure.

The documented direction is **Learn → See → Try → Check → Review**.

## Rules extracted from the review

The deterministic classifier currently targets 20 executable identities:

`hamzat_wasl`, `lam_shamsiyyah`, `ghunnah`, `ikhfa`, `izhar`, `iqlab`, `idgham_ghunnah`, `idgham_no_ghunnah`, `idgham_shafawi`, `ikhfa_shafawi`, `izhar_shafawi`, `qalqalah`, `tafkhim`, `madd_2`, `madd_iwad`, `madd_badal`, `madd_246`, `madd_munfasil`, `madd_silah`, and `madd_muttasil` / `madd_6` as represented by the implementation.

See **TAJWEED-RULE-MATRIX.md** for the fixture and verification contract.

## Assumptions explicitly rejected

1. **“A rule being present in the registry means the runtime implements it.”** Rejected.
2. **“A passing representative test means the rule is correct across Qur'an.”** Rejected.
3. **“The next whitespace token is always the next pronunciation-bearing word.”** Rejected.
4. **“The final array token is necessarily the ayah's final pronunciation word.”** Rejected.
5. **“Tajweed colors can serve as semantic identifiers.”** Rejected.
6. **“Tajweed is complete because the UI can launch a drill.”** Rejected.
7. **“A green CI result proves religious/content correctness.”** Rejected.
8. **“A curriculum can be scaled safely by dumping prose into the existing view.”** Rejected.
9. **“A competitor's course structure can be copied.”** Rejected; external products are shape benchmarks only.
10. **“A scholarly disagreement should be flattened into one application verdict.”** Rejected.

## Evidence hierarchy

1. **Canonical bundled Qur'an corpus and source registry** — data/provenance authority.
2. **Executable domain behavior** — implementation truth.
3. **Deterministic automated tests** — regression protection.
4. **Full corpus sweep** — broad runtime integrity.
5. **Trusted external/reference annotation comparison** — classification validation.
6. **Chromium/device evidence** — actual UI/interaction truth.
7. **Human scholarly review** — required for unresolved religious/content disagreements.

No lower layer should be presented as proof of a higher layer.

## Current state

Formal release remains **v5.17.136** until implementation, CI, local corpus execution, browser evidence, and release ritual justify a new release.

The documentation here deliberately records unresolved evidence rather than marking the section “perfect.” The objective is to remove obvious defects and make the remaining uncertainty explicit.

## Next Tajweed work after this record

When implementation evidence becomes available, continue in this order:

1. Run the 6,236-ayah sweep locally.
2. Analyze per-rule frequencies and anomalies.
3. Investigate every zero-hit or suspiciously dominant rule.
4. Compare against an appropriate trusted annotation/reference source.
5. Resolve genuine classifier defects without forcing false positives.
6. Verify the full course/source mapping.
7. Build and test one curriculum-grade exemplar lesson.
8. Run Chromium Tajweed flows in EN/AR, light/dark, narrow/desktop.
9. Only then decide whether another implementation wave is warranted.

**Stopping criterion for this review:** stop claiming completeness; continue improving whenever concrete evidence identifies a defect or meaningful product gap.
