# Nūr al-Dhikr — remaining work at v5.17.83

## Baseline

This release was prepared from the full-corpus v5.17.80 archive plus the verified v5.17.81 remaining-work report. The post-consolidation Git object itself was not available in the handoff workspace; do not misrepresent this archive as a byte-for-byte copy of the v5.17.81 commit.

## Owner findings addressed

- Focus completion now advances to the next visible dhikr by default.
- Home now starts with orientation and follows an explicit action hierarchy.
- Settings selection controls are no longer styled like legacy hyperlinks, and bilingual metadata wraps.
- Palette CSS no longer duplicates the config source of truth.

## Still required on the authoritative local tree

1. Run the full `npm run check` and full Chromium E2E matrix on the authoritative v5.17.81+ tree.
2. Pin and mutation-test the missing-data heading landmarks identified in the v5.17.81 remaining-work report.
3. Resolve the owner's decision on the 805-line roadmap document and preserve Git history rather than synthesising archive commits.
4. Run Firefox/WebKit, large-text/roomy, forced-colors, reduced-transparency, safe-area and real-touch checks when the environment permits.
5. Re-check the Settings reciter metadata at all four mandatory bilingual viewports.

## Product rule

Do not add more visual chrome to Focus, Tajweed, or the Mushaf just to make them feel “designed”. They are already among the strongest surfaces. Improve them by preserving hierarchy and making the task flow obvious.
