import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('last-resort error screen is semantic, bilingual, and forced-colors safe', () => {
  const drawer = read('js/app/drawer.js');
  const css = read('assets/css/accessibility.css');

  assert.match(
    drawer,
    /class=\"error-screen\" lang=\"\$\{lang\}\" dir=\"\$\{lang === 'ar' \? 'rtl' : 'ltr'\}\"/
  );
  assert.doesNotMatch(drawer, /error-reload-btn[^>]*style=|error-reset-btn[^>]*style=/);
  assert.match(drawer, /error-screen__button--danger/);

  assert.match(css, /\.error-screen\s*\{/);
  assert.match(css, /padding-block-start:\s*max\(1\.5rem, env\(safe-area-inset-top/);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.error-screen/);
  assert.match(css, /\.error-screen__button:focus-visible/);
});

test('release markers are aligned at the current release', () => {
  const pkg = JSON.parse(read('package.json'));
  const version = pkg.version;
  assert.match(version, /^5\.17\.\d+$/);
  const escaped = version.replaceAll('.', '\\.');
  assert.match(read('js/core/config.js'), new RegExp(`APP_VERSION = '${escaped}'`));
  assert.match(read('manifest.json'), new RegExp(`\\"version\\": \"${escaped}\\"`));
  assert.match(read('sw.js'), new RegExp(`nur-al-dhikr-v${escaped}`));
  assert.match(read('CHANGELOG.md'), new RegExp(`v${escaped}`));
});
