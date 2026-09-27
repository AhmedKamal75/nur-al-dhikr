# DATA-SCHEMA.md — the shape of the data, and who may touch it

Read this before adding a field to anything under `data/`, and before changing
anything under `js/core/schema.js`.

## Layers

| Layer                  | Lives in                                                                        | Mutability                                                     | Gate                           |
| ---------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| Corpus                 | `data/*.json` (+ `.gz` twins)                                                   | **immutable once shipped**; regenerated only by a named script | `data/manifest.json` checksums |
| Corpus manifest        | `data/manifest.json`                                                            | generated                                                      | `npm run manifest:check`       |
| Normalisation          | `js/core/schema.js` (`normalizeItem`, `normalizeCategory`, `normalizeDocument`) | code                                                           | `tests/schema.test.js`         |
| Sanitisation (inbound) | `js/core/config/sanitize.js`, `js/core/state/restore.js`                        | code                                                           | sanitizer parity tests         |
| The lens (user prefs)  | `settings.contentPrefs` in local storage                                        | per user                                                       | `sanitizeContentPrefs`         |
| Custom content         | `state.customContent`                                                           | per user                                                       | via the editor service         |
| Blobs (audio)          | IndexedDB, own database                                                         | per user, capped                                               | `js/services/audioStore.js`    |

## Document shape

```
Document   { metadata: { id, name:{en,ar}, description:{en,ar}, version? }, categories: [Category] }
Category   { id, name:{en,ar}, description?:{en,ar}, order, icon?, color?, items: [Item] }
Item       { id, category_id, title:{en,ar}, arabic, transliteration?,
             translation?:{en,ar}, reference?:{...}, grade?, custom_grade?:{en,ar},
             repetitions, virtues?:{en,ar}, tags?, related?, notes?:{en,ar},
             audio?, image?, review? }
```

Two things to notice, both deliberate:

- **Almost every text field is `{en, ar}`.** Translation and transliteration are
  EN-only at render time, but they are stored bilingually so the corpus is not
  lossy. Do not collapse them to a single string.
- **Missing is not empty.** A field absent means "not known"; a field present
  and empty means "known to be empty". The distinction is what keeps an honest
  `Unknown` honest.

## Grades and religious data

- `grade` is only ever a value from a verified allowlist. An item with no
  verified grade carries `Unknown` and renders an unverified chip — never a raw
  string, never a plausible guess.
- `review` carries pending scholarly review state, which the UI surfaces as
  "unconfirmed attribution". It never exposes internal reviewer notes.
- Scripture text (Qur'an, mushaf pages, Hadeeth) may only be changed by a
  documented, citable repair — see `docs/RUNBOOK.md` §3 and
  `scripts/repair-scripted-text.mjs`.

## Adding a field

1. Add it to the normaliser in `js/core/schema.js` with a safe default.
2. If it is user-editable, add it to the corresponding form, the lens override
   list, and `sanitize.js` — a key the sanitizer does not know dies on reload.
3. If it is user-visible, add i18n in **both** languages.
4. If it is persisted, add it to `PERSISTED_KEYS` and the restore sanitizer.
5. Bump all five version markers, re-stamp the snapshot, regenerate the manifest.
6. Add a test that fails before the change.

## Hostile input

Anything restored from local storage, imported from a backup, or entered by a
person is untrusted. `sanitize.js` and `restore.js` are the boundary; every view
escapes at the sink with `escapeHTML`. This is not theoretical — a stored
attribute-breakout XSS via a crafted backup was found in this codebase and
fixed, and the regression test still runs.

## The manifest

`data/manifest.json` lists every shipped data file with a sorted SHA-256 and its
byte size, plus the app version. It exists so per-corpus drift becomes a CI
failure instead of a silent surprise on a reader's device. Regenerate it with
`npm run manifest:generate`; never hand-edit it.
