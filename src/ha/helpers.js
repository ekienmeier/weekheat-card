// The helpers a room needs besides its plans: its state helper and its heating switch.

import { STATE_MAX } from '../domain/constants.js';
import { waitFor } from './wait.js';

/**
 * @typedef {object} Helper A helper the card made.
 * @property {string} entity its entity id
 * @property {string} id its helper id
 * @property {() => Promise<unknown>} remove deletes it again
 */

/**
 * A helper the card made, with the function that deletes it again.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} domain "input_text" or "input_boolean"
 * @param {string} id the helper's id
 * @returns {Helper}
 */
function helperOf(gateway, domain, id) {
  const remove = () => gateway.ws({ type: `${domain}/delete`, [`${domain}_id`]: id });
  return { entity: `${domain}.${id}`, id, remove };
}

/**
 * Admin: create a room's state helper, an input_text as long as Home Assistant allows.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} name e.g. "Weekheat Bad state"
 * @returns {Promise<Helper>}
 */
export async function createStateHelper(gateway, name) {
  const create = { type: 'input_text/create', name, max: STATE_MAX, icon: 'mdi:database' };
  const item = await gateway.ws(create);
  return helperOf(gateway, 'input_text', item.id);
}

/**
 * Admin: create a room's heating switch (an input_boolean), switched on, and wait until its entity
 * is there.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} name e.g. "Weekheat Bad Heizung"
 * @returns {Promise<Helper>}
 */
export async function createSwitch(gateway, name) {
  const create = { type: 'input_boolean/create', name, icon: 'mdi:radiator', initial: true };
  const helper = helperOf(gateway, 'input_boolean', (await gateway.ws(create)).id);
  await waitFor(() => gateway.states[helper.entity]);
  if (gateway.states[helper.entity]?.state !== 'on') {
    await gateway.service('input_boolean', 'turn_on', { entity_id: helper.entity });
  }
  return helper;
}
