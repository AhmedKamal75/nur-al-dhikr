import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('P0 fullscreen controls leave the viewport when idle', async () => {
  const css = await read('assets/css/quran.css');
  const idle = css.slice(css.indexOf('body.mushaf-fs-idle .mushaf-fs-controls'));
  assert.match(idle, /opacity:\s*0;/);
  assert.match(idle, /visibility:\s*hidden;/);
  assert.match(idle, /translateY\(calc\(100%/);
});

test('P0 location denial has recovery guidance and manual city fallback', async () => {
  const handler = await read('js/app/handlers/location.js');
  const forms = await read('js/app/forms.js');
  const en = await read('js/core/i18n/en.js');
  const ar = await read('js/core/i18n/ar.js');
  assert.match(handler, /locationPermissionGuidanceHTML/);
  assert.match(forms, /name="cityPreset"/);
  assert.match(forms, /CITY_PRESETS/);
  for (const source of [en, ar]) {
    assert.match(source, /locationHelpTitle/);
    assert.match(source, /locationHelpStep1/);
    assert.match(source, /useManualLocation/);
  }
});

test('P0 Mushaf navigation routes only through the awaitable page-ready guard', async () => {
  const quran = await read('js/app/handlers/quran.js');
  const events = await read('js/app/events.js');
  assert.match(quran, /export async function navigateMushafPage/);
  assert.match(quran, /ensureMushafNavigationPages\(dest\)/);
  assert.match(events, /navigateMushafPage\(toNext \? 'next' : 'prev'\)/);
  assert.match(events, /navigateMushafPage\(turn\)/);
});
