/**
 * e2e/touch-targets.spec.js — (A11Y-01) effective 44px pointer contract.
 *
 * The app deliberately keeps compact 36px visuals (.icon-btn--sm) and
 * 40px chips, expanding the EFFECTIVE hit area with ::after pseudo
 * overlays (components.css). A raw getBoundingClientRect() census therefore
 * reports failures that real pointers never feel. This spec probes what a
 * finger actually hits, with the honest two-tier rule:
 *   - visual >= 44px in an axis: that axis passes by size, no probing;
 *   - visual < 44px in an axis: elementFromPoint() just outside the visual
 *     border (inside the ::after apron) must still resolve to the control.
 */
import { test, expect } from '@playwright/test';

test('touch-targets: compact controls catch pointers beyond their visual box', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/home');
  await expect(page.locator('#main')).not.toBeEmpty({ timeout: 20000 });

  const results = await page.evaluate(() => {
    const out = [];
    // Compact visuals: the small icon buttons and chips the ::after
    // aprons exist for — plus full-size topbar buttons as size witnesses.
    const candidates = [
      ...document.querySelectorAll('#topbar .icon-btn'),
      ...document.querySelectorAll('#main .icon-btn--sm'),
      ...document.querySelectorAll('#main .chip'),
    ].slice(0, 12);
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const label =
        el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40) || el.className;
      const axes = [];
      if (r.width < 44) {
        axes.push([r.left - 5, r.top + r.height / 2, 'left']);
        axes.push([r.right + 5, r.top + r.height / 2, 'right']);
      }
      if (r.height < 44) {
        axes.push([r.left + r.width / 2, r.top - 5, 'top']);
        axes.push([r.left + r.width / 2, r.bottom + 5, 'bottom']);
      }
      if (axes.length === 0) {
        out.push({
          control: label,
          edge: 'size',
          owned: true,
          visual: `${Math.round(r.width)}x${Math.round(r.height)}`,
        });
        continue;
      }
      for (const [x, y, edge] of axes) {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
        const hit = document.elementFromPoint(x, y);
        const owned = hit && (hit === el || el.contains(hit));
        out.push({
          control: label,
          edge,
          owned: !!owned,
          visual: `${Math.round(r.width)}x${Math.round(r.height)}`,
        });
      }
    }
    return out;
  });

  const probed = results.filter((r) => r.edge !== 'size');
  expect(probed.length, 'no sub-44px compact controls found to probe').toBeGreaterThan(0);
  const misses = results.filter((r) => !r.owned);
  expect(
    misses,
    `pointer misses beyond visual border: ${JSON.stringify(misses.slice(0, 6))}`
  ).toEqual([]);
});
