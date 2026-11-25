/** Shared request ownership. Resource adapters retain their own data/UI policy. */
export function createAsyncResource({
  generation = () => 0,
  cooldownUntil = () => 0,
  start = () => {},
  reset = () => {},
  finish = () => {},
  abortable = false,
} = {}) {
  let pending = null;
  let revision = 0;
  function invalidate() {
    revision++;
    const old = pending;
    pending = null;
    reset();
    old?.controller?.abort();
  }
  function run(
    load,
    {
      success = (value) => value,
      failure = (error) => {
        throw error;
      },
    } = {}
  ) {
    if (pending) return pending.promise;
    if (Date.now() < cooldownUntil()) return Promise.resolve(false);
    const owner = {
      generation: generation(),
      controller: abortable ? new AbortController() : null,
    };
    let resolve, reject;
    owner.promise = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    // Publish before invoking any callback: adapters may synchronously notify/reenter.
    pending = owner;
    const current = () =>
      pending === owner && owner.generation === generation() && !owner.controller?.signal.aborted;
    const context = { current, signal: owner.controller?.signal, controller: owner.controller };
    async function execute() {
      try {
        start(context);
        if (!current()) return false;
        const value = await load(context);
        if (!current()) return false;
        return success(value, context);
      } catch (error) {
        if (!current()) return false;
        return failure(error, context);
      } finally {
        if (current()) {
          finish(context);
          if (pending === owner) pending = null;
        }
      }
    }
    execute().then(resolve, reject);
    return owner.promise;
  }
  return {
    run,
    invalidate,
    get revision() {
      return revision;
    },
    get pending() {
      return pending?.promise || null;
    },
  };
}
