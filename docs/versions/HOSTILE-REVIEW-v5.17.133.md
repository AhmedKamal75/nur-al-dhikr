# Nūr al-Dhikr — Hostile Review Report v5.17.133

Date: 2026-10-07

## Objective

This follow-through review uses independent adversarial lenses across visual direction, UX, interaction, IA, mobile/responsive, RTL, accessibility, performance, resilience, offline/PWA, content integrity, feature completeness, security/privacy, maintainability, competitive quality, new-user experience, power-user friction, edge cases, anti-slop, and meta-review.

## Fresh evidence-driven findings

### HR-133-01 — Mobile active navigation state was re-flattened by cascade

Severity: P1
Status: FIXED in v5.17.133
Evidence: owner-supplied 393px EN/AR Chromium screenshots showed the active mobile door rendered as a filled tinted item despite the deslopify rule explicitly specifying an indicator treatment. Source inspection found a later `layout.css` rule restoring the fill and setting the pseudo-element to `content:none`.
Remediation: transparent active item + semantic bottom indicator in the final cascade, regression-pinned.

### HR-133-02 — Single-item Home continuation panel consumed dashboard-sized vertical space

Severity: P2
Status: FIXED in v5.17.133
Evidence: owner-supplied 1440px Home screenshot showed a single continuation destination occupying a large card with substantial empty vertical space.
Remediation: when exactly one resume row exists, use a compact single-row modifier; no change to the content, route, or Home information architecture.

### HR-133-03 — Mobile seven-door density remains a device-evidence question

Severity: P2
Status: OPEN / BLOCKED:device
The seven direct doors are intentionally preserved. Current source cannot determine whether the 360/393 geometry is comfortably legible; fresh Chromium screenshots are required.

### HR-133-04 — Home desktop balance requires current-browser confirmation

Severity: P2
Status: OPEN / BLOCKED:device
The source fix for single-item continuation is complete, but current EN/AR light/dark 1440px evidence is required before declaring the composition balanced.

### Carried-forward open hostile findings

- Mutable Tafsir `main` dependency: pin/self-host after exact snapshot review.
- QuranWBW exact dataset snapshot/licence provenance.
- Hadith source/translation redistribution chain.
- Verified source-first expansion of core Adhkar/Duʿāʾ content.
- Real-device accessibility and PWA/browser lifecycle evidence.

## Deliberately preserved

- Seven-door IA; no generic More bucket.
- Home as a landing page, not dashboard.
- Mushaf/Focus/Tajweed interaction grammar.
- No fabricated religious corpus or unverified scholarly metadata.
