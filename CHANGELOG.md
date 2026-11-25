# v5.17.173 - Share independent audio ownership tickets

- File playback, file resume attempts, verse source lookup, verse echo waits and recitation mirror attempts now use independent opaque tickets. Element identity and source intent remain separate checks.
- An explicit verse pause, speaker displacement or sleep expiry cannot be undone by a late offline lookup. Resuming an unresolved ayah starts a fresh owned lookup and publishes only after dispatch.
- Late file-resume completions cannot overwrite newer pause/play intent. Test resets never reuse ownership. No scripture, audible policy, pool or retry-order changes.

# v5.17.172 - Exercise same-document route readiness in smoke tests

- Core-route smoke uses hash navigation and waits for the matching active route before checking rendered content, avoiding WebKit fetch aborts caused by full page navigation. All console-error and uncaught-exception assertions remain unchanged. No production behavior changes.

# v5.17.171 - Share lazy-resource request ownership

- Eight singleton lazy tiers share request deduplication, generation/identity guards and configured cooldowns while retaining tier-specific validation, failure returns, logging and retry UI.
- Search bulk owners share abort lifecycle. Exiting and returning before old work settles cannot publish stale chunks or clear a replacement controller. Quran supports Search and look-alike study; tafsir keeps Search-only scheduling and bundled-edition rules.
- Deterministic tests cover synchronous reentry, stale success/failure ordering, empty data, cooldowns and bulk exit/return. English/Arabic browser tests cover meta and roots retry recovery and stale study-modal completion.

# v5.17.170 - Keep player settings reachable in short landscape

- Limit the file-player More panel height in short viewports and allow vertical scrolling, keeping the first controls on-screen and all later controls reachable. Portrait and desktop settings remain unchanged.
- English and Arabic regression checks cover 568x320, 667x375, 844x390 and 1280x500, including scrolling each control into the visible panel.

# v5.17.169 - Keep file-player settings inside narrow screens

- Anchor the More settings panel to the full player header at narrow widths in both writing directions. Remove the inherited 42vw strip cap so every control fits within the panel. No playback behavior changed.
- Browser regression covers 320, 360, 390, 700, 701 and 1280px in English and Arabic, including every control and volume slider.

# v5.17.168 - Share one sleep-timer controller

- File and verse playback share one sleep-timer controller, deadline, owner and interval. Countdown labels update each second; expiry pauses once and keeps position.
- Speaker ownership loss clears the previous timer and restores its base volume, including paused or docked owners. Same-owner track/ayah changes and the arbiter keep-list preserve it. File absolute fading and verse base-volume multiplication remain unchanged.

# v5.17.167 - Confirm nonempty counter resets

- Tasbih page/menu and adhkar Focus ask before resetting a nonempty counter, naming the phrase and showing count, target and completed cycles. Cancel is the default; truly empty counters do nothing. Only the existing counter reset is described, not history deletion.
- Review blocks counting and target changes, cancels pending Focus auto-advance, rechecks the exact live item before confirmation and rejects stale or duplicate confirms. Escaped long phrases, RTL count order, keyboard/modal cancellation and focus return are covered.

# v5.17.166 - Adjust Arabic reading size from Focus

- Adhkar Focus has a Reading size sheet using the existing shared Arabic-size preference, with 5% steps from 85% to 160%, current size, labeled controls and disabled bounds. The shared effect is explained in English and Arabic; Mushaf sizing is untouched.
- The final Focus style now honors the shared Arabic-size setting on phone and desktop. The sheet updates without replacing the reading view, preserves count/position/scroll and returns focus to its opener. Tests cover keyboard, modal containment, background swipe and route teardown.

# v5.17.165 - Save selected need-based duas to a collection

- Browse by need offers explicit temporary selection, with no items preselected, select-all, a live count and native labeled checkboxes separate from card controls.
- Create a named collection or choose an existing destination with a missing-item count preview. Cancel changes nothing; commit rechecks read visibility, preserves displayed order and appends only missing IDs. Selection clears on navigation or reload and never records mood history.

# v5.17.164 - Continue calendar events and Home recents

- Upcoming calendar events show exact counts for the remaining events in the current Gregorian year, with Show more in batches of five. Calendar month context and the estimate disclosure stay in place.
- The optional Home recents panel now counts the full eligible deduplicated history before taking its initial three cards, with Show more in batches of three. Missing and completed/dismissed entries no longer consume the initial slots. Browsing does not alter stored history.

# v5.17.163 - Continue root and study matches

- Root look-alike pairs page through the complete computed loaded-text pool, 12 pairs per page, with exact counts and explicit previous/next controls. Root and tab stay in the URL; hostile pages clamp to the available pool.
- Study-mode hadith previews show five of the exact loaded-index matches and link to all matches with the derived text query intact. The text-match and loaded-book disclosures remain unchanged.

