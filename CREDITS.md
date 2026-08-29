# Credits & licensing notes

Top-level content provenance for the app's religious corpora. Detailed
per-dataset documentation lives in `data/SOURCES.md`; the bundled adhan
recording is credited in `assets/audio/adhan/CREDITS.md`.

## Ahadeeth texts (v3.9, extended v3.16)

- Collections: the six canonical books — Sahih al-Bukhari, Sahih Muslim,
  Sunan Abu Dawud, Jami' at-Tirmidhi, Sunan an-Nasa'i, Sunan Ibn Majah —
  plus the Forty Hadith of an-Nawawi and Forty Hadith Qudsi — classical
  public-domain works (13th century and earlier).
- Machine-readable editions: [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api),
  dedicated to the public domain (CC0). The English translations are the
  sunnah.com published translations mirrored by that dataset.
- Build pipeline: scripts/build-hadith.mjs (kept outside the shipped app),
  with alignment + integrity gates documented in data/SOURCES.md.

## Qur'an translations (v3.15)

- Urdu (Fateh Muhammad Jalandhry), French (Muhammad Hamidullah), Turkish
  (Diyanet İşleri) — Tanzil.net via the fawazahmed0/quran-api dataset;
- Indonesian (Kemenag) — quranenc.com / Indonesian Islamic Affairs
  Ministry, via the same dataset.
- Translator attribution is shown in-app in Settings → Content Display.
- Build + integrity gates: scripts/build-translations.mjs,
  tests/translations.test.js; details in data/SOURCES.md.
