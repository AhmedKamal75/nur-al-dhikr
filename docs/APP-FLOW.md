# Nūr al-Dhikr — Application Flow Specification (DFA)

**Version 5.0.0 · the single source of truth for navigation.**

> (v5.0.0) Manage mode is a per-surface editing gesture (the
> contentManage transient) — it never survives navigation, same rule as
> the chrome-removing modes. The four-level content authority (card /
> section / banner / tab edit + restore + schedule) lives entirely in
> modal forms and manage rows: LAYERS and affordances, never routes.
>
> (v4.6.0) Per-view "⋯" menu sheets are now part of the alphabet: every
> route may own one modal-hosted options sheet (opened by the shared
> `view-menu` action). They are LAYERS, not routes — deep links and the
> back stack never point at them. The EDITOR route survives (deep-link
> only) but left the navigation rail/drawer; it is reached from the
> Library's ⋯ sheet. The prayer route's sub-panels (sunnah / qada /
> adhan / calc / profiles) are modals off the prayer sheet, same rule.

This file specifies the complete flow of the app the way we were taught to
specify a Deterministic Finite Automaton: one set of states, one alphabet of
inputs, one transition function, and — because a UI is a machine you live
inside rather than one that halts — a set of **invariants** that must hold in
every reachable state. Every bug of the form _"I'm stuck, I can't go back"_
is, by definition, a violation of one of these invariants. When a new feature
is proposed, its states and transitions get added HERE first, then coded.

---

## 1. The automaton, formally

```
M = ( Q , Σ , δ , q0 )

Q   : the set of app states            — §2 (a state is a (route, layer) pair)
Σ   : the alphabet of user inputs       — §3
δ   : the transition function           — §4 (tables) + §5 (chrome modes)
q0  : the start state                   — HOME, or the deep-linked route
```

A concrete state is **`(route, layer)`** where:

- **`route`** ∈ ROUTES (§2.1) — the 29 hash routes; it is what the URL says.
- **`layer`** ∈ `{ ∅, modal, drawer }` — transient overlays stacked ON TOP of
  the route (§2.2). At most one modal and one drawer at a time; a modal can
  re-open itself (settings panels) but never stacks a second panel.

Two chrome-removing **modes** are not routes and not layers — they are
_modifications of a route's presentation_ (§5): `focus` is its own route,
while `mushaf-fullscreen` decorates `mushaf` and `reader-immersive` decorates
`quran/:id`. They are part of the state tuple in practice, so wherever the
tables below need to be precise we write them as `(mushaf, ∅, fullscreen)`.

### The Navigation Invariants (the whole point)

> **I1 — Always an exit.** Every state in Q exposes at least one
> _always-visible_ affordance that leaves that state, within one thumb reach
> (mobile) or one corner glance (desktop). No state may hide all navigation.
>
> **I2 — Esc unwinds the top layer.** `Esc` closes exactly one thing, in
> strict order: **modal → drawer → mushaf-fullscreen → reader-immersive →
> nothing.** It never closes two layers with one press.
>
> **I3 — OS back is a real back.** The hardware/gesture back button walks the
> browser history, which the router keeps in lockstep with the app's logical
> back path (hash changes push history; typing-in-search replaces it).
>
> **I4 — Modes die with their route.** A chrome-removing mode is owned by its
> route. Navigating away from that route silently restores the normal shell
> (`NAVIGATE` resets `mushafFullscreen` and `readerImmersive` in the reducer).
> A mode can never leak onto a route that doesn't understand it.
>
> **I5 — Deep-linkable reading positions.** Every reading state
> (surah+ayah, mushaf page, focus item, hadith) is expressible as a URL, so
> "back" and "share" are always the same mechanism.
>
> **I9 — A Back affordance, not just a Back shortcut.** (v4.5.2) The topbar
> carries a visible Back button whenever a forward navigation left
> somewhere to return to (a logical back stack in `rt.navBackStack`, kept
> in lockstep by the renderer: forward pushes, popstate pops). It rides
> the REAL browser history (I3) — never a synthetic jump — so it lands
> exactly where the user came from, including before the app was opened.
> Hidden on a fresh boot; the chrome-removing modes own their own exits
> (I1).

