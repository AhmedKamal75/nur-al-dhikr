# HOSTILE REVIEW RUBRIC — 9.9 CEILING

Do not score by vibes alone. Record evidence.

| Dimension                            |   Weight |
| ------------------------------------ | -------: |
| information architecture             |      1.5 |
| visual hierarchy / typography        |      1.5 |
| interaction design / feature quality |      1.5 |
| responsive geometry                  |      1.0 |
| Arabic/English + RTL/LTR correctness |      1.0 |
| consistency / design system          |      1.0 |
| accessibility / touch / focus        |     0.75 |
| dark mode / theme coherence          |     0.75 |
| performance / offline behavior       |      0.5 |
| polish / absence of visible slop     |      0.5 |
| **Total**                            | **10.0** |

## Scoring rules

- **9.9** means only small, non-structural imperfections remain and browser evidence is strong.
- **9.5–9.89** means good but at least one noticeable product-level inconsistency remains.
- **9.0–9.49** means another implementation pass is required.
- **<9.0** means stop polishing isolated details and revisit the underlying design/system.

Never round 9.84 to 9.9.

## Mandatory downgrade triggers

Any of the following should normally prevent a 9.9:

- broken AR layout
- hidden/clipped primary action
- duplicated navigation
- obvious card spam
- a feature without a clear primary task
- major mobile desktop-collapse behavior
- dark mode that breaks hierarchy
- a visible dead/placeholder state presented as finished
- browser-only defect not captured by tests
- accessibility failure on primary interaction

## Reviewer questions

### Product

- Can a first-time user tell what this screen is for within 2 seconds?
- Does the main action look like the main action?
- Is anything competing for attention without earning it?

### Visual

- If every border disappeared, would hierarchy still work?
- If every accent color disappeared, would hierarchy still work?
- Does the page feel authored or assembled?

### Responsive

- Is mobile intentionally composed?
- Is Arabic equally intentional?
- What happens at the narrowest realistic content state?

### Feature

- Is the feature a coherent flow or a pile of controls?
- Are state transitions visually understandable?
- Is completion meaningful and visible?
