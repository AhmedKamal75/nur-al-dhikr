# Credits & licensing notes

Top-level content provenance for the app's religious corpora. Detailed
per-dataset documentation lives in `data/SOURCES.md`; the bundled adhan
recording is credited in `assets/audio/adhan/CREDITS.md`.

## Ahadeeth texts

- Collections: the six canonical books — Sahih al-Bukhari, Sahih Muslim,
  Sunan Abu Dawud, Jami' at-Tirmidhi, Sunan an-Nasa'i, Sunan Ibn Majah —
  plus the Forty Hadith of an-Nawawi and Forty Hadith Qudsi — classical
  public-domain works (13th century and earlier). 34,239 hadith total.
- Machine-readable editions: [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api),
  dedicated to the public domain (CC0). The English translations are the
  sunnah.com published translations mirrored by that dataset.
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

## Fonts & audio

- Amiri Regular + Bold + Amiri Quran (Arabic-subset woff2), SIL Open Font
  License 1.1 (`assets/fonts/OFL.txt`).
- Bundled adhan recording: public-domain (CC0); provenance in
  `assets/audio/adhan/CREDITS.md`.

## Magnetic model

- World Magnetic Model 2025 (WMM2025), public domain, NOAA/NCEI — embedded
  coefficients verbatim; the Qibla compass corrects magnetic headings with
  it through 2030.
