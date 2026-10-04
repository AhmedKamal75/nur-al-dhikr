# Nūr al-Dhikr — remaining work at v5.17.83

## This pass

This pass responds to the full-corpus v5.17.81 findings and the owner's observed Focus/Settings/Home problems. It is deliberately a product-behaviour pass, not another generic polish layer.

### Focus

- Morning Adhkar data is ordered in the corpus as Ayat al-Kursi (1), then Surah Al-Ikhlas (3), then Surah Al-Falaq (3).
- Auto-advance is now the default product behaviour. Legacy persisted `false` values that lack the new explicit-choice marker are migrated to `true`; once the user toggles the setting, `autoAdvanceFocusExplicit` preserves that explicit choice.
- A completed Focus item ignores duplicate counter taps during the short handoff window, preventing a second increment from delaying or corrupting the transition.

### Settings

- The You index inside Settings now uses compact control tiles with icons instead of plain hyperlink-looking prose.
- Long reciter/translation/tafsir metadata is a flexible block and wraps rather than being clipped by the row.

## Verification

Targeted suite: 71/71 tests, 23 suites, 0 failures.

The full-corpus `npm run check` + Chromium gate must be rerun on the authoritative v5.17.81-consolidated tree because this workspace is an extracted full-corpus archive without `.git`/`node_modules`.

## Still open

- Fresh full-corpus browser evidence for v5.17.83.
- Firefox/WebKit, large-text/roomy, forced-colors, reduced-transparency, real-touch/safe-area/install-update surfaces.
- Geometry probe blind spot around ancestor `overflow-x: clip`.
- Owner decision on `APP-OVERHAUL-MASTER-ROADMAP-2026-09-24.md`.
- Feature-by-feature product review after the browser matrix: Player/Reciters, Azkar browser, Qur'an secondary rails, Qibla, Calendar, Tasbih, Zakat, Statistics, Garden.

## Evidence discipline

Do not score this release from source inspection alone. The last trustworthy browser score was 9.35 on v5.17.78 evidence; v5.17.83 needs its own full-corpus matrix.
