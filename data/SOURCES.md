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
