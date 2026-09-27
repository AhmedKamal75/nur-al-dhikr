# 0004. One voice, two audio engines

- Status: Accepted

## Context

The app plays two different things: a recitation **ayah by ayah** from per-ayah
files, and a recitation **full surah** from a single file. They are different
engines with genuinely different capabilities.

A reader can start one while the other is sounding, and two players playing at
once is the worst possible outcome in an app meant for listening.

## Decision

We will keep **two engines and coordinate them so exactly one voice ever
sounds**: `js/services/surahPlayback.js` (verse, with per-ayah files, follow
along, and word-level study) and `js/services/player.js` (full surah, one file,
scrubbable). Starting either stops the other. Both surfaces render from the
same session snapshot, so the state is never ambiguous.

We will not fake the gap between their capabilities. Verse mode has no
within-ayah seek because per-ayah files have no internal offsets; file mode does
not highlight the current ayah because no keyless surah file publishes per-ayah
timings. Each says so honestly.

## Consequences

Easier: each engine can be simple internally, because cross-engine arbitration
lives in exactly one place. The one-voice rule is a property we can test
rather than hope for.

Harder: the player chrome has to reflect two different capability sets without
lying about either, and any new transport control has to decide what it means in
both. The unified player surfaces therefore render from a shared builder.

## Alternatives considered

- **One engine with two source shapes.** Tempting for a unified UI. Rejected:
  the buffering strategies genuinely differ (a queue of decoded per-ayah
  elements versus a single long element), and pretending otherwise produces
  the gaps the owner complained about.
- **Let both play.** Rejected on any reading of the product.
