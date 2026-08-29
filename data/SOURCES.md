# Data sources & attribution

This file documents where everything under `data/quran-words/`,
`data/quran-roots.json`, `data/tafsir/`, and `data/tafsir-editions.json`
comes from. Everything below is used for a free, offline, non-commercial
personal study app with full attribution, consistent with how each source
is publicly distributed and used across the broader open-source Islamic
software community.

## Per-word grammar (root, i'rab, sarf, part of speech)

Derived from the **Quranic Arabic Corpus** morphological annotation
(Kais Dukes et al., corpus.quran.com), via the cleaned Arabic-language
release at [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology).
Original corpus data is free to use, copy, and redistribute for any
non-commercial purpose provided the source is acknowledged — acknowledged
here, and in the in-app Settings → About screen.

## English word-by-word gloss & transliteration

From the word-by-word dataset maintained by
[quranwbw.com](https://quranwbw.com) / [qazasaz/quranwbw](https://github.com/qazasaz/quranwbw),
used here purely as structured reference data (word text, transliteration,
short gloss) rather than any of that project's own presentation or code.

## Root occurrence index (`data/quran-roots.json`)

Computed locally from the morphology data above — not a third-party
dataset — by grouping every word by its Arabic root.

## Tafsir & grammar texts (`data/tafsir/`)

Sourced from the [spa5k/tafsir_api](https://github.com/spa5k/tafsir_api)
open dataset, which mirrors the tafsir texts used by quran.com and other
public Qur'an study tools. Each edition's own author/scholar is credited
in `data/tafsir-editions.json` (`authorAr`/`authorEn`) and shown in the
app's tafsir panel. Bundled editions:

| Edition | Author |
|---|---|
| al-Muyassar | Panel of scholars, King Fahd Complex |
| al-Mukhtasar | Tafsir Center for Quranic Studies |
| al-Jalalayn | Jalal ad-Din al-Mahalli & Jalal ad-Din as-Suyuti |
| al-Jadwal fi I'rab al-Qur'an | Mahmoud Safi |
| al-I'rab al-Muyassar | Panel of scholars |
| Tahlil Kalimat al-Qur'an | King Fahd Complex, Tafsir Encyclopedia |
| al-Muyassar fi Gharib al-Qur'an | Panel of scholars, King Fahd Complex |

On-demand editions (fetched once, on explicit request, from the same
spa5k/tafsir_api source, then cached offline — see `sw.js`): Ibn Kathir,
al-Qurtubi, at-Tabari, al-Baghawi, al-Waseet, Tanwir al-Miqbas (attributed
to Ibn 'Abbas), as-Sa'di, and ad-Darwish's I'rab al-Qur'an.

## Not a substitute for scholarly guidance

As with every other content library in this app (see the main README),
this data is offered for personal study and convenience. It is not a
replacement for consulting qualified scholars, especially for anything
you intend to rely on religiously.

## Ahadeeth library (data/hadith/)

The Ahadeeth texts (Arabic + English) are the public-domain collection
texts of **the six canonical books — Sahih al-Bukhari, Sahih Muslim,
Sunan Abu Dawud, Jami' at-Tirmidhi, Sunan an-Nasa'i and Sunan Ibn Majah —
plus the Forty Hadith of Imam an-Nawawi and Forty Hadith Qudsi** as
published by sunnah.com, obtained via the CC0-dedicated dataset repository
[fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api)
(edition dumps, cached in scripts/cache/hadith/ outside the app dir and
transformed by scripts/build-hadith.mjs). The classical collections
themselves are 13th-century-and-earlier works in the public domain.

- v3.16: the four Sunan collections (Abu Dawud 5,272 · Tirmidhi 3,926 ·
  an-Nasa'i 5,679 · Ibn Majah 4,340) were rebuilt from the same source
  through the same gates, restoring content built on the parallel
  v3.15.0 line — the library totals 34,239 hadith, locked by a permanent
  test gate.
- The build enforces 1:1 Arabic↔English alignment by hadith number and
  drops sunnah.com's non-hadith book-introduction placeholders (203 rows
  in Muslim, 9 in Bukhari).
- Chapter (book) headings are shipped in English as published by the
  source dataset; a bilingual chapter-name overlay is a known follow-up.
- Integrity gates: no markup-like payloads, unique numbers, every row
  reachable through its chapter, counts consistent with the index. The
  event-handler check is anchored to tag context — ordinary prose with an
  equals sign (Ibn Majah #1805, "even one = then three sheep") is text,
  not markup.

## Adhkar rebuild (data/adhkar.json, v5)

- **Texts** retained verbatim from the vetted Hisn-al-Muslim core records;
  **Qur'an excerpts are extracted byte-identically from the app's own
  Qur'an corpus** (data/quran/) by scripts/build-adhkar.mjs — Ayat
  al-Kursi, the three surahs, al-Kafirun, al-Mulk (complete), and the
  last two verses of al-Baqarah.
- **Ordering** follows the canonical sequence of *Hisn al-Muslim*
  (Fortress of the Muslim) by Sa'id ibn Ali ibn Wahf al-Qahtani for the
  morning, evening, post-prayer, sleep and wake-up categories; tasbih
  formulas and daily supplications are ordered topically after the same
  book's chapter flow.
- **References** cite the collection (Bukhari/Muslim/Abu Dawud/Tirmidhi/
  Ibn Majah/Ahmad) with hadith numbers only where they are certain;
  otherwise the collection + narrator is named without an invented number.
- The per-category canonical specs (scripts/adhkar-spec/) are the
  human-reviewed source of truth; the build regenerates data/adhkar.json
  from them and hard-fails on truncation, duplication or schema drift.

## Qur'an translations (data/translations/, v3.15)

Four additional complete translation editions, shipped as slim per-surah
overlay files (`data/translations/{edition}/{surah}.json`) that the app
merges onto its own corpus at load time — the Arabic text is always the
app's Uthmani corpus, never the upstream's:

- **Urdu** — Fateh Muhammad Jalandhry (`ur-jalandhry`)
- **French** — Muhammad Hamidullah (`fr-hamidullah`)
- **Turkish** — Diyanet İşleri Başkanlığı (`tr-diyanet`)
- **Indonesian** — Indonesian Islamic Affairs Ministry / Kemenag
  (`id-kemenag`)

- **Source**: the Tanzil.net translation corpora, redistributed by
  [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api)
  (branch 1). Tanzil texts are CC BY 3.0 / CC BY-NC where marked; the
  upstream dataset is CC0 as published. The Kemenag edition originates
  from quranenc.com (Kemenag RI). Tanzil's own licence terms apply to the
  translation texts; attribution to the translators is rendered in the
  Settings picker itself.
- **Build pipeline**: scripts/build-translations.mjs (kept outside the
  shipped app). Fetches all 114 chapter files per edition, aligns 1:1 with
  the app corpus (per-surah ayah counts must match data/quran exactly),
  and hard-fails on: verse-count drift (6,236 per edition), non-sequential
  verse numbers, empty texts, trailing truncation, HTML payloads, and
  bismillah bleed into 2:1 (muqatta'at sanity strings per edition).
  Output is deterministic (fixed key order, compact JSON, LF).
- **Integrity gates** re-run as a standing test (tests/translations.test.js)
  so shipped data can never drift from the build's own gates.
- The default English edition (Sahih International) remains inline in
  data/quran/ exactly as before; no overlay files exist for it.
