// Reading and saving rooms. Administrators read the room automations themselves; the card then
// publishes them as the room directory for other users (see directory.js).

import { ROOM_BLUEPRINT } from '../domain/constants.js';
import { checkStateSize, roomFromInput } from '../domain/room.js';

/**
 * The paths under which the room blueprint is installed (usually one).
 * @param {Record<string, unknown>} blueprints what `blueprint/list` returned for automations
 * @returns {string[]}
 */
export function roomBlueprintPaths(blueprints) {
  return Object.keys(blueprints).filter((path) => path.endsWith(ROOM_BLUEPRINT));
}

/**
 * Admin: the automation entities made from the room blueprint, found with Home Assistant's
 * search (it lists what uses a blueprint), so that no other automation needs to be read.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string[]} paths the room blueprint's paths
 * @returns {Promise<string[]>}
 */
async function roomAutomations(gateway, paths) {
  const search = (path) => ({
    type: 'search/related',
    item_type: 'automation_blueprint',
    item_id: path,
  });
  const found = await Promise.all(paths.map((path) => gateway.ws(search(path))));
  return [...new Set(found.flatMap((related) => related.automation || []))];
}

/**
 * Admin: the rooms, read from their automations' configurations. An automation without one of
 * its own (not made in the UI) is skipped; any other failed read rejects, so that a room is never
 * left out because reading it failed (review H4).
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string[]} paths the room blueprint's paths
 * @returns {Promise<import('../domain/room.js').Room[]>}
 */
export async function readRooms(gateway, paths) {
  const entities = await roomAutomations(gateway, paths);
  const found = entities
    .map((entity) => ({ entity, id: gateway.states[entity]?.attributes.id }))
    .filter((room) => room.id);
  const configs = await Promise.all(
    found.map((room) => gateway.readConfig(`automation/config/${room.id}`)),
  );
  return found.flatMap((room, i) => roomOf(room, configs[i]));
}

/**
 * A room from its automation and configuration; none if the configuration is not a room's.
 * @param {{entity: string, id: string}} automation
 * @param {any} cfg its configuration, null if it has none
 * @returns {import('../domain/room.js').Room[]} the room, or nothing
 */
function roomOf(automation, cfg) {
  if (!String(cfg?.use_blueprint?.path || '').endsWith(ROOM_BLUEPRINT)) return [];
  return [{ ...automation, cfg, ...roomFromInput(cfg.use_blueprint.input || {}, cfg.alias) }];
}

/**
 * Admin: save changed blueprint inputs of a room. Refuses thermostats its state helper could not
 * hold (review H1).
 * @param {import('./gateway.js').Gateway} gateway
 * @param {import('../domain/room.js').Room} room
 * @param {Record<string, unknown>} input the inputs that change
 * @returns {Promise<import('../domain/room.js').Room>} the room as saved
 */
export async function saveRoom(gateway, room, input) {
  if (input.thermostats) checkStateSize(/** @type {string[]} */ (input.thermostats));
  const use = room.cfg.use_blueprint;
  const cfg = { ...room.cfg, use_blueprint: { ...use, input: { ...use.input, ...input } } };
  await gateway.saveConfig(`automation/config/${room.id}`, cfg);
  return { ...room, cfg, ...roomFromInput(cfg.use_blueprint.input, cfg.alias) };
}
