/**
 * renderer.js
 * Treats state as read-only input and produces DOM output. Two render tiers:
 *  1. Shell (topbar + nav) — re-rendered only when settings/activeView change
 *     in a way that affects it (cheap either way, but kept separate for clarity).
 *  2. Main view — swapped entirely on every relevant state change, selected
 *     by state.activeView via VIEW_TABLE.
 *
 * No view module touches the DOM directly except through the strings they
 * return; only this file and app.js's event delegation actually mutate DOM.
 *
 * ---------------------------------------------------------------------------
 * The patch engine (v3.9) — why innerHTML assignment alone was not enough
 * ---------------------------------------------------------------------------
 * Every tap dispatches an action, and every action used to re-assign the
 * innerHTML of topbar, nav, main and the player bar — even when the new HTML
 * was byte-identical to what was already on screen. Re-assigning innerHTML
 * forces the browser to re-parse, re-create every node, restart every CSS
 * animation/transition, drop focus, and re-decode images: the "F5 refresh"
 * flash on parts of the page. That was the single most reported UX defect.
 *
 * patchHTML() is the universal fix, in four escalating tiers:
 *   1. IDENTICAL STRING → assign nothing. The hot path for taps whose render
 *      output didn't change a region (most taps touch one region at most).
 *   2. CHANGED STRING → child reconcile, descending. Children are matched
 *      greedily in order, first by exact identity (outerHTML — byte-identical
 *      subtrees bind first and are then skipped entirely) and, failing that,
 *      by STRUCTURAL identity (same namespace + tag + id — see structuralKey).
 *      A structural match keeps the live DOM node and updates it in place:
 *      attributes are synced, then the reconcile recurses into its children.
 *      Unchanged subtrees therefore never restart their CSS animations, never
 *      re-decode images, never lose their inner scroll positions, and inputs
 *      sitting in an unchanged subtree keep focus naturally. The structural
 *      tier is what fixed the focus-mode flicker (v3.13): a single-root view
 *      like `<section class="focus">` used to fail exact matching on every
 *      counter tap — the whole root was destroyed and rebuilt, which is
 *      itself an innerHTML replacement by another name. Now the root is
 *      matched structurally and patched in place, so only the genuinely
 *      changed nodes (the count text, the ring's --pct) are touched and the
 *      ring's stroke-dashoffset transition finally gets to animate.
 *   3. FOCUS SALVAGE — when the focused form field itself sits inside a
 *      replaced subtree (e.g. search-as-you-type re-renders the input with a
 *      new value attribute), focus is captured before the patch and restored
 *      to the matching field afterwards, with the text selection preserved.
 *      (In-place patches never replace the focused node, so this tier
 *      naturally becomes a no-op for them.)
 *
 * Attribute syncing is safe for form fields by construction: setting the
 * `value`/`checked` ATTRIBUTES only changes their DEFAULT values — the live,
 * user-owned property state is never written, so typed-ahead text and
 * user toggles survive every patch.
 *
 * The matchers (matchChildren, matchChildrenDeep) and the key functions are
 * pure functions on node-like inputs, so they are directly unit-testable
 * without a DOM (tests/renderPatch.test.js).
 */

