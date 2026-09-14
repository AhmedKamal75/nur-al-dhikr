/**
 * tests/a11yPrefs.test.js — item 16 (theming/a11y) gates:
 *  1. the two reading-comfort prefs sanitize to false and ride
 *     updateSettings like every other setting;
 *  2. the accessibility section renders both toggles (EN + AR, named);
 *  3. the OS prefers-contrast block mirrors the high-contrast border
 *     hardening selector-for-selector (one rule change lands in both);
 *  4. prefers-reduced-transparency kills every backdrop-filter site and
 *     resolves washes to opaque tokens (no transparency left);
 *  5. dyslexia/roomy blocks exist with their documented values;
 *  6. theme.js publishes both data attributes; strings ship EN + AR.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { sanitizeSettings } from '../js/core/config.js';
import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { renderSettings } from '../js/views/settings.js';

const css = readFileSync(new URL('../assets/css/accessibility.css', import.meta.url), 'utf8');
const themeSrc = readFileSync(new URL('../js/core/theme.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

function settingsState(over = {}) {
  return {
    settings: { language: 'en', ...over },
    reminders: [],
    profiles: [],
    activeProfile: 'main',
  };
}

describe('reading-comfort prefs: sanitize + state', () => {
  test('default false, hostile coerces', () => {
    const clean = sanitizeSettings({});
    assert.equal(clean.dyslexiaFriendly, false);
    assert.equal(clean.roomySpacing, false);
    const hostile = sanitizeSettings({ dyslexiaFriendly: 'yes', roomySpacing: 1 });
    assert.equal(hostile.dyslexiaFriendly, false);
    assert.equal(hostile.roomySpacing, false);
    const on = sanitizeSettings({ dyslexiaFriendly: true, roomySpacing: true });
    assert.equal(on.dyslexiaFriendly, true);
    assert.equal(on.roomySpacing, true);
  });

  test('updateSettings carries both flags', () => {
    const s = reduce(initialState(), actions.updateSettings({ dyslexiaFriendly: true }));
    assert.equal(s.settings.dyslexiaFriendly, true);
    const s2 = reduce(s, actions.updateSettings({ roomySpacing: true }));
    assert.equal(s2.settings.roomySpacing, true);
    assert.equal(s2.settings.dyslexiaFriendly, true, 'patches merge');
  });
});

describe('accessibility section renders both toggles', () => {
  test('EN + AR labels with stable data-keys', () => {
    for (const lang of ['en', 'ar']) {
      const html = renderSettings(settingsState({ language: lang }));
      assert.ok(html.includes('data-action="toggle-setting"'), `toggle pipeline (${lang})`);
      assert.ok(html.includes('data-key="dyslexiaFriendly"'), `dyslexia key (${lang})`);
      assert.ok(html.includes('data-key="roomySpacing"'), `roomy key (${lang})`);
    }
    const enHtml = renderSettings(settingsState({}));
    assert.ok(enHtml.includes('Dyslexia-friendly reading'), 'EN dyslexia label');
    assert.ok(enHtml.includes('Roomier text spacing'), 'EN roomy label');
    const arHtml = renderSettings(settingsState({ language: 'ar' }));
    assert.ok(arHtml.includes('عسر القراءة'), 'AR dyslexia label');
    assert.ok(arHtml.includes('تباعد أكبر للنص'), 'AR roomy label');
  });
});

describe('prefers-contrast mirrors the high-contrast hardening', () => {
  const block = /@media \(prefers-contrast: more\) \{([\s\S]*?)\n\}/.exec(css)?.[1] || '';

  test('media block exists with the full selector mirror', () => {
    assert.ok(block.length > 0, 'prefers-contrast block missing');
    for (const sel of [
      '.chip',
      '.btn--secondary',
      '.input',
      '.select',
      '.textarea',
      '.search-bar__input',
      '.card',
      '.panel',
      '.stat-card',
      '.ayah-card',
      '.hadith-card',
      ':focus-visible',
    ]) {
      assert.ok(block.includes(sel), `mirror missing ${sel}`);
    }
    assert.ok(block.includes('border-width: 2px'), 'border hardening mirrored');
    assert.ok(block.includes('outline-width: 3px'), 'focus hardening mirrored');
  });
});

describe('prefers-reduced-transparency goes fully opaque', () => {
  const block =
    /@media \(prefers-reduced-transparency: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] || '';

  test('every frosted site loses blur and wash', () => {
    assert.ok(block.length > 0, 'reduced-transparency block missing');
    for (const sel of [
      '.player-bar',
      '.prayer-list',
      '.home-hero__title',
      '.home-hero__hijri',
      '#topbar',
    ]) {
      assert.ok(block.includes(sel), `site unresolved: ${sel}`);
    }
    assert.ok(block.includes('backdrop-filter: none'), 'blur killed');
    assert.ok(!block.includes('transparent'), 'no translucent wash remains');
    assert.ok(
      block.includes('var(--color-surface)') && block.includes('var(--color-bg)'),
      'opaque tokens'
    );
  });
});

describe('dyslexia and roomy blocks carry their documented values', () => {
  test('dyslexia: legible stack + wider rhythm', () => {
    assert.ok(css.includes("[data-dyslexia='true']"), 'dyslexia attribute block missing');
    assert.ok(css.includes('letter-spacing: 0.035em'), 'dyslexia letter spacing');
    assert.ok(css.includes('word-spacing: 0.16em'), 'dyslexia word spacing');
    assert.ok(css.includes('Verdana'), 'legible Latin stack');
  });

  test('roomy: WCAG 1.4.12 minima on reading surfaces', () => {
    assert.ok(css.includes("[data-roomy='true']"), 'roomy attribute block missing');
    assert.ok(css.includes('line-height: 1.8'), 'roomy line height');
    assert.ok(css.includes('letter-spacing: 0.12em'), 'roomy letter spacing');
    for (const sel of [
      '.card__translation',
      '.journal-entry__text',
      '.ayah-card__translation',
      '.hadith-card__translation',
    ]) {
      assert.ok(css.includes(sel), `roomy surface missing: ${sel}`);
    }
  });
});

describe('theme.js publishes the reading-comfort attributes', () => {
  test('both data attributes are set from settings', () => {
    assert.ok(
      themeSrc.includes("root.setAttribute('data-dyslexia', String(!!settings.dyslexiaFriendly))"),
      'dyslexia attr missing'
    );
    assert.ok(
      themeSrc.includes("root.setAttribute('data-roomy', String(!!settings.roomySpacing))"),
      'roomy attr missing'
    );
  });
});

describe('a11y strings ship EN + AR', () => {
  test('both reading-comfort keys exist', () => {
    for (const key of ['settings.dyslexiaFriendly', 'settings.roomySpacing']) {
      assert.ok(en.includes(`'${key}'`), `EN missing ${key}`);
      assert.ok(ar.includes(`'${key}'`), `AR missing ${key}`);
    }
  });
});
