# HANDOFF PROMPT — Nūr al-Dhikr v5.17.78 (read this first)

You have a zip of Nūr al-Dhikr at **v5.17.78**, plus a finished evidence packet
from the previous local-agent run. This file replaces the onboarding
conversation. Everything you need is in this archive.

The tree you unzip is a **complete, runnable project with the full 2350-file
corpus**. That is deliberate: the previous handoff shipped a 26-file slim seed,
which is why its own gates could never be certified. Yours can be.

---

## 1. Set it up (about 3 minutes)

```bash
unzip nur-al-dhikr-v5.17.78-handoff.zip -d nur-5178
cd nur-5178
npm install
npm run check                          # expect exit 0 — 2730/2730
npm run e2e -- --project=chromium      # expect exit 0 — 173 passed, 3 skipped
```

Both gates were green when this archive was made. **If either is red, that is new
information — capture the exact failure and report it. Do not work around it and
later call the gate green.**

Everything runs offline. No account, no server, no telemetry.

---

## 2. Read these, in this order

1. `evidence/LOCAL-AGENT-RESULTS/RUN-SUMMARY.md` — **start here.** The numbers,
   the exact commands, what was fixed and what was not.
2. `evidence/LOCAL-AGENT-RESULTS/OPEN-FINDINGS.md` — 8 open findings, ranked,
   with measurements. Two need an owner's decision (see §4).
3. `evidence/LOCAL-AGENT-RESULTS/CHANGES.md` — every change and its
   before/after measurement.
4. `evidence/LOCAL-AGENT-RESULTS/NEXT-HANDOFF.md` — the reviewer's reading list,
   in priority order.
5. `evidence/LOCAL-AGENT-RESULTS/SCREENSHOT-INDEX.md` — 192-cell screenshot
   matrix (12 routes × EN/AR × light/dark × 4 viewports) + 2 before/after pairs.
   **The screenshots exist. Look at them; do not re-derive the layout from source.**
6. `evidence/LOCAL-AGENT-RESULTS/BROWSER-ENVIRONMENT.md` — what was and was not
   exercised.
7. `AGENTS.md` and `MEMORY.md` — the project's own rules. They still hold.
8. `LOCAL-AGENT-PROMPT.md` and `docs/LOCAL-AGENT/*` — the standing execution
   layer. Still valid; the handoff you are holding is its output.

---

## 3. What you are NOT being asked to do

- **Do not redo the deslopification.** The product has been through many passes.
  You are continuing, not restarting.
- **Do not re-review the fixes.** They are measured and pinned. Your first
  contribution should come from §4 or §5, not from re-litigating §2.
- **Do not score the product yet** if the owner has not asked. Evidence first.
- **Do not invent religious content.** Qur'an, hadith, tafsir, grades, timings,
  reciters, tajweed rulings: verified source with provenance, or honest absence.
  See `AGENTS.md` §1.
- **Do not raise a timeout or add a retry to make a flake disappear.** Prove it in
  isolation and say so.

---

## 4. Two open findings that need the owner's decision — surface them early

These are deliberately unfixed. Both are visible design decisions, not bugs an
agent should quietly decide.

1. **`.reciter-row__meta` is clipped in Settings at every viewport**, including
   1440×900: 960px of metadata inside a 596px row, cut off by
   `.view--settings { overflow-x: clip }`. Truncate, wrap, give it its own line,
   or shrink it — ask.
2. **Palette colours have two sources of truth.** `js/core/theme.js` sets
   `--color-primary-raw` inline from `config.js` PALETTES, which silently defeats
   the `[data-palette=…]` blocks in `assets/css/deslopify.css` for all 11
   palettes. Consequence: the v5.17.7x palette rework **never actually ships**.
   A reader sees nothing wrong; the CSS is dead code that reads as the design of
   record. Decide which file is authoritative, then derive or delete the other.

---

## 5. Where the real risk is now

The previous run's most important finding was not a colour. It was this:

> `tests/cssDesign.test.js` asserted "text tiers hold AA on every surface" and
> **passed**, while the browser rendered 4.22:1. The gate read `variables.css`
> alone, but a later stylesheet redefined the same token in a second `:root`, so
> the contract had been certifying a value the cascade had already overridden.

A gate that reads an overridden value is worse than no gate — it reports green
for a defect that is on screen.

That class is now fixed for colour tokens (resolution follows the real cascade
order from `index.html`). **Ask what else in the test suite reads a literal where
the product reads a computed value.** The same shape of bug hides in: routes
hardcoded in a spec that a route→door map now generates; counts pinned in a test
that the corpus now produces; allowlists naming files that have since been
reorganised. Look for a test asserting something a _source file_ says, when the
truth is what the browser renders.

---

## 6. What has never been checked

From `BROWSER-ENVIRONMENT.md`, and the highest-value next work:

- **Firefox and WebKit.** Installed, never run. `playwright.config.js` builds the
  extra projects behind a flag. A cross-engine pass is unstarted.
- **Large text / roomy mode / forced colors / reduced transparency.**
  `accessibility.css` has rules for all of them; none has been visually certified.
- **Real touch hardware**, safe-area insets, actual audio through a device mixer.
- **Install and update surfaces** on a real platform.
- **The geometry probe has a known blind spot** (`OPEN-FINDINGS.md` §8): it cannot
  tell "clipped by an ancestor with `overflow-x: clip`" from "clipped by the
  viewport", which is exactly why finding 4.1 was invisible to it. Fix the probe
  before trusting a clean sweep.

---

## 7. House rules that are not optional

- Every user-facing string in **Arabic and English**. A string that fits English
  and breaks Arabic is a defect, not a translation issue.
- Logical CSS properties, never physical. No fixed heights around translated text.
- New `data-action` needs a handler **and** an allowlist entry. New file under
  `js/` needs `APP_SHELL` in `sw.js` **and** a re-stamped snapshot. New settings
  key needs the sanitizer. New i18n key needs both languages.
- Touching `js/`, `assets/css/` or `sw.js` means the full release ritual: bump
  **all** version markers, `npm run snapshot-shell`, `npm run manifest:generate`,
  `npm run compress-data` if data changed, then both gates. `tests/contracts.test.js`
  enforces every step.
- One defect should send you looking for the whole class. Prefer a fix at the
  source over a patch at the symptom, and pin the class, not the instance.
- Every fix needs a test that would have failed before it — and you must **prove**
  it fails by reintroducing the defect, not assume it.

---

## 8. Reporting back

Lead with evidence: environment, exact commands, exact gate output, what changed,
what is still open, and what you did **not** verify. Never round a number up, and
do not use "fixed", "perfect" or "production-ready" without a measurement behind
the word. "Unreproduced, left open" is worth more than a false green.

`docs/LOCAL-AGENT/RETURN-PACKET-TEMPLATE.md` is the shape the owner expects, and
`docs/LOCAL-AGENT/HOSTILE-REVIEW-RUBRIC.md` is the scoring rubric — use them only
when the owner asks for a score.
