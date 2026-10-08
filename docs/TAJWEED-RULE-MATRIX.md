# Tajweed Rule Matrix — Runtime and Curriculum Contract

**Date:** 2026-10-08  
**Formal app baseline:** v5.17.136  
**Purpose:** durable record of the Tajweed rules, their runtime identity, behavioral test expectations, and curriculum implications established during the deep Tajweed review.

> This document is an engineering/content contract, not a fatwa and not a scholarly annotation corpus. Rule definitions and citations must continue to come from the repository's sourced Tajweed registry. Where scholarship differs, the product must preserve attribution and disagreement rather than manufacture a single universal position.

## 1. Deterministic classifier rule set

The current deterministic classifier has 20 executable rule identities. Each must have:

- a stable rule ID;
- a positive behavioral fixture;
- a source-backed registry entry where applicable;
- at least one reachable example in the canonical Qur'an corpus;
- tests proving emitted spans stay inside their source word;
- bilingual learner-facing naming;
- no accidental dependence on a decorative/UI color.

| # | Rule ID | Family / trigger summary | Required behavioral fixture |
|---:|---|---|---|
| 1 | `hamzat_wasl` | Hamzat al-Wasl behavior in the supported orthographic context | `ٱلْعَالَمِينَ` |
| 2 | `lam_shamsiyyah` | Definite-article lam before a sun letter | `ٱلرَّحِيمِ` |
| 3 | `ghunnah` | Noon/meem mushaddad nasalization in the supported classifier context | `إِنَّ` |
| 4 | `ikhfa` | Noon sakin/tanwin before an Ikhfa letter | `مِنْ` + next `ك` |
| 5 | `izhar` | Noon sakin/tanwin before a throat letter (Halqi Izhar) | `مِنْ` + next `ه` |
| 6 | `iqlab` | Noon sakin/tanwin before baa | `مِنْ` + next `ب` |
| 7 | `idgham_ghunnah` | Noon sakin/tanwin before the supported Y/N/M/W assimilation set | `مِنْ` + next `ي` |
| 8 | `idgham_no_ghunnah` | Noon sakin/tanwin before lam/raa | `مِنْ` + next `ل` |
| 9 | `idgham_shafawi` | Meem sakin before meem | `هُمْ مِّنْ` |
| 10 | `ikhfa_shafawi` | Meem sakin before baa | `عَنْهُمْ بِآيَاتٍ` |
| 11 | `izhar_shafawi` | Meem sakin before the non-meem/non-baa cases | `أَلَمْ نَشْرَحْ` |
| 12 | `qalqalah` | Qalqalah letter in the supported sukun/context | `يَدْخُلُونَ` |
| 13 | `tafkhim` | Supported heavy/emphatic Allah-letter context | `ٱللَّهِ` |
| 14 | `madd_2` | Natural/basic two-count madd | `قَالَ` |
| 15 | `madd_iwad` | Madd al-'Iwad in the supported final-word stopping context | `عَلِيمًا` at ayah end |
| 16 | `madd_badal` | Madd al-Badal | `آدَمَ` |
| 17 | `madd_246` | Supported 2/4/6-count stopping-related madd context | `الرَّحِيمِ` at ayah end |
| 18 | `madd_munfasil` | Separated madd across a word boundary | `فِي` + next `أ` |
| 19 | `madd_silah` | Supported صلة هاء الضمير context | `بِهِۦ` |
| 20 | `madd_muttasil` / `madd_6` | Connected madd / six-count terminal case as represented by the classifier | `جَاءَ` / `الضَّآلِّينَ` |

### Important implementation note

The classifier rule IDs are implementation identities. They must not be treated as a complete scholarly taxonomy. The sourced registry may contain more rule/source records than the deterministic classifier currently emits, including contested material and reference-only families.

## 2. Canonical source and curriculum rule

The course currently has:

- 8 stages;
- 17 sessions;
- a sourced rule registry;
- guided and open paths;
- rule-level examples and classifier-backed practice.

The product direction is **Learn → See → Try → Check → Review**.

A future full lesson should include, as appropriate:

1. orientation/prerequisite;
2. observable objectives;
3. source-backed teaching text;
4. canonical Qur'anic worked examples;
5. identification/notice interaction;
6. applied practice;
7. mastery check;
8. common mistakes;
9. source/citation and explicit disagreement;
10. revisit/next lesson.