import { VIEWS, APP_NAME } from '../core/config.js';
import { t } from '../core/i18n.js';
import { buildHash, consumePopNavigation } from '../core/router.js';
import { rt } from './rt.js';
import { showToast } from '../ui/toast.js';
import { renderTopBar, renderNav } from '../ui/shell.js';
import { renderHome } from '../views/home.js';
import { renderLibrary } from '../views/library.js';
import { renderCategory } from '../views/category.js';
import { renderMood } from '../views/mood.js';
import { renderFocus } from '../views/focus.js';
import { renderSearch } from '../views/search.js';
import { renderFavorites } from '../views/favorites.js';
import { renderCollections } from '../views/collections.js';
import { renderCollection } from '../views/collection.js';
import { renderStatistics } from '../views/statistics.js';
import { renderTasbih } from '../views/tasbih.js';
import { renderPrayer } from '../views/prayer.js';
import { renderQibla } from '../views/qibla.js';
import { renderChecklist } from '../views/checklist.js';
import { renderQuiz } from '../views/quiz.js';
import { renderMushaf } from '../views/mushafReader.js';
import { renderCalendar } from '../views/calendar.js';
import { renderRamadan } from '../views/ramadan.js';
import { renderZakat } from '../views/zakat.js';
import { renderAudio } from '../views/audioManager.js';
import { renderQuran } from '../views/quran.js';
import { renderRoots } from '../views/roots.js';
import { renderHadith } from '../views/hadith.js';
import { renderSettings } from '../views/settings.js';
import { renderAbout } from '../views/about.js';
import { renderEditor } from '../views/editor.js';
import { renderGarden } from '../views/garden.js';
import { renderMutashabihat } from '../views/mutashabihat.js';
import { renderJournal } from '../views/journal.js';
import { renderCertificate } from '../views/certificate.js';
import { renderPlayerBar } from '../views/playerBar.js';

const VIEW_TABLE = {
  [VIEWS.HOME]: renderHome,
  [VIEWS.LIBRARY]: renderLibrary,
  [VIEWS.CATEGORY]: renderCategory,
  [VIEWS.MOOD]: renderMood,
  [VIEWS.FOCUS]: renderFocus,
  [VIEWS.SEARCH]: renderSearch,
  [VIEWS.FAVORITES]: renderFavorites,
  [VIEWS.COLLECTIONS]: renderCollections,
  [VIEWS.COLLECTION]: renderCollection,
  [VIEWS.STATISTICS]: renderStatistics,
  [VIEWS.TASBIH]: renderTasbih,
  [VIEWS.PRAYER]: renderPrayer,
  [VIEWS.QIBLA]: renderQibla,
  [VIEWS.CHECKLIST]: renderChecklist,
  [VIEWS.QUIZ]: renderQuiz,
  [VIEWS.MUSHAF]: renderMushaf,
  [VIEWS.CALENDAR]: renderCalendar,
  [VIEWS.RAMADAN]: renderRamadan,
  [VIEWS.ZAKAT]: renderZakat,
  [VIEWS.AUDIO]: renderAudio,
  [VIEWS.QURAN]: renderQuran,
  [VIEWS.ROOTS]: renderRoots,
  [VIEWS.HADITH]: renderHadith,
  [VIEWS.SETTINGS]: renderSettings,
  [VIEWS.ABOUT]: renderAbout,
  [VIEWS.EDITOR]: renderEditor,
  [VIEWS.MUTASHABIHAT]: renderMutashabihat,
  [VIEWS.JOURNAL]: renderJournal,
  [VIEWS.CERTIFICATE]: renderCertificate,
  [VIEWS.GARDEN]: renderGarden,
};

let lastView = null;
let lastViewKey = '';
const scrollMemory = new Map();
let mainEl = null;
let topbarEl = null;
let navEl = null;
let viewEnterTimer = null;

/** Scroll memory key: view + id, so quran/2 and quran/3 remember
 *  independently and category pages restore per-category. */
function viewKeyOf(view, params) {
  return `${view}|${params?.id || ''}`;
}

/** How long the view-enter animation state ([data-view-enter]) stays on
 *  #main. Matches the viewIn keyframe's var(--dur-slow) (280ms) plus a
 *  small safety margin so the attribute outlives the animation it gates. */
export const VIEW_ENTER_MS = 350;

/**
 * Pure decision: does moving from `prevView` to `nextView` deserve the
 * one-shot entrance animation? True for genuine navigation (including the
 * very first render, whose null prev is a fresh arrival) and always false
 * for same-view re-renders — the anti-flicker guarantee: no state change
 * inside a view may ever re-run its entrance animation.
 * Exported for unit tests.
 */
export function shouldMarkViewEnter(prevView, nextView) {
  return prevView !== nextView;
}

export function mountShell() {
  mainEl = document.getElementById('main');
  topbarEl = document.getElementById('topbar');
  navEl = document.getElementById('bottomnav');
}

