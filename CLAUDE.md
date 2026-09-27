# CLAUDE.md

This project keeps one set of agent rules, in one file, for every tool:
**[`AGENTS.md`](AGENTS.md)**. Read that first — it is the contract, and it is
not Claude-specific.

Then, in order:

1. [`MEMORY.md`](MEMORY.md) — the project's working memory: what it is, the
   decisions that are settled, the traps.
2. [`docs/PROJECT-PICTURE.md`](docs/PROJECT-PICTURE.md) — who the product is
   for and what the owner actually wants.
3. [`docs/OPEN-ISSUES.md`](docs/OPEN-ISSUES.md) — what is still open and why.

## Non-negotiables, restated because they matter most

- **Never invent religious data.** Verified source, or an honest
  `Unknown`/empty state. Never a plausible guess.
- **Commit your work, with a real message.** One logical change per commit,
  never `wip`, both gates green first. Never push, amend or force.
- **Every user-facing string in Arabic AND English**, or the parity gate fails.
- **Verify by execution.** A grep is a hypothesis; a test is evidence. Never
  report a finding you did not run.
- **Bump all five version markers together**, then `npm run snapshot-shell` and
  `npm run manifest:generate`. `npm run check` must be green before you say you
  are done.

## If a session is compacted or dies

`MEMORY.md` + `docs/RELEASES.md` + `git diff` is the entire recovery path. If
you learn something worth keeping, write it into one of those three before you
run out of context. Do not rely on conversation history surviving.
