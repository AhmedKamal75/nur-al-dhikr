# Nūr al-Dhikr — Provenance Research Addendum v5.17.132

Date: 2026-10-07
Status: research-only; no release advancement

## Executive disposition

The hostile review's provenance findings are real, but they are three different classes of problem:

1. **Repository/code license != dataset/content permission.**
2. **Reproducibility != redistribution rights.**
3. **Source-site terms can restrict reproduction even when an aggregator repository is permissively licensed.**

No religious corpus was changed in this research pass.

## 1. Tafsir API continuity

Current Nūr al-Dhikr source still constructs on-demand Tafsir URLs from:
`https://raw.githubusercontent.com/spa5k/tafsir_api/main/...`

The upstream Tafsir API README currently says:

- production should pin an exact release tag or commit hash;
- public CDN caching/outages are outside the application's control;
- self-hosting is strongly recommended for production;
- the dataset is static JSON and can be hosted on normal object/static hosting.

Therefore the minimum engineering remediation is a deterministic snapshot pin. However, the repository's MIT code license must not be treated as blanket permission for every underlying Tafsir text. The README's edition table points to underlying sources such as quran.com and QUL, so each bundled/on-demand edition still needs source-specific provenance review before self-hosting or redistribution.

## 2. QuranWBW word-by-word data

The current Nūr al-Dhikr source documents quranwbw.com as the source of English word-by-word glosses and transliteration, but does not record an exact data snapshot hash or a dataset-specific redistribution license.

The current marwan/quranwbw repository README says it uses its own data and directs people seeking Quranic data toward QUL; it does not establish a clear license for the exact underlying word-by-word dataset being redistributed by Nūr al-Dhikr. The visible MIT repository license therefore cannot be used as proof that the underlying dataset is MIT-licensed.

The correct action is provenance capture, not silent replacement:

- identify the exact source snapshot currently embedded;
- identify its original publisher/source datasets;
- obtain an explicit dataset permission/license or select a dataset with explicit redistribution terms;
- record a snapshot hash and attribution in the app.

Quran Foundation's current developer terms also show why API permission is not equivalent to dataset redistribution: QF permits end-user display in an application but separately restricts redistribution of QF Content/raw data, while Content Sync has its own offline-sync requirements. Do not replace the current corpus with QF data merely because it is technically accessible.

## 3. Hadith source/translation chain

The fawazahmed0/hadith-api repository is Unlicensed/Unlicense at the repository level and documents a broad set of source/reference sites. Its own References.md includes Sunnah.com among the sources.

Sunnah.com currently states that it does not permit scraping or mass reproduction of entire books/collections on other websites; it does permit reproduction of individual hadith or selections for teaching/didactic/presentation purposes. Therefore an Unlicense on the aggregator repository does not close the rights question for every included English translation or edition.

Nūr al-Dhikr already treats this conservatively in CREDITS.md and must keep doing so until the exact edition/source permission chain is verified.

## 4. Safer reference for Quran text

Tanzil's current text license explicitly permits verbatim copying/distribution of its Quran text subject to attribution, link-back, inclusion of the copyright notice, and a prohibition on changing the text. This is a much clearer rights story for the Arabic Quran text than treating an arbitrary repository license as blanket permission.

This does NOT automatically solve translation, Tafsir, or word-by-word dataset licensing; those remain separate works/data.

## 5. Research-backed next actions

P1 — Pin Tafsir source versions deterministically, then review the exact data snapshot/edition rights before self-hosting.

P1 — Establish the exact QuranWBW dataset snapshot/provenance chain; if rights cannot be demonstrated, replace the word-by-word gloss/transliteration layer with a source whose redistribution terms are explicit.

P1 — Audit each Hadith edition's Arabic and English provenance separately; repository license is insufficient evidence for translation rights.

P2 — Add machine-readable provenance metadata: source URL, source edition, source revision/commit, snapshot date, hash, license/permission basis, attribution text, and verification state.

P2 — Add a release gate that refuses to ship content marked `rightsUnverified` unless the user explicitly changes the product policy.

## Primary sources reviewed

- spa5k/tafsir_api README and repository: https://github.com/spa5k/tafsir_api
- marwan/quranwbw README and repository: https://github.com/marwan/quranwbw
- fawazahmed0/hadith-api README/References: https://github.com/fawazahmed0/hadith-api
- Sunnah.com About / Reproduction policy: https://sunnah.com/about
- Quran Foundation Developer Terms: https://api-docs.quran.com/legal/developer-terms/
- Quran Foundation Content Sync: https://api-docs.quran.com/docs/tutorials/content-sync/getting-started/
- Tanzil Text License: https://tanzil.net/docs/Text_License
- QUL FAQ: https://qul.tarteel.ai/docs/faq
