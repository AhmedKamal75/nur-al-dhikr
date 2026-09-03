/**
 * schema.js
 * Validation and normalization for the unified content schema (schema_version 2).
 * Nothing here touches the DOM, network, or storage — pure data functions only.
 */

import { GRADES, SCHEMA_VERSION } from './config.js';
import { ok, fail } from './utils.js';

const LOCALE_KEYS = ['en', 'ar'];

function emptyLocale() {
  return { en: '', ar: '' };
}

function normalizeLocale(field) {
  if (field == null) return emptyLocale();
  if (typeof field === 'string') return { en: field, ar: '' };
  const out = emptyLocale();
  for (const k of LOCALE_KEYS) out[k] = typeof field[k] === 'string' ? field[k] : '';
  return out;
}

function normalizeReference(ref) {
  // narrator/grading are present in richer datasets (e.g. "narrator: Anas
  // bin Malik", "grading: Sahih (by routes)") and absent in most — kept as
  // explicit, type-checked fields rather than relying on an unchecked
  // spread, so a malformed/imported reference object can't smuggle a
  // non-string value through into rendering.
  const base = {
    collection: '',
    book: '',
    chapter: '',
    hadith: '',
    narrator: '',
    grading: '',
    url: '',
    notes: '',
  };
  if (ref == null) return base;
  if (typeof ref === 'string') return { ...base, collection: ref };
  const out = { ...base };
  for (const key of Object.keys(base)) {
    if (typeof ref[key] === 'string') out[key] = ref[key];
  }
  return out;
}

/** Normalize a single content item to guarantee every field defined by the spec exists. */
export function normalizeItem(raw, categoryId) {
  const item = raw || {};
  return {
    id: String(item.id ?? ''),
    category_id: String(item.category_id ?? categoryId ?? ''),
    title: normalizeLocale(item.title),
    arabic: typeof item.arabic === 'string' ? item.arabic : '',
    transliteration: typeof item.transliteration === 'string' ? item.transliteration : '',
    translation: normalizeLocale(item.translation),
    reference: normalizeReference(item.reference),
    grade: GRADES.includes(item.grade) ? item.grade : 'Unknown',
    custom_grade: normalizeLocale(item.custom_grade),
    repetitions:
      Number.isFinite(item.repetitions) && item.repetitions > 0 ? Math.floor(item.repetitions) : 1,
    virtues: normalizeLocale(item.virtues),
    audio: item.audio || null,
    image: item.image || null,
    tags: Array.isArray(item.tags) ? item.tags.filter((t) => typeof t === 'string') : [],
    related: Array.isArray(item.related) ? item.related.filter((r) => typeof r === 'string') : [],
    // Editorial attribution distinct from reference.notes (e.g. "Featured in
    // <podcast episode> by <scholar>") — present in richer datasets, absent
    // in most. Kept as a plain string, not localized, since it's metadata
    // about provenance rather than devotional content.
    notes: typeof item.notes === 'string' ? item.notes : '',
    order: Number.isFinite(item.order) ? item.order : 0,
  };
}

/** Normalize a category, recursively normalizing its items. */
export function normalizeCategory(raw, sectionId) {
  const cat = raw || {};
  const id = String(cat.id ?? '');
  return {
    id,
    section_id: String(cat.section_id ?? sectionId ?? ''),
    name: normalizeLocale(cat.name),
    description: normalizeLocale(cat.description),
    order: Number.isFinite(cat.order) ? cat.order : 0,
    icon: cat.icon || 'book',
    color: cat.color || 'slate',
    items: Array.isArray(cat.items) ? cat.items.map((it) => normalizeItem(it, id)) : [],
  };
}

/** Normalize a full library document: { schema_version, metadata, categories }. */
export function normalizeDocument(raw) {
  const doc = raw || {};
  const metadata = doc.metadata || {};
  return {
    schema_version: SCHEMA_VERSION,
    metadata: {
      id: String(metadata.id ?? ''),
      name: normalizeLocale(metadata.name),
      description: normalizeLocale(metadata.description),
      version: metadata.version || '1.0.0',
      source: normalizeLocale(metadata.source),
    },
    categories: Array.isArray(doc.categories)
      ? doc.categories.map((c) => normalizeCategory(c, metadata.id))
      : [],
  };
}

