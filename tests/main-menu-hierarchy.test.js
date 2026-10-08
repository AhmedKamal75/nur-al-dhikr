import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { APP_MENU_ENTRIES, APP_MENU_GROUPS, DOORS } from '../js/core/config/nav.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const shell = read('js/ui/shell.js');
const css = read('assets/css/deslopify.css');
const nav = read('js/core/config/nav.js');

describe('v5.17.84 main-menu hierarchy', () => {
  test('Settings and About are standalone app-tail entries, not You children', () => {
    const you = DOORS.find((d) => d.entry === 'CHECKLIST');
    const youRoutes = you.members.map((m) => m.route);
    assert.equal(APP_MENU_ENTRIES.length, 4);
    assert.deepEqual(
      APP_MENU_ENTRIES.map((x) => x.view),
      ['zakat', 'offline', 'settings', 'about']
    );
    assert.deepEqual(
      APP_MENU_GROUPS.map((g) => [g.kind, g.entries.map((x) => x.view)]),
      [
        ['zakat', ['zakat']],
        ['offline', ['offline']],
        ['settings', ['settings']],
        ['about', ['about']],
      ]
    );
    assert.ok(!youRoutes.includes('SETTINGS'));
    assert.ok(!youRoutes.includes('ABOUT'));
    assert.ok(!youRoutes.includes('ZAKAT'));
    assert.ok(!youRoutes.includes('OFFLINE'));
  });

  test('main menu derives expandable sections from DOORS and app tail from one source', () => {
    assert.match(shell, /DOORS\.map\(\(door\) => hierarchicalSectionHTML/);
    assert.match(shell, /APP_MENU_ENTRIES\.map\(\(n\) =>/);
    // (v5.17.137) The section is a <div> row; only the SUB-LIST sits inside the
    // <details>, because a closed <details> hides every child but its summary —
    // which is what made the door name an unreachable "dead button".
    assert.match(shell, /<div class="nav__section/);
    assert.match(shell, /<details class="nav__section-details" data-open-controlled/);
    assert.match(shell, /nav__section-chevron/);
    assert.match(shell, /class="nav__section-link/);
    assert.match(shell, /<summary class="nav__section-toggle"/);
    assert.match(css, /\.nav__section-link/);
  });

  test('menu has bilingual labels for the new hierarchy affordances', () => {
    for (const key of [
      'nav.main',
      'nav.overview',
      'nav.toggleSection',
      'nav.expand',
      'nav.collapse',
    ]) {
      assert.ok(en[key], `missing English ${key}`);
      assert.ok(ar[key], `missing Arabic ${key}`);
    }
  });

  test('section subroutes use main-menu as their navigation path', () => {
    const offenders = DOORS.flatMap((door) =>
      door.members
        .filter((m) => m.route !== door.entry && m.direct !== false && m.via !== 'main-menu')
        .map((m) => `${door.entry}:${m.route}:${m.via}`)
    );
    assert.deepEqual(offenders, []);
  });
});
