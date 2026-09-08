/**
 * idb-boundary.test.js — B4 regressions: a blocked upgrade settles (never
 * a forever-pending promise), a failed open is retried (never memoized),
 * and a version-changed connection is evicted.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { openDB, withStore, resetIdbForTests } from '../js/core/idb/openDB.js';

function installFakeIdb() {
  const real = globalThis.indexedDB;
  const opens = [];
  const reqs = [];
  globalThis.indexedDB = {
    open(name, version) {
      const req = { name, version, result: null, error: null };
      opens.push({ name, version });
      reqs.push(req);
      return req;
    },
  };
  return {
    opens,
    reqs,
    restore() {
      if (real === undefined) delete globalThis.indexedDB;
      else globalThis.indexedDB = real;
      resetIdbForTests();
    },
  };
}

function fakeDb() {
  return {
    closed: false,
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    close() {
      this.closed = true;
    },
    onversionchange: null,
    onclose: null,
  };
}

test('B4: blocked upgrade settles and the next call retries', async () => {
  const idb = installFakeIdb();
  try {
    const p1 = openDB('testdb', 1);
    assert.equal(idb.opens.length, 1);
    idb.reqs[0].onblocked();
    assert.equal(await p1, null);
    // Not memoized: a later call opens again and can succeed.
    const p2 = openDB('testdb', 1);
    assert.equal(idb.opens.length, 2);
    const db = fakeDb();
    idb.reqs[1].result = db;
    idb.reqs[1].onsuccess();
    assert.equal(await p2, db);
  } finally {
    idb.restore();
  }
});

test('B4: transient open failure is not cached forever', async () => {
  const idb = installFakeIdb();
  try {
    const p1 = openDB('testdb', 1);
    idb.reqs[0].error = new Error('pressure');
    idb.reqs[0].onerror();
    assert.equal(await p1, null);
    const p2 = openDB('testdb', 1);
    assert.equal(idb.opens.length, 2);
    const db = fakeDb();
    idb.reqs[1].result = db;
    idb.reqs[1].onsuccess();
    assert.equal(await p2, db);
  } finally {
    idb.restore();
  }
});

test('B4: a live connection is reused, not re-opened', async () => {
  const idb = installFakeIdb();
  try {
    const p1 = openDB('testdb', 1);
    const db = fakeDb();
    idb.reqs[0].result = db;
    idb.reqs[0].onsuccess();
    assert.equal(await p1, db);
    assert.equal(await openDB('testdb', 1), db);
    assert.equal(idb.opens.length, 1);
  } finally {
    idb.restore();
  }
});

test('B4: versionchange closes our connection and evicts it', async () => {
  const idb = installFakeIdb();
  try {
    const p1 = openDB('testdb', 1);
    const db = fakeDb();
    idb.reqs[0].result = db;
    idb.reqs[0].onsuccess();
    await p1;
    db.onversionchange();
    assert.equal(db.closed, true);
    const p2 = openDB('testdb', 1);
    assert.equal(idb.opens.length, 2);
    const db2 = fakeDb();
    idb.reqs[1].result = db2;
    idb.reqs[1].onsuccess();
    assert.equal(await p2, db2);
  } finally {
    idb.restore();
  }
});

test('B4: upgrade callback runs on version upgrade', async () => {
  const idb = installFakeIdb();
  try {
    let upgraded = 0;
    const p = openDB('testdb', 2, () => {
      upgraded += 1;
    });
    idb.reqs[0].result = fakeDb();
    idb.reqs[0].onupgradeneeded();
    idb.reqs[0].onsuccess();
    await p;
    assert.equal(upgraded, 1);
  } finally {
    idb.restore();
  }
});

test('withStore resolves ok on complete and fail on abort/throw', async () => {
  const fakeTx = {
    objectStore: () => ({ put: (v) => ({ result: `key:${v.id}` }) }),
    oncomplete: null,
    onerror: null,
    onabort: null,
  };
  const db = { transaction: () => fakeTx };
  const p = withStore(db, 's', 'readwrite', (s) => s.put({ id: 7 }));
  fakeTx.oncomplete();
  const r = await p;
  assert.equal(r.success, true);
  assert.equal(r.value, 'key:7');

  const abortTx = {
    objectStore: () => ({ put: () => ({}) }),
    oncomplete: null,
    onerror: null,
    onabort: null,
    error: new Error('disk gone'),
  };
  const abortDb = { transaction: () => abortTx };
  const pAbort = withStore(abortDb, 's', 'readwrite', (s) => s.put({ id: 1 }));
  abortTx.onabort();
  const rAbort = await pAbort;
  assert.equal(rAbort.success, false);

  const badDb = {
    transaction: () => {
      throw new Error('no store');
    },
  };
  const rThrow = await withStore(badDb, 's', 'readwrite', (s) => s.put({ id: 1 }));
  assert.equal(rThrow.success, false);
});
