# AGENT MEMORY — Nūr al-Dhikr

Durable lessons. Read this before making a second or third pass on a subsystem.

## Product decisions

### Home is Home

Home is a daily landing surface, not a dump of every Adhkar entry.
Adhkar has its own dedicated product door and deeper navigation.

### Top-level navigation is explicit

Do not arbitrarily collapse first-class product sections behind a generic "More" menu merely to save space.
Use the existing route→door source of truth.

### Consistency is grammar, not sameness

The app needs one design language, but specialized experiences should retain their own semantics:

- Mushaf = manuscript/reading
- Focus Mode = concentrated reading/counting
- Player = playback
- Tajweed = learning/practice
- Kids = friendly/illustrative
- Ramadan = seasonal
- utilities = operational

### Glass has a job

Glass is for floating/transient chrome, not the default treatment for every surface.

### Color has meaning

Emerald is brand/primary identity.
Gold is a restrained semantic accent.
Other colors must carry a reason: status, category, or interaction state.

### Typography is structural

Use type hierarchy before decoration. Do not solve weak hierarchy by adding more borders, shadows or pills.

### Empty states should feel intentional

Honest absence is required. But "no data" should still have hierarchy, context, and a clear next action when appropriate.

## Engineering lessons

- derive UI from existing source-of-truth maps instead of maintaining parallel lists
- new strings require both `en` and `ar`
- settings require sanitizer registration
- new JS requires service-worker shell registration and snapshot
- data changes require provenance and manifest updates
- one regression should generalize to the whole class
- do not loosen assertions, add retries, or raise timeouts to manufacture green

## Religious-data rule

Never invent Qur'an, hadith, tafsir, timing, grading, reciter information, Tajweed rulings, or other authoritative religious content.
Verified source + provenance or honest absence.

## Interaction rule

When a feature has a primary task, make that task visually dominant.
Do not make all controls equally loud.

## RTL rule

Arabic is not a translated English layout.
Check:

- bidi isolation
- number/slash transport
- icon direction
- logical CSS properties
- content wrapping
- punctuation placement
- mixed Arabic/Latin labels
- drawer/sheet/order semantics

## Browser-evidence lessons from v5.17.78

- A clean static contrast test can still certify the wrong value if a later stylesheet overrides the token. Verify the computed cascade in the browser for every accessibility-sensitive token.
- Touch-target aprons must be checked geometrically on the rendered element; visual size alone is not evidence.
- Feature interiors need their own product review. Passing shell/layout gates does not prove that Player, Tajweed, Settings, Focus Mode, or utility tools feel authored.
- A seed/corpus omission must be reported separately from a code failure. Never convert missing-data failures into a false green.
- A browser score must come after the full matrix; source-only scores are provisional and should not be presented as final quality.
