# Nūr al-Dhikr — Owner-machine browser QA handoff v5.17.135

## Purpose

Recertify the deslopification changes on the real owner's Chromium environment. Do not infer visual success from source inspection.

## New priority: Audio sleep control

Capture EN + AR, light + dark at 360x800, 393x852, and 1024x768:

1. Open `#/audio` → Playback defaults.
2. Capture the initial state showing one sleep-timer control, not a selector plus player chip grammar.
3. Activate the sleep cycle repeatedly and prove the same ladder used by the live player: OFF → 5 → 15 → 30 → 45 → 60 → OFF.
4. Start a full-surah player and verify the live player chip reflects the same state.
5. Capture before/after screenshots where the interaction meaningfully changes.
6. Confirm EN/AR labels remain readable and no control wraps/clips at 360/393.

## Carry-forward deslopification cases

- v5.17.133 mobile seven-door active-state indicator: restrained indicator, no filled pill.
- v5.17.133 Home single-item Next-for-you geometry.
- v5.17.134 Offline Essentials: heading/body/switch visible without scrolling at phone widths; toggle persists across reload; secondary detail remains visually secondary.

## Hostile carry-forward matrix

- Azkar Details versus count/tap timing.
- Main-menu disclosure open/close.
- Settings 360/393 EN+AR light/dark and long metadata wrapping.
- Player narrow layout 360/393/1024/1440.
- Invalid Qur'an deep link.
- Hadith Details + Reference.
- Prayer methodology disclosure.
- Offline boot/install and Manage Offline visibility.
- Mushaf Find on page, single/spread, fullscreen.
- Bookmark reopen to exact ayah.
- Statistics / Checklist / Category disclosures.
- Retry affordances from v5.17.128–129.
- Persistent-storage request from v5.17.131.
- Oversized-import and reserved-key handling from v5.17.132.

## Evidence rules

For every changed state provide route, language, theme, viewport, exact action, initial screenshot, post-action screenshot where meaningful, pass/fail, and concise observation.

Do not reuse identical screenshots as proof of an interaction. Keep raw screenshots/logs in the return packet.
