import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  renderNav,
  renderTopBar,
  drawerSectionsHTML,
  INTERNAL_ONLY_ROUTES,
} from '../js/ui/shell.js';
import { VIEWS } from '../js/core/config.js';
import { APP_MENU_ENTRIES, APP_MENU_GROUPS, DOORS } from '../js/core/config/nav.js';
import { initialState } from '../js/core/state/initial.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const stateFor = (view, lang = 'en') => ({
  ...initialState(),
  booted: true,
  activeView: view,
  settings: { ...initialState().settings, language: lang },
});

const routeValues = (entry) => {
  const door = DOORS.find((d) => d.entry === entry);
  return door ? door.members.filter((m) => m.direct !== false).map((m) => VIEWS[m.route]) : [];
};

describe('v5.17.84 main menu hierarchy', () => {
  test('mobile still exposes exactly the seven primary doors', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    const bar =
      html.match(
        /<div class="nav-mobile-bar">([\s\S]*?)<\/div>\s*<div class="nav-drawer-overlay/
      )?.[1] || '';
    const views = [...bar.matchAll(/data-view="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(
      views,
      DOORS.map((d) => d.view)
    );
  });

  test('main menu sections expose explicit destination and disclosure controls', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    assert.ok(html.includes('nav__section'));
    // (v5.17.137) the door row is a <div>; only its sub-list sits in the
    // <details>, so the door NAME stays visible while the section is closed.
    assert.ok(html.includes('<div class="nav__section'));
    assert.ok(html.includes('<details class="nav__section-details" data-open-controlled'));
    assert.ok(html.includes('nav__section-link'));
    assert.ok(html.includes('nav__section-toggle'));
    assert.ok(html.includes('data-section="LIBRARY"'));
    assert.ok(html.includes('data-section="MUSHAF"'));
    assert.ok(html.includes('data-section="PRAYER"'));
    assert.ok(html.includes('nav__app-tail'));
    assert.ok(html.includes('nav__item--app-settings'));
    assert.ok(html.includes('nav__item--app-about'));
    assert.ok(html.includes(`data-view="${VIEWS.SETTINGS}"`));
    assert.ok(html.includes(`data-view="${VIEWS.ABOUT}"`));
    assert.ok(html.includes('id="nav-sub-LIBRARY"'));
    assert.ok(html.includes('id="nav-sub-LIBRARY-drawer"'));
  });

  test('top-level section rows navigate while the adjacent control owns disclosure', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    for (const door of DOORS.filter((d) =>
      d.members.some((m) => m.route !== d.entry && m.direct !== false)
    )) {
      const sectionPos = html.indexOf(`data-section="${door.entry}"`);
      assert.ok(sectionPos >= 0, `${door.entry} section missing`);
      const section = html.slice(sectionPos, html.indexOf('</div>', sectionPos + 1) + 6);
      assert.match(
        section,
        new RegExp(`data-action="(?:navigate|nav-drawer-go)"[^>]*data-view="${door.view}"`)
      );
      assert.match(section, /<summary class="nav__section-toggle"/);
    }
  });

  test('desktop rail collapse has a reachable topbar toggle contract', () => {
    const shell = readFileSync(new URL('../js/ui/shell.js', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../assets/css/deslopify.css', import.meta.url), 'utf8');
    assert.match(shell, /class="icon-btn topbar__menu" data-action="nav-toggle"/);
    assert.match(shell, /navControlIcon/);
    assert.doesNotMatch(
      css,
      /@media \(min-width: 960px\) \{\s*\.topbar__menu\s*\{\s*display:\s*none !important;/
    );
  });

  test('mobile menu trigger targets the drawer and the drawer has a stable id', () => {
    const topbar = renderTopBar(stateFor(VIEWS.HOME));
    const nav = renderNav(stateFor(VIEWS.HOME));
    assert.match(topbar, /data-action="nav-toggle"/);
    assert.match(topbar, /aria-controls="nav-drawer"/);
    assert.match(nav, /id="nav-drawer"/);
  });

  test('Settings and About are standalone at the end of the main menu', () => {
    const html = renderNav(stateFor(VIEWS.HOME));
    const settingsPos = html.lastIndexOf(`data-view="${VIEWS.SETTINGS}"`);
    const aboutPos = html.lastIndexOf(`data-view="${VIEWS.ABOUT}"`);
    assert.ok(settingsPos >= 0 && aboutPos > settingsPos);
    const you = DOORS.find((d) => d.entry === 'CHECKLIST');
    assert.deepEqual(
      you.members.map((m) => m.route),
      ['CHECKLIST', 'GARDEN', 'FAVORITES', 'JOURNAL', 'STATISTICS', 'CERTIFICATE']
    );
    assert.deepEqual(
      APP_MENU_ENTRIES.map((x) => x.view),
      [VIEWS.ZAKAT, VIEWS.OFFLINE, VIEWS.SETTINGS, VIEWS.ABOUT]
    );
    assert.deepEqual(
      APP_MENU_GROUPS.map((g) => g.entries.map((x) => x.view)),
      [[VIEWS.ZAKAT], [VIEWS.OFFLINE], [VIEWS.SETTINGS], [VIEWS.ABOUT]]
    );
  });

  test('each worship section exposes only its own direct children in the drawer', () => {
    const html = drawerSectionsHTML(VIEWS.HOME, 'en');
    for (const door of DOORS) {
      for (const view of routeValues(door.entry)) {
        assert.ok(html.includes(`data-view="${view}"`), `${door.entry} should expose ${view}`);
      }
    }
    // Tile-depth routes intentionally remain inside their feature browser.
    assert.doesNotMatch(html, /data-view="category"/);
    assert.doesNotMatch(html, /data-view="collection"/);
  });

  test('active section opens and active child is visibly selected', () => {
    const html = renderNav(stateFor(VIEWS.TAJWEED_COURSE));
    assert.match(html, /data-section="MUSHAF"[\s\S]*<details[^>]*open/);
    const drawer = drawerSectionsHTML(VIEWS.TAJWEED_COURSE, 'en');
    const row = `data-view="${VIEWS.TAJWEED_COURSE}"`;
    const at = drawer.indexOf(row);
    assert.ok(at >= 0);
    assert.ok(drawer.slice(Math.max(0, at - 100), at + 100).includes('nav__item--active'));
  });

  test('all new menu chrome labels are bilingual', () => {
    for (const key of ['nav.main', 'nav.overview', 'nav.settings', 'nav.about']) {
      assert.ok(en[key], `English ${key} missing`);
      assert.ok(ar[key], `Arabic ${key} missing`);
    }
  });

  test('documented internal routes remain doorless by intent', () => {
    for (const key of ['EDITOR', 'AMBIENT', 'SEARCH']) assert.ok(INTERNAL_ONLY_ROUTES[key]);
  });
});
