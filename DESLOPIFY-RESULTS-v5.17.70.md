# Nūr al-Dhikr — Deslopification results v5.17.70

## This pass

This is the fourth implementation pass in the current deslopification sequence. The goal was to remove the remaining “component demo” feel after the Home/Azkar/Settings pass and the cross-section convergence pass.

### Implemented

- Primary and secondary buttons are flatter: unnecessary gradient + floating shadow treatment removed.
- Non-Mushaf content surfaces share a restrained 16px silhouette and quieter elevation.
- Panel headers were tightened so the title reads as content hierarchy instead of another framed object.
- Supporting copy is constrained to a readable editorial measure (`72ch`) on non-Mushaf surfaces.
- The seven-door mobile dock gets a larger label floor while retaining the direct seven-section architecture.
- The You secondary navigation remains a compact navigation matrix rather than a pill row.
- Tasbih supporting controls and the custom phrase panel are visually subordinate to the counting stage.
- Small screens reduce ornamental padding before reducing text size.
- Mushaf styling remains excluded from these generic surface changes.

## Verification performed

- `tests/deslopify-regressions.test.js`: **8/8 passed**.
- `tests/backlog-consistency.test.js`: passed.
- `tests/cssDesign.test.js`: passed (**30/30 subtests** in the combined invocation).
- CSS brace-balance sanity check: **244 opens / 244 closes**.
- `node scripts/data-manifest.mjs --check`: **valid (26 files, full, v5.17.70)**.
- `node scripts/snapshot-shell.mjs`: **276 files stamped at v5.17.70**.
- Version markers agree across `package.json`, `js/core/config.js`, `sw.js`, `manifest.json`, `docs/RELEASES.md`, and `docs/BACKLOG.md`.

## Verification not claimed

Full repository `npm run check` and Chromium screenshot certification are not claimed in this execution environment. The supplied archive does not contain its original installed dependency tree, and browser-process execution has repeatedly hit the environment ceiling. No screenshot finding in this release is presented as browser-certified unless explicitly captured by a real browser run.

## Product direction preserved

- Home remains Home / Today, not the Azkar browser.
- Azkar remains a top-level destination with its own library and subsections.
- Qur’an remains a top-level destination with its own deeper surfaces (reader/Mushaf/study/Tajweed/etc.).
- Mushaf remains a specialized reading surface rather than being forced into the generic card system.
- Existing settings and palette functionality are retained; this pass reduces noise rather than removing user-facing choices.
