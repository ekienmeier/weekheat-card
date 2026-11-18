// What one thermostat of a room shows, for rooms with several that can be set on their own.

import { SAME_SHOWN, UNAVAILABLE } from './constants.js';
import { planLabel } from './plans.js';
import { isHeating, sameSetpoint } from './room-status.js';

/**
 * A thermostat's short name: its friendly name without the room's name in front ("Couch").
 * @param {import('./room.js').Room} room
 * @param {string} entity the thermostat
 * @param {Record<string, import('./room-status.js').HassState>} states
 * @returns {string}
 */
export function thermostatLabel(room, entity, states) {
  const friendly = states[entity]?.attributes.friendly_name || entity;
  return planLabel(friendly, room.name) || friendly;
}

/**
 * A thermostat's setpoint: while the room sensor holds the valves closed, the one saved for it.
 * @param {import('./room-status.js').RoomStatus} status the room's
 * @param {number} index the thermostat's position in the room
 * @param {import('./room-status.js').HassState | null} state its state, null if unreachable
 * @returns {number | null}
 */
function thermostatTarget(status, index, state) {
  const saved = status.roomClosed ? status.saved?.[index] : undefined;
  if (typeof saved === 'number') return saved;
  return state ? state.attributes.temperature : null;
}

/**
 * Does a thermostat differ from the plan by hand? Never while a hold sets the room's setpoints.
 * @param {import('./room-status.js').RoomStatus} status the room's
 * @param {import('./room-status.js').HassState} state the thermostat's
 * @param {number | null} target its setpoint
 * @returns {boolean}
 */
function isManualThermostat(status, state, target) {
  if (status.exercise || status.heatingOff || status.windowOpen || status.wanted == null)
    return false;
  return (
    state.state === 'off' || typeof target !== 'number' || !sameSetpoint(target, status.wanted)
  );
}

/**
 * A room's status as one of its thermostats sees it: the room's, with this thermostat's setpoint,
 * temperature, step and flags.
 * @param {import('./room.js').Room} room
 * @param {string} entity the thermostat
 * @param {{status: import('./room-status.js').RoomStatus,
 *   states: Record<string, import('./room-status.js').HassState>}} context
 * @returns {import('./room-status.js').RoomStatus}
 */
export function thermostatStatus(room, entity, { status, states }) {
  const found = states[entity];
  const state = found && !UNAVAILABLE.includes(found.state) ? found : null;
  const target = thermostatTarget(status, room.thermostats.indexOf(entity), state);
  const label = thermostatLabel(room, entity, states);
  return { ...status, ...thermostatFlags(status, state, target), target, th: entity, label };
}

/**
 * The readings and flags of one thermostat that replace the room's in thermostatStatus.
 * @param {import('./room-status.js').RoomStatus} status the room's
 * @param {import('./room-status.js').HassState | null} state the thermostat's, null if unreachable
 * @param {number | null} target its setpoint
 * @returns {Pick<import('./room-status.js').RoomStatus, 'current' | 'manual' | 'heating' | 'step'>}
 */
function thermostatFlags(status, state, target) {
  const current = state?.attributes.current_temperature;
  return {
    current: typeof current === 'number' ? current : status.current,
    manual: Boolean(state) && isManualThermostat(status, state, target),
    heating: Boolean(state) && !status.roomClosed && isHeating(state, target),
    step: state?.attributes.target_temp_step || status.step,
  };
}

/**
 * The setpoints of a room's thermostats when they differ, else null.
 * @param {import('./room.js').Room} room
 * @param {{status: import('./room-status.js').RoomStatus,
 *   states: Record<string, import('./room-status.js').HassState>}} context
 * @returns {number[] | null}
 */
export function mixedTargets(room, context) {
  if (room.thermostats.length < 2) return null;
  const targets = room.thermostats.map((entity) => thermostatStatus(room, entity, context).target);
  const values = targets.filter((value) => typeof value === 'number');
  const differ = values.some((value) => Math.abs(value - values[0]) >= SAME_SHOWN);
  return values.length > 1 && differ ? values : null;
}
