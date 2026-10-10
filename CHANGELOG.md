# v5.17.139 — Qur’an/Mushaf rasm-aware Tajweed (candidate; not certified)

- First implementation wave for OPEN-ISSUES row 99: alternate-rasm Madd Badal, contextual final tanween/Madd Iwaḍ, explicit Iqlab signal and dagger-alif glyph anchoring.
- Adds targeted regressions, a full 6,236-ayah cross-rasm Node gate, and `scripts/audit-tajweed-rasm.mjs` for mismatch counts and span locations.
- Not release-certified: native CI, full audit review, Chromium EN/AR × light/dark × phone/desktop glyph checks and scholarly review remain required. Qur’an data is unchanged.

# v5.17.138 — the Tajweed integration branch, merged and made honest

- Resolved the interrupted merge of `integration/tajweed-clean-mainline-2026-10-09` into main (8 conflicted files). Content-level disagreements kept both sides' changes; prettier-only disagreements took the house style; the three docs conflicts were reconciled by union with the superseded checkpoints kept as audit trail.
- Alternate Tajweed citations are visible again: the runtime mirror had flattened each registry `also` record to a bare work id, silently dropping them from the Mushaf legend. Locators are localized (`ch. 5` → `الفصل 5`).
- A user's Tajweed colour can no longer be shadowed by a dark-paper default — picks moved to an isolated `--tw-user-*` layer that no paper scope declares.
- Lesson examples are validated against canonical per-surah ayah counts and fail closed when metadata is missing. No Qur'an text or count was edited.
- The practice pool is regenerated from the merged classifier. The `>= 5 rows per rule` gate became "complete corpus coverage", which is strictly stronger and honest for `madd_4_6` (reachable only at 19:1 and 42:2); the corpus sweep now re-derives every rule's count across all 114 surahs.
- `izhar` is a real rule in both the canonical registry and the runtime mirror.
- Two stale test fixtures corrected rather than weakened (Mutashabihat cache identity, Fatiha backfill row).
- Ledger reconciled to 94 rows. No row was closed by this release.
- Religious corpus bytes unchanged.

## v5.17.137 — navigation chrome: actionable section rows and a reachable rail collapse

- Merged `fix/navigation-desktop-collapse-and-menu-actions`: each nav section is now an actionable link plus a chevron disclosure control, so a section label is never a dead button, and the desktop rail collapse has a real control. New EN/AR labels for expand/collapse and the section disclosure.
- Restored the prayer-method provenance qualifier (merged from `fix/prayer-provenance-hero`), so the hero no longer states an uncertified calculation source as fact.
- Disclosure fix from v5.17.136 still holds: `open` on `<details>` is user-owned, with `data-open-controlled` opt-in for state-driven sections.
- Religious corpus bytes unchanged.

## v5.17.136 — adopt v5.17.135, then fix what it shipped with

- Adopted the v5.17.135 source (published SHA-256 verified) and repaired two regressions it carried.
- Fixed every `<details>` on `#/audio` collapsing on any in-panel interaction — the sleep ladder needed 5 re-opens per 6-tap walk at 135 and none at 126. `open` is now a user-owned toggle; state-driven disclosures opt in via `data-open-controlled`.
- Fixed the Home panel switch being a dead control: un-ticking it changed `hiddenHome` and no panel appeared, because only the reorder buttons ever wrote the panel order. The switch now reflects and controls real presence on Home.
- Re-measured the bilingual sleep label: one line, unclipped, EN and AR at 360/393/1024. The first harness pass reported wrapping because it counted padding as lines.
- Re-pointed six browser specs to the real user path (Setup/Tasbih/player-bar disclosures, the Azkar door, the word-study step, `#/settings/onboarding`), and made `touch-targets` derive its census from the DOM instead of requiring a sub-44px control to exist.
- `smoke.spec.js` left red on purpose: it guards the `Source (unverified):` qualifier that the compact prayer-method line dropped while `data/prayer-methods.json` still records MWL as `verified: false`. Restoring it is a worship-surface copy decision for the owner.
- Religious corpus bytes unchanged.

# v5.17.135 — Audio sleep control deslopification

- Unified Audio defaults sleep control with the live player’s direct cycle interaction.
- Removed the duplicate selector grammar; state still follows the shared `nextSleepRung` ladder.
- Marked OPEN-ISSUES row 20 resolved.

## v5.17.135 — Offline Essentials hierarchy