/* ------------------------------------------------------------------ */
/* Patch engine                                                        */
/* ------------------------------------------------------------------ */

/**
 * Serial identity of a top-level node. Two nodes with the same key are the
 * "same" content; the matcher is only ever given these keys.
 * Exported indirectly through tests via matchChildren; kept tiny on purpose.
 */
export function nodeKey(node) {
  if (!node) return null;
  if (node.nodeType === 3 /* TEXT */) return `\u0000t${node.nodeValue}`;
  if (node.nodeType === 8 /* COMMENT */) return `\u0000c${node.nodeValue}`;
  if (node.nodeType === 1 /* ELEMENT */) return node.outerHTML;
  return null; // doctype / processing instructions: never matched
}

/**
 * Greedy order-preserving match between previous and next top-level keys.
 * Returns matchOf[i] = index in curKeys that incKeys[i] corresponds to, or -1.
 * Matches strictly increase (both sequences stay in relative order), each
 * previous node is used at most once. O(n·m) worst case, but n and m are the
 * handful of top-level children of a mount — the fast path (all identical)
 * exits on the first equality scan per node.
 * Pure — exported for unit tests.
 */
export function matchChildren(curKeys, incKeys) {
  const used = new Array(curKeys.length).fill(false);
  const matchOf = new Array(incKeys.length).fill(-1);
  let j = 0;
  for (let i = 0; i < incKeys.length; i++) {
    const key = incKeys[i];
    if (key == null) continue;
    for (let k = j; k < curKeys.length; k++) {
      if (used[k]) continue;
      if (curKeys[k] === key) {
        used[k] = true;
        matchOf[i] = k;
        j = k + 1;
        break;
      }
    }
  }
  return matchOf;
}

/**
 * Structural identity of an element node: namespace + tag name + id, and
 * deliberately NOTHING else. Class is excluded on purpose — transient state
 * classes (`is-just-completed`, `icon-btn--playing`, `icon-btn--active`)
 * appear and disappear on an otherwise-identical node, and it is exactly
 * those taps that must patch in place rather than replace. Two elements with
 * the same structural key are "the same kind of node in the same slot"; the
 * reconcile may then keep the live one and sync it to the incoming shape.
 * Text/comment nodes return null — they are cheap to swap and carry no
 * animation state, so they only ever match by exact key.
 * Pure — exported for unit tests. Accepts any node-like object (real DOM
 * nodes or the fake objects used in tests).
 */
export function structuralKey(node) {
  if (!node || node.nodeType !== 1) return null;
  const ns = node.namespaceURI;
  const short =
    ns === 'http://www.w3.org/2000/svg'
      ? 'svg'
      : ns === 'http://www.w3.org/1999/xhtml' || ns == null
        ? 'html'
        : `other:${ns}`;
  return `${short}:${node.nodeName}${node.id ? `#${node.id}` : ''}`;
}

/**
 * Two-pass matcher. Pass 1 is the exact matcher above — byte-identical
 * subtrees bind first, which is the overwhelmingly common case and costs
 * nothing extra. Pass 2 gives every still-unmatched incoming element a
 * second chance to bind to an unmatched current element with the same
 * STRUCTURAL key, strictly after the previous structural binding (document
 * order kept) and never double-binding a node. Unmatched stays -1.
 *
 * This is the tier that fixed the focus-mode flicker: a single-root view's
 * root never matches by outerHTML once anything inside it changed, but it
 * still matches structurally, so the reconcile now descends and updates in
 * place instead of destroying and rebuilding the whole subtree.
 * Pure — exported for unit tests.
 */
export function matchChildrenDeep(curExact, incExact, curStruct, incStruct) {
  const matchOf = matchChildren(curExact, incExact);
  const used = new Array(curExact.length).fill(false);
  for (let i = 0; i < matchOf.length; i++) {
    if (matchOf[i] !== -1) used[matchOf[i]] = true;
  }
  let j = 0;
  for (let i = 0; i < incExact.length; i++) {
    if (matchOf[i] !== -1) continue; // bound exactly in pass 1
    const key = incStruct ? incStruct[i] : null;
    if (key == null) continue; // text/comment never bind structurally
    for (let k = j; k < curStruct.length; k++) {
      if (used[k]) continue;
      if (curStruct[k] != null && curStruct[k] === key) {
        used[k] = true;
        matchOf[i] = k;
        j = k + 1;
        break;
      }
    }
  }
  return matchOf;
}

