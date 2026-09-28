# HANDOFF.md — goals and requirements, for a fresh agent

> A single self-contained brief. If you are new here, read this, then
> `AGENTS.md` (machine rules) and `MEMORY.md` (what will bite you).
>
> **Current version:** v5.17.27 · **Last scored:** 8.7/10 · **Owner gate:** 9.1
> **Last verified against the tree:** v5.17.26, `npm run check` 2209 pass /
> 0 fail, Chromium e2e 73 passed.
>
> Everything below is verified against code, not remembered. When something
> here is wrong, fix this file in the same change that fixes the code.

---

## 0. Before you touch anything

```bash
git status --short          # the worktree is normally DIRTY ON PURPOSE
git log --oneline -5
npm run check               # 2209 tests
npm run e2e -- --project=chromium
```

**Never revert work you did not write, and never revert work you do not
understand.** If the tree state contradicts what you were told, say so instead
of proceeding.

---

## 1. What this is

An **offline-first, installable Islamic web app (PWA)** for daily worship:
adhkar, duas, the 99 Names, prayer times, Hijri calendar, tasbih, the full
Qur'an with per-word study, and Hadeeth.

**Stack constraints, all deliberate:** vanilla ES modules · no build step · no
framework · **no dependencies** · plain CSS with a strict load order ·
`python3 -m http.server 8080` for local serving (never `file://`).

The engineering consequence of "offline-first": **honesty is the product.** A
cached download, a missing grade, a reciter without timings — each is stated
plainly rather than faked. A worship tool that lies about what it knows is worse
than one that admits a gap.

---

## 2. The goals

| #   | Goal                                                                                                                                      | Where it stands                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-1 | Every scored criterion above **9.1/10**                                                                                                   | **8.0 → 8.2 → 8.8 → 8.7.** Not reached. See §3 and §9.                                                                                                                                                                        |
| G-2 | A **tajweed course**: staged, examples, drills, meaningful tests, a preset plan, connected to tajweed settings, searchable, fully offline | **Shipped v5.17.19.** Arabic101's madd-first order. Guided _and_ open modes. Search by rule. All 20 rules cited to a matn line. **Still open:** makharij and sifat stages, which need cited data.                             |
| G-3 | The **mushaf** made professional, as an object **and** as software                                                                        | Verse deep links, a fullscreen jump drawer, "you are here", and approximations marked as approximations — shipped v5.17.21–23. **Still open:** page-height sheet, 15-line grid, basmala voice, roundel on all papers, search. |
| G-4 | Commit work with real messages                                                                                                            | Standing rule, `AGENTS.md` §1.2.                                                                                                                                                                                              |
| G-5 | "Scholar-gated" means **unattributed, not unwritten**                                                                                     | Standing rule, `AGENTS.md` §1.1a. It is what unblocked the tajweed work.                                                                                                                                                      |

---

## 3. The score gate — how you are judged

One defensible number out of 10, with per-criterion evidence.

| Criterion                                                                 | Weight |
| ------------------------------------------------------------------------- | ------ |
| Look and feel                                                             | 15%    |
| UI/UX — flows, discoverability, dead ends, empty/error states, onboarding | 15%    |
| Features: existence                                                       | 10%    |
| Features: functionality (works end to end)                                | 10%    |
| Features: usability (an unaided person gets value)                        | 10%    |
| Features: omitted / needed / to upgrade                                   | 10%    |
| Correctness and honesty of religious data                                 | 15%    |
| Bilingual completeness (AR + EN)                                          | 5%     |
| Accessibility, including the Arabic-only elderly user                     | 10%    |

**Score history, including the regression:**

| Review | Version  | Score   | What moved it                                                                                                                                                                                                                |
| ------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | v5.17.16 | **8.0** | Baseline. Offline 7.0, a11y 7.0, look/feel 7.5.                                                                                                                                                                              |
| 2      | v5.17.21 | **8.2** | Offline and a11y genuinely fixed; found a **silent wrong surah** in the deep link.                                                                                                                                           |
| 3      | v5.17.22 | **8.8** | Found six **empty stage headings** and an **invisible** deep-link mark.                                                                                                                                                      |
| 4      | v5.17.25 | **8.7** | **A regression, and the first honest one in this table.** A broader probe found a **doubled Basmala** on Al-Fatiha p.1 and **59 records denying their own citation**. It also audited the backlog and caught six overclaims. |

**Rules for whoever reviews:**