# v5.17.162 - Browse hidden hadiths and older gifts

- Hidden-hadith recovery has an independent number/text filter, exact matching count and Show more in batches of 40. The reader's query, page and chapter stay separate; recovery state resets when changing books.
- Gift history has note/amount/date filtering, exact matching and total counts, and older entries in batches of 20. Browsing and deletion preserve the unsaved gift form; save and deletion preserve history filters. No bulk actions or currency totals added.

# v5.17.161 - Search every matching loaded hadith

- Cross-book hadith search counts every match in the loaded index, without the former 200-result cutoff. Ten cards render per page; the loaded-book scope remains explicit and missing-book downloads still require consent.
- Rebuilding or resetting the index invalidates cached queries so newly loaded books update totals. Pager targets follow the rendered clamped page. EN/AR regressions reach result 237, retain queries and verify no missing-book fetch.

# v5.17.160 - Expand every palette result group

- Capped palette groups show exact matching totals and See all. Expansion stays in the palette, preserves the query and other groups, and renders in batches of 60 without selecting, playing or navigating.
- Quran, tafsir, library and reciter providers supply complete matches before display windows apply. EN/AR tests cover isolated expansion, zero matches, keyboard/mouse and phone/desktop. No religious data changed.

# v5.17.159 - Browse the complete reciter catalog

- Audio catalog reports exact shown/matching totals and offers Show next 60 or Show all. Show all adds bounded batches, retaining filter, selected voice and scroll without starting playback.
- A selected voice outside the shown matches stays visible in a labeled, deduplicated row. Bilingual tests cover expansion, zero/boundary totals, Arabic normalization and selection/playback preservation. No reciter data changed.

# v5.17.158 - Full-width navigation submenus

- Expanded navigation sections put their child links below the section header instead of squeezing the parent label beside them. The parent link and disclosure remain separate controls; collapsed desktop rail and mobile drawer behavior are preserved.
- EN/AR regression checks cover every expandable section, parent text ranges, submenu geometry, keyboard disclosure and sidebar collapse. No religious content changed.

# v5.17.157 - Collection counts match the readable queue

- Home collection chips, collection tiles and detail totals now count the same read-eligible, deduplicated entries as Focus. Missing, hidden and deleted content is excluded without removing stored collection membership.
- Collection search shows matched-of-total, without changing the queue. Tests cover each hide/delete level, duplicates, missing entries, restoration and EN/AR phone/desktop rendering.

# v5.17.156 - Begin a collection again without losing progress

- Collection detail offers a quieter Start from beginning action alongside Continue only when the saved reading position differs from the first readable entry. It follows saved order, skips unavailable entries and ignores collection search.
- Existing Focus routing updates only the reading position. Counters, lifetime cycles, today's progress, history and collection order are preserved. Live-state click resolution, bilingual phone layout and keyboard activation have regression coverage. No religious data changed.

# v5.17.155 - Readable reciter identities

- Audio catalog names and metadata wrap instead of hiding behind ellipsis. Translation and whole-surah badges sit below the name instead of interrupting it. Selection and custom-delete controls remain separate. Other pickers are unchanged.
- EN/AR phone and desktop checks measure actual text fragments for all visible catalog rows and exercise custom selection and deletion. No catalog data or playback behavior changed.

# v5.17.154 - Continuous physical Mushaf page swipes

- Dragging the paper right reveals the next page from the left; dragging left reveals the previous page from the right, independent of UI language. Next/previous arrow and keyboard actions keep their book-navigation meaning. The swipe hint explains the distinction in both languages.
- Current and adjacent paper surfaces track the finger together and settle from the exact release position, without restarting an entrance animation. Cancel, reversal, boundaries, vertical scroll, pinch, route exit, reduced motion and disabled animation preserve navigation safety.
- Real Chromium touch input checks multiple in-flight frames, both page bounds, explicit page numbers and release continuity in EN/AR. Quran/Mushaf data is unchanged.

# v5.17.153 - Readable phone Mushaf location header

- Gives the phone Mushaf location title its own wrapping row above the six controls, keeping the full surah and Juz position visible without shrinking controls. Desktop layout and reading behavior are unchanged.
- Bilingual phone and desktop browser tests measure text fragments, control bounds, tap sizes and sequence order. No Quran or Mushaf content changed.

# v5.17.152 - Phone prayer times stay inside their cells

- Home prayer ribbon clocks wrap at the AM/PM space when a phone cell is too narrow. The complete time stays readable without shrinking text or overlapping the next prayer.
- Bilingual phone and desktop browser coverage measures actual text fragments, not only element boxes. No religious data changed.

