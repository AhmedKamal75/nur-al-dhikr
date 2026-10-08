# Nūr al-Dhikr — Hostile Review / Deslopification Follow-through v5.17.135

Date: 2026-10-07

## Evidence basis

- Owner-machine Chromium evidence from v5.17.126, including the real failure where the Offline Essentials switch was outside the viewport.
- Current v5.17.135 source/tests.
- Existing 20-lens hostile-review model: visual/UI, UX, interaction, IA, responsive, RTL, accessibility, performance, resilience, offline/PWA, content integrity, completeness/enrichment, security/privacy, maintainability, competitive quality, new user, power user, edge cases, anti-slop, meta-review.

## Finding fixed

### HR-134-01 — Offline Essentials decision was below the initial viewport

Severity: P1
Status: FIXED IN v5.17.135

The v5.17.126 owner-machine Chromium run failed the Offline Essentials test because the switch existed but was outside the viewport and therefore could not be pointer-operated at the tested state. This contradicted the product decision that Essentials is the primary Offline decision surface.

Remediation: the Essentials surface is now emitted immediately after the route lead, before storage meter, audio meter and cache-limit detail. Existing switch semantics, persistence behavior, bilingual copy and management disclosure are preserved.

## Current OPEN device questions

- Fresh current-browser proof that the switch is initially visible and operable at 360/393 in EN/AR, light/dark.
- Seven-door mobile navigation density and active-state legibility.
- Home single-item continuation balance.
- Carried-forward real-browser contracts: Azkar Details/count separation, Player narrow layout, Hadith Reference, Prayer methodology, Mushaf Find/bookmarks, progressive disclosures, and the v5.128–132 recovery/security affordances.

## Preserve

- Seven direct top-level doors; no generic More bucket.
- Home remains a landing page, not a full catalogue/dashboard.
- Strong Mushaf/Focus/Tajweed interaction grammar unless fresh browser evidence proves a defect.
- No fabricated religious corpus, grades, provenance or scholarly metadata.
