/**
 * views/tafsirPanel.js
 * Shared UI (modal templates) for the Qur'an study features: the per-word
 * grammar/i'rab/sarf popover, the multi-source tafsir panel (tabs across
 * every bundled + on-demand edition), and the Mushaf display-settings
 * panel (font / paper color / sizing / animation). Used by both
 * views/quran.js (classic list reader) and views/mushafReader.js (604-page
 * book reader) so the two reading modes share one implementation.
 */
import { t } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { clamp, escapeHTML, pickLocale } from '../core/utils.js';
import { pairForAyah, buildSimilarPairs } from '../domain/mutashabihat.js';
import { skeletonLines } from '../ui/skeleton.js';
import { loadErrorStateHTML } from '../ui/emptyState.js';
import { MUSHAF_FONTS, MUSHAF_PAPERS } from '../core/config.js';
import {
  classifyAyahTajweed,
  classifyWordTajweed,
  canonicalWordTokens,
  sameSurfaceWord,
  containsSurfaceWord,
  matchesAccentWord,
  wordUnits,
  ornamentTokenKind,
  TAJWEED_RULES,
  TAJWEED_FAMILIES,
  tajweedPrefsOf,
  ruleEnabled,
  effectiveRuleColor,
  filterSpansByPrefs,
} from '../domain/tajweed.js';
import {
  getWord,
  wordDetailTags,
  wordAffixLabels,
  wordIrabLine,
  rootOccurrences,
  rootMeaningFor,
  splitEditions,
  dictEntryFor,
  wordBookmarkKey,
} from '../domain/wordStudy.js';

/* ------------------------------------------------------------------ */
/* Word-by-word rendering                                              */
/* ------------------------------------------------------------------ */

/**
 * Renders an ayah's *official* app text (already exactly what ships in
 * data/quran or data/mushaf — never altered) as a run of tappable
 * per-word spans, position-matched (1-based, whitespace-split) against
 * the fetched grammar/gloss records for that ayah. Falls back to plain
 * escaped text — with zero risk to text fidelity — when word study is
 * off or data hasn't loaded yet.
 */
export function renderAyahWords(
  officialText,
  wordRecords,
  surah,
  ayah,
  {
    tappable = true,
    underline = true,
    tajweed = false,
    prefs = null,
    lang = 'en',
    accentWord = null,
  } = {}
) {
  const rawTokens = String(officialText || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  // (v5.3.0) data-i counts CANONICAL words (ornaments don't consume an
  // index), so a tap resolves to the same word in the classic docs and
  // the grammar records. Ornament-only tokens render plain and untappable.
  const canon = canonicalWordTokens(officialText);
  const canonIdxByRaw = new Map(canon.map((c, ci) => [c.rawIndex, ci]));
  const tajweedByWord = tajweed ? classifyAyahTajweed(officialText) : null;

  // (v5.4.0, P0-2c — ported from the v5.3.0 audit) standalone ornament
  // tokens (waqf letters, the rub el-hizb divider, the sajdah mark) wrap
  // in a non-letter styled span so Sajdah marks and Hizb dividers stay
  // two visual families (color + size), each token-colored from dedicated
  // CSS variables with a forced-colors fallback. Display text is
  // byte-identical.
  const markSpan = (tok) => {
    const kind = ornamentTokenKind(tok);
    return kind && kind !== 'digits'
      ? `<span class="mushaf-mark mushaf-mark--${kind}" aria-hidden="true">${escapeHTML(tok)}</span>`
      : escapeHTML(tok);
  };

  // (v5.2.74, BUG-06) roving-tabindex anchor: the first tappable word.
  let firstTappable = null;
  return rawTokens
    .map((tok, rawIdx) => {
      const canonIdx = canonIdxByRaw.get(rawIdx);
      // (v5.4.0, P0-2b) the printed horizontal sajdah-line accent rides
      // ONLY over سُجَّدًا in As-Sajdah 15 — matched harakat-folded (the
      // Madani rasm orders shadda/fatha differently from the classic
      // docs) via the accentWord option. The fifteen mawadi' keep their
      // ۩ mark; this one ayah also carries the printed line-over-word
      // convention. When the caller passes no accentWord, 32:15 defaults
      // it in (so BOTH readers — classic list and Mushaf book — carry the
      // accent with no per-call-site wiring); an explicit accentWord
      // always wins, and the same skeleton elsewhere gains nothing.
      const defaultAccent = String(surah) === '32' && String(ayah) === '15' ? 'سُجَّدًا' : null;
      const effectiveAccent = accentWord != null ? accentWord : defaultAccent;
      const isAccent = matchesAccentWord(tok, effectiveAccent);
      const isMark = ornamentTokenKind(tok) && ornamentTokenKind(tok) !== 'digits';
      const inner =
        tajweedByWord && !isMark
          ? colorizeWord(tok, tajweedByWord[rawIdx]?.spans || [], prefs)
          : markSpan(tok);
      // (v4.6.0) a word is tappable even without grammar data — the tap
      // opens the study panel, which always answers the tajweed question
      // from the ayah text itself. `tappable` opts OUT (practice mode).
      if (!tappable || canonIdx == null) {
        return isAccent ? `<span class="mushaf-ayah__sajda-word">${inner}</span>` : inner;
      }
      const i = canonIdx + 1;
      // (v5.2.74, BUG-05) Arabic runs carry lang="ar" so screen readers
      // use the Arabic voice (WCAG 3.1.2 Language of Parts).
      // (v5.2.74, BUG-06) roving tabindex: only the FIRST tappable word of
      // the ayah is a tab stop (the rest are tabindex="-1" until arrowed
      // onto) — ~500 stops per window collapse to ~30. The aria-label
      // names the word-study action bare words never hint at; Left/Right
      // movement lives in the events.js keydown handler.
      const tab = firstTappable === null ? '0' : '-1';
      if (firstTappable === null) firstTappable = rawIdx;
      return `<span class="qword ${underline ? 'qword--underline' : ''} ${isAccent ? 'mushaf-ayah__sajda-word' : ''}" data-action="word-tap" data-surah="${surah}" data-ayah="${ayah}" data-i="${i}" tabindex="${tab}" role="button" lang="ar" aria-label="${escapeHTML(tok)} — ${escapeHTML(t('wordStudy.open', lang))}">${inner}</span>`;
    })
    .join(' ');
}

/** Wrap a word's tajweed-flagged letter runs in colored spans, escaping
 *  everything else as plain text. Spans are character-index ranges into
 *  `word` produced by tajweed.js — see that module for why they're safe
 *  to trust (computed directly from this app's own text, not aligned
 *  against a third-party offset table). */
function colorizeWord(word, spans, prefs = null) {
  const active = filterSpansByPrefs(spans, prefs);
  if (!active.length) return escapeHTML(word);
  const sorted = [...active].sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const s of sorted) {
    if (s.start < cursor) continue; // rules should never overlap, but never let one clobber the last
    out += escapeHTML(word.slice(cursor, s.start));
    const rule = TAJWEED_RULES.find((r) => r.id === s.rule);
    const color = effectiveRuleColor(prefs, rule);
    out += `<span class="tajweed tajweed--${s.rule}"${color ? ` style="color:${color}"` : ''}>${escapeHTML(word.slice(s.start, s.end))}</span>`;
    cursor = s.end;
  }
  out += escapeHTML(word.slice(cursor));
  return out;
}

