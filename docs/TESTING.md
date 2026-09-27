# TESTING.md — how this project proves things

The house rule: **verify by execution**. A grep is a hypothesis. A test is
evidence. A finding nobody ran is not a finding.

## The gates

```bash
npm run check                          # eslint + prettier + data manifest + node --test
npm run e2e -- --project=chromium      # full browser suite
npm run snapshot-shell -- --check      # cache-first bytes unchanged since the bump
```

`npm run check` is the definition of done. If it is not green, the work is not
finished, regardless of how correct it looks.

## What each layer is for

| Layer         | Command                                                   | Catches                                                                                                              |
| ------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Lint          | `npm run lint`                                            | style drift, unused code, restricted imports (the layering contract)                                                 |
| Format        | `npm run format:check`                                    | merge noise; a diff that is only reformatting hides a real change                                                    |
| Contracts     | `node --test tests/contracts.test.js`                     | version lockstep, shell snapshot, data manifest, i18n parity, dead `data-action`s                                    |
| Unit / domain | `npm test`                                                | pure logic: counters, lens maths, sanitizers, tafsil, prayer maths, tajweed classification                           |
| View          | (in `npm test`)                                           | views are pure `state → HTML`, so they are asserted by string, not by DOM                                            |
| Browser       | `npm run e2e`                                             | what only a real browser shows: route rendering, fullscreen, gestures, service worker, layout at real viewport sizes |
| Data          | `tests/scripture-text-integrity.test.js`                  | replacement/control characters in scripture, gzip/plain parity                                                       |
| A11y          | `tests/e2e/a11y-axe.spec.js`, `tests/a11y-budget.test.js` | automated axe passes and focus/keyboard behaviour on core surfaces                                                   |

## The discipline that matters

**A sweep that only finds bugs is a failed sweep.** Every fix lands with the pin
that would have caught it. When you fix something:

1. Change the code.
2. Add or extend a test that fails before the change.
3. Re-run the gate.
4. Re-stamp the shell snapshot if you touched `js/`, `assets/css/` or `sw.js`.

If the pin would be awkward to write, that is usually a sign the fix is in the
wrong layer.

## Things worth knowing before you write a test

- **Views are pure.** `renderX(state) → string`. Assert on the string; do not
  reach for a DOM.
- **The store is a singleton.** To test hydration you need a child process —
  the storage layer memoizes its localStorage probe at import time, so an
  in-process fake silently reuses the first case's connection. That mistake made
  a shipped feature look verified when it proved nothing.
  See `tests/first-run-language.test.js`.
- **Pure functions are cheap to pin.** The lens, the sanitizer, the counters and
  the tasbih rules are all pure on purpose. Test them directly rather than
  through a view.
- **Flakes get isolated, not deleted.** If a browser test fails, re-run it alone
  and say so in the report. Deleting a test to get green is worse than a red
  checkmark.

## Seed mode

A reduced bundle omits some data directories. Tests that genuinely need omitted
data use the seed-mode guard and say they skipped, rather than failing or
silently passing. A test that hides a real regression behind a skip is a trap;
the guard prints a visible skip reason for exactly that reason.

## What still needs a human

Headless Chromium cannot verify: real haptics, adhan audibility, screen-reader
output, sunlight readability, 3G install time, or the actual audible gap between
ayahs. Those live in `docs/DEVICE-TEST.md` and stay open until a phone says
otherwise.
