/**
 * tests/journalEdit.test.js — item 6 (journal edit + pagination) gates:
 *  1. DUA_JOURNAL_EDIT / REFLECTION_EDIT update text in place (order and
 *     timestamps untouched; empty or unknown edits no-op; caps hold);
 *  2. clampJournalPage bounds hostile page input;
 *  3. the view paginates (10/page, pager preserves tab + filter, hostile
 *     pages clamp) instead of the old hard .slice(0, 50);
 *  4. `?edit=` renders the in-place editor for exactly one entry (escaped),
 *     unknown ids render nothing special;
 *  5. handler keys are registered and the pager string ships EN + AR.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { reduce } from '../js/core/state/reducer.js';
import { initialState } from '../js/core/state/initial.js';
import { actions } from '../js/core/state/actions.js';
import { JOURNAL_PAGE_SIZE, clampJournalPage, renderJournal } from '../js/views/journal.js';

function dua(id, n) {
  return { id, ts: 1000 + n, date: '2026-05-10', text: `dua ${n}`, answered: false };
}

function journalState(over = {}) {
  const s = initialState();
  return {
    ...s,
    settings: { ...s.settings, language: 'en' },
    activeParams: {},
    duaJournal: [],
    reflections: [],
    ...over,
  };
}

describe('journal edit reducer: text in place, order stable', () => {
  test('dua edit updates text only', () => {
    const s0 = { ...journalState(), duaJournal: [dua('d2', 2), dua('d1', 1)] };
    const s = reduce(s0, actions.editDua('d1', '  edited  '));
    assert.deepEqual(
      s.duaJournal.map((e) => [e.id, e.text, e.ts]),
      [
        ['d2', 'dua 2', 1002],
        ['d1', 'edited', 1001],
      ]
    );
  });

  test('reflection edit updates text only (8000 cap)', () => {
    const r = { id: 'r1', ts: 5, week: '2026-W20', promptId: '', text: 'old' };
    const s = reduce({ ...journalState(), reflections: [r] }, actions.editReflection('r1', 'new'));
    assert.equal(s.reflections[0].text, 'new');
    assert.equal(s.reflections[0].ts, 5);
    const capped = reduce(
      { ...journalState(), reflections: [r] },
      actions.editReflection('r1', 'x'.repeat(9000))
    );
    assert.equal(capped.reflections[0].text.length, 8000);
  });

  test('empty or unknown edits no-op', () => {
    const s0 = { ...journalState(), duaJournal: [dua('d1', 1)] };
    assert.equal(reduce(s0, actions.editDua('d1', '   ')), s0, 'empty text keeps the ref');
    assert.equal(reduce(s0, actions.editDua(null, 'x')), s0, 'missing id keeps the ref');
    assert.deepEqual(reduce(s0, actions.editDua('nope', 'x')), s0, 'unknown id changes nothing');
    const r0 = {
      ...journalState(),
      reflections: [{ id: 'r1', ts: 5, week: '2026-W20', promptId: '', text: 'old' }],
    };
    assert.equal(reduce(r0, actions.editReflection('r1', '')), r0);
    assert.deepEqual(reduce(r0, actions.editReflection('nope', 'x')), r0);
  });

  test('dua text caps at 4000 chars', () => {
    const s = reduce(
      { ...journalState(), duaJournal: [dua('d1', 1)] },
      actions.editDua('d1', 'y'.repeat(5000))
    );
    assert.equal(s.duaJournal[0].text.length, 4000);
  });
});

describe('clampJournalPage: hostile pages stay in range', () => {
  test('bounds and coercion', () => {
    assert.equal(JOURNAL_PAGE_SIZE, 10);
    assert.equal(clampJournalPage(undefined, 25), 1);
    assert.equal(clampJournalPage('zzz', 25), 1);
    assert.equal(clampJournalPage(0, 25), 1);
    assert.equal(clampJournalPage(-3, 25), 1);
    assert.equal(clampJournalPage(2, 25), 2);
    assert.equal(clampJournalPage(99, 25), 3);
    assert.equal(clampJournalPage(5, 0), 1);
    assert.equal(clampJournalPage(1.9, 25), 1);
  });
});

describe('journal view: pagination replaces the hard slice', () => {
  const many = Array.from({ length: 12 }, (_, i) => dua(`d${i}`, 12 - i));

  test('page 1 shows ten with a pager; page 2 shows the rest', () => {
    const p1 = renderJournal(journalState({ duaJournal: many }));
    for (let i = 0; i < 10; i += 1)
      assert.ok(p1.includes(`>dua ${12 - i}</p>`), `page 1 has dua ${12 - i}`);
    assert.ok(!p1.includes('>dua 2</p>') && !p1.includes('>dua 1</p>'), 'tail stays on page 2');
    assert.ok(p1.includes('data-action="journal-page"'), 'pager renders');
    assert.ok(p1.includes('page 1/2'), 'pager status');
    const p2 = renderJournal(journalState({ duaJournal: many, activeParams: { page: '2' } }));
    assert.ok(!p2.includes('>dua 12</p>'), 'page 2 drops page-1 rows');
    assert.ok(p2.includes('>dua 2</p>') && p2.includes('>dua 1</p>'), 'page 2 keeps the tail');
    assert.ok(p2.includes('page 2/2'), 'pager status follows');
  });

  test('a single page hides the pager', () => {
    const html = renderJournal(journalState({ duaJournal: [dua('d1', 1)] }));
    assert.ok(!html.includes('data-action="journal-page"'), 'no pager for one page');
  });

  test('hostile pages clamp instead of emptying', () => {
    const html = renderJournal(journalState({ duaJournal: many, activeParams: { page: '99' } }));
    assert.ok(html.includes('page 2/2'), 'clamps to the last page');
    assert.ok(html.includes('dua 1'), 'clamped page still lists rows');
  });

  test('pager buttons preserve tab + filter', () => {
    const html = renderJournal(
      journalState({
        duaJournal: many,
        activeParams: { q: 'dua', page: '1' },
      })
    );
    assert.ok(html.includes('data-q="dua"'), 'filter survives paging');
    assert.ok(html.includes('data-tab="duas"'), 'tab survives paging');
    const refl = Array.from({ length: 11 }, (_, i) => ({
      id: `r${i}`,
      ts: 200 + i,
      week: '2026-W20',
      promptId: '',
      text: `thought ${i}`,
    }));
    const rh = renderJournal(
      journalState({ reflections: refl, activeParams: { tab: 'reflections' } })
    );
    assert.ok(rh.includes('data-tab="reflections"'), 'reflections pager keeps its tab');
    assert.ok(!rh.includes('>thought 10</p>'), 'eleventh reflection waits on page 2');
    assert.ok(rh.includes('data-action="journal-page"'), 'pager renders for 11 rows');
    const rh2 = renderJournal(
      journalState({ reflections: refl, activeParams: { tab: 'reflections', page: '2' } })
    );
    assert.ok(rh2.includes('>thought 10</p>'), 'page 2 shows the tail');
  });
});

describe('journal view: ?edit= in-place editor', () => {
  const two = [dua('d2', 2), dua('d1', 1)];

  test('exactly the targeted entry becomes a textarea with save/cancel', () => {
    const html = renderJournal(journalState({ duaJournal: two, activeParams: { edit: 'd1' } }));
    assert.ok(html.includes('data-bind="journal-edit-text"'), 'editor renders');
    assert.ok(html.includes('data-action="dua-edit-save"'), 'save control');
    assert.ok(html.includes('data-action="journal-edit-cancel"'), 'cancel control');
    assert.ok(html.includes('>dua 1</textarea>'), 'editor prefilled with stored text');
    // The other row stays a reader with its own edit opener.
    assert.ok(html.includes('dua 2</p>') || html.includes('>dua 2<'), 'sibling stays text');
    assert.ok(html.includes('data-action="journal-edit-open"'), 'sibling keeps its edit opener');
  });

  test('unknown edit ids render no editor', () => {
    const html = renderJournal(journalState({ duaJournal: two, activeParams: { edit: 'nope' } }));
    assert.ok(!html.includes('data-bind="journal-edit-text"'), 'no editor for ghosts');
    assert.ok(!html.includes('data-action="dua-edit-save"'), 'no save for ghosts');
  });

  test('editor text is escaped (no markup injection)', () => {
    const evil = [
      {
        id: 'dx',
        ts: 9,
        date: '2026-05-10',
        text: '</textarea><script>x</script>',
        answered: false,
      },
    ];
    const html = renderJournal(journalState({ duaJournal: evil, activeParams: { edit: 'dx' } }));
    assert.doesNotMatch(html, /<\/textarea><script>/);
    assert.ok(html.includes('&lt;/textarea&gt;'), 'markup survives visibly, inert');
  });

  test('reflections edit the same way', () => {
    const r = [{ id: 'r1', ts: 5, week: '2026-W20', promptId: '', text: 'old thought' }];
    const html = renderJournal(
      journalState({ reflections: r, activeParams: { tab: 'reflections', edit: 'r1' } })
    );
    assert.ok(html.includes('data-bind="journal-edit-text"'), 'reflection editor renders');
    assert.ok(html.includes('data-action="reflection-edit-save"'), 'reflection save control');
    assert.ok(html.includes('>old thought</textarea>'), 'prefilled');
  });
});

describe('journal edit wiring: handlers and strings', () => {
  const handlers = readFileSync(new URL('../js/app/handlers/journal.js', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../js/core/i18n/en.js', import.meta.url), 'utf8');
  const ar = readFileSync(new URL('../js/core/i18n/ar.js', import.meta.url), 'utf8');

  test('all four navigation/edit keys are registered', () => {
    for (const key of [
      'journal-page',
      'journal-edit-open',
      'journal-edit-cancel',
      'dua-edit-save',
      'reflection-edit-save',
    ]) {
      assert.ok(handlers.includes(`'${key}'`), `handler missing: ${key}`);
    }
  });

  test('pager status ships EN + AR', () => {
    assert.ok(en.includes("'journal.pageStatus'"), 'EN missing journal.pageStatus');
    assert.ok(ar.includes("'journal.pageStatus'"), 'AR missing journal.pageStatus');
  });
});
