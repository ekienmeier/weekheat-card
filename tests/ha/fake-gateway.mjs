// A fake of src/ha/gateway.js for tests: it records every call and answers from tables.

/**
 * @typedef {object} FakeSetup What the fake answers with.
 * @property {Record<string, any>} [states] entity states
 * @property {Record<string, any>} [configs] readConfig answers by path; a function is called (it
 *   may throw); a missing path is null (404)
 * @property {(message: any) => any} [ws] answers WebSocket commands
 * @property {Record<string, any>} [rest] get answers by path
 */

/**
 * A table's answer: a function is called (it may throw), anything else is the answer.
 * @param {unknown} value
 * @returns {any}
 */
function answer(value) {
  return typeof value === 'function' ? value() : value;
}

/**
 * A fake gateway; `calls` lists what was called, as [kind, ...arguments].
 * @param {FakeSetup} [setup]
 * @returns {any}
 */
export function fakeGateway({ states = {}, configs = {}, ws = () => undefined, rest = {} } = {}) {
  const calls = [];
  return {
    calls,
    states,
    isAdmin: true,
    ws: async (message) => calls.push(['ws', message]) && ws(message),
    readConfig: async (path) => calls.push(['read', path]) && (answer(configs[path]) ?? null),
    saveConfig: async (path, config) =>
      calls.push(['save', path, config]) && answer(configs[`save ${path}`]),
    deleteConfig: async (path) => calls.push(['delete', path]),
    get: async (path) => calls.push(['get', path]) && answer(rest[path]),
    service: async (domain, service, data) => calls.push(['service', `${domain}.${service}`, data]),
  };
}

/**
 * The WebSocket commands of a fake's calls, by type.
 * @param {any} gateway a fakeGateway
 * @param {string} type e.g. "schedule/delete"
 * @returns {any[]} the messages
 */
export function sent(gateway, type) {
  return gateway.calls
    .filter(([kind, message]) => kind === 'ws' && message.type === type)
    .map((call) => call[1]);
}

/**
 * The services a fake was asked to call, as "domain.service".
 * @param {any} gateway a fakeGateway
 * @returns {string[]}
 */
export function services(gateway) {
  return gateway.calls.filter(([kind]) => kind === 'service').map((call) => call[1]);
}
