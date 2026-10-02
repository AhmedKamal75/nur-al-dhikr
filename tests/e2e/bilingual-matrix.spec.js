/**
 * e2e/bilingual-matrix.spec.js — the gate that makes rule 8/9 enforceable.
 *
 * AGENTS.md rule 9 ("no slop ships in either language") was, until this spec,
 * a promise with nothing behind it. The evidence, measured:
 *
 *   - Every overflow/clipping assertion in this repo ran in ENGLISH.
 *     `type-scale-200.spec.js:31` hardcodes `language: 'en'` inside the
 *     overflow test itself.
 *   - The ONE Arabic geometry assertion, `routes-extended.spec.js:90`,
 *     covered 6 of 34 routes, at one viewport, and measured only `#main`.
 *   - `overhaul-routes.spec.js` already rendered 33 routes × 2 languages and
 *     asserted ZERO geometry — only "not empty, no console error".
 *
 * So Arabic overflow could not fail this build, which is exactly why the slop
 * the owner kept seeing kept landing: nothing was red, so nothing stopped it.
 *
 * This spec closes the axes that were missing, on top of the 33×2 sweep that
 * already existed:
 *
 *   routes   × {en, ar} × {fontScale 1, 2}   (4 contexts, 132 probes)
 *   regions  #main + #topbar + #bottomnav + #playerbar + #immersive-chrome
 *
 * The 200% axis is not decoration: Arabic glyphs are taller and wider than
 * Latin at the same nominal size, so a layout that survives EN at 200% is not
 * evidence about AR at 200%. Measuring one language and generalising is the
 * exact inference rule 8 forbids.
 *
 * ENFORCEMENT IS DEFERRED BY ONE RELEASE (owner ruling 2026-10-02). This spec
 * ships as an instrument: it measures everything, writes a committed report,
 * and prints findings, but does not fail. That is a deliberate, temporary
 * state — a gate switched on before its findings are triaged blocks everyone
 * with a backlog nobody has read. Flip it with:
 *
 *     GEOMETRY_ENFORCE=1 npx playwright test bilingual-matrix --project=chromium
 *
 * The measurement is identical either way; only the verdict differs.
 */
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { STORAGE_KEY } from '../../js/core/config/app.js';
import { probeLayout, formatDefects, verdict, ENFORCING, CHROME_SELECTORS } from './_geometry.js';

/**
 * Record exactly which tree produced this report.
 *
 * A committed evidence file that does not say what it measured is a floating
 * claim: it drifts from the code silently and is trusted long after it stopped
 * being true. AGENTS.md §9 treats "a commit message and the run disagree" as
 * the unforgivable error, so the report carries its own provenance — and
 * `dirty` names the case where the sweep ran against a working tree that was
 * still moving, which is the normal condition when two agents share a
 * checkout.
 */
function provenance() {
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  };
  const dirty = (git('status', '--porcelain', 'js', 'assets') || '').split('\n').filter(Boolean);
  return {
    head: git('rev-parse', '--short', 'HEAD'),
    measuredPathsDirty: dirty,
    measuredPathsDirtyCount: dirty.length,
  };
}

const census = JSON.parse(
  readFileSync(path.join(process.cwd(), 'evidence/overhaul-e2e/route-census.json'), 'utf8')
);

/**
 * The census covers 33 of the 34 routes in VIEWS: `tajweed-course` is absent,
 * which left the study flagship — the surface most likely to break under
 * Arabic at 200%, being long-form prose — permanently unmeasured. Added here
 * explicitly rather than by regenerating the census, because regenerating it
 * is a separate change with its own evidence file and this spec must not
 * silently depend on that having happened.
 */
const EXTRA_ROUTES = [
  { view: 'tajweed-course', path: '#/tajweed-course' },
  { view: 'search', path: '#/search?q=Allah' },
  { view: 'category', path: '#/category/morning' },
];

const ROUTES = [...census.routes, ...EXTRA_ROUTES];

/** Two axes the sweep deliberately pins rather than derives. */
const LANGS = ['en', 'ar'];
/** 1 is the default; 2 is the WCAG 1.4.4 ceiling the app itself allows. */
const SCALES = [1, 2];

const REPORT_DIR = path.join(process.cwd(), 'evidence/bilingual-matrix');

/**
 * Seed language + type scale before any app code runs.
 *
 * Derived from the app's own STORAGE_KEY rather than the literal
 * 'nurAlDhikr:v2:state' that `type-scale-200.spec.js:22` pins — if the schema
 * version moves, that pin goes stale silently and the sweep measures a
 * default-EN page while believing it measured Arabic. This is rule 6: derive
 * from the single source of truth.
 */
