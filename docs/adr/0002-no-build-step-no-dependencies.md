# 0002. No build step, no dependencies

- Status: Accepted

## Context

The app needs a per-word lexical dataset in the tens of thousands of rows, a
frozen view registry, a strict CSS load order, and a service worker precache
list that must exactly match the files on disk.

Every one of those is a place a build step can quietly break. A transpiler can
emit something the service worker list does not name; a bundler can reorder
imports and change startup cost; a dependency can vanish from a registry and
take a feature with it. All of it is invisible until it is expensive.

## Decision

We will use **vanilla ES modules and plain CSS with no build step and no runtime
dependencies**. The repository is served as-is. Any change needed to ship a
feature is a change a reader can trace by reading the file.

## Consequences

Easier: a bug is always reproducible from the tree; no toolchain rot; no supply
chain; the service worker precache list is greppable; the whole app is readable
in one sitting.

Harder: no TypeScript, no bundler-level code splitting (we lazy-load views by
dynamic `import()` instead), and we own our own small utilities. We also pay
the discipline cost of enforcing structure with tests rather than a compiler —
`tests/contracts.test.js`, `tests/review-v3.3-fixes.test.js` and
`tests/startup-budget.test.js` exist precisely because there is no compiler to
catch these mistakes.

## Alternatives considered

- **Vite + TypeScript.** Real developer ergonomics. Rejected: it buys
  type-safety and bundling at the cost of the precache list being generated
  rather than declared, which is the one thing this app cannot have generated.
- **A framework.** Rejected: the app is document-shaped, and a framework would
  add a runtime cost to every reader for no user-visible gain.
