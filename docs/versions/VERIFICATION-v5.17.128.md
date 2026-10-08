# Nūr al-Dhikr v5.17.128 — Verification Record

Date: 2026-10-07

## Source baseline

Implemented directly from the globally verified v5.17.127 source ZIP:

- `NUR-AL-DHIKR-v5.17.127-FULL.zip`
- Previous release SHA-256: `5b98cb68e592cbf8f6afad7201183b3eed92868f4eef03dd563d1111a7fb3d2c34`
- Previous source ZIP integrity: `unzip -t` PASS
- Previous `package.json` / `APP_VERSION`: 5.17.127

## v5.17.128 implementation

### Action-affordance audit — recoverable load failures

- Qur’an metadata lazy-load failure now exposes **Retry** and re-runs the same Qur’an load path.
- Qur’an surah lazy-load failure now exposes **Retry** and re-runs the current surah load path.
- Mushaf next/previous page-load failure now exposes **Retry** for the exact requested page.
- Mushaf Find-result page-load failure now exposes **Retry** for the exact result page.
- Mushaf jump page-load failure now exposes **Retry** for the exact destination page.
- Mushaf surah-entry page-load failure now exposes **Retry** for the exact first page requested.
- Ordinary status/success toasts remain actionless.
- No Qur’an, Hadith, Azkar, or other religious corpus bytes were intentionally modified.

## Focused verification

- New v5.17.128 action-affordance regression: **3/3 passed**.
- JavaScript syntax: **244 JS files + `sw.js` passed `node --check`**.

## Full deterministic regression

The monolithic `npm test` command exceeded the execution ceiling in this workspace and was not treated as a green gate. The repository's deterministic batched strategy was then run across all test files:

- **2,816/2,816 tests passed**.
- **276 test files** were included.
- 0 failed, 0 cancelled, 0 skipped.
- The batch set was completed in 16 deterministic file groups.

## Release metadata

- Shell snapshot: **278 files**, v5.17.128.
- Data manifest: **2,350 files**, full, valid, v5.17.128.
- `package.json`, `package-lock.json`, `js/core/config.js`, `sw.js`, and `manifest.json` are aligned at v5.17.128.

## Browser verification status

**NOT VERIFIED in this workspace.** No Chromium screenshots, Playwright E2E certification, or real-device visual certification is claimed here.

The next browser pass must cover the carried-forward hostile surfaces, plus the v5.17.128 Retry states at minimum:

- Qur’an first-load failure → Retry → successful reload path.
- Mushaf next/previous failure → Retry.
- Mushaf Find result failure → Retry.
- Mushaf Jump failure → Retry.
- Mushaf surah-entry failure → Retry.
- EN + AR and light + dark for the affected surfaces.

The previously required hostile-review rerun from v5.17.126 remains mandatory for Home order, invalid Qur’an deep links, settings typography/palettes, Azkar Details/count separation, Hadith Reference, Prayer methodology, Offline essentials, Mushaf Find/bookmark, and progressive-disclosure interactions.

## Release integrity

This record becomes final only after the complete v5.17.128 source ZIP, checksum, updated ledger, and current checkpoint are persisted to Global and the exact saved ZIP is re-read and hash-verified.