async function seed(page, { lang, scale }) {
  await page.addInitScript(
    ([key, language, fontScale]) => {
      const seedState = () => {
        try {
          const raw = window.localStorage.getItem(key);
          const state = raw ? JSON.parse(raw) : {};
          state.settings = { ...(state.settings || {}), language, fontScale };
          window.localStorage.setItem(key, JSON.stringify(state));
        } catch {
          /* the app seeds its own state; the probe is best-effort */
        }
      };
      seedState();
      window.addEventListener('DOMContentLoaded', seedState);
    },
    [STORAGE_KEY, lang, scale]
  );
}

test.describe('bilingual layout integrity', () => {
  test('routes × {en, ar} × {fontScale 1, 2}: no sideways overflow, no silent clipping', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(900000); // 132 route renders; the sweep is not cheap by design

    const cells = [];
    const defects = [];

    for (const lang of LANGS) {
      for (const fontScale of SCALES) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await seed(page, { lang, scale: fontScale });

        await page.goto('#/home');
        await expect(page.locator('#main')).not.toBeEmpty({ timeout: 30000 });

        // Prove the seed took, so a broken probe cannot masquerade as a pass:
        // if the page is not actually in Arabic at 200%, every measurement
        // below is of English and the report is worthless.
        const applied = await page.evaluate(
          ([key]) => ({
            lang: document.documentElement.getAttribute('lang'),
            dir: document.documentElement.getAttribute('dir'),
            scale: getComputedStyle(document.documentElement)
              .getPropertyValue('--font-scale')
              .trim(),
            persisted: (() => {
              try {
                return JSON.parse(window.localStorage.getItem(key) || '{}').settings?.fontScale;
              } catch {
                return null;
              }
            })(),
          }),
          [STORAGE_KEY]
        );
        expect(
          applied.lang,
          `seed failed: expected lang=${lang}, got ${applied.lang}. A sweep that silently ` +
            `measures the wrong language is worse than no sweep.`
        ).toBe(lang);
        expect(applied.dir).toBe(lang === 'ar' ? 'rtl' : 'ltr');

        for (const route of ROUTES) {
          await page.goto(route.path);
          await expect(page.locator('#main'), `${lang} ${route.path}`).not.toBeEmpty({
            timeout: 30000,
          });
          await page.waitForTimeout(150); // let the patch layer settle before measuring

          const result = await probeLayout(page);
          const label = `${lang} @${fontScale} ${route.path}`;
          cells.push({
            lang,
            fontScale,
            route: route.view,
            path: route.path,
            viewport: result.viewport,
            slack: result.slack,
            overflowCount: result.overflowCount,
            hardClipCount: result.hardClipCount,
            softClipCount: result.softClipCount,
          });

          if (result.slack > 1 || result.overflowCount > 0 || result.hardClipCount > 0) {
            defects.push(...formatDefects(label, result));
          }
        }

        await context.close();
      }
    }

    // Non-vacuity: the sweep must have actually measured the full matrix. A
    // gate that measures nothing and passes is the failure mode AGENTS.md §9
    // calls unforgivable, so the shape of the measurement is asserted, not
    // assumed.
    expect(cells.length, 'every route × lang × scale cell was probed').toBe(
      ROUTES.length * LANGS.length * SCALES.length
    );
    expect(new Set(cells.map((c) => c.lang)).size, 'both languages were exercised').toBe(2);
    for (const lang of LANGS) {
      expect(
        cells.filter((c) => c.lang === lang).length,
        `${lang} covered every route at every scale`
      ).toBe(ROUTES.length * SCALES.length);
    }
    for (const cell of cells) {
      expect(cell.viewport, `${cell.path} measured a real viewport`).toBeGreaterThan(200);
    }

    mkdirSync(REPORT_DIR, { recursive: true });
    // One file per project/viewport. The EVIDENCE_MATRIX run executes this
    // test 4 times concurrently, and a single shared path means three of the
    // four reports are silently overwritten — the evidence would look
    // complete while describing one viewport, which is precisely the kind of
    // unverified claim this gate exists to prevent.
    writeFileSync(
      path.join(REPORT_DIR, `layout-report.${testInfo.project.name}.json`),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          project: testInfo.project.name,
          viewport: cells[0]?.viewport ?? null,
          provenance: provenance(),
          enforced: ENFORCING,
          regions: CHROME_SELECTORS,
          matrix: { routes: ROUTES.length, langs: LANGS, scales: SCALES, cells: cells.length },
          totals: {
            slackCells: cells.filter((c) => c.slack > 1).length,
            overflowOffenders: cells.reduce((n, c) => n + c.overflowCount, 0),
            hardClipOffenders: cells.reduce((n, c) => n + c.hardClipCount, 0),
            softClipCells: cells.filter((c) => c.softClipCount > 0).length,
          },
          defects,
          cells,
        },
        null,
        2
      )}\n`
    );

    testInfo.attach('geometry-summary', {
      body: defects.length ? defects.join('\n') : 'no defects found',
      contentType: 'text/plain',
    });

    verdict(defects, testInfo);
  });
});
