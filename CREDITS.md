# Credits & licensing notes

Top-level content provenance for the app's religious corpora. Detailed
per-dataset documentation lives in `data/SOURCES.md`; the bundled adhan
recording is credited in `assets/audio/adhan/CREDITS.md`.

## Ahadeeth texts

- Collections: the six canonical books — Sahih al-Bukhari, Sahih Muslim,
  Sunan Abu Dawud, Jami' at-Tirmidhi, Sunan an-Nasa'i, Sunan Ibn Majah —
  plus the Forty Hadith of an-Nawawi and Forty Hadith Qudsi — classical
  public-domain works (13th century and earlier). 34,239 hadith total.
- Machine-readable editions: [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api).
  The repository publishes a public-domain/Unlicense dedication, but that does
  not by itself settle the redistribution terms of every upstream translation
  or source. In particular, sunnah.com states that it does not permit scraping
  or mass reproduction of entire books/collections on other websites. This
  project therefore treats the exact translation/source rights chain as a
  provenance item to be reviewed before broad redistribution.
- Alignment + integrity gates are documented in `data/SOURCES.md` and
  enforced permanently by the test suite.

## Qur'an text and translations

- Arabic (Uthmani simple) + English (Sahih International): Tanzil.net
  corpora; the classic reader's Arabic text is always this app's own
  verified copy.
- Urdu (Fateh Muhammad Jalandhry), French (Muhammad Hamidullah), Turkish
  (Diyanet İşleri) — Tanzil.net via the fawazahmed0/quran-api dataset;
  Indonesian (Kemenag) — quranenc.com / Indonesian Islamic Affairs
  Ministry, via the same dataset.
- Translator attribution is shown in-app in Settings → Content Display.
- Alignment gates: `tests/translations.test.js` (6,236 verses per edition,
  1:1 per-surah counts with the corpus, no truncation or bleed).

## Per-word grammar, glosses, roots, and tafsir

- Morphology (root, part of speech, i'rab, sarf): Quranic Arabic Corpus
  (corpus.quran.com, Kais Dukes et al.) — non-commercial use with
  acknowledgement, recorded here and in the in-app About screen.
- English word-by-word glosses and transliteration: quranwbw.com dataset.
  The exact redistributed dataset snapshot and its licence/permission chain
  are not currently established in this repository; do not infer data rights
  from a separate QuranWBW code-repository licence.
- Root indices: computed locally from the bundled morphology (not a
  third-party dataset).
- Tafsir and grammar texts (al-Muyassar, al-Mukhtasar, al-Jalalayn,
  al-Jadwal fi I'rab, al-I'rab al-Muyassar, Tahlil Kalimat, Gharib
  al-Qur'an bundled; Ibn Kathir, al-Qurtubi, at-Tabari, al-Baghawi,
  al-Waseet, Tanwir al-Miqbas, as-Sa'di, ad-Darwish on-demand) via
  spa5k/tafsir_api, each authored by the scholar named in its entry.

## Adhkar & Duas

- Drawn from _Hisn al-Muslim_ and the authentic Sunnah (Bukhari, Muslim,
  Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Ahmad), a published "100 Duas
  from the Qur'an and Sunnah" collection (Al-Munajjid), and other named
  Islamic literature sources cited per-item where available.
- Translations, explanatory material and review metadata were prepared with
  AI assistance and automated integrity checks. Items whose attribution is
  not yet confirmed are labelled in-app and must be verified against a
  citable source before religious reliance.

## Fonts & audio

- Amiri Regular + Bold + Amiri Quran (Arabic-subset woff2), SIL Open Font
  License 1.1 (`assets/fonts/OFL.txt`).
- Scheherazade New Regular + Bold (TTF), SIL Open Font License 1.1
  (`assets/fonts/ScheherazadeNew-OFL.txt`) — the closest freely-licensed
  Naskh to the Medina print hand, offered as a Mushaf typeface choice.
- Bundled adhan recording: public-domain (CC0); provenance in
  `assets/audio/adhan/CREDITS.md`.

## Magnetic model

- World Magnetic Model 2025 (WMM2025), public domain, NOAA/NCEI — embedded
  coefficients verbatim; the Qibla compass corrects magnetic headings with
  it through 2030.

## Tajweed corpus-located LPMQ class treatments (v5.17.150)

The two idgham groups use rule-level facts from LPMQ, _Pedoman Tajwid Sistem Warna_ (2011), Bab II A.a, printed page 6 (PDF page 15). Source: https://tashih.lpmqkemenag.id/uploads/1/2019-08/buku_pedoman_tajwid_sistem_warna.pdf. PDF SHA-256: `ee7e2533b215e5a697d8d43d5bd287e4cebc1d520c4bfd72f90a249a11d18e4c`.

Location leads adapted from cpfair/quran-tajweed contributors (https://github.com/cpfair/quran-tajweed), CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes: mapped to the bundled corpora using letter-skeleton coordinates and checked raw token indexes. No Quran text was imported or edited. The table contains 71 leads; 70 nonconflicted leads are enabled for LPMQ only. All per-site LPMQ visual verification remains Unknown. 11:42 is excluded, not silently assigned a different rule. The cited source has an internal Chapter I/II disagreement, disclosed in the app. Its teacher clause is Bab I D.2, printed page 2 (PDF page 11).

Dar Al-Ma'arifah is referenced observationally only: https://archive.org/details/Tajweed-Quran-Arabic-114638. No publisher palette or layout is copied. Pending observations remain pending. This is a partial teaching-scope extension, not a complete implementation of either printed color scheme.
