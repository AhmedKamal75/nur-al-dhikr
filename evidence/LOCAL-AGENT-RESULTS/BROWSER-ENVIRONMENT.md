# BROWSER ENVIRONMENT — Nūr al-Dhikr local-agent run

This is the machine the v5.17.77 handoff asked for: one where the Chromium matrix
can actually be launched, because the archive's own environment could not.

| Item | Value |
|---|---|
| OS | Linux 6.6.87.2-microsoft-standard-WSL2, x86_64 |
| Distro | Ubuntu 24.04.4 LTS (WSL2) |
| Node | v20.19.5 |
| npm | 10.8.2 |
| Playwright | 1.63.0 |
| Chromium | 153.0.8010.12 (`chromium-1243` from `~/.cache/ms-playwright`) |
| Also installed | `firefox-1543`, `webkit-2359`, `ffmpeg-1011` — **not exercised** |
| CPUs | 8 |
| RAM | 7 GB |
| `PW_WORKERS` | default 4 (see the contention note below) |

## Viewport support — verified by execution

All four required viewports rendered and screenshotted in all four
language/theme modes; 192 screenshots exist under `screenshots/`.

| Viewport | Verified |
|---|---|
| 360×800 | yes |
| 393×852 | yes |
| 1024×768 | yes |
| 1440×900 | yes |

## How the suite was served

`playwright.config.js` owns its own **threaded** `http.server` on a dedicated
port (`E2E_PORT`, default 8123) with `reuseExistingServer: false`, so the suite
never adopts a single-threaded `npm start`. The screenshot matrix used a separate
throwaway server on port 8099 (`ThreadingHTTPServer`) for the same reason.

## Corpus

Full corpus present: **2350 files** in `data/manifest.json`, mode `full`.
The handoff archive ships a 26-file slim seed, so every corpus-dependent gate
here was run against the **real** build, not the seed.

## Known environment limitation (stated, not hidden)

The box has 8 CPUs / 7 GB RAM and the suite runs 4 workers. In one full run a
single a11y-matrix test failed with:

```
Test timeout of 45000ms exceeded while setting up "page".
```

That is **browser startup** timing out under contention, not a product failure —
`playwright.config.js:60-70` documents exactly this trade-off (4 workers → 67
passing / 0 failing; 6 workers → four tests timing out at 45s). The test passes
in isolation in ~9s. I did **not** raise the timeout or add retries to hide it;
see `OPEN-FINDINGS.md`.

## Not exercised

- Firefox and WebKit projects (`npm run e2e` without `--project=chromium`).
- Real touch hardware, real mobile browser chrome, safe-area insets on a
  physical device, actual audio output through the device mixer.
- Forced-colors mode, and the iOS/Android install and update surfaces.
