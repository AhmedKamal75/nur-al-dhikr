# Changelog

The full, human-written release history lives in **[`docs/RELEASES.md`](docs/RELEASES.md)** —
newest first, one section per version, in plain language.

This file exists so tooling and humans landing on the repository root can find
the history in one click. It is intentionally a pointer, not a duplicate: two
changelogs drift, and a drifted changelog is worse than none.

- Current version: see `package.json` (`version`).
- That version is mirrored in `js/core/config.js` (`APP_VERSION`), `sw.js`
  (`VERSION`), `manifest.json` (`version` + `version_name`), and the newest
  `## vX` heading in `docs/RELEASES.md`. All five must agree —
  `tests/contracts.test.js` enforces it.
- Still open / unresolved work: [`docs/OPEN-ISSUES.md`](docs/OPEN-ISSUES.md).
- What the product is and who it serves: [`docs/PROJECT-PICTURE.md`](docs/PROJECT-PICTURE.md).
