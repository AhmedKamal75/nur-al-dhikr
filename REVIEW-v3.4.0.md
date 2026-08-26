# Live Walkthrough Review — v3.4.0

A full, screen-by-screen live user-walkthrough of v3.3.1 (the previous
review's fixed build), performed exactly the way an impatient real user
moves through an app: opening every view, clicking every control,
rage-tapping counters, typing hostile data into every form, importing a
crafted backup, and dropping the network mid-session. Each finding below
was reproduced live in the browser before being written up, and every fix
was re-verified the same way after implementation (fresh session, service
worker evicted, console clean).

Method note: two suspected "defects" discovered during this pass — a
"corrupted" `FOCUSABLE_SELECTOR` in modal.js and a "broken" destructure in
notifications.js — turned out to be terminal display artifacts (the tool
chain eats `[h`-style bracket fragments). Both were byte-verified with
`od -c` and discarded, exactly as documented in REVIEW-v3.3.0.md. One
further suspected defect (tasbih "losing" rapid taps) was an artifact of
reading debounced localStorage mid-flight; a DOM-level re-test showed all
20/20 rapid taps registering. Nothing ships on a finding that wasn't
reproduced at least twice.

---

## The walkthrough (what was exercised, screen by screen)

### 1. First launch & Home
- Fresh-profile boot, onboarding "Getting started" panel (inline, as
  designed), all four nav groups (Read / Worship / Tools / Mine).
- Theme toggle rage-clicked 3× — theme cycles cleanly, no flash, no errors.
- Reflection card: Listen / Favorite / More exercised; the card menu
  (Copy / Share / Add to collection) opens and acts; Copy shows its toast
  on both success and failure paths.
- **W-1 found here** (see below).

### 2. Prayer
- "Enable Location" under headless geolocation denial → graceful toast,
  no crash.
- Manual coordinates: native min/max validation blocks 999 / −999;
  boundary values (90, 180) accepted; polar-coordinate math produces a
  sane 320° NW qibla bearing and 7,625 km distance.
- XSS payload in the location name field → stored raw, rendered escaped.
- Prayer-log and alert buttons rage-clicked 3× each — no double-toggles,
  no stuck state.

### 3. Library → Category → cards
- Library: all mood tiles, Adhkar/Duas/99 Names sections render with
  counts.
- Morning Adhkar category: every card control exercised.
- **W-2 found here** (see below).

### 4. Qur'an, Mushaf, Tafsir, Word study
- Surah list with working search (XSS query safely yields "no results";
  "Baqarah" filters to exactly the one surah; Arabic query returns 29).
- Classic reader (Al-Fātiḥah): per-ayah Listen / Export / Tafsir, per-word
  study buttons.
- Tafsir modal: all 8 editions present; tab strip rage-clicked through
  15 tab elements — content switches, no crash, no leaked listeners.
- Word study popover: full morphology (transliteration, grammar, prefix
  segmentation) from both the classic reader and the Mushaf.
- Mushaf: page 1 renders; next/prev paging updates the hash; jump form
  clamps −5 → page 1 and rejects 99999; word tap opens word study.

### 5. Qibla, Ramadan, Calendar, Checklist
- Qibla: compass-enable denial handled; static bearing UI intact.
- Ramadan: Hijri date (12 Rabīʿ al-Awwal 1448 AH), countdowns to 1
  Ramadan (166 d → 8 Feb 2027) and Eid (196 d → 10 Mar 2027) —
  independently recomputed and correct.
- Calendar: month grid, day-detail modal, note form with repeat options.
  Hostile note title/details → stored raw, rendered escaped.
- Checklist: all 8 checkboxes toggled in one pass — correct toggle
  semantics, persisted.

### 6. Tasbih
- 20 rapid taps with fresh element references → 20/20 register, counter
  3/33 → 22/33, one increment per tap. Lifetime statistics consistent.
- Target − / + steppers respect `Math.max(1, …)`.
- Persistence is debounced at 200 ms — acceptable loss window.

### 7. Zakat
- Hostile inputs: 999999999999 cash (formatted with separators), −50 gold
  weight (neutralized to 0 by `num()`), `1e999` (rejected as non-finite),
  −3 household members (clamped to 0 by `computeFitr`).
- **W-3 found here** (see below).

### 8. Statistics, Favorites, Collections, Editor
- Statistics: totals, streaks, weekly chart, month heatmap, most-read —
  all consistent with the session's actual activity.
- Favorites: heart toggle on a category card → item appears in Favorites.
- Collections: created one with a hostile name → renders escaped.
- Editor: full CRUD walk. New library / category / item forms submitted
  with hostile content in **every** field (title, Arabic, transliteration,
  translation, all four reference fields, virtues, tags, notes) — every
  field renders as escaped text; `repetitions: -7` clamped to 1 by schema
  normalization; duplicate → delete-with-confirmation round-trips
  correctly.

### 9. Search
- "mercy" → 40 results; Arabic "الرحمن" → 29 results; XSS garbage →
  safe empty state. Search-as-you-type uses replaceGo (no history spam).

### 10. Settings (every control)
- Language → العربية: instant full RTL flip (dir, lang, nav labels).
- Theme/palette/shape/font buttons via `set-setting` — palette switch
  verified (sapphire).
- Font-scale slider: CSS var applies live, slider element survives
  re-render (v3.3 self-render fix still holds).
- Accessibility / content-display checkboxes toggle and persist.
- Reciter picker renders all 5 defaults + link to the full 314-reciter
  manager.
- **W-4 found here** (see below).
- Export Backup works; **Import Backup re-attacked with the v3.3 XSS
  chain** (mushafPrefs.fontScale attribute injection + zakat currency +
  hostile prayer.locationName): all neutralized — no live elements, no
  injected attributes, escaped rendering everywhere. The v3.3 fix holds.
- Reset All Data: confirm modal → state wiped to defaults, home renders.

### 11. Audio manager, Quiz, Focus, Mood, About, Offline
- Audio manager: 314 reciters listed with offline-download affordances.
- Quiz: start screen renders (10-question flow available).
- Focus mode: enters with item position "1 / 59", exits cleanly.
- `#/mood` bare → graceful "Not found." (by design; `#/mood/anxious`
  renders 85 items — noted as a polish nit, not a defect: a bare /mood
  could redirect to the Library).
- About: renders privacy statement and credits.
- **Offline**: network disabled, hard reload → app boots fully from the
  service-worker cache (248 KB rendered view), exactly as the offline-
  first promise requires.

---

## Confirmed defects and their live fixes

### W-1 — A modal survives view navigation (medium, UX/state)
**Repro.** Open a card's "More" menu on Home, then press the browser Back
button (or swipe back on mobile). The hash changes and the view under the
overlay re-renders — but the action sheet stays open on top, offering
Copy / Share / Listen for a card that no longer exists, with focus still
trapped inside it. The overlay blocks the whole screen until it is
manually dismissed.

**Root cause.** Every `closeModal()` call lived inside click handlers
(each of which correctly closes before `go()`), but the navigation paths
that bypass handlers — history navigation, deep links — never closed an
open modal.

**Fix.** `onStateChange()` in app.js now closes any open modal when a
`NAVIGATE` action is dispatched (app.js, "FIX (walkthrough v3.4 W-1)").
All existing call sites already closed modals before navigating, so this
is purely a safety net for the history/deep-link paths. Verified live:
menu open → hash change → modal gone, prayer view interactive.

### W-2 — Zero visible feedback for tapping a target=1 dhikr (medium, UX)
**Repro.** On any category card with a single repetition (Ayat al-Kursi,
Sayyid al-Istighfār, most duas), tap the counter pill repeatedly. Every
tap completes a cycle and instantly resets the count, so the label stays
"0 / 1" forever and the progress ring never fills. On desktop — no
haptics, sound often muted — the tap produces **no visible change
whatsoever**. The completion is only observable in Statistics.

**Root cause.** The pill rendered only `count / target`; the completed-
cycles state (`completedCycles`, persisted per item) was never surfaced.

**Fix.** The counter pill now renders a completion badge — a check icon
plus the completed-cycle count — and gains a `--done` state (brighter
ring) as soon as `completedCycles > 0` (js/components/card.js, cards.css,
"FIX (walkthrough v3.4 W-2)"). New i18n key `card.completedTimes`
(EN/AR) provides the tooltip. Verified live: tap Ayat al-Kursi → badge
"✓ 1" appears immediately; four taps → "✓ 4".

### W-3 — Double-escaped currency in the nisab threshold line (low, correctness)
**Repro.** Type a currency containing markup characters (e.g. `AT&T` or
`<b>$</b>`) into the Zakat currency field. The result panel renders it
correctly (single-escaped), but the "Nisab threshold:" line under
*Nisab & prices* shows the entity text itself: `6,375 &lt;b&gt;$&lt;/b&gt;`.

**Root cause.** `formatAmount()` escapes the symbol internally (the
v3.3 B2 fix — "escaped HERE, once, at the boundary"), but
`nisabPanel()` **pre-escaped** the currency with `escapeHTML()` before
passing it in — a double escape. The other three panels passed the raw
string and were correct.

**Fix.** `nisabPanel()` now passes the raw string to `formatAmount()` and
uses the escaped form only for the input's `value=""` attribute
(js/views/zakat.js, "FIX (walkthrough v3.4 W-3)"). Verified live: fresh
session + hostile currency → threshold renders `0 AT&T <b>u</b>` as text,
exactly once-encoded.

### W-4 — Reminders with unparseable times survive restore and silently never fire (medium, data integrity)
**Repro.** Import a backup (or tamper localStorage) carrying
`reminders: [{ id: "bad", time: "25:99" }]`. The reminder appears in
Settings as a live, enabled reminder — but `minutesSince()` parses "25:99"
to NaN, `shouldFire()` is always false, and the reminder **never fires**.
The user believes they have an alert and silently doesn't. Calendar notes
have the same hole via `reminderTime` (which passes restore completely
unvalidated through the `...payload` spread). Real users are protected by
`<input type="time">` + native validation; the attack surface is
backup import and storage tampering.

**Fix.** Three layers (all marked "FIX (walkthrough v3.4 W-4)"):
1. `sanitizeRestoredPayload()` now drops reminders whose `time` fails a
   strict `HH:MM` clock regex, and normalizes an unparseable note
   `reminderTime` to `null` (js/state.js).
2. `makeReminder()` falls back to the default time for garbage input
   (js/notifications.js) — defense in depth for programmatic callers.
3. Regression tests cover both layers.

Verified live: tampered state
`[good:06:30, bad:25:99]` + note `reminderTime:"nope"` → after rehydrate:
`[good:06:30]`, note time `null`.

---

## Verified non-issues (false alarms worth recording)

- **modal.js "corrupted selector"** (`aref]` in the displayed source) —
  display artifact; `od -c` shows `a[href]`. The same artifact struck
  `const [h, m]` in notifications.js. Rule reaffirmed: byte-verify with
  `od` before trusting any bracket the terminal shows you.
- **"Tasbih loses rapid taps"** — an artifact of reading debounced
  localStorage (200 ms window) during a synchronous click loop. DOM-level
  measurement: 20/20 taps register.
- **`#/mood` "Not found"** — by design; mood requires an id and the
  Library tiles always link with one. (Polish nit, not fixed: a bare
  `#/mood` could redirect to the Library.)
- **Bottom-nav "covering" the More button** — the a11y locator matched a
  hidden 0×0 mobile nav toggle; the real card menu button has clean
  geometry.
- **Copy toast "missing"** — headless clipboard permission makes the
  failure path fire; both paths toast correctly.

## Security regression summary

The v3.3 hardening was re-attacked and held: crafted-backup import
(mushafPrefs attribute injection, zakat currency, hostile location name),
hostile names/notes/collections everywhere they render, hostile reminder
times (now also W-4-sanitized), malformed deep links, and offline boot.
No new injection surface was found; every user-string sink inspected
renders through `escapeHTML()` or `formatAmount()` exactly once.

## Test and verification status

- 233/233 unit tests pass (226 pre-existing + 7 new regression tests in
  `tests/review-v3.4-fixes.test.js` covering W-2, W-3, and W-4).
- eslint clean over `js/` and `tests/`; prettier applied to all files
  touched by this review.
- All four fixes re-verified live in a fresh browser session with the
  service worker evicted: badge renders, modal closes on navigation,
  currency single-escapes, hostile reminder times drop — with a clean
  console throughout.
