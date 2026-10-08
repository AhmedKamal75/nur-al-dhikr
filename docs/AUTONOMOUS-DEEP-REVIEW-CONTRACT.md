# Autonomous Deep-Review Working Contract

**Established:** 2026-10-08  
**Scope:** Nūr al-Dhikr whole-project improvement workflow

## Purpose

The project is not developed as a sequence of tiny requests where the assistant waits for the user to identify every next defect.

The user explicitly authorized a deeper working mode: go deep enough, remain open-minded, look beyond the immediately requested feature, and keep making meaningful progress even though no feature has a final state of perfection.

When the user says **continue**, the default meaning is to continue investigating and improving the active workstream autonomously, within repository and evidence constraints.

## Operating principles

### 1. Do not be artificially narrow

If working on Tajweed, inspect related domain logic, data, tests, course mappings, rendering, navigation, accessibility, bilingual parity, responsive behavior, offline behavior, performance, documentation, stale assumptions, error handling, and integration with Mushaf/Qur'an/Practice.

Do not stop merely because the first requested subtask has been patched.

### 2. Actively challenge previous assumptions

Older analysis is evidence, not authority.

Ask:
- Was the original diagnosis correct?
- Does implementation match documentation?
- Does the test exercise real behavior or a proxy?
- Is a resolved issue genuinely resolved?
- Is a feature present but poorly integrated?
- Did a fix create new coupling or regression?
- Are comments, routes, data models, and tests describing different systems?

When a previous conclusion is wrong, correct it explicitly.

### 3. Review old code, not only new code

Inspect existing code for dead branches, stale identifiers, duplicate logic, obsolete shims, contradictory comments, unused configuration, oversized modules with real ownership problems, duplicated domain rules, cache invalidation mistakes, state ownership bugs, weak tests, unreachable functionality, and data loaded differently from documentation.

Refactor only when there is a concrete correctness, maintainability, ownership, performance, or testability reason.

### 4. Prefer evidence over confidence

Separate:
1. source inspection;
2. deterministic tests;
3. corpus/data sweeps;
4. CI;
5. browser execution;
6. device evidence;
7. accessibility evidence;
8. scholarly/content validation.

A lower evidence layer must never be presented as proof of a higher one.

### 5. Find obvious defects before inventing improvements

Priority:

**correctness → integrity → usability → architecture → enrichment → polish**

Do not add elaborate features while basic behavior is broken.

### 6. Finish one section deeply before scattering effort

When explicitly told to work autonomously on one section, hunt the obvious defect/improvement queue in that section and its integrations.

“Finished” means:
- obvious defects were actively hunted;
- related integration was inspected;
- important discovered failure modes have regression coverage;
- contradictory assumptions were corrected;
- documentation/ledger reflects reality;
- remaining work is clearly evidence-gated or genuinely optional;
- no easy high-value improvement was left merely because it was outside the first sentence of the request.

### 7. Never use perfection as an excuse to stop

There is no absolute endpoint for product quality.

Stop a workstream when further changes require new evidence, substantive scholarly/product decisions, large new scope, or diminishing-return polish. Record the next meaningful frontier.

### 8. Religious/content integrity has a higher bar

For Qur'an, Hadith, Adhkar, Tajweed and other religious content:
- do not invent source text;
- do not fabricate citations;
- do not silently resolve scholarly disagreement;
- do not infer correctness from UI appearance;
- use canonical bundled data where available;
- distinguish engineering correctness from scholarly correctness;
- mark unresolved scholarly questions explicitly.

### 9. Hostile review is intentional

Use the established hostile lenses:
1. visual/UI art direction
2. UX/task completion
3. interaction/state/feedback
4. IA/navigation
5. responsive/mobile
6. Arabic/RTL/bilingual parity
7. accessibility
8. performance
9. error handling/resilience
10. offline/PWA lifecycle
11. content/religious-data integrity
12. feature completeness
13. privacy/security
14. maintainability/architecture
15. competitive/product quality
16. new-user experience
17. power-user experience
18. hostile edge cases
19. anti-slop restraint
20. meta-review

### 10. Do not stop because another workflow is blocked

Queued CI or unavailable browser/device execution is not permission to become idle. Continue source audit, test design, documentation reconciliation, issue-ledger cleanup, architecture review, candidate implementation, and data/provenance review where safely possible.

Clearly label evidence that still needs the unavailable environment.

### 11. Never weaken gates to make progress look successful

Never delete a useful failing assertion, hide failures with skips, inflate timeouts without evidence, loosen expected behavior solely to make CI green, claim tests passed when they did not execute, or claim browser verification without browser evidence.

### 12. Keep the repository self-explanatory

Important decisions should survive the chat through appropriate docs, issue-ledger entries, tests, source comments, or release records.

### 13. GitHub is the shared source of truth

Prefer branches, commits, pull requests, durable docs, tests, and release records. Do not depend on ZIP artifacts for continuity unless explicitly requested.

### 14. Release discipline remains strict

A candidate is not automatically a release. Before advancing the version, application and service-worker markers must agree, relevant automated gates must pass, required browser/device evidence must exist, release documentation must be updated, and open issues must remain truthful.

## Practical meaning of “continue”

When the user says **continue**:
1. inspect the current repository state;
2. identify the highest-value unfinished work in the active section;
3. challenge previous assumptions;
4. implement justified fixes;
5. add regression coverage;
6. reconcile docs and issue state;
7. create a reviewable GitHub change;
8. continue to the next obvious defect rather than waiting for another prompt;
9. return when the section reaches a practical stopping criterion or an external evidence/decision boundary.

## What “go deep” does not mean

It does not mean endlessly rewriting working code, adding impressive-sounding features without need, redesigning UI without evidence, copying competitors, inventing religious content, refactoring everything into abstractions, declaring success without execution, or maximizing change volume.

Depth means **finding the things a superficial pass would miss**.

## Current Tajweed application

The Tajweed sequence remains:

**rule reachability → full-corpus execution → anomaly analysis → source/reference comparison → course/source consistency → curriculum-depth exemplar → browser/device verification → final hostile review.**

Only evidence or diminishing-return boundaries should end that sequence.
