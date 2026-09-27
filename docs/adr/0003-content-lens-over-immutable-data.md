# 0003. The content lens over immutable data

- Status: Accepted

## Context

Readers want to curate their app: hide a section, reorder cards, raise a
repetition target from 3 to 33, fix a translation, delete a weak item, add
their own, and be able to undo all of it with one tap.

The corpus is scripture and sourced religious text. Modifying the shipped files
per user is unacceptable: it makes "restore defaults" impossible, breaks the
data manifest, and means a user edit can silently alter scripture.

## Decision

Bundled libraries are **immutable**. Every user change lives in
`settings.contentPrefs` as a **lens** over them, computed in one place
(`js/domain/contentLens.js` + `js/services/contentPrefs.js`). Views receive
already-lensed data and never re-derive the rules. Restoring a level is always
just deleting that level's override keys.

Custom, user-authored libraries are the one exception: they live in
`state.customContent` and are edited through the editor service, because there
is no bundled original to protect.

## Consequences

Easier: restore is trivially correct; the shipped corpus can never be corrupted;
a user edit is always auditable as an overlay; adding a new kind of preference
does not touch the data.

Harder: every view must read the lensed shape rather than the raw file, and a
new preference needs a key in the sanitizer or it dies on reload. We pay for
that with `tests/contentManage.test.js` and `tests/content-authority-depth.test.js`.

## Alternatives considered

- **Write user edits into the corpus files.** Simple, and destroys the
  "restore defaults" promise. Rejected outright for scripture.
- **A database overlay table.** More scalable, but the app has one user and no
  server; the settings snapshot already is the table.
