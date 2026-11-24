import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sadaqahHistoryHTML } from '../js/views/home.js';
import { renderHadith } from '../js/views/hadith.js';
for (const lang of ['en', 'ar']) {
  test(`gift history complete totals and isolated windows (${lang})`, () => {
    const state = {
      settings: { language: lang },
      sadaqahLog: Array.from({ length: 65 }, (_, i) => ({
        id: `g${i}`,
        ts: 1795478400000 - i * 86400000,
        note: `gift code${i}`,
        amount: i + 1,
      })),
    };
    const before = JSON.stringify(state);
    const count = (html) => (html.match(/data-action="sadaqah-remove"/g) || []).length;
    assert.equal(count(sadaqahHistoryHTML(state)), 20);
    assert.equal(count(sadaqahHistoryHTML(state, '', 40)), 40);
    assert.equal(count(sadaqahHistoryHTML(state, '', 80)), 65);
    assert.equal(count(sadaqahHistoryHTML(state, 'code64')), 1);
    assert.equal(count(sadaqahHistoryHTML(state, 'zznone')), 0);
    assert.ok(sadaqahHistoryHTML(state).includes('65'));
    assert.equal(
      count(sadaqahHistoryHTML({ ...state, sadaqahLog: state.sadaqahLog.slice(0, 20) })),
      20
    );
    assert.ok(!sadaqahHistoryHTML({ ...state, sadaqahLog: [] }).includes('sadaqah-history-more'));
    assert.equal(JSON.stringify(state), before);
  });
  test(`hidden recovery full matches/window independent of reader (${lang})`, () => {
    const state = {
      settings: {
        language: lang,
        contentPrefs: {
          hadithPrefs: {
            hiddenHadiths: Object.fromEntries(
              Array.from({ length: 85 }, (_, i) => [`test:${i + 1}`, true])
            ),
          },
        },
      },
      ui: { contentManage: true },
      activeParams: { id: 'test' },
      hadith: {
        index: { books: [{ id: 'test', name: { en: 'Test', ar: 'اختبار' } }] },
        docs: {
          test: {
            id: 'test',
            name: { en: 'Test', ar: 'اختبار' },
            sections: [],
            hadiths: Array.from({ length: 85 }, (_, i) => ({
              n: i + 1,
              b: 1,
              ar: 'نص مخفي',
              en: `hidden token${i + 1}`,
            })),
          },
        },
        bookView: { query: 'zznothing', section: 'all', page: 1 },
      },
    };
    const count = (html) => (html.match(/data-action="hadith-unhide-item"/g) || []).length;
    const render = (patch) =>
      renderHadith({
        ...state,
        hadith: { ...state.hadith, bookView: { ...state.hadith.bookView, ...patch } },
      });
    assert.equal(count(render({})), 40);
    assert.equal(count(render({ recoveryLimit: 80 })), 80);
    assert.equal(count(render({ recoveryLimit: 120 })), 85);
    assert.equal(count(render({ recoveryQuery: 'token85' })), 1);
    assert.equal(count(render({ recoveryQuery: 'zznothing' })), 0);
    assert.ok(render({ recoveryQuery: 'token85' }).includes('data-key="test:85"'));
  });
}
