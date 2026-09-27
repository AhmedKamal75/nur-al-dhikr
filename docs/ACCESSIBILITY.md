# ACCESSIBILITY.md — the standing rules, and what is still owed

Nūr al-Dhikr is used at 3am by someone who cannot sleep, and by someone who is
seventy and has never used a smartphone. Accessibility here is not a compliance
exercise; it is the difference between the app working and not working for the
people it exists for.

## The release gate

**Can a 70-year-old Arabic-only reader start a recitation, find Fajr, count
tasbih, and get back — alone?** If not, the feature is not done, regardless of
what the test suite says.

## Rules we hold

| Rule                                                                                 | Where it is enforced                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Touch targets ≥ 44px, expanded beyond their visual box where the visual box is small | `tests/e2e/touch-targets.spec.js` (pointer-level `elementFromPoint`) |
| Visible focus on every interactive element                                           | axe specs + `:focus-visible` styling                                 |
| One announcement per event — a counter tap speaks once, not three times              | the global `#counter-announcer`, one owner                           |
| Icons that carry meaning have an accessible name                                     | axe specs                                                            |
| The OS language is honored on first launch                                           | `tests/first-run-language.test.js`                                   |
| Reduced motion is honoured everywhere animation exists                               | `prefers-reduced-motion` blocks, pinned                              |
| Arabic chrome never falls back to Latin text                                         | locale separation tests                                              |
| Landmarks and a skip link on every route                                             | `tests/e2e/shell-chrome.spec.js`, routes-extended                    |

## Deliberate tensions

**Auto-fade and adab.** The player and reader chrome dim to a low opacity when
idle. Some argue a fully visible control is better for a screen reader and for
low vision; others argue fading is a courtesy that keeps attention on the text.
Current synthesis: **keep the auto-fade, raise the floor for anything
interactive or focused.** A decorative fade may go very low; a control the
person is about to press may not.

**Small visuals, large hit areas.** Compact chips are 40px visually and ~52px
effective, using a pseudo-element apron. This is defended, not accidental.

## What is still owed

These are real gaps, tracked in `docs/OPEN-ISSUES.md`:

1. **Elder Mode is undiscoverable.** It exists and works; a first-time reader has
   no way to know it exists. The onboarding wizard should offer it.
2. **In-app zoom cannot reach WCAG 200%.** The font-scale slider tops out below
   the requirement; browser zoom is currently the only full path. This is a real
   accessibility failure for low-vision readers.
3. **Screen-reader pass is unverified.** Headless axe catches structure and
   names, not the experience of listening. Needs NVDA and VoiceOver.
4. **Coverage is four routes deep.** Twenty-nine routes have no behavioural a11y
   test.

## What cannot be verified here

Everything in `docs/DEVICE-TEST.md`: real haptics, adhan audibility, wake lock
re-arm, pinch versus swipe arbitration, sunlight readability on OLED, and the
audible gap between ayahs. Headless Chromium has no opinion about any of them,
and pretending otherwise would be the exact failure this project forbids.

## Rules for new work

- Test the keyboard path when you add a control. If it cannot be reached by
  keyboard, it does not exist for a screen-reader user.
- Never remove a visible focus ring without an equivalent.
- Never let a new animation bypass the reduced-motion block.
- Anything that only works with a pointer is a bug, not a limitation.
