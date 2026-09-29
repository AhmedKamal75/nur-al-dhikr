# REORGANISATION-PLAN.md — the information architecture, rebuilt

> **Status:** plan, not implementation. The owner asked for a plan; another
> agent executes it.
>
> **Origin:** the owner's verdict on the current app — _"azkar.me is super
> good and one of the reasons for that is that it is super intuitive to operate
> and easily. Is ours the same? **NO. A big fat NO.**_"
>
> That verdict overrides the last review's "Features: usability 8.6". The owner
> is the release gate on usability, not the reviewer.
>
> **Everything below is measured from the tree or from azkar.me itself**, not
> from memory. Re-verify before implementing.

---

## 1. The diagnosis, with evidence

### 1.1 We have 17 top-level nav entries; azkar.me has about 6

`js/ui/shell.js` defines `NAV_GROUPS` — **17 items in 4 groups** (read 6,
worship 5, tools 5, mine 3), across **34 routes**.

azkar.me's own header, read from the live site:

| azkar.me nav                               | Ours                                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| اقرأ الأذكار (Read the adhkar)             | Home / Library / **Mushaf + Reader** / Hadith / Search |
| القرآن الكريم (The Qur'an)                 |                                                        |
| الأحاديث (The hadith)                      |                                                        |
| مواقيت الصلاة (Prayer times)               | Prayer, Qibla, Ramadan, Calendar, Checklist            |
| الأنشطة (Activities)                       | Tasbih, Garden, Zakat, Statistics, Offline             |
| التقويم الهجري (Hijri calendar)            |                                                        |
| _لوحة المتصدرين_ (leaderboard — we refuse) |                                                        |
| _ذاكر الذكي_ (AI assistant — we refuse)    |                                                        |

**17 items in four taxonomic buckets is a filing cabinet, not a home screen.**
A newcomer has to read, classify, and choose before they can do anything. Ours
asks for a decision before value.

### 1.2 Two nav entries lead to the same book

```
{ view: VIEWS.MUSHAF, icon: 'quran',   label: 'nav.quran'  },
{ view: VIEWS.QURAN,  icon: 'book-open', label: 'nav.reader' },
```

The source comment is honest about it — _"the classic reader is its own chrome
entry instead of hiding behind the Mushaf label — same book, two discoverable
doors."_ A first-time user **cannot know which door to use**, and the app makes
them guess. Two doors to one book is not discoverability, it is a coin flip.

### 1.3 The best feature we have is the most buried

Our "browse by need" — 12 moods, 30–218 items each, which the last review
praised as _"a real win for someone who doesn't know which category their worry
is in"_ — is reached as **Home → Library → mood**. Two taps, and it is behind
an indirection called "Library", a word a user has no reason to use.

azkar.me's front page **is** that browse. It lands on 30 named categories,
each with a live item count and a "اقرأ الآن / Read now" action on the tile.
Nothing to understand before you can act.

### 1.4 Four different words for "things I track"

`Garden` (a planting metaphor for accumulated dhikr), `Checklist`,
`Statistics`, and `Favorites` are four nouns for overlapping territory. A user
cannot tell from the label whether Garden is a garden, a scoreboard, or a
history. The metaphors are the problem: **"Garden" and "Checklist" are labels
that require a tutorial.**

### 1.5 Fourteen of thirty-four routes have no door at all

Verified by parsing `VIEWS` against `NAV_GROUPS`:

```
CATEGORY  MOOD  FOCUS  COLLECTIONS  COLLECTION  QUIZ  AUDIO  ROOTS
EDITOR  MUTASHABIHAT  JOURNAL  CERTIFICATE  AMBIENT  TAJWEED_COURSE
```

Some of these are legitimately deep — `CATEGORY` follows from `LIBRARY`,
`EDITOR` is a tool, `COLLECTION` follows from `COLLECTIONS`. Those are fine.

**Two are not.** They are flagship features with no chrome:

- **`TAJWEED_COURSE`** — the entire G-2 course. 6 stages, 14 sessions, drills,
  cited rules. Shipped in v5.17.19, and reachable only by typing the URL or
  opening search. The single most valuable thing we have built, and it has no
  front door.
- **`ROOTS`** — the root index behind the per-word study that the last review
  called the thing we beat the rival on. Same problem.

### 1.6 A nav item whose label lies about its behaviour

`{ view: VIEWS.SEARCH, label: 'nav.search', action: 'open-palette' }` — the item
says **Search** and opens a **command palette**. The fallback `href` is a real
search page, so the label describes one thing and the primary behaviour is
another. Small, and exactly the kind of mismatch that teaches distrust.

---

## 2. The target architecture

### 2.1 Six doors, task-shaped

Not seven, not five. Six, each a _thing a person wants to do_ rather than a
_department in the app_:

| #   | Door                | Replaces                                                                               | Why                                                    |
| --- | ------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | **Adhkar** (أذكار)  | Home + Library + the mood indirection                                                  | The app's reason for existing. Gets the front door.    |
| 2   | **Qur'an** (القرآن) | Mushaf + Reader, merged                                                                | One book, one door.                                    |
| 3   | **Hadith** (أحاديث) | Hadith                                                                                 | Already correct.                                       |
| 4   | **Prayer** (مواقيت) | Prayer + Qibla + Calendar                                                              | Times and direction belong together; they are one act. |
| 5   | **Practise** (dek)  | Tasbih + Tajweed course + Quiz + Muttashabihat                                         | Learning and counting are the same activity.           |
| 6   | **You** (حسابي)     | Garden + Checklist + Statistics + Favorites + Journal + Certificate + Settings + About | Everything about the person, in one place.             |

**Every screen a user has a name for becomes reachable in ≤ 2 taps.**

### 2.2 Adhkar becomes the home screen

The front page is a **browsable grid of named categories**, each tile carrying
a live item count and a direct "Read now" action — the one pattern in
azkar.me's IA that is worth taking, because it is the answer to "why isn't
this obvious", not a visual style.

- Category names are the ones a Muslim actually uses: **Morning, Evening, Sleep,
  After prayer, Waking, Travel, Food, Fear & distress, Rain, Clothing,
  Home, Mosque, Restroom, Ablution, Athan, Sickness, Funeral, Marriage, Hajj,
  Tasbeeh, Seeking forgiveness, Salawat, Provisions, Quranic duas, Sunnah
  duas, General duas**.
- We have **41 dua categories + 7 adhkar categories** and far more items than
  azkar.me's 30 sections. That depth is the advantage. The plan is to **surface
  it, not hide it behind "Library"**.
- **"Browse by need" (the 12 moods) is promoted to a filter row above the
  grid** — not a separate buried view. Same feature, front door.
- The 99 Names, Zakat and Certificates move out of the grid; they are
  reference, not a daily worship sequence.

### 2.3 Qur'an: one book, one door

`#/mushaf` and `#/quran` merge behind one entry that opens the **mushaf**, with
a segmented switch inside for **list reading** and **word study**. Both remain
real routes; they stop competing for the same slot in the nav. Active state is
resolved from the route, not from a second nav item.

### 2.4 Practise: learning and counting are one activity

Tasbih, the **Tajweed course**, the classifier quiz, and mutashabihat belong
together. The Tajweed course gets a **real door** — a stage rail — inside this
section. It is the flagship and it currently has none.

### 2.5 You: one place for the person

Garden, Checklist, Statistics, Favorites, Journal, Certificate, Settings and
About are eight entries that all mean _"things about me"_. Collapse to one
section with clear, non-metaphorical entries:

- **My adhkar** (progress, streaks, what is completed today)
- **Favorites**
- **Journal**
- **Statistics**
- **Settings**
- **About and sources**

**"Garden" is renamed.** It is a good metaphor and a bad label: nothing in the
word tells a first-time user it is their accumulated dhikr. If the metaphor is
kept at all it is a _visual treatment_ inside "My adhkar", not a nav noun.

### 2.6 Naming rules for the whole reorganisation

1. **A label is a thing, not a metaphor.** "Garden", "Checklist", "Focus" and
   "Mood" are categories of concept; reject new ones.
2. **A label promises what the tap does.** The Search item that opens a palette
   is relabelled or repointed.
3. **If a screen needs a tutorial to name, it needs a different name.**
4. **Bilingual from the first commit.** Every new label ships in AR and EN
   together, or the parity gate fails.

---

## 2a. Status, verified against the tree (v5.17.40)

Phases 0–7 landed across v5.17.33–39. **Measured, not claimed:**

| Plan metric                   | Target                    | Actual                                      | Verdict        |
| ----------------------------- | ------------------------- | ------------------------------------------- | -------------- |
| Routes with no nav door       | 0, or documented internal | **2** (EDITOR, AMBIENT — justified)         | ✅ met         |
| Taps to the adhkar grid       | 0 (it is home)            | **0** — 560 tiles on `#/`                   | ✅ met         |
| Taps to the Tajweed course    | ≤ 2                       | **1** — segment inside the Practise door    | ✅ met         |
| Taps to tasbih                | ≤ 2                       | **1**                                       | ✅ met         |
| **Top-level nav entries**     | **6**                     | **12**                                      | ❌ **NOT met** |
| **Labels needing a tutorial** | **0**                     | **`nav.library` survives**                  | ❌ **NOT met** |
| Search label matches its tap  | yes                       | yes — now navigates to the real search view | ✅ met         |

**What landed and is genuinely good:** the orphan problem is real and closed —
14 doorless routes of 34, including the Tajweed flagship and the roots index,
down to 2 documented internals. The adhkar grid became home with moods as a
filter row on the same screen. The Mushaf/Reader coin flip is gone; both routes
survive. `tests/nav-reachability.test.js` (35/35) builds a route→door map that
resolves doors through section pages, so the fix is trapped.

### What was NOT delivered: the chrome is still a filing cabinet

**The plan's headline ask was 6 task-shaped doors. There are 12, in the same
four taxonomic groups (`read` / `worship` / `tools` / `mine`) that the plan
called the problem.** The section layer was built as in-page segmented switches
(`seg(...)`) — Qur'an gets List | Word | Audio, Prayer gets Times | Qibla |
Calendar, Practise gets Tasbih | Course | Quiz — and that is good work. But the
_top level_ still reads:

```
read      Home · Library · Qur'an · Word roots · Ahadeeth · Search
worship   Prayer · Ramadan
tools     Tasbih · Zakat · Offline library
mine      You
```

Three specific failures against the plan:

1. **`nav.library` is still a top-level door.** The plan named this word
   specifically: _"an indirection called 'Library', a word a user has no reason
   to use."_ The grid is now home, so Library is a **second** door to the same
   tiles — the redundancy the reorganisation was meant to remove.
2. **`Practise` never became a door.** Prayer got a section page _and_ a
   top-level entry; Tasbih got a section page _and_ a top-level entry. The
   Tajweed course is a segment _under Tasbih_, so the flagship sits two
   metaphors below a door named after a counting tool.
3. **`Ramadan`, `Zakat` and `Offline library` were never re-homed** — they are
   peers in the old taxonomy, not members of any of the six planned sections.

**So: the reachability and the home page were fixed, and the top-level chrome
was not.** A first-time user still faces twelve labelled icons, four of which
are grouped by a taxonomy only the app understands.

**The next step is therefore a small, surgical Phase 8, not a redo:**

- **Retire `nav.library`** — the grid is home; a second door to it is noise.
  `#/library` stays a real route behind the grid's own "all" affordance.
- **Promote `Practise` to a real door** carrying Tasbih, the Tajweed course,
  the quiz and mutashabihat as segments; drop the bare `nav.tasbih` peer.
- **Re-home `Ramadan` and `Zakat`** into Prayer and You respectively; keep
  `Offline library` in You, next to settings, where storage belongs.
- Target **6**: Home · Qur'an · Ahadeeth · Prayer · Practise · You.

Everything in §3 still holds and was re-verified: 34 routes, no route loss,
deep links resolve (`tests/mushaf-route-resolution.test.js` 14/14), the
language switch is on every chrome surface (8/8 e2e), zero tap targets under
24px in both default and Elder Mode, and both gates green
(2368 unit / 78 e2e).

## 2b. Phase 2 continues this plan

**Phases 0–7 are done. Phase 8 is the part this plan got wrong**, and it is
specified in `docs/HANDOFF.md` §8b, PART A1: retire `nav.library`, promote
`Practise` to a real door, re-home `Ramadan`/`Zakat`/`Offline library`, and land
on the six top-level doors this plan originally asked for. `tests/nav-reachability.test.js`
should be extended to assert the count, not just the absence of orphans.

## 3. What must NOT change

The reorganisation is an IA change. These are off-limits:

- **No content, corpus or data change.** Routes move; `data/` does not.
- **No loss of a route.** All 34 stay reachable. Merging two _nav entries_ is
  not merging two routes.
- **Every existing deep link keeps working.** `#/mushaf?page=5`,
  `#/category/morning`, `#/tajweed-course` must all still resolve — with a
  redirect from any legacy path that moves.
- **Continuous reading/recitation flow stays sacred.** No new interstitial, no
  route hop inside a recitation.
- **Language switch stays in the chrome**, on every screen, including ambient
  and focus modes.
- **Elder Mode and accessibility targets are unaffected** — 44px minimum, zero
  under 24px, both themes, 200% text.
- **No gamification.** No leaderboard, no streak-loss, no shame copy. The rival's
  `لوحة المتصدرين` is refused, not ported.

---

## 4. Execution plan

Each phase is **independently committable, independently testable, and
independently revertable**. Do not batch them. Ship one, watch it, then the next.

### Phase 0 — Instrument before you move

Do not reorganise what you have not measured.

- Add a test that asserts **every route is reachable within 2 taps of a door**,
  from a machine-readable route→door map. It will fail today and list the
  orphans. This is the trap that makes every later phase verifiable.
- Add a nav census: entries, labels, destinations, and whether the label
  matches the destination's view.
- Fix the existing i18n nit in `HANDOFF.md` first if §3 drifted — no, do that
  with its own commit.

**Done when:** the orphan list is generated by a test, not by reading code.

### Phase 1 — Unblock the flagships (highest value, lowest risk)

No structural change. Give `TAJWEED_COURSE` and `ROOTS` a real door.

- Add the Tajweed course to the nav as its own entry (temporarily in the read
  group).
- Add Roots/word study where the per-word study is used, not as a separate top
  level — it is the _depth_ of the Qur'an, so it belongs under the Qur'an door.
- Update the reachability test to green.

**Why first:** the biggest failure in the audit is a flagship with no front
door, and this fixes it without touching anything else.

### Phase 2 — Merge the Qur'an doors

- One `nav.quran` entry. Opens the mushaf.
- Add a segmented switch inside for **List reading** and **Word study**.
- `isActive` resolves from the route so a deep link into `#/quran` still lights
  the Qur'an door.
- Both routes remain. The nav no longer offers the coin flip.

### Phase 3 — The Adhkar front page

The largest and most valuable phase. Do it last among the structural ones.

- Home becomes the **adhkar browser**: named category tiles, live counts, a
  "Read now" action per tile.
- Promote the 12 moods to a **filter row** above the grid.
- Re-home 99 Names, Zakat and Certificates out of the daily grid.
- Keep the section-level completion counter — it is honest and it works.

### Phase 4 — Prayer consolidation

Times + qibla + Hijri calendar in one section, with the calendar a tab rather
than a peer door. The `BLOCKED:device` items (wake-ups, storage eviction) are
unchanged — this is arrangement, not capability.

### Phase 5 — Practise

Tasbih + Tajweed course + quiz + mutashabihat as one section with a stage rail.
The course's progress model is untouched.

### Phase 6 — You, and the naming pass

Collapse the eight "about me" entries, rename Garden, fix the Search/palette
label, and sweep every label against the naming rules in §2.6 in both languages.

### Phase 7 — The orphans, one by one

`AMBIENT`, `AUDIO`, `COLLECTIONS`, `EDITOR`, `MUTASHABIHAT`, `JOURNAL`,
`CERTIFICATE`, `MOOD`, `FOCUS`. For each: a door, or a documented decision that
it is internal-only. **A route with no door and no justification is a finding.**

---

## 5. How you will know it worked

Add these before Phase 1 so the improvement is measured, not asserted:

| Metric                           | Today       | Target                       |
| -------------------------------- | ----------- | ---------------------------- |
| Routes with no nav door          | **14**      | 0, or documented as internal |
| Taps to reach the adhkar grid    | 2           | **0 — it is home**           |
| Taps to reach the Tajweed course | unreachable | ≤ 2                          |
| Taps to reach tasbih             | 1           | ≤ 2                          |
| Top-level nav entries            | 17          | 6                            |
| Labels needing a tutorial        | ≥ 4         | 0                            |

**Re-run the hostile review after Phase 6**, not after every phase. Add every
accepted deduction to `docs/BACKLOG.md` and `docs/OPEN-ISSUES.md` — never to a
commit message.

**Success is the owner's sentence, not the metric:** _can an elderly
Arabic-only reader start a recitation, find Fajr, and count tasbih without
being taught?_ If she can, the reorganisation worked. If the numbers improved
and she still cannot, it did not.

---

## 6. Risks

- **Navigation fatigue is worse than a deep route.** If a phase adds taps
  anywhere in a recitation flow, revert that phase.
- **The app is honest about absence, and reorganisation can hide it.** Moving a
  "not available" state behind a menu is a regression, not a cleanup.
- **Route count is already high (34) and the renderer budget is capped at 22/22
  static imports.** Do not add a view to pay for a rename — reuse and re-home
  instead.
- **The concurrent-session risk is real.** Do not begin a phase while another
  agent has uncommitted work in the tree; the version ritual and the shell
  snapshot will fight each other.
