// Admin: adding a room. It makes two starter plans, a state helper, a heating switch and the
// room automation (paused); when a step fails, what was made is deleted again.

import { WEEK } from '../domain/constants.js';
import { CardError } from '../domain/errors.js';
import { STARTER } from '../domain/periods.js';
import { slugify } from '../domain/plans.js';
import { checkStateSize } from '../domain/room.js';
import { createStateHelper, createSwitch } from './helpers.js';
import { createPlan } from './plans.js';
import { waitFor } from './wait.js';

/**
 * @typedef {object} NewRoom What a new room is made from.
 * @property {string} name its name
 * @property {string[]} thermostats its climate entities
 * @property {{working: string, free: string}} planNames the starter plans' names
 * @property {string} switchName the heating switch's name
 * @property {string} blueprint the room blueprint's path
 * @property {import('../domain/room.js').Room[]} rooms all rooms there are
 * @property {Record<string, unknown>} defaults inputs every new room gets (day script, language,
 *   the valve exercise's settings)
 */

/**
 * The automation id for a new room, `weekheat_<slug of its name>`. Refuses a name without a letter
 * or digit, and an id that a room or another automation has already (review H3).
 * @param {import('./gateway.js').Gateway} gateway
 * @param {{name: string, rooms: import('../domain/room.js').Room[]}} room
 * @returns {Promise<string>}
 */
export async function freeRoomId(gateway, { name, rooms }) {
  const slug = slugify(name);
  if (!slug) throw new CardError('room_name');
  const id = `weekheat_${slug}`;
  const known = rooms.some((room) => room.id === id);
  if (known || (await gateway.readConfig(`automation/config/${id}`))) {
    throw new CardError('room_exists', { id });
  }
  return id;
}

/**
 * A new room's blueprint inputs.
 * @param {NewRoom} room
 * @param {Record<'weekday' | 'free' | 'state' | 'sw', {entity: string}>} made its plans, state
 *   helper and heating switch
 * @returns {Record<string, unknown>}
 */
function roomInput(room, { weekday, free, state, sw }) {
  return {
    room_name: room.name,
    thermostats: room.thermostats,
    plans: [weekday.entity, free.entity],
    free_day: free.entity,
    week: Object.fromEntries(WEEK.map((day) => [day, weekday.entity])),
    state: state.entity,
    heating_switch: sw.entity,
    ...room.defaults,
  };
}

/**
 * Save a new room automation, paused: saved with `initial_state: false`, switched off once Home
 * Assistant has loaded it, then saved again without `initial_state`, so that later restarts keep
 * whatever the user chooses.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {NewRoom & {id: string}} room
 * @param {Record<string, unknown>} input
 * @returns {Promise<void>}
 */
async function createAutomation(gateway, room, input) {
  const use = { path: room.blueprint, input };
  const cfg = { alias: `Weekheat ${room.name}`, description: 'Weekheat', use_blueprint: use };
  await gateway.saveConfig(`automation/config/${room.id}`, { ...cfg, initial_state: false });
  const loaded = () =>
    Object.values(gateway.states).find(
      (state) => state.entity_id.startsWith('automation.') && state.attributes.id === room.id,
    );
  const automation = await waitFor(loaded);
  if (automation)
    await gateway.service('automation', 'turn_off', { entity_id: automation.entity_id });
  await gateway.saveConfig(`automation/config/${room.id}`, cfg);
}

/**
 * A function that adds a thing to a list and returns it, to note each thing as it is made.
 * @param {Array<{remove: () => Promise<unknown>}>} made
 * @returns {(thing: any) => any} returns what it is given
 */
function keeper(made) {
  return (thing) => {
    made.push(thing);
    return thing;
  };
}

/**
 * Make what a room consists of. Everything made is added to `made`, so that it can be removed.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {NewRoom & {id: string}} room
 * @param {Array<{remove: () => Promise<unknown>}>} made
 * @returns {Promise<void>}
 */
async function createRoom(gateway, room, made) {
  const keep = keeper(made);
  const plan = (name, periods) => createPlan(gateway, { room: room.name, name, periods });
  const weekday = keep(await plan(room.planNames.working, STARTER.weekday));
  const free = keep(await plan(room.planNames.free, STARTER.free));
  const state = keep(await createStateHelper(gateway, `Weekheat ${room.name} state`));
  const sw = keep(await createSwitch(gateway, room.switchName));
  keep({ remove: () => gateway.deleteConfig(`automation/config/${room.id}`) });
  await createAutomation(gateway, room, roomInput(room, { weekday, free, state, sw }));
}

/**
 * Remove what a failed creation made, newest first. A removal that fails as well is only logged:
 * the error that stopped the creation is the one the user needs to see.
 * @param {Array<{remove: () => Promise<unknown>}>} made
 * @returns {Promise<void>}
 */
async function removeAll(made) {
  for (const thing of [...made].reverse()) {
    try {
      await thing.remove();
    } catch (error) {
      console.warn('Weekheat: removing a part of a room that was not finished failed', error);
    }
  }
}

/**
 * Admin: add a room (paused). Refuses thermostats its state helper could not hold, and a name that
 * gives no free id; on a failure, deletes what it made.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {NewRoom} room
 * @returns {Promise<void>}
 */
export async function addRoom(gateway, room) {
  checkStateSize(room.thermostats);
  const id = await freeRoomId(gateway, room);
  const made = [];
  try {
    await createRoom(gateway, { ...room, id }, made);
  } catch (error) {
    await removeAll(made);
    throw error;
  }
}
