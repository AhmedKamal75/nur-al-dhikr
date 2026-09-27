# RUNBOOK.md — releasing, and what to do when something breaks

Operational procedures. If a procedure here is wrong, fix it in the same change
that taught you it was wrong.

---

## 1. Cutting a release

Preconditions: `npm run check` green, `npm run e2e -- --project=chromium` green,
working tree state understood (`git status --short`).

```bash
# 1. Bump all five markers, together
#    package.json · js/core/config.js (APP_VERSION) · sw.js (VERSION)
#    manifest.json (version + version_name) · docs/RELEASES.md (new ## vX heading)

# 2. Re-stamp the cache-first bytes and the data manifest
npm run snapshot-shell
npm run manifest:generate

# 3. If anything under data/ changed
npm run compress-data

# 4. Gate
npm run check
npm run e2e -- --project=chromium
```

`npm run snapshot-shell -- --check` exits non-zero on drift and is safe to run
in CI. A release where step 2 is skipped ships an app whose service worker
serves stale code to returning readers — the single most confusing failure this
project can have.

**You commit; the owner owns what reaches the remote.** `git commit` is
authorised (owner ruling, 2026-09-27) and expected. Local only: never
`git push`, never `--amend`, never `--force`, never rewrite published
history. One logical change per commit, a message that says what changed and
why, and both gates green before you commit — a red commit is worse than a
dirty tree because it launders a broken state into history.

### Release notes

Write them in plain language, newest first, under `## vX.Y.Z — a short title`.
Lead with what a reader will notice, not with file names. State honestly what was
deferred.

---

## 2. The failure modes you will actually hit

| Symptom                                 | Cause                                              | Fix                                         |
| --------------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Returning readers get old code          | snapshot not re-stamped, or version not bumped     | bump all five, `npm run snapshot-shell`     |
| `contracts.test.js` fails on lockstep   | one of the five markers missed                     | find the odd one out; they must be equal    |
| A new `js/` file 404s offline           | not in `sw.js` `APP_SHELL`                         | add it, re-stamp                            |
| A setting silently resets on reload     | key missing from `sanitize.js`                     | add the key                                 |
| A string renders as `home.panel.review` | missing i18n key in one language                   | add it to both                              |
| A CSS `var(--x)` gate fails             | custom property never defined                      | define it or use an existing token          |
| A `data-action` does nothing            | no handler, or not in the `mushaf-reorg` allowlist | add both                                    |
| 8 tests fail with ENOENT on data        | a seed bundle omitted a data directory             | bundle the data, or use the seed-mode guard |

---

## 3. Data corruption

If scripture data is ever found to contain replacement characters (`�`) or
stray control characters:

```bash
node scripts/repair-scripted-text.mjs            # Mushaf pages (self-contained)
node scripts/repair-scripted-text.mjs <dir>      # + Hadeeth, given a verified recovery dir
npm run compress-data && npm run manifest:generate
node --test tests/scripture-text-integrity.test.js
```

**Never invent the replacement text.** The script refuses to touch a token that
is not actually corrupted, and it throws rather than guess when a verified
source is missing. If you cannot find a source, leave the item flagged and open
a scholarly question in `docs/OPEN-ISSUES.md`.

---

## 4. Rollback

There is no server, so rollback is a git operation plus a version:

1. Revert the offending change.
2. Bump the patch version **again** (do not reuse a number — a service worker
   only reinstalls when the version string changes).
3. `npm run snapshot-shell && npm run manifest:generate && npm run check`.

Reader data is local and version-gated: a future-schema snapshot on disk is
left untouched and ignored rather than mangled, so a downgrade cannot destroy
someone's memorization history.

---

## 5. Reset and wipe paths

| Path                      | What it clears                                      | Where                       |
| ------------------------- | --------------------------------------------------- | --------------------------- |
| Settings → reset all data | state slices **and** IndexedDB, via the shared wipe | `js/app/handlers/system.js` |
| Error screen recovery     | the full wipe, including orphaned keys              | `js/ui/drawer.js`           |
| Clear one audio cache     | that cache only                                     | `js/services/audioStore.js` |

The user-facing reset must call the same full wipe as the error screen. A reset
that leaves audio or custom libraries behind is a false promise — it has been
called out in audit, and it is wired.

---

## 6. Incident notes

When something breaks in the field, record it in `docs/RELEASES.md` under the
fix, with: what the reader saw, the root cause, and the pin that would have
caught it. An incident without a new pin is an incident that can recur.
