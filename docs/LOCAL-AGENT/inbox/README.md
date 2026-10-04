# Inbox — unverified agent input, pending attribution

These documents arrived as files, not as commits. They are **inputs that have not
been reconciled against the primary evidence**, and they are kept here so the
record is complete rather than because they are settled.

## Do not quote these figures as measurements

`../BROWSER-EVIDENCE-v5.17.78.md` and `../INDEPENDENT-REVIEW-v5.17.80.md`
describe a "v5.17.78 browser run" whose numbers match **neither** run that is
actually on record:

| Figure                      | GLM 5.3 run (no bulk corpus)           | Full-corpus run (`evidence/LOCAL-AGENT-RESULTS/`) |
| --------------------------- | -------------------------------------- | ------------------------------------------------- |
| static gate                 | 2464/2519, 55 ENOENT                   | 2730/2730, 0 failures                             |
| Chromium                    | 132 passed / 39 failed, `PW_WORKERS=2` | 173 passed / 0 failed                             |
| screenshots                 | 213                                    | 194                                               |
| touch-target defect classes | four                                   | one                                               |
| Tajweed overflow @360px     | 25px                                   | 66px                                              |

Two agents independently produced a release called **v5.17.78** from the same
v5.17.77 handoff. Both found the same core defects; their gate figures are not
interchangeable and must not be blended. The `25px` and `66px` overflow figures
came from different machines and should be reported as a pair, never averaged.

**Open work:** reconcile these documents, attribute every figure to its run, then
fold the durable content into `docs/LOCAL-AGENT/AGENT-BRAIN.md`,
`docs/LOCAL-AGENT/AGENT-MEMORY.md` and `docs/LOCAL-AGENT/START-HERE.md`, and
delete what is superseded.

## The prompt files

`NUR-LOCAL-AGENT-START-HERE-v5.17.80.md` and `NUR-LOCAL-AGENT-PROMPT-v5.17.80.md`
are the owner's v5.17.80 onboarding files. Their maintained equivalents are
`docs/LOCAL-AGENT/START-HERE.md` and `LOCAL-AGENT-PROMPT.md` at the repository
root. `NUR-5178-NEXT-AGENT-PROMPT.md` was written to introduce the v5.17.78
evidence packet. Keep whichever the owner prefers; delete the duplicates when the
replacement is confirmed.
