# Browser evidence — v5.17.135 audit and v5.17.136 remediation

Real Chromium (Playwright 1.63.0, `chromium-1243`), headless, against the
extracted `NUR-AL-DHIKR-v5.17.135-FULL.zip`.

- SHA-256 of the input ZIP: `5e724741e5ebaf524a65428bde9a9e0f9217015a4575e6583f7a6e90ef6a3252`
  — matches the checksum the release announced.
- Raw artefacts: `findings.json` (50 browser observations) and the screenshots
  named below.

## 1. Gate numbers, re-measured

| Gate                                                | Result                                               |
| --------------------------------------------------- | ---------------------------------------------------- |
| `npm test` on 135 (281 files)                       | **2831 / 2831 pass** — the release's claim confirmed |
| `npx playwright test --project=chromium` on **135** | **166 passed, 10 failed, 3 skipped**                 |
| the same on **126** (previous head)                 | **165 passed, 11 failed, 3 skipped**                 |

135 introduced **zero** new browser failures against the previous head and
fixed exactly one (`offline-essentials.spec.js:127`). The same 10 failed in
both trees.

## 2. The regression 135 shipped with

Any interaction inside a `<details>` on `#/audio` collapsed **every**
disclosure on the route. Attribution run, identical user actions:

| Build     | disclosures open before | after one in-panel interaction |               |
| --------- | ----------------------- | ------------------------------ | ------------- |
| v5.17.126 | 5                       | 5                              | preserved     |
| v5.17.135 | 5                       | **0**                          | all collapsed |

Reproduced with only real user actions — click the `<summary>`, then tap the
control:

```
after USER summary click: {"label":"Sleep timer off","detailsOpen":true, "reallyVisible":true}
user tap 1:               {"label":"5m",            "detailsOpen":false,"reallyVisible":false}
user tap 2:               BLOCKED — element is not visible
```

Cause: the new `audio-sleep-cycle` handler dispatches `setAudioPlayer`, which
re-renders the route, and `patchElement()` stripped the `open` attribute
because no view modelled it. At 126 the `<select>` used a path that left it
alone.

**Why it mattered more than the headline feature:** the unified ladder is
correct in source and its state genuinely is shared, but a user could take only
**one rung per opening of the panel** — measured at **5 re-opens per 6-tap
walk**, at all twelve viewport × language × theme cells.

Fixed in v5.17.136 (`open` is a user-owned toggle; state-driven disclosures
opt in with `data-open-controlled`). Verified after the fix — 5 of 5 panels
hold through the full walk:

`5m -> 15m -> 30m -> 45m -> 60m -> Sleep timer off`, panels open 5 → 5.

Screenshot: `REGRESSION-FIXED-audio-after-walk.png`.

## 3. Cleared: the bilingual sleep label

The handoff asked to confirm no wrapping/clipping at 360/393 in EN and AR. It
does not. Read from the label's own box, not the button's:

| Config           | box    | label              | lines | white-space | content in box | wraps | clipped |
| ---------------- | ------ | ------------------ | ----- | ----------- | -------------- | ----- | ------- |
| en 360x800       | 260x44 | "Sleep timer off"  | 1     | nowrap      | 114px / 258px  | false | false   |
| ar 360x800       | 260x44 | "أُلغي مؤقت النوم" | 1     | nowrap      | 79px / 258px   | false | false   |
| en 393x852       | 293x44 | "Sleep timer off"  | 1     | nowrap      | 114px / 291px  | false | false   |
| ar 1024x768 dark | 643x44 | "أُلغي مؤقت النوم" | 1     | nowrap      | 79px / 641px   | false | false   |

A constant `scrollWidth-clientWidth = 6px` appears in **every** config
including English, so it is not language-specific and produces no visible
clipping. **Cause not determined** — recorded as an observation, not a defect.

Corrected mid-pass: the first version of the harness reported
`wraps=true clipped=true` in all 12 cells by dividing the button's height by
its line-height, which counts padding. That would have invented an Arabic-only
layout defect. The harness was fixed and the verdict re-measured.

## 4. What passed

- **Shared ladder state** — the actual deslopification claim. Armed from Audio
  settings → the live player chip reported `aria-pressed="true"` / `04:59`
  **without being touched**, then one click on the chip moved the Audio
  settings control `5m` → `15m`. Two surfaces, one ladder, one state.
  Method caveat: the player was created via the app's own store, not by
  pressing play, because headless has no audio device. Real playback is
  **unverified**.
- **Sleep control count** — exactly 1 control, 0 selects, at every
  viewport/language/theme. No split-brain duplicate remains.
- **Offline Essentials visibility** — heading, body and switch all inside the
  first viewport, both languages, all three viewports.
- **Offline Essentials persistence** — toggled, reloaded, still off.
- **Invalid Qur'an deep link** (`#/quran/9999`) — a real not-found state with
  a heading in both languages; no hanging skeleton.

## 5. Deliberately left red

`smoke.spec.js` expects the `Source (unverified):` qualifier on the prayer
method line. `data/prayer-methods.json` records MWL as `verified: false` and
`data/SOURCES.md` documents that only secondary corroboration exists, but the
compact hero line drops the qualifier and so states an uncertified source as
fact. **The test is correct and the copy is the problem.** Restoring the
qualifier is a worship-surface copy decision for the owner; editing the
assertion away would have made the guarantee disappear silently.

## 6. Not verified

Real audio playback, decoding and the sleep-timeout fade; Firefox and WebKit;
Mushaf Find/spread/fullscreen, bookmark reopen, Hadith Reference, Retry
affordances, storage request, oversized-import hardening; the root cause of
the 6px scroll delta; the root cause of the pre-existing non-nav e2e failures.
