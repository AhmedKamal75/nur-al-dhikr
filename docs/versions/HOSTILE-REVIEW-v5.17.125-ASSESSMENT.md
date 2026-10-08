# Nūr al-Dhikr — Hostile Review Assessment

## v5.17.125 browser evidence → v5.17.126 remediation plan

### Evidence basis

Authoritative local-machine Chromium review of the full 2,350-file corpus:

- 416 screenshots across 13 route families × EN/AR × light/dark × 4 viewports.
- Focused interaction rerun: 60 candidate states; 48 changed and were usable as evidence; 12 were explicitly marked unverified; 8 selectors never matched.
- Browser run: 159 passed, 3 skipped, 17 failed.
- Node regression before this browser pass: 2,800/2,800 passed.
- Lint: 3 errors, 8 warnings.
- Browser geometry: 0 horizontal-overflow cells, 0 offscreen elements without a scrollable ancestor, 0 page errors, 0 capture errors.

No source modification was made during the evidence pass.

### Hostile conclusion

The v5.17.125 code was not safe to call browser-certified. The browser evidence found a real **Home composition regression** and several source defects that source-only gates did not expose. The most important problem was not the card styling itself; it was **geometry/order drift caused by old desktop rules overriding the intended editorial composition**.

The current project rules already documented the intended hierarchy: identity/orientation first, then Today/prayer context, then Start Here, then the remaining supporting surfaces. The v5.17.125 screenshot instead rendered Today first and the identity line last, while desktop constrained the Home story into a narrow rail and left a large dead canvas.

### Findings classified

#### P1 — fix in v5.17.126

1. **Home visual order/geometry was wrong.**
   - Symptom: identity line rendered after Today/Start/Next on the captured page; desktop composition occupied only a narrow portion of the available content rail.
   - Root cause: stale desktop geometry and insufficiently explicit Home child ordering.
   - Remediation: Home is now explicitly ordered `hero → core(Today, Start) → secondary(Next/supporting)` in the late cascade. The stale Home grid declaration was removed from `desktop.css`; a wide-screen guard keeps Home as one flex column. Home inner columns have an authored max measure rather than a half-dashboard track.
   - Additional refinement: Today progress is rendered inside the Today section, not beneath “Next for you”.

2. **Invalid Qur'an deep link could enter an endless skeleton state.**
   - Symptom: `#/quran?id=99999` had no accessible heading in the browser run.
   - Remediation: invalid/non-existent numeric IDs now short-circuit to a stable not-found state before corpus hydration.

3. **Long audio/mushaf-picker metadata could be clipped by a single-line name contract.**
   - Remediation: reciter picker/onboarding names wrap; the Mushaf page-play picker name now wraps as well.

4. **Three lint errors were confirmed by the local gate.**
   - Missing `QUIZ_LIBRARY_ID` import: fixed.
   - `HTMLDetailsElement` lint-global reference: fixed by tag-name check.
   - Duplicate `i18n` import in `mushafPageFind.js`: fixed.

#### P2 — not product defects yet; browser retest required

These v5.17.125 failures were traced to stale/incorrect test selectors or changed product contracts and must not be “fixed” blindly:

- Azkar route selector used the old `#/library` path instead of `#/category/morning`.
- Focus route starts at the category picker; a counter proof requires entering the category first.
- Player “More” selector targeted an old control; the real secondary disclosure uses its own summary.
- Mushaf Study Mode test expected the old contextual rail while current product opens the Word Study modal directly; the test has been rewritten accordingly.
- Home daily-hadith and verse-theme tests still assumed formerly inline Home surfaces; those are now explicit opt-in/Settings flows.
- Offline switch test needs viewport-aware interaction rather than assuming the control is already visible.
- Touch-target probe needs to distinguish genuinely small controls from controls whose effective hit area is provided by the accessibility layer.
- Palette Focus test needed to scope the palette trigger to the topbar instance.
- Onboarding browser coverage was updated to reflect the current intentional contract: clean Home, deferred Settings replay.

These items remain **unverified until Chromium is rerun on the corrected source**.

#### NOT VERIFIED — deliberately open

- Hadith Details and Statistics progressive disclosure interaction evidence did not produce valid post-click states in the first script.
- Firefox/WebKit, forced colors, large text, reduced transparency, safe-area, keyboard-only, and real hardware remain open.
- Actual PWA install/update/offline lifecycle remains open.

### v5.17.126 review objective

The next local browser run must first prove the corrected Home and the four P1 source defects, then rerun the changed-feature surfaces from v5.17.93 onward. No visual score is assigned until that evidence exists.
