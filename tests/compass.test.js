/**
 * compass.test.js — (v5.17.4, real-phone pass) the iOS permission gate.
 * Android Chrome exposes DeviceOrientationEvent WITHOUT requestPermission:
 * the wrapper must resolve true there (nothing to ask) instead of
 * throwing into a false "denied". Missing API stays false; a throwing
 * gate stays false. Never throws, browsers or node.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { requestPermission, needsPermission, isSupported } from '../js/domain/compass.js';

test('compass gate: Android shape (no requestPermission fn) resolves true', async () => {
  const prev = globalThis.DeviceOrientationEvent;
  globalThis.DeviceOrientationEvent = {};
  try {
    assert.equal(needsPermission(), false, 'no gate to need');
    assert.equal(await requestPermission(), true, 'proceed straight to start()');
  } finally {
    if (prev === undefined) delete globalThis.DeviceOrientationEvent;
    else globalThis.DeviceOrientationEvent = prev;
  }
});

test('compass gate: iOS shape honors the prompt verdict', async () => {
  const prev = globalThis.DeviceOrientationEvent;
  try {
    globalThis.DeviceOrientationEvent = { requestPermission: async () => 'granted' };
    assert.equal(needsPermission(), true);
    assert.equal(await requestPermission(), true);
    globalThis.DeviceOrientationEvent = { requestPermission: async () => 'denied' };
    assert.equal(await requestPermission(), false);
    globalThis.DeviceOrientationEvent = {
      requestPermission: async () => {
        throw new Error('not a gesture');
      },
    };
    assert.equal(await requestPermission(), false, 'throwing gate never throws out');
  } finally {
    if (prev === undefined) delete globalThis.DeviceOrientationEvent;
    else globalThis.DeviceOrientationEvent = prev;
  }
});

test('compass gate: missing API is unsupported, never throws', async () => {
  const prev = globalThis.DeviceOrientationEvent;
  delete globalThis.DeviceOrientationEvent;
  try {
    assert.equal(isSupported(), false);
    assert.equal(needsPermission(), false);
    assert.equal(await requestPermission(), false);
  } finally {
    if (prev !== undefined) globalThis.DeviceOrientationEvent = prev;
  }
});
