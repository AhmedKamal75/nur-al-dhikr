# Nūr al-Dhikr — Deslopification Results v5.17.71

## Pass 5 — shared browse surfaces + Home focal hierarchy

This pass continues the visual remediation from v5.17.70 without changing the seven-section information architecture or removing existing settings/features.

### Implemented

1. **Shared browse-surface cleanup**
   - Category icons across non-Mushaf surfaces now use the product's primary accent rather than reintroducing a rainbow of unrelated tile colors.
   - Semantic category/icon identity remains in the glyph and label instead of decorative card chroma.
   - Mood, collection, surah and hadith tiles now converge on the same paper/ink silhouette.
   - Hover treatment is deliberately restrained: small translation, no inflated elevation.

2. **Mood tile cleanup**
   - Removed the legacy radial-gradient background from shared mood tiles.
   - Browse-by-need now relies on spacing, hierarchy and the primary accent.

3. **Home focal hierarchy**
   - Strengthened the Home welcome hero's type scale and editorial measure.
   - Added a restrained primary-accent wash while keeping the surface legible and calm.
   - Kept Home as a Today landing; Azkar remains its own section.

4. **Cross-section heading rhythm**
   - Major landing surfaces use the same typographic cadence without overriding specialized Mushaf styling.

### Regression coverage

`tests/deslopify-regressions.test.js`

- **10/10 passing**
- Shared browse surfaces cannot silently reintroduce rainbow/gradient tile chrome.
- Home hero remains a focal welcome surface.
- Existing palette, mobile navigation, empty-state, Azkar one-action, cross-section, control-flatness, silhouette and bilingual geometry contracts remain covered.

### Broader test evidence

The repository-wide `npm test` run was started successfully.

- **774 completed test groups/subtests before the run hit the supplied archive limitation.**
- One corpus-dependent test fails because the archive intentionally omits the bulk Qur'an corpus (`data/quran/1.json`).
- The run then exceeded the execution ceiling before its final summary could complete.
- No failure attributable to the Pass 5 visual changes was observed before that limitation.

Targeted deterministic gate:

- `tests/deslopify-regressions.test.js` — 10/10
- `tests/nav-reachability.test.js` — passing
- `tests/cssDesign.test.js` — passing
- Combined selected gate: **91/91 passing**

Data manifest:

- **26 files, v5.17.71, valid**

Shell snapshot:

- **276 files stamped at v5.17.71**

### Browser verification status

A direct Chromium screenshot attempt was made against the actual local HTTP-served application. Chromium reached its environment/process ceiling and did not produce a screenshot. Therefore this release **does not claim browser screenshot certification**.

That is intentional: no visual defect is being labelled browser-verified without actual rendered evidence.

### Changed files from v5.17.70

- `assets/css/deslopify.css`
- `tests/deslopify-regressions.test.js`
- `package.json`
- `js/core/config.js`
- `sw.js`
- `manifest.json`
- `data/manifest.json`
- `tests/app-shell-hashes.json`
- `docs/RELEASES.md`
- `docs/BACKLOG.md`

### What remains

The remaining high-value verification item is a real-device/browser screenshot sweep across:

- EN + AR
- light + dark
- 360 / 393 / 1024 / 1440
- Home, Azkar, Qur'an landing, Mushaf, Ahadeeth, Prayer, Practise/Tasbih, You/Settings

The source-level contracts are now designed to make those visual checks meaningful rather than cosmetic.
