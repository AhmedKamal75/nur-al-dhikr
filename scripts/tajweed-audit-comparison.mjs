/**
 * Pure comparison helpers for the cross-rasm diagnostic.
 *
 * Rule-ID set parity is not enough: a word can carry two spans for the same
 * rule in one source and only one in the other. Keep that independent from
 * rule-presence deltas and from letter-ordinal offset comparisons.
 */

export function groupSpansByRule(spans) {
  const groups = new Map();
  for (const span of Array.isArray(spans) ? spans : []) {
    if (!span || typeof span.rule !== 'string') continue;
    if (!groups.has(span.rule)) groups.set(span.rule, []);
    groups.get(span.rule).push(span);
  }
  return groups;
}

/**
 * Return cardinality differences only for rules present on BOTH sides.
 *
 * A rule absent from one side is already a rule-set mismatch; this helper is
 * specifically for the case a set comparison misses: same ID, different
 * number of glyph spans. Returned deltas are counts, not ayah-level totals.
 */
export function compareSharedRuleSpanCounts(quranSpans, mushafSpans) {
  const quranByRule = groupSpansByRule(quranSpans);
  const mushafByRule = groupSpansByRule(mushafSpans);
  const differences = [];

  for (const [rule, quranRuleSpans] of quranByRule) {
    const mushafRuleSpans = mushafByRule.get(rule);
    if (!mushafRuleSpans || quranRuleSpans.length === mushafRuleSpans.length) continue;

    differences.push({
      rule,
      quranCount: quranRuleSpans.length,
      mushafCount: mushafRuleSpans.length,
      quranOnly: Math.max(0, quranRuleSpans.length - mushafRuleSpans.length),
      mushafOnly: Math.max(0, mushafRuleSpans.length - quranRuleSpans.length),
    });
  }

  return differences.sort((a, b) => a.rule.localeCompare(b.rule));
}
