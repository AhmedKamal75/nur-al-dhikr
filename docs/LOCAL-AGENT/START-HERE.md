# START HERE — Local Agent Handoff

You have a project at **v5.17.83** that has already gone through several deslopification passes and one real Chromium evidence cycle.
Do not restart the design from scratch.

## Read first

- `LOCAL-AGENT-PROMPT.md`
- `AGENTS.md`
- `MEMORY.md`
- `docs/PROJECT-PICTURE.md`
- `docs/AGENT-MAP.md`
- `docs/LOCAL-AGENT/AGENT-BRAIN.md`
- `docs/LOCAL-AGENT/AGENT-MEMORY.md`
- `docs/LOCAL-AGENT/TEST-EVIDENCE-PROTOCOL.md`
- `docs/LOCAL-AGENT/HOSTILE-REVIEW-RUBRIC.md`

## First objective

Run the real browser suite and create a complete evidence packet, starting from the v5.17.78 findings recorded in the local-agent brain.

## Second objective

Fix the highest-severity, highest-repeatability feature defects you can prove.

## Third objective

Return the evidence packet to Ahmed for independent review.

## Important

Do not report a score merely because the source looks clean.
The next score must be supported by real browser evidence.

## Evidence rule

Do not inherit the old 9.9 source-only score. The last browser-evidenced score was 9.35 on v5.17.78; the current tree must earn its own score.
