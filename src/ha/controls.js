// Using a room: setpoints, the heating switch, pausing a room, letting rooms apply a change now,
// and starting the valve exercise. These need no admin rights (except pausing a room).

/**
 * Set one setpoint on some thermostats.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string[]} thermostats
 * @param {number} temperature
 * @returns {Promise<unknown>}
 */
export function setTemperature(gateway, thermostats, temperature) {
  return gateway.service('climate', 'set_temperature', { entity_id: thermostats, temperature });
}

/**
 * Set each thermostat to its own setpoint.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {Array<[string, number]>} writes thermostat and setpoint
 * @returns {Promise<unknown[]>}
 */
export function setEach(gateway, writes) {
  return Promise.all(
    writes.map(([thermostat, value]) => setTemperature(gateway, [thermostat], value)),
  );
}

/**
 * Switch an input_boolean (a room's heating switch).
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} entity
 * @param {boolean} on
 * @returns {Promise<unknown>}
 */
export function setSwitch(gateway, entity, on) {
  return gateway.service('input_boolean', on ? 'turn_on' : 'turn_off', { entity_id: entity });
}

/**
 * Admin: activate or pause a room automation.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string} entity the automation
 * @param {boolean} on
 * @returns {Promise<unknown>}
 */
export function setRoomActive(gateway, entity, on) {
  return gateway.service('automation', on ? 'turn_on' : 'turn_off', { entity_id: entity });
}

/**
 * Let the active ones of some room automations run now, so that a change applies at once.
 * @param {import('./gateway.js').Gateway} gateway
 * @param {string[]} automations
 * @returns {Promise<unknown>}
 */
export async function triggerRooms(gateway, automations) {
  const active = automations.filter((entity) => gateway.states[entity]?.state === 'on');
  if (!active.length) return undefined;
  return gateway.service('automation', 'trigger', { entity_id: active, skip_condition: true });
}

/**
 * Start the valve exercise in all active rooms now.
 * @param {import('./gateway.js').Gateway} gateway
 * @returns {Promise<unknown>}
 */
export function runExercise(gateway) {
  return gateway.ws({ type: 'fire_event', event_type: 'weekheat_exercise' });
}
