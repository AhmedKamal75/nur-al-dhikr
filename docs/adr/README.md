# Architecture Decision Records

An ADR captures a decision that is expensive to reverse, in the moment it was
made, so a future maintainer does not have to re-litigate it or accidentally
undo it.

## Format

One file per decision, `NNNN-short-title.md`, numbered sequentially, never
renamed or rewritten after acceptance. To change a decision, write a new ADR
that supersedes the old one and edit the old file's Status line.

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

What forced a choice. Facts, not opinions.

## Decision

What we decided, in the active voice: "We will…".

## Consequences

What becomes easier, what becomes harder, and what we now owe.

## Alternatives considered

What we rejected, and the one-line reason.
```

## Index

| #                                                         | Decision                                    | Status   |
| --------------------------------------------------------- | ------------------------------------------- | -------- |
| [0001](adr/0001-zero-account-zero-server.md)              | Zero account, zero server                   | Accepted |
| [0002](adr/0002-no-build-step-no-dependencies.md)         | No build step, no dependencies              | Accepted |
| [0003](adr/0003-content-lens-over-immutable-data.md)      | Content lens over immutable data            | Accepted |
| [0004](adr/0004-one-voice-two-audio-engines.md)           | One voice, two audio engines                | Accepted |
| [0005](adr/0005-honest-absence-over-fake-completeness.md) | Honest absence over fake completeness       | Accepted |
| [0006](adr/0006-continuous-flow-pagination-opt-in.md)     | Pagination is opt-in                        | Accepted |
| [0007](adr/0007-ai-assistance-disclosure.md)              | Disclose AI assistance, never AI authorship | Accepted |
