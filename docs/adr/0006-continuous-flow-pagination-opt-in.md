# 0006. Pagination is opt-in, and never interrupts a flow

- Status: Accepted

## Context

Search results over tens of thousands of items need chunking. That is a solved
engineering problem and the obvious fix is to paginate every long list.

But this app is read and listened to in flows. A person reciting a section, or
reading a passage, or working through a search for one word, is _inside_ a
gesture. A "Load more" boundary appearing in the middle of it — or worse, a
page break — turns reading into navigating, and during recitation it is an
interruption in worship.

## Decision

Continuous scrolling and "Load more" are the default. **Explicit pagination is
opt-in, per surface**, and never injected into a recitation or reading flow the
person is currently inside.

Where chunking is needed for performance, it must be invisible: the list grows
as the reader approaches its end, and a flow under way is not broken by a
boundary.

## Consequences

Easher: the reading and recitation experience stays a single unbroken motion,
which is what the owner asked for by name. Search can still be chunked where
chunking helps.

Harder: some lists are genuinely long, and "everything at once" has a real
memory cost. We manage it with windowing and the lazy view registry rather than
with visible pagination.

## Alternatives considered

- **Paginate everything.** Simpler, and it breaks the flow. Rejected — this is
  the clearest example of a technically reasonable change that damages the
  product.
- **Endless scroll only, no opt-in.** Even simpler, but the owner asked to keep
  the choice available for the surfaces where it genuinely helps (large search
  result sets).
