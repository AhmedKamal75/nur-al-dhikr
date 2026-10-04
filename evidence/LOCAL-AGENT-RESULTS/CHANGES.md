# CHANGES — Nūr al-Dhikr local-agent run

All work happened in the separate clean worktree `/tmp/opencode/nur-5177`.
The owner's working tree was **not touched at all** (see `RUN-SUMMARY.md` §1).

Release produced: **v5.17.78**, from the handoff's v5.17.77.

---

## How the list below was established

Each change is the diff between the **pristine handoff overlay** and the final
tree, so overlay content and my edits are not confused. Every new assertion was
re-run against a **reintroduced** defect to prove it fails, before being trusted.

---

## A. Defects in the handoff archive, fixed

### A1 · `manifest.json` shipped split version markers — P1

`"version": "5.17.72"` beside `"version_name": "5.17.77"`.

The contract let it through because it asserted
`!manifest.version || manifest.version === fromPkg` — a **wrong** marker read the
same as an **absent** one.

- **Changed:** both markers asserted with exact equality; `package-lock.json`'s
  root `version` pinned as a sixth marker (the v5.17.66 tree carried lock
  `5.17.2` against package `5.17.66`).
- **Proven:** reintroducing `5.17.72` + lock `5.17.2` makes the contract fail
  with `manifest.version 5.17.72 != 5.17.77` and
  `package-lock root version 5.17.2 != 5.17.77`.
- Files: `manifest.json`, `tests/contracts.test.js`.

### A2 · The handoff failed its own formatter gate — P1

`prettier --check` → exit 1, **24 files**, proven on the pristine archive in a
separate directory before any edit of mine.

- **Changed:** `npm run format`. Mostly mechanical reflow; the diff looks large
  in `assets/css/deslopify.css` and `docs/BACKLOG.md` for that reason.

### A3 · Raw `z-index: 1` in the new stylesheet — P2

`assets/css/deslopify.css` (Garden timeline icon) bypassed the `--z-*` scale.

- **Changed:** `z-index: var(--z-raised)` — the token documented for exactly
  this local stacking.
- **Changed, class-level:** the contract scanned only `assets/css/*.css`, so it
  could not see `index.html`'s inline `<style>`. It now scans that too, with the
  `file://` emergency notice as a documented, named exception.
- Files: `assets/css/deslopify.css`, `tests/contracts.test.js`.

---

## B. Defects the browser found that no static gate could — P1

### B1 · `--color-text-muted` below AA on ~30 views

`#6d756c` on the paper `#f6f1e6` = **4.22:1** (needs 4.5). One token, 21 failing
e2e assertions.

- **Changed:** `#616961` — 5.04:1 on `--color-bg`, 4.64:1 on the darkest light
  surface. Chosen over exempting it or nudging it to the threshold.
- File: `assets/css/deslopify.css`.

### B2 · The contrast gate was certifying a token the cascade had already overridden — P0 process

**The finding that mattered most.** `tests/cssDesign.test.js` asserted "text
tiers hold AA on every surface" and **passed**, while the browser rendered a
failing colour.

`blockTokens()` read `CSS['variables.css']` and took the first `:root`. The
handoff added a second `:root` in `deslopify.css`, which `index.html` loads
**last**; equal specificity + later source order meant deslopify's token won. The
gate went on certifying the dead `#6e6952` (4.90:1, passes) instead of the live
`#6d756c` (4.22:1, fails).

- **Changed:** `blockTokens()` now resolves the **effective** token set in the
  shell's real cascade order — the stylesheets `index.html` links, in document
  order, then the route-lazy sheets the renderer injects later. Single source of
  truth is the shell, not a hardcoded filename.
- **Proven:** the repaired contract immediately failed with
  `light: --color-text-muted on #f6f1e6 = 4.23 (need 4.5)`, and surfaced a second
  violation the browser run never exercised (B3).
- File: `tests/cssDesign.test.js`.

### B3 · `midnight` palette primary text below AA in dark mode — P2

Reachable only because B2 was fixed. `#111827` mixed 50% with white for
`--color-primary-text` = **4.43:1** on `#202923`. 10 of 11 palettes pass; this
one missed by 0.07.

- **Changed:** `#111827` → `#1a2338`, same near-black navy identity, **4.75:1**.
- File: `js/core/config/views.js`.

### B4 · Gold text on a gold chip — P1

`.home-hero--line .home-hero__hijri`: `color-mix(--color-gold 88%, --color-text)`
on its own 10% gold tint = **3.72:1**.

- **Changed:** 88% → 70% gold → **4.74:1** on the tint, 5.26:1 on plain surface.
- **Pinned by:** a new contract that **parses the actual percentage out of the
  stylesheet**. My first attempt hardcoded `70` and would have passed with the
  rule reverted to 88% — a decorative test. Rewritten to read the declaration,
  then proven to fail on the reintroduced 88%.
- File: `assets/css/deslopify.css`, `tests/cssDesign.test.js`.

### B5 · `opacity` on text voiding a measured token — P1, both themes

`.taj-course__stage-count` carried `opacity: 0.7` in `tajweed-course.css` while
its colour was assigned in **another file** as `--color-text-muted`. Composited:
**3.00:1 light / 2.13:1 dark**.

The repo had already documented this exact trap and removed twelve sibling cases
in v5.17.64, but its gate only sees `color` + `opacity` in the *same* rule — a
scope it states honestly. axe over the route matrix is the gate for the
cross-file case, and it fired.

- **Changed:** alpha removed; the token already expresses "secondary".
- **Pinned by:** a contract asserting the absence of `opacity` in that rule,
  naming why the generic gate cannot see it.