# v5.17.151 - Keep the screen awake in Focus

- Adds an explicit session-only, default-off screen-awake toggle to adhkar Focus and collection reading sessions. Active status appears only after a browser grant; unsupported, denied, hidden and system-released states stay honest.
- Releases the Focus lock on exit, session change, page hide or visibility loss. A visible return re-requests only for an opted-in ongoing session. Generation guards release late grants after navigation or toggling off.
- Existing Mushaf fullscreen and Ambient wake-lock owners are unchanged. Nothing is persisted. Unit and EN/AR phone/desktop browser coverage checks denial, visibility return, collection continuity and late grants.

# v5.17.150 - Corpus-located LPMQ class treatments

- Adds 70 corpus-located annotations for two idgham groups under LPMQ only, supported by Pedoman Chapter II rule-level citations. All per-site visual checks remain Unknown; 11:42 is excluded. This is not a complete printed palette.
- Both reader surfaces, word inspection, course extension, answer keys, distractors, review, rule statistics and teaching rows use the selected convention. DAM remains observational only with no new rule colors.
- Stable rule-ID color overrides coexist with existing family choices and survive convention changes. Baseline detection and Quran/Mushaf text bytes are unchanged.
- Credits pin source attribution, PDF hash and exact locators. Corpus-unit, convention-isolation and bilingual browser checks guard the overlay.

# v5.17.149 - Tajweed convention preference and registry foundation

- Adds a canonical rules registry and parity-tested runtime mirror, named predicates, stable IDs and per-convention citation records. No classifier migration or Quran/Mushaf text changes.
- Saves a teaching-convention preference: Dar Al-Ma'arifah by default for new and existing users, with LPMQ one tap away. Existing per-rule toggles and family-color overrides survive switching.
- EN/AR settings and legend disclosures name both references, the recitation profile, source disagreement and the need for a teacher. The selector explicitly states that rendering is unchanged while verification is pending. This is a foundation, not completed dual-convention coloring.
- New rule families remain pending and shipping-disabled. Unverified sites are not annotated, taught or added to practice.

# v5.17.148 - read a collection as a Focus session

- Collection detail now offers Start or Continue, reading the saved collection order across categories. Hidden, removed and missing entries are skipped.
- A per-collection item bookmark survives exit, reload and reordering independently of ordinary category Focus. Arrows, keyboard, swipes and auto-advance use the same collection-aware queue; exit returns to the collection.
- EN and AR labels, recovery for deleted/empty collections, and unit/browser coverage for queue integrity and resume. Religious corpus bytes unchanged.

# v5.17.147 — saved-only scope in global search

Creativity-track item C01 (2026-11-23): a Saved chip beside All in global search. Saved mode searches only the local subset — favorites plus collection items — through the same index, ranking, normalization and root-expansion as an All pass (new savedIds option in domain/search.js); Quran/tafsir/roots/hadith sections stay out of saved results. The scope persists in settings.searchScope (sanitized enum), so it survives navigation. Empty saved library gets its own state; a saved search with no match names the Saved scope. EN+AR.

# v5.17.146 — declarative noon/tanween prototype and cross-rasm evidence (candidate; not certified)

- Adds a data-driven next-letter table for the mutually exclusive noon-sakinah/tanween family, with contract tests for table integrity, cited rule IDs, and parity with the live classifier.
- Combines the newest audit instrumentation and targeted cross-rasm regression candidates on a clean branch from main.
- Carries the verified one-word mushaf correction at 15:53 (عَلِيمٍ), approved explicitly by the owner after three-source verification.
- No other Qur’an text was edited or normalized. This is a prototype, not proof that all Tajweed rules are correct; full source-backed and browser review remains mandatory.

# v5.17.145 — prayer names never break mid-word (ribbon, times list, resume card)

- Phone-QA fix (2026-11-23, follow-up to the badge crush): "Sunrise", "Dhuhr" and "Maghrib" still wrapped mid-word in the Home prayer ribbon at 390px. Root cause: the phone cell-tightening media rule sat ABOVE the base `.home-prayer-ribbon__cell` rule, so source order binned it and phones kept desktop padding. The rule now lands after the base rule, with a 3px track gap, 1px side padding and a 12px panel inset — measured: all six names render on one line with the Now/Next badges on their own line.
- "Maghrib" also broke ("Maghri h") in the Prayer view's times list: three 16px gaps left the 700-weight name 54px, a pixel short. Phone rows now use an 8px gap.
- "Continue where you left off": a long resume value ("Morning Adhkar · Surah Al-Ikhlas (×3)") claimed the whole row — the section name collapsed to 0px and rendered one letter per line while the value overflowed the card. The name now keeps a 10ch floor and the value wraps instead of overflowing.
- Religious corpus bytes unchanged.

