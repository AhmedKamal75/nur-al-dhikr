/** Focus owns its own session-only Screen Wake Lock, separate from other readers. */
import { store } from '../core/state.js';
import { VIEWS } from '../core/config.js';
import { resolveFocusQueue } from '../services/focusQueue.js';

export function createFocusWakeLock({ request, visible, publish }) {
  let session = null;
  let enabled = false;
  let status = 'off';
  let lock = null;
  let generation = 0;
  const emit = (next) => {
    status = next;
    publish({ enabled, status });
  };
  const release = (handle) => {
    try {
      Promise.resolve(handle?.release()).catch(() => {});
    } catch {
      /* best effort */
    }
  };
  const invalidate = () => {
    generation++;
    const old = lock;
    lock = null;
    release(old);
  };
  const acquire = async () => {
    if (!session || !enabled || !visible() || lock || status === 'requesting') return;
    if (!request) {
      emit('unsupported');
      return;
    }
    const ticket = ++generation;
    emit('requesting');
    try {
      const granted = await request();
      if (ticket !== generation || !session || !enabled || !visible()) {
        release(granted);
        return;
      }
      if (granted.released) {
        emit('released');
        return;
      }
      lock = granted;
      granted.addEventListener?.(
        'release',
        () => {
          if (lock !== granted) return;
          lock = null;
          emit('released');
        },
        { once: true }
      );
      emit('active');
    } catch {
      if (ticket === generation) emit('denied');
    }
  };
  return {
    sync(key) {
      if (key === session) return;
      session = key;
      enabled = false;
      invalidate();
      emit('off');
    },
    toggle() {
      if (!session) return;
      enabled = !enabled;
      invalidate();
      emit(enabled ? 'waiting' : 'off');
      if (enabled) void acquire();
    },
    visibilityChanged() {
      if (!session || !enabled) return;
      if (!visible()) {
        invalidate();
        emit('waiting');
      } else if (!lock && status !== 'requesting') {
        emit('waiting');
        void acquire();
      }
    },
    stop() {
      session = null;
      enabled = false;
      invalidate();
      emit('off');
    },
    snapshot: () => ({ enabled, status }),
  };
}

const controller = createFocusWakeLock({
  request:
    typeof navigator !== 'undefined' && navigator.wakeLock?.request
      ? () => navigator.wakeLock.request('screen')
      : null,
  visible: () => typeof document !== 'undefined' && document.visibilityState === 'visible',
  publish: (value) => {
    const current = store.getState().focusWake;
    if (current?.enabled !== value.enabled || current?.status !== value.status)
      store.dispatch({ type: 'FOCUS_WAKE_STATUS', value });
  },
});

export function syncFocusWake(state) {
  const queue = state.activeView === VIEWS.FOCUS ? resolveFocusQueue(state) : null;
  const key = queue?.item
    ? queue.collectionId
      ? `collection:${queue.collectionId}`
      : `category:${queue.cat.id}`
    : null;
  controller.sync(key);
}
export function toggleFocusWake() {
  syncFocusWake(store.getState());
  controller.toggle();
}
export function stopFocusWake() {
  controller.stop();
}
export function initFocusWake() {
  document.addEventListener('visibilitychange', () => controller.visibilityChanged());
  window.addEventListener('pagehide', () => controller.stop());
}
