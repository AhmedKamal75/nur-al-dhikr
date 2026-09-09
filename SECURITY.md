# Security policy

## Scope

Nūr al-Dhikr is an **offline-first, zero-server client-side app**: there
are no accounts, no backends, no analytics, and no data collection. The
realistic attack surface is:

- **Supply chain** — the only runtime third parties are recitation-audio
  CDNs and on-demand tafsir fetches, loaded lazily and documented in
  [ARCHITECTURE.md](ARCHITECTURE.md). Dev-only dependencies (eslint,
  prettier, Playwright) never ship to users.
- **Stored content** — backups, imports, and `localStorage`/IndexedDB
  payloads are treated as hostile: the reducer validates, the restore
  path sanitizes through an allowlist, and rendered strings are escaped
  (`docs/AUDITS.md` records the adversarial batteries).
- **Service worker** — cache-first shell is version-gated; a hash-stamp
  contract test fails the build if cached bytes change without a version
  bump.

## Reporting a vulnerability

Open a GitHub issue titled `[security]` with a minimal reproduction
(steps, device/browser, affected version from Settings → About). Do not
open issues containing other people's personal data.

Religious-content corrections (a wrong vowel, a misattributed hadith)
are **correctness bugs, not security issues** — file them as normal
issues, and please cite the source. Per project policy, sacred texts
are fixed from citable sources only, never from memory.

## Privacy

There is nothing to breach: the app has no server component and sends
nothing anywhere except the documented lazy CDN fetches. Your data lives
in your browser; uninstalling or clearing site data removes it (keep a
JSON backup — see [USAGE.md](USAGE.md)).
