# Nūr al-Dhikr v3.0.0 — Adversarial Product Review

Two independent hostile reviews conducted against the running app
(fresh install, real network, DevTools open, tab hedging enabled).

---

## Review A — The hard-to-please software product reviewer

_Style: ships-review reports for a living; assumes every failure mode in
the spec WILL happen to real users; despises silent failures and lying UI._

**A1. CRITICAL — The surah Play button is dead on first use.**
Reproduced: fresh session → Qur'an view → tap ▶ on any surah → _nothing_.
No toast, no bar, no sound. Root cause: the reciters catalog is lazily
fetched only when the Audio manager view renders; the play handler
depends on it and silently no-ops when it's empty. Every user whose
first touchpoint is the Qur'an view — the app's #1 surface — hits a
dead button. This is the single worst first-impression failure
shippable.

**A2. CRITICAL — Audio failures are silent, and the UI lies about them.**
Reproduced: start playback with an unreachable URL → `audio error 4` in
console, yet the player bar shows a _playing_ state with a pause button
and a 0:00 timer, forever. `playing: true` is dispatched optimistically
and never reverted. No toast, no retry, no error surface. Also:
`player.play()` has no `.catch()` — an IndexedDB failure becomes an
unhandled promise rejection. A user on a train through a tunnel gets a
player that mimes playing.

**A3. HIGH — Two audio engines play simultaneously.**
The full-surah player and the verse-by-verse recitation are separate
`<audio>` elements with zero coordination. Play a surah, then tap a
verse's listen button: both recite over each other. Closing the player
bar doesn't stop verse audio either. In a devotional app, overlapping
recitation is worse than a bug — it's disrespect.

**A4. HIGH — Keyboard users are locked out of ayah details.**
Mushaf ayahs render as `role="button" tabindex="0"`, but Enter/Space
does nothing — the delegated keydown handler never activates them. The
ARIA contract is broken: focusable, announced as a button, inert. A
keyboard-only user can see every ayah and open none.

**A5. MEDIUM — No download success feedback.**
Single-surah download shows "Downloading…" and then, when 2 MB finish
(or fail), …nothing. The only confirmation is a quiet checkmark that
appears on the cell. For an operation that takes seconds-to-minutes on
mobile networks, zero completion feedback is not acceptable.

**A6. MEDIUM — No buffering feedback on the player bar.**
Tapping play on a slow connection: bar appears, 0:00, no spinner, no
"buffering" state — indistinguishable from A2's dead-until-proven-
otherwise player for up to several seconds.

**A7. LOW — Verse recitation failures are fully silent.**
`recitation.play()` swallows its rejection; the button icon quietly
reverts with no explanation.

**A8. LOW — Seek commits only on release.**
Dragging the seek range shows no time preview until release — feels
dead under the thumb.

**A9. LOW — The Qur'an view never links to reciter selection.**
Verse reciter lives in Settings (5 fixed), surah reciter in the Audio
view (314+). Two disconnected pickers, and the reader view links to
neither. Discoverability failure by design.

**A10. LOW — Player state desyncs on OS-level pauses.**
If the audio element pauses itself (headphones unplugged, OS
interruption, tab suspension), the bar still shows _playing_ — the
store is only ever written by click handlers, never by the audio
element's real transitions.

_Praise where due: corrupted/tampered localStorage and hostile deep
links all failed safe; XSS attempts were escaped; offline playback of a
downloaded surah (IndexedDB path) worked with a deliberately poisoned
network URL. The plumbing is honest — the audio UX on top of it is
not._

---

## Review B — The suspicious, malicious, moody beta tester

_Style: imports garbage data by hand, edits localStorage in DevTools,
double-clicks everything, tests on a dying connection, and quits apps
that waste their time._

**B1. "I broke my own save file and the app just… worked?"**
`localStorage` → invalid JSON, then type-confused everything
(favorites as a string, khatmaPlan with negative targets, bookmarks
with numeric keys, settings with a bogus palette/language). App booted
and every view rendered. Disappointing — I wanted carnage. (Kept as a
regression note.)

**B2. "I deep-linked to garbage and it stayed up."**
`#/mushaf?page=99999` → clamped to page 604. `#/mood/<img onerror=x>` →
"Not found.", no script execution. `#/nonsense-view` → "Not found."
Also fine. Next.

**B3. "Two reciters at once — take THAT, app."** ✗ FAILED ME
Surah playing + verse tap = two tracks simultaneously. It _let me_ do
it. An app about the Qur'an let me make it recite over itself. This is
the one that would get the one-star review with a screen recording.

**B4. "I played a surah, then killed my Wi-Fi."** ✗ FAILED ME
Console shows the error; the UI keeps claiming it's playing. I waited
like an idiot. A lying progress bar is worse than an error message.

**B5. "Keyboard-only day."** ✗ FAILED ME
Tabbed through the Mushaf, focused an ayah (it says button!), pressed
Enter. Nothing. Space. Nothing. Closed the tab.

**B6. "I downloaded a surah on flaky airport Wi-Fi."**
"Downloading…" — then the toast vanished and I genuinely could not
tell whether it finished or died; I had to eyeball the grid cell. Make
up your mind, app.

**B7. "Double-click everything."**
Rapid play/pause/play on the player: converges, no zombie states.
Double-submit custom reciter: deduped by id. Passable.

**B8. "Silent verse button."**
Tapped verse ▶ with the network off: icon toggled back with zero
explanation. At least _pretend_ to tell me what happened.

---

## Verdict (merged triage)

Must fix now: **A1** (dead play button), **A2/B4** (silent lying audio
failures), **A3/B3** (simultaneous engines), **A4/B5** (keyboard
lockout). Should fix now: **A5/B6** (download feedback), **A6**
(buffering state), **A7/B8** (verse failure feedback), **A8** (seek
preview), **A10** (state desync). Won't fix this release (documented):
**A9** (reciter-picker unification is a design project), R10 (Play
Al-Fatiha is honest as labeled).
