/**
 * tests/launchIntents.test.js — item 24 (manifest handlers) gates:
 *  1. share_target params route at Search with the body text preferred,
 *     capped and trimmed; empty shares fail closed;
 *  2. protocol deep-links accept web+nurdhikr:open?view=<id> and the bare
 *     web+nurdhikr:<id> shape; foreign schemes and unknown views fail
 *     closed; an id rides along capped;
 *  3. the .json gate is extension-based and case-insensitive;
 *  4. manifest.json actually registers share_target + file_handlers +
 *     protocol_handlers + launch_handler with same-app actions;
 *  5. boot consumes each intent once (source-pinned wiring).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  SHARE_PROTOCOL,
  isBackupFile,
  parseProtocolLaunch,
  parseShareTarget,
} from '../js/domain/launchIntents.js';
import { VIEWS } from '../js/core/config/views.js';
import { en as EN_STRINGS } from '../js/core/i18n/en.js';
import { ar as AR_STRINGS } from '../js/core/i18n/ar.js';

const readProject = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

describe('share_target parsing', () => {
  test('body text wins, then url, then title; capped + trimmed', () => {
    assert.deepEqual(parseShareTarget('?text=hello'), { q: 'hello' });
    assert.deepEqual(parseShareTarget('?url=https%3A%2F%2Fx.test%2Fa&title=T'), {
      q: 'https://x.test/a',
    });
    assert.deepEqual(parseShareTarget('?title=Only+Title'), { q: 'Only Title' });
    assert.deepEqual(parseShareTarget('?text=%20%20padded%20%20'), { q: 'padded' });
    const long = parseShareTarget(`?text=${'a'.repeat(5000)}`);
    assert.equal(long.q.length, 200, 'search-box cap, not field cap');
  });

  test('empty shares fail closed', () => {
    assert.equal(parseShareTarget(''), null);
    assert.equal(parseShareTarget('?foo=bar'), null);
    assert.equal(parseShareTarget('?text=%20%20'), null);
  });
});

describe('protocol deep-links', () => {
  const enc = (s) => `?proto=${encodeURIComponent(s)}`;

  test('open-shape and bare-shape route known views', () => {
    assert.deepEqual(parseProtocolLaunch(enc(`${SHARE_PROTOCOL}open?view=tasbih`)), {
      view: VIEWS.TASBIH,
      params: {},
    });
    assert.deepEqual(parseProtocolLaunch(enc(`${SHARE_PROTOCOL}tasbih`)), {
      view: VIEWS.TASBIH,
      params: {},
    });
    assert.deepEqual(parseProtocolLaunch(enc(`${SHARE_PROTOCOL}//quran`)), {
      view: VIEWS.QURAN,
      params: {},
    });
  });

  test('an id rides along capped', () => {
    const got = parseProtocolLaunch(enc(`${SHARE_PROTOCOL}open?view=category&id=morning`));
    assert.deepEqual(got, { view: VIEWS.CATEGORY, params: { id: 'morning' } });
  });

  test('foreign schemes, unknown views and junk fail closed', () => {
    assert.equal(parseProtocolLaunch(''), null);
    assert.equal(parseProtocolLaunch('?proto=notasetup'), null);
    assert.equal(parseProtocolLaunch(enc('https://evil.test/x')), null);
    assert.equal(parseProtocolLaunch(enc(`${SHARE_PROTOCOL}open?view=nope`)), null);
    assert.equal(parseProtocolLaunch(enc(`${SHARE_PROTOCOL}open`)), null);
    assert.equal(parseProtocolLaunch(enc(`${SHARE_PROTOCOL}//`)), null);
  });
});

describe('file_handlers gate', () => {
  test('.json only, case-insensitive, hostile-safe', () => {
    assert.equal(isBackupFile('nur-backup-2026-09-14.json'), true);
    assert.equal(isBackupFile('PLAN.JSON'), true);
    assert.equal(isBackupFile('notes.txt'), false);
    assert.equal(isBackupFile('noext'), false);
    assert.equal(isBackupFile(''), false);
    assert.equal(isBackupFile(null), false);
    assert.equal(isBackupFile(undefined), false);
  });
});

describe('manifest wiring', () => {
  test('all four handlers registered with same-app actions', () => {
    const manifest = JSON.parse(readProject('manifest.json'));
    assert.equal(manifest.share_target.method, 'GET');
    assert.equal(manifest.share_target.action, './index.html');
    assert.deepEqual(Object.keys(manifest.share_target.params).sort(), ['text', 'title', 'url']);
    assert.equal(manifest.file_handlers.length, 1);
    assert.equal(manifest.file_handlers[0].action, './index.html');
    assert.deepEqual(manifest.file_handlers[0].accept, { 'application/json': ['.json'] });
    assert.equal(manifest.protocol_handlers.length, 1);
    assert.equal(manifest.protocol_handlers[0].protocol, 'web+nurdhikr');
    assert.ok(manifest.protocol_handlers[0].url.startsWith('./index.html?proto=%s'));
    assert.equal(manifest.launch_handler.client_mode, 'focus-existing');
  });

  test('share.received exists in EN + AR', () => {
    assert.ok(EN_STRINGS['share.received']);
    assert.ok(AR_STRINGS['share.received']);
  });

  test('boot consumes each intent once (source-pinned)', () => {
    const src = readProject('js/app/boot.js');
    assert.ok(src.includes('consumeLaunchIntents()'), 'consumed after first NAVIGATE');
    assert.ok(src.includes('parseShareTarget'), 'share branch wired');
    assert.ok(src.includes('parseProtocolLaunch'), 'protocol branch wired');
    assert.ok(src.includes('launchQueue') && src.includes('setConsumer'), 'file consumer wired');
    assert.ok(src.includes('handleImportFile'), 'open-with reuses the backup confirm flow');
    assert.ok(src.includes('stripLaunchQuery'), 'one-shot query stripped');
  });
});
