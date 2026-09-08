/**
 * trigger-plan.test.js — B10 regression: one channel per arm must not leak
 * an entangled port with a live handler. First worker reply wins;
 * later duplicates are ignored.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { sendTriggerPlan } from '../js/app/triggers.js';
import { rt } from '../js/app/rt.js';

const flush = () => new Promise((r) => setTimeout(r, 25));

test('B10: duplicate worker replies invoke onResult exactly once', async () => {
  const prev = rt.swRegistration;
  let workerPort = null;
  rt.swRegistration = {
    active: {
      postMessage: (msg, transfer) => {
        workerPort = transfer[0];
      },
    },
  };
  try {
    const calls = [];
    assert.equal(
      sendTriggerPlan([{ at: 1 }], (d) => calls.push(d)),
      true
    );
    assert.ok(workerPort, 'plan port handed to the worker');
    const reply = { type: 'schedule-prayer-triggers-result', supported: true, armed: 2 };
    workerPort.postMessage(reply);
    workerPort.postMessage(reply);
    await flush();
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], reply);
  } finally {
    rt.swRegistration = prev;
  }
});

test('B10: missing worker resolves false instead of throwing', () => {
  const prev = rt.swRegistration;
  rt.swRegistration = null;
  try {
    assert.equal(sendTriggerPlan([], null), false);
  } finally {
    rt.swRegistration = prev;
  }
});
