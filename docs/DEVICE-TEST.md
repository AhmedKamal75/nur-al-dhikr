# Real-device test checklist (30 minutes)

These behaviors have no headless equivalent — a simulator cannot produce
touch gestures, sensors, haptics, or OS audio policy. Run this pass on one
physical phone before any release claim. Check off with date + device.

## Setup

- [ ] Serve over HTTP on LAN (`python3 -m http.server 8080`), open on the
      phone, install as PWA (Add to Home Screen), then go offline and
      relaunch — app must boot fully offline.

## Touch & gestures (Mushaf)

- [ ] Pinch-zoom vs swipe-turn arbitration: two-finger pinch scales text,
      one-finger swipe turns pages; a pinch never triggers a page turn.
- [ ] Edge tap zones in TRUE fullscreen turn pages; controls auto-fade
      after ~3s idle and wake on tap.

## Background & alerts (Prayer / Ramadan)

- [ ] Wake lock re-arms after tab switch back to the Mushaf/Ambient view.
- [ ] Adhan audio fires audibly at a prayer time with the tab open (after
      one prior tap — autoplay policy); with the tab closed, only the
      plain system notification arrives (documented limitation).
- [ ] Haptics: counter taps vibrate; milestone taps buzz stronger.

## Sensors (Qibla)

- [ ] Compass settles to a stable bearing outdoors; the uncorrected-magnetic
      hint shows where expected; denying sensor permission degrades honestly.

## Offline honesty

- [ ] Cold-cache offline start of a never-opened Mushaf page shows the 503
      error state with a working Retry (never a blank page or stuck
      skeleton).

## Install path (v5.17.31 — BLOCKED:device, no headless equivalent)

- [ ] Android/Chrome: the onboarding step offers Install; accepting the
      real browser dialog installs and completes the step, dismissing it
      hides the offer and stamps the deferral (re-offered after 7 days).
- [ ] "Not now" defers without consuming the dialog; "Show install again"
      resurfaces it after the cooldown.
- [ ] iPhone/iPad: the iOS Share → Add to Home Screen steps end on the
      home screen; airplane-mode relaunch from the icon boots fully
      offline with the offline-ready badge shown.

## Sign-off

Date: ________ Device: ________ OS/browser: ________ Tester: ________
