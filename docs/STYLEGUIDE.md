# STYLEGUIDE.md — how code should look here

The short version: **match the file you are in**. This file explains the rules
that are not obvious from any single file, and the ones that exist because
something went wrong the hard way.

## Layering

```
core/      no imports from app/ or views/ — the foundation
domain/    pure logic; may import core/
services/  may import core/ + domain/; no view imports
ui/        presentation primitives; no state, no handlers
views/     pure state → HTML; no listeners, no direct data fetching
app/       composition, handlers, wiring — the only place that knows about all of it
```

Enforced by `eslint.config.js` restricted imports. If you need to break a layer,
that is an architectural conversation, not a lint suppression.

Two sanctioned exceptions exist and are annotated in place: `ui/card.js` reading
locale and completion domain helpers, and `ui/` reading pure grade helpers. Do
not add a third silently.

## Comments

Comments explain **why a non-obvious decision was made**, never what the next
line does.

```js
// Bad — says what the code says
// Loop over the items
for (const item of items) {

// Good — says why this is not the obvious thing
// The EFFECTIVE item target is authoritative: a counter record left stale by
// an older build must not quietly shrink the target the person set.
const target = item.repetitions || counter?.target || 1;
```

Version-tagged comments (`(v5.x.y)`) are used when a comment records _why_
something odd is still there. Use them sparingly and keep the version honest.

## Naming

- Files are kebab-case; the only exception is the two letter-prefixed i18n files
  (`en.js`, `ar.js`).
- Functions are camelCase; exported constants are SCREAMING_SNAKE when they are
  frozen data.
- `data-action` names are kebab-case verbs: `counter-tap`, `open-focus`,
  `content-hide-item`.
- i18n keys are dotted and namespaced by surface: `backup.invalidJson`,
  `mushaf.bookmarked`.

## CSS

- Logical properties only: `inline-size`, `margin-inline-start`,
  `padding-block`, `border-block-start`. Physical properties are banned except
  inside a documented exemption (a small allowlist exists in the RTL test).
- Every `var(--token)` must resolve, or `tests/cssDesign.test.js` fails. Define
  the token or use an existing one — do not inline a colour.
- `rem` for type, logical units for spacing, `dvh` for full-height scrollers.
- Respect `prefers-reduced-motion`. The player idle fade and the celebration
  blooms both honour it, and their reduced-motion behaviour is pinned.
- No `!important` except in the print stylesheet.

## i18n

- Every user-facing string in **both** languages, always. A missing language is a
  failing gate, not a nit.
- Never concatenate sentence fragments across languages; use a placeholder in a
  single string.
- Transliteration and translation never render in the Arabic UI. Proper nouns
  (surah, reciter names) are the deliberate exception.

## Data

- `escapeHTML` on every interpolated value, every time. There have been stored
  XSS findings in this codebase already, including one via a crafted backup.
  Escape at the sink, not at the source.
- Hostile input is assumed. `sanitize.js` and `restore.js` are the boundary.
- Religious data is never generated, inferred, or paraphrased. Verified source,
  or an honest empty state. See ADR 0005.

## Caps

- `js/views/mushafReader.js` stays under 800 lines.
- The renderer's static view imports are capped (currently at the cap).
- Change and input registry counts are pinned by test.

Approaching a cap is a signal to **extract a module**, not to raise the cap.

## Dependencies and build

None. No framework, no bundler, no runtime package. If a change needs a
dependency, it is the wrong change. See ADR 0002.
