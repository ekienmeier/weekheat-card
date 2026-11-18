// Tests of src/ha/rooms-admin.js: adding a room (review H3 and H1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { addRoom } from '../../src/ha/rooms-admin.js';
import { fakeGateway } from './fake-gateway.mjs';

/**
 * The answers of a Home Assistant in which plans can be made: each gets an id and an entity.
 * @returns {(message: any) => any}
 */
function makingPlans() {
  const registry = [];
  return (message) => {
    if (message.type === 'config/entity_registry/list') return registry;
    const id = `plan${registry.length + 1}`;
    registry.push({
      platform: 'schedule',
      unique_id: id,
      entity_id: `schedule.weekheat_bad_${id}`,
    });
    return { id, name: message.name, monday: message.monday };
  };
}

/**
 * The answers of a Home Assistant in which helpers and plans can be made; the heating switch's
 * entity appears in `states`.
 * @param {Record<string, any>} states
 * @returns {(message: any) => any}
 */
function makingHelpers(states) {
  const plans = makingPlans();
  const created = {
    'input_text/create': () => ({ id: 'bad_state' }),
    'input_boolean/create': () => {
      states['input_boolean.bad_heizung'] = { entity_id: 'input_boolean.bad_heizung', state: 'on' };
      return { id: 'bad_heizung' };
    },
  };
  return (message) => (created[message.type] || plans)(message);
}

/**
 * A fake in which a room can be made: helpers, plans, and the automation, which appears once saved.
 * @param {Record<string, any>} [configs] readConfig and saveConfig answers
 * @returns {any}
 */
function creating(configs = {}) {
  const states = {};
  const appear = () => {
    const entity = 'automation.weekheat_bad';
    states[entity] = { entity_id: entity, state: 'on', attributes: { id: 'weekheat_bad' } };
  };
  const saves = { 'save automation/config/weekheat_bad': appear, ...configs };
  return fakeGateway({ states, configs: saves, ws: makingHelpers(states) });
}

/**
 * A new room "Bad" with one thermostat; `rooms` are the rooms there are.
 * @param {object} [changes]
 * @returns {import('../../src/ha/rooms-admin.js').NewRoom}
 */
function newRoom(changes = {}) {
  const planNames = { working: 'Werktag', free: 'Freier Tag' };
  const room = { name: 'Bad', thermostats: ['climate.bad'], planNames, switchName: 'Bad Heizung' };
  return {
    ...room,
    blueprint: 'ekienmeier/weekheat_room.yaml',
    rooms: [],
    defaults: {},
    ...changes,
  };
}

/**
 * How many helpers and plans a fake was asked to create.
 * @param {any} gateway
 * @returns {number}
 */
function creations(gateway) {
  return gateway.calls.filter(([kind, message]) => kind === 'ws' && /\/create$/.test(message.type))
    .length;
}

test('Add room refuses the id of a room the card does not show (H3)', async () => {
  const gateway = creating();
  const hidden = { id: 'weekheat_bad', name: 'Bad' };
  await assert.rejects(addRoom(gateway, newRoom({ rooms: [hidden] })), { code: 'room_exists' });
  assert.equal(creations(gateway), 0);
});

test('Add room refuses an id another automation has, and a name without letters (H3)', async () => {
  const gateway = creating({ 'automation/config/weekheat_bad': { alias: 'Something else' } });
  await assert.rejects(addRoom(gateway, newRoom({ name: 'Bad!' })), { code: 'room_exists' });
  await assert.rejects(addRoom(gateway, newRoom({ name: '!!!' })), { code: 'room_name' });
  assert.equal(creations(gateway), 0);
});

test('Add room refuses more thermostats than the state helper can hold (H1)', async () => {
  const gateway = creating();
  const thermostats = Array.from(
    { length: 6 },
    (_, i) => `climate.wohnzimmer_thermostat_nummer_${i}`,
  );
  await assert.rejects(addRoom(gateway, newRoom({ thermostats })), { code: 'state_size' });
  assert.equal(creations(gateway), 0);
});

test('Add room makes plans, helpers and a paused automation', async () => {
  const gateway = creating();
  await addRoom(gateway, newRoom());
  const saves = gateway.calls.filter(([kind]) => kind === 'save');
  assert.equal(saves.length, 2);
  assert.equal(saves[0][2].initial_state, false);
  assert.ok(!('initial_state' in saves[1][2]));
  const input = saves[1][2].use_blueprint.input;
  assert.deepEqual(input.plans, [
    'schedule.weekheat_bad_werktag',
    'schedule.weekheat_bad_freier_tag',
  ]);
  assert.equal(input.state, 'input_text.bad_state');
  assert.equal(input.heating_switch, 'input_boolean.bad_heizung');
});

/**
 * What a fake was asked to delete, in order: "automation" or the delete command.
 * @param {any} gateway
 * @returns {string[]}
 */
function removals(gateway) {
  const removal = ([kind, message]) => kind === 'delete' || /\/delete$/.test(message?.type);
  return gateway.calls
    .filter(removal)
    .map(([kind, message]) => (kind === 'delete' ? 'automation' : message.type));
}

test('Add room deletes what it made when saving the automation fails (H3)', async () => {
  const gateway = creating({
    'save automation/config/weekheat_bad': () => {
      throw { error: 'Response error: 400', status_code: 400 };
    },
  });
  await assert.rejects(addRoom(gateway, newRoom()));
  const plans = ['schedule/delete', 'schedule/delete'];
  const helpers = ['input_boolean/delete', 'input_text/delete'];
  assert.deepEqual(removals(gateway), ['automation', ...helpers, ...plans]);
});
