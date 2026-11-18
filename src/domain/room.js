// A room as the card knows it: read from the room automation's blueprint inputs, published to
// other users in the room directory, and the size of the state it needs.

import { LIMITS, STATE_MAX } from './constants.js';
import { CardError } from './errors.js';

/**
 * @typedef {object} Room A room: one automation made from the room blueprint.
 * @property {string} entity the automation's entity id
 * @property {string} id the automation's config id
 * @property {string} name the room's name
 * @property {string[]} thermostats climate entity ids
 * @property {string[]} plans schedule entity ids, in order
 * @property {Record<string, string>} week the plan for a working day, by weekday key
 * @property {string} [free_day] the plan for free days
 * @property {string} [state] the state helper (input_text)
 * @property {string[]} windows window and door sensors
 * @property {number} window_delay seconds a window must be open before it counts
 * @property {string | null} heating_switch an input_boolean, or null
 * @property {string | null} room_sensor a temperature sensor, or null
 * @property {number} room_margin °C above the setpoint at which the valves close
 * @property {object} [cfg] the automation's whole configuration (only for administrators)
 */

/** The room fields published in the room directory, for users who cannot read automations. */
export const DIRECTORY_FIELDS = [
  'entity',
  'id',
  'name',
  'thermostats',
  'plans',
  'week',
  'free_day',
  'state',
  'windows',
  'window_delay',
  'heating_switch',
  'room_sensor',
  'room_margin',
];

/** The valve exercise's inputs, the same in every room, with their defaults. */
export const EXERCISE_DEFAULTS = {
  exercise_day: 'off',
  exercise_time: '13:00:00',
  exercise_wait: 60,
};

/**
 * A blueprint input that may be one value, a list or empty, as a list.
 * @param {unknown} value
 * @returns {any[]}
 */
export function asList(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/**
 * A room from its automation's blueprint inputs, with defaults for what is not set.
 * @param {Record<string, any>} input the blueprint inputs
 * @param {string} alias the automation's name, used when the room has no name
 * @returns {Omit<Room, 'entity' | 'id' | 'cfg'>}
 */
export function roomFromInput(input, alias) {
  return {
    name: input.room_name || alias,
    thermostats: asList(input.thermostats),
    plans: asList(input.plans),
    week: input.week || {},
    free_day: input.free_day,
    state: input.state,
    windows: asList(input.windows),
    window_delay: input.window_delay ?? LIMITS.window_delay.initial,
    heating_switch: asList(input.heating_switch)[0] || null,
    room_sensor: asList(input.room_sensor)[0] || null,
    room_margin: input.room_margin ?? LIMITS.room_margin.initial,
  };
}

/**
 * The valve exercise settings in a room's blueprint inputs, with the defaults.
 * @param {Record<string, any>} [input]
 * @returns {{exercise_day: string, exercise_time: string, exercise_wait: number}}
 */
export function exerciseFromInput(input = {}) {
  const pairs = Object.entries(EXERCISE_DEFAULTS).map(([key, initial]) => [
    key,
    input[key] ?? initial,
  ]);
  return /** @type {any} */ (Object.fromEntries(pairs));
}

/**
 * A room's entry in the room directory: the published fields, null where a room has none.
 * @param {Room} room
 * @returns {Record<string, unknown>}
 */
export function directoryEntry(room) {
  return Object.fromEntries(DIRECTORY_FIELDS.map((key) => [key, room[key] ?? null]));
}

/**
 * The most characters the room blueprint can need for a room's state helper: per thermostat the
 * last setpoint it applied, the setpoints saved while a window is open or the valves are held
 * closed with the fingerprint of the thermostat list they are listed for (`_th`, below 999983 in
 * the room blueprint's `th_print`), and the markers `_rc`, `_rt` and `_ex`. A room whose worst
 * case exceeds STATE_MAX cannot keep its state.
 * @param {string[]} thermostats the room's climate entity ids
 * @returns {number} the length of the worst-case state as JSON
 */
export function stateSize(thermostats) {
  const widest = 22.5; // the longest setpoint as JSON, 4 characters like null
  const state = Object.fromEntries(thermostats.map((entity) => [entity, [widest]]));
  const saved = { _open: thermostats.map(() => widest), _th: 999999 };
  const markers = { ...saved, _rc: 1, _rt: 99999999, _ex: 1 };
  return JSON.stringify({ ...state, ...markers }).length;
}

/**
 * Refuse thermostats that a room's state helper could not hold (see stateSize).
 * @param {string[]} thermostats
 * @throws {CardError} code "state_size"
 */
export function checkStateSize(thermostats) {
  const size = stateSize(thermostats);
  if (size > STATE_MAX) throw new CardError('state_size', { size, max: STATE_MAX });
}
