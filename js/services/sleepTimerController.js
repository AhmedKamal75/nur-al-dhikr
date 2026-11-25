/** One wall-clock sleep deadline and interval shared by all audio adapters. */
import { SLEEP_TIMER_CHOICES, volumeAt, countdownLabel } from '../domain/sleepTimer.js';

const adapters = new Map();
let timer = null;
let interval = null;
let generation = 0;
const off = () => ({ enabled: false, minutes: null, label: '' });

export function registerSleepAdapter(owner, adapter) {
  adapters.set(owner, adapter);
}

export function sleepSnapshotFor(owner) {
  return timer?.owner === owner
    ? {
        enabled: true,
        minutes: timer.minutes,
        label: countdownLabel({ ...timer, enabled: true }, Date.now()),
      }
    : off();
}

export function sleepVolumeFor(owner, now = Date.now()) {
  return volumeAt(timer?.owner === owner ? { ...timer, enabled: true } : null, now);
}

export function clearSleepFor(owner) {
  if (timer?.owner !== owner) return off();
  const old = timer;
  timer = null;
  generation++;
  if (interval !== null) clearInterval(interval);
  interval = null;
  adapters.get(old.owner)?.restore?.();
  adapters.get(old.owner)?.tick?.();
  return off();
}

function tick(token) {
  if (!timer || token !== generation) return;
  const current = timer;
  const adapter = adapters.get(current.owner);
  const volume = sleepVolumeFor(current.owner);
  if (volume <= 0) {
    clearSleepFor(current.owner);
    adapter?.expire?.();
    return;
  }
  adapter?.apply?.(volume);
  adapter?.tick?.();
}

export function armSleepFor(owner, minutes) {
  if (timer) clearSleepFor(timer.owner);
  const m = SLEEP_TIMER_CHOICES.includes(minutes) ? minutes : 30;
  timer = { owner, minutes: m, endsAtMs: Date.now() + m * 60000 };
  const token = ++generation;
  interval = setInterval(() => tick(token), 1000);
  tick(token);
  return sleepSnapshotFor(owner);
}

/** The existing speaker arbiter owns displacement, including paused/docked voices. */
export function clearDisplacedSleep(keptVoices) {
  if (timer && !keptVoices.has(timer.owner)) clearSleepFor(timer.owner);
}

export function tickSleepForTests() {
  tick(generation);
}
export function expireSleepForTests(owner) {
  if (timer?.owner === owner) {
    timer.endsAtMs = Date.now() - 1;
    tick(generation);
  }
  return sleepSnapshotFor(owner);
}
