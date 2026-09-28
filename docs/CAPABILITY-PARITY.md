# CAPABILITY-PARITY.md — the azkar.me goal, and what it actually means

**The owner's goal, in one line:** "I want a clone of
[azkar.me/ar](https://azkar.me/ar) — and a better one."

**What this document is:** the honest translation of that sentence into work,
plus a like-for-like comparison against the live site so nobody argues from
memory again.

**What this document is not:** a plan to copy their code. That is not on the
table, for two reasons. It is their intellectual property, and a pixel-for-pixel
copy of a competitor's UI would make this project worse — it exists because its
standards differ. What is on the table is **capability parity, then exceed**:
every thing they can do, we can do, and the things they do not do, we do
better.

Re-verify the rival's claims against the live site before quoting them here.
Numbers rot.

---

## 1. The comparison, as measured on 2026-09-27

| Capability                                         | azkar.me                                               | This project                                                             | Ahead?                               |
| -------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------ |
| Adhkar corpus                                      | 250+ items, 25+ sections (Hisn al-Muslim)              | **1065 items, 9 libraries**                                              | **yes, 4×**                          |
| Hadeeth                                            | 3,500+ in 450+ topics, bundled, with grading + takhrij | **34,239**, index offline, text on demand                                | **yes, ~10×** (ours is remote-first) |
| Mushaf surahs                                      | 114, Uthmani                                           | 114, 604 pages                                                           | equal                                |
| Reciters                                           | 28                                                     | **312 moshaf + 16 verse voices**                                         | **yes**                              |
| Per-word study                                     | none                                                   | tafsil, iʿrab, morphology, roots, lexicon, tafsir                        | **yes, decisively**                  |
| Tajweed                                            | none                                                   | colouring, per-family underlines, guided lessons, practice, quiz         | **yes**                              |
| Memorization                                       | "garden" visualisation                                 | SRS by-heart, per-ayah heatmap, khatma, mutashabihat, mistyped detection | **yes, deeper**                      |
| Prayer times                                       | **23 methods, madhab choice, manual minute offset**    | methods + offline city presets                                           | **no — they are deeper here**        |
| Per-city prayer pages                              | 300+ SEO pages                                         | one prayer view with city search                                         | **no**                               |
| Qibla                                              | yes                                                    | yes, with WMM declination correction                                     | equal, slightly better               |
| Notifications                                      | morning/evening                                        | morning/evening + prayer alerts                                          | equal                                |
| Themes                                             | light/dark                                             | light/dark, high contrast, Elder Mode, 11 mushaf papers                  | **yes**                              |
| Kids mode                                          | none                                                   | sandboxed, parent-controlled, imports refused                            | **yes**                              |
| Journal / sadaqah / zakat / plans / share / backup | none                                                   | all present                                                              | **yes**                              |
| Hijri calendar                                     | yes                                                    | yes + calendar sheet + recurrences                                       | equal                                |
| **Native iOS/Android app**                         | yes (App Store, Play Store)                            | **PWA only**                                                             | **no — our biggest gap**             |
| **Floating tasbih overlay**                        | yes (Android)                                          | **none**                                                                 | **no**                               |
| **AI assistant**                                   | "ذاكر" — answers with sources, **login + paid plans**  | none, deliberately                                                       | see §4                               |
| **Leaderboard**                                    | yes (لوحة المتصدرين)                                   | **deliberately absent**                                                  | see §4                               |
| Blog                                               | yes                                                    | none                                                                     | no                                   |
| Language                                           | AR + EN                                                | AR + EN (+ 4 verse-only translations)                                    | equal                                |

**Summary.** On content depth, study, memorization, reciters, accessibility,
prayer-time control and offline truth, this project is ahead or equal. They are
ahead on **distribution** (native apps), **SEO surface** (per-city pages), and a
**floating counter**.

## 2. The real gap list, in the order I would do them

| #   | Gap                                                               | Why it matters                                                                                                                                                                                                                                             | Cost    | Blocked on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | ~~**Prayer madhab + manual minute offset**~~ **SHIPPED v5.17.12** | A "best" prayer time is wrong by minutes for someone who follows a different madhab, or whose local calendar differs. This is an honesty-of-data issue, the same class as the grades rule.                                                                 | —       | **Verified by execution, v5.17.22:** 7 methods, Asr Standard **and** Hanafi, and per-prayer ±60-minute offsets — all reachable from the wizard and Settings, pinned by `tests/prayer-methods.test.js`. A prototype-chain bug in method lookup was found and fixed on the way. **The remaining depth gap is separate and still open:** 7 methods against a rival's 23, and two Asr twilight conventions against their four. That is a data project needing cited sources (`docs/OPEN-ISSUES.md` 25c), not a missing control. |
| G2  | **Floating counter while the app is in the background**           | They ship an Android overlay. A PWA equivalent exists: **Picture-in-Picture** for the counter, which works on Android and desktop Chrome without any permission.                                                                                           | —       | **SHIPPED v5.17.15, verified v5.17.22:** `js/services/floatingCounter.js` uses Document Picture-in-Picture, is feature-gated (the button is absent where the API is missing, rather than dead), and tracks phrase, count and target live from the store. Unit + browser tests including the unsupported-engine path.                                                                                                                                                                                                        |
| G3  | **Install/distribution story**                                    | We are second-class on iOS. We cannot ship a native app inside this project's constraints (no build step, no app store), but we _can_ make the PWA install path excellent: install prompts, iOS "Add to Home Screen" guidance, an offline-first first run. | ~2 days | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| G4  | **Per-city prayer pages**                                         | Pure SEO surface, 300+ pages. Contradicts nothing, but it is marketing, not product, and it multiplies maintenance.                                                                                                                                        | ~1 week | Owner decision: do we want an SEO surface at all?                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| G5  | **Floating/shared counter between devices**                       | Not something they have either. Listed so it is not "discovered missing" later.                                                                                                                                                                            | —       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## 3. What we will not copy, and why

- **Their code, name, branding, icons, and copy.** Not ours to take. The visual
  language here is deliberately its own (see `docs/PROJECT-PICTURE.md`).
- **Their text corpus wholesale.** Their adhkar are Hisn al-Muslim by Ashraf
  Al-Qutbani — a real published book with its own editorial decisions. Our
  corpus is separately sourced and attributed in `data/SOURCES.md`. Importing
  their file would import their sourcing decisions without their scholarship.
- **The leaderboard.** It is exactly the pressure mechanic this project
  deliberately refuses (ADR `0005-honest-absence-over-fake-completeness.md`, and
  the streak-ethics rules in `MEMORY.md` §4). Ranking people's worship is the
  opposite of adab. If the owner ever wants it, it needs an ADR overturning a
  stated principle, not a quiet copy.
- **The logged-in paid AI assistant.** Two of our principles collide: no
  accounts (ADR `0001`) and no AI-authored religious content (ADR `0005`). Their
  assistant does cite sources, which is compatible with our rules in spirit —
  but it needs an account and a payment rail. The honest version of that idea
  for us is a _local, source-citing_ search and study surface, which we largely
  already have. If the owner wants a conversational layer, the acceptable shape
  is: no account, no server, and every answer carrying its citation — which
  means it cannot be a hosted LLM, and that is a real constraint, not an
  oversight.

## 4. How this goal is measured

Not by "does it look like theirs". By:

1. Every capability in the §1 table reads **equal or better** for the person
   using it. Currently five rows read worse, and they are G1–G4 above.
2. No regression in the four things that made this project better in the first
   place: offline truth, honest absence, adab over gamification, and the
   grandmother release gate.

## 5. The honest headline

**We are not behind them. We are a different app that is deeper in study and
weaker in distribution.** As of v5.17.22 the work worth doing is G3 (the install
Picture-in-Picture) and G3 (an install story that makes a PWA feel like a real
app) — two bounded, shippable pieces — plus G4 if an SEO surface is wanted. The
leaderboard and the paid AI assistant are not gaps; they are places where being
different is the correct answer.

**A pattern worth naming:** of the five items this goal originally listed as
gaps, three turned out to be shipped and two to be genuine. Each was verified
by execution, not by reading a competitor-comparison report. `MEMORY.md` §1
already says a grep is a hypothesis — this is the same lesson at product scale.