---

## 2. Q — the states

### 2.1 ROUTES (30) — grouped by region of the app

| Group   | Route              | Params         | Reached from                                | Back path (I1 owner)                 |
| ------- | ------------------ | -------------- | ------------------------------------------- | ------------------------------------ |
| Home    | `home`             | —              | boot, logo, nav, everywhere                 | it IS the root                       |
| Read    | `library`          | —              | nav, home cards                             | nav rail / bottom bar                |
| Read    | `category/:id`     | id             | library, mood, search, card chips           | **back-link → library** + nav        |
| Read    | `focus/:cat/:item` | id, subId      | card "Open focus", mini-cards, auto-advance | **focus-exit → category** (I1)       |
| Read    | `mushaf`           | page, spread   | nav "Qur'an", reader link, bookmarks        | **topbar home + ⋯ sheet + fs bar**   |
| Read    | `quran`            | q, id, ay, mem | mushaf sheet, home, search                  | **back-link → list / mushaf**        |
| Read    | `quran/:id`        | —              | surah list, hifz card, deep link            | **back-link → list** + immersive bar |
| Read    | `hadith`           | collection?    | nav, home                                   | back-link + nav                      |
| Read    | `roots`            | —              | study panel, nav drawer                     | back-link + nav                      |
| Read    | `mutashabihat`     | —              | study panel, nav                            | back-link + nav                      |
| Find    | `search`           | q              | topbar 🔍, nav                              | topbar is fixed — always exitable    |
| Find    | `favorites`        | —              | nav                                         | nav                                  |
| Find    | `collections`      | —              | nav, card menu                              | nav                                  |
| Find    | `collection/:id`   | id             | collections                                 | **back-link → collections**          |
| Find    | `mood`             | —              | home                                        | back-link + nav                      |
| Worship | `prayer`           | —              | nav, home                                   | nav                                  |
| Worship | `ambient`          | —              | Prayer ⋯ menu                               | **exit ✕ → prayer** (I1) + nav       |
| Worship | `qibla`            | —              | prayer card, nav                            | back-link + nav                      |
| Worship | `ramadan`          | —              | nav                                         | nav                                  |
| Worship | `calendar`         | —              | nav, ramadan                                | nav                                  |
| Worship | `checklist`        | —              | nav, home                                   | back-link + nav                      |
| Worship | `journal`          | date?          | nav, home                                   | back-link + nav                      |
| Tools   | `tasbih`           | —              | nav, home                                   | nav                                  |
| Tools   | `garden`           | —              | nav, statistics invite                      | nav (hub) + statistics link          |
| Tools   | `zakat`            | —              | nav                                         | nav                                  |
| Tools   | `quiz`             | —              | hadith cards, nav                           | back-link + nav                      |
| Tools   | `statistics`       | —              | nav, settings                               | nav                                  |
| Tools   | `certificate`      | —              | statistics, journal streak                  | back-link + nav                      |
| Tools   | `audio`            | —              | reader links, mushaf sheet                  | back-link + nav                      |
| Mine    | `settings`         | —              | topbar, nav, onboarding                     | topbar is fixed                      |
| Mine    | `about`            | —              | settings, nav                               | back-link + nav                      |
| Mine    | `editor`           | —              | topbar, library manage                      | back-link + nav                      |

**Rule R1 — leaf routes own a back-link.** Every route whose name appears in
the "Back path" column with a back-link renders `.view-header .back-link` as
its first focusable element. Hub routes (home, library, prayer, …) are
permanently reachable through the nav rail/bar, which is visible in every
non-mode state.

### 2.2 LAYERS — overlays stacked on any route

