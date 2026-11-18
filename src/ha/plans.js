// Plans: one schedule helper each. The card writes the same blocks to all seven days, so a
// plan's periods are read from Monday.

import { SCHEDULE_DAYS } from '../domain/constants.js';
import { blocksToPeriods, periodsToBlocks } from '../domain/periods.js';
import { slugify } from '../domain/plans.js';
import { waitFor } from './wait.js';

/**
 * @typedef {object} Plan A loaded plan.
 * @property {{id: string, name: string, icon?: string, monday?: any[]}} item the schedule helper
 * @property {import('../domain/periods.js').Period[]} periods
 */

/**
 * A plan from its schedule helper.
 * @param {Plan['item']} item
 * @returns {Plan}
 */
function planOf(item) {
  return { item, periods: blocksToPeriods(item.monday) };
}

/**
 * The fields of a schedule helper with these periods on every day.
 * @param {import('../domain/periods.js').Period[]} periods
 * @returns {Record<string, any[]>}
 */
function everyDay(periods) {
  const blocks = periodsToBlocks(periods);
  return Object.fromEntries(SCHEDULE_DAYS.map((day) => [day, blocks]));
}

/**
 * All schedule helpers, by entity id.
 * @param {import('./gateway.js').Gateway} gateway
 * @returns {Promise<Record<string, Plan>>}
 */
export async function loadPlans(gateway) {
  const [items, registry] = await Promise.all([
    gateway.ws({ type: 'schedule/list' }),
    gateway.ws({ type: 'config/entity_registry/list' }),
  ]);
  const schedules = registry.filter((entry) => entry.platform === 'schedule');
  const entityOf = Object.fromEntries(schedules.map((entry) => [entry.unique_id, entry.entity_id]));
  const pairs = items
    .filter((item) => entityOf[item.id])
    .map((item) => [entityOf[item.id], planOf(item)]);
  return Object.fromEntries(pairs);
}

/**
 * Admin: save a plan's periods and name.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {Plan['item']} item the schedule helper
 * @param {{name: string, periods: import('../domain/periods.js').Period[]}} plan its new name
 *   (with the room's name) and periods
 * @returns {Promise<Plan>}
 */
export async function savePlan(gateway, item, { name, periods }) {
  const icon = item.icon ? { icon: item.icon } : {};
  const update = { type: 'schedule/update', schedule_id: item.id, name, ...icon };
  return planOf(await gateway.ws({ ...update, ...everyDay(periods) }));
}

/**
 * The entity id the registry gives a new schedule helper (it may take a moment to appear).
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} itemId the helper's id
 * @returns {Promise<string>}
 */
async function scheduleEntity(gateway, itemId) {
  const find = async () => {
    const registry = await gateway.ws({ type: 'config/entity_registry/list' });
    return registry.find((entry) => entry.platform === 'schedule' && entry.unique_id === itemId);
  };
  const entry = await waitFor(find);
  if (!entry) throw new Error(`schedule ${itemId}: no entity`);
  return entry.entity_id;
}

/**
 * Admin: create a plan for a room, as `schedule.weekheat_<room>_<plan>` when that id is free.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {{room: string, name: string, periods: import('../domain/periods.js').Period[]}} plan
 * @returns {Promise<{entity: string, plan: Plan, remove: () => Promise<void>}>} with a function
 *   that deletes it again
 */
export async function createPlan(gateway, { room, name, periods }) {
  const create = { type: 'schedule/create', name: `${room} ${name}`, icon: 'mdi:calendar-clock' };
  const item = await gateway.ws({ ...create, ...everyDay(periods) });
  const made = { plan: planOf(item), remove: () => deletePlan(gateway, item) };
  const entity = await scheduleEntity(gateway, item.id);
  const wanted = `schedule.weekheat_${slugify(room)}_${slugify(name)}`;
  if (entity === wanted || gateway.states[wanted]) return { entity, ...made };
  await gateway.ws({
    type: 'config/entity_registry/update',
    entity_id: entity,
    new_entity_id: wanted,
  });
  return { entity: wanted, ...made };
}

/**
 * Admin: delete a plan's schedule helper.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {Plan['item']} item
 * @returns {Promise<void>}
 */
export async function deletePlan(gateway, item) {
  await gateway.ws({ type: 'schedule/delete', schedule_id: item.id });
}
