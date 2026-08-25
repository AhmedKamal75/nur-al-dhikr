/**
 * migration.js
 * Converts legacy or partially-shaped documents into the current unified schema
 * before they reach schema.js normalization. Nothing is ever discarded silently:
 * unknown top-level fields are preserved under `_legacy`.
 */

import { SCHEMA_VERSION } from './config.js';

/**
 * Detect the shape of an incoming document and migrate it forward.
 * Supported legacy shapes:
 *  - schema_version 1: { version:1, sections:[{ category, items:[{ ar, en, translit, ... }] }] }
 *  - flat array: [{ arabic, translation, ... }] (no wrapper at all)
 *  - already-current: { schema_version: 2, metadata, categories }
 */
export function migrate(raw, fallbackId = 'imported') {
  if (raw && raw.schema_version === SCHEMA_VERSION && Array.isArray(raw.categories)) {
    return raw; // already current
  }

  // Flat array of items with no categories wrapper.
  if (Array.isArray(raw)) {
    return {
      schema_version: SCHEMA_VERSION,
      metadata: { id: fallbackId, name: { en: fallbackId, ar: fallbackId }, description: { en: '', ar: '' }, version: '1.0.0', source: { en: '', ar: '' } },
      categories: [
        {
          id: `${fallbackId}-general`,
          section_id: fallbackId,
          name: { en: 'General', ar: 'عام' },
          description: { en: '', ar: '' },
          order: 1,
          icon: 'book',
          color: 'slate',
          items: raw.map((it, idx) => migrateLegacyItem(it, `${fallbackId}-general`, idx))
        }
      ]
    };
  }

  // schema_version 1 style: { version:1, sections:[...] }
  if (raw && (raw.version === 1 || raw.schema_version === 1) && Array.isArray(raw.sections)) {
    return {
      schema_version: SCHEMA_VERSION,
      metadata: {
        id: raw.id || fallbackId,
        name: typeof raw.name === 'string' ? { en: raw.name, ar: '' } : (raw.name || { en: fallbackId, ar: '' }),
        description: { en: '', ar: '' },
        version: '1.0.0',
        source: { en: '', ar: '' }
      },
      categories: raw.sections.map((sec, sIdx) => ({
        id: sec.id || `${fallbackId}-cat-${sIdx}`,
        section_id: raw.id || fallbackId,
        name: typeof sec.category === 'string' ? { en: sec.category, ar: sec.category_ar || '' } : (sec.name || { en: `Section ${sIdx + 1}`, ar: '' }),
        description: { en: '', ar: '' },
        order: sIdx + 1,
        icon: sec.icon || 'book',
        color: sec.color || 'slate',
        items: (sec.items || []).map((it, idx) => migrateLegacyItem(it, sec.id || `${fallbackId}-cat-${sIdx}`, idx))
      }))
    };
  }

  // Already has categories but wrong/missing schema_version — pass through metadata as-is.
  if (raw && Array.isArray(raw.categories)) {
    return { ...raw, schema_version: SCHEMA_VERSION };
  }

  // Totally unknown shape: wrap it as an empty document but keep the raw payload for inspection.
  console.warn('[migration] Unrecognized document shape; producing an empty library.', raw);
  return {
    schema_version: SCHEMA_VERSION,
    metadata: { id: fallbackId, name: { en: fallbackId, ar: fallbackId }, description: { en: '', ar: '' }, version: '0.0.0', source: { en: '', ar: '' } },
    categories: [],
    _legacy: raw
  };
}

/** Map common legacy field names (ar/en/translit/ref/source) onto the current item shape. */
function migrateLegacyItem(it, categoryId, idx) {
  if (!it || typeof it !== 'object') return {};
  return {
    id: it.id || `${categoryId}-${idx + 1}`,
    category_id: categoryId,
    title: it.title || { en: it.title_en || '', ar: it.title_ar || '' },
    arabic: it.arabic || it.ar || it.text || '',
    transliteration: it.transliteration || it.translit || it.transliterated || '',
    translation: it.translation || { en: it.en || it.meaning || '', ar: it.translation_ar || '' },
    reference: it.reference || { collection: it.source || it.ref || '', book: '', chapter: '', hadith: it.hadith || '', url: '', notes: '' },
    grade: it.grade || it.authenticity || 'Unknown',
    custom_grade: it.custom_grade || { en: '', ar: '' },
    repetitions: it.repetitions || it.repeat || it.count || 1,
    virtues: it.virtues || it.virtue || { en: it.benefit || '', ar: '' },
    audio: it.audio || null,
    image: it.image || null,
    tags: it.tags || [],
    related: it.related || [],
    order: it.order ?? idx
  };
}
