# PERFORMANCE.md — budgets and how they are held

The reference device is a low-end phone with roughly 200 MB free, on a poor
connection. Not a developer laptop. Every budget below exists because of that
device.

## Budgets

| Budget                              | Limit                                                              | Held by                                          |
| ----------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| Cache-first install (APP_SHELL)     | kept small; measured, not guessed                                  | `sw.js` `APP_SHELL`, snapshot gate               |
| First-paint critical JS             | the boot path only; views stay lazy                                | `tests/startup-budget.test.js`                   |
| Static view imports in the renderer | capped (currently **at the cap**)                                  | `tests/startup-budget.test.js`                   |
| Per-request connections             | the browser's pool; no unbounded parallel fetches                  | by review — verse prefetch is explicitly bounded |
| Audio cache on disk                 | 200 MiB default, user-adjustable 50–500 MiB, oldest-first eviction | `js/services/audioStore.js`                      |
| Custom content / attachments        | capped, with a quota preflight before a big download               | `js/app/offlineJobs.js`                          |
| Route-change re-render              | patch layer skips identical nodes                                  | `js/app/renderer.js`                             |

## Rules

1. **A new view is lazy unless it is trivially small.** The static budget is
   already at its cap; a new eager import is a regression someone will have to
   undo later.
2. **No new runtime dependency, ever.** See ADR 0002.
3. **Nothing in the boot path may fetch.** Boot wires; it does not load content.
4. **Downloads declare their size before they start.** The offline flow refuses
   a download that will not fit, with a number, rather than failing halfway.
5. **Measure before optimising.** `scripts/measure.mjs` emits the canonical
   numbers so documentation cannot drift from reality.

## Known costs, accepted

- **The audio mirror engine** holds a pool of decoded `<audio>` elements. That is
  the price of gapless playback, and it is a deliberate trade.
- **The lexical data** is large. It is on-demand, gzipped, and versioned in
  `data/manifest.json`; only the layers a reader actually opens are fetched.
- **A recitation that is prefetched on a bad network** can still gap. This is
  physics, documented rather than hidden: if fetch time exceeds ayah time, no
  finite buffer helps.

## What we cannot measure here

First paint on a real budget phone, install time on 3G, storage growth over
weeks of use, and the render cost of scrolling a very long list on a weak CPU.
These need hardware (`docs/DEVICE-TEST.md`) and are listed as open rather than
guessed at.
