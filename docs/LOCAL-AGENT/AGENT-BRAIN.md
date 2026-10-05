# AGENT BRAIN — Nūr al-Dhikr

This is the short-lived, high-signal operational context for the current local-agent session.
It is allowed to change as the evidence changes. Durable principles belong in `AGENT-MEMORY.md`.

## Current baseline

- Release: **v5.17.86**
- Stack: vanilla ES modules + plain CSS + no build step + no runtime dependencies
- Offline-first PWA
- Arabic + English
- No account, server, telemetry or ads
- Main top-level product doors: Home, Azkar, Qur'an, Ahadeeth, Prayer, Practise, You
- Mushaf is a specialized reader and should not be flattened into generic card UI

## Current review status

Browser evidence baseline: **v5.17.78 scored 9.35/10** in the weighted hostile review after a real Chromium run. That run found and fixed light-theme AA contrast failures, 44px touch-target contract failures, and a 25px Tajweed horizontal overflow; it also recorded one onboarding reciter persistence flake and 38 corpus-dependent failures in the seed bundle.

Current source baseline: **v5.17.86**. Treat the old 9.9 source claim as obsolete until the local browser matrix re-rates this tree. The machine run is the authority for geometry, visual overflow, interaction state, and screenshot claims.

## Current pass focus

- Main menu is now a true hierarchy: worship/product domains expand in the main menu; Zakat, Offline, Settings, and About are standalone application-tail siblings, with Settings then About last.
- Native `<details>` disclosure styling is explicitly reset; browser marker/dashed-line fallthrough is a defect.
- Home is a vertical editorial story: identity → Today/prayer context → actions → Shahada → next → reflection → context. Decorative/supporting panels must not precede Today.

- Section mode switches were changed from filled segmented controls to editorial navigation rails.
- Settings now leads with identity/search and a compact grouped You index.
- Audio manager lists use a restrained reading measure on wide screens.
- Data-absence Quran and Mushaf states preserve an accessible page heading landmark.
- Keep Focus Mode largely intact; its browser evidence is one of the strongest current surfaces.

## Product north star

The app should feel like one calm, serious worship tool rather than a feature marketplace.

`azkar.me` is a taste reference because it demonstrates:

- restraint
- direct information hierarchy
- semantic color
- strong Arabic reading focus
- limited chrome
- purposeful progress
- clean feature separation

Borrow the principles, not the implementation or proprietary assets.

## Current highest-risk feature areas

1. Azkar reading / Focus Mode
2. Audio player / playback controls
3. Tajweed course
4. Tajweed practice
5. Qur'an secondary controls / Study Tray / Word Study
6. Search / Favorites / Collections
7. Prayer / Qibla / Calendar
8. Khatma / Garden / Checklist / Statistics
9. Offline / install / update surfaces
10. Settings / appearance / language
11. Seasonal / Kids / Ramadan surfaces

## Known historical problem classes

These are not automatically still broken; they are traps to verify:

- arbitrary rainbow palette assignment
- card + detached action sandwiches
- oversized navigation controls
- duplicate navigation chrome
- zero-heavy first-run dashboards
- stat bars stretched across excessive whitespace
- AR bidi errors in number/slash runs
- English-only geometry checks
- fixed heights around translated text
- generic glass applied to everything
- utility features rendered as piles of cards
- feature interiors with no single focal task

## Working principle

One defect should trigger a search for the whole class.

Example:

> If one Arabic label clips at 393px, inspect every sibling navigation label and every translated long-string container. Do not just widen the one element.

## Evidence priority

1. Real browser screenshot/layout assertion
2. Real browser interaction test
3. Unit/integration test
4. Static inspection
5. Grep / search

Static inspection is never visual proof.

### v5.17.86 durable lesson — Home is not a launcher and Player is not a settings shelf

- Home must answer “what should I do now?” before “what else exists?”. Default Home therefore keeps only the daily core and two current-window adhkar shortcuts; optional reflection/support panels are opt-in.
- A feature's secondary controls should not compete with its primary action. The full-surah Player keeps transport visible and collapses repeat/speed/mute/sleep/mode/volume behind native disclosure.
- The Azkar browser now has a single search doorway and subtle daily anchors; its catalogue remains a library, not a dashboard.
- Focus completion is a session transition: count once, acknowledge briefly, then advance.