/**
 * (v5.5.0) the Bismillah as LIVE quranic text: the same four words open
 * every surah header, rendered through renderAyahWords so each word is
 * tappable with tajweed coloring exactly like any ayah — never a dead
 * paragraph. Taps carry data-ayah="0" (the Bismillah is not a numbered
 * ayah outside 1:1); the word-tap handler redirects them onto the real
 * 1:1 grammar records — identical words, real i'rab/sarf/root, nothing
 * invented. `style` mirrors the bismillahStyle pref ('hidden' renders
 * nothing); `cls` picks the reader's own Bismillah class so each reader
 * keeps its rhythm while sharing one live implementation.
 */
export const BISMILLAH_AYAH_REF = '0';

export function buildBismillahHTML({
  text,
  surah,
  style = 'auto',
  cls = 'mushaf-bismillah',
  lang = 'en',
  underline = false,
  tajweed = false,
  prefs = null,
}) {
  if (style === 'hidden') return '';
  const words = renderAyahWords(text, null, surah, BISMILLAH_AYAH_REF, {
    tappable: true,
    underline,
    tajweed,
    prefs,
    lang,
  });
  return `<p class="${cls} bismillah--${style}" dir="rtl" lang="ar">${words}</p>`;
}

/** v3.7 — Tajweed inspector: what to DO at this specific word.
 * Recomputes the classification from the official ayah token with proper
 * one-letter lookahead, then lists every rule applying here — bilingual
 * name, legend color, and the pronunciation instruction — so tapping any
 * word answers "which letters carry a rule and how do I recite them?"
 * straight from the same classifier that colors the page. It can never
 * disagree with the colored text, because it IS the colored text's source.
 *
 * (v4.6.0) No longer gated on the tajweedInspector pref: tapping a word
 * ALWAYS answers the tajweed question — that is the tap's whole job when
 * grammar data hasn't loaded (the classic "mushaf words do nothing"
 * complaint).
 *
 * (v5.3.0) tokens are canonical (see canonicalWordTokens): the tapped
 * index resolves against the classic text's canonical list, anchored by
 * the tapped surface for the handful of spelling-split ayahs.
 */
function resolvePopupToken(ayahText, wordIndex, surface) {
  const canon = canonicalWordTokens(ayahText).map((c) => c.text);
  const at = (k) => canon[k] || null;
  if (!surface || !at(wordIndex - 1) || sameSurfaceWord(at(wordIndex - 1), surface)) {
    const r = wordIndex - 1;
    return { token: at(r), tokenIndex: r, nextToken: at(r + 1), isLast: r === canon.length - 1 };
  }
  const order = [0, 1, -1, 2, -2, 3, -3];
  const match = (eq) => {
    for (const d of order) {
      const r = wordIndex - 1 + d;
      if (r < 0 || r >= canon.length) continue;
      const t = canon[r];
      if (eq ? sameSurfaceWord(t, surface) : containsSurfaceWord(t, surface)) {
        return { token: t, tokenIndex: r, nextToken: at(r + 1), isLast: r === canon.length - 1 };
      }
    }
    return null;
  };
  return (
    match(true) ||
    match(false) || {
      token: at(wordIndex - 1),
      tokenIndex: wordIndex - 1,
      nextToken: at(wordIndex),
      isLast: wordIndex === canon.length,
    }
  );
}

