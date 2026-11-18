// What the actions and the views work with: the store, the gateway to Home Assistant, the card's
// configuration and the timers of delayed writes.

/**
 * @typedef {object} CardConfig The card's YAML options, with their defaults (see the README).
 * @property {string} [title]
 * @property {string[]} [rooms] room automations to show, in this order
 * @property {number} days how many days the day list shows
 * @property {string} day_script the day script's entity id
 * @property {'dial' | 'compact'} layout
 * @property {number} dial_min the scale's lowest setpoint
 * @property {number} dial_max the scale's highest setpoint
 */

/**
 * @typedef {object} Context
 * @property {import('./store.js').Store} store
 * @property {import('../ha/gateway.js').Gateway} gateway
 * @property {CardConfig} config
 * @property {Record<string, ReturnType<typeof setTimeout>>} timers delayed writes and messages
 */

/**
 * A context for a card.
 * @param {{store: import('./store.js').Store, gateway: import('../ha/gateway.js').Gateway,
 *   config: CardConfig}} parts
 * @returns {Context}
 */
export function makeContext({ store, gateway, config }) {
  return { store, gateway, config, timers: {} };
}
