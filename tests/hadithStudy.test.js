/**
 * tests/hadithStudy.test.js — (v5.10.1) narrator extraction + grade guide:
 * high-confidence EN/AR patterns, enriched-field precedence, chain-style
 * honesty (null over wrong), and card/guide rendering.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  hadithNarratorFromEn,
  hadithNarratorFromAr,
  hadithNarrator,
  HADITH_GRADE_IDS,
} from '../js/domain/hadithStudy.js';
import { hadithCardHTML } from '../js/views/hadithCard.js';

describe('hadithNarratorFromEn', () => {
  test('canonical patterns', () => {
    assert.equal(
      hadithNarratorFromEn("Narrated 'Umar bin Al-Khattab: I heard..."),
      "'Umar bin Al-Khattab"
    );
    assert.equal(
      hadithNarratorFromEn('Narrated Aisha: (the mother of the faithful believers) The...'),
      'Aisha'
    );
    assert.equal(hadithNarratorFromEn('Anas b. Malik reported:When...'), 'Anas b. Malik');
    assert.equal(hadithNarratorFromEn('Abu Hurairah said:"The Messenger...'), 'Abu Hurairah');
    assert.equal(
      hadithNarratorFromEn('It was narrated from Thawban that:The Messenger...'),
      'Thawban'
    );
    assert.equal(
      hadithNarratorFromEn("It is narrated on the authority of Yahya b. Ya'mur that..."),
      "Yahya b. Ya'mur"
    );
  });

  test('chains and pronouns yield null, never a wrong name', () => {
    assert.equal(hadithNarratorFromEn('Zuhayr narrated to me, Ismail...'), null);
    assert.equal(hadithNarratorFromEn('He said:"The Messenger...'), null);
    assert.equal(hadithNarratorFromEn('The Prophet (ﷺ) said:"When...'), null);
    // (v5.10.2) passive openers are never names — the lazy groups used to
    // capture "It is" as a narrator across much of Sahih Muslim.
    assert.equal(hadithNarratorFromEn('It is reported on the authority of Talha that...'), 'Talha');
    assert.equal(
      hadithNarratorFromEn("It is narrated on the authority of ('Abdullah) son of Umar..."),
      null,
      'parenthetical fragment is not a name'
    );
    assert.equal(hadithNarratorFromEn(''), null);
    assert.equal(hadithNarratorFromEn(null), null);
  });
});

describe('hadithNarratorFromAr', () => {
  test('companion before the taraDDi formula', () => {
    assert.equal(
      hadithNarratorFromAr(
        'حدثنا الحميدي، قال: حدثنا سفيان، أنه سمع عمر بن الخطاب رضي الله عنه على المنبر'
      ),
      'عمر بن الخطاب'
    );
    assert.equal(hadithNarratorFromAr('قال رسول الله صلى الله عليه وسلم'), null);
    assert.equal(hadithNarratorFromAr(''), null);
  });
});

describe('hadithNarrator precedence', () => {
  test('enriched field wins; language-appropriate first', () => {
    const h = { n: 1, ar: '...', en: "Narrated 'Umar: ...", narrator: 'Custom Narrator' };
    assert.equal(hadithNarrator(h, 'en'), 'Custom Narrator');
    assert.equal(hadithNarrator(null), null);
    const h2 = { n: 2, ar: '...', en: "Narrated 'Umar: ..." };
    assert.equal(hadithNarrator(h2, 'en'), "'Umar");
  });
});

describe('hadith card + guide strings', () => {
  test('narrator line and enriched grade chip render', () => {
    const html = hadithCardHTML(
      { n: 1, ar: 'نص', en: "Narrated 'Umar: ...", grade: 'hasan' },
      { lang: 'en', bookId: 'bukhari' }
    );
    assert.match(html, /hadith-card__narrator/, 'narrator line');
    assert.match(html, /Narrated by/, 'label');
    assert.match(html, /chip--grade-hasan/, 'enriched grade chip');
  });

  test('ambiguous rows render no line, unknown grades no chip', () => {
    const html = hadithCardHTML(
      { n: 1, ar: 'نص', en: 'Zuhayr narrated to me, Ismail...', grade: 'invented' },
      { lang: 'en', bookId: 'muslim' }
    );
    assert.doesNotMatch(html, /hadith-card__narrator/, 'no narrator line');
    assert.doesNotMatch(html, /chip--grade-invented/, 'no invented chip');
  });

  test('grade vocabulary covers the validator set', () => {
    assert.deepEqual([...HADITH_GRADE_IDS], ['sahih', 'hasan', 'daif', 'mawdu']);
  });
});