/**
 * Validate a normalized document. Returns Result<{ warnings: string[] }>.
 * Validation is intentionally forgiving (warnings, not hard failures) except for
 * structural problems that would break the renderer (duplicate ids).
 */
export function validateDocument(doc) {
  const warnings = [];
  const seenCategoryIds = new Set();
  const seenItemIds = new Set();

  if (!doc.metadata?.id) warnings.push('Document is missing metadata.id');
  if (!Array.isArray(doc.categories) || doc.categories.length === 0) {
    warnings.push('Document has no categories');
  }

  for (const cat of doc.categories || []) {
    if (!cat.id) {
      warnings.push('A category is missing an id');
      continue;
    }
    if (seenCategoryIds.has(cat.id)) {
      return fail(`Duplicate category id: ${cat.id}`);
    }
    seenCategoryIds.add(cat.id);

    for (const item of cat.items || []) {
      if (!item.id) {
        warnings.push(`An item in category "${cat.id}" is missing an id`);
        continue;
      }
      if (seenItemIds.has(item.id)) {
        return fail(`Duplicate item id: ${item.id}`);
      }
      seenItemIds.add(item.id);

      if (!item.arabic && !item.translation.en) {
        warnings.push(`Item "${item.id}" has neither Arabic text nor an English translation`);
      }
      if (!GRADES.includes(item.grade)) {
        warnings.push(`Item "${item.id}" has an invalid grade "${item.grade}"`);
      }
      if (item.grade === 'Custom' && !item.custom_grade.en && !item.custom_grade.ar) {
        warnings.push(`Item "${item.id}" is graded Custom but has no custom_grade explanation`);
      }
    }
  }

  return ok({ warnings, itemCount: seenItemIds.size, categoryCount: seenCategoryIds.size });
}

/** Validate + normalize in one call, used by the loader for every fetched document. */
export function processDocument(raw) {
  const normalized = normalizeDocument(raw);
  const result = validateDocument(normalized);
  if (!result.success) return fail(result.error);
  if (result.value.warnings.length) {
    console.warn(
      `[schema] ${normalized.metadata.id}: ${result.value.warnings.length} warning(s)`,
      result.value.warnings
    );
  }
  return ok(normalized);
}

/** Produce a blank item template for the editor, pre-filled with sane defaults. */
export function blankItem(categoryId) {
  return normalizeItem(
    { id: '', category_id: categoryId, repetitions: 1, grade: 'Unknown' },
    categoryId
  );
}

/** Produce a blank category template for the editor. */
export function blankCategory(sectionId) {
  return normalizeCategory(
    { id: '', section_id: sectionId, order: 0, icon: 'book', color: 'slate', items: [] },
    sectionId
  );
}

/**
 * Normalize an entire customContent map ({ libraryId: rawDoc }), tolerating
 * any malformed/legacy/hand-edited shape per-library so that one corrupted
 * entry (from a bad backup import, manual localStorage tampering, or a
 * future bug elsewhere) can never crash the whole app. A library that fails
 * normalization entirely is dropped with a console warning rather than
 * propagating the failure.
 */
export function normalizeCustomContentMap(customContent) {
  const out = {};
  if (!customContent || typeof customContent !== 'object') return out;
  for (const [libraryId, rawDoc] of Object.entries(customContent)) {
    try {
      const normalized = normalizeDocument(rawDoc);
      // Ensure the map key and the document's own id never disagree.
      normalized.metadata.id = normalized.metadata.id || libraryId;
      out[normalized.metadata.id] = normalized;
    } catch (err) {
      console.warn(`[schema] Dropping unrecoverable custom library "${libraryId}"`, err);
    }
  }
  return out;
}
