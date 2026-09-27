# 0007. Disclose AI assistance, never AI authorship

- Status: Accepted

## Context

Parts of the app's content were prepared with AI assistance. That is a fact
about provenance, and hiding it would be dishonest.

The temptation is to over-claim in the other direction — labelling every item
"AI-generated" — because a blanket label is easy. But the data does not support
it. The metadata records per-item authorship; it does not record which items
were touched by a tool. Asserting AI authorship per item would be a fabricated
claim about provenance, in a project whose central rule is never to fabricate.

## Decision

We disclose at two levels, and we do not overstate either:

- **Per item:** an honest review state — the attribution is unconfirmed and
  should be verified — shown where a reader is being asked to rely on it.
- **Corpus level:** a clear statement in About, `CREDITS.md` and
  `data/SOURCES.md` that the content was prepared with AI assistance, and that
  scripture text itself was never AI-generated.

We never label an item as AI-authored, because we cannot know it.

## Consequences

Easher: the disclosure is defensible because it claims only what can be shown;
a reader can see exactly where assistance ended and sourced data began; the
scripture integrity gate proves the text was not generated.

Harder: it is a weaker-sounding claim than "this is AI-generated", and a reader
may want per-item certainty we cannot provide. The honest answer is that the
provenance we have is per-field, not per-item.

## Alternatives considered

- **No disclosure.** Cheapest, and dishonest. Rejected.
- **Per-item "AI-generated" labels.** Stronger sounding, unsupported by the
  data. Rejected under ADR 0005 — it is the same class of error as inventing a
  grade.
