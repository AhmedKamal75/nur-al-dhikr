# Nūr al-Dhikr v5.17.83 — implementation results

## Source baseline

This workspace is the full-corpus v5.17.80 archive used after the v5.17.81 consolidation report. The current tree is a full 2,350-file corpus overlay and is **not** a byte-for-byte copy of the v5.17.81 Git object because that `.git` history was not present in this workspace.

The authoritative local v5.17.81 report says both repository gates are green on the full corpus: `npm run check` 2733/2733 and Chromium E2E 173 passed, 3 skipped, 0 failed. Those are attributed to the owner's local machine and are not re-run here.

## This pass

### Focus Mode

- Morning Adhkar's first items are corpus-ordered as Ayat al-Kursi (1), then Surah Al-Ikhlas (3), then Surah Al-Falaq (3).
- Auto-advance remains the product default.
- Legacy persisted snapshots with the previous shipped `false` default are migrated to `true` unless an explicit-choice marker exists.
- Once the setting is changed through Settings, `autoAdvanceFocusExplicit` preserves the user's preference.
- A completed Focus item ignores duplicate taps during the short handoff window so the same dhikr cannot be counted twice while the next item is entering.

### Settings

- The You index is now a compact control surface with icons, borders, target-sized rows, and an active state rather than inline hyperlink prose.
- Long reciter/translation/tafsir metadata now flexes and wraps instead of being clipped.

### Home

- The existing v5.17.82 structural order is retained and pinned: hero → practical context → quick actions → supporting panels → Shahada/footer.
- The Home browser remains separate from the Azkar library; there is no Azkar grid dumped into Home.

### Design-system consistency

- Palette CSS duplicates remain removed so the runtime palette source stays single-sourced in `PALETTES`/theme injection.
- Local-agent brain/memory/prompt documentation was advanced to v5.17.83.

## Verification performed here

- Targeted Node suite: **72 tests, 23 suites, 0 failures**.
- `node --check`: **10/10 changed JavaScript files passed**.
- Data manifest: **2350 files, full, valid, v5.17.83**.
- Release markers: package.json, package-lock.json, config.js, sw.js, manifest.json/version_name all agree on v5.17.83.
- Full Node suite was attempted. It reached **750 completed subtests** without an assertion failure before the execution ceiling stopped the run, so the full suite is **incomplete, not green**.
- Browser/Chromium was not re-certified in this remote workspace. The v5.17.81 full-corpus browser evidence remains the owner's machine evidence.

## Still required on the authoritative local repo

1. Overlay this pass onto the v5.17.81-consolidated repository.
2. Run `npm run check`.
3. Run `npm run e2e -- --project=chromium` with the full 2,350-file corpus.
4. Capture the Home, Settings, Focus Mode, Azkar browser, Player, Tajweed and utility feature matrix in EN/AR × light/dark × 360/393/1024/1440.
5. Re-run the hostile rubric. Do not reuse the old 9.35 or 9.9 score for v5.17.83.

## Important evidence discipline

The v5.17.81 report explicitly says the previous 9.35/10 score came from a seed-bundle browser run and must not be reused as the current release score. It also records that both independent browser runs converged on contrast, manifest, formatter, horizontal-overflow and hit-area defect classes, while their numerical measurements differed. Those figures must remain attributed to their respective runs.
