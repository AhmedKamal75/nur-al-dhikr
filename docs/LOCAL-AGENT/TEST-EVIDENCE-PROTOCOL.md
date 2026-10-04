# TEST + EVIDENCE PROTOCOL

The local machine exists to provide what the remote environment could not: real browser evidence.

## Gate A — static/Node

```bash
npm run check
```

Record the exact exit status and final summary.

## Gate B — Chromium

```bash
npm run e2e -- --project=chromium
```

Do not shorten the suite unless the shortened command is explicitly labelled a targeted run.

## Gate C — manual visual matrix

At minimum:

| Mode     | Viewports                            |
| -------- | ------------------------------------ |
| EN light | 360×800, 393×852, 1024×768, 1440×900 |
| EN dark  | 360×800, 393×852, 1024×768, 1440×900 |
| AR light | 360×800, 393×852, 1024×768, 1440×900 |
| AR dark  | 360×800, 393×852, 1024×768, 1440×900 |

## Gate D — feature interactions

At minimum verify:

- nav to/from each top-level door
- search open/close
- focus mode enter/exit/count/next
- player play/pause/seek/close
- settings open/change/restore
- language switch
- theme switch
- Mushaf page/jump/open secondary tools
- Tajweed course selection/progress
- Tajweed practice start/answer/next
- prayer/Qibla interactions
- offline/install/update status where supported

## Gate E — hostile geometry

Check:

- no horizontal scroll unless explicitly intended
- no clipped labels
- no fixed-height translated text containers
- no overflow from Arabic numbers/slashes
- no orphaned Latin fragments
- touch targets remain usable
- sticky controls do not cover content
- focus rings remain visible

## Screenshot naming

Use:

```text
<feature>__<state>__<lang>__<theme>__<width>x<height>.png
```

Example:

```text
focus-mode__reading__ar__dark__393x852.png
```

## Before/after discipline

For any visual fix, capture:

1. before
2. after
3. same state
4. same viewport
5. same language/theme

Do not compare different states and call it an improvement.

## Evidence hierarchy

A screenshot without a reproducible state is weak evidence.
A test without the screenshot for a visual defect is incomplete evidence.
A claim without either is not evidence.
