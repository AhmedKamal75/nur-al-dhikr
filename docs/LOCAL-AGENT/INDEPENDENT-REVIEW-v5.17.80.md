# Independent Review — Nūr al-Dhikr v5.17.80

## Position at this release

This release follows the first credible real-browser evidence cycle returned from
an owner's machine (v5.17.78). That browser run scored the product **9.35/10** and
found real defects that the earlier remote/source-only review could not see.

This document intentionally does **not** assign a new 9.9 score. The current
v5.17.80 source must be re-rated on a fresh full-data Chromium matrix after the
changes in v5.17.79–v5.17.80.

## Evidence carried forward from v5.17.78

The local browser run captured 213 screenshots across the required bilingual,
light/dark, phone/desktop matrix plus secondary feature surfaces. It found and
fixed:

- light-theme WCAG AA contrast failures
- four 44px touch-target defect classes
- a 25px Tajweed horizontal overflow at 360px
- release-contract/version inconsistencies in the prior handoff
- formatter/agent-map/runtime drift in the prior handoff

It also recorded one onboarding reciter-persistence flake under parallel load
that passed 4/4 in isolation. That is an open timing-proof question, not proof
of a product regression.

## v5.17.79 changes now incorporated

- Azkar/Qur'an/Prayer/Practise section switches use an editorial navigation rail
  instead of filled segmented pills.
- Settings leads with title/search and a compact grouped section index.
- Audio-manager reciter lists use a readable measure on wide screens.

## v5.17.80 change

Data-absence states for a Qur'an surah and Mushaf page now preserve an accessible
screen-reader page heading even when the normal content heading cannot render.

## Feature-level visual verdict from the returned screenshots

### Strong

**Focus Mode** is currently the strongest specialist feature. The reading text is
dominant, controls are quiet, progress is legible, and the Arabic reading surface
has the concentrated feel expected from the product. Preserve this grammar.

**Tajweed course** is structurally good after the overflow fix. The primary action
and lesson progression are understandable. The remaining work is refinement,
not wholesale reconstruction.

**Mushaf** remains specialized and should not be flattened into the generic
surface system.

### Needs another browser-assisted pass

**Settings** is much cleaner than the historical state, but still reads more like
a dense configuration index than a deeply considered control centre on small
screens. Re-evaluate after the new grouped index lands in the current release.

**Player / Reciters** is functional and calmer, but the full playback console
still needs judgment at real playback states: hierarchy between track identity,
transport, seek, secondary controls, and the persistent player bar.

**Azkar browser** is substantially improved, but the category grid still carries
more card-framework DNA than the reference product's direct reading/library flow.
Do not copy azkar.me; test whether the remaining chrome can recede further.

**Qur'an secondary controls** still need review after the section rail change.
The mode rail should read as navigation, not as a value selector.

**Utilities** (Qibla, Calendar, Tasbih, Zakat, Statistics, Garden) are usable but
need to be reviewed as products with one dominant task rather than as collections
of panels.

## Hostile review rule for the next run

A 9.9 score is allowed only when:

- the full-data Chromium suite is run
- the screenshot matrix is complete
- Arabic and English are both visually inspected
- light and dark are both visually inspected
- no mandatory axe/accessibility failures remain
- no unexplained touch-target failures remain
- feature interiors have one clear primary task
- no obvious card/pill/button/gradient slop remains
- browser-only defects are documented, not hand-waved

## Next action

Run the current v5.17.80 tree on the owner's machine, repeat the browser matrix,
and return the complete evidence packet. Any score below 9.9 triggers another
implementation pass rather than a narrative justification.
