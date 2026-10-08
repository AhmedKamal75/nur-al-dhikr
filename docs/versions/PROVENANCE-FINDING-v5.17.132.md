# Nūr al-Dhikr — Provenance finding after hostile review v5.17.132

Date: 2026-10-07

## Finding PF-132-01 — SOURCE.md overstates dataset licensing

Severity: P1 provenance/documentation
Status: OPEN — must be corrected in next release after v5.17.132 persistence

### Current statement

`data/SOURCES.md` currently opens by stating that everything documented there is used in a free, offline, non-commercial personal study app "consistent with how each source is publicly distributed".

### Why this is unsafe

The statement is broader than the evidence now available from several upstream providers.

- QUL explicitly says that its resources vary in copyright/licensing status and that users must review the licensing information for each resource before use.
- Quran Foundation's current Developer Terms distinguish API-content use from redistribution/storage and impose resource-specific constraints; these terms are not a blanket licence for copied datasets.
- QuranWBW describes its data as its own and points users to QUL for external resources; this does not establish a general redistribution licence for the underlying word-by-word dataset.
- spa5k/tafsir_api is MIT-licensed as a repository, but its README identifies individual editions with sources such as QUL, Quran.com, and altafsir.com. A code-repository licence should not be treated as a blanket licence for every underlying religious text.

### Required remediation

Replace the blanket opening claim with a source-by-source provenance status model, for example:

- `Verified redistribution permission`
- `Permission/terms require attribution`
- `Dataset-specific licence review required`
- `Source-only / display-use dependency`
- `Not yet verified — do not redistribute`

Every shipped external dataset should then have:

1. exact source/project;
2. exact snapshot/tag/commit/date;
3. rights/terms URL;
4. allowed use in Nūr al-Dhikr;
5. required attribution;
6. modification/derivation status;
7. reviewer status;
8. unresolved restrictions.

### Release rule

Do not silently change religious-content bytes while repairing provenance. The correction is primarily metadata/documentation until a source-specific rights decision authorizes any data migration.

## Related current findings

- Tafsir runtime still points to mutable `main`; upstream recommends exact release-tag pinning and strongly recommends self-hosting.
- QuranWBW exact dataset snapshot/licence chain remains unresolved.
- Hadith edition/translation rights remain unresolved; repository-level licensing does not settle underlying source rights.
