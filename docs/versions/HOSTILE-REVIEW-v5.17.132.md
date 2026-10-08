# Nūr al-Dhikr — Hostile Review Report v5.17.132

Date: 2026-10-07

## Review model

This pass used independent adversarial lenses rather than one blended opinion:

1. Visual/UI art direction
2. UX/usability and task completion
3. Interaction/state/feedback behavior
4. Information architecture and navigation
5. Mobile/responsive geometry
6. Arabic/RTL and bilingual parity
7. Accessibility
8. Performance/smoothness
9. Error handling/resilience
10. Offline/PWA lifecycle
11. Content and religious-data integrity
12. Feature completeness/enrichment
13. Privacy/security
14. Maintainability/technical architecture
15. Competitive/product quality
16. New-user perspective
17. Power-user perspective
18. Hostile edge cases
19. Anti-slop / visual restraint
20. Meta-review: defect vs preference vs blocked decision

The review used source evidence, current automated tests, prior local Chromium evidence supplied by the owner, durable issue history, and current standards/research where relevant. No claim of fresh browser execution was made in this workspace.

## Findings

### HR-132-01 — Import reads entire user-selected file before size rejection

Severity: P1
Category: robustness / security / performance
Status: FIXED IN v5.17.132

Backup and plan/custom import paths could materialize the complete File object as text before enforcing the application-level size ceiling. A hostile or simply huge local file could therefore cause avoidable memory pressure before the intended validation boundary.

Remediation: reject oversized files using File.size before FileReader/text materialization. Existing schema validation remains unchanged after the size gate.

### HR-132-02 — Imported plan keys can contain reserved prototype names

Severity: P1
Category: security / data integrity
Status: FIXED IN v5.17.132

Imported family-plan/custom objects accepted a looser key contract than the application's own backup sanitization, leaving reserved names such as constructor/prototype available at an object boundary.

Remediation: reject reserved prototype-pollution keys before materializing imported records and pin the behavior with regression coverage.

### HR-132-03 — Tafsir dependency remains continuity-sensitive

Severity: P1/P2 boundary
Category: offline/PWA / content continuity
Status: OPEN — infrastructure decision required

The durable issue ledger still identifies a tafsir dependency served from raw.githubusercontent.com. For an offline-first religious reference product, mutable third-party CDN continuity is a materially different risk from ordinary static web content.

Disposition: do not silently replace it with another source. Decide whether the tafsir corpus should be packaged/pinned locally, mirrored under an explicitly governed release process, or deliberately remain remote with a documented failure mode and provenance contract.

### HR-132-04 — Hadith citation/narrator/chapter/bookmark depth remains incomplete

Severity: P1/P2 boundary
Category: content integrity / completeness
Status: OPEN — data/provenance work

The durable issue ledger still lists the remaining hadith citation, narrator, Arabic chapter-name, and global-bookmark work as open. This is not a UI-only omission: for a reference-oriented Islamic app, provenance and retrievability are part of the product's core trust model.

Disposition: scholarly/source-backed data pass; no machine-generated citation filling.

### HR-132-05 — Core Adhkar/Duʿāʾ depth remains below the project's long-term ambition

Severity: P1/P2 boundary
Category: feature completeness / content enrichment
Status: OPEN — content pipeline

The product's historical specification calls for much deeper verified Adhkar/Duʿāʾ coverage, stronger search, and richer per-item metadata. The hostile review confirms this remains a product-depth issue, not something to solve by adding superficial cards or unverified material.

Disposition: source-first corpus expansion with explicit provenance, grading discipline, and scholarly blocking where required.

### HR-132-06 — iOS persistence/wake-up limitations need product-level treatment

Severity: P2
Category: platform robustness
Status: OPEN

The issue ledger records platform limitations around browser-managed storage and prayer-time wake-ups. v5.17.131 improved storage honesty, but the app still needs an explicit product strategy for platform-limited alarm semantics rather than implying parity with native scheduling.

Disposition: documentation + optional export/bridge strategy; do not promise unsupported background behavior.

## Deliberately NOT turned into defects

- Strong Mushaf/Word Study/Focus/Tajweed typography and interaction grammar were preserved.
- The Home is not being turned back into a dashboard.
- No generic “More” navigation bucket was introduced.
- No per-dhikr audio corpus was fabricated.
- Scholarly questions (grades, tajweed taxonomy/color conventions, permissibility questions) remain blocked rather than machine-filled.
- Existing screenshot/test-selector mismatches are not treated as product defects without current DOM/source evidence.

## Review conclusion

v5.17.132 resolves the two concrete hostile-review code defects found in the import boundary. The remaining important work is now dominated by browser/device certification, platform behavior, continuity/provenance, and verified content depth rather than generic CSS polish.
