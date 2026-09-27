# ROADMAP.md — where this is going

The roadmap is deliberately small and honest. Two documents carry the detail:

- **[`docs/PROJECT-PICTURE.md`](PROJECT-PICTURE.md)** — who the product is for
  and what the owner wants. Read this to understand _why_.
- **[`docs/OPEN-ISSUES.md`](OPEN-ISSUES.md)** — what is open, what is blocked on
  hardware, what is blocked on a scholar, and what has been decided against.

History of what already shipped is in [`docs/RELEASES.md`](RELEASES.md).

## Shape of the next work

**Near term — close the honesty gaps.**
Nothing here adds a feature; each closes a place where the app could mislead.

- Volume control for the verse engine, matching what file mode already has.
- A riwaya-mismatch warning when a non-Hafs voice plays over Hafs text.
- An orphan `data-action` registry test, so a dead control class is caught
  structurally rather than by grep.
- Accessibility coverage beyond the four routes currently under test.

**Near term — finish what was started.**

- Card-level reorder inside custom libraries, verified under the shared lens.
- Hadeeth citations, narrators, Arabic chapter names, global bookmarks.
- Azkar depth: per-item audio (only where a verified source exists), bilingual
  editing, stronger search.
- Elder Mode discoverability, and an in-app type scale that can actually reach
  the accessibility requirement.

**Deliberately slower, because they are not ours to decide.**

- Every open question about grades, orthography, adab guidance, and corpus scope
  that needs a scholar. Engineers flag; scholars rule. See
  `docs/OPEN-ISSUES.md` and `docs/adr/0005-honest-absence-over-fake-completeness.md`.

**Deliberately not happening.**

- Accounts, sync, community features, gamification of worship, mandatory
  pagination, AI-authored religious text, new locales for chrome before v6.

## Constraints that shape any plan

- No new runtime dependencies, no build step (ADR 0002).
- The renderer's static-view budget is **at its cap**, and `mushafReader.js` is
  near its line cap. New work that touches those must extract a module first.
- Every release bumps five version markers together and re-stamps the cache-first
  snapshot. There is no shortcut; see `docs/RUNBOOK.md`.
- A change is not done until `npm run check` and the Chromium e2e suite are
  green, and the pin that would have caught the bug exists.