- **Verify by execution.** Never score a claim you did not run. A grep is a
  hypothesis; a test is evidence.
- **Be hostile but fair.** Award excellence specifically; do not manufacture
  criticisms.
- **No hypotheticals.** If you cannot trigger it, say "unverified".
- **A test that cannot fail while the app is wrong is itself a defect.** This
  project has been bitten by that repeatedly.
- **Never smooth over a regression.** Name it in the same row. A silent dip is
  how a table starts lying again.

---

## 4. Non-negotiables

1. **Never invent religious data.** No scripture, grade, timing, reciter name,
   or rule definition from memory or from a pattern that "looks right". Verified
   source, or an honest `Unknown`/empty state. This is not a style preference —
   it is the product.
2. **"Scholar-gated" means unattributed, not unwritten.** Content needing
   authority may come from any _verifiable public source_ — a classical text, an
   institution, a university or open-source project, an open textbook, a
   published curriculum — provided all five hold:
   - you **name the source**, with enough detail for a reader to verify it;
   - you **quote rather than paraphrase into authority**, with the attribution
     on the same screen;
   - **provenance is structural** in the data file (bilingual `{en, ar}`,
     `review` state, absent ≠ empty);
   - **disagreement between authorities is surfaced, not resolved by us** — the
     makharij are counted 17, 16 or 14, and we show the spread;
   - **retrieved ≠ certified**: machine-collected material keeps a review state
     and the app's existing honest-absence copy until signed off.

   The gate is **attribution, not authorship**. What it never permits: writing
   a hadith, tafsir, grade, timing, or rule definition from your own memory and
   presenting it as sourced.

3. **Every user-facing string in Arabic AND English.** The parity gate is a
   hard failure, not a warning.
4. **Verify by execution.** Never report a finding you did not run. When you
   fix something, add the pin that would have caught it — a sweep that only
   finds bugs without adding traps is a failed sweep.
5. **Fix safely, report loudly.** Small, obvious, covered fixes: just do them
   with a test. Anything touching UX contracts, religious data, or more than
   ~50 lines: report it with a proposal and let the owner decide.
6. **Commit your work, with a real message.** Never `update`, `fixes`, `wip`, or
   a bare version bump. One logical change per commit. **Both gates green before
   you commit** — a red commit is worse than a dirty tree, because it launders a
   broken state into history. **Never push, amend, force, or rewrite published
   history.** Report what you committed so the owner can read the log.
7. **Five version markers move together, or not at all:** `package.json`,
   `APP_VERSION` in `js/core/config.js`, `VERSION` in `sw.js`, `manifest.json`
   (`version` _and_ `version_name`), and a new `## vX` heading in
   `docs/RELEASES.md`. Then, in order: `npm run compress-data` (if data
   changed) → `npm run manifest:generate` → `npm run snapshot-shell`.
   `tests/contracts.test.js` enforces every step.
8. **Caps that exist on purpose:** `js/views/mushafReader.js` under 800 lines ·
   renderer static-view imports ≤ 22 (already at the cap) · change/input
   registry counts. **Extract a module; do not grow a file.**
9. **RTL uses logical properties only** (`inline-size`, `margin-inline-start`).
   Physical properties are banned except inside a documented exemption.
10. **No new dependencies. No frameworks. No build step.** If a change needs a
    package, it is the wrong change.

---

## 5. Standing product decisions — do not relitigate

- **Zero account, zero server, zero telemetry.** No analytics, no phone-home.
  Gap telemetry is opt-in, local-only, and clearable in one tap.
- **Adab over gamification.** No confetti, points, leaderboards, shame copy, or
  streak-loss. A streak freeze absorbs one missed day. `js/domain/nudge.js` is
  test-pinned against streak/shame vocabulary in both languages.
- **No forced memorization.** Nothing is gated behind a streak or a count.
- **Translations never leak into Arabic chrome.** Transliteration and
  translation render in EN only. Proper nouns — surah and reciter names — are
  the deliberate exception.
- **RTL is logical, except where sequence matters.** The transport row
  (prev → play → next) is pinned `direction: ltr` so it never mirrors, and its
  icons are not flipped.
- **Continuous reading/recitation flow is sacred.** Pagination is opt-in and
  never interrupts a recitation.
- **Honest absence beats fake completeness.** `Unknown` is a respectable state.
- **Scope is disclosed, not hidden.** The Hadeeth library is the Sunni kutub
  sittah and says so. Adding other madhhab collections is a scholarly decision,
  not an engineering one.