/**
 * Identity selector for focus salvage: how to FIND this field again in the
 * freshly patched mount. Only resolvable, reasonably unique identities are
 * honoured (id, data-bind, name) — everything else declines.
 */
function focusSignature(el) {
  if (!el || typeof el.matches !== 'function') return null;
  if (!el.matches('input, textarea, select')) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.dataset?.bind) return `[data-bind="${CSS.escape(el.dataset.bind)}"]`;
  if (el.name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
  return null;
}

/**
 * Sync a structurally-matched current element to the incoming shape, in
 * place: copy attributes over (removing stale ones), then reconcile the
 * child list one level deeper. The node itself is NEVER replaced — that is
 * the whole point: its CSS transitions keep their start state, its scroll
 * position, its focus, its decoded images all survive.
 *
 * Attribute syncing is deliberately wholesale and property-safe: writing
 * the `value`/`checked`/`selected` ATTRIBUTES only changes DEFAULT state,
 * never the live user-owned property, so in-place patching cannot clobber
 * typed-ahead text or user toggles.
 */
function patchElement(cur, inc) {
  for (const attr of Array.from(cur.attributes)) {
    if (!inc.hasAttribute(attr.name)) cur.removeAttribute(attr.name);
  }
  for (const attr of Array.from(inc.attributes)) {
    if (cur.getAttribute(attr.name) !== attr.value) {
      cur.setAttribute(attr.name, attr.value);
    }
  }
  reconcileChildren(cur, Array.from(inc.childNodes));
}

/**
 * Reconcile el's child list against the incoming node list with the
 * two-pass matcher: exact-bound elements are left untouched (their subtree
 * is byte-identical by definition of the key), structural-bound elements
 * are patched in place, matched text/comment nodes are already equal,
 * unmatched incoming nodes are inserted, unmatched current nodes removed.
 * Returns true when anything moved at all.
 */
function reconcileChildren(el, incoming) {
  const current = Array.from(el.childNodes);
  const curExact = current.map(nodeKey);
  const incExact = incoming.map(nodeKey);

  // Cheap fast path: same child count AND every child byte-identical in
  // order — the whole subtree is already equal, touch nothing.
  const identical =
    curExact.length === incExact.length &&
    curExact.every((k, i) => k !== null && k === incExact[i]);
  if (identical) return false;

  const matchOf = matchChildrenDeep(
    curExact,
    incExact,
    current.map(structuralKey),
    incoming.map(structuralKey)
  );

  let cursor = el.firstChild;
  for (let i = 0; i < incoming.length; i++) {
    const mi = matchOf[i];
    if (mi === -1) {
      el.insertBefore(incoming[i], cursor); // genuinely new child
      continue;
    }
    const existing = current[mi];
    if (existing !== cursor) {
      el.insertBefore(existing, cursor); // keep the live node, move it into place
    }
    if (existing.nodeType === 1 && curExact[mi] !== incExact[i]) {
      // Structural match (exact matches are byte-identical => skip): sync
      // attributes and descend. incoming[i] is guaranteed to be an element
      // here — only elements carry structural keys.
      patchElement(existing, incoming[i]);
    }
    cursor = existing.nextSibling;
  }
  while (cursor) {
    const next = cursor.nextSibling;
    el.removeChild(cursor); // unmatched old children, in one pass
    cursor = next;
  }
  return true;
}

/**
 * Patch a mount to `html` with the tiers described in the header.
 * Returns true when the DOM was touched at all (never true when tier 1
 * short-circuited). Never throws outwards for malformed input — a failed
 * reconcile falls back to a plain innerHTML assignment, i.e. the pre-v3.9
 * behaviour, so the engine can only ever be as safe as the old path.
 */
