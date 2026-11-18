// Waiting for Home Assistant: for a condition to hold, not for a fixed time (review M5).

/**
 * A promise that resolves after some time.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until a condition holds, checking it now and then every `everyMs`, at most `timeoutMs`.
 * @template T
 * @param {() => T | Promise<T>} condition its value counts when it is truthy
 * @param {{timeoutMs?: number, everyMs?: number}} [options]
 * @returns {Promise<T | undefined>} the condition's value, or undefined after the timeout
 */
export async function waitFor(condition, { timeoutMs = 5000, everyMs = 250 } = {}) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const value = await condition();
    if (value) return value;
    if (Date.now() >= until) return undefined;
    await sleep(everyMs);
  }
}

/**
 * Wait until an entity's state object is new: Home Assistant makes a new one when it reloads the
 * entity, e.g. an automation after its configuration was saved.
 * @param {{states: Record<string, any>}} gateway
 * @param {string} entity
 * @param {{timeoutMs?: number}} [options]
 * @returns {Promise<boolean>} true when it changed, false after the timeout
 */
export async function waitForReload(gateway, entity, { timeoutMs = 5000 } = {}) {
  const before = gateway.states[entity]?.last_updated;
  const changed = () => gateway.states[entity]?.last_updated !== before;
  return Boolean(await waitFor(changed, { timeoutMs }));
}
