# Nūr al-Dhikr v3.3.0 — Third Adversarial Review

Two hostile passes over the running app (fresh profile, real import flows,
DevTools open, 390 px and 1280 px viewports, online and offline, English and
Arabic). Every finding below was reproduced live before being written down;
anything that could not be reproduced was thrown out. Findings that turned
out to be display artifacts of the review tooling (e.g. an apparent
`a[href]` / `[mushaf]` mangling) were byte-verified against the source and
discarded.

---

## Review A — The hard-to-please software product reviewer

_Style: ships-review reports for a living; assumes every failure mode in
the spec WILL happen to real users; despises silent data corruption and
lying UI above all else._

**A1. CRITICAL — The Zakat calculator corrupts the numbers you type.**
Open the Zakat view and type `50000` into "Cash & bank", one digit at a
time like a normal human. The field ends up containing `00005`. Every
keystroke dispatches into the store, which re-renders the whole view and
replaces the `<input>`; the `refocusZakatInput` helper then restores focus
but deliberately skips caret restoration for `type="number"` inputs
(`setSelectionRange` throws on them), and Chromium parks the caret at
position 0. Every subsequent digit therefore inserts BEFORE the existing
text. The parsed value is silently wrong by orders of magnitude
(`00005` → 5), and the zakat result — a religious obligation — is
computed on it. No error, no warning: the app confidently reports zakat
on 5 currency units instead of 50,000. This is the single worst class of
defect a calculator can have, in the one view where accuracy is the
entire point.

**A2. HIGH — The Settings text-size sliders cannot be dragged.**
Drag the "Text size" or "Arabic text size" slider: the thumb moves one
step, then the drag dies. The `input` event dispatches on every tick,
`render()` replaces `#main`'s innerHTML, and the slider element you are
mid-drag on is destroyed — pointer capture goes with it. The only way to
move the slider is a series of discrete clicks. The fix the search boxes
use (debounce + refocus) was never applied here, and the sliders in the
Mushaf display-settings modal only survive because that modal lives
outside `#main`.

**A3. HIGH — The word-study popover lies the first time you use it.**
Fresh session → Qur'an → tap any word. The popover shows the root
correctly but reports **"0 occurrences in the Qur'an"** — for roots like
أله (2,842 occurrences) or سمو (381). `ensureQuranRoots` is fired
"fire-and-forget"; the modal is built before the 1 MB roots index
finishes loading and is never re-rendered when it arrives. The second tap
shows the truth. The first impression of v3.3.0's headline feature is
wrong data delivered with total confidence — exactly the failure mode
this app's own review history keeps punishing.

**A4. HIGH — The offline promise has a hole: three modules are missing
from the service-worker precache.**
`js/calendarNotes.js`, `js/components/calendarModals.js`, and
`js/prayerSound.js` are imported by `app.js` but absent from `APP_SHELL`.
On a first visit the ES modules are fetched before the worker activates
and takes control, so they never enter the cache during that visit. A
person who visits once, goes offline, and opens the installed app gets a
dead boot — the module graph fails to load. The same gap bites on
service-worker updates performed during a brief online moment. For an
app whose README leads with "offline-first, installable", an
install-then-offline failure is a broken promise, not an edge case.

**A5. MEDIUM — Fifteen tafsir tabs wrap into a ragged pile.**
The ayah-detail modal renders all 15 editions — 7 bundled, 8 downloadable
— as flex-wrapped chips. On a 390 px phone that is five uneven rows of
buttons with a lone long tab stranded on its own line. Every other
tabbed surface in the industry solved this decades ago: one horizontal,
scrollable strip. The content is magnificent; the container is a
junk drawer.

**A6. MEDIUM — The quiz grades you on answers it shows you.**
"What does this name mean?" displays the transliteration above the
choices — and `Al-Qadir` is sitting right there while "The Omnipotent,
The All-Able" is one of the four options. For the majority of the 99
Names the transliteration is a one-step decryption of the correct
answer. The global "show transliteration" reading preference should not
apply to a recall test; the transliteration belongs in the post-answer
reinforcement, not the prompt.

**A7. MEDIUM — Prayer times ignore the timezone the app stores.**
`settings.prayer.timezone` is saved and never read. Times are always
computed with the device's offset. For the normal case (device and
location agree) that is fine — but the app explicitly invites manual
coordinate entry, and entering, say, Tokyo coordinates from a Cairo
device produces "Dhuhr 5:42 AM". A clock time nobody can pray by,
presented without comment. At minimum the Prayer view must say clearly
when displayed times are in the device's clock rather than the target
location's.

**A8. LOW — The installed app's chrome color never matches its splash.**
`manifest.json` declares `theme_color: #0F766E` (teal); the runtime
`theme-color` meta is white in light mode and `#0B0F0E` in dark — never
teal. Minor, but it is the kind of sloppiness that reads as "nobody
looked at the installed app".

**A9. LOW — `npm test` is broken on current Node.**
`node --test tests/` (directory argument) was removed in recent Node;
on Node 22+ the script dies with `MODULE_NOT_FOUND` before running a
single test, while `engines` cheerfully claims `>=20`. Contributors on a
current toolchain get a red suite on a green codebase.