export function patchHTML(el, html) {
  if (!el) return false;
  if (el.__html === html) return false; // tier 1: nothing to do at all

  // Focus salvage context — captured BEFORE any DOM change.
  const active = document.activeElement;
  const salvage =
    el.contains(active) && active !== el
      ? { sig: focusSignature(active), sel: selectionOf(active) }
      : null;

  let patched = false;
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    patched = reconcileChildren(el, Array.from(tpl.content.childNodes));
  } catch {
    el.innerHTML = html; // belt-and-braces fallback: the old behaviour
    patched = true;
  }

  el.__html = html;

  if (salvage && salvage.sig) {
    const again = el.querySelector(salvage.sig);
    if (again && document.activeElement !== again) {
      try {
        again.focus();
        restoreSelection(again, salvage.sel);
      } catch {
        /* focus is best-effort; never let it break rendering */
      }
    }
  }
  return patched;
}

function selectionOf(el) {
  try {
    if (el && typeof el.selectionStart === 'number') {
      return { start: el.selectionStart, end: el.selectionEnd };
    }
  } catch {
    /* some input types throw on selectionStart — irrelevant */
  }
  return null;
}

function restoreSelection(el, sel) {
  if (!sel || typeof el.setSelectionRange !== 'function') return;
  try {
    el.setSelectionRange(sel.start, sel.end);
  } catch {
    /* input types without selection API */
  }
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

export function render(state) {
  if (!mainEl) mountShell();

  // (v4.5.2, I9) BACK-STACK BOOKKEEPING RUNS FIRST. The topbar patch a few
  // lines below reads rt.navBackStack to decide whether the Back button
  // exists — if the push happened in the late view-change block (after the
  // topbar was already patched), the button would always render one
  // navigation behind and effectively never appear. Capture the pop flag
  // here, once, and let the scroll-restore block below reuse it.
  const viewChanging = state.activeView !== lastView;
  let wasPopNavigation = false;
  if (viewChanging) {
    wasPopNavigation = consumePopNavigation();
    if (wasPopNavigation) {
      if (rt.navBackStack.length) rt.navBackStack.pop();
    } else if (lastView) {
      rt.navBackStack.push(lastViewKey);
    }
  }

  patchHTML(topbarEl, renderTopBar(state));
  patchHTML(navEl, renderNav(state));

  // Unknown routes (a mistyped/shared deep link like #/xyz) used to render
  // Home silently with the bogus URL intact and no nav item active. Render
  // Home for now, then normalize the URL and say so — out of the render
  // path, so the dispatch can't re-enter this render.
  const isKnownView = Object.prototype.hasOwnProperty.call(VIEW_TABLE, state.activeView);
  const view = VIEW_TABLE[state.activeView] || renderHome;
  if (!isKnownView) {
    const lang = state.settings.language;
    queueMicrotask(() => {
      window.history.replaceState(window.history.state, '', buildHash(VIEWS.HOME));
      showToast(t('common.error', lang));
    });
  }
  const isFocus = state.activeView === VIEWS.FOCUS;
  document.body.classList.toggle('is-focus-mode', isFocus);
  // (v4.4) TRUE fullscreen Mushaf: the body-level class that hides every
  // piece of chrome and lets the book claim the whole viewport. The
  // renderer owns body classes because views are pure string templates.
  document.body.classList.toggle('is-mushaf-fullscreen', state.mushafFullscreen === true);
  // (v4.5) the Mushaf route gets a wide reading column (facing pages on
  // desktop); the classic reader's immersive mode hides its chrome. Both
  // scoped to their own routes — NAVIGATE resets the fullscreen/immersive
  // flags, and these classes follow the view, never lead it.
  document.body.classList.toggle('is-mushaf-view', state.activeView === VIEWS.MUSHAF);
  document.body.classList.toggle(
    'is-reader-immersive',
    state.readerImmersive === true && state.activeView === VIEWS.QURAN
  );
  // Desktop rail collapse rides on <html> so layout margins (not just the
  // rail itself) can react to it in pure CSS.
  // (v4.5.2 FIX — "the collapsible sidebar you destroyed") the attribute
  // wrote '1'/'0' while every layout.css selector matches 'true' — the
  // hamburger flipped the attribute and NOTHING moved: rail stayed 240px,
  // labels stayed visible, main margin never retracted. Values now match
  // the CSS contract exactly.
  document.documentElement.setAttribute(
    'data-nav-collapsed',
    state.settings.navCollapsed ? 'true' : 'false'
  );

  const viewChanged = shouldMarkViewEnter(lastView, state.activeView);
  // v3.12 (Phase B): the view entrance animation is no longer keyed on the
  // .view class itself (which re-ran every time the patch engine replaced
  // the view's root — i.e. on every content-changing tap inside single-root
  // views). It is now gated on this transient attribute, stamped ONLY when
  // the active view actually changed, and removed once the entrance is done.
  // Same-view re-renders therefore never re-animate, and navigation keeps
  // its gentle rise-and-fade, built on top of the v3.9 patch engine rather
  // than fighting it.
  if (viewChanged && mainEl) {
    mainEl.setAttribute('data-view-enter', '');
    if (viewEnterTimer) clearTimeout(viewEnterTimer);
    viewEnterTimer = setTimeout(() => {
      mainEl.removeAttribute('data-view-enter');
      viewEnterTimer = null;
    }, VIEW_ENTER_MS);
  }

  // Capture the outgoing scroll position BEFORE the main patch replaces
  // content (content height changes after the patch).
  const outgoingScroll = mainEl ? mainEl.scrollTop : 0;
  patchHTML(mainEl, view(state));

  // Persistent player bar: rendered into its own mount AFTER the main view
  // so it survives view switches (it lives outside #main in body flow).
  const barMount = document.getElementById('playerbar');
  if (barMount) {
    patchHTML(barMount, renderPlayerBar(state));
    // A bare aria-label on a role-less div is ignored by assistive tech —
    // make the bar a named region whenever it is visible.
    if (state.player?.moshafId || state.surahPlayback?.active) {
      barMount.setAttribute('role', 'region');
      barMount.setAttribute('aria-label', t('audio.player', state.settings.language));
    } else {
      barMount.removeAttribute('role');
      barMount.removeAttribute('aria-label');
    }
  }
  // Reserve scroll room under the bar whenever it is visible.
  document.body.classList.toggle(
    'has-player',
    !!(state.player?.moshafId || state.surahPlayback?.active)
  );

  if (viewChanging) {
    const nextKey = viewKeyOf(state.activeView, state.activeParams);
    if (lastView) scrollMemory.set(lastViewKey, outgoingScroll);
    // (v4.5.2, I9) the back-stack push/pop already ran at the TOP of this
    // render (before the topbar patch); wasPopNavigation is the flag it
    // captured. Scroll restore keeps using the same answer.
    const wasPop = wasPopNavigation;
    const saved = wasPop ? scrollMemory.get(nextKey) : null;
    if (saved != null) {
      mainEl.scrollTop = saved;
    } else {
      scrollMemory.delete(nextKey);
      mainEl.scrollTo({
        top: 0,
        behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto',
      });
    }
    lastView = state.activeView;
    lastViewKey = nextKey;
    // Per-route document title: multi-tab, history and screen-reader users
    // can finally tell "Qur'an — Al-Baqarah" apart from Settings.
    // (v4.3) an unknown route (hand-typed #/xyz that slipped past the
    // router's normalization) used to title the tab "title.xyz — Nūr
    // al-Dhikr" — t() falls back to the raw key. Fall back to Home's title
    // instead, mirroring the view the person actually sees.
    const titleKey = 'title.' + state.activeView;
    const lang = state.settings.language;
    const titleText = t(titleKey, lang);
    document.title = `${titleText === titleKey ? t('title.home', lang) : titleText} — ${APP_NAME}`;
    // Move focus to the main region heading for screen reader / keyboard users on navigation.
    mainEl.focus({ preventScroll: true });
  }
}
