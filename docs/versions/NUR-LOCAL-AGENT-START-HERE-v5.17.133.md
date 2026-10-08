# Nūr al-Dhikr — Owner-machine browser QA handoff v5.17.133

## Purpose

Run the real Chromium/device evidence pass for v5.17.133. Do not infer visual success from source inspection.

## Required screenshot matrix

### Home / mobile navigation

Capture EN + AR, light + dark at:

- 360x800
- 393x852

Capture:

1. Home top state with the seven-door mobile dock.
2. Each of the seven doors active in turn.
3. Home with only one resume destination so the compact `Next for you` state is visible.
4. Home with multiple resume destinations if the test state supports it.

### Home / desktop

Capture EN + AR, light + dark at 1440x900 and 1024x768:

1. Home initial state.
2. Single-item Next for you state.
3. Multiple-item resume state if available.

### Carried-forward hostile matrix

Recapture the previously flagged cases from v5.17.126–132:

- Azkar Details vs counter/tap timing.
- Main-menu disclosure open/close.
- Settings 360/393 EN+AR light/dark, including long metadata.
- Player narrow layout at 360/393/1024/1440.
- Invalid Qur'an deep link.
- Hadith Details + Reference.
- Prayer methodology disclosure.
- Offline boot/install and Manage Offline visibility.
- Mushaf Find on this page, single/spread, fullscreen access.
- Bookmark reopen to exact ayah.
- Statistics / Checklist / Category progressive disclosures.
- v5.17.128–129 Retry actions.
- v5.17.131 persistent-storage request.
- v5.17.132 oversized-import rejection and reserved-key rejection UI/flow.

## Interaction evidence

For every changed behavior, provide:

- before/after or initial/post-action screenshots when meaningful;
- exact route;
- language;
- theme;
- viewport;
- action performed;
- observed result;
- pass/fail.

Do not reuse identical screenshots as proof of a changed state.
