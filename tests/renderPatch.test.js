import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchChildren, nodeKey, structuralKey, matchChildrenDeep } from '../js/renderer.js';

/**
 * The patch engine's matcher is pure (keys in, matches out) so the ordering
 * guarantees it must uphold for the DOM reconcile are directly testable:
 *   1. matches strictly increase in both sequences (document order kept);
 *   2. each previous node is used at most once (no node adopted twice);
 *   3. unmatched incoming nodes are -1 (fresh inserts);
 *   4. identity is exact (no fuzzy/partial matching, ever).
 */

const K = (s) => ({ outerHTML: s, nodeType: 1 });

describe('matchChildren (renderer patch engine)', () => {
  test('all-identical children match 1:1 in order', () => {
    const cur = ['<a>', '<b>', '<c>'];
    const inc = ['<a>', '<b>', '<c>'];
    assert.deepEqual(matchChildren(cur, inc), [0, 1, 2]);
  });

  test('a single changed child among unchanged ones is isolated', () => {
    // This is THE anti-flicker case: tap one control, only its subtree's
    // HTML differs — everything else must keep its live DOM node.
    const cur = ['<header>', '<p>old</p>', '<footer>'];
    const inc = ['<header>', '<p>new</p>', '<footer>'];
    assert.deepEqual(matchChildren(cur, inc), [0, -1, 2]);
  });

  test('insertions and removals map without reordering', () => {
    const cur = ['<a>', '<b>', '<c>'];
    assert.deepEqual(matchChildren(cur, ['<a>', '<x>', '<b>', '<c>']), [0, -1, 1, 2]);
    assert.deepEqual(matchChildren(cur, ['<b>', '<c>']), [1, 2]);
    assert.deepEqual(matchChildren(cur, ['<a>', '<c>']), [0, 2]);
  });

  test('matches strictly increase — order changes move, not re-pair', () => {
    const cur = ['<a>', '<b>'];
    // incoming [<b>, <a>]: <b> can match 1, but <a> may only match BEFORE
    // index 1 → -1. The reconcile will move the live <b> node into place.
    assert.deepEqual(matchChildren(cur, ['<b>', '<a>']), [1, -1]);
  });

  test('each previous node is used at most once (duplicates never double-bind)', () => {
    const cur = ['<x>', '<x>'];
    const inc = ['<x>', '<x>', '<x>'];
    const m = matchChildren(cur, inc);
    assert.deepEqual(m, [0, 1, -1]);
  });

  test('identical duplicates still pair greedily in order', () => {
    const cur = ['<x>', '<y>', '<x>'];
    assert.deepEqual(matchChildren(cur, ['<x>', '<x>']), [0, 2]);
  });

  test('null keys (non-elements) never match — they are always re-inserted', () => {
    assert.deepEqual(matchChildren(['<a>'], [null, '<a>']), [-1, 0]);
    assert.deepEqual(matchChildren([null, '<a>'], ['<a>']), [1]);
  });

  test('empty mounts and empty html are safe', () => {
    assert.deepEqual(matchChildren([], []), []);
    assert.deepEqual(matchChildren(['<a>'], []), []);
    assert.deepEqual(matchChildren([], ['<a>']), [-1]);
  });

  test('hostile input (long strings, weird content) cannot crash the matcher', () => {
    const big = 'x'.repeat(100_000);
    assert.deepEqual(matchChildren([big], [big]), [0]);
    assert.deepEqual(matchChildren([big], [big + '!']), [-1]);
    assert.deepEqual(matchChildren(['<img src=x onerror=alert(1)>'], ['<img src=x>']), [-1]);
  });
});

describe('nodeKey identity', () => {
  test('different node types never share a key even with equal text', () => {
    // Element vs text: keys are namespaced so a text node "x" can never be
    // "the same node" as an element serializing to "x".
    assert.notEqual(nodeKey(K('x')), nodeKey({ nodeType: 3, nodeValue: 'x' }));
  });

  test('null/undefined nodes key to null', () => {
    assert.equal(nodeKey(null), null);
    assert.equal(nodeKey(undefined), null);
  });
});

/* ------------------------------------------------------------------ */
/* v3.13 deep-reconcile tier: structural identity + two-pass matcher   */
/* ------------------------------------------------------------------ */

const HTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';

const E = (tag, { id = '', ns = HTML_NS } = {}) => ({
  nodeType: 1,
  nodeName: tag,
  id,
  namespaceURI: ns,
});
const T = (v) => ({ nodeType: 3, nodeValue: v });

describe('structuralKey (renderer deep-reconcile tier)', () => {
  test('elements key to namespace + tag (+ id), nothing else', () => {
    assert.equal(structuralKey(E('SECTION')), 'html:SECTION');
    assert.equal(structuralKey(E('INPUT', { id: 'q' })), 'html:INPUT#q');
    assert.equal(structuralKey(E('circle', { ns: SVG_NS })), 'svg:circle');
  });

  test('transient state classes cannot leak into the key (they never reach it)', () => {
    // The key deliberately ignores class: `is-just-completed` appearing on
    // the counter button must still be "the same node" structurally.
    const a = E('BUTTON');
    const b = E('BUTTON');
    assert.equal(structuralKey(a), structuralKey(b));
  });

  test('different ids never share a structural identity', () => {
    assert.notEqual(structuralKey(E('INPUT', { id: 'a' })), structuralKey(E('INPUT', { id: 'b' })));
  });

  test('namespaces never share a structural identity (svg circle != html circle)', () => {
    assert.notEqual(structuralKey(E('CIRCLE', { ns: SVG_NS })), structuralKey(E('CIRCLE')));
  });

  test('text/comment/null key to null — they never bind structurally', () => {
    assert.equal(structuralKey(T('x')), null);
    assert.equal(structuralKey(null), null);
    assert.equal(structuralKey({ nodeType: 8, nodeValue: 'c' }), null);
  });
});

