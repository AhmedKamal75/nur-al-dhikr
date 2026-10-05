# Visual proof pass — v5.17.84 → v5.17.93

**416 screenshots · 208 cells · 0 capture errors · 0 page errors**

Machine: Linux 8 CPU / 7 GB, Node v20.19.5, Playwright 1.63.0, Chromium
153.0.8010.12. Full 2350-file corpus. `reducedMotion: reduce` via the app's own
shipped accessibility path. Language and theme seeded before first paint.

Naming: `<feature>__<lang-theme>__<lang>__<theme>__<width>x<height>.png`, with a
`__top` / `__scrolled` suffix.

## The matrix is derived, not invented

Each view exists because a release in `docs/RELEASES.md` makes a claim about it.
Nothing here was captured "for completeness".

| View | Release claim it is here to prove |
|---|---|
| `home` | v5.17.84 enforced vertical order; v5.17.85 made Home sparse by default (Continue + Today), quick actions Morning+Evening only, and moved the **Shahada strip to the END** — only visible in the scrolled shot |
| `main-menu-expanded` | v5.17.84 restored expandable hierarchy with Zakat/Offline/Settings/About as **flat standalone siblings at the tail**, and removed the native `<details>` marker and dashed line |
| `azkar-browser` | v5.17.85 added a dedicated search doorway; Morning/Evening got a featured treatment |
| `focus-mode` | v5.17.85 shortened the completion handoff to 220ms; v5.17.86 pins the `0/1 → 1/1 → next` presentation |
| `mushaf` | Mushaf stays a reading surface, not a control panel |
| `mushaf-study-rail` | v5.17.89 ayah tap opens the contextual Study rail; v5.17.92 adds "Open word study" carrying exact surah/ayah/word index |
| `quran-reader` | baseline for the v5.17.93 Tafsir context work |
| `tafsir` | v5.17.93 opens with an explicit `surah:ayah` context and shows edition name, author and category above the commentary |
| `roots` | v5.17.91 keeps the originating ayah reachable via one quiet return path |
| `tajweed-course` | v5.17.90 shows real bundled ayah text, highlights the span with the same classifier practice uses, offers Open ayah |
| `player` | v5.17.85 keeps transport primary and moves repeat/speed/mute/sleep/mode/volume into a disclosure — removing the "row of settings" look |
| `player-more-open` | v5.17.85 — the More disclosure must not clip when open |
| `settings` | v5.17.83 replaced hyperlink-prose rows with compact control tiles; the owner asked to see any remaining 1989-style underlined links |

Each captured at **360×800, 393×852 (mobile)** and **1024×768, 1440×900
(desktop)**, in **EN/AR × light/dark**.

## Why every view has TWO screenshots

Several claims are only visible *lower down*: the Shahada strip moved to the END
of Home (v5.17.85), and the app-tail siblings sit at the BOTTOM of the main menu
(v5.17.84). A top-only screenshot would have "passed" both.

The scrolled shot scrolls the **real scroller** — `#main`, `.view`, `main`, or
`body`, whichever actually overflows — not just the window, because Home and
Settings scroll inside `#main` and a window-only scroll would capture the same
frame twice.

---

## FINDING 1 — P1 · the whole-surah badge is clipped off-screen on the Player

**24 cells: `player` and `player-more-open`, at 360×800, 393×852 and 1024×768,
in all four language/theme modes.**

Measured at 360×800, English light:

```
viewport width      360
document overflow    0        <- the page does NOT scroll, so nothing is reachable
chip text           "Whole surah — no ayah timings"
chip box            left 144 .. right 393     (249px wide)
                    ^^^ 33px past the 360px viewport
```

`js/views/audioManager.js:91` renders it:

```js
const timingBadge = ` <span class="chip chip--muted" title="…">${t('audio.wholeSurahBadge', lang)}</span>`;
```

It sits inside `.reciter-row__name`, which neither wraps nor scrolls, and
`.chip` is `white-space: nowrap`. So a long English label simply runs off the
right edge.

**Why this is a real defect, not a scroll container:** the document's
`scrollWidth - clientWidth` is **0** — the page cannot be scrolled to reveal the
missing 33px, and no ancestor scrolls. The text is silently truncated with no
affordance. The same class appears in three of the four reciter rows on screen,
so the row reads as broken rather than as a dense list.

**It is also a v5.17.85 regression in spirit.** That release's stated goal was
that the full-surah player stops looking like "a row of settings"; instead the
file-mode badge is now a clipped orphan on a phone.

**Suggested fix direction (not applied — this is a visual pass, not an
implementation pass):** let the reciter row wrap its badges, or truncate the
badge label with a real ellipsis plus the existing `title`, or move the timing
note to a second line. Do **not** add a `min-width` to force horizontal scroll —
that would reintroduce the class v5.17.85 removed.

---

## Everything else measured clean

- **Page-level horizontal overflow: 0 cells.** The `.segmented` wrap fix from
  v5.17.78 still holds at 360/393/1024/1440 in both languages.
- **Capture errors: 0. Page errors: 0.**
- **No other element sits outside the viewport without a scrollable ancestor**
  on any of the 13 views. (26 items *were* inside genuine horizontal rails and
  were correctly dismissed.)

## What this pass did NOT do

- **No rubric score.** Screenshots are evidence, not a judgement, and the score
  discipline is unchanged: no number without a rubric and data behind it.
- **No implementation.** Finding 1 is diagnosed with a measurement, not patched.
- **Not verified:** Firefox and WebKit; large-text / roomy mode; forced colors;
  reduced transparency; real touch hardware and safe-area insets; the install and
  update surfaces on a real platform.
- **Not verified by screenshot:** the counter *sequence* `0/1 → 1/1 → next` and
  `0/3 → 1/3 → 2/3 → 3/3 → next` is a temporal behaviour. `focus-mode` captures
  the state after one tap only. Proving the sequence needs a recorded
  interaction, not a still.
- **Not verified:** that the Study rail's "Open word study" carries the exact
  word index into the Word Study modal (v5.17.92). That is a data-propagation
  claim; the capture shows the affordance, not the value that arrives.

## Files

```
evidence/VISUAL-PROOF-v5.17.93/
  *.png                    416 screenshots (13 views x 4 modes x 4 viewports x top|scrolled)
  capture-report.json      per-cell: claim, scroll offset, overflow, offscreen, page errors, dir
  FINDINGS.md              this file
```
