import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../js/views/offline.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

test('Offline keeps the download task primary and groups management behind one disclosure', () => {
  assert.match(view, /offline-download-all/);
  assert.match(view, /<details class="offline-management-disclosure">/);
  assert.match(view, /offline-management-disclosure__summary/);
  assert.match(view, /offline-management-disclosure__body/);
});

test('Offline management disclosure retains group, storage, and audio tools', () => {
  const body =
    view.match(/<details class="offline-management-disclosure">([\s\S]*?)<\/details>/)?.[1] || '';
  assert.match(body, /offline\.groupsTitle/);
  assert.match(body, /offline\.storageModeTitle/);
  assert.match(body, /offline\.audioTitle/);
});

test('Offline management summary is bilingual', () => {
  assert.match(en, /'offline\.manageTitle': 'Manage offline storage'/);
  assert.match(ar, /'offline\.manageTitle': 'إدارة التخزين دون اتصال'/);
});