- **One voice at a time.** Two audio engines coordinate; whichever starts stops
  the other.

**Specific accepted trade-offs — these look like bugs and are not:**

- Mushaf page turns **drop the `s`/`ay` mark**, because that ayah is no longer
  visible. A test pins it.
- The **200% type scale does not reach the mushaf.** The mushaf owns its
  typography so two scales cannot fight over one line box. Elder Mode _does_
  reach it. A real WCAG 1.4.4 trade-off, taken knowingly.
- **Completing a dhikr removes its card** (deliberate v5.2.24 session
  dismissal, animated rather than snapped, section counter still correct). A
  reviewer preferring a struck-through "done" row is making a product
  argument, not reporting a defect.
- **Ambient mode hides app chrome by design.** The paramless Focus picker does
  not, because it must keep the language switch.

**The benchmark:** azkar.me / azkar.pub = **capability parity, then exceed.**
Do not copy code, branding, corpus, icons, or copyrighted course content. We
deliberately will not copy their **leaderboard** (ranking worship is the
opposite of adab) or their **logged-in, paid AI assistant**.

---

## 5b. The azkar.me goal, concretely — parity then exceed

**The owner's standing instruction is to clone azkar.me and be better at it.**
The workable reading is _capability parity, then exceed_ — not a copy of their
code, name, visual identity or corpus, which is both not ours to take and worse
for a project whose standards differ. Do not "discover" this framing fresh.

**Where the rival has genuinely pulled ahead, and the current state of each:**

| #   | Gap they have                                       | Where we are                                                                                                                                                   |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Prayer madhab + manual minute offset                | **SHIPPED v5.17.12** — a "best" time is wrong by minutes for someone following a different madhab, so the control matters more than the number                 |
| G2  | Floating counter while the app is in the background | **SHIPPED** — they ship an Android overlay; our equivalent is Document Picture-in-Picture (240px dial, 72px/800 numeral)                                       |
| G3  | **Install / distribution story**                    | **OPEN** — we are second-class on iOS. Cannot ship a native app inside a no-build PWA, but the in-app install path can be made excellent. Owner-ranked highest |
| G4  | **Per-city prayer pages**                           | **OPEN** — 300+ pages of pure SEO surface. Contradicts nothing but is marketing, not capability. **Owner decision**                                            |
| G5  | Shared counter between devices                      | **N/A** — they do not have it either. Listed so it is not "discovered missing" later                                                                           |

**Where we are already ahead** (do not regress these): corpus depth (4× their
adhkar, 10× their Hadeeth), per-word study, Tajweed course, memorisation,
reciters, accessibility, and offline truth.

**The four section-level requirements**, each a standing goal in its own right:

- **The adhkar / azkar section** — per-item audio where a verified source
  exists, full bilingual coverage, and genuine depth per category. Still
  **OPEN**; the audio half is the single largest rival advantage and needs a
  licensed source. `OPEN-ISSUES` 15.
- **The mushaf, as an object and as software** — G-3 above. The page must read
  like paper: real page furniture, the 15-line Madani grid, correct Uthmani
  orthography, and no double-printing of the Basmala. As software: verse deep
  links, a fullscreen jump drawer, "you are here", and approximations labelled
  as approximations. Four fidelity gaps remain (§8).
- **Prayer times** — the controls ship and are tested; 7 methods against their
  23, and 2 Asr twilight conventions against their 4. The extra methods are a
  cited-data project, not a build.
- **Tajweed** — G-2 above; the rival has none at all.

**Deliberately not copied, and this is settled:** their **leaderboard** —
ranking people's worship is the opposite of adab — and their **logged-in, paid
AI assistant** (no accounts, no AI-authored religious content). Their adhkar
corpus is Hisn al-Muslim by Ashraf Al-Qutbani, a real published book with its own
editorial decisions; importing their file would import their sourcing decisions
without their scholarship. Ours is separately sourced and attributed in
`data/SOURCES.md`.

## 6. Who it is for, in priority order

1. **The 70-year-old Arabic-only reader. She is the release gate.** If she
   cannot start a recitation, find Fajr, and count tasbih on her own, the
   feature is not done. 44px targets, real contrast, no English-only traps, and
   the OS language honoured on first launch.
2. **The worshipper reciting at night.** Sleep timer, dimming, hands-free
   keyboard, no notification fatigue, no streak pressure.
3. **The student.** Per-word morphology, i'rab, roots, tafsir — with provenance.
   Study features pull you _into_ the text, never out of it.
