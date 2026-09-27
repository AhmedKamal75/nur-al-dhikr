# GLOSSARY.md — the project's own words

Terms that mean something specific here, or that are easy to get wrong.

## Worship and content

| Term               | Meaning                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Adhkar**         | Remembrances and liturgies recited at set times (morning, evening, after prayer, sleep). Distinct from duas.                        |
| **Du'a**           | An individual supplication.                                                                                                         |
| **Tasbih**         | Lifting the praise of Allah, traditionally on a bead counter. The app's counter supports arbitrary phrase targets.                  |
| **Hizb / Juz**     | The standard divisions of the Qur'an (60 hizb, 30 juz). Rendered with Eastern-Arabic numerals.                                      |
| **Sajdah**         | Prostration. Fifteen places in the Qur'an carry a sajdah marker, excluded from Bismillah placement.                                 |
| **Riwaya**         | The recitation tradition (e.g. Hafs). The bundled mushaf text is Hafs; a non-Hafs voice over it is a mismatch the app should state. |
| **Tafsil / I'rab** | Word-level morphological and grammatical analysis, sourced from the Quranic Arabic Corpus.                                          |
| **Tajweed**        | The rules of recitation. The app colours and underlines rule families; colour is conventional, not canonical.                       |
| **Qalqalah**       | The echoing articulation of certain letters. Coloured cyan in this app, where some other conventions use red.                       |
| **Mutashabihat**   | Similar-looking passages, used as memorisation aids.                                                                                |
| **Khatma**         | Completing the Qur'an. Tracked, never gated.                                                                                        |
| **Tawbah**         | The opening chapter, whose Bismillah is not counted as a verse.                                                                     |

## Data integrity

| Term                        | Meaning                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Verified**                | Traceable to a named source with a citation. Only verified data may be displayed as fact.                                                              |
| **Unknown**                 | A deliberate, honest state for a grade or fact with no source. Not a bug and not a placeholder.                                                        |
| **Unconfirmed attribution** | The item's narrator/author/source field has not been verified. Shown where a reader would rely on it.                                                  |
| **Two Sahihs**              | Bukhari and Muslim. The only hadith collections the app presents a standing badge for.                                                                 |
| **Matn**                    | The body text of a narration. Verified by exact contiguous token match against its cited verse.                                                        |
| **Corpus**                  | A bundled data file. Every corpus file is listed in `data/manifest.json` with a checksum.                                                              |
| **Seed mode**               | A reduced bundle for testing and sharing, which omits some data directories. Tests that need omitted data use the seed-mode guard rather than failing. |

## Engineering

| Term                             | Meaning                                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The lens**                     | `settings.contentPrefs` — a user's hide/reorder/edit/add/delete overrides computed over immutable bundled data. Restoring = deleting keys.                 |
| **APP_SHELL**                    | The service worker's precache list. It must exactly match the shipped files; a mismatch is a CI failure.                                                   |
| **Snapshot**                     | `tests/app-shell-hashes.json` — the recorded hashes of every cache-first byte. Re-stamped on every version bump.                                           |
| **The five markers**             | `package.json` version, `APP_VERSION`, `sw.js` `VERSION`, `manifest.json` `version`+`version_name`, newest `docs/RELEASES.md` heading. They move together. |
| **data-action**                  | The declarative hook on interactive elements. Delegated handlers only; no view attaches listeners.                                                         |
| **Logical property**             | `inline-size`, `margin-inline-start`, etc. Physical properties (`margin-left`) are banned except in documented exemptions.                                 |
| **The one-voice rule**           | Two audio engines exist; only one ever sounds.                                                                                                             |
| **Gapless**                      | Starting ayah _n+1_ before ayah _n_ ends, so playback is continuous. Partial by physics: if fetch time exceeds ayah time, no buffer helps.                 |
| **Distraction-free / idle fade** | Player chrome auto-hiding after inactivity, waking on any interaction.                                                                                     |
| **Elder Mode**                   | Accessibility preset: larger targets and type. Opt-in, and still under-discoverable.                                                                       |
| **ADR**                          | Architecture Decision Record — a decision expensive to reverse, recorded in `docs/adr/`.                                                                   |