Do not turn this into a large prose dump. One complete exemplar must be validated before scaling.

## 3. Sacred-text data rules

1. Never retype Qur'anic examples when the canonical bundled corpus can supply them.
2. Preserve the original rendering/index relationship when adding semantic analysis.
3. Semantic tokenization may skip standalone Qur'anic ornaments for lookahead/boundary decisions, but rendering must retain them.
4. Cross-word rules must inspect the next **pronunciation-bearing** token, not blindly the next whitespace token.
5. Ayah-final logic must remain correct when a standalone ornament follows the final pronunciation-bearing token.
6. Every emitted span must map back to the correct source word and character range.
7. Unknown rule IDs are test failures.
8. No classifier result may silently invent a religious classification merely to make a test pass.

## 4. Rule correctness gate

The 20-rule fixture matrix is necessary but insufficient.

The stronger gate is a corpus-wide run over all **6,236 ayahs / 114 surahs** that records:

- execution success;
- rule IDs emitted;
- source word/span validity;
- ayah/surah coverage;
- per-rule frequency;
- zero-hit rules;
- suspiciously dominant rules;
- malformed/empty spans;
- boundary-sensitive cases;
- examples containing standalone ornaments;
- final-word/stopping contexts.

A successful execution sweep proves runtime integrity. It does **not** prove that every classification agrees with a qualified scholarly annotation source.

The next evidence level is comparison against a trusted, appropriately licensed/reference annotation corpus, followed by human review of disagreements.

## 5. Explicit boundary regression

A previous review exposed two classes of defect that must remain permanently guarded:

### Halqi Izhar

The noon/tanwin throat-letter lesson was incorrectly wired to the Meem Sakinah rule, and the classifier initially lacked an explicit Halqi Izhar branch. The fix introduced the throat-letter set:

`ء ه ع ح غ خ`

and a dedicated `izhar` rule.

A later audit also caught an executable identifier mismatch between the declared Halqi-Izhar letter set and the identifier used by the branch. This is precisely why the rule must have an actual positive execution fixture rather than only a registry entry.

### Ornament-aware lookahead

Whitespace is not a safe definition of a pronunciation word. Standalone Qur'anic ornaments can sit between meaningful tokens.

The classifier therefore needs two simultaneous models:

- **rendering sequence:** exact source order/indices, including ornaments;
- **semantic sequence:** pronunciation-bearing tokens used for lookahead and boundary logic.

This separation is intentional and must not be “simplified” back into whitespace splitting.

## 6. Color is presentation, not truth

Tajweed highlighting colors are a UI encoding.

Tests and domain logic must never infer religious classification from CSS color names, RGB values, theme colors, or palette position.

The stable contract is:

**source text → classifier rule ID → sourced rule metadata → presentation color (if one exists)**

A rule may legitimately have no color. For example, the current contract explicitly protects the absence of a color for the `izhar` rule where the source/UI methodology requires it.

Changing a palette must therefore never change classification.

## 7. Bilingual parity

For every learner-facing Tajweed rule/lesson:

- EN and AR names must exist;
- instructional meaning must remain semantically equivalent;
- citations and source labels must remain aligned;
- no language may silently downgrade a rule to a vague label;
- long Arabic strings must be tested at narrow widths;
- RTL layout must not alter rule identity or interaction state.

## 8. What remains unproven

The following must not be claimed complete until evidence exists:

- all 6,236 ayahs executed locally;
- every classifier output is scholarly/reference-correct;
- every course lesson is pedagogically complete;
- Chromium Tajweed UI has been verified across required viewports/themes/languages;
- Firefox/WebKit behavior;
- screen-reader and keyboard interaction;
- real audio/recitation behavior;
- performance of large corpus highlighting on constrained devices.

These are evidence gates, not reasons to stop improving the implementation.

## 9. Definition of “done enough” for this section

Tajweed can leave the active engineering queue only when:

1. the deterministic 20-rule matrix passes;
2. the 6,236-ayah sweep passes locally;
3. all anomalous/zero-hit outputs are explained;
4. trusted-reference comparison has either passed or every disagreement is documented and intentionally resolved;
5. course/source mappings are consistent;
6. the curriculum exemplar is validated in EN/AR and responsive/offline modes;
7. Chromium evidence covers the actual Tajweed flows;
8. no obvious stale comments, dead identifiers, duplicate rule definitions, or contradictory documentation remain.

This is intentionally stronger than “the tests are green.”
