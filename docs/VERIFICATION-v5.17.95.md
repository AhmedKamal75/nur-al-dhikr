# v5.17.95 Verification

## Release status

**Release:** v5.17.95  
**Corpus data changed:** No  
**Browser certification:** NOT VERIFIED in this workspace

## Verified locally

- `npm test`: **2746 / 2746 passed**, 0 failed, 0 skipped.
- Focused Azkar/Home regression suites: passed.
- Accessibility/static contracts: passed.
- EN/AR i18n parity contracts: passed.
- APP_SHELL/offline contracts: passed.
- Data manifest: valid, 2350 files, full mode.
- Qur'an corpus integrity: 114 surahs / 6,236 ayahs and Mushaf page coverage passed.
- Agent map generation and deterministic regeneration: passed.
- `node --check`: **564 JS/MJS files passed**.

## Browser verification limitation

The workspace contains Chromium, but the execution environment blocks loopback/private HTTP URLs and local `file://` application URLs through an organization policy. Playwright is also not installed, and the npm cache does not contain the required dependency tarballs, so dependencies could not be installed offline.

Therefore these items are **NOT VERIFIED** here:

- actual pointer/touch behavior of the Azkar Details control in Chromium
- actual visual rendering at 360x800 / 393x852 / 1024x768 / 1440x900
- service-worker install/update behavior in a real browser
- screenshot certification of menu-expanded, Tafsir-open, and Player-More-open states

The code and automated tests for those behaviors are present, but no browser claim is made without executable browser evidence.

## v5.17.95 changes

- Focused Azkar reading surface: Arabic text + live counter remain primary; supplementary metadata is inside native `Details`.
- Details interaction is separated from counter-tap delegation; Details must not increment the count.
- Existing Azkar timing/count behavior was left unchanged.
- Removed the decorative Shahada banner from Home.
- Removed the intrusive Home onboarding strip.
- Fixed mobile Settings heading layout.
- Tightened the English mobile header at narrow widths.
- Fixed invalid Qur'an route state so an out-of-range id does not remain in a loading skeleton.
- Fixed mobile audio metadata wrapping/clipping.
- Corrected the generated agent-map route parser so member `labelKey` values are represented in the spine.
- Removed obsolete orphan i18n keys left by retired UI surfaces.
- Kept optional Home panels opt-in rather than restoring dashboard clutter merely to satisfy stale tests.
