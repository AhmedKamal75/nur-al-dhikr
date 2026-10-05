# Nūr al-Dhikr — remaining work at v5.17.84

## Verified in this pass

- Main worship/product navigation is represented as seven top-level doors.
- Worship/product doors with depth expand from the main menu through native `<details>` with explicitly owned chrome.
- The application tail is flat: Zakat, Offline, Settings, About; Settings and About are the final two standalone siblings.
- Home source order is enforced: identity → Today/prayer context → Start Here → Shahada → next → reflection → context.
- Home mobile heading scale is reduced.
- Targeted contracts, IA, Home and Settings tests pass locally in this workspace.

## Must be verified on the authoritative local machine

1. Full `npm run check`.
2. Full Chromium E2E on the complete 2350-file corpus.
3. Screenshot matrix for main drawer at 360×800, 393×852, 1024×768, 1440×900 in EN/AR and light/dark.
4. Open/close every expandable worship section; verify no native triangle, dashed line, clipped child label, accidental horizontal scroll, or broken RTL indentation.
5. Verify Zakat, Offline, Settings, About appear as standalone tail siblings, with Settings then About last.
6. Home screenshots in the same matrix; verify Today/prayer context and Start Here appear before reflection/supporting material, and verify the reduced Home title does not become visually weak.
7. Re-run the Focus interaction case: completing one item advances exactly once to the next visible dhikr.
8. Re-test Settings at 1440×900 for `.reciter-row__meta` wrapping instead of clipping.
9. Re-run the existing data-absence heading E2E on Qur'an/Mushaf error routes.
10. Run the hostile rubric only after the matrix is captured. Do not inherit 9.35 or 9.9.

## Known evidence limits in this workspace

- No `node_modules` are included in the extracted workspace, so `npm run check` is not claimed here.
- No browser score is assigned here. The owner’s machine with Playwright/Chromium is the rendered-evidence authority.
- The 9.35 score belongs to v5.17.78 full-corpus browser evidence and must not be reused as the current score.
