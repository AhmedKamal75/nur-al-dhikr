/**
 * tests/settingsSection.test.js — item 5 (settings accordion persistence +
 * deep links) gates:
 *  1. the sanitize allowlist mirrors the view's section slugs exactly (no
 *     drift between config and views);
 *  2. sanitizeSettings keeps valid slugs and drops hostile ones to null;
 *  3. openSettingsSectionFor resolves deep link → stored pin → default;
 *  4. palette settings rows deep-link to `#/settings/<slug>` with real
 *     titles (the titleKey/title mismatch never renders "undefined");
 *  5. the toggle listener persists (events) and deep-link NAVIGATEs persist
 *     (stateSub) — static wiring gates.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { sanitizeSettings, SETTINGS_SECTION_SLUGS } from '../js/core/config.js';
import {
  openSettingsSectionFor,
  settingsSectionForSlug,
  settingsSectionIds,
  settingsSlugForSection,
} from '../js/views/settings.js';
import { buildPaletteGroups } from '../js/views/palette.js';

describe('sanitize allowlist mirrors the view slugs', () => {
  test('pinned equal (config never imports views)', () => {
    const viewSlugs = settingsSectionIds().map((id) => settingsSlugForSection(id));
    assert.deepEqual([...SETTINGS_SECTION_SLUGS].sort(), viewSlugs.sort());
  });

  test('sanitizeSettings keeps slugs, drops hostile pins', () => {
    assert.equal(sanitizeSettings({ settingsSection: 'data' }).settingsSection, 'data');
    assert.equal(sanitizeSettings({ settingsSection: 'bogus' }).settingsSection, null);
    assert.equal(sanitizeSettings({ settingsSection: 42 }).settingsSection, null);
    assert.equal(sanitizeSettings({}).settingsSection, null);
  });
});

describe('openSettingsSectionFor: deep link, pin, default', () => {
  const base = (over = {}) => ({
    settings: { language: 'en', settingsSection: null },
    activeParams: {},
    ...over,
  });

  test('deep link wins over the stored pin', () => {
    assert.equal(
      openSettingsSectionFor(
        base({ activeParams: { id: 'data' }, settings: { settingsSection: 'feedback' } })
      ),
      'settings-sec-data'
    );
  });

  test('stored pin opens without a deep link; default otherwise', () => {
    assert.equal(
      openSettingsSectionFor(base({ settings: { settingsSection: 'reciter' } })),
      'settings-sec-reciter'
    );
    assert.equal(openSettingsSectionFor(base()), 'settings-sec-language');
    assert.equal(
      openSettingsSectionFor(base({ activeParams: { id: 'nope' } })),
      'settings-sec-language'
    );
  });

  test('hostile shapes degrade to the default', () => {
    assert.equal(openSettingsSectionFor(null), 'settings-sec-language');
    assert.equal(openSettingsSectionFor({}), 'settings-sec-language');
    assert.equal(
      openSettingsSectionFor({ activeParams: 'x', settings: null }),
      'settings-sec-language'
    );
  });
});

describe('palette settings rows deep-link to sections', () => {
  const deps = (query) => ({
    query,
    lang: 'en',
    libraryHits: [],
    surahs: [],
    ayahIndex: null,
    reciters: [],
    books: [],
    history: [],
    journal: [],
  });

  test('a matching section links to its slug with a real title', () => {
    const { groups } = buildPaletteGroups(deps('reciter'));
    const g = groups.find((x) => x.key === 'settings');
    assert.ok(g && g.rows.length >= 1, 'reciter matches a section');
    const row = g.rows[0];
    assert.equal(row.href, '#/settings/reciter');
    assert.deepEqual(row.data, { view: 'settings', id: 'reciter' });
    assert.ok(!String(row.primary).includes('undefined'), 'no undefined titles');
    assert.match(String(row.primary), /Reciter|reciter/);
  });

  test('empty query shows no settings group (early-return design)', () => {
    const { groups } = buildPaletteGroups(deps(''));
    assert.ok(!groups.some((x) => x.key === 'settings'));
  });

  test('misses stay absent', () => {
    const { groups } = buildPaletteGroups(deps('zzz-no-match'));
    assert.ok(!groups.some((x) => x.key === 'settings'));
  });
});

describe('section wiring: toggle persists, deep NAVIGATE persists', () => {
  const events = readFileSync(new URL('../js/app/events.js', import.meta.url), 'utf8');
  const sub = readFileSync(new URL('../js/app/stateSub.js', import.meta.url), 'utf8');

  test('the toggle listener stores the slug in settings', () => {
    assert.ok(
      events.includes('actions.updateSettings({ settingsSection: slug })'),
      'toggle must persist the open section'
    );
    assert.ok(
      events.includes('actions.updateSettings({ settingsSection: null })'),
      'toggle must clear the pin on close'
    );
    assert.ok(!events.includes('setOpenSettingsSection'), 'module pin is gone');
  });

  test('a settings deep-link NAVIGATE stores its slug', () => {
    assert.ok(
      sub.includes('settingsSectionForSlug(action.params'),
      'stateSub must resolve the deep-link slug'
    );
  });
});