function wordTajweedSection(state, surah, ayah, wordIndex, lang) {
  const doc = state.quran.surahs[String(surah)];
  const ayahText = doc?.ayahs?.find((x) => String(x.number) === String(ayah))?.text;
  if (!ayahText) return '';
  const surface = state.activeWordStudy?.surface || null;
  const resolved = resolvePopupToken(ayahText, wordIndex, surface);
  const token = resolved.token;
  if (!token) return '';
  // Reading order: the first letter AFTER this word decides cross-word
  // rules; it comes from the same tokenizer the rules themselves use.
  const nextUnits = resolved.nextToken ? wordUnits(resolved.nextToken) : [];
  const prefs = tajweedPrefsOf(state);
  const allSpans = classifyWordTajweed(token, {
    nextWordFirstBase: nextUnits[0] ? resolved.nextToken[nextUnits[0].start] : null,
    isLastWordOfAyah: resolved.isLast,
  });
  const spans = filterSpansByPrefs(allSpans, prefs);
  if (!spans.length) return '';
  // Dedupe identical (rule, range) pairs defensively; sort in reading order.
  const seen = new Set();
  const rows = spans
    .filter((sp) => {
      const key = `${sp.rule}:${sp.start}:${sp.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((p1, p2) => p1.start - p2.start || p1.end - p2.end)
    .map((sp) => {
      const rule = TAJWEED_RULES.find((r) => r.id === sp.rule);
      if (!rule || !ruleEnabled(prefs, sp.rule)) return '';
      const name = lang === 'ar' ? rule.name.ar : rule.name.en;
      const nameAlt = lang === 'ar' ? '' : ` \u00B7 ${rule.name.ar}`;
      const desc = lang === 'ar' ? rule.desc.ar : rule.desc.en;
      const color = effectiveRuleColor(prefs, rule);
      return `
        <div class="wti-row">
          <span class="wti-swatch" style="background:${color || 'transparent'}" aria-hidden="true"></span>
          <div class="wti-body">
            <span class="wti-name">${escapeHTML(name)}<span dir="rtl" lang="ar" class="wti-name-alt">${escapeHTML(nameAlt)}</span></span>
            <span class="wti-desc">${escapeHTML(desc)}</span>
            <span class="wti-letters" dir="rtl" lang="ar">${escapeHTML(token.slice(sp.start, sp.end))}</span>
          </div>
        </div>`;
    })
    .join('');
  return `
    <div class="word-study__tajweed">
      <p class="word-study__tajweed-label">${t('wordStudy.tajweed', lang)}</p>
      <div class="word-study__tajweed-arabic" dir="rtl" lang="ar">${colorizeWord(token, spans, prefs)}</div>
      ${rows}
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Word grammar popover                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Word study popup actions (v5.2.75, UP-01): per-word listen / copy /    */
/* share / bookmark. The handlers live in app/handlers/quran.js next to  */
/* the other word-study actions; bookmark state rides the persisted      */
/* wordBookmarks map.                                                    */
/* ------------------------------------------------------------------ */
function wordActionsRow(state, lang, surah, ayah, i) {
  const bmKey = wordBookmarkKey(surah, ayah, i);
  const marked = bmKey ? state.wordBookmarks?.[bmKey] === true : false;
  const ds = `data-surah="${surah}" data-ayah="${ayah}" data-i="${i}"`;
  const bmLabel = marked ? t('wordStudy.bookmarked', lang) : t('wordStudy.bookmark', lang);
  return `
  <div class="word-study__word-actions" role="group" aria-label="${t('wordStudy.title', lang)}">
    <button type="button" class="icon-btn icon-btn--sm" data-action="word-speak" ${ds} aria-label="${t('wordStudy.speak', lang)}" title="${t('wordStudy.speak', lang)}">${icon('volume', { size: 15 })}</button>
    <button type="button" class="icon-btn icon-btn--sm" data-action="word-copy" ${ds} aria-label="${t('wordStudy.copy', lang)}" title="${t('wordStudy.copy', lang)}">${icon('copy', { size: 15 })}</button>
    <button type="button" class="icon-btn icon-btn--sm" data-action="word-share" ${ds} aria-label="${t('wordStudy.share', lang)}" title="${t('wordStudy.share', lang)}">${icon('share', { size: 15 })}</button>
    <button type="button" class="icon-btn icon-btn--sm${marked ? ' icon-btn--active' : ''}" data-action="word-bookmark" ${ds} aria-pressed="${marked}" aria-label="${bmLabel}" title="${bmLabel}">${icon('bookmark', { size: 15 })}</button>
  </div>`;
}

/**
 * (v5.4.0, P0-1 — ported from the v5.3.0 audit) One labeled study block.
 * Empty data renders an honest one-line hint — the popup never invents
 * content and never hides a section silently. Blocks: definition,
 * syn/ant, root, i'rab.
 */
function wordStudyBlock({ labelKey, lang, bodyHTML, emptyKey = null, extraClass = '' }) {
  const body = (bodyHTML || '').trim();
  if (!body) {
    return `
    <div class="word-study__block word-study__block--empty">
      <span class="word-study__block-label">${t(labelKey, lang)}</span>
      <p class="empty-hint">${t(emptyKey || 'wordStudy.noIrabData', lang)}</p>
    </div>`;
  }
  return `
    <div class="word-study__block${extraClass ? ` ${extraClass}` : ''}">
      <span class="word-study__block-label">${t(labelKey, lang)}</span>
      ${body}
    </div>`;
}

/** Definition block body: the lemma dictionary's contextual Arabic entry
 *  + English gloss, else the corpus gloss. Empty when neither exists.
 *  (v5.5.0) the corpus gloss renders in BOTH languages: suppressing it
 *  in Arabic left the Definition block permanently empty for the ~88%
 *  of words the 54-lemma study dictionary does not cover. */
function wordDefinitionBody(state, lang, word) {
  const dict = dictEntryFor(state.wordDict, word.lemma);
  const parts = [];
  if (dict?.ar)
    parts.push(`<p class="word-study__dict-ar" dir="rtl" lang="ar">${escapeHTML(dict.ar)}</p>`);
  if (dict?.en) parts.push(`<p class="word-study__dict-en" dir="auto">${escapeHTML(dict.en)}</p>`);
  if (!parts.length && word.en) {
    parts.push(`<p class="word-study__dict-en" dir="auto">${escapeHTML(word.en)}</p>`);
  }
  return parts.join('');
}

/** Synonym/antonym chips block body. Empty when the dict has neither. */
function wordSynAntBody(state, lang, word) {
  const dict = dictEntryFor(state.wordDict, word.lemma);
  if (!dict || (!dict.syn.length && !dict.ant.length)) return '';
  const chips = (list, labelKey) =>
    list.length
      ? `<div class="word-study__synrow"><span class="word-study__syn-label">${t(labelKey, lang)}</span> ${list.map((s) => `<span class="chip chip--basis chip--sm" dir="rtl" lang="ar">${escapeHTML(s)}</span>`).join('')}</div>`
      : '';
  return `${chips(dict.syn, 'wordStudy.synonyms')}${chips(dict.ant, 'wordStudy.antonyms')}`;
}

/** Root block body: root, its core conceptual meaning, count,
 *  occurrences, and the #/roots deep link. */
function wordRootBody(state, lang, word, surah, ayah) {
  if (!word.root) return '';
  const { count, sample } = rootOccurrences(state.quranRoots, word.root, surah, ayah, 8);
  // (v5.6.0) the root's core meaning — the concept every derivative
  // carries (branching, covering, turning…). Honest hint when the
  // roots-meaning tier hasn't recorded this root yet.
  const meaning = rootMeaningFor(state.rootsMeaning, word.root);
  const meaningHtml = meaning
    ? `${meaning.ar ? `<p class="word-study__root-meaning" dir="rtl" lang="ar">${escapeHTML(meaning.ar)}</p>` : ''}${meaning.en ? `<p class="word-study__root-meaning-en" dir="auto">${escapeHTML(meaning.en)}</p>` : ''}`
    : `<p class="empty-hint">${t('wordStudy.noRootMeaningData', lang)}</p>`;
  return `
      <div class="word-study__root-head">
        <span class="word-study__root-text" dir="rtl" lang="ar">${escapeHTML(word.root)}</span>
        <span class="word-study__root-count">${t('wordStudy.rootCount', lang, { n: count })}</span>
      </div>
      ${meaningHtml}
      ${
        sample.length
          ? `
      <p class="word-study__root-hint">${t('wordStudy.rootHint', lang)}</p>
      <div class="word-study__root-chips">
        ${sample
          .map(
            (o) => `
          <button type="button" class="chip chip--basis" data-action="root-jump" data-surah="${o.s}" data-ayah="${o.a}">
            <span dir="rtl" lang="ar">${escapeHTML(o.t || '')}</span>
            <span class="word-study__root-ref" dir="ltr">${o.s}:${o.a}</span>
          </button>`
          )
          .join('')}
      </div>`
          : ''
      }
      <button type="button" class="btn btn--secondary btn--sm word-study__root-browse" data-action="roots-open" data-root="${escapeHTML(word.root)}">
        ${t('wordStudy.rootBrowse', lang, { n: count })}
      </button>`;
}

/** I'rab block body: the one-line i'rab + wrapped detail tags. */
function wordIrabBody(word, lang) {
  const line = wordIrabLine(word, lang);
  const tags = wordDetailTags(word, lang);
  const tagsHtml = tags.length
    ? `<div class="word-study__tags">${tags.map((tg) => `<span class="chip chip--basis chip--sm">${escapeHTML(tg)}</span>`).join('')}</div>`
    : '';
  if (!line && !tagsHtml) return '';
  return `${line ? `<p class="word-study__irab-line">${escapeHTML(line)}</p>` : ''}${tagsHtml}`;
}

export function buildWordStudyPanel(state) {
  const lang = state.settings.language;
  const ref = state.activeWordStudy;
  if (!ref) return '';
  const { surah, ayah, i } = ref;
  // (v5.2.75, UP-09) "look-alike ayah?" chip when this ayah sits in a
  // computed mutashabihat pair — opening the sibling's study, reusing
  // the root-jump action. Needs loaded surah docs; otherwise silent.
  let lookalike = '';
  try {
    const pair = pairForAyah(buildSimilarPairs(state.quran.surahs), surah, ayah);
    if (pair) {
      const sib =
        `${pair.a.s}:${pair.a.a}` === `${Number(surah)}:${Number(ayah)}` ? pair.b : pair.a;
      lookalike = `
      <button type="button" class="chip chip--basis" data-action="root-jump" data-surah="${sib.s}" data-ayah="${sib.a}">
        ${t('wordStudy.lookalike', lang, { ref: `${sib.s}:${sib.a}` })}
      </button>`;
    }
  } catch {
    lookalike = '';
  }
  const word = getWord(state.quranWords, surah, ayah, i, ref.surface || null);

  if (!word) {
    // (v4.6.0) No grammar data is not a dead end: the ayah text itself
    // still carries the tajweed answer. Show the token, colorized, with
    // every rule it contains — then the tafsir deep-link as before.
    // (v5.3.0) canonical index + surface anchor, like the tajweed section.
    const doc = state.quran.surahs[String(surah)];
    const ayahText = doc?.ayahs?.find((x) => String(x.number) === String(ayah))?.text;
    const token = ayahText ? resolvePopupToken(ayahText, i, ref.surface || null).token : null;
    const tajweedHTML = token ? wordTajweedSection(state, surah, ayah, i, lang) : '';
    return `
    <div class="word-study">
      <h2 id="modal-title-word-study" class="sr-only">${t('wordStudy.title', lang)}</h2>
      ${
        token
          ? `<p class="word-study__ref" dir="ltr">${surah}:${ayah} \u00B7 ${t('wordStudy.wordN', lang, { n: i })}</p>
      <p class="word-study__arabic word-study__arabic--solo" dir="rtl" lang="ar">${escapeHTML(token)}</p>`
          : `<p class="empty-hint">${t('wordStudy.noData', lang)}</p>`
      }
      ${tajweedHTML}
      ${token ? `<p class="panel__subtext">${t('wordStudy.tajweedOnly', lang)}</p>` : ''}
      ${lookalike ? `<div class="word-study__lookalike">${lookalike}</div>` : ''}
      ${wordActionsRow(state, lang, surah, ayah, i)}
      <div class="word-study__actions">
        <button type="button" class="btn btn--primary btn--sm" data-action="tafsir-open" data-surah="${surah}" data-ayah="${ayah}">
          ${icon('book', { size: 15 })} ${t('wordStudy.openTafsir', lang)}
        </button>
      </div>
    </div>`;
  }

  const { prefixes, suffixes } = wordAffixLabels(word, lang);

  const affixHtml = (list, labelKey) =>
    list.length
      ? `
    <div class="word-study__affixes">
      <span class="word-study__affixes-label">${t(labelKey, lang)}</span>
      ${list.map((p) => `<span class="chip chip--basis">${escapeHTML(p.form)} — ${escapeHTML(p.label)}</span>`).join('')}
    </div>`
      : '';

  // (v5.4.0, P0-1 — ported from the v5.3.0 audit) the four study blocks —
  // definition, synonyms/antonyms, root, i'rab — each with an honest
  // empty state when its data tier is missing. The legacy
  // word-study__meanings anchor rides the definition block only when the
  // dict tier actually has content (the UP-01 gate: no hollow meanings
  // section without the tier).
  const dictForLegacy = dictEntryFor(state.wordDict, word.lemma);
  const hasMeanings = Boolean(
    dictForLegacy &&
    (dictForLegacy.ar || dictForLegacy.en || dictForLegacy.syn.length || dictForLegacy.ant.length)
  );
  const definitionBlock = wordStudyBlock({
    labelKey: 'wordStudy.definition',
    lang,
    bodyHTML: wordDefinitionBody(state, lang, word),
    emptyKey: 'wordStudy.noMeaningData',
    extraClass: hasMeanings ? 'word-study__meanings' : '',
  });
  const synAntBlock = wordStudyBlock({
    labelKey: 'wordStudy.synAnt',
    lang,
    bodyHTML: wordSynAntBody(state, lang, word),
    emptyKey: 'wordStudy.noSynAntData',
  });
  const rootBlock = wordStudyBlock({
    labelKey: 'wordStudy.root',
    lang,
    bodyHTML: wordRootBody(state, lang, word, surah, ayah),
    emptyKey: 'wordStudy.noRootData',
  });
  const irabBlock = wordStudyBlock({
    labelKey: 'wordStudy.irab',
    lang,
    bodyHTML: wordIrabBody(word, lang),
    emptyKey: 'wordStudy.noIrabData',
  });

  return `
  <div class="word-study">
    <h2 id="modal-title-word-study" class="sr-only">${t('wordStudy.title', lang)}</h2>
    <p class="word-study__ref" dir="ltr">${surah}:${ayah} \u00B7 ${t('wordStudy.wordN', lang, { n: i })}</p>
    <p class="word-study__arabic" dir="rtl" lang="ar">${escapeHTML(word.text || '')}</p>
    ${lang !== 'ar' && word.translit ? `<p class="word-study__translit" dir="ltr">${escapeHTML(word.translit)}</p>` : ''}
    ${definitionBlock}
    ${synAntBlock}
    ${irabBlock}
    ${affixHtml(prefixes, 'wordStudy.prefix')}
    ${affixHtml(suffixes, 'wordStudy.suffix')}
    ${rootBlock}
    ${lookalike ? `<div class="word-study__lookalike">${lookalike}</div>` : ''}
    ${wordActionsRow(state, lang, surah, ayah, i)}
    ${wordTajweedSection(state, surah, ayah, i, lang)}
    <div class="word-study__actions">
      <button type="button" class="btn btn--primary btn--sm" data-action="tafsir-open" data-surah="${surah}" data-ayah="${ayah}">
        ${icon('book', { size: 15 })} ${t('wordStudy.openTafsir', lang)}
      </button>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Multi-source tafsir panel                                           */
/* ------------------------------------------------------------------ */

/**
 * (v5.2.89, P0-2) Waqf & portion marks of the Uthmani print, rendered as
 * the Mushaf settings' reference legend. Codepoints mirror the ornament
 * table in domain/tajweed.js (the same signs the canonical tokenizer
 * treats as letterless): مـ U+06D8, صلى U+06D6, قلى U+06D7, ج U+06DA,
 * ∴ U+06DB, ۞ U+06DE, ۩ U+06E9. The hizb/sajdah pair is deliberately
 * adjacent here so the two never read as one set.
 */
const WAQF_MARKS = Object.freeze([
  { mark: '\u06D8', nameKey: 'mushaf.waqf_lazim', descKey: 'mushaf.waqf_lazim_d' },
  { mark: '\u06DA', nameKey: 'mushaf.waqf_jim', descKey: 'mushaf.waqf_jim_d' },
  { mark: '\u06D6', nameKey: 'mushaf.waqf_sila', descKey: 'mushaf.waqf_sila_d' },
  { mark: '\u06D7', nameKey: 'mushaf.waqf_qila', descKey: 'mushaf.waqf_qila_d' },
  { mark: '\u06DB', nameKey: 'mushaf.waqf_murakhkhas', descKey: 'mushaf.waqf_murakhkhas_d' },
  { mark: '\u06DE', nameKey: 'mushaf.waqf_hizb', descKey: 'mushaf.waqf_hizb_d' },
  { mark: '\u06E9', nameKey: 'mushaf.waqf_sajdah', descKey: 'mushaf.waqf_sajdah_d' },
]);

/** Turn a raw tafsir string into readable HTML: recognizes the
 *  "* SectionName:" headers several grammar sources use (i'rab/sarf/
 *  balagha/fawaid), highlights ﴿word﴾-marked segments some sources use,
 *  and turns blank lines into paragraph breaks. Falls back to plain
 *  paragraphs for ordinary tafsir prose that has neither. */
export function formatArabicCommentary(raw) {
  if (!raw) return '';
  const escaped = escapeHTML(raw);
  const hasSections = /(^|\n)\s*\*\s*[^:\n]{2,20}:/.test(escaped);
  let html;
  if (hasSections) {
    const parts = escaped.split(/(?:^|\n)\s*\*\s*([^:\n]{2,20}):\s*/).filter((s) => s !== '');
    // parts alternates [preamble?, title, body, title, body, ...]
    let out = '';
    let idx = 0;
    if (parts.length % 2 === 1) {
      out += paragraphize(parts[0]);
      idx = 1;
    }
    for (; idx < parts.length - 1; idx += 2) {
      // (F-010) h3, not h4: these head sections under the modal's h2 —
      // skipping a level breaks screen-reader heading navigation.
      out += `<h3 class="tafsir-section-h">${parts[idx]}</h3>${paragraphize(parts[idx + 1])}`;
    }
    html = out;
  } else {
    html = paragraphize(escaped);
  }
  return html.replace(
    /\uFD3F([^\uFD3E]*)\uFD3E/g,
    '<span class="tafsir-word-mark">\uFD3F$1\uFD3E</span>'
  );
}
function paragraphize(s) {
  return s
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * (v5.2.63) English commentary formatter: plain escaped paragraphs only.
 * The Arabic section-header pass (`* Title:`) would misfire on English
 * prose punctuation, so English never runs through it — same paragraph
 * rhythm, no invented structure.
 */
export function formatEnglishCommentary(raw) {
  if (!raw) return '';
  return paragraphize(escapeHTML(raw));
}

/** True for catalog editions whose text reads left-to-right (English). */
export function isEnglishEdition(edition) {
  return !!edition && edition.lang === 'en';
}

/** Commentary body for an edition: direction, language and formatter
 *  follow the edition, never the UI language. */
export function editionBodyHTML(edition, text) {
  if (isEnglishEdition(edition)) {
    return `<div class="tafsir-panel__body" dir="ltr" lang="en">${formatEnglishCommentary(text)}</div>`;
  }
  return `<div class="tafsir-panel__body" dir="rtl" lang="ar">${formatArabicCommentary(text)}</div>`;
}

/**
 * The tabbed panel: one tab per catalog edition. `activeId` is which tab
 * is currently selected (session state in state.mushafSession, set by the
 * study-modal flows — the panel itself stays pure).
 */
export function buildTafsirPanel(state, surah, ayah, activeId) {
  const lang = state.settings.language;
  const editions = state.tafsirEditions;
  if (!editions) {
    // v4.1: editions-catalog failure gets an inline error + Retry instead
    // of a permanent skeleton.
    if (state.loadErrors?.['tafsir-editions']) {
      return `<div class="tafsir-panel">${loadErrorStateHTML({ lang, tierKey: 'tafsir-editions', t })}</div>`;
    }
    return `<div class="tafsir-panel">${skeletonLines(lang, [46, 94, 90, 66])}</div>`;
  }
  const { bundled, remote } = splitEditions(editions);
  const active = activeId || state.settings.mushafPrefs.defaultTafsir || bundled[0]?.id;
  const activeEdition = [...bundled, ...remote].find((e) => e.id === active);

  const tabBtn = (ed) => `
    <button type="button" role="tab" id="tafsir-tab-${ed.id}" aria-controls="tafsir-panel-content" aria-selected="${active === ed.id}" tabindex="${active === ed.id ? '0' : '-1'}" class="tafsir-tab ${active === ed.id ? 'tafsir-tab--active' : ''}" data-action="tafsir-tab" data-edition="${ed.id}" data-surah="${surah}" data-ayah="${ayah}">
      ${escapeHTML(pickLocale({ en: ed.nameEn, ar: ed.nameAr }, lang))}
      ${!ed.bundled ? `<span class="tafsir-tab__cloud">${icon('download', { size: 11 })}</span>` : ''}
    </button>`;

  let body;
  if (!activeEdition) {
    body = `<p class="panel__subtext">${t('tafsir.pickSource', lang)}</p>`;
  } else {
    const text = state.tafsir?.[activeEdition.id]?.[String(surah)]?.[String(ayah)];
    if (text) {
      body = `
        <p class="tafsir-panel__author">${escapeHTML(pickLocale({ en: activeEdition.authorEn, ar: activeEdition.authorAr }, lang))}</p>
        ${editionBodyHTML(activeEdition, text)}`;
    } else if (state.loadErrors?.['tafsir-text']) {
      // v4.1: the text fetch failed — Retry instead of a stuck skeleton.
      body = `<div class="tafsir-panel__loading">${loadErrorStateHTML({ lang, tierKey: 'tafsir-text', t })}</div>`;
    } else if (activeEdition.bundled) {
      body = `<div class="tafsir-panel__loading">${skeletonLines(lang, [92, 86, 60])}</div>`;
    } else {
      body = `
        <div class="tafsir-panel__remote">
          <p class="panel__subtext">${t('tafsir.remoteHint', lang)}</p>
          <button type="button" class="btn btn--primary btn--sm" data-action="tafsir-download" data-edition="${activeEdition.id}" data-surah="${surah}" data-ayah="${ayah}">
            ${icon('download', { size: 15 })} ${t('tafsir.download', lang)}
          </button>
        </div>`;
    }
  }

  const activeTabId = activeEdition ? `tafsir-tab-${activeEdition.id}` : '';
  const compareBlock = buildTafsirCompare(
    state,
    surah,
    ayah,
    [...bundled, ...remote],
    activeEdition?.id,
    lang
  );

  return `
  <div class="tafsir-panel">
    <div class="tafsir-tabs" role="tablist" aria-label="${t('tafsir.title', lang)}">
      ${bundled.map(tabBtn).join('')}
      ${remote.length ? `<span class="tafsir-tabs__sep"></span>${remote.map(tabBtn).join('')}` : ''}
    </div>
    <div class="tafsir-panel__content" role="tabpanel" id="tafsir-panel-content" ${activeTabId ? `aria-labelledby="${activeTabId}"` : ''} tabindex="0">${body}</div>
    ${compareBlock}
  </div>`;
}

/**
 * Tafsir compare: extra sources beneath the active tab. Each picker offers
 * every other edition — bundled, cached remote, and uncached remote (an
 * uncached remote renders its own download button below instead of
 * picker-only silence). Choices persist in settings.tafsirCompareB/C; a
 * stale id renders only the picker, never an error.
 * (v5.2.78, UP-06) two compare slots: B (second source) + C (third).
 */
function buildTafsirCompareSlot(state, surah, ayah, editions, activeId, slotKey, labelKey, lang) {
  const picked = state.settings[slotKey] || null;
  const others = slotKey === 'tafsirCompareC' ? state.settings.tafsirCompareB : null;
  const cached = (ed) => ed.bundled || state.tafsir?.[ed.id]?.[String(surah)] != null;
  const options = editions.filter((ed) => ed.id !== activeId && ed.id !== others);
  const chipFor = (id, label, on) => `
    <button type="button" class="chip ${on ? 'chip--active' : ''}" data-action="tafsir-compare" data-slot="${slotKey === 'tafsirCompareC' ? 'C' : 'B'}" data-edition="${escapeHTML(id)}" data-surah="${surah}" data-ayah="${ayah}" aria-pressed="${on}">
      ${escapeHTML(label)}
    </button>`;
  const picker = `
    <div class="tafsir-compare__pick">
      <span class="tafsir-compare__label">${t(labelKey, lang)}</span>
      ${chipFor('', t('tafsir.compareOff', lang), !picked)}
      ${options.map((ed) => chipFor(ed.id, pickLocale({ en: ed.nameEn, ar: ed.nameAr }, lang), picked === ed.id)).join('')}
    </div>`;

  let second = '';
  if (picked && picked !== activeId && picked !== others) {
    const ed = editions.find((e) => e.id === picked);
    const text = ed ? state.tafsir?.[ed.id]?.[String(surah)]?.[String(ayah)] : null;
    if (ed && text) {
      second = `
      <p class="tafsir-panel__author">${escapeHTML(pickLocale({ en: ed.authorEn, ar: ed.authorAr }, lang))}</p>
      ${editionBodyHTML(ed, text)}`;
    } else if (ed && cached(ed)) {
      second = `<div class="tafsir-panel__loading">${skeletonLines(lang, [92, 86, 60])}</div>`;
    } else if (ed && !ed.bundled) {
      // (v5.2.74, UP-08) uncached remote second source: its own explicit
      // download — the primary tab no longer owns this flow alone.
      second = `
      <div class="tafsir-panel__remote">
        <p class="panel__subtext">${t('tafsir.remoteHint', lang)}</p>
        <button type="button" class="btn btn--primary btn--sm" data-action="tafsir-compare-download" data-edition="${escapeHTML(ed.id)}" data-surah="${surah}" data-ayah="${ayah}">
          ${icon('download', { size: 15 })} ${t('tafsir.download', lang)}
        </button>
      </div>`;
    }
    // Unknown id: picker only (above) — never an error.
  }
  if (!options.length && !second) return '';
  return `
    <div class="tafsir-compare">
      ${picker}
      ${second ? `<div class="tafsir-compare__body">${second}</div>` : ''}
    </div>`;
}

function buildTafsirCompare(state, surah, ayah, editions, activeId, lang) {
  return (
    buildTafsirCompareSlot(
      state,
      surah,
      ayah,
      editions,
      activeId,
      'tafsirCompareB',
      'tafsir.compare',
      lang
    ) +
    buildTafsirCompareSlot(
      state,
      surah,
      ayah,
      editions,
      activeId,
      'tafsirCompareC',
      'tafsir.compareC',
      lang
    )
  );
}

/**
 * The full study modal: Arabic text + translation/bookmark/play/copy
 * (identical to the previous ayah-detail modal) with the tafsir panel
 * appended below it. Used as the single "ayah detail" surface in both
 * reading modes now.
 */
export function buildAyahStudyExtras(state, surah, ayah, activeTafsirId) {
  return `
    <div class="ayah-study-divider"></div>
    ${buildTafsirPanel(state, surah, ayah, activeTafsirId)}`;
}

/* ------------------------------------------------------------------ */
/* Mushaf display settings                                             */
/* ------------------------------------------------------------------ */

export function buildMushafSettingsPanel(state) {
  const lang = state.settings.language;
  const prefs = state.settings.mushafPrefs;
  // Defense-in-depth (review v3.3 B1): sanitized upstream, but the slider
  // value attributes still interpolate prefs — emit clamped numbers only.
  // (v4.5) the range widened to match the new pinch-zoom / ctrl+wheel span.
  const fontScale = clamp(Number(prefs.fontScale) || 1, 0.6, 2.2);
  const lineSpacing = clamp(Number(prefs.lineSpacing) || 1, 0.85, 1.3);

  const fontRow = MUSHAF_FONTS.map(
    (f) => `
    <button type="button" class="mushaf-settings__font ${prefs.font === f.id ? 'mushaf-settings__font--active' : ''}" data-action="mushaf-set-font" data-font="${f.id}" style="font-family:${f.family}">
      <span class="mushaf-settings__font-sample" dir="rtl" lang="ar">${'\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650'}</span>
      <span class="mushaf-settings__font-name">${escapeHTML(pickLocale(f.name, lang))}</span>
    </button>`
  ).join('');

  const paperRow = MUSHAF_PAPERS.map(
    (p) => `
    <button type="button" class="mushaf-settings__paper ${prefs.paper === p.id ? 'mushaf-settings__paper--active' : ''}" data-action="mushaf-set-paper" data-paper="${p.id}" style="background:${p.bg};color:${p.ink};border-color:${p.border}" aria-label="${escapeHTML(pickLocale(p.name, lang))}" title="${escapeHTML(pickLocale(p.name, lang))}">
      ${prefs.paper === p.id ? icon('check', { size: 14 }) : ''}
    </button>`
  ).join('');

  const toggle = (key, labelKey, sub = false) => `
    <label class="toggle-row${sub ? ' toggle-row--sub' : ''}">
      <span class="toggle-row__label">${t(labelKey, lang)}</span>
      <span class="switch">
        <input type="checkbox" data-action="toggle-mushaf-pref" data-key="${key}" ${prefs[key] ? 'checked' : ''} />
        <span class="switch__track"></span>
      </span>
    </label>`;

  return `
  <div class="mushaf-settings">
    <h2 id="modal-title-mushaf-settings">${t('mushaf.settingsTitle', lang)}</h2>

    <h3 class="mushaf-jump__heading">${t('mushaf.font', lang)}</h3>
    <div class="mushaf-settings__fonts">${fontRow}</div>

    <h3 class="mushaf-jump__heading">${t('mushaf.paper', lang)}</h3>
    <div class="mushaf-settings__papers">${paperRow}</div>

    <h3 class="mushaf-jump__heading">${t('mushaf.textSize', lang)}</h3>
    <input class="slider" type="range" min="0.6" max="2.2" step="0.05" value="${fontScale}" data-bind="mushaf-font-scale" aria-label="${t('mushaf.textSize', lang)}" />

    <h3 class="mushaf-jump__heading">${t('mushaf.lineSpacing', lang)}</h3>
    <input class="slider" type="range" min="0.85" max="1.3" step="0.05" value="${lineSpacing}" data-bind="mushaf-line-spacing" aria-label="${t('mushaf.lineSpacing', lang)}" />

    <h3 class="mushaf-jump__heading">${t('mushaf.bismillahStyle', lang)}</h3>
    <div class="mushaf-settings__bismillah">
      ${['auto', 'gold', 'accent', 'hidden']
        .map(
          (st) => `
      <button type="button" class="mushaf-settings__bismillah-chip ${prefs.bismillahStyle === st ? 'mushaf-settings__bismillah-chip--active' : ''}" data-action="mushaf-set-bismillah" data-style="${st}">
        <span dir="rtl" lang="ar" class="bismillah-sample bismillah--${st}">بِسْمِ اللَّهِ</span>
        <span class="mushaf-settings__bismillah-label">${t(`mushaf.bismillah_${st}`, lang)}</span>
      </button>`
        )
        .join('')}
    </div>

    <h3 class="mushaf-jump__heading">${t('mushaf.behavior', lang)}</h3>
    ${toggle('spread', 'mushaf.spread')}
    ${toggle('pageFlipAnimation', 'mushaf.flipAnimation')}
    ${toggle('autoFit', 'mushaf.autoFit')}

    <h3 class="mushaf-jump__heading">${t('mushaf.marksLegend', lang)}</h3>
    <ul class="mushaf-settings__marks">
      <li><span class="mushaf-mark mushaf-mark--sajdah" dir="rtl" lang="ar" aria-hidden="true">۩</span> ${t('mushaf.marksSajda', lang)}</li>
      <li><span class="mushaf-mark mushaf-mark--hizb" dir="rtl" lang="ar" aria-hidden="true">۞</span> ${t('mushaf.marksHizb', lang)}</li>
      <li><span class="mushaf-mark mushaf-mark--waqf" dir="rtl" lang="ar" aria-hidden="true">ۚ</span> ${t('mushaf.marksWaqf', lang)}</li>
    </ul>

    <h3 class="mushaf-jump__heading">${t('mushaf.studyAids', lang)}</h3>
    ${toggle('wordByWordStudy', 'mushaf.wordStudy')}
    ${toggle('wordUnderline', 'mushaf.wordUnderline', true)}
    ${toggle('tajweedColoring', 'mushaf.tajweed')}
    ${toggle('tajweedInspector', 'mushaf.tajweedInspector')}

    <div class="mushaf-settings__study-links">
      <button type="button" class="btn btn--secondary practice-launch-btn" data-action="practice-open">
        ${icon('sparkle', { size: 15 })} ${t('practice.launchFromSettings', lang)}
      </button>
      <button type="button" class="btn btn--secondary practice-launch-btn" data-action="tajweed-open-settings">
        ${icon('sparkle', { size: 15 })} ${t('mushaf.tajweedSettings', lang)}
      </button>
    </div>

    ${
      prefs.tajweedColoring
        ? `
    <h3 class="mushaf-jump__heading">${t('mushaf.tajweedLegend', lang)}</h3>
    <div class="tajweed-legend">
      ${TAJWEED_FAMILIES.map((family) => {
        // The legend mirrors the page exactly: family swatches resolve the
        // user's color overrides, and rules toggled off render as plain
        // swatches (the page leaves them uncolored). Defaults alone used
        // to render here, so any customization made this chart disagree
        // with the colored text.
        const override = prefs.colors?.[family.id];
        const familyColor =
          typeof override === 'string' && /^#[0-9a-fA-F]{6}$/.test(override)
            ? override
            : family.color;
        return `
        <div class="tajweed-legend__family">
          <div class="tajweed-legend__family-head">
            <span class="tajweed-legend__swatch" style="background:${familyColor}"></span>
            <span class="tajweed-legend__family-name">${escapeHTML(pickLocale(family.name, lang))}</span>
          </div>
          <p class="tajweed-legend__family-desc">${escapeHTML(pickLocale(family.desc, lang))}</p>
          ${TAJWEED_RULES.filter((r) => r.family === family.id)
            .map((r) => {
              const on = ruleEnabled(prefs, r.id);
              const rc = on ? effectiveRuleColor(prefs, r) : null;
              return `
          <div class="tajweed-legend__row">
            <span class="tajweed-legend__swatch tajweed-legend__swatch--${rc ? 'solid' : 'plain'}" ${rc ? `style="background:${rc}"` : ''} title="${escapeHTML(t('mushaf.tajweedUncolored', lang))}"></span>
            <div>
              <div class="tajweed-legend__name">${escapeHTML(pickLocale(r.name, lang))}</div>
              <div class="tajweed-legend__desc">${escapeHTML(pickLocale(r.desc, lang))}</div>
            </div>
          </div>`;
            })
            .join('')}
        </div>`;
      }).join('')}
      <div class="tajweed-legend__row tajweed-legend__row--plain">
        <span class="tajweed-legend__swatch tajweed-legend__swatch--plain"></span>
        <div>
          <div class="tajweed-legend__name">${escapeHTML(t('mushaf.tajweedUncolored', lang))}</div>
          <div class="tajweed-legend__desc">${escapeHTML(t('mushaf.tajweedCoverage', lang))}</div>
        </div>
      </div>
    </div>`
        : ''
    }

    <h3 class="mushaf-jump__heading">${t('mushaf.waqfLegend', lang)}</h3>
    <p class="panel__subtext">${t('mushaf.waqfIntro', lang)}</p>
    <div class="waqf-legend">
      ${WAQF_MARKS.map(
        (m) => `
      <div class="waqf-legend__row">
        <span class="waqf-mark" dir="rtl" lang="ar" aria-hidden="true">${m.mark}</span>
        <div>
          <div class="waqf-legend__name">${escapeHTML(t(m.nameKey, lang))}</div>
          <div class="waqf-legend__desc">${escapeHTML(t(m.descKey, lang))}</div>
        </div>
      </div>`
      ).join('')}
    </div>
  </div>`;
}
