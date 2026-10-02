/**
 * tests/settings-groups.test.js — (v5.17.63) professional Settings sections.
 *
 * Arrangement only: the same 12 accordions, the same controls, the same
 * contracts — now shelved into seven labelled groups (Setup & about ·
 * Language & display · Content & library · Audio & recitation · Prayer &
 * reminders · Access & family · Offline & backup), every toggle-style row
 * through the ONE settingRow builder (rule 6), and the deferred doors, the
 * backup summary and the install row each slotted into exactly one group
 * (no duplicated markup — the shared builders are reused, not copied).
 *
 * Pinned here:
 *  1. the groups partition SETTINGS_SECTIONS exactly once (no orphan, no
 *     duplicate — a reorder cannot strand a setting);
 *  2. every group renders with its heading in EN and AR (hierarchy pin);
 *  3. every setting control is reachable in the render (toggle keys,
 *     set keys, binds, actions — nothing lost in the move);
 *  4. shared rows render exactly once (deferred / backup-summary /
 *     install / About door — the no-duplication pin);
 *  5. the search box survives and still filters whole groups;
 *  6. bilingual parity for the new keys, adab scan, Elder/a11y shape,
 *     renderer 19/19 budget and logical-properties CSS.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  SETTINGS_GROUPS,
  SETTINGS_SECTIONS,
  renderSettings,
  settingRow,
} from '../js/views/settings.js';
import { t } from '../js/core/i18n.js';
import { escapeHTML } from '../js/core/utils.js';

const NOW = Date.now();

function richState(over = {}, lang = 'en') {
  return {
    activeView: 'settings',
    activeParams: {},
    settings: {
      language: lang,
      settingsSection: null,
      palette: 'default',
      shape: 'rounded',
      themeMode: 'auto',
      fontScale: 1,
      arabicFontScale: 1,
      arabicFont: 'default',
      reciter: 'ar-afasy',
      reciterB: '',
      reciterCompare: false,
      quranTranslation: 'en-sahih',
      quranTranslationB: null,
      quranTranslationC: null,
      mushafPrefs: { defaultTafsir: 'ar-muyassar' },
      homeOrder: null,
      hiddenHome: {},
      quickOrder: null,
      hiddenQuick: {},
      cardFields: {},
      showTransliteration: true,
      showTranslation: true,
      autoAdvanceFocus: false,
      dailyGoal: 100,
      hapticsEnabled: true,
      soundEnabled: true,
      tapRipple: true,
      pageTurnSound: false,
      khatmaChimeSound: false,
      tasbihMilestone: 100,
      jumuahReminder: { enabled: false, time: '09:00' },
      dailyVerseNotification: { enabled: false, time: '08:00' },
      zakatFitrReminder: false,
      reduceMotion: false,
      highContrast: false,
      dyslexiaFriendly: false,
      roomySpacing: false,
      elderMode: false,
      kidsMode: false,
      installDeferral: null,
    },
    reminders: [{ id: 'r1', label: 'Dawn', time: '05:00', enabled: true }],
    profiles: [{ id: 'p1', name: 'Layla' }],
    activeProfile: 'main',
    statistics: { totalRecitations: 40 },
    favorites: [],
    history: [],
    collections: [],
    backupMeta: {
      lastBackupAt: NOW - 2 * 86400000,
      lastAutoBackupAt: NOW - 86400000,
      lastAutoBackupBytes: 14520,
    },
    install: { installed: false, promptReady: false, shellReady: false },
    dataHealth: {},
    tileVisits: {},
    tafsirEditions: {
      editions: [
        {
          id: 'ar-muyassar',
          bundled: true,
          nameEn: 'Al-Muyassar',
          nameAr: 'الميسر',
          authorEn: 'Review board',
          authorAr: 'لجنة المراجعة',
        },
      ],
    },
    ...(over.settings ? { settings: { ...richState().settings, ...over.settings } } : {}),
    ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== 'settings')),
  };
}

describe('groups partition the sections exactly once (rule 6)', () => {
  test('every section id lives in exactly one group', () => {
    const sectionIds = SETTINGS_SECTIONS.map((s) => s.id).sort();
    const grouped = SETTINGS_GROUPS.flatMap((g) => g.sections || []).sort();
    assert.deepEqual(grouped, sectionIds, 'orphan or duplicated section');
  });

  test('group shelves name real sections; the setup group holds doors, not accordions', () => {
    const known = new Set(SETTINGS_SECTIONS.map((s) => s.id));
    for (const g of SETTINGS_GROUPS) {
      assert.match(g.id, /^settings-group-[a-z]+$/, `group id shape: ${g.id}`);
      for (const id of g.sections || [])
        assert.ok(known.has(id), `${g.id} names drifted section ${id}`);
    }
    const setup = SETTINGS_GROUPS[0];
    assert.equal(setup.id, 'settings-group-setup', 'setup shelf leads');
    assert.ok(!setup.sections, 'setup holds the deferred + About doors, no accordion');
    assert.equal(SETTINGS_GROUPS.length, 7, 'seven shelves');
  });
});

describe('group hierarchy renders in both languages', () => {
  test('all seven groups render with labelled headings (EN)', () => {
    const html = renderSettings(richState());
    for (const g of SETTINGS_GROUPS) {
      assert.ok(html.includes(`id="${g.id}"`), `group shelf: ${g.id}`);
      assert.ok(html.includes(`id="${g.id}-title"`), `heading target: ${g.id}`);
      assert.ok(html.includes(`aria-labelledby="${g.id}-title"`), `labelled shelf: ${g.id}`);
      assert.ok(html.includes(escapeHTML(t(g.title, 'en'))), `EN title renders: ${g.title}`);
      assert.ok(html.includes(escapeHTML(t(g.hint, 'en'))), `EN hint renders: ${g.hint}`);
    }
    const details =
      html.match(/<details class="panel settings-acc" id="settings-sec-[a-z]+"/g) || [];
    assert.equal(details.length, 12, 'all 12 accordions survive inside the groups');
  });

  test('AR renders the same shelves with no raw-key leaks', () => {
    const html = renderSettings(richState({}, 'ar'));
    for (const g of SETTINGS_GROUPS) {
      assert.ok(html.includes(`id="${g.id}"`), `group shelf: ${g.id}`);
      const title = t(g.title, 'ar');
      assert.notEqual(title, g.title, `AR title translated: ${g.title}`);
      assert.ok(html.includes(title), `AR title renders: ${g.title}`);
    }
    assert.ok(!html.includes('settings.group'), 'no raw group key leaks');
    assert.ok(!html.includes('undefined'), 'no undefined renders');
  });

  test('deep-link open still lands inside its group', () => {
    const html = renderSettings(richState({ activeParams: { id: 'reciter' } }));
    assert.ok(
      html.includes('<details class="panel settings-acc" id="settings-sec-reciter" open>'),
      'reciter accordion opens on deep link'
    );
    const audioAt = html.indexOf('id="settings-group-audio"');
    const reciterAt = html.indexOf('id="settings-sec-reciter"');
    assert.ok(audioAt !== -1 && audioAt < reciterAt, 'reciter sits inside the audio group');
  });
});

describe('every setting stays reachable (nothing lost in the move)', () => {
  const TOGGLE_KEYS = [
    'showTransliteration',
    'showTranslation',
    'autoAdvanceFocus',
    'reciterCompare',
    'hapticsEnabled',
    'soundEnabled',
    'tapRipple',
    'pageTurnSound',
    'khatmaChimeSound',
    'reduceMotion',
    'highContrast',
    'dyslexiaFriendly',
    'roomySpacing',
  ];
  const SET_KEYS = [
    'palette',
    'shape',
    'themeMode',
    'language',
    'arabicFont',
    'reciter',
    'reciterB',
    'quranTranslation',
    'quranTranslationB',
    'quranTranslationC',
    'tasbihMilestone',
  ];
  const BINDS = [
    'fontScale',
    'arabicFontScale',
    'dailyGoal',
    'jumuah-reminder-time',
    'dailyverse-reminder-time',
    'settings-search',
  ];
  const ACTIONS = [
    'content-field-toggle-global',
    'content-restore-all',
    'mushaf-set-tafsir',
    'home-panel-move',
    'home-panel-toggle',
    'quick-tile-move',
    'quick-tile-toggle',
    'add-reminder',
    'schedule-open-manager',
    'add-preset',
    'toggle-jumuah-reminder',
    'toggle-dailyverse-reminder',
    'toggle-zakatfitr-reminder',
    'toggle-reminder',
    'delete-reminder',
    'toggle-elder-mode',
    'toggle-kids-mode',
    'profile-switch',
    'profile-delete',
    'profile-create',
    'verify-backup',
    'export-backup',
    'restore-auto-backup',
    'import-backup',
    'export-plan',
    'import-plan',
    'reset-all-data',
    'onboarding-reshow',
    'navigate',
  ];

  for (const lang of ['en', 'ar']) {
    test(`all toggle keys reachable (${lang})`, () => {
      const html = renderSettings(richState({}, lang));
      for (const k of TOGGLE_KEYS) assert.ok(html.includes(`data-key="${k}"`), `toggle lost: ${k}`);
    });

    test(`all set keys reachable (${lang})`, () => {
      const html = renderSettings(richState({}, lang));
      for (const k of SET_KEYS) assert.ok(html.includes(`data-key="${k}"`), `picker lost: ${k}`);
    });

    test(`all binds reachable (${lang})`, () => {
      const html = renderSettings(richState({}, lang));
      for (const b of BINDS) assert.ok(html.includes(`data-bind="${b}"`), `bind lost: ${b}`);
    });

    test(`all actions reachable (${lang})`, () => {
      const html = renderSettings(richState({}, lang));
      for (const a of ACTIONS) assert.ok(html.includes(`data-action="${a}"`), `action lost: ${a}`);
    });
  }
});

describe('shared rows render exactly once (no duplication)', () => {
  test('deferred doors + backup summary + install row + About door: one each', () => {
    for (const lang of ['en', 'ar']) {
      const html = renderSettings(richState({}, lang));
      assert.equal(html.split('panel--deferred').length - 1, 1, `deferred block once (${lang})`);
      assert.equal(
        html.split('data-testid="backup-summary"').length - 1,
        1,
        `backup summary once (${lang})`
      );
      assert.equal(html.split('install-row__title').length - 1, 1, `install row once (${lang})`);
      const setupSlice = html.slice(
        html.indexOf('id="settings-group-setup"'),
        html.indexOf('id="settings-group-display"')
      );
      assert.ok(setupSlice.includes('panel--deferred'), 'deferred slotted in the setup group');
      assert.ok(setupSlice.includes('#/about'), 'About door slotted in the setup group');
    }
  });

  test('install row + backup card stay inside the data accordion (e2e contract)', () => {
    const html = renderSettings(richState());
    // The data accordion is the last shelf content: slice from its id on.
    const dataSlice = html.slice(html.indexOf('id="settings-sec-data"'));
    assert.ok(dataSlice.includes('install-row__title'), 'install row inside data');
    assert.ok(dataSlice.includes('data-testid="backup-summary"'), 'backup card inside data');
    assert.ok(dataSlice.includes('#/offline'), 'offline hop stays in data');
  });
});

describe('search box kept, filters whole groups', () => {
  test('the filter box renders (cheap — kept, not rebuilt)', () => {
    const html = renderSettings(richState());
    assert.ok(html.includes('data-bind="settings-search"'), 'search box present');
    assert.ok(html.includes('id="settings-search-input"'), 'search input hook kept');
  });

  test('a miss on every member hides the whole group shelf', () => {
    const html = renderSettings(richState({ activeParams: { q: 'zzz-no-match' } }));
    const hiddenGroups =
      html.match(/<section class="settings-group hidden" id="settings-group-[a-z]+"/g) || [];
    assert.equal(hiddenGroups.length, 6, 'all six accordion groups hide on a total miss');
    assert.ok(
      !html.includes('id="settings-group-setup" hidden'),
      'setup doors never hide (as before)'
    );
  });
});

describe('one row builder serves every toggle (rule 6)', () => {
  test('label + hint + control shape, both wrappers', () => {
    const label = settingRow({ label: 'L', control: '<input />' });
    assert.ok(label.includes('<label class="toggle-row">'), 'checkbox rows stay labels');
    assert.ok(label.includes('<span class="toggle-row__label">L</span>'), 'label span kept');
    const hinted = settingRow({ label: 'L', hint: 'H', control: '<input />' });
    assert.ok(hinted.includes('<span class="panel__subtext">H</span>'), 'hint rides the label');
    const btn = settingRow({
      tag: 'button',
      label: 'L',
      control: '<span></span>',
      attrs: 'data-action="x"',
    });
    assert.ok(
      btn.includes('<button type="button" class="toggle-row" data-action="x">'),
      'click rows stay buttons'
    );
  });

  test('no hand-rolled toggle rows left in the view', () => {
    const src = readFileSync(new URL('../js/views/settings.js', import.meta.url), 'utf8');
    // The builder owns the only two constructions of the chrome (one label
    // shape, one button shape) — every row flows through settingRow.
    assert.equal(
      src.split('<label class="toggle-row"').length - 1,
      1,
      'exactly one label-row construction (inside settingRow)'
    );
    assert.equal(
      src.split('<button type="button" class="toggle-row"').length - 1,
      1,
      'exactly one button-row construction (inside settingRow)'
    );
  });
});

describe('contract: language, adab, budget, a11y', () => {
  test('every new key ships EN + AR with no fallback', () => {
    for (const g of SETTINGS_GROUPS) {
      for (const key of [g.title, g.hint]) {
        const en = t(key, 'en');
        const ar = t(key, 'ar');
        assert.notEqual(en, key, `missing EN: ${key}`);
        assert.notEqual(ar, key, `missing AR: ${key}`);
        assert.notEqual(ar, en, `AR fell back to EN for ${key}`);
      }
    }
  });

  test('no gamification or shame vocabulary in the new group copy, either language', () => {
    // Scoped to the added copy: the rest of the view renders pre-existing
    // strings (e.g. settings.profilesHint) that this arrangement does not
    // touch — relitigating them here would widen the change past
    // arrangement-only.
    const banned = [
      'streak',
      'points',
      'reward',
      'confetti',
      'leaderboard',
      'behind',
      'missed',
      'overdue',
      'shame',
      'level up',
    ];
    for (const lang of ['en', 'ar']) {
      const copy = SETTINGS_GROUPS.map((g) => `${t(g.title, lang)} ${t(g.hint, lang)}`)
        .join(' ')
        .toLowerCase();
      for (const w of banned) assert.ok(!copy.includes(w), `groups carry "${w}" (${lang})`);
    }
  });

  test('renderer 19/19 static budget untouched: settings adds no view import', () => {
    const renderer = readFileSync(new URL('../js/app/renderer.js', import.meta.url), 'utf8');
    const staticViews = [...renderer.matchAll(/from\s+['"]\.\.\/views\/([^'"]+)\.js['"]/g)].map(
      (m) => m[1]
    );
    assert.ok(
      staticViews.length <= 19,
      `renderer statically imports ${staticViews.length} views (cap 19)`
    );
    const src = readFileSync(new URL('../js/views/settings.js', import.meta.url), 'utf8');
    assert.ok(src.includes('./backupSummary.js'), 'backup card still reused, not copied');
    assert.ok(src.includes('./installRow.js'), 'install row still reused, not copied');
  });

  test('Elder/a11y: labelled shelves, native controls, content-proof CSS', () => {
    const html = renderSettings(richState());
    const h1 = html.indexOf('<h1 class="view__title">');
    const h2 = html.indexOf('<h2 class="settings-group__title"');
    assert.ok(h1 !== -1 && h2 !== -1 && h1 < h2, 'h1 leads, group h2s follow');
    const css = readFileSync(new URL('../assets/css/components.css', import.meta.url), 'utf8');
    const block = css.slice(
      css.indexOf('.settings-group {'),
      css.indexOf('.settings-group__title')
    );
    assert.ok(
      !/margin-left|margin-right|padding-left|padding-right|width\s*:|height\s*:/.test(block),
      'logical properties only, no fixed box holding translated text'
    );
  });
});
