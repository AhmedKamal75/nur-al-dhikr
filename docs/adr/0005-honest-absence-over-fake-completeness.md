# 0005. Honest absence over fake completeness

- Status: Accepted

## Context

A coverage number is a comfortable thing to show. A 100% graded corpus looks
finished; an honest `Unknown` looks incomplete.

The pressure to fill the gap is real and the temptation is specific: a grade can
be inferred from a pattern, a translation can be paraphrased from a similar
verse, a timing can be interpolated. Each of these would be a fabrication of
religious data, presented to a reader as fact, in an app whose entire value is
that it can be trusted with worship.

## Decision

Where a religious fact lacks a verified source, we display an honest
`Unknown`/empty state and we never machine-fill it. Engineering flags the
absence; a scholar rules on the truth.

This applies to grades, timings, translations, reciter attributions, tafsir
attribution, and scripture text itself. It is also why the corpus-level
disclosure says "prepared with AI assistance" rather than pretending otherwise:
assistance is a fact we can state, authorship per item is a claim we cannot
prove.

## Consequences

Easier: the data stays defensible; a scholar can audit it; a wrong grade cannot
enter through a build step. The repair work that found and fixed 180 corrupted
scripture characters was possible precisely because the gate rejects them.

Harder: some surfaces visibly show "unverified"; coverage percentages stay
lower than a fabricated corpus would claim; the app cannot claim to be
"complete".

We accept that. A worship tool that admits a gap is more useful than one that
fills it with a guess.

## Alternatives considered

- **Infer grades from collection standing.** E.g. labelling an item from the
  Two Sahihs as `Sahih`. Rejected: collection standing is not item grading, and
  the difference is exactly what a reader is relying on.
- **Mass-generating commentary to reach 100%.** Rejected: LLM-authored
  religious text is the clearest version of the failure this decision exists to
  prevent.
