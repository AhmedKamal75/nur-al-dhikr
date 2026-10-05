import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTafsirPanel } from '../js/views/tafsirPanel.js';

const editions = {
  editions: [
    {
      id: 'muyassar',
      bundled: true,
      category: 'tafsir',
      nameEn: 'Al-Muyassar',
      nameAr: 'التفسير الميسر',
      authorEn: 'Panel of scholars — King Fahd Complex',
      authorAr: 'نخبة من العلماء — مجمع الملك فهد',
    },
    {
      id: 'jadwal',
      bundled: true,
      category: 'grammar',
      nameEn: "Al-Jadwal fi I'rab al-Qur'an",
      nameAr: 'الجدول في إعراب القرآن',
      authorEn: 'Mahmoud Safi',
      authorAr: 'محمود صافي',
    },
  ],
};

function state(lang = 'en', active = 'muyassar') {
  return {
    settings: { language: lang, mushafPrefs: { defaultTafsir: 'muyassar' } },
    tafsirEditions: editions,
    tafsir: { muyassar: { 2: { 255: 'A commentary.' } } },
  };
}

test('Tafsir panel anchors the active source to the exact ayah', () => {
  const html = buildTafsirPanel(state(), 2, 255, 'muyassar');
  assert.match(html, /2:255/);
  assert.match(html, /Al-Muyassar/);
  assert.match(html, /Panel of scholars/);
  assert.match(html, /Current source/);
  assert.doesNotMatch(html, /tafsir-panel__author/, 'author is owned by source metadata');
});

test('Tafsir source metadata follows the selected edition and category', () => {
  const html = buildTafsirPanel(state(), 2, 255, 'jadwal');
  assert.match(html, /Al-Jadwal/);
  assert.match(html, /Mahmoud Safi/);
  assert.match(html, /Grammar/);
});

test('Arabic source context stays Arabic while ayah reference remains direction-safe', () => {
  const html = buildTafsirPanel(state('ar'), 2, 255, 'muyassar');
  assert.match(html, /المصدر الحالي/);
  assert.match(html, /dir="ltr"[^>]*>2:255/);
});
