import test from 'node:test';
import assert from 'node:assert/strict';
import { renderZakat } from '../js/views/zakat.js';
import { en } from '../js/core/i18n/en.js';
import { ar } from '../js/core/i18n/ar.js';

const state = (language = 'en', history = []) => ({
  settings: { language },
  zakat: {
    prefs: {
      basis: 'gold',
      goldPricePerGram: 80,
      silverPricePerGram: 1,
      currency: 'EGP',
      fitrPer: 100,
      fitrPeople: 4,
    },
    inputs: {
      cash: '50000',
      goldGrams: '',
      silverGrams: '',
      investments: '',
      businessGoods: '',
      receivables: '',
      otherAssets: '',
      liabilities: '',
    },
  },
  zakatHistory: history,
});

test('Zakat first view keeps annual calculator surfaces primary', () => {
  const view = renderZakat(state());
  assert.match(view, /Nisab & prices/);
  assert.match(view, />Result</);
  assert.match(view, /<details class="zakat-secondary-disclosure">[\s\S]*Zakat al-Fitr/);
});

test('Zakat Fitr is available but does not compete with the result panel', () => {
  const view = renderZakat(state());
  const resultEnd = view.indexOf('zakat-save-snapshot');
  const fitr = view.indexOf('zakat-secondary-disclosure');
  assert.ok(resultEnd > -1 && fitr > resultEnd, 'secondary Fitr must follow the main result');
  assert.match(view, /zakat-secondary-disclosure__meta/);
  assert.match(view, /Separate household calculation/);
});

test('Zakat saved history is progressive and absent when empty', () => {
  const empty = renderZakat(state());
  assert.doesNotMatch(empty, /saved/);

  const history = [
    {
      id: 'a',
      ts: Date.now(),
      hawlDue: Date.now() + 86400000,
      due: 100,
      currency: 'EGP',
      nisabMet: true,
      remind: true,
    },
  ];
  const withHistory = renderZakat(state('en', history));
  assert.match(withHistory, /Saved calculations & hawl/);
  assert.match(withHistory, /1 saved/);
  assert.match(withHistory, /zakat-delete-snapshot/);
});

test('Zakat secondary disclosure copy exists in both languages', () => {
  assert.equal(typeof en['zakat.fitrSummary'], 'string');
  assert.equal(typeof en['zakat.savedSummary'], 'string');
  assert.equal(typeof ar['zakat.fitrSummary'], 'string');
  assert.equal(typeof ar['zakat.savedSummary'], 'string');
});
