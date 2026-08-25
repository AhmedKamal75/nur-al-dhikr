# Nūr al-Dhikr v3.1.0 — Full-App Adversarial Review

Conducted across every subsystem: calendar/notes/reminders, zakat, backup/
restore, editor, search, tasbih, focus mode, mushaf + quran readers,
notifications, storage, and mobile layouts. Both hostile personas ran
live in the browser with real network conditions.

---

## Review A — The hard-to-please software product reviewer

**A1. CRITICAL — Importing a backup permanently breaks the Qur'an and
Mushaf readers for the rest of the session.**
Reproduced deterministically: open the Mushaf (loads fine) → import any
backup → navigate to the Mushaf again → "Loading this page…" forever.
`RESTORE_STATE` resets the ephemeral `state.mushaf`/`state.quran`, but
the module-level `mushafMetaFetchStarted`/`quranMetaFetchStarted` guards
stay `true`, so the lazy meta fetch never re-runs. Only a full reload
cures it — and nothing tells the user that. Same failure via
"Reset app data".

**A2. CRITICAL — Import replaces ALL data with zero confirmation.**
Pick the wrong file (or an old backup): favorites, streaks, statistics,
collections — gone instantly, with a cheerful "Done" toast. No warning,
no preview, no undo. For an app whose entire privacy story is "your data
lives only on this device", a one-misclick total loss is unacceptable.

**A3. HIGH — The audio download registry lies after import.**
The `audioDownloads` registry rides inside the backup, but the actual
IndexedDB blobs do not. After importing on a new device, the grid shows
surahs as downloaded, the player badges "offline", and "Download All"
skips them — while playback secretly falls back to streaming. Verified:
registry claims 2 files, IDB has 0.

**A4. MEDIUM — Storage-quota failures are silent.**
`saveState()` returns a failure result that the debounced persister
throws away. A quota-exceeded event (large statistics history, hostile
imports) means every subsequent write is lost with no signal — the app
appears to save and doesn't.

**A5. MEDIUM — Reminders have no missed-minute catch-up.**
The scheduler matches the exact wall-clock minute on a 30s tick. A
suspended/background-throttled tab that skips the minute never fires the
reminder — no late delivery, no apology. Prayer/ramadan/zakat alerts
share the same minute-match pattern.

**A6. LOW — A mangled log string.**
`console.error('ushaf] failed to load page index', …)` — the `[m` was
lost, making the log unsearchable by "[mushaf]". Small, but it hid a
real failure during this very audit.

**A7. LOW — The checklist reducer accepts forged item keys.**
`CHECKLIST_TOGGLE` stores any `data-item` string, including `__proto__`
(verified in storage). Harmless today, but it lets garbage rows
accumulate and violates the guard pattern `PRAYER_LOG_CYCLE` already
follows.

**Praise where due**: editor CRUD (library → category → item) is clean
and instantly searchable; Arabic search is genuinely
diacritic-insensitive (سبحان الله finds سُبْحَانَ اللَّهِ); zakat math
is exact (nisab 85×75=6,375; rounding-up honored); reset-all-data DOES
confirm; calendar recurrence logic is correct; no horizontal overflow at
390px; XSS attempts all escaped.

---

## Review B — The suspicious, malicious, moody beta tester

**B1. "I imported the wrong file and lost everything."** ✗ FAILED ME
No confirm, no preview — just "Done" and six months of streaks gone.
This is the angriest I've been at this app.

**B2. "Your offline badge is a liar."** ✗ FAILED ME
Imported my backup on my new phone: grid full of checkmarks, "offline"
badges everywhere. Airplane mode: everything streams-or-dies. The files
never traveled — the app just kept the receipts.

**B3. "The Mushaf bricked itself."** ✗ FAILED ME
Imported a backup, went back to reading: "Loading this page…" — forever.
Reload fixes it, but nobody tells you that, and on a PWA you don't think
in reloads.

**B4. "I forged a checklist entry."** ✓ survived
Stored `__proto__: false` as a row. Didn't explode (nice), but it also
didn't say no. A tidy app says no.

**B5. "Editor + search + zakat gauntlet."** ✓ survived
Built a custom library, category, item with Arabic; found it via search
instantly; zakat numbers all recomputed correctly. The core is honest.

---

## Verdict (merged triage)

Must fix now: **A1/B3** (stuck readers after import/reset), **A2/B1**
(import confirmation), **A3/B2** (lying audio registry). Should fix now:
**A4** (quota surfacing), **A5** (reminder catch-up), **A6** (log
string), **A7/B4** (checklist key guard).