4. **The parent.** Kids mode, honest scope, no addictive loops.

---

## 7. What the owner has explicitly rejected

- **Cartoonish or "3-year-old" UI.** A "doodle" UI was rejected by name.
- A **"more/settings" button that expands into a page-consuming panel**, and
  settings that vanish from one context and appear in another.
- **English text, or a moon in place of Islamic iconography.**
- **Sloppy work.** "Slopify" is a word of art in this project.
- **Fabricating completeness to make a metric look better.**

---

## 8. Open work, ranked

1. **Per-dhikr recitation audio** (0 items) — the largest rival gap. Needs a
   citable, licensed per-item audio source for ~1,100 items. It cannot be
   invented, and no control substitutes for the data.
2. **Mushaf search** — the app indexes 604 pages and has full-text search, with
   no path between them.
3. **Prayer methodology depth** — 7 methods against the rival's 23, and 2 Asr
   twilight conventions against 4. The controls ship and are tested; the extra
   methods are a cited-data project.
4. **Makharij + sifat course stages** — render the 17/16/14 spread rather than
   resolving it.
5. **Mushaf fidelity** — page-height sheet, 15-line grid, basmala voice,
   roundel on all papers.
6. **Install / distribution** — the manifest and the `beforeinstallprompt`
   wiring are done; the in-app install path a reader actually walks is thin.
7. **Per-city SEO pages** — pure marketing surface, 300+ pages. **Owner
   decision**, not a build.

Full detail and per-row evidence: `docs/OPEN-ISSUES.md` (48 rows) and
`docs/BACKLOG.md`. `tests/open-issues-ledger.test.js` and
`tests/backlog-consistency.test.js` fail if those documents disagree with the
tree, so **"fixed" must name a test that fails without the fix.**

---

## 9. The honest blocker on 9.1

The last reviewer's own closing judgement, quoted because it is the most useful
sentence anyone has written about this project:

> The score hinges on whether per-item audio and the absence of mushaf search are
> data/licensing problems rather than product ones. That single judgement — what
> an adhkar app is _for_ — moves the score further than anything else, and it is
> not a question I can settle by executing code.

Audio was never audible in a scoring environment, and five `BLOCKED:device` rows
need real hardware. Those cap confidence at roughly **±0.4** and are the main
reason 9.1 is a stretch rather than a formality.

**What can move the number, and what cannot:**

- _Buildable:_ mushaf search, prayer-method controls, makharij/sifat stages,
  mushaf fidelity, the install path, the tap-target and heading work.
- _Not buildable here:_ per-item audio without a licensed source, and anything
  requiring a physical device.

---

## 10. Where the state lives

| Question                                            | File                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| Owner intent, macro and micro                       | `docs/PROJECT-PICTURE.md`                                           |
| Goals, score history, what happened to each finding | `docs/BACKLOG.md`                                                   |
| Detailed ledger (48 rows) with evidence             | `docs/OPEN-ISSUES.md`                                               |
| What each release changed                           | `docs/RELEASES.md`                                                  |
| What has been audited and closed                    | `docs/AUDITS.md`                                                    |
| Machine rules for agents                            | `AGENTS.md`, `MEMORY.md`, `CLAUDE.md`                               |
| The release and commit ritual                       | `docs/RUNBOOK.md`                                                   |
| Reusable hostile-review prompt                      | `docs/HOSTILE-AUDIT-PROMPT.md`                                      |
| Data conventions, provenance, repair-script rule    | `docs/DATA-SCHEMA.md`, `docs/TRUSTED-SOURCES.md`, `data/SOURCES.md` |
| What can only be checked on a phone                 | `docs/DEVICE-TEST.md`                                               |
| Competitive comparison                              | `docs/CAPABILITY-PARITY.md`                                         |
| Tajweed research with per-rule sourcing             | `docs/TAJWEED-RESEARCH-DOSSIER.md`                                  |

---

## 11. Session hygiene

- Start with `git status --short` and `git log --oneline -5`, and report both.
- The worktree is normally dirty on purpose. Do not revert what you did not
  write; do not revert what you did not understand.
- If a session is compacted or dies, `MEMORY.md` + `docs/RELEASES.md` +
  `git diff` is the whole recovery path. Keep them current.
- **When you are blocked, say so and say exactly what you would need.** Do not
  silently narrow the task, do not stub something and report it as done, and do
  not quietly skip a gate. A false green costs more than an honest red.
