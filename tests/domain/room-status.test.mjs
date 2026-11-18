// Tests of src/domain/room-status.js and thermostat-status.js: what a room shows right now.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canReturnToPlan, roomMode, roomStatus } from '../../src/domain/room-status.js';
import { mixedTargets, thermostatStatus } from '../../src/domain/thermostat-status.js';

/** A room "Wohnzimmer" with two thermostats, a window, a switch and a room sensor. */
const ROOM = {
  entity: 'automation.weekheat_wohnzimmer',
  id: 'weekheat_wohnzimmer',
  name: 'Wohnzimmer',
  thermostats: ['climate.wz_couch', 'climate.wz_tisch'],
  plans: ['schedule.wz_werktag'],
  week: {},
  state: 'input_text.wz_state',
  windows: ['binary_sensor.wz_fenster'],
  heating_switch: 'input_boolean.wz_heizung',
  room_sensor: 'sensor.wz_temperatur',
};

/** The plan: 21 °C from 06:00, 17 °C from 08:00. */
const PLANS = {
  'schedule.wz_werktag': {
    periods: [
      { start: 0, temperature: 5, off: true },
      { start: 360, temperature: 21, off: false },
      { start: 480, temperature: 17, off: false },
    ],
  },
};

/**
 * A climate entity's state.
 * @param {number} temperature its setpoint
 * @param {{state?: string} & Record<string, any>} [more] its state (heat by default), and other
 *   attributes
 * @returns {object}
 */
function climate(temperature, { state = 'heat', ...attributes } = {}) {
  return { state, attributes: { temperature, current_temperature: 20, ...attributes } };
}

/**
 * The room's status at 07:00 with these states (merged into a room on its plan).
 * @param {Record<string, any>} [changes] states by entity; `stored` is the state helper's JSON
 * @returns {import('../../src/domain/room-status.js').RoomStatus}
 */
function statusWith({ stored = {}, ...changes } = {}) {
  const states = {
    [ROOM.entity]: { state: 'on', attributes: {} },
    [ROOM.thermostats[0]]: climate(21),
    [ROOM.thermostats[1]]: climate(21),
    [ROOM.state]: { state: JSON.stringify(stored), attributes: {} },
    [ROOM.heating_switch]: { state: 'on', attributes: {} },
    ...changes,
  };
  const today = { date: '2026-11-13', weekday: 'fri', free: false, kind: 'plain' };
  return roomStatus(ROOM, { states, plans: PLANS, today, minute: 420, friendly: {} });
}

test('a room on its plan: the period now, the setpoint it wants, until when', () => {
  const status = statusWith();
  assert.equal(status.wanted, 21);
  assert.equal(status.target, 21);
  assert.equal(status.at.next.start, 480);
  assert.equal(status.manual, false);
  assert.equal(roomMode(status), 'scheduled');
});

test('a setpoint set by hand, or a thermostat switched off, makes the room manual', () => {
  const byHand = statusWith({ [ROOM.thermostats[1]]: climate(23) });
  assert.equal(byHand.manual, true);
  assert.equal(roomMode(byHand), 'manual');
  assert.ok(canReturnToPlan(byHand));
  const off = statusWith({ [ROOM.thermostats[0]]: climate(21, { state: 'off' }) });
  assert.equal(off.manual, true);
  assert.equal(statusWith({ [ROOM.thermostats[0]]: climate(21.2) }).manual, false);
});

test('an open window holds the room: not manual, shown as the window', () => {
  const status = statusWith({ stored: { _open: [21, 21] }, [ROOM.thermostats[0]]: climate(5) });
  assert.equal(status.windowOpen, true);
  assert.equal(status.manual, false);
  assert.equal(roomMode(status), 'window');
});

test('valves held closed by the room sensor: the saved setpoint is the room’s', () => {
  const closed = { stored: { _open: [21, 22], _rc: 1 }, [ROOM.thermostats[0]]: climate(5) };
  const status = statusWith({ ...closed, [ROOM.thermostats[1]]: climate(5) });
  assert.equal(status.roomClosed, true);
  assert.equal(status.target, 22);
  assert.equal(status.heating, false);
  assert.equal(roomMode(status), 'valve-closed');
  assert.equal(status.manual, true, 'the saved 22 °C differs from the plan’s 21 °C');
});

test('heating switch off, paused room, valve exercise: each shown as such', () => {
  const switchOff = statusWith({ [ROOM.heating_switch]: { state: 'off', attributes: {} } });
  assert.equal(roomMode(switchOff), 'heating-off');
  assert.equal(switchOff.manual, false);
  const paused = statusWith({
    [ROOM.entity]: { state: 'off', attributes: {} },
    stored: { _open: [] },
  });
  assert.equal(roomMode(paused), 'paused');
  assert.equal(paused.windowOpen, false, 'a paused room does not react to windows');
  assert.equal(roomMode(statusWith({ stored: { _ex: 1 } })), 'exercise');
});

test('a valve reporting "heating" at its setpoint does not count as heating (HomeKit)', () => {
  const atSetpoint = climate(21, { hvac_action: 'heating', current_temperature: 20.9 });
  assert.equal(statusWith({ [ROOM.thermostats[0]]: atSetpoint }).heating, false);
  const cold = climate(21, { hvac_action: 'heating', current_temperature: 19 });
  assert.equal(statusWith({ [ROOM.thermostats[0]]: cold }).heating, true);
});

test('the room temperature is the room sensor’s, else the thermostats’ average', () => {
  const sensor = { [ROOM.room_sensor]: { state: '22.6', attributes: {} } };
  assert.equal(statusWith(sensor).current, 22.6);
  const warm = climate(21, { current_temperature: 21 });
  assert.equal(statusWith({ [ROOM.thermostats[1]]: warm }).current, 20.5);
  const gone = { [ROOM.room_sensor]: { state: 'unavailable', attributes: {} } };
  assert.equal(statusWith(gone).current, 20);
});

test('an unreachable thermostat is counted, the other one sets the room’s values', () => {
  const status = statusWith({ [ROOM.thermostats[0]]: { state: 'unavailable', attributes: {} } });
  assert.equal(status.unavailable, 1);
  assert.equal(status.target, 21);
});

test('each thermostat: its own setpoint, label and manual flag; mixed setpoints', () => {
  const states = { [ROOM.thermostats[1]]: climate(23, { friendly_name: 'Wohnzimmer Tisch' }) };
  const status = statusWith(states);
  const context = { status, states: { [ROOM.thermostats[0]]: climate(21), ...states } };
  const table = thermostatStatus(ROOM, ROOM.thermostats[1], context);
  assert.equal(table.target, 23);
  assert.equal(table.label, 'Tisch');
  assert.equal(table.manual, true);
  assert.equal(thermostatStatus(ROOM, ROOM.thermostats[0], context).manual, false);
  assert.deepEqual(mixedTargets(ROOM, context), [21, 23]);
});
