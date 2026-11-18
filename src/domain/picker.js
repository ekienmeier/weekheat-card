// The entity search of a room's Setup tab: which entities fit, and in which order.

import { WINDOW_CLASSES } from './constants.js';

/**
 * @typedef {'th' | 'win' | 'rs'} PickKind what is picked: thermostats, windows and doors, the room
 *   sensor
 */

/**
 * Does an entity fit a picker?
 * @param {{entity_id: string, attributes?: Record<string, any>}} state the entity's state
 * @param {PickKind} kind
 * @returns {boolean}
 */
export function pickKind(state, kind) {
  const id = state.entity_id;
  const deviceClass = state.attributes?.device_class;
  const fits = {
    th: () => id.startsWith('climate.'),
    win: () => id.startsWith('binary_sensor.') && WINDOW_CLASSES.includes(deviceClass),
    rs: () => id.startsWith('sensor.') && deviceClass === 'temperature',
  };
  return Boolean(fits[kind]?.());
}

/**
 * The entities a picker offers: those of its kind, not already chosen, whose name, entity id or
 * area contain every word of the query; sorted by name, the room's area first.
 * @param {Array<{entity_id: string, attributes?: Record<string, any>}>} states
 * @param {{kind: PickKind, query?: string, exclude?: string[], areaOf?: (entity: string) => string,
 *   roomArea?: string}} options
 * @returns {{here: any[], other: any[]}} in the room's area, and elsewhere
 */
export function pickCandidates(
  states,
  { kind, query = '', exclude = [], areaOf = () => '', roomArea = '' },
) {
  const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  const name = (state) => String(state.attributes?.friendly_name || state.entity_id);
  const text = (state) => `${name(state)} ${state.entity_id} ${areaOf(state.entity_id) || ''}`;
  const list = states
    .filter((state) => pickKind(state, kind) && !exclude.includes(state.entity_id))
    .filter((state) => words.every((word) => text(state).toLowerCase().includes(word)))
    .sort((a, b) => name(a).localeCompare(name(b)));
  const here = roomArea ? list.filter((state) => areaOf(state.entity_id) === roomArea) : [];
  return { here, other: list.filter((state) => !here.includes(state)) };
}
