// What a room is doing right now: today's plan and period, the setpoint the plan wants, the
// thermostats' setpoints, and why they may differ (paused, valve exercise, heating off, a window
// open, valves held closed by the room sensor, a change by hand). Pure: everything is passed in.

import { DEFAULT_STEP, HEATING_MARGIN, SAME_SETPOINT, UNAVAILABLE } from './constants.js';
import { periodAt, periodTemp } from './periods.js';
import { planForDay } from './plans.js';

/**
 * @typedef {object} HassState An entity's state, as Home Assistant gives it to the card.
 * @property {string} entity_id
 * @property {string} state
 * @property {Record<string, any>} attributes
 */

/**
 * @typedef {object} StatusInput What a room's status is computed from.
 * @property {Record<string, HassState>} states Home Assistant's states
 * @property {Record<string, {periods: import('./periods.js').Period[]}>} plans by entity id
 * @property {import('./plans.js').Day} today today's day decision
 * @property {number} minute the minute of the day now
 * @property {Record<string, string>} friendly the plans' friendly names
 */

/**
 * @typedef {object} RoomStatus A room's (or, from thermostatStatus, one thermostat's) situation.
 * @property {boolean} active the room automation is on
 * @property {boolean} exercise the valve exercise is running
 * @property {boolean} heatingOff the room's heating switch is off
 * @property {boolean} windowOpen the thermostats are held low because a window is open
 * @property {boolean} roomClosed the room sensor holds the valves closed
 * @property {string[]} openWindows the window sensors that are open
 * @property {Array<number | null> | null} saved setpoints saved while held (`_open`), by thermostat
 * @property {string | undefined} plan today's plan entity
 * @property {import('./periods.js').Period[]} periods its periods
 * @property {{index: number, period: object, next: object | null} | null} at the period now
 * @property {number | null} wanted the setpoint the plan wants now
 * @property {number | null} target the setpoint (while the valves are held closed: the saved one)
 * @property {number | null} current the room temperature (room sensor, else the thermostats')
 * @property {number} unavailable how many thermostats cannot be reached
 * @property {boolean} manual a setpoint differs from the plan (set by hand)
 * @property {boolean} heating a valve is heating
 * @property {number} step the setpoint step
 * @property {string} [th] thermostatStatus only: the thermostat's entity id
 * @property {string} [label] thermostatStatus only: its short name
 */

/**
 * @typedef {'paused' | 'exercise' | 'heating-off' | 'window' | 'valve-closed' | 'manual' |
 *   'heating' | 'scheduled'} RoomMode what a room shows as its status, in this order of precedence
 */

/**
 * Are two setpoints the same, as far as a thermostat can tell?
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
export function sameSetpoint(a, b) {
  return Math.abs(a - b) < SAME_SETPOINT;
}

/**
 * Is a value a number?
 * @param {unknown} value
 * @returns {value is number}
 */
function isNumber(value) {
  return typeof value === 'number';
}

/**
 * The JSON a room's state helper holds, or {} when there is none yet or it is not JSON.
 * @param {Record<string, HassState>} states
 * @param {string | undefined} entity the state helper
 * @returns {Record<string, any>}
 */
export function storedState(states, entity) {
  try {
    return JSON.parse(states[entity]?.state || '{}') || {};
  } catch {
    // A new helper is empty, and Home Assistant may show "unknown" before the first save.
    return {};
  }
}

/**
 * Today's plan of a room, its period now and the setpoint it wants.
 * @param {import('./room.js').Room} room
 * @param {StatusInput} input
 * @returns {Pick<RoomStatus, 'plan' | 'periods' | 'at' | 'wanted'>}
 */
function planNow(room, input) {
  const plan = planForDay(room, input.today, input.friendly);
  const periods = input.plans[plan]?.periods || [];
  const at = periods.length ? periodAt(periods, input.minute) : null;
  const wanted = at && at.period.temperature != null ? periodTemp(at.period) : null;
  return { plan, periods, at, wanted };
}

/**
 * Is the room's heating switch off? (A room without one is never off.)
 * @param {import('./room.js').Room} room
 * @param {Record<string, HassState>} states
 * @returns {boolean}
 */
function isSwitchedOff(room, states) {
  return Boolean(room.heating_switch) && states[room.heating_switch]?.state === 'off';
}

/**
 * Why a room's setpoints may differ from the plan right now.
 * @param {import('./room.js').Room} room
 * @param {Record<string, HassState>} states
 * @param {Record<string, any>} stored the room's state helper (see storedState)
 * @returns {Pick<RoomStatus, 'active' | 'heatingOff' | 'exercise' | 'roomClosed' | 'windowOpen' |
 *   'saved' | 'openWindows'>}
 */
function holds(room, states, stored) {
  const active = states[room.entity]?.state === 'on';
  const heatingOff = isSwitchedOff(room, states);
  const held = active && !heatingOff && Boolean(stored._open);
  return {
    active,
    heatingOff,
    exercise: active && Boolean(stored._ex),
    roomClosed: held && Boolean(stored._rc),
    windowOpen: held && !stored._rc,
    saved: stored._open || null,
    openWindows: (room.windows || []).filter((entity) => states[entity]?.state === 'on'),
  };
}

