# PROJECT-PICTURE.md — what Nūr al-Dhikr is, and what the owner actually wants

This is the macro-and-micro picture, reconstructed from every `.md` in this
repository and from the owner's own words across many sessions. It exists so a
new agent (or a new session) can hold the whole intent in one page instead of
inferring it from a diff.

If you change the product's direction, change this file in the same change.

---

## 1. Macro: what this is

An **offline-first, installable Islamic web app** (PWA) for daily worship:
adhkar, duas, the 99 Names, prayer times, Hijri calendar, tasbih, the full
Qur'an with per-word study, and Hadeeth. Zero account, zero server, zero
telemetry, no build step, no dependencies.

The engineering consequence of "offline-first" is that **honesty is the
product**. A cached download, a missing grade, a reciter without timings — each
is stated plainly rather than faked, because a worship tool that lies about
what it knows is worse than one that admits a gap.

## 2. Who it is for, in priority order

1. **The 70-year-old Arabic-only reader.** She is the release gate. If she
   cannot start a recitation, find Fajr, and count tasbih on her own, the
   feature is not done. 44px targets, real contrast, no English-only traps, and
   the OS language honored on first launch.
2. **The worshipper reciting at night.** Sleep timer, dimming, hands-free
   keyboard control, no notification fatigue, no streak pressure.
3. **The student.** Per-word morphology, tafsil, i'rab, roots, tafsir — with
   provenance. Study features that pull you _into_ the text, never out of it.
4. **The parent.** Kids mode, honest scope, no addictive loops.

## 3. Micro: the product principles that decide arguments

- **The text is the interface.** Chrome should bow to the Qur'an, not compete
  with it. Player minimization, idle fade, and a mushaf page that reads like
  paper all follow from this.
- **Adab before engagement.** No confetti, no points, no leaderboards, no
  "you failed" copy. A streak freeze absorbs one missed day. `js/domain/nudge.js`
  is test-pinned against streak/shame vocabulary in both languages.
- **No forced memorization.** Nothing is locked behind a streak or a count.
- **Never fake a religious fact.** No invented grade, no plausible timing, no
  LLM-authored scripture commentary. `Unknown` is a valid, respectable state.
- **Translations never leak into Arabic chrome.** Transliteration and
  translation are EN-only by design. Surah and reciter names are the deliberate
  exception — proper nouns render in both scripts, like the edition pickers'
  never-translated native names.
- **RTL is logical, except where sequence matters.** Physical CSS properties
  are banned. The transport row (prev → play → next) is pinned `direction: ltr`
  so it never mirrors, and its icons are not flipped.
- **Pagination is opt-in.** A reading or recitation flow is never interrupted
  by a page break. Continuous scroll or "Load more", user's choice.
- **Scope is disclosed, not hidden.** The Hadeeth library is the Sunni kutub
  sittah and says so. Shi'a collections are a scholarly decision, not an
  engineering one.
- **One voice at a time.** Two audio engines coordinate; whichever starts stops
  the other.
- **Zero account, zero server.** The only way to move data between devices is a
  backup file. This is a feature: it survives regulatory and platform shifts
  that break account-based apps.

## 4. The audio architecture, in the owner's own terms

The owner asked for gapless ayah-to-ayah playback: while ayah _n_ plays, ayah
_n+1_ is fetched, decoded, and **started-but-paused before any sound**, so it
resumes instantly when _n_ ends. No bottleneck, no delay, no cold first ayah.

Current implementation: pooled `<audio>` elements with swap-on-match and a
prime-to-parked pipeline in `js/services/recitation.js`, plus an adaptive
lookahead k∈[2,8] seeded at 5, adjusted by an EWMA of prefetch time with
k-smoothing and a fast-up on swap-miss. The physics floor is documented honestly:
if fetch time exceeds ayah time, no finite buffer helps.

Full-surah file mode is a separate engine with a different honest limitation —
no per-ayah timings exist inside surah files, so the file player never fakes
ayah highlighting.

## 5. What the owner has explicitly asked for and been satisfied with

- Professional player chrome in every context (inside and outside fullscreen),
  with the two surfaces behaving as _one object_ — never lose progress by
  switching sides.
- Manual minimize plus a timed auto-fade, with wake on any interaction.
- Start-from-here: from this ayah, from this page, and continue.
- Keyboard shortcuts like a normal player (Space, M, arrows, drills).
- Modern, restrained visual language — explicitly not cartoonish. The owner's
  reference points are mature music players, and they rejected a "doodle" UI by
  name.
- Word cards and Tajweed surfaces that are _self-contained_: you should never
  have to leave the card to learn a rule.
- An honest AI label: the corpus was prepared with AI assistance, and the app
  says so per item and at corpus level without falsely claiming every item is
  AI-authored.
- A shahada banner appropriate to Islamic tradition (not a moon, which the owner
  correctly identified as Christian iconography).
- Reciter selection across the whole 300+ catalog, with voices that lack
  per-ayah metadata visibly marked rather than silently broken.
- Full-surah as the default recitation mode, with per-ayah mode preserved for
  the things that depend on it (follow-along, word-level study, drills).

## 6. What the owner has explicitly rejected

- Cartoonish or "3-year-old" UI.
- A "more/settings" button that expands into a page-consuming panel, and
  settings that vanish from one context and appear in another.
- English text or a moon in place of Islamic iconography.
- Sloppy work: "slopify" is a word of art in this project.
- Fabricating completeness to make a metric look better.

## 7. Known tension points, stated openly

- **Renderer static-view budget is at its cap (22/22).** Any new view must be
  lazy, and the cap needs headroom before the next feature.
- **`mushafReader.js` is near its line cap.** Growth must go into an extracted
  module.
- **Reciter metadata is uneven.** Voices without per-ayah timings are marked,
  not hidden, and full-surah mode routes through the moshaf catalog for them.
- **Hadeeth is the largest remote dependency** and the only corpus with a
  single upstream source.
- **The app is second-class on iOS** for notifications and storage eviction.
  Documented, not solved.

## 8. The standing competitive goal

The owner wants this app to be a **clone of [azkar.me](https://azkar.me/ar) and
a better one**. The workable and honest reading is **capability parity, then
exceed** — not a copy of someone else's code, name or visual identity, which is
both not ours to take and worse for a project whose standards differ.

Measured against the live site, this project is already ahead on corpus depth
(4× the adhkar, 10× the Hadeeth), per-word study, Tajweed, memorization,
reciters, accessibility and offline truth. It is behind on five things: prayer
madhab and manual minute offset, per-city prayer pages, native app
distribution, a floating counter, and install friction. The comparison and the
plan live in `docs/CAPABILITY-PARITY.md`.

Two things we will deliberately not copy, because copying them would make this
app worse rather than better: their **leaderboard** (ranking people's worship is
the opposite of adab) and their **logged-in, paid AI assistant** (no accounts,
per ADR 0001; no AI-authored religious content, per ADR 0005).

## 9. How to use this file

When a change is proposed, ask: does it serve §2's priority order? Does it
respect §3? If a proposal would violate a principle here, it needs an ADR in
`docs/adr/` and an explicit owner decision — not a silent implementation.