| Layer       | Opened by                                                                                                                | Closed by                                  | Esc? (I2 order)                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------- |
| `modal`     | jump drawer, ayah detail, tafsir, card menu, plan editors, confirm dialogs, mushaf sheet, settings panels, khatma banner | close btn, overlay tap, action inside, Esc | **1st**                         |
| `drawer`    | topbar ☰ (mobile < 960px)                                                                                               | item tap, overlay tap, ☰, Esc             | **2nd**                         |
| `playerbar` | starting any recitation                                                                                                  | stop                                       | no (it's a control, not a trap) |

The modal is the ONLY layer allowed to cover the nav: it always renders its
own close affordance (`modal__close`) and a click-away overlay, so it can
never orphan the user.

---

## 3. Σ — the input alphabet

| Symbol                          | Gesture                                                      | Where it works            |
| ------------------------------- | ------------------------------------------------------------ | ------------------------- |
| `NAV(v)`                        | tap a nav item (rail/bar/drawer) for view v                  | any non-mode state        |
| `LINK(v,p)`                     | tap any in-content link/button with `data-action="navigate"` | everywhere                |
| `BACK()`                        | tap the view's back-link, or the browser/OS back gesture     | everywhere (I3)           |
| `ESC`                           | hardware/web Esc key                                         | modal, drawer, modes (I2) |
| `OPEN_MODAL(m)` / `CLOSE_MODAL` | tap an affordance that opens/closes a sheet                  | everywhere                |
| `READ(r)`                       | open a reading entity (surah, page, item, hadith)            | list surfaces             |
| `FS_ENTER` / `FS_EXIT`          | the expand/compress control; tap zones; swipe                | mushaf, quran reader      |
| `TAP_COUNT`                     | tap a card / the focus stage / the dial                      | azkar surfaces            |
| `PLAY(s)`                       | recite surah/ayah/dua                                        | reading surfaces          |
| `SWIPE(←\|→)`                   | page-turn swipe on the mushaf                                | mushaf                    |
| `ARROWS(←\|→)`                  | keyboard page-turn (RTL book: ← = next)                      | mushaf                    |

---

## 4. δ — the core transition table (reading flows)

The rows below are the flows people actually live in; the route table in §2.1
already fixes every route's back path. `δ(state, input) → state'`:

```
(home, ∅)             READ(quran)      → (quran list, ∅)         [nav default = mushaf; list via sheet]
(home, ∅)             NAV(Qur'an)      → (mushaf p=bookmark, ∅)  [DEFAULT reading view]

(mushaf, ∅)           FS_ENTER         → (mushaf, fullscreen)    [controls auto-fade; tap zones]
(mushaf, fullscreen)  FS_EXIT|ESC|BACK → (mushaf, ∅)            [fs control bar, always re-summons]
(mushaf, ∅)           LINK(reader)     → (quran/:surah, ∅)      [⋯ sheet → "View in reader"]
(mushaf, fullscreen)  LINK(reader)     → (quran/:surah, ∅)      [I4: mode dies with route]

(quran list, ∅)       READ(surah)      → (quran/:id, ∅)
(quran/:id, ∅)        FS_ENTER         → (quran/:id, immersive) [glass bar: exit·prev·next·recite]
(quran/:id, immersive)FS_EXIT|ESC      → (quran/:id, ∅)         [glass bar auto-fades like mushaf]
(quran/:id, immersive)READ(ayah)       → (quran/:id, immersive) [ayah detail = modal ON TOP]
(quran/:id, immersive)BACK()           → (quran list, ∅)        [I3: history entry exists]
(quran/:id, ∅)        LINK(mushaf)     → (mushaf p=ayah's page) [one tap, both directions]

(category, ∅)         LINK(focus item) → (focus/:cat/:item, ∅)  [chrome-free by design]
(focus, ∅)            TAP_COUNT        → (focus, ∅)             [whole stage is the button now]
(focus, ∅)            FOCUS_EXIT|BACK  → (category/:cat, ∅)     [✕ top-left + footer arrows]
(focus, ∅)            OPEN_MODAL(menu) → (focus, modal)         [Esc closes ONLY the modal — I2]

(any route, modal)    ESC              → (route, ∅)             [modal.js owns this Esc]
(any route, modal)    LINK(v)          → (v, ∅)                 [modal closes, I4 applies]
```

### 4.1 The azkar loop (the flow the DFA exists to protect)

The azkar loop is a _cycle_ — a DFA's accepting loop — and it must be
drivable with ONE finger anywhere on the surface, never hunting for a
54-px pill:

```
(category, ∅) --TAP_COUNT(card body)--> (category, ∅)      count++
(category, ∅) --TAP_COUNT(✓ done)----> (category, ∅)      cycle completed, card flags it
(category, ∅) --LINK(open focus)-----> (focus, ∅)
(focus, ∅)   --TAP_COUNT(stage)------> (focus, ∅)          count++ (whole scroll area)
(focus, ∅)   --ARROW next item-------> (focus next, ∅)     or auto-advance on completion
```

Invariants that make this loop safe:

> **I6 — The card is the button.** On any card surface, the card BODY is a
> count target (`data-action="counter-tap"` on the article); the small
> controls inside it (listen, favorite, menu, open-focus, the pill) own
> their own taps and win by DOM proximity. Counting never requires aiming.
>
> **I7 — The stage is the button.** In focus mode the entire content stage
> counts; the dial is a visual progress ring first, a button second.
>
> **I8 — Normal mode counts too.** Counting is not gated behind entering a
> mode. If the counter is visible, the surface is tappable.

---

## 5. Chrome-removing modes — exact contracts

| | `focus` (route) | `mushaf + fullscreen` | `quran/:id + immersive` | `ambient` (route) |
| --------------------- | ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------ |
| Hides | topbar, bottomnav, drawer, playerbar | topbar, bottomnav, drawer, playerbar | topbar, bottomnav, drawer | topbar, bottomnav, drawer, playerbar |
| Keeps | its own top bar | floating fs-controls + tap zones | playerbar (follow-along) + glass bar | its own ✕ exit |
| Always-visible exit | ✕ button, top-inline-start | compress button in fs bar (auto-fade: any pointer/key re-summons) | compress button in glass bar (same auto-fade contract) | ✕ button → prayer (no auto-fade: it IS the display) |
| Esc (no native API) | n/a (it's a route: ✕ / BACK) | exits fullscreen (I2 #3) | exits immersive (I2 #4) | n/a (it's a route: ✕ / BACK) |
| Native Fullscreen API | — | requested on enter, synced on `fullscreenchange` | not requested | not requested |
| Wake lock | — | held while active | — | held while route open (own handle, released on leave) |
| Keyboard | — | `←`/`→` page-turn, Esc | Esc | Esc (via BACK) |
| Reset on route leave | — | yes (reducer, I4) | yes (reducer, I4) | n/a (route, not a mode flag) + lock released on leave |

**Auto-fade contract (shared):** the floating controls of BOTH fullscreen
modes fade after 3 s of idle (`body.mushaf-fs-idle` / `body.reader-fs-idle`)
and return on any `pointermove` / `pointerdown` / `keydown`. The fade NEVER
removes the last exit from the screen class — the bar keeps a sliver of
presence (opacity floor), and tap zones on the mushaf page edges remain
active for page turns.

---

## 6. Boot & restore

```
boot → parse hash → q0 = (parsed route, ∅) or (home, ∅)
      → NAVIGATE dispatch → shell + view render
      → persisted settings/prefs/counters rehydrated (modes are NEVER persisted)
```

`mushafFullscreen` and `readerImmersive` are deliberately absent from
`PERSISTED_KEYS`: a restored session always boots windowed. Nobody should
re-open an app and find themselves trapped in a chrome-less reading state
they didn't choose in this session.

---

## 7. How this file is kept honest

- The reducer (`js/core/state/reducer.js`, `NAVIGATE`) is the enforcement
  point of I4; there is a unit test asserting both flags reset.
- `Esc` layering (I2) lives in `js/app/events.js` + `js/ui/modal.js` and is
  order-tested.
- I1 is reviewed by the browser smoke pass on every release (routes ×
  mobile/desktop × LTR/RTL × light/dark): each state must show its back-path
  affordance before the release ships.
- New routes/modes MUST be added to §2/§5 and their back path decided HERE
  before the view is written. A view without a back path does not ship.

---

_v4.5 change log for this file: added the classic-reader immersive mode row
(§5), the azkar tap-anywhere loop (§4.1, I6–I8), and the Esc layering order
(I2) after the "can't go back from immersive" report — the trap was Esc
closing two layers at once plus a mode leaking across route changes; both
are now specified and tested._

_v4.5.2: the Garden route (§2.1, Tools) and I9 — the topbar Back button,
the "a DFA designer should have given every state a backwards transition"
fix: the affordance is now visible wherever history exists to walk._
