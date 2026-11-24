import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../js/core/state/initial.js';
import { renderHome } from '../js/views/home.js';
import { renderCalendar } from '../js/views/calendar.js';
import { readFileSync } from 'node:fs';
import { processDocument } from '../js/core/schema.js';
for (const lang of ['en', 'ar'])
  test(`recent count uses complete eligible history, not raw prefix (${lang})`, () => {
    const st = initialState();
    st.settings.language = lang;
    st.settings.homeOrder = ['recent'];
    st.settings.hiddenHome.recent = false;
    const doc = processDocument(
      JSON.parse(readFileSync(new URL('../data/adhkar.json', import.meta.url)))
    ).value;
    st.library = {
      ...st.library,
      itemIndex: Object.fromEntries(
        doc.categories.flatMap((category) =>
          category.items.map((item) => [item.id, { item, category, document: doc }])
        )
      ),
    };
    const ids = Object.keys(st.library.itemIndex).slice(0, 12);
    st.history = [{ itemId: 'missing' }, ...ids.map((itemId) => ({ itemId })), { itemId: ids[0] }];
    const before = JSON.stringify(st.history);
    const panel = (html) =>
      html.match(/<section class="panel" data-home-recents>[\s\S]*?<\/section>/)?.[0] || '';
    const first = panel(renderHome(st));
    const more = panel(renderHome({ ...st, activeParams: { recent: '6' } }));
    assert.equal((first.match(/<article/g) || []).length, 3);
    assert.equal((more.match(/<article/g) || []).length, 6);
    assert.match(first, /home-recents-more/);
    assert.equal(st.history[0].itemId, 'missing');
    assert.equal(JSON.stringify(st.history), before);
    assert.ok(
      panel(renderHome({ ...st, activeParams: { recent: '-2' } })).includes('data-count="6"')
    );
  });
test('calendar continuation is scoped to the selected year source and keeps estimation note', () => {
  const st = initialState();
  st.activeParams = { events: '100', month: '2026-02' };
  const html = renderCalendar(st);
  assert.ok(html.includes('data-calendar-event-count') || !html.includes('event-list'));
  assert.ok(!html.includes('data-action="calendar-events-more"'));
  assert.ok(html.includes('Calendar') || html.includes('التقويم'));
});
