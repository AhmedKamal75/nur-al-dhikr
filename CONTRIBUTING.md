# Contributing to Nūr al-Dhikr

Thanks for your interest. This project is deliberately small in process:
vanilla code, executable documentation, and gates that run everywhere.

## Setup

```bash
python3 -m http.server 8080   # serve (file:// won't work: ES modules + SW)
# open http://localhost:8080

npm install        # dev-only: eslint + prettier (+ playwright for e2e)
npm run check      # lint + format:check + unit tests — must be green
npm run e2e        # browser smoke + race specs (needs: npx playwright install chromium)
```

The repo root **is** the deployable site (GitHub Pages). `node_modules/`
never ships; `data/` and `assets/icons/` are git-ignored build/packaging
inputs — don't commit them.

## Rules that matter

1. **Read [ARCHITECTURE.md](ARCHITECTURE.md) first.** Layer rules
   (`app → core/domain/services/ui/views`), one-directional data flow,
   and the non-negotiables (nothing leaves the device; sacred texts are
   never retyped, paraphrased, or truncated; bilingual EN+AR parity).
   If you change an architectural rule, update that file in the same commit.
2. **Every user-facing string ships EN + AR** with correct `dir`, or the
   feature doesn't ship.
3. **New modules need unit tests; new data needs integrity tests.**
   Tests live in `tests/*.test.js` and run with `node --test` — they must
   never statically import outside the shipped tree (`tests/helpers/` is
   the exception). Browser-behavior coverage goes in `tests/e2e/*.spec.js`
   (Playwright, `.spec.js` so the unit runner ignores it).
4. **Never claim a test/audit ran unless you ran it in this session.**
   Numbers you quote (test counts, file counts) must come from actual
   runs — docs numbers are regenerated from counts, never typed.
5. **Version bumps are lockstep**: `package.json`, `APP_VERSION` in
   `js/core/config.js`, `VERSION` in `sw.js`, `version` + `version_name`
   in `manifest.json`, a `docs/RELEASES.md` entry — then
   `npm run snapshot-shell` (the contract gate enforces all of it).

## Pull requests

- Keep them small and single-purpose; one feature or fix per PR.
- `npm run check` green is required. Add regression tests that fail on
  the old code for every bug fix.
- Update the affected docs in the same PR (`ARCHITECTURE.md`,
  `docs/RELEASES.md`, usage docs if behavior changed).
- Be kind in review. This app serves people in worship — correctness
  and honesty outrank cleverness.

## Reporting bugs

Open a GitHub issue with: what you tapped, what you expected, what
happened, device/browser, and whether it happens offline. Screenshots
of the exact screen help enormously. See [SECURITY.md](SECURITY.md) for
security-sensitive reports.
