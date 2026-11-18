// Tests of src/ha/rooms.js and directory.js: reading rooms, saving them, publishing them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readRooms, saveRoom } from '../../src/ha/rooms.js';
import { makeDirectory, publishDirectory } from '../../src/ha/directory.js';
import { fakeGateway, sent } from './fake-gateway.mjs';

/** The path of the room blueprint as Home Assistant lists it. */
const PATH = 'ekienmeier/weekheat_room.yaml';

/**
 * An automation configuration made from the room blueprint.
 * @param {string} name the room's name
 * @returns {object}
 */
function roomConfig(name) {
  const input = {
    room_name: name,
    thermostats: [`climate.${name}`],
    plans: [],
    state: 'input_text.x',
  };
  return { alias: `Weekheat ${name}`, use_blueprint: { path: PATH, input } };
}

/**
 * A fake with automations a, b and other; search finds a and b as made from the room blueprint.
 * @param {Record<string, any>} configs readConfig answers
 * @returns {any}
 */
function homeWith(configs) {
  const automation = (id) => ({ state: 'on', attributes: { id } });
  const states = {
    'automation.a': automation('weekheat_a'),
    'automation.b': automation('weekheat_b'),
  };
  const ws = (message) =>
    message.type === 'search/related' ? { automation: Object.keys(states) } : null;
  return fakeGateway({
    states: { ...states, 'automation.other': automation('other') },
    configs,
    ws,
  });
}

test('readRooms reads only the automations made from the room blueprint (review M7)', async () => {
  const gateway = homeWith({
    'automation/config/weekheat_a': roomConfig('a'),
    'automation/config/weekheat_b': roomConfig('b'),
  });
  const rooms = await readRooms(gateway, [PATH]);
  assert.deepEqual(
    rooms.map((room) => [room.entity, room.id, room.name]),
    [
      ['automation.a', 'weekheat_a', 'a'],
      ['automation.b', 'weekheat_b', 'b'],
    ],
  );
  assert.ok(!gateway.calls.some((call) => call[1] === 'automation/config/other'));
});

test('readRooms fails when a room cannot be read, rather than leave it out (H4)', async () => {
  const gateway = homeWith({
    'automation/config/weekheat_a': roomConfig('a'),
    'automation/config/weekheat_b': () => {
      throw { error: 'Response error: 500', status_code: 500 };
    },
  });
  await assert.rejects(readRooms(gateway, [PATH]));
});

test('readRooms skips an automation without a configuration of its own (from YAML)', async () => {
  const gateway = homeWith({ 'automation/config/weekheat_a': roomConfig('a') });
  assert.deepEqual(
    (await readRooms(gateway, [PATH])).map((room) => room.id),
    ['weekheat_a'],
  );
});

test('saveRoom merges the inputs, and refuses too many thermostats (review H1)', async () => {
  const room = { entity: 'automation.a', id: 'weekheat_a', cfg: roomConfig('a') };
  const gateway = fakeGateway();
  const saved = await saveRoom(gateway, room, { window_delay: 60 });
  assert.equal(saved.window_delay, 60);
  assert.equal(saved.cfg.use_blueprint.input.room_name, 'a');
  const many = Array.from({ length: 6 }, (_, i) => `climate.wohnzimmer_thermostat_nummer_${i}`);
  await assert.rejects(saveRoom(gateway, room, { thermostats: many }), { code: 'state_size' });
});

test('the directory is published only when it changed', async () => {
  const directory = makeDirectory({ rooms: [], script: true, exceptions: 'calendar.x' });
  const unchanged = fakeGateway({ ws: () => ({ value: directory }) });
  assert.equal(await publishDirectory(unchanged, directory), false);
  const changed = fakeGateway({ ws: () => ({ value: { ...directory, script: false } }) });
  assert.equal(await publishDirectory(changed, directory), true);
  assert.deepEqual(sent(changed, 'frontend/set_system_data')[0].value, directory);
});
