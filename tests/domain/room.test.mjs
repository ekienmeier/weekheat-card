// Tests of src/domain/room.js. H1 marks the regression tests of review finding H1 (0.12.1).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTORY_FIELDS,
  directoryEntry,
  exerciseFromInput,
  roomFromInput,
  stateSize,
} from '../../src/domain/room.js';
import { STATE_MAX } from '../../src/domain/constants.js';

/** What roomFromInput makes of a few inputs: the rest are defaults. */
const BAD = {
  name: 'Bad',
  thermostats: ['climate.a'],
  plans: ['schedule.x'],
  week: {},
  free_day: undefined,
  state: undefined,
  windows: [],
  window_delay: 30,
  heating_switch: 'input_boolean.h',
  room_sensor: null,
  room_margin: 0.5,
};

test('roomFromInput reads blueprint inputs with defaults', () => {
  const input = { room_name: 'Bad', thermostats: 'climate.a', plans: ['schedule.x'] };
  const room = roomFromInput({ ...input, heating_switch: ['input_boolean.h'] }, 'Weekheat Bad');
  assert.deepEqual(room, BAD);
});

test('roomFromInput: the alias names a room without a name; empty inputs are null', () => {
  assert.equal(roomFromInput({}, 'Alias').name, 'Alias');
  assert.equal(roomFromInput({}, 'A').heating_switch, null);
  assert.equal(roomFromInput({}, 'A').room_sensor, null);
  assert.equal(roomFromInput({ room_sensor: 'sensor.t1' }, 'A').room_sensor, 'sensor.t1');
});

test('the directory publishes every room field, null for those a room lacks', () => {
  const room = { entity: 'automation.x', id: 'x', ...roomFromInput({}, 'A') };
  const entry = directoryEntry(room);
  assert.deepEqual(Object.keys(entry), DIRECTORY_FIELDS);
  assert.equal(entry.free_day, null);
});

test('exerciseFromInput fills in the defaults', () => {
  const defaults = { exercise_day: 'off', exercise_time: '13:00:00', exercise_wait: 60 };
  assert.deepEqual(exerciseFromInput(), defaults);
  const set = exerciseFromInput({ exercise_day: 'sat', exercise_wait: 90 });
  assert.deepEqual(set, { ...defaults, exercise_day: 'sat', exercise_wait: 90 });
});

test('the worst-case state fits four thermostats with long ids, but not six (H1)', () => {
  const ids = (amount) =>
    Array.from({ length: amount }, (_, i) => `climate.wohnzimmer_thermostat_nr_${i}`);
  const empty = JSON.stringify({ _open: [], _th: 999999, _rc: 1, _rt: 99999999, _ex: 1 }).length;
  assert.equal(stateSize([]), empty);
  assert.ok(stateSize(ids(4)) <= STATE_MAX, String(stateSize(ids(4))));
  assert.ok(stateSize(ids(6)) > STATE_MAX, String(stateSize(ids(6))));
  // as the blueprint writes it: one setpoint per thermostat, no timestamp, the list's fingerprint
  const sample = { 'climate.a': [22.5], _open: [22.5], _th: 784314, _rc: 1, _rt: 29916300, _ex: 1 };
  assert.equal(stateSize(['climate.a']), JSON.stringify(sample).length);
});