- Files: `assets/css/tajweed-course.css`, `tests/cssDesign.test.js`.

### B6 · Chip hit-area apron clipped by its own element — P1 touch target

A real defect, not a test artifact. Reproduced in Chromium with
`elementFromPoint`: `.card__meta > .chip { overflow: hidden }` clipped
`.chip::after { inset-block: -8px }`, because the apron is a **descendant** of
the clipped box. The chip looked 40px and *was* effectively 40px, not the 56px
the apron exists to provide; a pointer 5px off the top or bottom landed on
`.card__top`.

- **Changed:** `overflow: clip` + `overflow-clip-margin: 8px`. Keeps the
  ellipsis, restores the apron.
- **Measured:** `overflow-clip-margin` is a **no-op on `overflow: hidden`** in
  Chromium — verified, because I was about to ship that. `overflow: clip` is
  required, and only the pair works. Also verified truncation still applies
  (`scrollWidth > clientWidth`).
- **Class enumerated:** a structural scan of every stylesheet found **exactly
  one** rule clipping an apron carrier.
- **Pinned by:** a structural contract pairing real `overflow` declarations with
  real apron declarations on the same selector — no class-name guessing, which
  the suite explicitly rejects for good reason.
- Files: `assets/css/cards.css`, `tests/cssDesign.test.js`.

### B7 · Segmented control widened the whole page in English — P1, bilingual

`scrollWidth` **413** vs `clientWidth` **334** with `overflow-x: visible` →
**66px of unintended page-wide horizontal scroll** at 360×800, 4 of 5 options
visible. **Arabic measured 334/334 and was never broken.**

- **Changed:** `flex-wrap: wrap` in a `max-width: 480px` breakpoint. Rejected
  `overflow-x: auto`, which also zeroes the page scroll but hides the fifth
  option behind a scroller (measured 4/5).
- **After:** 0px overflow across all 40 re-measured cells, 5/5 visible, every
  button ≥ 44px, **Arabic unchanged**.
- **Pinned by:** a bilingual contract, proven to fail on both the missing wrap and
  the scroller variant.
- Files: `assets/css/components.css`, `tests/cssDesign.test.js`.

---

## C. Test infrastructure — fixed at the cause

### C1 · `mushaf-drag` measured a node that might not exist yet

`dragBook()` read `.mushaf-book` after a flat `waitForTimeout(2000)`; under load
it was still null and the helper threw on `getBoundingClientRect`.

- **Changed:** `locator('.mushaf-book').first().waitFor({ state: 'attached' })`,
  and the flat wait dropped to 400ms.
- **Not** a longer sleep, **not** a retry — the timing assumption is gone.
  3/3 in isolation.
- File: `tests/e2e/mushaf-drag.spec.js`.

---

## D. Release ritual

Because two cache-first bytes had to change and `tests/contracts.test.js`
correctly demands a version bump for that, the release is **5.17.78**.

```
package.json 5.17.78 · package-lock 5.17.78 · config.js APP_VERSION 5.17.78
sw.js nur-al-dhikr-v5.17.78 · manifest version 5.17.78 · version_name 5.17.78
docs/RELEASES.md ## v5.17.78 · docs/BACKLOG.md current version v5.17.78
npm run snapshot-shell   -> stamped 276 files at v5.17.78
npm run manifest:generate-> wrote 2350 files (full, v5.17.78)
npm run compress-data    -> compressed 2351 files: 175.6 MB -> 26.4 MB
```

The handoff's own `data/manifest.json` described a **26-file slim seed**; it was
regenerated against the real 2350-file corpus, so `manifest:check` certifies the
build that actually ships.

---

## E. Files changed by me (semantic changes only)

| File | What |
|---|---|
| `manifest.json` | both version markers → 5.17.78 |
| `package.json`, `package-lock.json` | 5.17.78 |
| `js/core/config.js` | `APP_VERSION` |
| `sw.js` | cache `VERSION` |
| `js/core/config/views.js` | `midnight` palette `#111827` → `#1a2338` |
| `assets/css/deslopify.css` | `--color-text-muted`; gold 88%→70%; `z-index` → `--z-raised` |
| `assets/css/cards.css` | chip `overflow: clip` + `overflow-clip-margin: 8px` |
| `assets/css/tajweed-course.css` | removed `opacity: 0.7` |
| `assets/css/components.css` | `.segmented` wraps at ≤480px |
| `tests/contracts.test.js` | strict version lockstep + lock pin; z-index scans inline `<style>` |
| `tests/cssDesign.test.js` | effective-cascade token resolution; 4 new contracts |
| `tests/e2e/mushaf-drag.spec.js` | race fixed at the cause |
| `docs/RELEASES.md`, `docs/BACKLOG.md` | v5.17.78 entry; honest version/gate line |
| `data/manifest.json`, `tests/app-shell-hashes.json` | regenerated / re-stamped |

Plus Prettier reflow of the 24 handoff files that failed A2.

## F. Deliberately NOT changed

- `AGENTS.md`, `MEMORY.md` — no durable product principle changed. (The owner may
  want the contrast-gate lesson recorded; that is an owner's call, not mine.)
- `docs/LOCAL-AGENT/*` and the handoff's review docs — read, not rewritten.
- The `reciter-row__meta` clip and the palette single-source-of-truth problem —
  both reported with proposals in `OPEN-FINDINGS.md`, both are visible design
  decisions, both belong to the owner.
- The owner's dirty working tree — untouched, exactly as instructed.
