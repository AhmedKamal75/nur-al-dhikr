# AGENTS.md — Nūr al-Dhikr (نور الذكر)

> **This file is the standing system command for any AI assistant (LLM)
> working on this codebase, and for the app's owner to paste at the start
> of any new session.** It exists so that every session — human or model —
> starts on the same page instead of re-discovering the same rules through
> mistakes. Read it fully before writing code. If you change an
> architectural rule, update this file in the same commit.

App: offline-first, installable (PWA), zero-account, zero-server Islamic
companion — Adhkar, Duas, the 99 Names, prayer times, Hijri calendar,
tasbih, the complete Qur'an with per-word study, a 604-page Mushaf, and
(now) a full Ahadeeth library. Vanilla ES modules, no framework, no build
step. The repo root is the deployable site (GitHub Pages).

---

## 1. Non-negotiables (break these and the release must not ship)

1. **Nothing leaves the device.** No accounts, no analytics, no server
   calls except the small documented CDN set (recitation audio,
   on-demand tafsir). Any feature that requires a backend is _out of
   scope by design_ — do not propose it.
2. **Religious data comes from trusted, citable sources — or not at all.**
   - Every text must trace to a named source (Hisn al-Muslim, Sahih
     al-Bukhari, Sahih Muslim, the Qur'an corpus itself, …). Record
     provenance in `data/SOURCES.md` and `CREDITS.md`.
   - **Never fabricate, paraphrase, or "fix" a sacred text from memory.**
     Qur'an excerpts must be extracted verbatim from `data/quran/` — not
     retyped. When unsure about a text, mark it and say so; an honest
     "Unknown/Unverified" grade beats a confident error.
   - **No truncations.** Content ending in "..." or "[Full text
     omitted]" is a defect, not a style. If a text is too long, ship it
     complete (al-Mulk before sleep is 30 verses — ship all 30).
   - **Order is content.** Adhkar collections follow their canonical
     sequence (e.g. Hisn al-Muslim's numbered order for morning/evening).
     Reordering, duplicating, or "flattening" that sequence is a bug.
3. **Data validation gates are part of the definition of done.** New or
   changed data files ship only with a build/check script that scans the
   whole corpus (not samples) for duplicates, truncation markers, missing
   fields, and schema drift, plus tests that fail loudly.
4. **Untrusted-input discipline.** Anything read from fetch/localStorage/
   IndexedDB is hostile until validated: shape-check, sanitize enums,
   clamp numbers, and `escapeHTML()` anything rendered. Content strings
   are data, never markup — no exceptions, including hadith/adhkar text.
5. **Offline-first honesty.** A feature may use the network lazily
   (load-on-first-open, then SW-cache forever, as tafsir and the big
   hadith books do) — but it must say so in the UI, and anything the Home
   screen shows at boot must work with zero network (small precached
   books only).

## 2. Architecture you must not fight

- **String-render model.** Views are pure functions `state → HTML string`.
  Only `renderer.js` and app.js's single delegated event listener touch the
  DOM. Don't attach per-element listeners; don't mutate state in views.
- **The patch engine (v3.9).** `renderer.js` assigns nothing blindly:
  `patchHTML()` skips byte-identical output (kills the "F5 flash") and
  otherwise reconciles top-level children so unchanged subtrees keep their
  live DOM nodes (CSS animations, focus, inner scroll survive). Any new
  mount point must go through `patchHTML`, not raw `innerHTML`. The
  matcher (`matchChildren`) is pure and unit-tested — keep it DOM-free.
- **Store batching.** Multi-dispatch user gestures go through
  `store.batch()` (one notify + one persist). A single tap must not cause
  multiple full renders.
- **Lazy data tiers.** (a) Precached shell + small data in `sw.js`
  APP_SHELL; (b) per-chunk data (`data/quran/*.json`, `data/hadith/<book>.json`)
  fetched on demand and cached offline by the SW's stale-while-revalidate
  rule for `/data/*.json`; (c) explicit-download remote content (tafsir
  volumes). New content must declare which tier it lives in.
- **Ephemeral vs persisted state.** Anything large or reconstructable is
  ephemeral in `initialState()` and NOT in `PERSISTED_KEYS` (see quran,
  mushaf, hadith slices). Persisting multi-MB docs to localStorage is a
  defect, not an optimization.
- **Bilingual parity.** Every user-facing string gets EN + AR in `i18n.js`
  (UI) or the data file (content), with correct `dir` attributes. New
  features launch in both languages or they don't launch.

## 3. Quality gates (run before claiming anything works)

```
npm run lint          # eslint, zero errors
npm test              # node --test tests/*.test.js — ALL green
npm run format:check  # touched files only; repo-wide debt is tracked, don't grow it
node ../scripts/css-token-check.mjs      # every var() must resolve
node ../scripts/css-contrast-audit.mjs   # 0 failing pairs, light+dark+AMOLED × all palettes
```

Any change to `assets/css/` must leave both CSS audits clean — the tests
in `tests/cssDesign.test.js` enforce the core of it, but the audits catch
more. New colors go through `variables.css` tokens (foregrounds use the
`-text` variants; fills use the raw tokens); raw hex in components is for
the deliberate exceptions already documented there (tajweed rule colors,
print styles). New interactive controls are at least `var(--touch-target)`
(44px) or carry a documented hit-area/inline exception.

Plus, when data or feature logic changed: the feature's sanity/hostile
scripts under `/scripts` (outside the app dir), e.g. the Qur'an search
hostile battery. New modules need unit tests; new data needs integrity
tests. Numbers you quote to the user must come from actual runs.

**Tests run from the shipped zip, too.** The release zip packages the app
directory only — repo-root `scripts/` is excluded by design (§4.4). A
test must therefore never statically import (or unconditionally
subprocess) anything outside the app directory: in the zip that is an
`ERR_MODULE_NOT_FOUND` which hard-crashes the entire test file before a
single assertion runs. Logic a test needs lives inside the app
(`tests/helpers/`); a repo-root script may re-export from there via a
shim to keep its CLI working. If a test must tolerate an optional
out-of-boundary dependency, it dynamic-imports it and skips loudly with
the reason — it never crashes silently. (Rule added v3.16.0 after
tests/icons.test.js crashed the whole file when run from a shipped zip —
the second occurrence of this defect class after hostileGate.test.js;
the lesson was generalized this time, not patched one-off.)

## 4. Release protocol (every version, no shortcuts)

1. Bump **all four** version markers: `package.json`, `APP_VERSION` in
   `js/config.js`, `VERSION` in `sw.js`, and a `CHANGELOG.md` section.
2. Update `TODO.md` honestly: check off what shipped, leave what didn't,
   and record deliberate exclusions with reasons ("residual" notes).
3. Update `data/SOURCES.md` / `CREDITS.md` for any new content.
4. Commit, then package the deliverable zip with the established layout:
   site files at the zip root, `node_modules/` + local `scripts/` excluded
   (tests must be able to run without `scripts/` — see §3),
   dotfiles preserved (`.gitignore` etc. must survive).
5. Never claim a test/audit ran unless you ran it in this session.

## 5. The recurring audit (owner asks for this "once in a while")

When asked to "do the audit", do all of it and report honestly:

1. **TODO ↔ reality diff.** Every `[x]` in TODO.md is actually in the
   build; every unchecked item still needs doing; no silent drift.
2. **Data health sweep.** Scripted scan of all content JSON: no "…"/"..."
   truncations, no duplicate texts within a category, no empty required
   fields, canonical order intact (adhkar), references present, counts
   match metadata. Also: corpus-wide stress runs for any classifier
   (tajweed etc.) — zero crashes, zero out-of-range spans.
3. **Feature completeness spot-check.** Pick the last two shipped
   features and exercise them end-to-end (views render in EN and AR,
   settings sanitize hostile values, deep links land, SW precache covers
   every imported module — the test suite checks this last one).
4. **Docs truth check.** CHANGELOG/README/About/SOURCES match what is
   actually shipped; version markers agree everywhere.
5. **Size & packaging sanity.** Zip layout correct, no stray build
   artifacts, no source data leaks into the zip, sizes reported.

## 6. UX bar (the small things that are actually big)

- **No flicker.** Tapping anything must not visibly re-paint unrelated
  parts of the page. If a render feels like a page refresh, fix the
  render (patch engine, batching), not the user's expectations.
- **Focus is sacred.** Typing into a search box must never lose the
  caret; dragging a slider must never be cut off mid-drag.
- **Respect the person.** No streak-shaming, no guilt copy, no
  manipulation. The app is a companion, not a slot machine.
- **Defaults a scholar would accept.** Tajweed coloring off by default;
  weak narrations graded honestly; theological nuances (e.g. certain
  Names of Allah) never surfaced out of context.

## 7. Working agreement with the owner

- The owner reads between the lines: "the azkar are unordered" means
  "restore the canonical order and audit every entry". Implement the
  thorough version, then say plainly what was and wasn't done.
- Deliverables land as a downloadable zip; the repo's git remote is
  github.com/AhmedKamal75/nur-al-dhikr (the owner pushes).
- Progress notes go to the shared `worklog.md` (outside the app dir);
  the in-app `About` screen credits sources and keeps an honest feature
  summary.