/**
 * Is a valve heating? Its `hvac_action` alone is not enough (see HEATING_MARGIN).
 * @param {HassState} state the thermostat's state
 * @param {number | null} target the setpoint to compare the temperature with
 * @returns {boolean}
 */
export function isHeating(state, target) {
  const current = state.attributes.current_temperature;
  const warm = isNumber(current) && isNumber(target) && current >= target - HEATING_MARGIN;
  return state.attributes.hvac_action === 'heating' && !warm;
}

/**
 * The room temperature: the room sensor's, else the average of the thermostats'.
 * @param {import('./room.js').Room} room
 * @param {Record<string, HassState>} states
 * @param {HassState[]} available the thermostats that can be reached
 * @returns {number | null}
 */
function roomTemperature(room, states, available) {
  const sensor = room.room_sensor ? states[room.room_sensor]?.state : undefined;
  if (sensor && !Number.isNaN(Number(sensor))) return Number(sensor);
  const values = available.map((state) => state.attributes.current_temperature).filter(isNumber);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/**
 * The room's setpoint: while the room sensor holds the valves closed, the highest saved one; else
 * the first reachable thermostat's.
 * @param {HassState[]} available
 * @param {ReturnType<typeof holds>} hold
 * @returns {number | null}
 */
function roomTarget(available, hold) {
  const kept = hold.roomClosed ? hold.saved.filter(isNumber) : [];
  if (kept.length) return Math.max(...kept);
  return available.map((state) => state.attributes.temperature).find(isNumber) ?? null;
}

/**
 * Does a room differ from its plan by hand? Never while a hold sets its setpoints.
 * @param {ReturnType<typeof holds>} hold
 * @param {{wanted: number | null, target: number | null}} setpoints
 * @param {HassState[]} available
 * @returns {boolean}
 */
function isManualRoom(hold, { wanted, target }, available) {
  if (hold.exercise || hold.heatingOff || hold.windowOpen || wanted == null) return false;
  if (hold.roomClosed) return target != null && !sameSetpoint(target, wanted);
  const differs = (temp) => !isNumber(temp) || !sameSetpoint(temp, wanted);
  return available.some((state) => state.state === 'off' || differs(state.attributes.temperature));
}

/**
 * @typedef {object} ReadingContext
 * @property {Record<string, HassState>} states
 * @property {HassState[]} available the room's thermostats that can be reached
 * @property {ReturnType<typeof holds>} hold
 */

/**
 * What a room's thermostats show: its setpoint and temperature, whether it heats, its step.
 * @param {import('./room.js').Room} room
 * @param {ReadingContext} context
 * @returns {Pick<RoomStatus, 'target' | 'current' | 'heating' | 'step'>}
 */
function roomReadings(room, { states, available, hold }) {
  const heats = (state) => isHeating(state, state.attributes.temperature);
  return {
    target: roomTarget(available, hold),
    current: roomTemperature(room, states, available),
    heating: !hold.roomClosed && available.some(heats),
    step: available[0]?.attributes.target_temp_step || DEFAULT_STEP,
  };
}

/**
 * What a room is doing right now.
 * @param {import('./room.js').Room} room
 * @param {StatusInput} input
 * @returns {RoomStatus}
 */
export function roomStatus(room, input) {
  const { states } = input;
  const hold = holds(room, states, storedState(states, room.state));
  const known = room.thermostats.map((entity) => states[entity]).filter(Boolean);
  const available = known.filter((state) => !UNAVAILABLE.includes(state.state));
  const now = planNow(room, input);
  const readings = roomReadings(room, { states, available, hold });
  const manual = isManualRoom(hold, { wanted: now.wanted, target: readings.target }, available);
  return { ...hold, ...now, ...readings, manual, unavailable: known.length - available.length };
}

/**
 * What a room shows as its status: the first that applies of paused, valve exercise, heating
 * off, window open, valves closed by the room sensor, set by hand, heating; else as planned.
 * The room list and the dial both use this, so they always agree.
 * @param {RoomStatus} status
 * @returns {RoomMode}
 */
export function roomMode(status) {
  /** @type {Array<[RoomMode, boolean]>} */
  const order = [
    ['paused', !status.active],
    ['exercise', status.exercise],
    ['heating-off', status.heatingOff],
    ['window', status.windowOpen],
    ['valve-closed', status.roomClosed],
    ['manual', status.manual],
    ['heating', status.heating],
  ];
  return order.find(([, applies]) => applies)?.[0] || 'scheduled';
}

/**
 * Can "Back to plan" be offered: the room is active and a setpoint was changed by hand?
 * (A manual status already excludes the holds: valve exercise, heating off, an open window.)
 * @param {RoomStatus} status
 * @returns {boolean}
 */
export function canReturnToPlan(status) {
  return status.manual && status.active;
}