describe('matchChildrenDeep (two-pass matcher)', () => {
  test('exact matches always win; structural fills only the gaps', () => {
    const curExact = ['<section class="focus">A</section>', '<p>keep</p>'];
    const incExact = ['<section class="focus">B</section>', '<p>keep</p>'];
    const curStruct = ['html:SECTION', 'html:P'];
    const incStruct = ['html:SECTION', 'html:P'];
    const m = matchChildrenDeep(curExact, incExact, curStruct, incStruct);
    // <p> bound exactly in pass 1; the changed root still binds in pass 2.
    assert.deepEqual(m, [0, 1]);
  });

  test('THE focus-mode case: single root with changed class binds structurally', () => {
    // Every counter tap changes the root's outerHTML (count, --pct, and a
    // transient class at cycle completion). The two-pass matcher must keep
    // binding it — otherwise the whole screen is destroyed and rebuilt.
    const curExact = ['<button class="focus__counter">1</button>'];
    const incExact = ['<button class="focus__counter is-just-completed">2</button>'];
    const m = matchChildrenDeep(curExact, incExact, ['html:BUTTON'], ['html:BUTTON']);
    assert.deepEqual(m, [0]);
  });

  test('structural fallback is order-preserving and never double-binds', () => {
    const m = matchChildrenDeep(
      ['<p>1</p>', '<p>2</p>'],
      ['<p>a</p>', '<p>b</p>', '<p>c</p>'],
      ['html:P', 'html:P'],
      ['html:P', 'html:P', 'html:P']
    );
    assert.deepEqual(m, [0, 1, -1]);
  });

  test('exact matches claim nodes first — structural pass skips them', () => {
    // <b> is byte-identical in the middle; the two changed siblings must
    // bind around it without stealing its node.
    const curExact = ['<div>old1</div>', '<b>keep</b>', '<div>old2</div>'];
    const incExact = ['<div>new1</div>', '<b>keep</b>', '<div>new2</div>'];
    const m = matchChildrenDeep(
      curExact,
      incExact,
      ['html:DIV', 'html:B', 'html:DIV'],
      ['html:DIV', 'html:B', 'html:DIV']
    );
    assert.deepEqual(m, [0, 1, 2]);
  });

  test('tag/id/namespace mismatches never bind — replaced as before', () => {
    assert.deepEqual(matchChildrenDeep(['<div>'], ['<span>'], ['html:DIV'], ['html:SPAN']), [-1]);
    assert.deepEqual(
      matchChildrenDeep(['<input id=a>'], ['<input id=b>'], ['html:INPUT#a'], ['html:INPUT#b']),
      [-1]
    );
    assert.deepEqual(
      matchChildrenDeep(['<circle cx=1/>'], ['<circle cx=2/>'], ['svg:CIRCLE'], ['html:CIRCLE']),
      [-1]
    );
  });

  test('text nodes never bind structurally (they are cheap to swap)', () => {
    const m = matchChildrenDeep(
      ['\u0000tb', '<b>'],
      ['\u0000ta', '<b>'],
      [null, 'html:B'],
      [null, 'html:B']
    );
    // <b> bound exactly (index 1); the changed text node stays -1.
    assert.deepEqual(m, [-1, 1]);
  });

  test('order changes move, not re-pair — the guarantee carries over', () => {
    const m = matchChildrenDeep(
      ['<b-old>', '<a-old>'],
      ['<a-new>', '<b-new>'],
      ['html:B', 'html:A'],
      ['html:A', 'html:B']
    );
    // <a> may only bind at/after its document position; binding to index 1
    // leaves <b> unmatched (it will be MOVED, matching the exact matcher).
    assert.deepEqual(m, [1, -1]);
  });

  test('empty inputs are safe; structural arrays may be omitted', () => {
    assert.deepEqual(matchChildrenDeep([], [], [], []), []);
    assert.deepEqual(matchChildrenDeep(['<a>'], ['<a>']), [0]); // no struct arrays at all
    assert.deepEqual(matchChildrenDeep([], ['<a>'], [], ['html:A']), [-1]);
  });

  test('hostile structural input cannot crash the matcher', () => {
    const big = 'html:' + 'X'.repeat(100_000);
    // Same structure, changed HTML: binds structurally (the intended tier-2).
    assert.deepEqual(matchChildrenDeep([big], [big + '!'], [big], [big]), [0]);
    // Different exact HTML AND different structure: never binds.
    assert.deepEqual(matchChildrenDeep([big], [big + 'x'], [big], [big + '!']), [-1]);
  });
});