- Promoted the Offline Essentials switch to the first decision surface, before metering/cache detail, because real Chromium evidence showed the previous control could sit outside the viewport.
- Added a regression contract for the structural ordering and primary visual treatment.
- No religious corpus bytes intentionally modified.

## v5.17.133 — browser-evidence deslopification follow-through

- Mobile seven-door navigation now preserves the restrained active indicator instead of allowing the later base cascade to reintroduce a filled active pill.
- Home “Next for you” collapses to a tighter single-row continuation state when only one resume destination exists, removing dead vertical space without changing the information architecture.
- Added regression coverage for the CSS cascade contract and compact single-resume state.
- No religious corpus bytes intentionally modified.

## v5.17.132 — Hostile import-boundary hardening

- Reject oversized local backup/family-plan JSON files before FileReader parsing (8 MiB safety ceiling).
- Reject prototype-pollution reserved keys in imported family-plan Tasbih target maps.
- Add hostile regression coverage for both boundaries.
- Replace the blanket in-app “CC0 hadith-api dataset” shorthand with neutral provenance wording until exact translation rights are verified.
- No religious corpus bytes intentionally modified.

## v5.17.131 — Offline storage honesty

- Added a user-controlled persistent-storage request in **Offline → Manage offline storage** where `navigator.storage.persist()` is available.
- Reports granted / declined / unsupported outcomes honestly; no claim of unlimited storage is made.
- Added bilingual EN/AR copy warning that browser-managed storage can be reclaimed and backups remain necessary.
- Documented mobile-platform background notification limitations and storage caveats in README / issue ledger.
- No religious corpus bytes intentionally modified.

# v5.17.130 — Accessible last-resort error screen

- Replaced hardcoded inline error-screen colors/typography with theme-aware semantic classes.
- Added explicit language/direction to the unrecoverable error surface so Arabic remains correctly RTL even when normal rendering has failed.
- Added forced-colors-safe borders and focus treatment for the emergency controls.
- Preserved the existing Reload and Reset recovery actions and did not change religious corpus data.

# v5.17.129 — Action-affordance audit continuation

- Added Retry to safe transient failures in full-surah playback, lazy modal chunk loading, custom Adhan import, offline download while offline, and audio download/verse-pack failures.
- Validation errors, missing-server classifications, generic delegated-handler failures, and storage/quota conditions remain actionless where retry has no deterministic recovery value.
- No religious corpus bytes intentionally modified.

# v5.17.128 — Action-affordance audit

- Added direct Retry actions to recoverable Qur’an lazy-load failures (metadata and surah loads).
- Added direct Retry actions to recoverable Mushaf navigation, Find-result, jump, and surah-entry page-load failures.
- Ordinary status/success toasts remain actionless.
- No religious corpus bytes intentionally modified.

# v5.17.108 — Zakat progressive disclosure

- Keep the annual Zakat calculator (nisab, wealth inputs, live result) as the dominant working surface.
- Move Zakat al-Fitr into a secondary disclosure with a compact bilingual summary.
- Move saved Zakat assessments/history into a secondary disclosure only when history exists; preserve hawl/reminder/delete actions unchanged.
- Added EN/AR regression coverage for hierarchy and disclosure presence.
- No religious corpus data changed.

## v5.17.107 — Ramadan secondary disclosure

- Reduced Ramadan card sprawl by making the night-worship planner and Suhoor/Iftar alerts progressive disclosures.
- Kept summary status visible when collapsed.
- Converted Explore from a generic panel into compact navigation.
- Added EN/AR regression coverage.

# Changelog

The full, human-written release history lives in **[`docs/RELEASES.md`](docs/RELEASES.md)** —
newest first, one section per version, in plain language.

This file exists so tooling and humans landing on the repository root can find
the history in one click. It is intentionally a pointer, not a duplicate: two
changelogs drift, and a drifted changelog is worse than none.

- Current version: see `package.json` (`version`).
- That version is mirrored in `js/core/config.js` (`APP_VERSION`), `sw.js`
  (`VERSION`), `manifest.json` (`version` + `version_name`), and the newest
  `## vX` heading in `docs/RELEASES.md`. All five must agree —
  `tests/contracts.test.js` enforces it.
- Still open / unresolved work: [`docs/OPEN-ISSUES.md`](docs/OPEN-ISSUES.md).
- What the product is and who it serves: [`docs/PROJECT-PICTURE.md`](docs/PROJECT-PICTURE.md).