**A10. LOW — Backup export gives no feedback.**
Tap "Export backup": the browser's download shelf is the only
acknowledgment. A toast, like every other action in this app, is the
house style; its absence here reads as "did that do anything?"

**A11. LOW — `npm run check` is permanently red.**
Prettier fails on 68 files (acknowledged debt since v2.6.0), so the
stated quality gate cannot pass. Ship-blocking? No. But a gate that is
always red is worse than no gate: it teaches everyone to ignore it.

**Praise where due**: prayer-time solar math verified against an
independent NOAA implementation (within a few minutes — method
differences only); Arabic/RTL layout with zero horizontal overflow at
390 px across all 14 views; keyboard activation of tappable words works;
the live-region counter announcer is a genuinely thoughtful a11y touch;
word-study data covers all 77,429 words with zero gaps; custom content
flows (library → category → item) round-trip correctly through search
and Focus mode.

---

## Review B — The suspicious, malicious, moody beta tester

_Style: got the app from a shared folder; imports "helpfully provided"
backup files; pastes mangled links; trusts nothing that renders string
data without asking who wrote it._

**B1. CRITICAL — Stored XSS via a backup file, full chain, twice.**
Craft `backup.json` with
`settings.mushafPrefs.fontScale = '1" onmouseover="window.__xss=1;//'`.
Import it through the app's own Settings → Import flow (the confirmation
dialog warns about data replacement — nothing about code execution).
Navigate to the Mushaf: the article element now carries a live
`onmouseover` attribute, and hovering executes the payload. Confirmed
with `window.__xssFired = 1`. Two sinks:
`js/views/mushafReader.js` line 108 interpolates `prefs.fontScale` and
`prefs.lineSpacing` raw into a `style="…"` attribute, and
`js/views/tafsirPanel.js` interpolates the same values raw into the
sliders' `value="…"` attributes. The restore path never validates
`mushafPrefs` — `sanitizeRestoredPayload` covers zakat, bookmarks,
statistics… and not one field of `settings`.

**B2. CRITICAL — A second stored XSS, in the money view.**
Same game, different field: `zakat.prefs.currency` (or a snapshot's
`currency` in `zakatHistory`) containing `USD"><img src=x onerror=…>`.
`sanitizeRestoredPayload` only checks it is a string; `formatAmount()`
then interpolates the symbol raw into the result panel. Result: three
injected `<img onerror>` elements inside the zakat breakdown, handler
verified executing. An attacker who can get a victim to import a
"pre-filled zakat backup" runs script in the context of the app — which
holds the victim's entire devotional history.

**B3. CRITICAL — A truncated link bricks the app and begs you to wipe
your data.**
Open `index.html#/category/%C3` (a percent-truncated shared link — this
happens in the wild whenever a URL gets cut mid-escape-sequence).
`parseHash` calls `decodeURIComponent('%C3')`, which throws `URIError:
URI malformed`; `initRouter()` sits inside `boot()`'s try/catch, so the
victim lands on the "Something went wrong — this usually means saved
data on this device became corrupted… Reset app data" screen. On a
phone, that screen is a data-loss threat over a typo. Reloading with
the same hash reproduces it forever; only editing the URL by hand
escapes.

**B4. HIGH — Importing an honest old backup silently lobotomizes new
features.**
`RESTORE_STATE` and `hydrate()` merge settings with a SHALLOW spread:
`{ ...DEFAULT_SETTINGS, ...payload.settings }`. Any payload whose
`mushafPrefs` predates a field — or a hand-made backup, or my hostile
one — replaces the whole object, so `wordByWordStudy`, `wordUnderline`,
`pageFlipAnimation`, `font`, `paper`, and `defaultTafsir` silently
become `undefined`. Verified live: after import, every surah rendered
with zero tappable words; the v3.3.0 feature simply turned itself off,
no notice. The same shallow-merge trap exists for `settings.prayer` and
`settings.audio`.

**B5. MEDIUM — More unvalidated settings rendered into attributes.**
The Settings view interpolates `value="${s.fontScale}"`,
`value="${s.arabicFontScale}"`, and `value="${s.dailyGoal}"` without
escaping — the same injection class as B1, reachable from a tampered
`localStorage` or a crafted backup once any code path misses
sanitization. The lesson of B1/B2/B5 is one lesson: **imported settings
are untrusted input** and must be schema-validated per field, not spread
optimistically.

**B6. LOW — The reminder dedup set grows forever.**
`firedToday` in `notifications.js` accumulates one key per reminder per
day for the life of the tab. Trivial bytes, but it is called a "today"
set and never clears at midnight — a small lie with a small leak.

**Where I failed to break it (credit where due)**: editor item text,
custom-reciter names, bookmark notes and folder names, calendar-note
titles/bodies, and collection names are all correctly escaped — I tried
`<script>`, `<img onerror>`, and attribute breakouts in every one;
`normalizeCustomContentMap` survived malformed documents; the checklist
and prayer-log reducers reject forged ids (`__proto__` included);
importing a garbage JSON fails gracefully; the audio player honestly
reports download failures. The XSS holes are exactly and only where
*settings* — not content — flow into the DOM.
