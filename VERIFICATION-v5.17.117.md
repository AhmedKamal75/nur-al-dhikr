# Nūr al-Dhikr v5.17.117 — Verification

## Release scope

Audio/Reciters hierarchy cleanup: preserve reciter search/selection and the selected full-moshaf surface as the immediate listening task while progressively disclosing secondary playback, verse-pack, queue, and custom-reciter tooling.

## Implemented

- Reciter search/selection remains visible.
- Selected full-moshaf download/play surface remains visible.
- Verse voices, playback defaults, verse-pack management, saved queues, and custom-reciter authoring use one progressive-disclosure grammar.
- Existing handlers, playback/download behavior, bilingual strings, and data contracts are preserved.
- No bundled Qur'an, Hadith, Azkar, or other religious corpus bytes were intentionally modified.

## Verification performed

- Focused Audio/Reciters hierarchy set: **52/52 passed**.
- Full Node regression: **2,794/2,794 passed** across **270 test files**. Eight deterministic batches covered the suite; the 13-test Agent Map suite ran separately because it mutates generated files and concurrent tests can race on those bytes.
- Source syntax: **0 failures** across the complete JS/MJS tree.
- Agent Map: **244 JS + 27 data + 270 tests**, deterministic and green.
- Offline shell snapshot: **277 files**, valid, stamped v5.17.117.
- Data manifest: **2,350 files**, full, valid, stamped v5.17.117.
- No timeout values were increased.
- No assertions were weakened or skipped.
- ZIP integrity verified after packaging.

## Not verified here

- Real Chromium/device visual certification and touch interaction.
- Actual PWA install/update/offline browser lifecycle.
- Firefox/WebKit, large-text, forced-colors, reduced-transparency, safe-area, keyboard-only and real-device testing.
- npm lint / Prettier if required binaries remain unavailable in this supplied environment.

## Browser evidence still required

The authoritative local/device pass must cover the earlier queue plus Audio/Reciters disclosures at 360/393/1024/1440 in EN/AR and light/dark.

Do not claim browser/device certification without actual browser evidence.
