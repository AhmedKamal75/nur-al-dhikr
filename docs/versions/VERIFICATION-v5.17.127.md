# Nūr al-Dhikr v5.17.127 — Verification

Date: 2026-10-07

## Source baseline

This release was implemented directly against the verified persistent **v5.17.126** full source ZIP:

- `NUR-AL-DHIKR-v5.17.126-FULL.zip`
- SHA-256: `6cce7cb4638658bc33bf3d0e2bb12b93163af9ce5d21ef630adc8a992c82606f`
- 5,513 source ZIP entries
- `package.json` / `APP_VERSION`: 5.17.126 before this wave

## v5.17.127 implementation

- Palette swatches now visibly use their per-palette `--sw-color` token; the Settings cascade no longer flattens them to the generic surface colour.
- Arabic reading-typeface choices are specimen cards rather than generic palette swatches. Each exposes Arabic preview, bilingual name, and explanatory copy. The Mushaf font control remains independent.
- Offline essentials is now a primary Offline decision surface. The automatic essentials switch is visible before the management disclosure; detailed group/cache/storage controls remain progressive disclosure.
- No religious corpus bytes were intentionally modified.

## Tests and static verification

- Focused regression: **26/26 passed**.
- Full deterministic Node regression: **2,813/2,813 passed**, across **275 test files**, 0 failed, 0 skipped, 0 cancelled.
- JavaScript syntax: all JS files + `sw.js` passed `node --check`.
- Data manifest: **2,350 files, full, valid, v5.17.127**.
- Shell snapshot: **278 files**, stamped v5.17.127.
- Agent Map: **244 JS + 27 data + 275 tests**.

## Browser verification status

**NOT VERIFIED in this workspace.**

The monolithic `npm test` command reached the environment execution ceiling around suite #781, so it was not treated as a green gate. The project’s deterministic batch strategy was used instead and completed all 2,813 tests.

The available `playwright` command rejected `test` with `unknown command 'test'`; therefore no Chromium screenshots, E2E results, or visual certification are claimed here.

The next browser pass must recertify at minimum:

- Settings palette colours at 360/393/1024/1440 in EN + AR, light + dark.
- Arabic typeface specimen layout and selection at narrow widths in EN + AR.
- Offline essentials switch visibility and pointer operation before the management disclosure, EN + AR.
- All carried-forward v5.17.126 hostile-review cases: Home order, invalid Qur'an route, picker wrapping, Azkar Details/count separation, navigation disclosures, Hadith Reference, Prayer methodology, Mushaf Find/bookmark, and offline boot/install behavior.

## Release integrity

This record is not a claim of Global persistence by itself. The release is complete only after the complete v5.17.127 source ZIP, its checksum, this verification record, and the updated ledger/checkpoint are all persisted to Global and the exact ZIP is re-read/verified there.