# v5.17.144 — set your city: Alexandria + seven more, and a Change-city button

- Phone-QA fix (2026-11-23, item 2): the reporter could not set his own city at all — Alexandria (الإسكندرية) was missing from the one-tap directory. Added it plus Sanaa, Tripoli, Mogadishu, Kano, Lucknow, Dushanbe and Bishkek — 80 cities, each with EN+AR names and its IANA zone. Alexandria is pinned in the directory contract test.
- With a location saved there was no way back to the city picker: the prayer hero's place name now carries a Change-city button (EN+AR) opening the location editor (city select + coordinates), pinned in the hero render test.
- The hero place name used to freeze in the language the city was picked in (AR mode kept showing Latin "Alexandria"): preset-chosen locations now store the preset id (`settings.prayer.cityId`, sanitized) and render the name in the active language; GPS/manual entries clear the link and keep their name. The location editor preselects by id. Pinned in the hero render test.
- smoke.spec.js's directory count was a hard-coded 72 — parametrized to CITY_PRESETS/CITY_REGIONS lengths so a directory growth never again arms a trap.
- Religious corpus bytes unchanged.

# v5.17.143 — prayer times follow the saved location's clock

- Phone-QA fix (2026-11-23, item 3): `settings.prayer.timezone` was written by every location path (GPS, city preset, manual form) but never read — every view computed the UTC offset from the device, so a city saved abroad rendered times on the phone's clock and the "timezone setting" felt dead.
- New `js/domain/timezone.js`: `prayerClock()` resolves the stored IANA zone's offset and wall time via Intl (DST-correct per date), with an honest device-clock fallback when no zone resolves.
- Prayer view, Home ribbon, adhkar window ranking, live countdown tickers, Ambient, Ramadan suhoor/iftar, and the month timetable/ICS export all compute and compare on the location clock. The Prayer view names the zone beside the place name, and when the location's clock differs from the device's by 45+ minutes an honest note says which clock is on screen (EN+AR).
- Prayer alert scheduling still follows the device clock (unchanged, internally consistent); zone-correct alert arming is tracked as follow-up.
- Religious corpus bytes unchanged.

# v5.17.142 — Azkar cards: long adhkar stay scannable on phones

- Scrolling card lists cap the effective Arabic scale at 1.25 below 560px (--fs-arabic-card-list): at max scale a long dhikr no longer becomes a ~1450px card. The mushaf reader, focus and the tasbih stage keep the full range; desktop is unchanged.
- The elder-mode x1.3 Arabic boost composes with the cap (body.is-elder override in the same 560px media query): an elder phone at scale 1.0 renders 36.4px, pinned by a spec assertion — the boost is never silently bypassed.
- New e2e pin covers the phone cap, the full desktop range, and the Quran reader's full range on a phone.

# v5.17.141 — prayer ribbon: badges no longer crush prayer names on phones

- Home "Today's prayers": on a phone, the cells carrying a live Now/Next badge crushed their prayer names to one letter per line (the inflexible badge pill starved the name in the flex topline). The topline now wraps, so the badge drops to its own line and the name renders like its unbadged neighbours.
- New EN+AR phone-viewport e2e spec pins the layout: it fails on the old CSS and passes on the new.

# v5.17.139 — cross-rasm Tajweed alignment, and what it did not fix

- Lands the crew's fix for ledger row 99, from the single-commit mainline candidate (the other two branches attempting it fail their own alignment test).
- Madd Badal is recognised in both the corpus spelling (`hamza + madda-above`) and the Mushaf spelling (`hamza-above + fatha`), so it no longer falls through to `madd_2` on 267 ayahs.
- Madd Iwaḍ accepts both tanween-alif encodings, removing a spurious Iwaḍ from 716 Mushaf ayahs.
- U+06E2 is read as an Iqlab signal in its own right rather than only beside a separate tanween mark.
- Glyph-offset divergence between the two rasms is now 0. The same ayah is coloured identically in both readers on 6,126 of 6,236 ayahs, up from 5,015.
- Practice pool regenerated from the corrected classifier; the corpus sweep's collision inventory re-pinned at seven pairs (the four new ones are the fix working, not new defects).
- A CI job runs the cross-rasm diagnostic and publishes its JSON as an artifact.
- 110 ayahs still differ, all one family of tanween/Iqlab attachment. Ledger row 99 stays OPEN. Religious corpus bytes unchanged.

## v5.17.138 — the Tajweed integration branch, merged and made honest

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
